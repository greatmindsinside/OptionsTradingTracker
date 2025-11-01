/**
 * Database Schema and Migration Tests
 *
 * Tests for the database schema definition and migration system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteDatabase, createDatabase } from '../../../src/modules/db/sqlite';
import {
  SCHEMA_V1,
  generateCreateTableSQL,
  generateCreateIndexSQL,
  generateSchemaSQL,
} from '../../../src/modules/db/schema';
import {
  MigrationManager,
  initializeDatabase,
  createMigrationManager,
} from '../../../src/modules/db/migrations';

describe('Database Schema', () => {
  it('should generate correct CREATE TABLE SQL', () => {
    const portfoliosTable = SCHEMA_V1.tables.find(t => t.name === 'portfolios')!;
    const sql = generateCreateTableSQL(portfoliosTable);

    expect(sql).toContain('CREATE TABLE portfolios');
    expect(sql).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(sql).toContain('name TEXT NOT NULL');
    expect(sql).toContain('broker TEXT NOT NULL');
    expect(sql).toContain('UNIQUE(broker, account_number)');
  });

  it('should generate correct CREATE INDEX SQL', () => {
    const index = SCHEMA_V1.indexes.find(i => i.name === 'idx_portfolios_broker')!;
    const sql = generateCreateIndexSQL(index);

    expect(sql).toBe('CREATE INDEX idx_portfolios_broker ON portfolios (broker)');
  });

  it('should generate complete schema SQL', () => {
    const statements = generateSchemaSQL(SCHEMA_V1);

    // Should have statements for all tables and indexes
    expect(statements.length).toBe(SCHEMA_V1.tables.length + SCHEMA_V1.indexes.length);

    // Check that key tables are included
    expect(statements.some(s => s.includes('CREATE TABLE portfolios'))).toBe(true);
    expect(statements.some(s => s.includes('CREATE TABLE trades'))).toBe(true);
    expect(statements.some(s => s.includes('CREATE TABLE positions'))).toBe(true);
    expect(statements.some(s => s.includes('CREATE TABLE strategies'))).toBe(true);
  });

  it('should include all required tables', () => {
    const expectedTables = [
      'portfolios',
      'symbols',
      'trades',
      'strategies',
      'positions',
      'trade_legs',
      'market_data',
      'performance_metrics',
      'import_batches',
      'user_settings',
    ];

    const actualTables = SCHEMA_V1.tables.map(t => t.name);

    for (const table of expectedTables) {
      expect(actualTables).toContain(table);
    }
  });

  it('should have proper foreign key relationships', () => {
    const tradesTable = SCHEMA_V1.tables.find(t => t.name === 'trades')!;

    const portfolioFk = tradesTable.columns.find(c => c.name === 'portfolio_id')!;
    const symbolFk = tradesTable.columns.find(c => c.name === 'symbol_id')!;

    expect(portfolioFk.foreignKey).toEqual({
      table: 'portfolios',
      column: 'id',
      onDelete: 'CASCADE',
    });

    expect(symbolFk.foreignKey).toEqual({
      table: 'symbols',
      column: 'id',
    });
  });
});

describe('Database Migrations', () => {
  let db: SQLiteDatabase;
  let migrationManager: MigrationManager;

  beforeEach(async () => {
    // Create test database with in-memory only
    db = await createDatabase({
      name: 'test_migrations',
      enablePersistence: false,
      enableDebugLogging: false,
    });

    migrationManager = createMigrationManager(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('should initialize schema tracking table', async () => {
    await migrationManager.initializeSchemaTable();

    // Check that schema_migrations table was created
    const tables = db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='schema_migrations'
    `);

    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('schema_migrations');
  });

  it('should return 0 for current version on empty database', () => {
    const version = migrationManager.getCurrentVersion();
    expect(version).toBe(0);
  });

  it('should identify pending migrations', () => {
    const pendingMigrations = migrationManager.getPendingMigrations();
    expect(pendingMigrations.length).toBeGreaterThan(0);
    expect(pendingMigrations[0].version).toBe(1);
  });

  it('should apply migrations successfully', async () => {
    const { success, results } = await migrationManager.migrate();

    expect(success).toBe(true);
    expect(results).toHaveLength(2); // Should have applied v1 and v2 migration
    expect(results[0].success).toBe(true);
    expect(results[0].version).toBe(1);
    expect(results[1].success).toBe(true);
    expect(results[1].version).toBe(2);

    // Check that current version is now 2
    const currentVersion = migrationManager.getCurrentVersion();
    expect(currentVersion).toBe(2);
  });

  it('should create all expected tables after migration', async () => {
    await migrationManager.migrate();

    const tables = db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `) as Array<{ name: string }>;

    const tableNames = tables.map(t => t.name);

    // Should include schema tracking table plus all business tables
    expect(tableNames).toContain('schema_migrations');
    expect(tableNames).toContain('portfolios');
    expect(tableNames).toContain('trades');
    expect(tableNames).toContain('positions');
    expect(tableNames).toContain('strategies');
    expect(tableNames).toContain('symbols');
  });

  it('should validate database integrity after migration', async () => {
    await migrationManager.migrate();

    const { valid, errors } = migrationManager.validateIntegrity();

    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('should track applied migrations', async () => {
    await migrationManager.migrate();

    const appliedMigrations = migrationManager.getAppliedMigrations();

    expect(appliedMigrations).toHaveLength(2);
    expect(appliedMigrations[0].version).toBe(1);
    expect(appliedMigrations[0].description).toContain('Initial schema');
    expect(appliedMigrations[1].version).toBe(2);
    expect(appliedMigrations[1].description).toContain('wheel_cycles');
  });

  it('should provide correct migration status', async () => {
    // Before migration
    let status = migrationManager.getStatus();
    expect(status.currentVersion).toBe(0);
    expect(status.pendingMigrations).toBe(2);

    // After migration
    await migrationManager.migrate();
    status = migrationManager.getStatus();
    expect(status.currentVersion).toBe(2);
    expect(status.latestVersion).toBe(2);
    expect(status.pendingMigrations).toBe(0);
  });

  it('should not apply migrations twice', async () => {
    // Apply migrations first time
    const firstRun = await migrationManager.migrate();
    expect(firstRun.success).toBe(true);
    expect(firstRun.results).toHaveLength(2);

    // Apply migrations second time - should be no-op
    const secondRun = await migrationManager.migrate();
    expect(secondRun.success).toBe(true);
    expect(secondRun.results).toHaveLength(0); // No pending migrations
  });
});

describe('Database Initialization', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = await createDatabase({
      name: 'test_init',
      enablePersistence: false,
      enableDebugLogging: false,
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('should initialize database successfully', async () => {
    const result = await initializeDatabase(db);

    expect(result.success).toBe(true);
    expect(result.version).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should create functional database after initialization', async () => {
    await initializeDatabase(db);

    // Test basic CRUD operations

    // Insert a portfolio with timestamps
    const now = new Date().toISOString();
    db.exec(
      `
      INSERT INTO portfolios (name, broker, account_type, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?)
    `,
      ['Test Portfolio', 'td_ameritrade', 'margin', now, now]
    );

    // Query the portfolio
    const portfolios = db.query('SELECT * FROM portfolios WHERE name = ?', ['Test Portfolio']);
    expect(portfolios).toHaveLength(1);
    expect(portfolios[0].name).toBe('Test Portfolio');
    expect(portfolios[0].broker).toBe('td_ameritrade');

    // Insert a symbol with timestamps
    db.exec(
      `
      INSERT INTO symbols (symbol, name, asset_type, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?)
    `,
      ['AAPL', 'Apple Inc.', 'stock', now, now]
    );

    // Insert a trade with timestamps
    db.exec(
      `
      INSERT INTO trades (portfolio_id, symbol_id, trade_date, action, instrument_type, quantity, price, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [1, 1, '2023-10-19', 'BUY_TO_OPEN', 'OPTION', 1, 5.25, now, now]
    );

    // Query the trade with JOIN
    const trades = db.query(
      `
      SELECT t.*, p.name as portfolio_name, s.symbol
      FROM trades t
      JOIN portfolios p ON t.portfolio_id = p.id
      JOIN symbols s ON t.symbol_id = s.id
      WHERE t.action = ?
    `,
      ['BUY_TO_OPEN']
    );

    expect(trades).toHaveLength(1);
    expect(trades[0].portfolio_name).toBe('Test Portfolio');
    expect(trades[0].symbol).toBe('AAPL');
    expect(trades[0].quantity).toBe(1);
    expect(trades[0].price).toBe(5.25);
  });
});
