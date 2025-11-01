import { z } from 'zod';
import type { SQLiteDatabase } from './sqlite';
import { BaseDAO } from './dao-base';

// Define schema that matches the actual database schema
export const DatabaseTradeSchema = z.object({
  id: z.number().int().positive().optional(),
  portfolio_id: z.number().int().positive(),
  symbol_id: z.number().int().positive(),
  trade_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  settlement_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),

  // Trade identification
  order_id: z.string().nullable().optional(),
  execution_id: z.string().nullable().optional(),

  // Trade details (matching database schema field names)
  action: z.enum(['BUY_TO_OPEN', 'SELL_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_CLOSE']),
  instrument_type: z.enum(['OPTION', 'STOCK', 'ETF']),
  quantity: z.number().int(),
  price: z.number(),
  fees: z.number().nonnegative().default(0),
  commissions: z.number().nonnegative().default(0),

  // Options-specific fields
  option_type: z.enum(['CALL', 'PUT']).nullable().optional(),
  strike_price: z.number().nullable().optional(),
  expiration_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  multiplier: z.number().int().default(100).optional(),

  // Trade context
  strategy_id: z.number().int().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  tags: z.string().nullable().optional(), // JSON array as string

  // Metadata
  import_source: z.string().nullable().optional(),
  import_batch_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type DatabaseTrade = z.infer<typeof DatabaseTradeSchema>;

/**
 * Trade Data Access Object
 * Handles persistence of trade records to the database
 */
export class TradeDAO extends BaseDAO<DatabaseTrade> {
  constructor(db: SQLiteDatabase) {
    super(db, 'trades', DatabaseTradeSchema);
  }

  /**
   * Find trades by portfolio ID
   */
  async findByPortfolioId(portfolioId: number): Promise<DatabaseTrade[]> {
    return this.executeQuery<DatabaseTrade>(
      'SELECT * FROM trades WHERE portfolio_id = ? ORDER BY trade_date DESC',
      [portfolioId],
      DatabaseTradeSchema
    );
  }

  /**
   * Find trades by symbol ID
   */
  async findBySymbolId(symbolId: number): Promise<DatabaseTrade[]> {
    return this.executeQuery<DatabaseTrade>(
      'SELECT * FROM trades WHERE symbol_id = ? ORDER BY trade_date DESC',
      [symbolId],
      DatabaseTradeSchema
    );
  }

  /**
   * Find trades by import batch ID
   */
  async findByImportBatchId(batchId: string): Promise<DatabaseTrade[]> {
    return this.executeQuery<DatabaseTrade>(
      'SELECT * FROM trades WHERE import_batch_id = ? ORDER BY trade_date DESC',
      [batchId],
      DatabaseTradeSchema
    );
  }

  /**
   * Get trade count by portfolio
   */
  async getTradeCountByPortfolio(portfolioId: number): Promise<number> {
    const result = await this.executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM trades WHERE portfolio_id = ?',
      [portfolioId],
      z.object({ count: z.number() })
    );

    return result[0]?.count || 0;
  }

  /**
   * Get distinct symbols from trades
   */
  async getDistinctSymbolIds(portfolioId?: number): Promise<number[]> {
    const query = portfolioId
      ? 'SELECT DISTINCT symbol_id FROM trades WHERE portfolio_id = ?'
      : 'SELECT DISTINCT symbol_id FROM trades';

    const params = portfolioId ? [portfolioId] : [];

    const result = await this.executeQuery<{ symbol_id: number }>(
      query,
      params,
      z.object({ symbol_id: z.number() })
    );

    return result.map(row => row.symbol_id);
  }

  /**
   * Get upcoming option expirations with position details
   * Returns options that haven't expired yet, grouped by expiration date
   */
  async getUpcomingExpirations(
    startDate?: string,
    endDate?: string
  ): Promise<
    {
      trade_id: number;
      symbol: string;
      option_type: string;
      strike_price: number;
      expiration_date: string;
      quantity: number;
      action: string;
    }[]
  > {
    const today = startDate || new Date().toISOString().split('T')[0];
    const futureLimit =
      endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await this.executeQuery<{
      trade_id: number;
      symbol: string;
      option_type: string;
      strike_price: number;
      expiration_date: string;
      quantity: number;
      action: string;
    }>(
      `SELECT 
        t.id as trade_id,
        s.symbol,
        t.option_type,
        t.strike_price,
        t.expiration_date,
        t.quantity,
        t.action
      FROM trades t
      JOIN symbols s ON t.symbol_id = s.id
      WHERE t.instrument_type = 'OPTION'
        AND t.expiration_date IS NOT NULL
        AND t.expiration_date >= ?
        AND t.expiration_date <= ?
      ORDER BY t.expiration_date ASC, s.symbol ASC`,
      [today, futureLimit],
      z.object({
        trade_id: z.number(),
        symbol: z.string(),
        option_type: z.string(),
        strike_price: z.number(),
        expiration_date: z.string(),
        quantity: z.number(),
        action: z.string(),
      })
    );

    return result;
  }

  /**
   * Get net option positions (aggregated by symbol/strike/expiration)
   */
  async getNetOptionPositions(): Promise<
    {
      symbol: string;
      option_type: string;
      strike_price: number;
      expiration_date: string;
      net_quantity: number;
      avg_price: number;
    }[]
  > {
    const result = await this.executeQuery<{
      symbol: string;
      option_type: string;
      strike_price: number;
      expiration_date: string;
      net_quantity: number;
      avg_price: number;
    }>(
      `SELECT 
        s.symbol,
        t.option_type,
        t.strike_price,
        t.expiration_date,
        SUM(CASE 
          WHEN t.action IN ('SELL_TO_OPEN', 'BUY_TO_CLOSE') THEN -t.quantity
          WHEN t.action IN ('BUY_TO_OPEN', 'SELL_TO_CLOSE') THEN t.quantity
          ELSE 0 
        END) as net_quantity,
        AVG(t.price) as avg_price
      FROM trades t
      JOIN symbols s ON t.symbol_id = s.id
      WHERE t.instrument_type = 'OPTION'
        AND t.expiration_date IS NOT NULL
        AND t.expiration_date >= date('now')
      GROUP BY s.symbol, t.option_type, t.strike_price, t.expiration_date
      HAVING net_quantity != 0
      ORDER BY t.expiration_date ASC, s.symbol ASC`,
      [],
      z.object({
        symbol: z.string(),
        option_type: z.string(),
        strike_price: z.number(),
        expiration_date: z.string(),
        net_quantity: z.number(),
        avg_price: z.number(),
      })
    );

    return result;
  }

  /**
   * Update expiration date for a specific trade
   */
  async updateExpirationDate(tradeId: number, newExpirationDate: string): Promise<boolean> {
    try {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newExpirationDate)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      await this.db.exec(
        'UPDATE trades SET expiration_date = ?, updated_at = datetime("now") WHERE id = ? AND instrument_type = "OPTION"',
        [newExpirationDate, tradeId]
      );

      return true;
    } catch (error) {
      console.error('Failed to update expiration date:', error);
      return false;
    }
  }
}
