import { create } from 'zustand';

import type { Entry } from '@/types/entry';

interface JournalUIState {
  editOpen: boolean;
  selected: Entry | null; // currently editing entry
  openEdit: (entry: Entry) => void;
  closeEdit: () => void;
}

export const useJournalUIStore = create<JournalUIState>(set => ({
  editOpen: false,
  selected: null,
  openEdit: (entry: Entry) => set({ editOpen: true, selected: entry }),
  closeEdit: () => set({ editOpen: false, selected: null }),
}));
