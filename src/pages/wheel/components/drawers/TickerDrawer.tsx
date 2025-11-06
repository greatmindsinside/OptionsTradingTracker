import React, { useMemo } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export const TickerDrawer: React.FC = () => {
  const sym = useWheelUIStore(s => s.contextSymbol);
  const close = useWheelUIStore(s => s.closeContext);
  const lots = useWheelStore(s => s.lots);
  const pos = useWheelStore(s => s.positions);

  const filtered = useMemo(() => {
    const S = sym?.toUpperCase() || '';
    return {
      lots: lots.filter(l => l.ticker.toUpperCase() === S),
      pos: pos.filter(p => p.ticker.toUpperCase() === S),
    };
  }, [lots, pos, sym]);

  if (!sym) return null;

  return (
    <div className="fixed inset-0 z-40" aria-modal>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-md border-l border-green-500/30 bg-zinc-950/95 p-4 shadow-2xl shadow-green-500/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold text-green-400">{sym}</div>
          <button onClick={close} className="text-sm text-zinc-400 hover:text-zinc-200">
            Close
          </button>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <div className="mb-1 text-zinc-500">Open Positions</div>
            {filtered.pos.length === 0 && <div className="text-zinc-600">None</div>}
            <div className="space-y-2">
              {filtered.pos.map(p => (
                <div
                  key={p.id}
                  className="rounded border border-green-500/20 bg-zinc-950/40 px-3 py-2 text-zinc-300"
                >
                  {p.side === 'S' ? 'Short' : 'Long'} {p.qty} {p.type} @ {p.strike} · entry $
                  {p.entry.toFixed(2)} · DTE {p.dte}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-zinc-500">Share Lots</div>
            {filtered.lots.length === 0 && <div className="text-zinc-600">None</div>}
            <div className="space-y-2">
              {filtered.lots.map(l => (
                <div
                  key={l.id}
                  className="rounded border border-green-500/20 bg-zinc-950/40 px-3 py-2 text-zinc-300"
                >
                  {l.qty} @ ${l.cost.toFixed(2)} · opened {l.opened}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
