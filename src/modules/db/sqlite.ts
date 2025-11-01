/**
 * SQLite-WASM Database Module
 *
 * This module provides a browser-based SQLite database using sql.js WASM.
 * It includes OPFS persistence with IndexedDB fallback for browser compatibility.
 */

import type { Database, SqlJsStatic } from 'sql.js';
import { env } from '@/utils/env';
import { MigrationManager } from './migrations';

/**
 * SQL parameter types for type safety
 */
export type SqlValue = string | number | null | Uint8Array;
export type SqlParams = SqlValue[];

/**
 * Query result type
 */
export type QueryResult = Record<string, SqlValue>[];

/**
 * Transaction query definition
 */
export interface TransactionQuery {
  sql: string;
  params?: SqlParams;
}
export interface DatabaseConfig {
  name: string;
  version: number;
  enablePersistence: boolean;
  enableDebugLogging: boolean;
}

/**
 * Persistence storage types
 */
export type StorageType = 'opfs' | 'indexeddb' | 'none';

/**
 * Database instance wrapper with persistence and utilities
 */
export class SQLiteDatabase {
  private db: Database | null = null;
  private sql: SqlJsStatic | null = null;
  private config: DatabaseConfig;
  private storageType: StorageType = 'none';
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize the SQLite-WASM engine and database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.log('Initializing SQLite-WASM...');

      // Initialize sql.js with WASM - handle Vite's UMD module loading
      this.log('Importing sql.js module...');

      let initSqlJs: ((config?: unknown) => Promise<SqlJsStatic>) | undefined;

