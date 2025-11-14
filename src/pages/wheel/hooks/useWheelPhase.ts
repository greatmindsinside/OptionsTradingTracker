import { useMemo } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';
import type { WheelPhase } from '@/types/wheel';

export function useWheelPhase(symbol: string): WheelPhase {
  // Memoize selectors to prevent unnecessary re-subscriptions
  // Zustand does reference equality checking, so we only re-render when positions/lots actually change
  const positions = useWheelStore(useMemo(() => state => state.positions, []));
  const lots = useWheelStore(useMemo(() => state => state.lots, []));

  return useMemo(() => {
    const hasShares = lots.some(l => l.ticker === symbol && l.qty > 0);
    const hasShortPuts = positions.some(
      p => p.ticker === symbol && p.type === 'P' && p.side === 'S'
    );
    const hasShortCalls = positions.some(
      p => p.ticker === symbol && p.type === 'C' && p.side === 'S'
    );

    if (!hasShares && !hasShortPuts && !hasShortCalls) return 'Sell Cash Secured Puts';
    if (!hasShares && hasShortPuts) return 'Sell Cash Secured Puts';
    if (!hasShares && hasShortCalls) return 'Sell Covered Calls'; // Naked call position
    if (hasShares && !hasShortCalls) return 'Sell Covered Calls';
    if (hasShares && hasShortCalls) return 'Call Expires Worthless';
    return 'Repeat';
  }, [symbol, positions, lots]);
}
