import { z } from 'zod';
import type { SQLiteDatabase } from './sqlite';
import { BaseDAO } from './dao-base';
import { SymbolSchema, type Symbol } from './validation';

/**
 * Symbol Data Access Object
 * Handles business logic for symbol operations
 */
export class SymbolDAO extends BaseDAO<Symbol> {
  constructor(db: SQLiteDatabase) {
    super(db, 'symbols', SymbolSchema);
  }

  /**
   * Find symbol by ticker symbol
   */
  async findBySymbol(symbol: string): Promise<Symbol | null> {
    const results = await this.executeQuery<Symbol>(
      'SELECT * FROM symbols WHERE symbol = ? LIMIT 1',
      [symbol.toUpperCase()],
      SymbolSchema
    );

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find or create a symbol
   */
  async findOrCreate(
    symbolData: Omit<Symbol, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Symbol> {
    // Try to find existing symbol
    const existing = await this.findBySymbol(symbolData.symbol);
    if (existing) {
      return existing;
    }

    // Create new symbol
    const result = await this.create(symbolData);
    if (!result.success || !result.data) {
      throw new Error(`Failed to create symbol: ${result.error || 'Unknown error'}`);
    }

    return result.data;
  }

  /**
   * Search symbols by symbol or company name
   */
  async search(query: string, limit: number = 10): Promise<Symbol[]> {
    const searchTerm = `%${query.toUpperCase()}%`;

    return this.executeQuery<Symbol>(
      `SELECT * FROM symbols 
       WHERE UPPER(symbol) LIKE ? OR UPPER(company_name) LIKE ?
       ORDER BY 
         CASE WHEN UPPER(symbol) = ? THEN 1 ELSE 2 END,
         LENGTH(symbol),
         symbol
       LIMIT ?`,
      [searchTerm, searchTerm, query.toUpperCase(), limit],
      SymbolSchema
    );
  }

  /**
   * Get symbols with trade counts
   */
  async findAllWithTradeCounts(): Promise<Array<Symbol & { trade_count: number }>> {
    const ExtendedSymbolSchema = SymbolSchema.extend({
      trade_count: z.number(),
    });

    return this.executeQuery(
      `SELECT 
        s.*,
        COUNT(t.id) as trade_count
      FROM symbols s
      LEFT JOIN trades t ON s.id = t.symbol_id
      GROUP BY s.id
      ORDER BY trade_count DESC, s.symbol`,
      [],
      ExtendedSymbolSchema
    );
  }

  /**
   * Get most traded symbols
   */
  async getMostTraded(
    limit: number = 10
  ): Promise<Array<Symbol & { trade_count: number; total_volume: number }>> {
    const MostTradedSchema = SymbolSchema.extend({
      trade_count: z.number(),
      total_volume: z.number(),
    });

    return this.executeQuery(
      `SELECT 
        s.*,
        COUNT(t.id) as trade_count,
        COALESCE(SUM(t.quantity), 0) as total_volume
      FROM symbols s
      JOIN trades t ON s.id = t.symbol_id
      GROUP BY s.id
      HAVING trade_count > 0
      ORDER BY trade_count DESC, total_volume DESC
      LIMIT ?`,
      [limit],
      MostTradedSchema
    );
  }

  /**
   * Update symbol market data (removing this method since it's not part of our schema)
   */
  // Note: Current schema doesn't include market data fields
  // This method would be implemented when schema is extended

  /**
   * Validate symbol data before creation
   */
  protected async beforeCreate(
    data: Omit<Symbol, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Omit<Symbol, 'id' | 'created_at' | 'updated_at'>> {
    // Normalize symbol to uppercase
    data.symbol = data.symbol.toUpperCase();

    // Check for duplicate symbols
    const existing = await this.findBySymbol(data.symbol);
    if (existing) {
      throw new Error(`Symbol "${data.symbol}" already exists`);
    }

    return data;
  }

  /**
   * Validate symbol data before update
   */
  protected async beforeUpdate(
    id: number,
    data: Partial<Omit<Symbol, 'id' | 'created_at'>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _existing: Symbol
  ): Promise<Partial<Omit<Symbol, 'id' | 'created_at'>>> {
    // Normalize symbol if being updated
    if (data.symbol) {
      data.symbol = data.symbol.toUpperCase();

      // Check for duplicate symbols
      const existing = await this.findBySymbol(data.symbol);
      if (existing && existing.id !== id) {
        throw new Error(`Symbol "${data.symbol}" already exists`);
      }
    }

    return data;
  }

  /**
   * Prevent deletion of symbols with existing trades
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async beforeDelete(id: number, _entity: Symbol): Promise<void> {
    // Check for existing trades
    const tradeCount = await this.executeQuery(
      'SELECT COUNT(*) as count FROM trades WHERE symbol_id = ?',
      [id]
    );

    if (tradeCount.length > 0 && (tradeCount[0] as { count: number }).count > 0) {
      throw new Error('Cannot delete symbol with existing trades. Please delete all trades first.');
    }
  }
}
