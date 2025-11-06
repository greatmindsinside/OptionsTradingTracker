import { create } from 'zustand';

interface WheelUIState {
  searchQuery: string;
  actionsOpen: boolean;
  actionsTab: 'Trade' | 'Import' | 'Data';
  contextSymbol: string | null;
  dataOpen: boolean;
  importing: boolean;

  setSearchQuery: (q: string) => void;
  openActions: (tab?: 'Trade' | 'Import' | 'Data') => void;
  closeActions: () => void;
  setActionsTab: (tab: 'Trade' | 'Import' | 'Data') => void;
  openContext: (symbol: string) => void;
  closeContext: () => void;
  toggleData: () => void;
  setImporting: (importing: boolean) => void;
}

export const useWheelUIStore = create<WheelUIState>(set => ({
  searchQuery: '',
  actionsOpen: false,
  actionsTab: 'Trade',
  contextSymbol: null,
  dataOpen: false,
  importing: false,

  setSearchQuery: q => set({ searchQuery: q }),
  openActions: tab => set({ actionsOpen: true, actionsTab: tab ?? 'Trade' }),
  closeActions: () => set({ actionsOpen: false }),
  setActionsTab: tab => set({ actionsTab: tab }),
  openContext: symbol => set({ contextSymbol: symbol }),
  closeContext: () => set({ contextSymbol: null }),
  toggleData: () => set(s => ({ dataOpen: !s.dataOpen })),
  setImporting: importing => set({ importing }),
}));
