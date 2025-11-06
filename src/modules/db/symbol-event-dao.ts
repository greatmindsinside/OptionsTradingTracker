import { z } from 'zod';

import { BaseDAO } from './dao-base';
import type { SQLiteDatabase } from './sqlite';

/**
 * Symbol Event Schema
 * Tracks important dates for symbols (earnings, dividends, splits, etc.)
 */
export const SymbolEventSchema = z.object({
  id: z.number().optional(),
  symbol_id: z.number(),
  event_type: z.enum(['earnings', 'ex_dividend', 'dividend_payment', 'split', 'custom']),
  event_date: z.string(), // ISO date string YYYY-MM-DD
  event_time: z.string().nullable().optional(), // Optional time HH:MM:SS
  description: z.string().nullable().optional(),
  amount: z.number().nullable().optional(), // For dividends, split ratio, etc.
  confirmed: z.number().default(0), // 0 = estimated, 1 = confirmed
  source: z.string().nullable().optional(), // Where the data came from
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type SymbolEvent = z.infer<typeof SymbolEventSchema>;

/**
 * Symbol Event Data Access Object
 * Handles business logic for symbol event operations
 */
export class SymbolEventDAO extends BaseDAO<SymbolEvent> {
  constructor(db: SQLiteDatabase) {
    super(db, 'symbol_events', SymbolEventSchema);
  }

  /**
   * Find all events for a specific symbol
   */
  async findBySymbolId(symbolId: number, eventType?: string): Promise<SymbolEvent[]> {
    const sql = eventType
      ? 'SELECT * FROM symbol_events WHERE symbol_id = ? AND event_type = ? ORDER BY event_date ASC'
      : 'SELECT * FROM symbol_events WHERE symbol_id = ? ORDER BY event_date ASC';

    const params = eventType ? [symbolId, eventType] : [symbolId];

    return this.executeQuery<SymbolEvent>(sql, params, SymbolEventSchema);
  }

  /**
   * Find upcoming events within a date range
   */
  async findUpcoming(
    startDate: string,
    endDate?: string,
    eventType?: string
  ): Promise<Array<SymbolEvent & { symbol: string }>> {
    const ExtendedSchema = SymbolEventSchema.extend({
      symbol: z.string(),
    });

    let sql = `
      SELECT 
        se.*,
        s.symbol
      FROM symbol_events se
      JOIN symbols s ON se.symbol_id = s.id
      WHERE se.event_date >= ?
    `;

    const params: (string | number)[] = [startDate];

    if (endDate) {
      sql += ' AND se.event_date <= ?';
      params.push(endDate);
    }

    if (eventType) {
      sql += ' AND se.event_type = ?';
      params.push(eventType);
    }

    sql += ' ORDER BY se.event_date ASC';

    return this.executeQuery(sql, params, ExtendedSchema);
  }

  /**
   * Find earnings dates for multiple symbols
   */
  async findEarningsBySymbols(
    symbolIds: number[]
  ): Promise<Array<SymbolEvent & { symbol: string }>> {
    if (symbolIds.length === 0) return [];

    const ExtendedSchema = SymbolEventSchema.extend({
      symbol: z.string(),
    });

    const placeholders = symbolIds.map(() => '?').join(',');
    const sql = `
      SELECT 
        se.*,
        s.symbol
      FROM symbol_events se
      JOIN symbols s ON se.symbol_id = s.id
      WHERE se.symbol_id IN (${placeholders})
        AND se.event_type = 'earnings'
      ORDER BY se.event_date ASC
    `;

    return this.executeQuery(sql, symbolIds, ExtendedSchema);
  }

  /**
   * Get the next earnings date for a symbol
   */
  async getNextEarningsDate(symbolId: number, afterDate?: string): Promise<SymbolEvent | null> {
    const today = afterDate || new Date().toISOString().split('T')[0];

    const results = await this.executeQuery<SymbolEvent>(
      `SELECT * FROM symbol_events 
       WHERE symbol_id = ? 
         AND event_type = 'earnings'
         AND event_date >= ?
       ORDER BY event_date ASC
       LIMIT 1`,
      [symbolId, today],
      SymbolEventSchema
    );

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Upsert an event (insert or update if exists)
   */
  async upsertEvent(
    event: Omit<SymbolEvent, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SymbolEvent> {
    // Check if event already exists
    const existing = await this.executeQuery<SymbolEvent>(
      `SELECT * FROM symbol_events 
       WHERE symbol_id = ? 
         AND event_type = ? 
         AND event_date = ?
       LIMIT 1`,
      [event.symbol_id, event.event_type, event.event_date],
      SymbolEventSchema
    );

    if (existing.length > 0) {
      // Update existing event
      const result = await this.update(existing[0].id!, event);
      if (!result.success || !result.data) {
        throw new Error(`Failed to update event: ${result.error || 'Unknown error'}`);
      }
      return result.data;
    } else {
      // Create new event
      const result = await this.create(event);
      if (!result.success || !result.data) {
        throw new Error(`Failed to create event: ${result.error || 'Unknown error'}`);
      }
      return result.data;
    }
  }

  /**
   * Delete past events older than a certain date
   */
  async deletePastEvents(beforeDate: string, eventType?: string): Promise<number> {
    let sql = 'DELETE FROM symbol_events WHERE event_date < ?';
    const params: (string | number)[] = [beforeDate];

    if (eventType) {
      sql += ' AND event_type = ?';
      params.push(eventType);
    }

    try {
      this.db.exec(sql, params);
      // SQLite doesn't return affected rows easily, so we'll return 0
      return 0;
    } catch (error) {
      console.error('Failed to delete past events:', error);
      throw error;
    }
  }

  /**
   * Validate event data before creation
   */
  protected async beforeCreate(
    data: Omit<SymbolEvent, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Omit<SymbolEvent, 'id' | 'created_at' | 'updated_at'>> {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.event_date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    // Validate time format if provided
    if (data.event_time) {
      const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
      if (!timeRegex.test(data.event_time)) {
        throw new Error('Invalid time format. Use HH:MM or HH:MM:SS');
      }
    }

    return data;
  }
}
