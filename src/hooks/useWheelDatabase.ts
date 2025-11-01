/**
 * Database Service Hook for Wheel Page
 * Connects the wheel page to the SQLite database
 */

import { useState, useEffect, useCallback } from 'react';
import type { SQLiteDatabase } from '@/modules/db/sqlite';
import { initDatabase } from '@/modules/db/sqlite';
import { DAOFactory } from '@/modules/db/dao-index';
import type { DatabaseTrade } from '@/modules/db/trade-dao';

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

  // Initialize database
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

  // Load wheel data
  const loadWheelData = useCallback(async () => {
    if (!db) return;

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading wheel data from database...');

      const daoFactory = new DAOFactory(db);
      const tradeDAO = daoFactory.createTradeDAO();
      const portfolioDAO = daoFactory.createPortfolioDAO();

      // Get default portfolio
      const portfoliosResult = await portfolioDAO.findAll({ limit: 1 });
      let portfolioId = 1;

      if (portfoliosResult.success && portfoliosResult.data && portfoliosResult.data.length > 0) {
        portfolioId = portfoliosResult.data[0].id!;
      } else {
        // Create default portfolio if none exists
        const createResult = await portfolioDAO.create({
          name: 'Default Portfolio',
          broker: 'robinhood',
          account_type: 'cash',
          is_active: true,
        });

        if (createResult.success && createResult.data) {
          portfolioId = createResult.data.id!;
        }
      }

      console.log('📊 Using portfolio ID:', portfolioId);

      // Load trades for this portfolio
      const trades = await tradeDAO.findByPortfolioId(portfolioId);
      console.log('📈 Loaded trades:', trades.length);

      // Transform trades into positions (simplified for now)
      const positions = await transformTradesToPositions(trades, db);
      const shareLots = await getShareLots(trades, db);
      // Derive tickers from computed positions and share lots to avoid per-trade lookups
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
  }, [db]);

  // Load data when database is ready
  useEffect(() => {
    if (db) {
      loadWheelData();
    }
  }, [db, loadWheelData]);

  return {
    data,
    loading,
    error,
    reload: loadWheelData,
    db,
  };
}

// Helper functions to transform database data

async function transformTradesToPositions(
  trades: DatabaseTrade[],
  db: SQLiteDatabase
): Promise<Position[]> {
  const positions: Position[] = [];
  const positionMap = new Map<string, Partial<Position>>();

  for (const trade of trades) {
    if (trade.instrument_type !== 'OPTION') continue;

    const ticker = await getTickerFromTradeId(trade.symbol_id, db);
    const key = `${ticker}_${trade.option_type}_${trade.strike_price}_${trade.expiration_date}`;

    if (!positionMap.has(key)) {
      positionMap.set(key, {
        id: key,
        ticker,
        type: trade.option_type === 'CALL' ? 'C' : 'P',
        strike: trade.strike_price || 0,
        qty: 0,
        entry: 0,
        mark: 0, // Would need live price data
        dte: calculateDTE(trade.expiration_date || ''),
        m: 0, // Moneyness calculation would need current price
      });
    }

    const position = positionMap.get(key)!;
    const isSell = trade.action.includes('SELL');
    const qtyChange = isSell ? trade.quantity : -trade.quantity;

    // Update position
    position.qty = (position.qty || 0) + qtyChange;
    position.side = position.qty! > 0 ? 'S' : 'B';

    // Calculate weighted average entry price
    if (position.qty !== 0) {
      const currentValue = (position.entry || 0) * Math.abs(position.qty! - qtyChange);
      const tradeValue = trade.price * Math.abs(qtyChange);
      const totalQty = Math.abs(position.qty!);
      position.entry = (currentValue + tradeValue) / totalQty;
    }
  }

  // Only return positions with non-zero quantity
  positionMap.forEach(pos => {
    if (pos.qty !== 0) {
      positions.push(pos as Position);
    }
  });

  return positions;
}

async function getShareLots(trades: DatabaseTrade[], db: SQLiteDatabase): Promise<ShareLot[]> {
  const lots: ShareLot[] = [];
  const lotMap = new Map<string, { qty: number; totalCost: number }>();

  for (const trade of trades) {
    if (trade.instrument_type === 'OPTION') continue;

    const ticker = await getTickerFromTradeId(trade.symbol_id, db);

    if (!lotMap.has(ticker)) {
      lotMap.set(ticker, { qty: 0, totalCost: 0 });
    }

    const lot = lotMap.get(ticker)!;
    const isBuy = trade.action.includes('BUY');
    const qtyChange = isBuy ? trade.quantity : -trade.quantity;
    const costChange = isBuy ? trade.price * trade.quantity : -(trade.price * trade.quantity);

    lot.qty += qtyChange;
    lot.totalCost += costChange;
  }

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

async function getTickerFromTradeId(symbolId: number, db: SQLiteDatabase): Promise<string> {
  // Query the symbols table to get ticker
  const result = db.query('SELECT symbol FROM symbols WHERE id = ?', [symbolId]);
  return (result[0]?.symbol as string) || 'UNKNOWN';
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
