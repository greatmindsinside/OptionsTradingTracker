/**
 * Database Migration System
 *
 * Handles database schema initialization and upgrades
 */

import type { SQLiteDatabase } from './sqlite';
import { SCHEMA_V1, generateSchemaSQL, type DatabaseSchema } from './schema';

export interface Migration {
  version: number;
  description: string;
  up: string[];
  down: string[];
}

export interface MigrationResult {
  success: boolean;
  version: number;
  error?: string;
  executedStatements: number;
}

/**
 * Database migration manager
 */
export class MigrationManager {
  private db: SQLiteDatabase;
  private migrations: Migration[] = [];

  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.initializeMigrations();
  }

  /**
   * Initialize available migrations
   */
  private initializeMigrations(): void {
    // Migration for schema v1
    this.migrations.push({
      version: 1,
      description: 'Initial schema with portfolios, trades, positions, and analytics tables',
      up: generateSchemaSQL(SCHEMA_V1),
      down: this.generateDropTableStatements(SCHEMA_V1),
    });

    // Migration v2: Add wheel strategy tracking
    this.migrations.push({
      version: 2,
      description: 'Add wheel_cycles and wheel_events tables for wheel strategy tracking',
      up: [
        // Create wheel_cycles table
        `CREATE TABLE wheel_cycles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lifecycle_id TEXT NOT NULL UNIQUE,
          portfolio_id INTEGER NOT NULL,
          symbol_id INTEGER NOT NULL,
          underlying_symbol TEXT NOT NULL,
          status TEXT NOT NULL,
          total_net_credit REAL NOT NULL DEFAULT 0,
          cost_basis REAL,
          shares_owned INTEGER,
          csp_trade_ids TEXT NOT NULL DEFAULT '[]',
          cc_trade_ids TEXT NOT NULL DEFAULT '[]',
          stock_trade_ids TEXT NOT NULL DEFAULT '[]',
          total_premium_collected REAL NOT NULL DEFAULT 0,
          realized_pnl REAL,
          unrealized_pnl REAL,
          days_active INTEGER NOT NULL DEFAULT 0,
          annualized_return REAL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
          FOREIGN KEY (symbol_id) REFERENCES symbols(id)
        )`,

        // Create wheel_events table
        `CREATE TABLE wheel_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lifecycle_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_date TEXT NOT NULL,
          trade_id INTEGER,
          description TEXT NOT NULL,
          amount REAL,
          strike_price REAL,
          expiry_date TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (lifecycle_id) REFERENCES wheel_cycles(lifecycle_id) ON DELETE CASCADE,
          FOREIGN KEY (trade_id) REFERENCES trades(id)
        )`,

        // Create indexes for wheel_cycles
        'CREATE INDEX idx_wheel_cycles_portfolio ON wheel_cycles(portfolio_id)',
        'CREATE INDEX idx_wheel_cycles_symbol ON wheel_cycles(symbol_id)',
        'CREATE INDEX idx_wheel_cycles_status ON wheel_cycles(status)',
        'CREATE INDEX idx_wheel_cycles_lifecycle_id ON wheel_cycles(lifecycle_id)',
        'CREATE INDEX idx_wheel_cycles_underlying ON wheel_cycles(underlying_symbol)',

        // Create indexes for wheel_events
        'CREATE INDEX idx_wheel_events_lifecycle ON wheel_events(lifecycle_id)',
        'CREATE INDEX idx_wheel_events_type ON wheel_events(event_type)',
        'CREATE INDEX idx_wheel_events_date ON wheel_events(event_date)',
      ],
      down: [
        'DROP INDEX IF EXISTS idx_wheel_events_date',
        'DROP INDEX IF EXISTS idx_wheel_events_type',
        'DROP INDEX IF EXISTS idx_wheel_events_lifecycle',
        'DROP INDEX IF EXISTS idx_wheel_cycles_underlying',
        'DROP INDEX IF EXISTS idx_wheel_cycles_lifecycle_id',
        'DROP INDEX IF EXISTS idx_wheel_cycles_status',
        'DROP INDEX IF EXISTS idx_wheel_cycles_symbol',
        'DROP INDEX IF EXISTS idx_wheel_cycles_portfolio',
        'DROP TABLE IF EXISTS wheel_events',
        'DROP TABLE IF EXISTS wheel_cycles',
      ],
    });

    // Migration v3: Add symbol_events table for tracking earnings, dividends, etc.
    this.migrations.push({
      version: 3,
      description:
        'Add symbol_events table for tracking earnings, ex-dividend, and other important dates',
      up: [
        // Create symbol_events table
        `CREATE TABLE symbol_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol_id INTEGER NOT NULL,
          event_type TEXT NOT NULL CHECK (event_type IN ('earnings', 'ex_dividend', 'dividend_payment', 'split', 'custom')),
          event_date TEXT NOT NULL,
          event_time TEXT,
          description TEXT,
          amount REAL,
          confirmed INTEGER NOT NULL DEFAULT 0,
          source TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
        )`,

        // Create indexes for symbol_events
        'CREATE INDEX idx_symbol_events_symbol ON symbol_events(symbol_id)',
        'CREATE INDEX idx_symbol_events_date ON symbol_events(event_date)',
        'CREATE INDEX idx_symbol_events_type ON symbol_events(event_type)',
        'CREATE INDEX idx_symbol_events_confirmed ON symbol_events(confirmed)',
        'CREATE INDEX idx_symbol_events_symbol_type_date ON symbol_events(symbol_id, event_type, event_date)',
      ],
      down: [
        'DROP INDEX IF EXISTS idx_symbol_events_symbol_type_date',
        'DROP INDEX IF EXISTS idx_symbol_events_confirmed',
        'DROP INDEX IF EXISTS idx_symbol_events_type',
        'DROP INDEX IF EXISTS idx_symbol_events_date',
        'DROP INDEX IF EXISTS idx_symbol_events_symbol',
        'DROP TABLE IF EXISTS symbol_events',
      ],
    });
  }

  /**
   * Generate DROP statements for a schema (for rollback)
   */
  private generateDropTableStatements(schema: DatabaseSchema): string[] {
    const statements: string[] = [];

    // Drop indexes first
    for (const index of schema.indexes) {
      statements.push(`DROP INDEX IF EXISTS ${index.name}`);
    }

    // Drop tables in reverse order to handle foreign key dependencies
    const tables = [...schema.tables].reverse();
    for (const table of tables) {
      statements.push(`DROP TABLE IF EXISTS ${table.name}`);
    }

    return statements;
  }

  /**
   * Initialize database schema tracking table
   */
  async initializeSchemaTable(): Promise<void> {
    const createSchemaTable = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        checksum TEXT NOT NULL
      )
    `;

    this.db.exec(createSchemaTable);

    // Create index for performance
    this.db.exec(
      'CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version)'
    );
  }

  /**
   * Get current database schema version
   */
  getCurrentVersion(): number {
    try {
      const result = this.db.query(`
        SELECT MAX(version) as version 
        FROM schema_migrations 
        WHERE version IS NOT NULL
      `);

      return result.length > 0 && result[0].version ? Number(result[0].version) : 0;
    } catch {
      // If schema_migrations table doesn't exist, we're at version 0
      return 0;
    }
  }

  /**
   * Get list of applied migrations
   */
  getAppliedMigrations(): Array<{ version: number; description: string; applied_at: string }> {
    try {
      return this.db.query(`
        SELECT version, description, applied_at 
        FROM schema_migrations 
        ORDER BY version ASC
      `) as Array<{ version: number; description: string; applied_at: string }>;
    } catch {
      return [];
    }
  }

  /**
   * Get pending migrations that need to be applied
   */
  getPendingMigrations(): Migration[] {
    const currentVersion = this.getCurrentVersion();
    return this.migrations.filter(migration => migration.version > currentVersion);
  }

  /**
   * Calculate checksum for migration statements
   */
  private calculateChecksum(statements: string[]): string {
    const content = statements.join('|');
    // Simple hash function - in production, you might want to use a proper hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Apply a single migration
   */
  async applyMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();
    let executedStatements = 0;

    try {
      // Execute migration in a transaction
      this.db.transaction([
        // Execute all migration statements
        ...migration.up.map(sql => ({ sql, params: [] })),
        // Record migration in schema_migrations table
        {
          sql: `INSERT INTO schema_migrations (version, description, checksum) VALUES (?, ?, ?)`,
          params: [migration.version, migration.description, this.calculateChecksum(migration.up)],
        },
      ]);

      executedStatements = migration.up.length + 1;
      const duration = Date.now() - startTime;

      console.log(
        `[Migration] Applied migration v${migration.version} in ${duration}ms: ${migration.description}`
      );

      return {
        success: true,
        version: migration.version,
        executedStatements,
      };
    } catch (error) {
      console.error(`[Migration] Failed to apply migration v${migration.version}:`, error);

      return {
        success: false,
        version: migration.version,
        error: error instanceof Error ? error.message : String(error),
        executedStatements,
      };
    }
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(version: number): Promise<MigrationResult> {
    const migration = this.migrations.find(m => m.version === version);
    if (!migration) {
      return {
        success: false,
        version,
        error: `Migration v${version} not found`,
        executedStatements: 0,
      };
    }

    const startTime = Date.now();
    let executedStatements = 0;

    try {
      // Execute rollback in a transaction
      this.db.transaction([
        // Execute all rollback statements
        ...migration.down.map(sql => ({ sql, params: [] })),
        // Remove migration record
        {
          sql: `DELETE FROM schema_migrations WHERE version = ?`,
          params: [version],
        },
      ]);

      executedStatements = migration.down.length + 1;
      const duration = Date.now() - startTime;

      console.log(
        `[Migration] Rolled back migration v${version} in ${duration}ms: ${migration.description}`
      );

      return {
        success: true,
        version,
        executedStatements,
      };
    } catch (error) {
      console.error(`[Migration] Failed to rollback migration v${version}:`, error);

      return {
        success: false,
        version,
        error: error instanceof Error ? error.message : String(error),
        executedStatements,
      };
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<{ success: boolean; results: MigrationResult[] }> {
    // Initialize schema tracking if needed
    await this.initializeSchemaTable();

    const pendingMigrations = this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('[Migration] Database is up to date');
      return { success: true, results: [] };
    }

    console.log(`[Migration] Running ${pendingMigrations.length} pending migrations...`);

    const results: MigrationResult[] = [];
    let allSuccessful = true;

    for (const migration of pendingMigrations) {
      const result = await this.applyMigration(migration);
      results.push(result);

      if (!result.success) {
        allSuccessful = false;
        console.error(
          `[Migration] Stopping migration process due to failure in v${migration.version}`
        );
        break;
      }
    }

    if (allSuccessful) {
      console.log(`[Migration] Successfully applied ${results.length} migrations`);
    }

    return { success: allSuccessful, results };
  }

  /**
   * Reset database to a specific version (destructive!)
   */
  async resetToVersion(
    targetVersion: number
  ): Promise<{ success: boolean; results: MigrationResult[] }> {
    const currentVersion = this.getCurrentVersion();
    const results: MigrationResult[] = [];

    if (targetVersion > currentVersion) {
      return {
        success: false,
        results: [
          {
            success: false,
            version: targetVersion,
            error: `Target version ${targetVersion} is higher than current version ${currentVersion}`,
            executedStatements: 0,
          },
        ],
      };
    }

    if (targetVersion === currentVersion) {
      console.log(`[Migration] Database is already at version ${targetVersion}`);
      return { success: true, results: [] };
    }

    // Rollback migrations in reverse order
    const migrationsToRollback = this.migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Descending order

    console.log(
      `[Migration] Rolling back ${migrationsToRollback.length} migrations to reach version ${targetVersion}...`
    );

    let allSuccessful = true;

    for (const migration of migrationsToRollback) {
      const result = await this.rollbackMigration(migration.version);
      results.push(result);

      if (!result.success) {
        allSuccessful = false;
        console.error(
          `[Migration] Stopping rollback process due to failure in v${migration.version}`
        );
        break;
      }
    }

    return { success: allSuccessful, results };
  }

  /**
   * Get migration status summary
   */
  getStatus(): {
    currentVersion: number;
    latestVersion: number;
    pendingMigrations: number;
    appliedMigrations: Array<{ version: number; description: string; applied_at: string }>;
  } {
    const currentVersion = this.getCurrentVersion();
    const latestVersion = Math.max(...this.migrations.map(m => m.version), 0);
    const pendingMigrations = this.getPendingMigrations().length;
    const appliedMigrations = this.getAppliedMigrations();

    return {
      currentVersion,
      latestVersion,
      pendingMigrations,
      appliedMigrations,
    };
  }

  /**
   * Validate database integrity
   */
  validateIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Check if all expected tables exist
      const tables = this.db.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `) as Array<{ name: string }>;

      const currentVersion = this.getCurrentVersion();
      if (currentVersion === 0) {
        // No migrations applied yet
        return { valid: true, errors: [] };
      }

      // Get expected tables for current version
      const expectedTables = SCHEMA_V1.tables.map(t => t.name);
      expectedTables.push('schema_migrations'); // Add our tracking table

      const actualTables = tables.map(t => t.name);

      // Check for missing tables
      const missingTables = expectedTables.filter(table => !actualTables.includes(table));
      if (missingTables.length > 0) {
        errors.push(`Missing tables: ${missingTables.join(', ')}`);
      }

      // Check for foreign key integrity
      this.db.exec('PRAGMA foreign_key_check');
    } catch (error) {
      errors.push(
        `Integrity check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Initialize database with latest schema
 */
export async function initializeDatabase(
  db: SQLiteDatabase
): Promise<{ success: boolean; version: number; errors: string[] }> {
  const manager = new MigrationManager(db);

  try {
    // Run migrations to get to latest version
    const { success, results } = await manager.migrate();

    if (!success) {
      const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');

      return {
        success: false,
        version: manager.getCurrentVersion(),
        errors,
      };
    }

    // Validate integrity
    const { valid, errors: integrityErrors } = manager.validateIntegrity();

    return {
      success: valid,
      version: manager.getCurrentVersion(),
      errors: integrityErrors,
    };
  } catch (error) {
    return {
      success: false,
      version: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Create and export a configured migration manager
 */
export function createMigrationManager(db: SQLiteDatabase): MigrationManager {
  return new MigrationManager(db);
}
