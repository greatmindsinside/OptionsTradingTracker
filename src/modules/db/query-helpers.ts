/**
 * Typed query helpers for common database operations
 * Provides type-safe database operations with error handling
 */

import type { z } from 'zod';

import type { SQLiteDatabase, SqlValue, TransactionQuery } from './sqlite';
import { validateData } from './validation';

// Generic query result types
export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationOptions {
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  success: boolean;
  data?: T[];
  total?: number;
  offset?: number;
  limit?: number;
  error?: string;
}

// Database operation error types
export class DatabaseError extends Error {
  public readonly operation: string;
  public readonly table: string;
  public readonly originalError?: Error;

  constructor(message: string, operation: string, table: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.operation = operation;
    this.table = table;
    this.originalError = originalError;
  }
}

export class ValidationError extends Error {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[]) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

export class NotFoundError extends Error {
  public readonly table: string;
  public readonly id: number | string;

  constructor(table: string, id: number | string) {
    super(`Record not found in ${table} with id: ${id}`);
    this.name = 'NotFoundError';
    this.table = table;
    this.id = id;
  }
}

// Helper function to convert values to SqlValue
const toSqlValue = (value: unknown): SqlValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Uint8Array) return value;
  return String(value);
};

/**
 * Generic query helper class for type-safe database operations
 */
export class QueryHelper<T> {
  private db: SQLiteDatabase;
  private tableName: string;
  private schema: z.ZodSchema<T>;
  private idField: string;

  constructor(
    db: SQLiteDatabase,
    tableName: string,
    schema: z.ZodSchema<T>,
    idField: string = 'id'
  ) {
    this.db = db;
    this.tableName = tableName;
    this.schema = schema;
    this.idField = idField;
  }

