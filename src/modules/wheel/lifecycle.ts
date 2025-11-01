/**
 * Wheel Strategy Lifecycle Management
 *
 * This module implements the core wheel strategy lifecycle tracking system.
 * A wheel strategy involves selling cash-secured puts (CSPs), potentially getting
 * assigned stock, then selling covered calls (CCs) to generate income.
 *
 * Lifecycle States:
 * - CSP_OPEN: Cash-secured put is open
 * - CSP_ASSIGNED: Put was assigned, now own stock
 * - CC_OPEN: Covered call is open on assigned stock
 * - CC_CLOSED: Covered call closed for profit (wheel continues)
 * - CC_ASSIGNED: Covered call assigned, stock sold (wheel complete)
 * - CLOSED: Wheel cycle completed
 */

// Import proper types from validation module
import type { Trade } from '../db/validation';

// Wheel Strategy State Machine
export const WheelState = {
  CSP_OPEN: 'CSP_OPEN', // Cash-secured put is open
  CSP_ASSIGNED: 'CSP_ASSIGNED', // Put assigned, now own stock
  CC_OPEN: 'CC_OPEN', // Covered call is open
  CC_CLOSED: 'CC_CLOSED', // Covered call closed (can sell another)
  CC_ASSIGNED: 'CC_ASSIGNED', // Covered call assigned, stock sold
  CLOSED: 'CLOSED', // Wheel cycle complete
} as const;

export type WheelState = (typeof WheelState)[keyof typeof WheelState];

// Valid state transitions
export const VALID_TRANSITIONS: Record<WheelState, WheelState[]> = {
  [WheelState.CSP_OPEN]: [WheelState.CSP_ASSIGNED, WheelState.CLOSED],
  [WheelState.CSP_ASSIGNED]: [WheelState.CC_OPEN],
  [WheelState.CC_OPEN]: [WheelState.CC_CLOSED, WheelState.CC_ASSIGNED],
  [WheelState.CC_CLOSED]: [WheelState.CC_OPEN, WheelState.CLOSED],
  [WheelState.CC_ASSIGNED]: [WheelState.CLOSED],
  [WheelState.CLOSED]: [], // Terminal state
};

// Event types that trigger state transitions
export const WheelEvent = {
  CSP_SOLD: 'CSP_SOLD', // Sold cash-secured put
  CSP_ASSIGNED: 'CSP_ASSIGNED', // Put was assigned
  CSP_EXPIRED: 'CSP_EXPIRED', // Put expired worthless
  CC_SOLD: 'CC_SOLD', // Sold covered call
  CC_CLOSED: 'CC_CLOSED', // Bought back covered call
  CC_ASSIGNED: 'CC_ASSIGNED', // Call was assigned
  CC_EXPIRED: 'CC_EXPIRED', // Call expired worthless
  POSITION_CLOSED: 'POSITION_CLOSED', // Closed underlying position
} as const;

export type WheelEvent = (typeof WheelEvent)[keyof typeof WheelEvent];

// Wheel lifecycle record structure
export interface WheelCycle {
  lifecycle_id: string; // Format: {symbol}_{start_date}_{index}
  underlying_symbol: string; // Stock symbol (e.g., AAPL)
  status: WheelState; // Current state in lifecycle
  created_at: Date; // When cycle started
  updated_at: Date; // Last state change

  // Financial metrics
  total_net_credit: number; // Cumulative premium collected
  cost_basis?: number; // Cost basis if assigned
  shares_owned?: number; // Number of shares if assigned

  // Related trades
  csp_trade_ids: string[]; // Cash-secured put trade IDs
  cc_trade_ids: string[]; // Covered call trade IDs
  stock_trade_ids: string[]; // Stock assignment/sale trade IDs

  // Performance metrics
  total_premium_collected: number;
  realized_pnl?: number; // If cycle is closed
  unrealized_pnl?: number; // If cycle is open
  days_active: number; // Days since cycle started
  annualized_return?: number; // If cycle is closed
}

// Timeline event for visualization
export interface WheelEvent_Record {
  lifecycle_id: string;
  event_type: WheelEvent;
  event_date: Date;
  trade_id?: string; // Related trade if applicable
  description: string; // Human-readable description
  amount?: number; // Premium/cost if applicable
  strike?: number; // Strike price if applicable
  expiry?: Date; // Expiry date if applicable
}

// State transition validation
export class WheelStateError extends Error {
  currentState: WheelState;
  attemptedState: WheelState;

