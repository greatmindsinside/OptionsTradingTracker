import { useEffect, useState } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';
import { getAllHistoricalMinStrikes,getHistoricalMinStrikes } from '@/services/minStrikeSnapshot';

export interface MinStrikeSnapshot {
  id: string;
  ticker: string;
  date: string;
  avg_cost: number;
  premium_received: number;
  min_strike: number;
  shares_owned: number;
  created_at: string;
}

export function useHistoricalMinStrikes(ticker?: string) {
  const [data, setData] = useState<MinStrikeSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Watch positions and lots to trigger reload when wheel data changes
  const positions = useWheelStore(s => s.positions);
  const lots = useWheelStore(s => s.lots);

  // Create a key that changes when positions or lots change
  // Use a more stable key based on actual data, not just length
  const positionsKey = positions.map(p => `${p.ticker}-${p.strike}-${p.qty}`).join('|');
  const lotsKey = lots.map(l => `${l.ticker}-${l.qty}`).join('|');
  const dataKey = `${positionsKey}-${lotsKey}-${ticker || 'all'}`;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshots = ticker
          ? await getHistoricalMinStrikes(ticker)
          : await getAllHistoricalMinStrikes();
        setData(snapshots);

        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('[useHistoricalMinStrikes] Loaded snapshots:', {
            ticker: ticker || 'all',
            count: snapshots.length,
            snapshots: snapshots.map(s => ({ ticker: s.ticker, date: s.date, min_strike: s.min_strike })),
            trigger: 'positions/lots changed',
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load historical min strikes');
        console.error('Failed to load historical min strikes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ticker, dataKey]); // Reload when ticker changes OR when wheel data changes

  return { data, loading, error };
}