  /**
   * Find a record by ID
   */
  async findById(id: number): Promise<QueryResult<T>> {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE ${this.idField} = ?`;
      const rows = this.db.query(query, [id]);

      if (rows.length === 0) {
        throw new NotFoundError(this.tableName, id);
      }

      const validation = validateData(this.schema, rows[0]);
      if (!validation.success) {
        return {
          success: false,
          error: `Data validation failed: ${validation.errors?.join(', ')}`,
        };
      }

      return {
        success: true,
        data: validation.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find all records with optional pagination and filtering
   */
  async findAll(
    options: PaginationOptions = {},
    whereClause?: string,
    whereParams: unknown[] = []
  ): Promise<PaginatedResult<T>> {
    try {
      const { offset = 0, limit = 100, orderBy = this.idField, orderDirection = 'ASC' } = options;

      // Build base query
      let query = `SELECT * FROM ${this.tableName}`;
      const params: SqlValue[] = [];

      // Add WHERE clause if provided
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
        params.push(...whereParams.map(toSqlValue));
      }

      // Add ORDER BY
      query += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add LIMIT and OFFSET
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      // Execute query
      const rows = this.db.query(query, params);

      // Validate all rows
      const validatedData: T[] = [];
      for (const row of rows) {
        const validation = validateData(this.schema, row);
        if (validation.success && validation.data) {
          validatedData.push(validation.data);
        }
      }

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const countParams: SqlValue[] = [];
      if (whereClause) {
        countQuery += ` WHERE ${whereClause}`;
        countParams.push(...whereParams.map(toSqlValue));
      }

      const countResult = this.db.query(countQuery, countParams);
      const total = Number(countResult[0]?.total || 0);

      return {
        success: true,
        data: validatedData,
        total,
        offset,
        limit,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a new record
   */
  async create(data: Record<string, unknown>): Promise<QueryResult<T>> {
    try {
      // Build INSERT query
      const fields = Object.keys(data);
      const values = Object.values(data).map(toSqlValue);

      // Add timestamps if they don't exist
      const now = new Date().toISOString();
      if (!data.created_at && this.hasTimestampField('created_at')) {
        fields.push('created_at');
        values.push(now);
      }
      if (!data.updated_at && this.hasTimestampField('updated_at')) {
        fields.push('updated_at');
        values.push(now);
      }

      const placeholders = fields.map(() => '?').join(', ');
      const query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
      `;

      this.db.exec(query, values);

      // Get the last inserted row ID using SQLite's last_insert_rowid()
      const lastIdQuery = `SELECT last_insert_rowid() as lastId`;
      const lastIdResult = this.db.query(lastIdQuery, []);
      const insertId = Number(lastIdResult[0]?.lastId);

      if (!insertId) {
        throw new DatabaseError('Failed to get insert ID', 'CREATE', this.tableName);
      }

      // Return the created record
      return await this.findById(insertId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: number, data: Record<string, unknown>): Promise<QueryResult<T>> {
    try {
      // Check if record exists
      const existing = await this.findById(id);
      if (!existing.success) {
        return existing;
      }

      // Build UPDATE query
      const fields = Object.keys(data);
      const values = Object.values(data).map(toSqlValue);
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      // Add updated_at timestamp if supported
      let finalSetClause = setClause;
      if (this.hasTimestampField('updated_at') && !data.updated_at) {
        finalSetClause = setClause ? `${setClause}, updated_at = ?` : 'updated_at = ?';
        values.push(new Date().toISOString());
      }

      const query = `
        UPDATE ${this.tableName}
        SET ${finalSetClause}
        WHERE ${this.idField} = ?
      `;
      values.push(id);

      this.db.exec(query, values);

      // Return the updated record
      return await this.findById(id);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: number): Promise<QueryResult<boolean>> {
    try {
      // Check if record exists
      const existing = await this.findById(id);
      if (!existing.success) {
        return {
          success: false,
          error: existing.error,
        };
      }

      const query = `DELETE FROM ${this.tableName} WHERE ${this.idField} = ?`;
      this.db.exec(query, [id]);

      // Verify deletion by checking if record still exists
      const checkResult = await this.findById(id);
      const wasDeleted = !checkResult.success;

      return {
        success: true,
        data: wasDeleted,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Count records with optional WHERE clause
   */
  async count(whereClause?: string, whereParams: unknown[] = []): Promise<QueryResult<number>> {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const params: SqlValue[] = [];

      if (whereClause) {
        query += ` WHERE ${whereClause}`;
        params.push(...whereParams.map(toSqlValue));
      }

      const result = this.db.query(query, params);
      const total = Number(result[0]?.total || 0);

      return {
        success: true,
        data: total,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: number): Promise<QueryResult<boolean>> {
    try {
      const countResult = await this.count(`${this.idField} = ?`, [id]);

      if (!countResult.success) {
        return {
          success: false,
          error: countResult.error,
        };
      }

      return {
        success: true,
        data: (countResult.data || 0) > 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a transaction with multiple operations
   */
  async transaction<R>(
    operations: (helper: QueryHelper<T>) => Promise<TransactionQuery[]>
  ): Promise<QueryResult<R>> {
    try {
      const queries = await operations(this);
      this.db.transaction(queries);

      return {
        success: true,
        data: undefined as R, // Transaction doesn't return data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if the table has a timestamp field
   */
  private hasTimestampField(fieldName: string): boolean {
    // For now, assume all tables have timestamp fields
    // In a real implementation, you could query the schema
    return fieldName === 'created_at' || fieldName === 'updated_at';
  }
}

/**
 * Utility function to create a query helper for a specific table
 */
export function createQueryHelper<T>(
  db: SQLiteDatabase,
  tableName: string,
  schema: z.ZodSchema<T>,
  idField: string = 'id'
): QueryHelper<T> {
  return new QueryHelper(db, tableName, schema, idField);
}

/**
 * Advanced query builder for complex queries
 */
export class QueryBuilder {
  private db: SQLiteDatabase;
  private selectFields: string[] = ['*'];
  private fromTable: string = '';
  private joinClauses: string[] = [];
  private whereClauses: string[] = [];
  private whereParams: SqlValue[] = [];
  private orderByClauses: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  select(fields: string[] = ['*']): QueryBuilder {
    this.selectFields = fields;
    return this;
  }

  from(table: string): QueryBuilder {
    this.fromTable = table;
    return this;
  }

  join(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`JOIN ${table} ON ${condition}`);
    return this;
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`LEFT JOIN ${table} ON ${condition}`);
    return this;
  }

  where(condition: string, ...params: unknown[]): QueryBuilder {
    this.whereClauses.push(condition);
    this.whereParams.push(...params.map(toSqlValue));
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClauses.push(`${field} ${direction}`);
    return this;
  }

  limit(limit: number): QueryBuilder {
    this.limitValue = limit;
    return this;
  }

  offset(offset: number): QueryBuilder {
    this.offsetValue = offset;
    return this;
  }

  build(): { query: string; params: SqlValue[] } {
    let query = `SELECT ${this.selectFields.join(', ')} FROM ${this.fromTable}`;

    if (this.joinClauses.length > 0) {
      query += ` ${this.joinClauses.join(' ')}`;
    }

    if (this.whereClauses.length > 0) {
      query += ` WHERE ${this.whereClauses.join(' AND ')}`;
    }

    if (this.orderByClauses.length > 0) {
      query += ` ORDER BY ${this.orderByClauses.join(', ')}`;
    }

    if (this.limitValue !== undefined) {
      query += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      query += ` OFFSET ${this.offsetValue}`;
    }

    return {
      query,
      params: this.whereParams,
    };
  }

  async execute<T>(schema?: z.ZodSchema<T>): Promise<QueryResult<T[]>> {
    try {
      const { query, params } = this.build();
      const rows = this.db.query(query, params);

      if (schema) {
        const validatedData: T[] = [];
        for (const row of rows) {
          const validation = validateData(schema, row);
          if (validation.success && validation.data) {
            validatedData.push(validation.data);
          }
        }
        return {
          success: true,
          data: validatedData,
        };
      }

      return {
        success: true,
        data: rows as T[],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Utility function to create a query builder
 */
export function createQueryBuilder(db: SQLiteDatabase): QueryBuilder {
  return new QueryBuilder(db);
}
