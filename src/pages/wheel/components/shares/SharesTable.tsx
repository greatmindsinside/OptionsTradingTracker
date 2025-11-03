import React from 'react';
import { useSharesCalculation } from './useSharesCalculation';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export const SharesTable: React.FC = () => {
  const rows = useSharesCalculation();
  const openContext = useWheelUIStore(s => s.openContext);
  return (
    <div className="text-sm">
      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr] gap-6 px-2 py-1 text-zinc-500">
        <div>Symbol</div>
        <div className="text-right">Shares</div>
        <div className="text-right">Covered</div>
        <div className="text-right">Uncovered</div>
        <div className="text-right">Avg Cost</div>
      </div>
      {rows.map(r => (
        <div
          key={r.t}
          className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr] items-center gap-6 rounded px-2 py-1 text-zinc-300 hover:bg-zinc-950/60"
        >
          <button
            className="text-left text-green-400 underline transition-colors hover:text-green-300"
            onClick={() => openContext(r.t)}
          >
            {r.t}
          </button>
          <div className="text-right tabular-nums">{r.shares}</div>
          <div className="text-right tabular-nums">{r.covered}</div>
          <div className="text-right tabular-nums">{r.uncovered}</div>
          <div className="text-right tabular-nums">${r.avg.toFixed(2)}</div>
        </div>
      ))}
      {rows.length === 0 && <div className="py-4 text-center text-zinc-600">No data</div>}
    </div>
  );
};
