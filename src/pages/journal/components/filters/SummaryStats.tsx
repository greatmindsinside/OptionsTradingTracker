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
    <div className="ml-auto grid shrink-0 grid-cols-3 gap-3">
      <div className="flex min-w-28 flex-col justify-center rounded-xl border border-emerald-500/20 bg-zinc-950/60 px-4 py-2 shadow-inner">
        <div className="text-[11px] tracking-wide text-zinc-400/90 uppercase">In</div>
        <div className="font-semibold text-emerald-400">{fmtMoney(totals.inc)}</div>
      </div>
      <div className="flex min-w-28 flex-col justify-center rounded-xl border border-red-500/20 bg-zinc-950/60 px-4 py-2 shadow-inner">
        <div className="text-[11px] tracking-wide text-zinc-400/90 uppercase">Out</div>
        <div className="font-semibold text-red-400">{fmtMoney(totals.out)}</div>
      </div>
      <div
        className={`flex min-w-28 flex-col justify-center rounded-xl border bg-zinc-950/60 px-4 py-2 shadow-inner ${totals.net >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}
      >
        <div className="text-[11px] tracking-wide text-zinc-400/90 uppercase">Net</div>
        <div className={`${totals.net >= 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold`}>
          {fmtMoney(totals.net)}
        </div>
      </div>
    </div>
  );
};