  constructor(message: string, currentState: WheelState, attemptedState: WheelState) {
    super(message);
    this.name = 'WheelStateError';
    this.currentState = currentState;
    this.attemptedState = attemptedState;
  }
}

/**
 * Validates if a state transition is allowed
 */
export function validateStateTransition(currentState: WheelState, newState: WheelState): boolean {
  const allowedTransitions = VALID_TRANSITIONS[currentState];
  return allowedTransitions.includes(newState);
}

/**
 * Attempts to transition wheel cycle to new state
 */
export function transitionWheelState(
  currentState: WheelState,
  newState: WheelState,
  event: WheelEvent
): WheelState {
  if (!validateStateTransition(currentState, newState)) {
    throw new WheelStateError(
      `Invalid transition from ${currentState} to ${newState} via ${event}`,
      currentState,
      newState
    );
  }

  return newState;
}

/**
 * Generates a unique lifecycle ID for a wheel cycle
 * Format: {symbol}_{YYYY-MM-DD}_{index}
 */
export function generateLifecycleId(
  symbol: string,
  startDate: Date,
  existingIds: string[] = []
): string {
  const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const baseId = `${symbol}_${dateStr}`;

  // Find highest existing index for this symbol/date
  const existingIndices = existingIds
    .filter(id => id.startsWith(baseId))
    .map(id => {
      const parts = id.split('_');
      return parseInt(parts[parts.length - 1]) || 0;
    });

  const nextIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1;
  return `${baseId}_${nextIndex.toString().padStart(3, '0')}`;
}

/**
 * Determines the event type from a trade record
 */
export function getEventTypeFromTrade(trade: Trade): WheelEvent | null {
  const optionType = trade.option_type;
  const action = trade.trade_action;

  // Cash-secured puts
  if (optionType === 'put' && action === 'sell_to_open') {
    return WheelEvent.CSP_SOLD;
  }

  if (optionType === 'put' && action === 'buy_to_close') {
    return WheelEvent.CC_CLOSED; // Closing put position
  }

  // Covered calls
  if (optionType === 'call' && action === 'sell_to_open') {
    return WheelEvent.CC_SOLD;
  }

  if (optionType === 'call' && action === 'buy_to_close') {
    return WheelEvent.CC_CLOSED;
  }

  return null;
}

/**
 * Calculates performance metrics for a wheel cycle
 */
export function calculateWheelMetrics(cycle: WheelCycle): {
  totalReturn: number;
  annualizedReturn: number;
  returnOnOutlay: number;
  totalDays: number;
} {
  const totalReturn = cycle.realized_pnl || 0;
  const totalDays = cycle.days_active;
  const costBasis = cycle.cost_basis || 0;

  // Annualized return (if cycle is closed)
  const annualizedReturn =
    totalDays > 0 ? (totalReturn / Math.abs(costBasis)) * (365 / totalDays) * 100 : 0;

  // Return on outlay (premium collected vs capital at risk)
  const returnOnOutlay = costBasis > 0 ? (cycle.total_premium_collected / costBasis) * 100 : 0;

  return {
    totalReturn,
    annualizedReturn,
    returnOnOutlay,
    totalDays,
  };
}

/**
 * Creates a human-readable description for a wheel event
 */
export function createEventDescription(event: WheelEvent, trade?: Trade): string {
  switch (event) {
    case WheelEvent.CSP_SOLD:
      return `Sold ${trade?.quantity || 'N/A'} cash-secured put(s) at $${trade?.strike_price || 'N/A'} strike`;
    case WheelEvent.CSP_ASSIGNED:
      return `Put assigned - acquired ${trade?.quantity || 'N/A'} shares at $${trade?.strike_price || 'N/A'}`;
    case WheelEvent.CSP_EXPIRED:
      return 'Cash-secured put expired worthless';
    case WheelEvent.CC_SOLD:
      return `Sold ${trade?.quantity || 'N/A'} covered call(s) at $${trade?.strike_price || 'N/A'} strike`;
    case WheelEvent.CC_CLOSED:
      return `Bought back covered call for ${trade ? '$' + Math.abs(trade.premium) : 'profit'}`;
    case WheelEvent.CC_ASSIGNED:
      return `Call assigned - sold ${trade?.quantity || 'N/A'} shares at $${trade?.strike_price || 'N/A'}`;
    case WheelEvent.CC_EXPIRED:
      return 'Covered call expired worthless';
    case WheelEvent.POSITION_CLOSED:
      return 'Underlying position closed';
    default:
      return 'Unknown wheel event';
  }
}
