import { useMemo } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';

export function useWheelMetrics() {
  // Memoize selector to prevent unnecessary re-subscriptions
  // Zustand does reference equality checking, so we only re-render when positions/lots actually change
  const positions = useWheelStore(useMemo(() => state => state.positions, []));
  const lots = useWheelStore(useMemo(() => state => state.lots, []));

  return useMemo(() => {
    const premiumThisWeek =
      positions.filter(p => p.side === 'S').reduce((s, p) => s + p.entry * 100 * p.qty, 0) -
      positions.filter(p => p.side === 'B').reduce((s, p) => s + p.entry * 100 * p.qty, 0);

    const capitalInPuts = positions
      .filter(p => p.type === 'P' && p.side === 'S')
      .reduce((s, p) => s + p.strike * 100 * p.qty, 0);

    const sharesBy = new Map<string, number>();
    lots.forEach(l => sharesBy.set(l.ticker, (sharesBy.get(l.ticker) || 0) + l.qty));
    const shortBy = new Map<string, number>();
    const shortCallPositions = positions.filter(p => p.type === 'C' && p.side === 'S');

    // Debug: Log all short call positions to identify duplicates
    if (process.env.NODE_ENV === 'development' && shortCallPositions.length > 0) {
      console.log('[Shares For Calls Debug] All short call positions:',
        shortCallPositions.map(p => ({
          ticker: p.ticker,
          qty: p.qty,
          strike: p.strike,
          expiration: p.dte,
          id: p.id
        }))
      );
    }

    shortCallPositions.forEach(p => {
      const existing = shortBy.get(p.ticker) || 0;
      const newValue = existing + p.qty * 100;
      shortBy.set(p.ticker, newValue);
    });

    // Calculate total shares needed for all short calls
    // Each call contract represents 100 shares, so we sum up all short call shares
    let totalSharesNeeded = 0;
    shortBy.forEach(sharesNeeded => {
      totalSharesNeeded += sharesNeeded;
    });

    // Debug logging for shares-for-calls calculation (DISABLED - performance)
    // console.log('🔍 Shares For Calls Debug:', {
    //   lots: lots.map(l => ({ ticker: l.ticker, qty: l.qty })),
    //   shortCalls: Array.from(shortBy.entries()).map(([t, sc]) => ({ ticker: t, shortCalls: sc })),
    //   sharesBy: Array.from(sharesBy.entries()).map(([t, sh]) => ({ ticker: t, shares: sh })),
    //   totalSharesNeeded,
    //   coveredShares,
    //   shortCallCount: shortBy.size,
    // });

    return {
      premiumThisWeek,
      capitalInPuts,
      // "Shares For Calls" shows total shares needed to cover all short calls
      // Each call contract = 100 shares, so 2 calls = 200 shares needed
      sharesForCalls: { covered: totalSharesNeeded, cnt: shortBy.size },
    };
  }, [positions, lots]);
}
