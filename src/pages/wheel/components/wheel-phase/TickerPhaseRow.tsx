import React from 'react';
import { usePhaseCalculation } from './usePhaseCalculation';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export const TickerPhaseRow: React.FC<{ ticker: string }> = ({ ticker }) => {
  const { phase } = usePhaseCalculation(ticker);
  const earnings = useWheelStore(s => s.earnings);
  const openContext = useWheelUIStore(s => s.openContext);

  return (
    <div className="rounded-xl border border-green-500/20 bg-zinc-950/60 p-3 flex items-center gap-3 hover:border-green-400/40 transition-colors">
      <div
        className="text-lg font-semibold cursor-pointer text-green-400 hover:text-green-300 transition-colors"
        onClick={() => openContext(ticker)}
      >
        {ticker}
      </div>
      <span className="text-xs px-2 py-1 rounded border border-green-500/40 bg-green-500/15 text-green-400">
        {phase}
      </span>
      <div className="text-xs text-zinc-500 ml-auto">Earnings {earnings[ticker] || 'TBD'}</div>
      <button
        onClick={() => openContext(ticker)}
        className="text-xs px-2 py-1 rounded border border-green-500/40 bg-green-500/10 hover:bg-green-500/20 hover:border-green-400/60 transition-all text-green-400"
      >
        Open
      </button>
    </div>
  );
};
