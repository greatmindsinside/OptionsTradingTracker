import { Icon } from '@iconify/react';
import React from 'react';

import { useFilteredTickers } from '@/pages/wheel/hooks/useFilteredTickers';

import { TickerPhaseRow } from './TickerPhaseRow';

export const WheelPhaseCard: React.FC = () => {
  const tickers = useFilteredTickers();
  return (
    <div className="glass-card-deep rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2 pl-1 text-lg font-semibold tracking-wide text-slate-100">
        <Icon
          icon="fluent:arrow-sync-circle-24-filled"
          className="h-4 w-4"
          style={{ color: '#F5B342' }}
        />
        Wheel Phase
      </div>
      <div className="grid grid-cols-2 gap-4">
        {tickers.map(t => (
          <TickerPhaseRow key={t} ticker={t} />
        ))}
        {tickers.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-500">No symbols</div>
        )}
      </div>
    </div>
  );
};
