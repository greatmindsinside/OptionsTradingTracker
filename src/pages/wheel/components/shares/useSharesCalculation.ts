import { useMemo } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';

export function useSharesCalculation() {
  const lots = useWheelStore(s => s.lots);
  const pos = useWheelStore(s => s.positions);

  return useMemo(() => {
    const by: Record<string, { shares: number; costSum: number; shortCalls: number }> = {};
    lots.forEach(l => {
      by[l.ticker] = by[l.ticker] || { shares: 0, costSum: 0, shortCalls: 0 };
      by[l.ticker].shares += l.qty;
      by[l.ticker].costSum += l.qty * l.cost;
    });
    pos
      .filter(p => p.type === 'C' && p.side === 'S')
      .forEach(p => {
        by[p.ticker] = by[p.ticker] || { shares: 0, costSum: 0, shortCalls: 0 };
        by[p.ticker].shortCalls += p.qty * 100;
      });
    const rows = Object.entries(by).map(([t, v]) => {
      const avg = v.shares ? v.costSum / v.shares : 0;
      const covered = Math.min(v.shares, v.shortCalls);
      const uncovered = Math.max(0, v.shares - v.shortCalls);
      return { t, shares: v.shares, covered, uncovered, avg, shortCalls: v.shortCalls };
    });
    return rows;
  }, [lots, pos]);
}
