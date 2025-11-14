/**
 * Database Service Hook for Wheel Page
 * Connects the wheel page to the SQLite database
 */

import { useCallback, useEffect, useState } from 'react';

import { all, initDb } from '@/db/sql';
import type { SQLiteDatabase } from '@/modules/db/sqlite';
import { initDatabase } from '@/modules/db/sqlite';
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
  opened?: string; // YYYY-MM-DD date when position was opened
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
        // console.log('🔄 Initializing wheel database connection...');
        const database = await initDatabase();

        if (mounted) {
          setDb(database);
          // console.log('💾 Database initialized successfully');
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
      // console.log('🔄 Loading wheel data from journal table...');

      // Initialize journal database
      await initDb();

      // Query all non-deleted entries from journal table
      // The all() function automatically filters deleted entries when includeDeleted is false (default)
      const entries = all<Entry>(`
        SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration, underlying_price, notes, meta
        FROM journal
        ORDER BY datetime(ts) DESC
      `);

      // console.log('📈 Loaded journal entries:', entries.length);

      // Transform journal entries into positions
      const positions = transformJournalToPositions(entries);
      const shareLots = transformJournalToShareLots(entries);
      const tickers = Array.from(
        new Set([...positions.map(p => p.ticker), ...shareLots.map(l => l.ticker)])
      );

      // Generate mock alerts based on real data
      const alerts = generateAlertsFromData(positions, tickers);

      // Load cached earnings (API fetch happens separately via useEarningsSync)
      const { loadCache } = await import('@/utils/earningsApi');
      const cachedEarnings = loadCache();
      const earningsCalendar: Record<string, string> = {};
      tickers.forEach(ticker => {
        const cached = cachedEarnings[ticker];
        if (cached?.date) {
          earningsCalendar[ticker] = cached.date;
        }
      });

      const wheelData: WheelData = {
        positions,
        shareLots,
        alerts,
        earningsCalendar,
        tickers,
      };

      setData(wheelData);
      // console.log('✅ Wheel data loaded successfully');
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

export function transformJournalToPositions(entries: Entry[]): Position[] {
  const positions: Position[] = [];
  const positionMap = new Map<string, Partial<Position>>();

  // First pass: Build positions from opening entries
  for (const entry of entries) {
    // Only process option-related entries that open positions
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

      // Extract YYYY-MM-DD from entry.ts (ISO string)
      const openedDate = entry.ts ? entry.ts.slice(0, 10) : new Date().toISOString().slice(0, 10);

      // Calculate DTE from the opened date, not from today
      // This ensures the expiration date matches what was entered
      const expirationDate = entry.expiration ? (entry.expiration.includes('T') ? entry.expiration.slice(0, 10) : entry.expiration) : null;
      let dte = 0;
      if (expirationDate) {
        // Calculate days between opened date and expiration date
        const opened = new Date(openedDate + 'T00:00:00');
        const expiration = new Date(expirationDate + 'T00:00:00');
        const diffMs = expiration.getTime() - opened.getTime();
        dte = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('[transformJournalToPositions] DTE calculation:', {
            symbol: entry.symbol,
            strike: entry.strike,
            openedDate,
            expirationDate,
            dte,
            entryExpiration: entry.expiration,
          });
        }
      }

      positionMap.set(key, {
        id: key,
        ticker: entry.symbol,
        strike: entry.strike,
        qty: 0,
        entry: 0,
        mark: 0,
        dte: dte,
        m: 0,
        type: optionType,
        side: 'S',
        opened: openedDate,
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

  // Second pass: Process expiration entries that close positions (assignments)
  for (const entry of entries) {
    if (entry.type === 'expiration' && entry.strike && entry.expiration) {
      // Parse meta to check if this is an assignment
      let metaObj: Record<string, unknown> | null | undefined = entry.meta;
      if (typeof entry.meta === 'string') {
        try {
          metaObj = JSON.parse(entry.meta) as Record<string, unknown>;
        } catch {
          metaObj = null;
        }
      }

      // If this is an assignment, close the matching position
      if (metaObj && typeof metaObj === 'object' && metaObj.assigned === true) {
        const key = `${entry.symbol}_${entry.strike}_${entry.expiration}`;
        const position = positionMap.get(key);
        if (position) {
          const contracts = entry.qty || 1;
          position.qty = Math.max(0, (position.qty || 0) - contracts);
        }
      }
    }
  }

  // Only return open positions (non-zero quantity)
  positionMap.forEach(pos => {
    if (pos.qty && pos.qty > 0) {
      positions.push(pos as Position);
    }
  });

  return positions;
}

export function transformJournalToShareLots(entries: Entry[]): ShareLot[] {
  const lots: ShareLot[] = [];
  const lotMap = new Map<string, { qty: number; totalCost: number }>();

  // Process assignment entries (add shares) and share_sale entries (subtract shares)
  for (const entry of entries) {
    if (!entry.symbol) continue;

    const ticker = entry.symbol;

    if (entry.type === 'assignment_shares') {
      // Put assignment - bought shares
      const qty = Math.abs(entry.qty || 0);
      const cost = Math.abs(entry.amount);

      if (!lotMap.has(ticker)) {
        lotMap.set(ticker, { qty: 0, totalCost: 0 });
      }

      const lot = lotMap.get(ticker)!;
      lot.qty += qty;
      lot.totalCost += cost;
    } else if (entry.type === 'share_sale') {
      // Call assignment - shares called away (subtract shares)
      const qty = Math.abs(entry.qty || 0);
      if (lotMap.has(ticker)) {
        const lot = lotMap.get(ticker)!;
        // Calculate average cost per share before reducing
        const avgCostPerShare = lot.qty > 0 ? lot.totalCost / lot.qty : 0;
        lot.qty = Math.max(0, lot.qty - qty);
        // Adjust total cost proportionally
        lot.totalCost = lot.qty * avgCostPerShare;
      }
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
