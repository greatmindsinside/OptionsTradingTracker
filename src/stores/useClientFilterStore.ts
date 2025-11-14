import { create } from 'zustand';

interface ClientFilterState {
  minAmount: number | null;
  maxAmount: number | null;
  setAmountRange: (min: number | null, max: number | null) => void;
  clearAmountRange: () => void;
}

export const useClientFilterStore = create<ClientFilterState>(set => ({
  minAmount: null,
  maxAmount: null,
  setAmountRange: (min, max) => set({ minAmount: min, maxAmount: max }),
  clearAmountRange: () => set({ minAmount: null, maxAmount: null }),
}));
