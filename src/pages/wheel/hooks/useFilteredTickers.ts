import { useMemo } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export function useFilteredTickers() {
  // Memoize selectors to prevent unnecessary re-subscriptions
  // Zustand does reference equality checking, so we only re-render when positions/lots actually change
  const positions = useWheelStore(
    useMemo(() => (state) => state.positions, [])
  );
  const lots = useWheelStore(useMemo(() => (state) => state.lots, []));
  const searchQuery = useWheelUIStore(s => s.searchQuery);

  return useMemo(() => {
    const allTickers = Array.from(
      new Set([...positions.map(p => p.ticker), ...lots.map(l => l.ticker)])
    ).sort();

    return allTickers.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [positions, lots, searchQuery]);
}
