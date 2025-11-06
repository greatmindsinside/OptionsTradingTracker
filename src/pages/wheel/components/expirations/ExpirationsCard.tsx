import React, { useMemo } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';
import type { ExpRow } from '@/types/wheel';
import { ymd } from '@/utils/wheel-calculations';

import { ExpirationRow } from './ExpirationRow';
import { useExpirationSort } from './useExpirationSort';

export const ExpirationsCard: React.FC = () => {
  const positions = useWheelStore(s => s.positions);
  const rows: ExpRow[] = useMemo(
    () =>
      positions.map(p => ({
        id: p.id,
        symbol: p.ticker,
        type: p.type,
        strike: p.strike,
        expiration: ymd(new Date(new Date(p.opened).getTime() + p.dte * 864e5)),
        side: p.side,
        qty: p.qty,
      })),
    [positions]
  );
  const sorted = useExpirationSort(rows);

  return (
    <div className="rounded-2xl border border-green-500/20 bg-linear-to-br from-black/80 to-zinc-950/90 p-4 shadow-lg shadow-green-500/10 backdrop-blur-xl">
      <div className="mb-2 font-semibold text-green-400">⏳ Upcoming Expirations</div>
      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="py-4 text-center text-sm text-slate-500">No upcoming expirations</div>
        )}
        {sorted.map(row => (
          <ExpirationRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
};
