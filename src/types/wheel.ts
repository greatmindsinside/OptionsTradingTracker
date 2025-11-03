/**
 * Wheel Strategy specific types
 */

export interface TickerSummary {
  symbol: string;
  premiumCollected: number;
  netPL: number;
  sharesOwned: number;
  avgCost: number;
  openPuts: number;
  openCalls: number;
  dividends: number;
  fees: number;
  firstTrade: string; // ISO date
  daysActive: number;
}

export interface WheelMetrics {
  breakEven: number | null;
  dte: number;
  annualizedReturn: number | null;
}

/**
 * Template payload types for adding trades
 */
export interface SellPutPayload {
  accountId: string;
  symbol: string;
  date: string | Date;
  contracts: number;
  premiumPerContract: number;
  strike: number;
  expiration: string | Date;
  fee?: number;
}

export interface PutAssignedPayload {
  accountId: string;
  symbol: string;
  date: string | Date;
  contracts: number;
  strike: number;
  expiration: string | Date;
  fee?: number;
}

export interface SellCoveredCallPayload {
  accountId: string;
  symbol: string;
  date: string | Date;
  contracts: number;
  premiumPerContract: number;
  strike: number;
  expiration: string | Date;
  fee?: number;
}

export interface CallAssignedPayload {
  accountId: string;
  symbol: string;
  date: string | Date;
  contracts: number;
  strike: number;
  expiration: string | Date;
  fee?: number;
}

export interface DividendPayload {
  accountId: string;
  symbol: string;
  date: string | Date;
  amount: number;
}

export interface FeePayload {
  accountId: string;
  symbol: string;
  date: string | Date;
  amount: number;
}

// ---------------------------------------------------------------------------
// Core Wheel domain types (for WheelModern refactor)
// ---------------------------------------------------------------------------

export type Side = 'B' | 'S';
export type OptType = 'C' | 'P';
export type WheelPhase =
  | 'Sell Cash Secured Puts'
  | 'Put Expires Worthless'
  | 'Buy At Strike'
  | 'Sell Covered Calls'
  | 'Call Expires Worthless'
  | 'Call Exercised Sell Shares'
  | 'Repeat';

export interface Position {
  id: string;
  ticker: string;
  qty: number;
  strike: number;
  entry: number;
  mark: number;
  dte: number;
  type: OptType;
  side: Side;
  opened: string;
}

export interface Lot {
  id: string;
  ticker: string;
  qty: number;
  cost: number;
  opened: string;
}

export interface LedgerEvent {
  id: string;
  kind: string;
  when: string;
  symbol?: string;
  meta?: Record<string, unknown>;
}

export interface ExpRow {
  id: string;
  symbol: string;
  type: OptType;
  strike: number;
  expiration: string;
  side: Side;
  qty: number;
}
