import React from 'react';

import { useWheelUIStore } from '@/stores/useWheelUIStore';

import { useSharesCalculation } from './useSharesCalculation';

export const SharesTable: React.FC = () => {
  const rows = useSharesCalculation();
  const openContext = useWheelUIStore(s => s.openContext);
  return (
    <div className="text-sm">
      <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.9fr] gap-2 px-2 py-2 text-xs font-medium tracking-wider text-slate-600 uppercase">
        <div>Symbol</div>
        <div className="text-right">Shares</div>
        <div className="text-right">Covered</div>
        <div className="text-right">Uncov.</div>
        <div className="text-right">Avg Cost</div>
      </div>
      {rows.map(r => (
        <div
          key={r.t}
          className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.9fr] items-center gap-2 rounded-lg px-2 py-2 backdrop-blur-sm transition-colors hover:bg-black/30"
        >
          <button
            className="text-left font-medium text-emerald-400 underline decoration-emerald-500/30 underline-offset-2 transition-colors hover:text-emerald-300 hover:decoration-emerald-400/50"
            onClick={() => openContext(r.t)}
          >
            {r.t}
          </button>
          <div className="text-right text-slate-400 tabular-nums">{r.shares}</div>
          <div className="text-right text-slate-400 tabular-nums">{r.covered}</div>
          <div className="text-right text-slate-400 tabular-nums">{r.uncovered}</div>
          <div className="text-right text-slate-400 tabular-nums">${r.avg.toFixed(2)}</div>
        </div>
      ))}
      {rows.length === 0 && <div className="py-4 text-center text-slate-500">No data</div>}
    </div>
  );
};
