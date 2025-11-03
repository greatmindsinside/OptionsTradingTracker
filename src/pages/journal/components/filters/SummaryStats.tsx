import React from 'react';
import { fmtMoney } from '@/lib/format';
import type { Totals } from '@/types/entry';

interface SummaryStatsProps {
  totals: Totals;
}

/**
 * SummaryStats
 *
 * Displays aggregate IN/OUT/NET derived from useEntriesStore.totals.
 * Those totals are refreshed by the store using a single SQL query with
 * SUM(...) over the filtered journal table (see useEntriesStore.refreshTotals),
 * ensuring the numbers always match the current filter selection.
 */
export const SummaryStats: React.FC<SummaryStatsProps> = ({ totals }) => {
  return (
    <div className="grid grid-cols-3 gap-3 shrink-0 ml-auto">
      <div className="min-w-28 px-4 py-2 rounded-xl border border-emerald-500/20 bg-zinc-950/60 shadow-inner flex flex-col justify-center">
        <div className="text-[11px] uppercase tracking-wide text-zinc-400/90">In</div>
        <div className="text-emerald-400 font-semibold">{fmtMoney(totals.inc)}</div>
      </div>
      <div className="min-w-28 px-4 py-2 rounded-xl border border-red-500/20 bg-zinc-950/60 shadow-inner flex flex-col justify-center">
        <div className="text-[11px] uppercase tracking-wide text-zinc-400/90">Out</div>
        <div className="text-red-400 font-semibold">{fmtMoney(totals.out)}</div>
      </div>
      <div
        className={`min-w-28 px-4 py-2 rounded-xl border bg-zinc-950/60 shadow-inner flex flex-col justify-center ${totals.net >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}
      >
        <div className="text-[11px] uppercase tracking-wide text-zinc-400/90">Net</div>
        <div className={`${totals.net >= 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold`}>
          {fmtMoney(totals.net)}
        </div>
      </div>
    </div>
  );
};
