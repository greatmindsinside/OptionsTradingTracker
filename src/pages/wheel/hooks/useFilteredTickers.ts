import { useMemo } from 'react';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export function useFilteredTickers() {
  const positions = useWheelStore(s => s.positions);
  const lots = useWheelStore(s => s.lots);
  const searchQuery = useWheelUIStore(s => s.searchQuery);

  return useMemo(() => {
    const allTickers = Array.from(
      new Set([...positions.map(p => p.ticker), ...lots.map(l => l.ticker)])
    ).sort();

    return allTickers.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [positions, lots, searchQuery]);
}
