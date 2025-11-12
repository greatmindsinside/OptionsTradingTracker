import { create } from 'zustand';

export type QuickActionType = 'assignPut' | 'assignCall' | 'buyShares' | 'sellShares' | 'rollPut' | 'rollCall';

export interface PrefillData {
  symbol?: string;
  contracts?: number;
  strike?: number;
  expiration?: string;
  shares?: number;
  pricePerShare?: number;
  // Roll-specific fields
  oldContracts?: number;
  oldStrike?: number;
  oldExpiration?: string;
  closePremium?: number;
}

interface QuickActionsState {
  isOpen: boolean;
  activeForm: QuickActionType | null;
  prefillData?: PrefillData;
  openForm: (form: QuickActionType, prefillData?: PrefillData) => void;
  closeForm: () => void;
}

export const useQuickActions = create<QuickActionsState>(set => ({
  isOpen: false,
  activeForm: null,
  prefillData: undefined,
  openForm: (form, prefillData) => set({ isOpen: true, activeForm: form, prefillData }),
  closeForm: () => set({ isOpen: false, activeForm: null, prefillData: undefined }),
}));
