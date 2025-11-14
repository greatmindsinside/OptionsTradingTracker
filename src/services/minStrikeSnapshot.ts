import { all, run } from '@/db/sql';
import type { Position, ShareLot } from '@/hooks/useWheelDatabase';

export interface MinStrikeCalculation {
  avgCost: number;
  premiumReceived: number;
  sharesOwned: number;
  minStrike: number;
}

/**
 * Calculate current minimum strike for a ticker based on lots and positions
 */
export function calculateCurrentMinStrike(
  ticker: string,
  lots: ShareLot[],
  positions: Position[]
): MinStrikeCalculation {
  // Filter lots for this ticker
  const tickerLots = lots.filter(l => l.ticker === ticker);

  // Calculate average cost
  let avgCost = 0;
  let sharesOwned = 0;
  if (tickerLots.length > 0) {
    const totalShares = tickerLots.reduce((sum, l) => sum + l.qty, 0);
    const totalCost = tickerLots.reduce((sum, l) => sum + l.qty * l.costPerShare, 0);
    sharesOwned = totalShares;
    avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  }

  // Filter positions for covered calls (Call + Sell) for this ticker
  const coveredCalls = positions.filter(
    p => p.ticker === ticker && p.type === 'C' && p.side === 'S'
  );

  // Calculate average premium per share from open covered calls
  // entry is already premium per share, so we calculate weighted average based on contract quantities
  let premiumReceived = 0;
  if (coveredCalls.length > 0) {
    // Calculate weighted average: sum(entry * qty) / sum(qty)
    // where qty is number of contracts, and entry is premium per share
    // Since entry is per share and each contract = 100 shares, we weight by contracts
    const totalPremiumWeighted = coveredCalls.reduce((sum, p) => sum + p.entry * p.qty, 0);
    const totalContracts = coveredCalls.reduce((sum, p) => sum + p.qty, 0);
    premiumReceived = totalContracts > 0 ? totalPremiumWeighted / totalContracts : 0;
  }

  // Calculate minimum strike: avgCost - premiumReceived
  const minStrike = avgCost - premiumReceived;

  return {
    avgCost,
    premiumReceived,
    sharesOwned,
    minStrike: Math.max(0, minStrike), // Ensure non-negative
  };
}

/**
 * Record a minimum strike snapshot for a ticker on a specific date
 * If a snapshot already exists for this ticker/date, it will be updated
 */
export async function recordMinStrikeSnapshot(
  ticker: string,
  date: string,
  avgCost: number,
  premiumReceived: number,
  sharesOwned: number
): Promise<void> {
  // Validate inputs
  if (!ticker || !date) {
    throw new Error('Ticker and date are required');
  }

  if (avgCost < 0 || premiumReceived < 0 || sharesOwned < 0) {
    throw new Error('avgCost, premiumReceived, and sharesOwned must be non-negative');
  }

  // Calculate min_strike
  const minStrike = Math.max(0, avgCost - premiumReceived);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[recordMinStrikeSnapshot] Attempting to record:', {
      ticker,
      date,
      avgCost,
      premiumReceived,
      sharesOwned,
      minStrike,
    });
  }

  // Ensure table exists (migration might not have run yet)
  try {
    // Check if snapshot already exists for this ticker/date
    const existing = await all<{ id: string }>(
      'SELECT id FROM ticker_min_strikes WHERE ticker = ? AND date = ?',
      [ticker, date]
    );

    if (existing.length > 0) {
      // Update existing snapshot
      const id = existing[0]!.id;
      await run(
        `UPDATE ticker_min_strikes
       SET avg_cost = ?, premium_received = ?, min_strike = ?, shares_owned = ?, created_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
        [avgCost, premiumReceived, minStrike, sharesOwned, id]
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('[recordMinStrikeSnapshot] ✅ Updated existing snapshot:', id);
      }
    } else {
      // Insert new snapshot
      const id = `min-strike-${ticker}-${date}-${Date.now()}`;
      await run(
        `INSERT INTO ticker_min_strikes (id, ticker, date, avg_cost, premium_received, min_strike, shares_owned)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, ticker, date, avgCost, premiumReceived, minStrike, sharesOwned]
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('[recordMinStrikeSnapshot] ✅ Inserted new snapshot:', id);
      }
    }

    // Verify the snapshot was saved
    const verify = await all<{ id: string; ticker: string; date: string }>(
      'SELECT id, ticker, date FROM ticker_min_strikes WHERE ticker = ? AND date = ?',
      [ticker, date]
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('[recordMinStrikeSnapshot] Verification query result:', verify);
    }
  } catch (error) {
    // If table doesn't exist, log error but don't throw (migration will create it on next init)
    if (error instanceof Error && error.message.includes('no such table: ticker_min_strikes')) {
      console.warn(
        'ticker_min_strikes table does not exist yet. Migration will create it on next database init.'
      );
      return;
    }
    console.error('[recordMinStrikeSnapshot] Error:', error);
    throw error;
  }
}

/**
 * Get historical min strike snapshots for a ticker
 */
export async function getHistoricalMinStrikes(ticker: string): Promise<
  Array<{
    id: string;
    ticker: string;
    date: string;
    avg_cost: number;
    premium_received: number;
    min_strike: number;
    shares_owned: number;
    created_at: string;
  }>
> {
  const result = await all<{
    id: string;
    ticker: string;
    date: string;
    avg_cost: number;
    premium_received: number;
    min_strike: number;
    shares_owned: number;
    created_at: string;
  }>('SELECT * FROM ticker_min_strikes WHERE ticker = ? ORDER BY date ASC', [ticker]);

  if (process.env.NODE_ENV === 'development') {
    console.log('[getHistoricalMinStrikes] Query result:', {
      ticker,
      count: result.length,
      snapshots: result,
    });
  }

  return result;
}

/**
 * Get all historical min strike snapshots (for all tickers)
 */
export async function getAllHistoricalMinStrikes(): Promise<
  Array<{
    id: string;
    ticker: string;
    date: string;
    avg_cost: number;
    premium_received: number;
    min_strike: number;
    shares_owned: number;
    created_at: string;
  }>
> {
  const result = await all<{
    id: string;
    ticker: string;
    date: string;
    avg_cost: number;
    premium_received: number;
    min_strike: number;
    shares_owned: number;
    created_at: string;
  }>('SELECT * FROM ticker_min_strikes ORDER BY ticker ASC, date ASC');

  if (process.env.NODE_ENV === 'development') {
    console.log('[getAllHistoricalMinStrikes] Query result:', {
      count: result.length,
      tickers: [...new Set(result.map(r => r.ticker))],
      snapshots: result,
    });
  }

  return result;
}
