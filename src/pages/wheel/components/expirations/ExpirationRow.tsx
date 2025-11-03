import React from 'react';
import type { ExpRow } from '@/types/wheel';
import { daysTo } from '@/utils/wheel-calculations';
import { InlineDateEdit } from './InlineDateEdit';
import { useWheelStore } from '@/stores/useWheelStore';

export const ExpirationRow: React.FC<{ row: ExpRow }> = ({ row }) => {
  const updateExpiration = useWheelStore(s => s.updateExpiration);
  const d = daysTo(row.expiration);
  const color =
    d === 0
      ? 'border-red-500/60 bg-red-500/10 text-red-300'
      : d <= 7
        ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
        : 'border-green-500/20 bg-zinc-950/40';
  return (
    <div
      className={`rounded-lg border ${color} flex items-center gap-3 p-3 transition-colors hover:border-green-400/40`}
    >
      <div className="font-semibold text-green-400">{row.symbol}</div>
      <div className="text-xs text-zinc-400">
        {row.type} {row.strike}
      </div>
      <div
        className={`rounded border px-2 py-1 text-xs ${d === 0 ? 'badge-urgent border-red-500/40 bg-red-500/20' : d <= 7 ? 'badge-glow border-amber-500/40 bg-amber-500/20' : 'border-green-500/40 bg-green-500/15'}`}
      >
        {row.expiration} · DTE {d}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <InlineDateEdit date={row.expiration} onSave={ymd => updateExpiration(row.id, ymd)} />
        <button className="rounded border border-green-500/40 bg-green-500/10 px-2 py-1 text-xs text-green-400 transition-all hover:border-green-400/60 hover:bg-green-500/20">
          Plan Roll
        </button>
      </div>
    </div>
  );
};
