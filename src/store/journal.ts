import { useSyncExternalStore } from 'react';

export type JournalKind =
  | 'symbol_tracked'
  | 'sell_put'
  | 'sell_call'
  | 'buy_close'
  | 'roll_put'
  | 'roll_call'
  | 'put_assigned'
  | 'call_assigned'
  | 'dividend'
  | 'fee'
  | 'earnings_set';

export type JournalEntry = {
  id: string;
  when: string; // ISO string
  kind: JournalKind;
  symbol?: string; // uppercase ticker
  contracts?: number; // option contracts count
  side?: 'S' | 'B';
  type?: 'P' | 'C';
  strike?: number;
  premium?: number; // per-contract price
  fees?: number;
  dte?: number; // days to expiry at open
  price?: number; // assignment or dividend per-share amount
  shares?: number; // explicit share count (dividend or direct lot)
  notes?: string;
  meta?: Record<string, unknown>;
};

type Listener = () => void;

const KEY = 'journal.v1';

function load(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as JournalEntry[];
    return [];
  } catch {
    return [];
  }
}

let entries: JournalEntry[] = load();
const listeners = new Set<Listener>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch (e) {
    // ignore storage quota or serialization errors
    console.warn('journal.persist: failed to save', e);
  }
  listeners.forEach(l => l());
}

export const journal = {
  getAll(): JournalEntry[] {
    return entries;
  },
  add(e: Omit<JournalEntry, 'id' | 'when'> & { when?: string }) {
    const row: JournalEntry = {
      id: crypto.randomUUID(),
      when: e.when ?? new Date().toISOString(),
      ...e,
    };
    entries = [...entries, row];
    emit();
    return row;
  },
  replaceAll(next: JournalEntry[]) {
    entries = next.slice();
    emit();
  },
  subscribe(cb: Listener) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

export function useJournal() {
  const get = () => journal.getAll();
  const subscribe = (cb: () => void) => journal.subscribe(cb);
  const data = useSyncExternalStore(subscribe, get, get);
  return {
    entries: data,
    add: journal.add,
    replaceAll: journal.replaceAll,
  };
}
