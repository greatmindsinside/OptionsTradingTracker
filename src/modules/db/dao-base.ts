import { z } from 'zod';
import type { SQLiteDatabase, SqlValue } from './sqlite';
import {
  QueryHelper,
  type QueryResult,
  type PaginatedResult,
  type PaginationOptions,
} from './query-helpers';
import { DatabaseError, ValidationError, NotFoundError } from './query-helpers';

/**
 * Base Data Access Object providing common operations for all entities
 * Combines validation, query helpers, and business logic
 */
export abstract class BaseDAO<T> {
  protected queryHelper: QueryHelper<T>;
  protected db: SQLiteDatabase;
  protected tableName: string;
  protected schema: z.ZodSchema<T>;

  constructor(
    db: SQLiteDatabase,
    tableName: string,
    schema: z.ZodSchema<T>,
    idField: string = 'id'
  ) {
    this.db = db;
    this.tableName = tableName;
    this.schema = schema;
    this.queryHelper = new QueryHelper(db, tableName, schema, idField);
  }

  /**
   * Create a new entity with validation and business rules
   */
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<QueryResult<T>> {
    try {
      // Apply business rules before creation
      const processedData = await this.beforeCreate(data);

      // Create the entity
      const result = await this.queryHelper.create(processedData);

      if (result.success && result.data) {
        // Apply post-creation business logic
        await this.afterCreate(result.data);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during creation',
      };
    }
  }

  /**
   * Find entity by ID with optional related data
   */
  async findById(id: number, includeRelated: boolean = false): Promise<QueryResult<T>> {
    const result = await this.queryHelper.findById(id);

    if (result.success && result.data && includeRelated) {
      // Load related data if requested
      const enrichedData = await this.loadRelatedData(result.data);
      return {
        success: true,
        data: enrichedData,
      };
    }

    return result;
  }

  /**
   * Find all entities with pagination and optional filtering
   */
  async findAll(
    options: PaginationOptions = {},
    whereClause?: string,
    whereParams: unknown[] = []
  ): Promise<PaginatedResult<T>> {
    return this.queryHelper.findAll(options, whereClause, whereParams);
  }

  /**
   * Update entity with validation and business rules
   */
  async update(id: number, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<QueryResult<T>> {
    try {
      // Check if entity exists
      const existing = await this.queryHelper.findById(id);
      if (!existing.success || !existing.data) {
        throw new NotFoundError(this.tableName, id);
      }

      // Apply business rules before update
      const processedData = await this.beforeUpdate(id, data, existing.data);

      // Update the entity
      const result = await this.queryHelper.update(id, processedData);

      if (result.success && result.data) {
        // Apply post-update business logic
        await this.afterUpdate(id, result.data, existing.data);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during update',
      };
    }
  }

  /**
   * Delete entity with business rule validation
   */
  async delete(id: number): Promise<QueryResult<boolean>> {
    try {
      // Check if entity exists and can be deleted
      const existing = await this.queryHelper.findById(id);
      if (!existing.success || !existing.data) {
        throw new NotFoundError(this.tableName, id);
      }

      // Apply business rules before deletion
      await this.beforeDelete(id, existing.data);

      // Delete the entity
      const result = await this.queryHelper.delete(id);

      if (result.success) {
        // Apply post-deletion business logic
        await this.afterDelete(id, existing.data);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during deletion',
      };
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: number): Promise<boolean> {
    const result = await this.queryHelper.exists(id);
    return result.success ? (result.data ?? false) : false;
  }

  /**
   * Count entities with optional filtering
   */
  async count(whereClause?: string, whereParams: unknown[] = []): Promise<number> {
    const result = await this.queryHelper.count(whereClause, whereParams);
    return result.success ? (result.data ?? 0) : 0;
  }

  /**
   * Batch create multiple entities in a transaction
   */
  async createBatch(entities: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<{
    success: boolean;
    created: T[];
    errors: Array<{ index: number; error: string; data: unknown }>;
  }> {
    const created: T[] = [];
    const errors: Array<{ index: number; error: string; data: unknown }> = [];

    try {
      // Execute batch creation in a transaction
      await this.db.transaction([{ sql: 'BEGIN TRANSACTION' }]);

      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        try {
          const result = await this.create(entity);
          if (result.success && result.data) {
            created.push(result.data);
          } else {
            errors.push({
              index: i,
              error: result.error || 'Unknown error',
              data: entity,
            });
          }
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: entity,
          });
        }
      }

      // Commit if successful, rollback if too many errors
      if (errors.length === 0) {
        await this.db.transaction([{ sql: 'COMMIT' }]);
        return { success: true, created, errors };
      } else {
        await this.db.transaction([{ sql: 'ROLLBACK' }]);
        return { success: false, created: [], errors };
      }
    } catch (error) {
      await this.db.transaction([{ sql: 'ROLLBACK' }]);
      throw new DatabaseError(
        `Batch creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_CREATE',
        this.tableName
      );
    }
  }

  /**
   * Execute a custom query with validation
   */
  protected async executeQuery<R>(
    sql: string,
    params: unknown[] = [],
    resultSchema?: z.ZodSchema<R>
  ): Promise<R[]> {
    try {
      const results = this.db.query(sql, params as SqlValue[]);

      if (resultSchema) {
        // Validate results if schema provided
        return results.map((row, index) => {
          const validation = resultSchema.safeParse(row);
          if (!validation.success) {
            throw new ValidationError(`Query result validation failed at row ${index}`, [
              'query_result',
            ]);
          }
          return validation.data;
        });
      }

      return results as R[];
    } catch (error) {
      throw new DatabaseError(
        `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUERY',
        this.tableName
      );
    }
  }

  // Hook methods for business logic - to be overridden by subclasses

  /**
   * Called before entity creation - override for business rules
   */
  protected async beforeCreate(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Omit<T, 'id' | 'created_at' | 'updated_at'>> {
    return data;
  }

  /**
   * Called after entity creation - override for side effects
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async afterCreate(_entity: T): Promise<void> {
    // Override in subclasses
  }

  /**
   * Called before entity update - override for business rules
   */
  protected async beforeUpdate(
    _id: number,
    data: Partial<Omit<T, 'id' | 'created_at'>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _existing: T
  ): Promise<Partial<Omit<T, 'id' | 'created_at'>>> {
    return data;
  }

  /**
   * Called after entity update - override for side effects
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async afterUpdate(_id: number, _updated: T, _previous: T): Promise<void> {
    // Override in subclasses
  }

  /**
   * Called before entity deletion - override for business rules
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async beforeDelete(_id: number, _entity: T): Promise<void> {
    // Override in subclasses
  }

  /**
   * Called after entity deletion - override for side effects
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async afterDelete(_id: number, _entity: T): Promise<void> {
    // Override in subclasses
  }

  /**
   * Load related data for an entity - override in subclasses
   */
  protected async loadRelatedData(entity: T): Promise<T> {
    return entity; // Default: no related data
  }
}

/**
 * Types for batch operations
 */
export interface BatchResult<T> {
  success: boolean;
  created: T[];
  errors: Array<{ index: number; error: string; data: unknown }>;
  total: number;
  successCount: number;
  errorCount: number;
}

/**
 * Types for DAO operations
 */
export interface DAOOptions {
  includeRelated?: boolean;
  skipValidation?: boolean;
  skipBusinessRules?: boolean;
}

/**
 * Export common error types for DAO implementations
 */
export { DatabaseError, ValidationError, NotFoundError };
