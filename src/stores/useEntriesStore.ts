import { create } from 'zustand';

import { buildWhere } from '@/db/queryBuilder';
import {
  all,
  initDb,
  insertJournalRows,
  restoreEntry as restoreEntryDb,
  saveDb,
  softDelete,
} from '@/db/sql';
import {
  tmplCallAssigned,
  tmplCorrection,
  tmplDividend,
  tmplFee,
  tmplPutAssigned,
  tmplSellCoveredCall,
  tmplSellPut,
} from '@/models/templates';
import type { Entry, Totals } from '@/types/entry';
import type { FilterState } from '@/types/entry';
import type { TemplateKind, TemplatePayloads } from '@/types/templates';

interface EntriesStore {
  ready: boolean;
  entries: Entry[];
  totals: Totals;
  loading: boolean;
  error: string | null;

  // Actions
  loadEntries: (filters?: FilterState) => Promise<void>;
  addEntry: <K extends TemplateKind>(kind: K, payload: TemplatePayloads[K]) => Promise<void>;
  refreshTotals: (filters?: FilterState) => Promise<void>;
  deleteEntry: (entryId: string, reason?: string) => Promise<void>;
  restoreEntry: (entryId: string) => Promise<void>;
  editEntry: (entryId: string, updates: Partial<Entry>, reason?: string) => Promise<void>;
  getDeletedEntries: () => Promise<Entry[]>;
}

const defaultTotals: Totals = { inc: 0, out: 0, net: 0 };

export const useEntriesStore = create<EntriesStore>((set, get) => ({
  ready: false,
  entries: [],
  totals: defaultTotals,
  loading: false,
  error: null,

  loadEntries: async filters => {
    set({ loading: true, error: null });

    try {
      if (!get().ready) {
        await initDb();
        set({ ready: true });
      }

      const { clause, params } = buildWhere(filters);
      const entries = all<Entry>(
        `SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration, underlying_price, notes, meta FROM journal ${clause} ORDER BY datetime(ts) DESC`,
        params
      );

      set({ entries, loading: false });
      await get().refreshTotals(filters);
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  refreshTotals: async filters => {
    try {
      const { clause, params } = buildWhere(filters);
      const tot =
        all<{ inc: number; out: number; net: number }>(
          `SELECT 
           SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS inc,
           SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS out,
           SUM(amount) AS net
         FROM journal ${clause}`,
          params
        )[0] ?? defaultTotals;

      set({ totals: { inc: tot.inc ?? 0, out: tot.out ?? 0, net: tot.net ?? 0 } });
    } catch (error) {
      console.error('Failed to refresh totals:', error);
    }
  },

  addEntry: async (kind, payload) => {
    set({ loading: true, error: null });

    try {
      if (!get().ready) {
        await initDb();
        set({ ready: true });
      }

      const acc = payload.accountId ?? 'acct-1';
      const sym = (payload.symbol ?? '').toUpperCase();
      const base = { accountId: acc, symbol: sym, date: payload.date ?? new Date() };

      let rows: Entry[] = [];

      switch (kind) {
        case 'tmplSellPut':
          {
            const p = payload as TemplatePayloads['tmplSellPut'];
            rows = tmplSellPut({
              ...base,
              contracts: p.contracts,
              premiumPerContract: p.premiumPerContract,
              strike: p.strike,
              expiration: p.expiration,
              fee: p.fee,
            });
          }
          break;
        case 'tmplPutAssigned':
          {
            const p = payload as TemplatePayloads['tmplPutAssigned'];
            rows = tmplPutAssigned({
              ...base,
              contracts: p.contracts,
              strike: p.strike,
              expiration: p.expiration,
              fee: p.fee,
            });
          }
          break;
        case 'tmplSellCoveredCall':
          {
            const p = payload as TemplatePayloads['tmplSellCoveredCall'];
            rows = tmplSellCoveredCall({
              ...base,
              contracts: p.contracts,
              premiumPerContract: p.premiumPerContract,
              strike: p.strike,
              expiration: p.expiration,
              fee: p.fee,
            });
          }
          break;
        case 'tmplCallAssigned':
          {
            const p = payload as TemplatePayloads['tmplCallAssigned'];
            rows = tmplCallAssigned({
              ...base,
              contracts: p.contracts,
              strike: p.strike,
              expiration: p.expiration,
              fee: p.fee,
            });
          }
          break;
        case 'tmplDividend':
          rows = tmplDividend({
            ...base,
            amount: (payload as TemplatePayloads['tmplDividend']).amount,
          });
          break;
        case 'tmplFee':
          rows = tmplFee({ ...base, amount: (payload as TemplatePayloads['tmplFee']).amount });
          break;
        case 'tmplCorrection':
          {
            const p = payload as TemplatePayloads['tmplCorrection'];
            rows = tmplCorrection({ ...base, amount: p.amount, note: p.note });
          }
          break;
        default:
          rows = [];
      }

      if (rows.length === 0) {
        set({ loading: false });
        return;
      }

      await insertJournalRows(rows);
      await saveDb();

      // Reload entries
      await get().loadEntries();

      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteEntry: async (entryId: string, reason?: string) => {
    set({ loading: true, error: null });

    try {
      if (!get().ready) {
        await initDb();
        set({ ready: true });
      }

      // Soft delete the entry
      softDelete(entryId, reason);
      await saveDb();

      // Reload entries to reflect changes
      await get().loadEntries();

      console.log(`✅ Entry ${entryId} soft deleted`);
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  restoreEntry: async (entryId: string) => {
    set({ loading: true, error: null });

    try {
      if (!get().ready) {
        await initDb();
        set({ ready: true });
      }

      restoreEntryDb(entryId);
      await saveDb();
      await get().loadEntries();

      console.log(`✅ Entry ${entryId} restored`);
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  editEntry: async (entryId: string, updates: Partial<Entry>, reason?: string) => {
    set({ loading: true, error: null });

    try {
      if (!get().ready) {
        await initDb();
        set({ ready: true });
      }

      // Get original entry
      const original = all<Entry>(
        'SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration, underlying_price, notes, meta FROM journal WHERE id = ? AND deleted_at IS NULL',
        [entryId]
      )[0];

      if (!original) {
        throw new Error('Entry not found or already deleted');
      }

      // Soft delete the original
      softDelete(entryId, reason || 'Edited by user');

      // Create new entry with updates
      const corrected: Entry = {
        ...original,
        ...updates,
        id: crypto.randomUUID(),
      };

      // Insert corrected entry
      await insertJournalRows([corrected]);
      await saveDb();

      // Reload
      await get().loadEntries();

      console.log(
        `✅ Entry ${entryId} edited (original soft-deleted, new entry ${corrected.id} created)`
      );
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  getDeletedEntries: async () => {
    try {
      if (!get().ready) {
        await initDb();
        set({ ready: true });
      }

      // Query deleted entries (pass true to include deleted)
      const deleted = all<Entry>(
        'SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration, underlying_price, notes, meta, deleted_at, edit_reason FROM journal WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC',
        [],
        true
      );

      return deleted;
    } catch (error) {
      console.error('Failed to fetch deleted entries:', error);
      return [];
    }
  },
}));
