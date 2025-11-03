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
      className={`rounded-lg border ${color} p-3 flex items-center gap-3 hover:border-green-400/40 transition-colors`}
    >
      <div className="font-semibold text-green-400">{row.symbol}</div>
      <div className="text-xs text-zinc-400">
        {row.type} {row.strike}
      </div>
      <div
        className={`text-xs px-2 py-1 rounded border ${d === 0 ? 'border-red-500/40 bg-red-500/20 badge-urgent' : d <= 7 ? 'border-amber-500/40 bg-amber-500/20 badge-glow' : 'border-green-500/40 bg-green-500/15'}`}
      >
        {row.expiration} · DTE {d}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <InlineDateEdit date={row.expiration} onSave={ymd => updateExpiration(row.id, ymd)} />
        <button className="text-xs px-2 py-1 rounded border border-green-500/40 bg-green-500/10 hover:bg-green-500/20 hover:border-green-400/60 transition-all text-green-400">
          Plan Roll
        </button>
      </div>
    </div>
  );
};
