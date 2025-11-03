import { useMemo } from 'react';
import { useWheelStore } from '@/stores/useWheelStore';
import { computeCover } from '@/utils/wheel-calculations';

export function useWheelMetrics() {
  const positions = useWheelStore(s => s.positions);
  const lots = useWheelStore(s => s.lots);

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
    positions
      .filter(p => p.type === 'C' && p.side === 'S')
      .forEach(p => shortBy.set(p.ticker, (shortBy.get(p.ticker) || 0) + p.qty * 100));
    let covered = 0;
    shortBy.forEach((sc, t) => {
      covered += computeCover(sharesBy.get(t) || 0, sc).covered;
    });

    return {
      premiumThisWeek,
      capitalInPuts,
      sharesForCalls: { covered, cnt: shortBy.size },
    };
  }, [positions, lots]);
}
