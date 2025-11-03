import { useMemo } from 'react';
import { useWheelStore } from '@/stores/useWheelStore';
import type { WheelPhase } from '@/types/wheel';

export function useWheelPhase(symbol: string): WheelPhase {
  const positions = useWheelStore(s => s.positions);
  const lots = useWheelStore(s => s.lots);

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
