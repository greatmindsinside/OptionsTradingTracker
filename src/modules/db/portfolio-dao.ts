import { z } from 'zod';

import { BaseDAO } from './dao-base';
import type { SQLiteDatabase } from './sqlite';
import { type Portfolio, PortfolioSchema } from './validation';

/**
 * Portfolio Data Access Object
 * Handles business logic for portfolio operations
 */
export class PortfolioDAO extends BaseDAO<Portfolio> {
  constructor(db: SQLiteDatabase) {
    super(db, 'portfolios', PortfolioSchema);
  }

  /**
   * Find portfolio by name
   */
  async findByName(name: string): Promise<Portfolio | null> {
    const results = await this.executeQuery<Portfolio>(
      'SELECT * FROM portfolios WHERE name = ? LIMIT 1',
      [name],
      PortfolioSchema
    );

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all portfolios with trade counts
   */
  async findAllWithTradeCounts(): Promise<Array<Portfolio & { trade_count: number }>> {
    const ExtendedPortfolioSchema = PortfolioSchema.extend({
      trade_count: z.number(),
    });

    try {
      // Execute raw query to get results
      const rawResults = this.db.query(
        `SELECT 
          p.*,
          COUNT(t.id) as trade_count
        FROM portfolios p
        LEFT JOIN trades t ON p.id = t.portfolio_id
        GROUP BY p.id
        ORDER BY p.name`
      );

      // Transform SQLite types to match Zod schema expectations
      const transformedResults = rawResults.map((row: Record<string, unknown>) => {
        const transformed = { ...row };

        // Convert null to undefined for optional fields
        if (transformed.account_number === null) {
          transformed.account_number = undefined;
        }
        if (transformed.description === null) {
          transformed.description = undefined;
        }

        // Convert INTEGER (0/1) to boolean for is_active
        if (typeof transformed.is_active === 'number') {
          transformed.is_active = transformed.is_active === 1;
        }

        // Ensure timestamps are proper ISO strings (Zod expects datetime format)
        if (transformed.created_at && typeof transformed.created_at === 'string') {
          try {
            // Validate and normalize the timestamp
            const date = new Date(transformed.created_at);
            if (!isNaN(date.getTime())) {
              transformed.created_at = date.toISOString();
            }
          } catch {
            // If timestamp conversion fails, let Zod handle the validation error
          }
        }

        if (transformed.updated_at && typeof transformed.updated_at === 'string') {
          try {
            // Validate and normalize the timestamp
            const date = new Date(transformed.updated_at);
            if (!isNaN(date.getTime())) {
              transformed.updated_at = date.toISOString();
            }
          } catch {
            // If timestamp conversion fails, let Zod handle the validation error
          }
        }

        return transformed;
      });

      // Now validate with Zod schema
      return transformedResults.map((row, index) => {
        const validation = ExtendedPortfolioSchema.safeParse(row);
        if (!validation.success) {
          console.error('Portfolio validation failed at row', index, ':', validation.error.issues);
          throw new Error(
            `Query result validation failed at row ${index}: ${validation.error.issues.map(i => i.message).join(', ')}`
          );
        }
        return validation.data;
      });
    } catch (error) {
      console.error('findAllWithTradeCounts error:', error);
      throw error;
    }
  }

  /**
   * Get portfolio with current positions
   */
  async findWithPositions(id: number): Promise<{
    portfolio: Portfolio;
    positions: Array<{
      id: number;
      symbol: string;
      position_type: string;
      quantity: number;
      average_price: number;
      current_value: number;
      unrealized_pnl: number;
    }>;
  } | null> {
    const portfolio = await this.findById(id);
    if (!portfolio.success || !portfolio.data) {
      return null;
    }

    const PositionSummarySchema = z.object({
      id: z.number(),
      symbol: z.string(),
      position_type: z.string(),
      quantity: z.number(),
      average_price: z.number(),
      current_value: z.number(),
      unrealized_pnl: z.number(),
    });

    const positions = await this.executeQuery(
      `SELECT 
        pos.id,
        s.symbol,
        pos.position_type,
        pos.quantity,
        pos.average_price,
        pos.current_value,
        pos.unrealized_pnl
      FROM positions pos
      JOIN symbols s ON pos.symbol_id = s.id
      WHERE pos.portfolio_id = ?
      AND pos.quantity != 0
      ORDER BY s.symbol`,
      [id],
      PositionSummarySchema
    );

    return {
      portfolio: portfolio.data,
      positions,
    };
  }

  /**
   * Calculate portfolio performance metrics
   */
  async getPerformanceMetrics(id: number): Promise<{
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    total_pnl: number;
    avg_win: number;
    avg_loss: number;
    profit_factor: number;
  } | null> {
    const MetricsSchema = z.object({
      total_trades: z.number(),
      winning_trades: z.number(),
      losing_trades: z.number(),
      total_pnl: z.number(),
      total_wins: z.number(),
      total_losses: z.number(),
    });

    const results = await this.executeQuery(
      `SELECT 
        COUNT(*) as total_trades,
        SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN realized_pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        COALESCE(SUM(realized_pnl), 0) as total_pnl,
        COALESCE(SUM(CASE WHEN realized_pnl > 0 THEN realized_pnl ELSE 0 END), 0) as total_wins,
        COALESCE(SUM(CASE WHEN realized_pnl < 0 THEN ABS(realized_pnl) ELSE 0 END), 0) as total_losses
      FROM trades 
      WHERE portfolio_id = ? 
      AND status = 'closed'`,
      [id],
      MetricsSchema
    );

    if (results.length === 0) {
      return null;
    }

    const metrics = results[0];
    const winRate =
      metrics.total_trades > 0 ? (metrics.winning_trades / metrics.total_trades) * 100 : 0;
    const avgWin = metrics.winning_trades > 0 ? metrics.total_wins / metrics.winning_trades : 0;
    const avgLoss = metrics.losing_trades > 0 ? metrics.total_losses / metrics.losing_trades : 0;
    const profitFactor =
      metrics.total_losses > 0
        ? metrics.total_wins / metrics.total_losses
        : metrics.total_wins > 0
          ? 999
          : 0;

    return {
      total_trades: metrics.total_trades,
      winning_trades: metrics.winning_trades,
      losing_trades: metrics.losing_trades,
      win_rate: Math.round(winRate * 100) / 100,
      total_pnl: metrics.total_pnl,
      avg_win: Math.round(avgWin * 100) / 100,
      avg_loss: Math.round(avgLoss * 100) / 100,
      profit_factor: Math.round(profitFactor * 100) / 100,
    };
  }

  /**
   * Validate portfolio name uniqueness before creation
   */
  protected async beforeCreate(
    data: Omit<Portfolio, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Omit<Portfolio, 'id' | 'created_at' | 'updated_at'>> {
    // Check for duplicate portfolio names
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new Error(`Portfolio with name "${data.name}" already exists`);
    }

    return data;
  }

  /**
   * Validate portfolio name uniqueness before update
   */
  protected async beforeUpdate(
    id: number,
    data: Partial<Omit<Portfolio, 'id' | 'created_at'>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _existing: Portfolio
  ): Promise<Partial<Omit<Portfolio, 'id' | 'created_at'>>> {
    // Check for duplicate portfolio names if name is being updated
    if (data.name) {
      const existing = await this.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new Error(`Portfolio with name "${data.name}" already exists`);
      }
    }

    return data;
  }

  /**
   * Prevent deletion of portfolios with active trades or positions
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async beforeDelete(id: number, _entity: Portfolio): Promise<void> {
    // Check for active trades
    const tradeCount = await this.executeQuery(
      'SELECT COUNT(*) as count FROM trades WHERE portfolio_id = ?',
      [id]
    );

    if (tradeCount.length > 0 && (tradeCount[0] as { count: number }).count > 0) {
      throw new Error(
        'Cannot delete portfolio with existing trades. Please close or delete all trades first.'
      );
    }

    // Check for active positions
    const positionCount = await this.executeQuery(
      'SELECT COUNT(*) as count FROM positions WHERE portfolio_id = ? AND quantity != 0',
      [id]
    );

    if (positionCount.length > 0 && (positionCount[0] as { count: number }).count > 0) {
      throw new Error(
        'Cannot delete portfolio with open positions. Please close all positions first.'
      );
    }
  }
}
