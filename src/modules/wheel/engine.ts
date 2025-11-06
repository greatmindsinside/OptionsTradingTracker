/**
 * Wheel Lifecycle Engine
 *
 * Simplified engine for managing wheel strategy cycles.
 * Provides basic CRUD operations and lifecycle management.
 */

import { QueryHelper } from '@/modules/db/query-helpers';
import { SQLiteDatabase } from '@/modules/db/sqlite';
import {
  type WheelCycle,
  WheelCycleSchema,
  type WheelEvent_Record as WheelEventRecord,
  WheelEventSchema,
} from '@/modules/db/validation';
import {
  generateLifecycleId,
  validateStateTransition,
  WheelEvent,
  WheelState,
} from '@/modules/wheel/lifecycle';

export interface CycleCreationData {
  portfolioId: number;
  symbolId: number;
  underlyingSymbol: string;
  initialState: WheelState;
  initialPremium: number;
}

export interface CycleUpdateData {
  status?: WheelState;
  totalNetCredit?: number;
  costBasis?: number;
  sharesOwned?: number;
  totalPremiumCollected?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  annualizedReturn?: number;
}

/**
 * Wheel strategy lifecycle management engine
 */
export class WheelLifecycleEngine {
  private db: SQLiteDatabase;
  private cycleHelper: QueryHelper<WheelCycle>;
  private eventHelper: QueryHelper<WheelEventRecord>;

  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.cycleHelper = new QueryHelper(db, 'wheel_cycles', WheelCycleSchema);
    this.eventHelper = new QueryHelper(db, 'wheel_events', WheelEventSchema);
  }

  /**
   * Create a new wheel cycle manually
   */
  async createCycle(data: CycleCreationData): Promise<WheelCycle> {
    const lifecycleId = generateLifecycleId(data.underlyingSymbol, new Date());

    const cycle: Omit<WheelCycle, 'id' | 'created_at' | 'updated_at'> = {
      lifecycle_id: lifecycleId,
      portfolio_id: data.portfolioId,
      symbol_id: data.symbolId,
      underlying_symbol: data.underlyingSymbol,
      status: data.initialState,
      total_net_credit: data.initialPremium,
      cost_basis: undefined,
      shares_owned: undefined,
      csp_trade_ids: '[]',
      cc_trade_ids: '[]',
      stock_trade_ids: '[]',
      total_premium_collected: Math.max(0, data.initialPremium),
      realized_pnl: undefined,
      unrealized_pnl: undefined,
      days_active: 0,
      annualized_return: undefined,
    };

    const result = await this.cycleHelper.create(cycle);
    if (!result.success || !result.data) {
      throw new Error(`Failed to create wheel cycle: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Update an existing wheel cycle
   */
  async updateCycle(cycleId: number, updates: CycleUpdateData): Promise<WheelCycle> {
    const updateData: Partial<WheelCycle> = {};

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.totalNetCredit !== undefined) updateData.total_net_credit = updates.totalNetCredit;
    if (updates.costBasis !== undefined) updateData.cost_basis = updates.costBasis;
    if (updates.sharesOwned !== undefined) updateData.shares_owned = updates.sharesOwned;
    if (updates.totalPremiumCollected !== undefined)
      updateData.total_premium_collected = updates.totalPremiumCollected;
    if (updates.realizedPnl !== undefined) updateData.realized_pnl = updates.realizedPnl;
    if (updates.unrealizedPnl !== undefined) updateData.unrealized_pnl = updates.unrealizedPnl;
    if (updates.annualizedReturn !== undefined)
      updateData.annualized_return = updates.annualizedReturn;

    const result = await this.cycleHelper.update(cycleId, updateData);
    if (!result.success || !result.data) {
      throw new Error(`Failed to update wheel cycle: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Add an event to a wheel cycle
   */
  async addEvent(
    lifecycleId: string,
    eventType: WheelEvent,
    eventDate: string,
    description: string,
    options?: {
      tradeId?: number;
      amount?: number;
      strikePrice?: number;
      expiryDate?: string;
    }
  ): Promise<WheelEventRecord> {
    const event: Omit<WheelEventRecord, 'id' | 'created_at'> = {
      lifecycle_id: lifecycleId,
      event_type: eventType,
      event_date: eventDate,
      trade_id: options?.tradeId,
      description,
      amount: options?.amount,
      strike_price: options?.strikePrice,
      expiry_date: options?.expiryDate,
    };

    const result = await this.eventHelper.create(event);
    if (!result.success || !result.data) {
      throw new Error(`Failed to create wheel event: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Get all wheel cycles for a portfolio
   */
  async getPortfolioCycles(portfolioId: number): Promise<WheelCycle[]> {
    const result = await this.cycleHelper.findAll(
      { orderBy: 'created_at', orderDirection: 'DESC' },
      'portfolio_id = ?',
      [portfolioId]
    );

    return result.data || [];
  }

  /**
   * Get wheel events for a specific cycle
   */
  async getCycleEvents(lifecycleId: string): Promise<WheelEventRecord[]> {
    const result = await this.eventHelper.findAll(
      { orderBy: 'event_date', orderDirection: 'ASC' },
      'lifecycle_id = ?',
      [lifecycleId]
    );

    return result.data || [];
  }

  /**
   * Get active (non-closed) wheel cycles
   */
  async getActiveCycles(portfolioId?: number): Promise<WheelCycle[]> {
    const whereClause = portfolioId ? 'status != ? AND portfolio_id = ?' : 'status != ?';
    const params = portfolioId ? [WheelState.CLOSED, portfolioId] : [WheelState.CLOSED];

    const result = await this.cycleHelper.findAll(
      { orderBy: 'created_at', orderDirection: 'DESC' },
      whereClause,
      params
    );

    return result.data || [];
  }

  /**
   * Get a wheel cycle by ID
   */
  async getCycleById(cycleId: number): Promise<WheelCycle | null> {
    const result = await this.cycleHelper.findById(cycleId);
    return result.success ? result.data || null : null;
  }

  /**
   * Delete a wheel cycle and all its events
   */
  async deleteCycle(cycleId: number): Promise<boolean> {
    // Get the cycle to find lifecycle_id
    const cycle = await this.getCycleById(cycleId);
    if (!cycle) return false;

    // Delete all events first
    const eventsQuery = `DELETE FROM wheel_events WHERE lifecycle_id = ?`;
    try {
      this.db.exec(eventsQuery, [cycle.lifecycle_id]);
    } catch (error) {
      console.error('Error deleting wheel events:', error);
      return false;
    }

    // Delete the cycle
    const result = await this.cycleHelper.delete(cycleId);
    return result.success;
  }

  /**
   * Validate a state transition
   */
  canTransitionTo(currentState: WheelState, newState: WheelState): boolean {
    return validateStateTransition(currentState, newState);
  }

  /**
   * Get cycles by status
   */
  async getCyclesByStatus(status: WheelState, portfolioId?: number): Promise<WheelCycle[]> {
    const whereClause = portfolioId ? 'status = ? AND portfolio_id = ?' : 'status = ?';
    const params = portfolioId ? [status, portfolioId] : [status];

    const result = await this.cycleHelper.findAll(
      { orderBy: 'created_at', orderDirection: 'DESC' },
      whereClause,
      params
    );

    return result.data || [];
  }
}
