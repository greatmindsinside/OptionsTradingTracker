/**
 * Wheel Cycles Data Access Object
 * Manages CRUD operations for wheel strategy cycles
 */

import { WheelState } from '@/modules/wheel/lifecycle';

import { BaseDAO } from './dao-base';
import type { PaginatedResult } from './query-helpers';
import type { SQLiteDatabase } from './sqlite';
import {
  type WheelCycle,
  WheelCycleSchema,
  type WheelEvent_Record as WheelEventRecord,
  WheelEventSchema,
} from './validation';

export interface WheelCycleFilters {
  portfolioId?: number;
  status?: WheelState;
  underlyingSymbol?: string;
  isActive?: boolean;
}

export interface WheelCycleSummary {
  totalCycles: number;
  activeCycles: number;
  completedCycles: number;
  totalPremium: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  averageReturn: number;
}

export class WheelDAO extends BaseDAO<WheelCycle> {
  constructor(db: SQLiteDatabase) {
    super(db, 'wheel_cycles', WheelCycleSchema);
  }

  /**
   * Find all wheel cycles with optional filtering
   */
  async findWithFilters(filters: WheelCycleFilters = {}): Promise<PaginatedResult<WheelCycle>> {
    try {
      let whereClause = '1=1';
      const params: (string | number)[] = [];

      if (filters.portfolioId) {
        whereClause += ' AND portfolio_id = ?';
        params.push(filters.portfolioId);
      }

      if (filters.status) {
        whereClause += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.underlyingSymbol) {
        whereClause += ' AND underlying_symbol = ?';
        params.push(filters.underlyingSymbol);
      }

      if (filters.isActive !== undefined) {
        if (filters.isActive) {
          whereClause += ' AND status != ?';
          params.push(WheelState.CLOSED);
        } else {
          whereClause += ' AND status = ?';
          params.push(WheelState.CLOSED);
        }
      }

      const result = await this.findAll(
        { orderBy: 'created_at', orderDirection: 'DESC' },
        whereClause,
        params
      );

      return result;
    } catch (error) {
      console.error('Error finding wheel cycles with filters:', error);
      return {
        success: false,
        error: `Failed to find wheel cycles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get summary statistics for wheel cycles
   */
  async getSummary(): Promise<{ success: boolean; data?: WheelCycleSummary; error?: string }> {
    try {
      // For now, return default summary - can be enhanced later with actual database queries
      const summary: WheelCycleSummary = {
        totalCycles: 0,
        activeCycles: 0,
        completedCycles: 0,
        totalPremium: 0,
        totalRealizedPnL: 0,
        totalUnrealizedPnL: 0,
        averageReturn: 0,
      };

      return { success: true, data: summary };
    } catch (error) {
      console.error('Error getting wheel cycle summary:', error);
      return {
        success: false,
        error: `Failed to get summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Find wheel cycles by underlying symbol
   */
  async findBySymbol(symbol: string, portfolioId?: number) {
    const filters: WheelCycleFilters = { underlyingSymbol: symbol };
    if (portfolioId) {
      filters.portfolioId = portfolioId;
    }
    return this.findWithFilters(filters);
  }

  /**
   * Find active wheel cycles
   */
  async findActive(portfolioId?: number) {
    const filters: WheelCycleFilters = { isActive: true };
    if (portfolioId) {
      filters.portfolioId = portfolioId;
    }
    return this.findWithFilters(filters);
  }
}

/**
 * Wheel Events Data Access Object
 */
export class WheelEventDAO extends BaseDAO<WheelEventRecord> {
  constructor(db: SQLiteDatabase) {
    super(db, 'wheel_events', WheelEventSchema);
  }

  /**
   * Find events for a specific lifecycle
   */
  async findByLifecycleId(lifecycleId: string) {
    return this.findAll({}, 'lifecycle_id = ?', [lifecycleId]);
  }

  /**
   * Find recent events across all cycles
   */
  async findRecent(limit = 50) {
    return this.findAll({ limit, orderBy: 'event_date', orderDirection: 'DESC' });
  }
}
