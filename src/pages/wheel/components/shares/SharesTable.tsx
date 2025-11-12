import React from 'react';

import { useQuickActions } from '@/pages/wheel/components/actions/useQuickActions';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

import { useSharesCalculation } from './useSharesCalculation';

export const SharesTable: React.FC = () => {
  const rows = useSharesCalculation();
  const openContext = useWheelUIStore(s => s.openContext);
  const { openForm } = useQuickActions();

  const handleBuyShares = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openForm('buyShares', { symbol: ticker });
  };

  return (
    <div className="text-sm">
      <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.9fr] gap-2 px-2 py-2 text-xs font-medium tracking-wider text-slate-600 uppercase">
        <div>Symbol</div>
        <div className="text-right">Shares</div>
        <div className="text-right">Covered</div>
        <div className="text-right">Uncov.</div>
        <div className="text-right">Avg Cost</div>
      </div>
      {rows.map(r => {
        const needsShares = r.shares === 0 && r.shortCalls > 0;
        return (
          <div
            key={r.t}
            className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.9fr] items-center gap-2 rounded-lg px-2 py-2 backdrop-blur-sm transition-colors hover:bg-black/30"
          >
            <div className="flex items-center gap-2">
              <button
                className="text-left font-medium text-emerald-400 underline decoration-emerald-500/30 underline-offset-2 transition-colors hover:text-emerald-300 hover:decoration-emerald-400/50"
                onClick={() => openContext(r.t)}
              >
                {r.t}
              </button>
              {needsShares && (
                <button
                  className="rounded px-1.5 py-0.5 text-xs font-semibold transition-all"
                  style={{
                    border: '1px solid rgba(245, 179, 66, 0.3)',
                    background: 'rgba(245, 179, 66, 0.08)',
                    color: '#F5B342',
                    boxShadow: '0 0 4px rgba(245, 179, 66, 0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(245, 179, 66, 0.5)';
                    e.currentTarget.style.background = 'rgba(245, 179, 66, 0.15)';
                    e.currentTarget.style.boxShadow = '0 0 6px rgba(245, 179, 66, 0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(245, 179, 66, 0.3)';
                    e.currentTarget.style.background = 'rgba(245, 179, 66, 0.08)';
                    e.currentTarget.style.boxShadow = '0 0 4px rgba(245, 179, 66, 0.06)';
                  }}
                  onClick={e => handleBuyShares(r.t, e)}
                  title="Buy shares to cover uncovered calls"
                >
                  Buy Shares
                </button>
              )}
            </div>
            <div className="text-right text-slate-400 tabular-nums">{r.shares}</div>
            <div className="text-right text-slate-400 tabular-nums">{r.covered}</div>
            <div className="text-right text-slate-400 tabular-nums">{r.uncovered}</div>
            <div className="text-right text-slate-400 tabular-nums">${r.avg.toFixed(2)}</div>
          </div>
        );
      })}
      {rows.length === 0 && <div className="py-4 text-center text-slate-500">No data</div>}
    </div>
  );
};
