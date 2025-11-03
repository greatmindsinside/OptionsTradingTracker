/**
 * Database Service Hook for Wheel Page
 * Connects the wheel page to the SQLite database
 */

import { useState, useEffect, useCallback } from 'react';
import type { SQLiteDatabase } from '@/modules/db/sqlite';
import { initDatabase } from '@/modules/db/sqlite';
import { initDb, all } from '@/db/sql';
import type { Entry } from '@/types/entry';

// Types expected by the Wheel page
export interface Position {
  id: string;
  ticker: string;
  type: 'P' | 'C';
  side: 'S' | 'B';
  qty: number;
  strike: number;
  entry: number;
  mark: number;
  dte: number;
  m: number;
  linkedLotId?: string;
}

export interface ShareLot {
  ticker: string;
  qty: number;
  costPerShare: number;
}

export interface Alert {
  id: string;
  ticker: string;
  text: string;
}

export type WheelPhase =
  | 'Call Expires Worthless'
  | 'Put Cash Secured Puts'
  | 'Sell Cash Secured Puts';

export interface WheelData {
  positions: Position[];
  shareLots: ShareLot[];
  alerts: Alert[];
  earningsCalendar: Record<string, string>;
  tickers: string[];
}

export function useWheelDatabase() {
  const [data, setData] = useState<WheelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  // Initialize database (keeping for compatibility)
  useEffect(() => {
    let mounted = true;

    const initDB = async () => {
      try {
        console.log('🔄 Initializing wheel database connection...');
        const database = await initDatabase();

        if (mounted) {
          setDb(database);
          console.log('💾 Database initialized successfully');
        }
      } catch (err) {
        console.error('❌ Failed to initialize database:', err);
        if (mounted) {
          setError(
            `Database initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
          setLoading(false);
        }
      }
    };

    initDB();

    return () => {
      mounted = false;
    };
  }, []);

  // Load wheel data from journal table
  const loadWheelData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading wheel data from journal table...');

      // Initialize journal database
      await initDb();

      // Query all entries from journal table
      const entries = all<Entry>(`
        SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration, underlying_price, notes, meta 
        FROM journal 
        ORDER BY datetime(ts) DESC
      `);

      console.log('📈 Loaded journal entries:', entries.length);

      // Transform journal entries into positions
      const positions = transformJournalToPositions(entries);
      const shareLots = transformJournalToShareLots(entries);
      const tickers = Array.from(
        new Set([...positions.map(p => p.ticker), ...shareLots.map(l => l.ticker)])
      );

      // Generate mock alerts based on real data
      const alerts = generateAlertsFromData(positions, tickers);

      // Mock earnings calendar for now
      const earningsCalendar: Record<string, string> = {};
      tickers.forEach(ticker => {
        // Add some sample earnings dates
        if (ticker === 'ASTS') earningsCalendar[ticker] = '2025-11-06';
        if (ticker === 'LUMN') earningsCalendar[ticker] = '2025-11-05';
      });

      const wheelData: WheelData = {
        positions,
        shareLots,
        alerts,
        earningsCalendar,
        tickers,
      };

      setData(wheelData);
      console.log('✅ Wheel data loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load wheel data:', err);
      setError(
        `Failed to load wheel data: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadWheelData();
  }, [loadWheelData]);

  return {
    data,
    loading,
    error,
    reload: loadWheelData,
    db,
  };
}

// Helper functions to transform journal entries into wheel data

function transformJournalToPositions(entries: Entry[]): Position[] {
  const positions: Position[] = [];
  const positionMap = new Map<string, Partial<Position>>();

  // Group entries by position (symbol + strike + expiration)
  for (const entry of entries) {
    // Only process option-related entries
    if (
      entry.type !== 'sell_to_open' &&
      entry.type !== 'option_premium' &&
      entry.type !== 'buy_to_close'
    ) {
      continue;
    }

    if (!entry.strike || !entry.expiration) {
      continue; // Skip entries without strike/expiration
    }

    const key = `${entry.symbol}_${entry.strike}_${entry.expiration}`;

    if (!positionMap.has(key)) {
      // Determine option type from journal entry
      let optionType: 'P' | 'C' = 'P';

      if (
        entry.type === 'sell_to_open' ||
        entry.type === 'option_premium' ||
        entry.type === 'buy_to_close'
      ) {
        // Parse meta if it's a JSON string
        let metaObj: Record<string, unknown> | null | undefined = entry.meta;
        if (typeof entry.meta === 'string') {
          try {
            metaObj = JSON.parse(entry.meta) as Record<string, unknown>;
          } catch {
            // If parsing fails, keep as null
            metaObj = null;
          }
        }

        // Check meta.leg
        if (metaObj && typeof metaObj === 'object' && 'leg' in metaObj) {
          optionType = metaObj.leg === 'call' ? 'C' : 'P';
        }
        // Check kind (for journal entries that use kind)
        else if ('kind' in entry && (entry.kind === 'sell_call' || entry.kind === 'roll_call')) {
          optionType = 'C';
        } else if ('kind' in entry && (entry.kind === 'sell_put' || entry.kind === 'roll_put')) {
          optionType = 'P';
        }
      }

      positionMap.set(key, {
        id: key,
        ticker: entry.symbol,
        strike: entry.strike,
        qty: 0,
        entry: 0,
        mark: 0,
        dte: calculateDTE(entry.expiration),
        m: 0,
        type: optionType,
        side: 'S',
      });
    }

    const position = positionMap.get(key)!;

    // Update quantity based on entry type
    if (entry.type === 'sell_to_open' || entry.type === 'option_premium') {
      const contracts = entry.qty || 1;
      position.qty = (position.qty || 0) + contracts;
      position.side = 'S'; // Selling

      // Update entry price (weighted average)
      const premium = Math.abs(entry.amount) / contracts / 100;
      if (position.entry === 0) {
        position.entry = premium;
      } else {
        const totalQty = position.qty || 1;
        const prevTotal = (position.entry || 0) * (totalQty - contracts);
        position.entry = (prevTotal + premium * contracts) / totalQty;
      }
    } else if (entry.type === 'buy_to_close') {
      const contracts = entry.qty || 1;
      position.qty = (position.qty || 0) - contracts;
    }
  }

  // Only return open positions (non-zero quantity)
  positionMap.forEach(pos => {
    if (pos.qty && pos.qty > 0) {
      positions.push(pos as Position);
    }
  });

  // 🔍 DERIVED POSITIONS DEBUG
  console.log('🔍 DERIVED POSITIONS:', {
    totalPositions: positions.length,
    positions: positions.map(p => ({
      ticker: p.ticker,
      type: p.type,
      side: p.side,
      qty: p.qty,
      strike: p.strike,
    })),
  });
  return positions;
}

function transformJournalToShareLots(entries: Entry[]): ShareLot[] {
  const lots: ShareLot[] = [];
  const lotMap = new Map<string, { qty: number; totalCost: number }>();

  // Process assignment entries
  for (const entry of entries) {
    if (entry.type === 'assignment_shares') {
      const ticker = entry.symbol;
      const qty = Math.abs(entry.qty || 0);
      const cost = Math.abs(entry.amount);

      if (!lotMap.has(ticker)) {
        lotMap.set(ticker, { qty: 0, totalCost: 0 });
      }

      const lot = lotMap.get(ticker)!;
      lot.qty += qty;
      lot.totalCost += cost;
    }
  }

  // Convert map to array
  lotMap.forEach((lot, ticker) => {
    if (lot.qty > 0) {
      lots.push({
        ticker,
        qty: lot.qty,
        costPerShare: lot.totalCost / lot.qty,
      });
    }
  });

  return lots;
}

// Note: We avoid a per-trade symbol lookup by computing tickers from positions/share lots above.

function calculateDTE(expirationDate: string): number {
  if (!expirationDate) return 0;

  const expiry = new Date(expirationDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

function generateAlertsFromData(positions: Position[], tickers: string[]): Alert[] {
  const alerts: Alert[] = [];

  // Generate alerts for positions close to expiration
  positions.forEach((pos, index) => {
    if (pos.dte <= 7) {
      alerts.push({
        id: `dte_${index}`,
        ticker: pos.ticker,
        text: `${pos.ticker} ${pos.type} ${pos.strike} expires in ${pos.dte} days. Plan action.`,
      });
    }
  });

  // Add some sample earnings alerts
  if (tickers.includes('ASTS')) {
    alerts.push({
      id: 'earnings_asts',
      ticker: 'ASTS',
      text: 'ASTS earnings 2025-11-06. Mind assignment risk.',
    });
  }

  return alerts;
}
