import { create } from 'zustand';
import type { Lot, Position, LedgerEvent } from '@/types/wheel';
import { daysBetween } from '@/utils/wheel-calculations';

interface WheelState {
  lots: Lot[];
  positions: Position[];
  earnings: Record<string, string>;
  ledger: LedgerEvent[];
  reloadFn: (() => Promise<void>) | null;

  // setters
  setLots: (lots: Lot[]) => void;
  setPositions: (positions: Position[]) => void;
  setEarnings: (earnings: Record<string, string>) => void;
  addLedgerEvent: (event: LedgerEvent) => void;
  setReloadFn: (fn: (() => Promise<void>) | null) => void;

  // domain actions (kept minimal here; business logic can call into stores)
  addOption: (params: {
    symbol: string;
    type: 'P' | 'C';
    side: 'S' | 'B';
    qty: number;
    strike: number;
    entry: number;
    dte: number;
    opened?: string;
  }) => void;

  updateExpiration: (rowId: string, newDate: string) => void;
}

export const useWheelStore = create<WheelState>(set => ({
  lots: [],
  positions: [],
  earnings: {},
  ledger: [],
  reloadFn: null,

  setLots: lots => set({ lots }),
  setPositions: positions => set({ positions }),
  setEarnings: earnings => set({ earnings }),
  addLedgerEvent: event => set(s => ({ ledger: [...s.ledger, event] })),
  setReloadFn: fn => set({ reloadFn: fn }),

  addOption: _ => {
    void _; // intentionally unused; API reserved for future optimistic updates
    // Intentionally minimal: actual DB writes and journal updates are handled
    // by higher-level flows (e.g., useJournal or import services). This store
    // simply provides a stable interface for UI components and hooks.
    // You can extend this to optimistically update positions if desired.
  },

  updateExpiration: (rowId, newDate) => {
    set(s => ({
      positions: s.positions.map(p =>
        p.id === rowId ? { ...p, dte: Math.max(0, daysBetween(p.opened, newDate)) } : p
      ),
      ledger: [
        ...s.ledger,
        {
          id: crypto.randomUUID(),
          kind: 'expiration_updated',
          when: new Date().toISOString(),
          meta: { rowId, to: newDate },
        },
      ],
    }));
  },
}));
