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
import { transformJournalToPositions, transformJournalToShareLots } from '@/hooks/useWheelDatabase';
import {
  tmplCallAssigned,
  tmplCorrection,
  tmplDividend,
  tmplFee,
  tmplPutAssigned,
  tmplSellCoveredCall,
  tmplSellPut,
} from '@/models/templates';
import { calculateCurrentMinStrike, recordMinStrikeSnapshot } from '@/services/minStrikeSnapshot';
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
  addRawEntries: (rows: Entry[]) => Promise<void>;
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

      // Record min strike snapshot if this entry affects covered calls
      // Check if entry type is relevant for min strike tracking
      const relevantKinds: TemplateKind[] = [
        'tmplSellCoveredCall',
        'tmplCallAssigned',
        'tmplPutAssigned', // Put assignment adds shares
      ];

      // Also check for expiration entries in the rows (call expirations)
      const hasExpiration = rows.some(r => {
        if (r.type !== 'expiration' || !r.meta) return false;
        // Handle meta as either object or JSON string
        let metaObj: Record<string, unknown> | null = null;
        if (typeof r.meta === 'string') {
          try {
            metaObj = JSON.parse(r.meta);
          } catch {
            return false;
          }
        } else if (typeof r.meta === 'object') {
          metaObj = r.meta as Record<string, unknown>;
        }
        return metaObj?.leg === 'call';
      });

      // Check if any row is assignment_shares (shares purchased)
      const hasSharePurchase = rows.some(r => r.type === 'assignment_shares');

      if (relevantKinds.includes(kind) || hasExpiration || hasSharePurchase) {
        try {
          // Get current lots and positions from database
          const allEntries = await all<Entry>(
            'SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration, underlying_price, notes, meta FROM journal WHERE deleted_at IS NULL'
          );

          const shareLots = transformJournalToShareLots(allEntries);
          const positions = transformJournalToPositions(allEntries);

          // Convert ShareLot to format expected by calculateCurrentMinStrike
          const lots = shareLots.map(lot => ({
            ticker: lot.ticker,
            qty: lot.qty,
            costPerShare: lot.costPerShare,
          }));

          // Convert Position to format expected by calculateCurrentMinStrike
          const pos = positions.map(p => ({
            id: p.id,
            ticker: p.ticker,
            type: p.type,
            side: p.side,
            qty: p.qty,
            strike: p.strike,
            entry: p.entry,
            mark: p.mark,
            dte: p.dte,
            m: p.m,
            opened: p.opened,
          }));

          // Calculate and record snapshot for the ticker
          if (sym) {
            const calculation = calculateCurrentMinStrike(sym, lots, pos);

            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log('[useEntriesStore] Min strike calculation:', {
                ticker: sym,
                avgCost: calculation.avgCost,
                premiumReceived: calculation.premiumReceived,
                sharesOwned: calculation.sharesOwned,
                minStrike: calculation.minStrike,
                willRecord: calculation.avgCost > 0,
              });
            }

            // Only record if we have shares (avgCost > 0)
            if (calculation.avgCost > 0) {
              // Get date from payload or use today
              const date = payload.date
                ? typeof payload.date === 'string'
                  ? payload.date.slice(0, 10)
                  : new Date(payload.date).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10);

              try {
                await recordMinStrikeSnapshot(
                  sym,
                  date,
                  calculation.avgCost,
                  calculation.premiumReceived,
                  calculation.sharesOwned
                );

                if (process.env.NODE_ENV === 'development') {
                  console.log('[useEntriesStore] ✅ Min strike snapshot recorded:', {
                    ticker: sym,
                    date,
                    avgCost: calculation.avgCost,
                    premiumReceived: calculation.premiumReceived,
                    sharesOwned: calculation.sharesOwned,
                  });
                }
              } catch (snapshotError) {
                console.error('[useEntriesStore] Failed to record min strike snapshot:', snapshotError);
              }
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log('[useEntriesStore] ⚠️ Skipping snapshot - no shares (avgCost = 0)');
              }
            }
          }
        } catch (error) {
          // Log error but don't fail the entry creation
          console.error('Failed to record min strike snapshot:', error);
        }
      }

      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  addRawEntries: async (rows: Entry[]) => {
    set({ loading: true, error: null });

    try {
      if (!get().ready) {
        await initDb();
        set({ ready: true });
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

      // console.log(`✅ Entry ${entryId} soft deleted`);
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

      // console.log(`✅ Entry ${entryId} restored`);
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

      // console.log(
      //   `✅ Entry ${entryId} edited (original soft-deleted, new entry ${corrected.id} created)`
      // );
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
