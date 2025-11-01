/**
 * SQLite Database Tests
 *
 * Tests for the SQLite-WASM database implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteDatabase, createDatabase } from '../../../src/modules/db/sqlite';

describe('SQLite Database', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    // Create test database with in-memory only
    db = await createDatabase({
      name: 'test_db',
      enablePersistence: false,
      enableDebugLogging: false,
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('should initialize successfully', () => {
    expect(db.isReady()).toBe(true);
    expect(db.getStorageType()).toBe('none');
  });

  it('should create and query tables', () => {
    // Create a test table
    db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        value REAL
      )
    `);

    // Insert test data
    db.exec('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test', 123.45]);

    // Query the data
    const results = db.query('SELECT * FROM test_table WHERE name = ?', ['test']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 1,
      name: 'test',
      value: 123.45,
    });
  });

  it('should handle transactions', () => {
    // Create test table
    db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    // Execute transaction
    db.transaction([
      { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['first'] },
      { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['second'] },
      { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['third'] },
    ]);

    // Verify all records were inserted
    const results = db.query('SELECT COUNT(*) as count FROM test_table');
    expect(results[0].count).toBe(3);
  });

  it('should rollback failed transactions', () => {
    // Create test table
    db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `);

    // Insert initial record
    db.exec('INSERT INTO test_table (name) VALUES (?)', ['initial']);

    // Try transaction with duplicate key (should fail)
    expect(() => {
      db.transaction([
        { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['valid'] },
        { sql: 'INSERT INTO test_table (name) VALUES (?)', params: ['initial'] }, // Duplicate!
      ]);
    }).toThrow();

    // Verify rollback - only initial record should exist
    const results = db.query('SELECT COUNT(*) as count FROM test_table');
    expect(results[0].count).toBe(1);
  });

  it('should get database size', () => {
    // An empty in-memory database might have 0 size initially
    const initialSize = db.getSize();
    expect(initialSize).toBeGreaterThanOrEqual(0);

    // Create table and add data
    db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY,
        data TEXT
      )
    `);

    db.exec('INSERT INTO test_table (data) VALUES (?)', ['some test data']);

    const newSize = db.getSize();
    expect(newSize).toBeGreaterThan(initialSize);
  });

  it('should handle configuration correctly', () => {
    const config = db.getConfig();
    expect(config.name).toBe('test_db');
    expect(config.enablePersistence).toBe(false);
    expect(config.enableDebugLogging).toBe(false);
  });
});
