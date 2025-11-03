import React, { useState } from 'react';
import { MiniTable } from './MiniTable';
import { StatCard } from './StatCard';
import { useWheelStore } from '@/stores/useWheelStore';

export const DataExplorer: React.FC = () => {
  const lots = useWheelStore(s => s.lots);
  const pos = useWheelStore(s => s.positions);
  const earn = useWheelStore(s => s.earnings);
  const ledger = useWheelStore(s => s.ledger);
  const tabs = ['Overview', 'Tables', 'Ledger'] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview');

  return (
    <div className="space-y-3" data-testid="drawer.data">
      <div className="flex gap-2 text-sm">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded border transition-colors ${tab === t ? 'border-green-400 bg-green-500/15 text-green-400 shadow-lg shadow-green-500/20' : 'border-zinc-700 text-zinc-400 hover:border-green-500/30'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Overview' && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Symbols"
            value={String(new Set([...pos.map(p => p.ticker), ...lots.map(l => l.ticker)]).size)}
          />
          <StatCard label="Lots" value={String(lots.length)} />
          <StatCard label="Positions" value={String(pos.length)} />
          <StatCard label="Events" value={String(ledger.length)} />
        </div>
      )}
      {tab === 'Tables' && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MiniTable
            title="Lots"
            cols={['Ticker', 'Qty', 'Cost', 'Opened']}
            rows={lots.map(l => [l.ticker, l.qty, `$${l.cost.toFixed(2)}`, l.opened])}
          />
          <MiniTable
            title="Positions"
            cols={['Sym', 'Type', 'Side', 'Qty', 'Strike', 'Entry', 'Mark', 'DTE']}
            rows={pos.map(p => [
              p.ticker,
              p.type,
              p.side,
              p.qty,
              p.strike,
              `$${p.entry}`,
              `$${p.mark}`,
              p.dte,
            ])}
          />
          <MiniTable
            title="Earnings"
            cols={['Symbol', 'Date']}
            rows={Object.entries(earn).map(([s, d]) => [s, d])}
          />
        </div>
      )}
      {tab === 'Ledger' && (
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
      )}
    </div>
  );
};
