import { create } from 'zustand';
import { initDb, all, insertJournalRows, saveDb } from '@/db/sql';
import { buildWhere } from '@/db/queryBuilder';
import type { Entry, Totals } from '@/types/entry';
import type { FilterState } from '@/types/entry';
import type { TemplateKind, TemplatePayloads } from '@/types/templates';
import {
  tmplSellPut,
  tmplPutAssigned,
  tmplSellCoveredCall,
  tmplCallAssigned,
  tmplDividend,
  tmplFee,
  tmplCorrection,
} from '@/models/templates';

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
        case 'tmplCorrection':
          {
            const p = payload as TemplatePayloads['tmplCorrection'];
            rows = tmplCorrection({ ...base, amount: p.amount, note: p.note });
          }
          break;
          rows = tmplFee({ ...base, amount: (payload as TemplatePayloads['tmplFee']).amount });
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
}));
