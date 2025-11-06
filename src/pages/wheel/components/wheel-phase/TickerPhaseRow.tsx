import React from 'react';

import { all } from '@/db/sql';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import type { Entry } from '@/types/entry';

import { usePhaseCalculation } from './usePhaseCalculation';

export const TickerPhaseRow: React.FC<{ ticker: string }> = ({ ticker }) => {
  const { phase } = usePhaseCalculation(ticker);
  const earnings = useWheelStore(s => s.earnings);
  const openContext = useWheelUIStore(s => s.openContext);
  const { deleteEntry } = useEntriesStore();
  const reloadFn = useWheelStore(s => s.reloadFn);

  const handleClosePosition = async () => {
    const confirmed = window.confirm(
      `Close all positions for ${ticker}?\n\n` +
        `This will soft-delete all journal entries for this ticker.\n` +
        `Entries can be restored from the Journal page's Deleted tab.`
    );

    if (!confirmed) return;

    try {
      // Query database directly for all entries with this ticker (bypassing filters)
      // Select only core columns that are guaranteed to exist
      const sql = `
        SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration, 
               underlying_price, notes, meta
        FROM journal 
        WHERE symbol = ?
      `;
      let tickerEntries = await all<Entry>(sql, [ticker]);

      // Filter out any soft-deleted entries (if the column exists)
      try {
        const deletedCheckSql = `
          SELECT id FROM journal 
          WHERE symbol = ? AND deleted_at IS NOT NULL AND deleted_at != ''
        `;
        const deletedIds = await all<{ id: string }>(deletedCheckSql, [ticker]);
        const deletedIdSet = new Set(deletedIds.map(d => d.id));
        tickerEntries = tickerEntries.filter(e => !deletedIdSet.has(e.id));
      } catch {
        // If deleted_at column doesn't exist yet, just use all entries
        console.log('Note: deleted_at column not found, will delete all entries for ticker');
      }

      if (tickerEntries.length === 0) {
        alert(`No entries found for ${ticker}`);
        return;
      }

      // Delete all entries for this ticker
      for (const entry of tickerEntries) {
        await deleteEntry(entry.id, `Position closed for ${ticker}`);
      }

      // Reload wheel data to reflect changes
      if (reloadFn) {
        await reloadFn();
      }

      alert(`Successfully closed ${tickerEntries.length} entries for ${ticker}`);
    } catch (err) {
      alert(`Failed to close position: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-emerald-400/40 bg-zinc-900/90 p-4 shadow-sm shadow-black/30 transition-all hover:-translate-y-0.5 hover:border-emerald-400/70 hover:shadow-black/40">
      <div
        className="cursor-pointer text-xl font-semibold tracking-wide text-emerald-400 transition-colors hover:text-emerald-300"
        onClick={() => openContext(ticker)}
      >
        {ticker}
      </div>
      <span className="rounded border border-emerald-400/50 bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
        {phase}
      </span>
      <div className="ml-auto text-xs text-zinc-300">Earnings {earnings[ticker] || 'TBD'}</div>
      <button
        onClick={() => openContext(ticker)}
        className="rounded border border-emerald-400/60 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 transition-all hover:border-emerald-400/80 hover:bg-emerald-500/20"
      >
        Open
      </button>
      <button
        onClick={handleClosePosition}
        className="rounded border border-red-500/60 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-200 transition-all hover:border-red-400/80 hover:bg-red-500/20"
        title="Close all positions for this ticker"
      >
        ✕ Close
      </button>
    </div>
  );
};
