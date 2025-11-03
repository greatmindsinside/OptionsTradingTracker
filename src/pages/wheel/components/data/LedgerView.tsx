import React from 'react';
import type { LedgerEvent } from '@/types/wheel';

export const LedgerView: React.FC<{ ledger: LedgerEvent[] }> = ({ ledger }) => (
  <div className="text-sm space-y-1 max-h-64 overflow-auto">
    {ledger.map(e => (
      <div
        key={e.id}
        className="px-2 py-1 rounded border border-green-500/20 bg-zinc-950/40 text-zinc-300"
      >
        {e.when} · {e.kind} · {e.symbol || ''}
      </div>
    ))}
    {ledger.length === 0 && <div className="text-zinc-600">Empty</div>}
  </div>
);