      try {
        // For Vite, we need to use a more direct approach
        // Import the UMD module and access the global
        await import('sql.js');

        // After importing, the initSqlJs function should be available globally
        initSqlJs = (
          window as unknown as { initSqlJs?: (config?: unknown) => Promise<SqlJsStatic> }
        ).initSqlJs;

        if (!initSqlJs) {
          // Fallback: try loading the script dynamically
          this.log('Trying dynamic script loading approach...');
          const script = document.createElement('script');
          script.src = '/node_modules/sql.js/dist/sql-wasm.js';
          script.type = 'text/javascript';

          await new Promise<void>((resolve, reject) => {
            script.onload = () => {
              initSqlJs = (
                window as unknown as { initSqlJs?: (config?: unknown) => Promise<SqlJsStatic> }
              ).initSqlJs;
              resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        this.log('Found initSqlJs:', typeof initSqlJs);
      } catch (importError) {
        this.logError('Failed to import sql.js:', importError);
        throw importError;
      }

      if (typeof initSqlJs !== 'function') {
        throw new Error(
          `initSqlJs is not a function. Got: ${typeof initSqlJs}. Window keys: ${Object.keys(window)
            .filter(k => k.includes('sql') || k.includes('init') || k.includes('Sql'))
            .join(', ')}`
        );
      }

      // In test/Node.js environment, let sql.js handle WASM loading automatically
      const isTest =
        typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');

      if (isTest) {
        // In test environment, use simpler initialization
        this.sql = await initSqlJs();
      } else {
        // In browser, configure WASM loading for Vite
        this.sql = await initSqlJs({
          locateFile: (file: string) => {
            this.log(`Locating WASM file: ${file}`);
            // For Vite development server, the WASM file is served from public/
            if (file.endsWith('.wasm')) {
              return `/${file}`;
            }
            return file;
          },
        });
      }

      this.log('SQLite-WASM initialized successfully');

      // Detect and setup persistence
      await this.setupPersistence();

      // Load existing database or create new one
      await this.loadOrCreateDatabase();

      this.isInitialized = true;
      this.log('Database initialization complete');
    } catch (error) {
      this.logError('Failed to initialize SQLite-WASM:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Detect available storage and setup persistence
   */
  private async setupPersistence(): Promise<void> {
    if (!this.config.enablePersistence) {
      this.storageType = 'none';
      this.log('Persistence disabled by configuration');
      return;
    }

    // Check for OPFS support (Origin Private File System)
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      try {
        const opfsRoot = await navigator.storage.getDirectory();
        await opfsRoot.getFileHandle('test', { create: true });
        this.storageType = 'opfs';
        this.log('Using OPFS for persistence');
        return;
      } catch {
        this.log('OPFS not available, falling back to IndexedDB');
      }
    }

    // Fallback to IndexedDB
    if ('indexedDB' in window) {
      this.storageType = 'indexeddb';
      this.log('Using IndexedDB for persistence');
    } else {
      this.storageType = 'none';
      this.log('No persistence available - using memory-only database');
    }
  }

  /**
   * Load existing database from storage or create new one
   */
  private async loadOrCreateDatabase(): Promise<void> {
    if (!this.sql) {
      throw new Error('SQL.js not initialized');
    }

    let existingData: Uint8Array | null = null;

    if (this.storageType !== 'none') {
      try {
        existingData = await this.loadFromStorage();
        if (existingData) {
          this.log('Loaded existing database from storage');
        }
      } catch (error) {
        this.logError('Failed to load existing database:', error);
      }
    }

    // Create database instance
    this.db = new this.sql.Database(existingData);

    if (!existingData) {
      this.log('Created new in-memory database');
    }

    // Run database migrations to ensure schema is up to date
    this.log('Running database migrations...');
    const migrationManager = new MigrationManager(this);
    const migrationResult = await migrationManager.migrate();

    if (!migrationResult.success) {
      const errors = migrationResult.results
        .filter(r => !r.success)
        .map(r => r.error)
        .join(', ');
      throw new Error(`Database migration failed: ${errors}`);
    }

    const latestVersion = Math.max(...migrationResult.results.map(r => r.version));
    this.log(`Database migration completed successfully to version ${latestVersion}`);
  }

  /**
   * Load database from storage based on available type
   */
  private async loadFromStorage(): Promise<Uint8Array | null> {
    switch (this.storageType) {
      case 'opfs':
        return this.loadFromOPFS();
      case 'indexeddb':
        return this.loadFromIndexedDB();
      default:
        return null;
    }
  }

  /**
   * Load database from OPFS
   */
  private async loadFromOPFS(): Promise<Uint8Array | null> {
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const fileHandle = await opfsRoot.getFileHandle(`${this.config.name}.sqlite`, {
        create: false,
      });
      const file = await fileHandle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      // File doesn't exist or other error
      return null;
    }
  }

  /**
   * Load database from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${this.config.name}_db`, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['database'], 'readonly');
        const store = transaction.objectStore('database');
        const getRequest = store.get('data');

        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? new Uint8Array(result.data) : null);
        };

        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database');
        }
      };
    });
  }

  /**
   * Save database to persistent storage
   */
  async persist(): Promise<void> {
    if (!this.db || this.storageType === 'none') {
      return;
    }

    try {
      const data = this.db.export();

      switch (this.storageType) {
        case 'opfs':
          await this.saveToOPFS(data);
          break;
        case 'indexeddb':
          await this.saveToIndexedDB(data);
          break;
      }

      this.log('Database persisted successfully');
    } catch (error) {
      this.logError('Failed to persist database:', error);
      throw error;
    }
  }

  /**
   * Save database to OPFS
   */
  private async saveToOPFS(data: Uint8Array): Promise<void> {
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle(`${this.config.name}.sqlite`, { create: true });
    const writable = await fileHandle.createWritable();
    // Create a proper ArrayBuffer copy
    const buffer = new ArrayBuffer(data.length);
    new Uint8Array(buffer).set(data);
    await writable.write(buffer);
    await writable.close();
  }

  /**
   * Save database to IndexedDB
   */
  private async saveToIndexedDB(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${this.config.name}_db`, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['database'], 'readwrite');
        const store = transaction.objectStore('database');
        const putRequest = store.put({ data: data.buffer }, 'data');

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database');
        }
      };
    });
  }

  /**
   * Execute a SQL query
   */
  query(sql: string, params: SqlParams = []): QueryResult {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);

      // Bind parameters if provided
      if (params.length > 0) {
        stmt.bind(params);
      }

      const result: QueryResult = [];

      while (stmt.step()) {
        result.push(stmt.getAsObject());
      }

      stmt.free();
      return result;
    } catch (error) {
      this.logError('Query failed:', error, { sql, params });
      throw error;
    }
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   */
  exec(sql: string, params: SqlParams = []): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run(sql, params);
    } catch (error) {
      this.logError('Execution failed:', error, { sql, params });
      throw error;
    }
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  transaction(queries: TransactionQuery[]): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.exec('BEGIN TRANSACTION');

      for (const query of queries) {
        this.exec(query.sql, query.params || []);
      }

      this.exec('COMMIT');
    } catch (error) {
      this.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get database file size in bytes
   */
  getSize(): number {
    if (!this.db) {
      return 0;
    }
    return this.db.export().length;
  }

  /**
   * Close database and cleanup resources
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
    this.log('Database closed');
  }

  /**
   * Check if database is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Get storage type being used
   */
  getStorageType(): StorageType {
    return this.storageType;
  }

  /**
   * Get current configuration
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  /**
   * Log debug messages if enabled
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.enableDebugLogging) {
      console.log(`[SQLiteDB] ${message}`, ...args);
    }
  }

  /**
   * Log error messages
   */
  private logError(message: string, error: unknown, context?: unknown): void {
    console.error(`[SQLiteDB] ${message}`, error, context);
  }
}

/**
 * Create and initialize a SQLite database instance
 */
export async function createDatabase(config?: Partial<DatabaseConfig>): Promise<SQLiteDatabase> {
  const fullConfig: DatabaseConfig = {
    name: env.database.name,
    version: env.database.version,
    enablePersistence: true,
    enableDebugLogging: env.features.debugMode,
    ...config,
  };

  const database = new SQLiteDatabase(fullConfig);
  await database.initialize();

  return database;
}

/**
 * Default database instance factory
 */
export async function initDatabase(): Promise<SQLiteDatabase> {
  return createDatabase();
}
