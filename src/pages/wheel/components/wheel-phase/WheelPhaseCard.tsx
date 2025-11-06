import React from 'react';

import { useFilteredTickers } from '@/pages/wheel/hooks/useFilteredTickers';

import { TickerPhaseRow } from './TickerPhaseRow';

export const WheelPhaseCard: React.FC = () => {
  const tickers = useFilteredTickers();
  return (
    <div className="rounded-2xl border border-emerald-400/40 bg-zinc-950/95 p-5 shadow-lg shadow-emerald-500/15 backdrop-blur-none backdrop-saturate-150 ring-1 ring-inset ring-emerald-400/20">
  <div className="mb-3 text-lg font-semibold tracking-wide text-emerald-400">📈 Wheel Phase</div>
      <div className="grid grid-cols-2 gap-4">
        {tickers.map(t => (
          <TickerPhaseRow key={t} ticker={t} />
        ))}
        {tickers.length === 0 && (
          <div className="py-6 text-center text-sm text-zinc-500">No symbols</div>
        )}
      </div>
    </div>
  );
};
