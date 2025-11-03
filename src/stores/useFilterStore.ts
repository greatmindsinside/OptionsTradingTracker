import { create } from 'zustand';
import type { FilterState } from '@/types/entry';

interface FilterStore extends FilterState {
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
}

const initialFilters: FilterState = {
  symbol: '',
  type: '',
  from: '',
  to: '',
  status: 'all',
};

export const useFilterStore = create<FilterStore>(set => ({
  ...initialFilters,

  setFilters: filters => set(state => ({ ...state, ...filters })),

  resetFilters: () => set(initialFilters),
}));
