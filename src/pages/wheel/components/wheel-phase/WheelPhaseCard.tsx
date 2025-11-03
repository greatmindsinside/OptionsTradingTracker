import React from 'react';
import { useFilteredTickers } from '@/pages/wheel/hooks/useFilteredTickers';
import { TickerPhaseRow } from './TickerPhaseRow';

export const WheelPhaseCard: React.FC = () => {
  const tickers = useFilteredTickers();
  return (
    <div className="rounded-2xl border border-green-500/20 bg-linear-to-br from-black/80 to-zinc-950/90 backdrop-blur-xl p-4 shadow-lg shadow-green-500/10">
      <div className="text-green-400 font-semibold mb-2">📈 Wheel Phase</div>
      <div className="grid grid-cols-2 gap-3">
        {tickers.map(t => (
          <TickerPhaseRow key={t} ticker={t} />
        ))}
        {tickers.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-4">No symbols</div>
        )}
      </div>
    </div>
  );
};
