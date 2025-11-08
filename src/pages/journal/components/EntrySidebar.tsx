import React from 'react';

import { fmtDate, fmtMoney } from '@/lib/format';
import type { Entry } from '@/types/entry';

interface EntrySidebarProps {
  entry: Entry | null;
  relatedEntries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

export const EntrySidebar: React.FC<EntrySidebarProps> = ({
  entry,
  relatedEntries,
  onEdit,
  onDelete,
}) => {
  if (!entry) return null;

  const dte = entry.expiration
    ? Math.ceil((new Date(entry.expiration).getTime() - new Date(entry.ts).getTime()) / 86400000)
    : null;

  // Calculate risk metrics
  const totalExposure = entry.strike && entry.qty ? entry.strike * entry.qty * 100 : 0;
  const maxLoss = entry.type === 'sell_to_open' ? totalExposure : 0;
  const maxProfit = entry.type === 'sell_to_open' && entry.amount ? entry.amount : 0;

  // Get meta fields
  const delta =
    entry.meta && typeof entry.meta === 'object' && 'delta' in entry.meta
      ? typeof entry.meta.delta === 'number'
        ? entry.meta.delta
        : null
      : null;
  const ivRank =
    entry.meta && typeof entry.meta === 'object' && 'iv_rank' in entry.meta
      ? typeof entry.meta.iv_rank === 'number'
        ? entry.meta.iv_rank
        : null
      : null;
  const ivPercentile =
    entry.meta && typeof entry.meta === 'object' && 'iv_percentile' in entry.meta
      ? typeof entry.meta.iv_percentile === 'number'
        ? entry.meta.iv_percentile
        : null
      : null;
  const commission =
    entry.meta && typeof entry.meta === 'object' && 'commission' in entry.meta
      ? typeof entry.meta.commission === 'number'
        ? entry.meta.commission
        : null
      : null;

  return (
    <div className="space-y-6">
      {/* Entry Details */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-950/50 p-4">
        <h3 className="mb-4 text-sm font-semibold tracking-wide text-zinc-400 uppercase">
          Entry Details
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Symbol</span>
            <span className="font-semibold text-zinc-200">{entry.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Date</span>
            <span className="text-zinc-300">{fmtDate(entry.ts)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Type</span>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs ${
                entry.type === 'sell_to_open'
                  ? 'bg-green-500/20 text-green-400'
                  : entry.type === 'assignment_shares'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-zinc-700/20 text-zinc-400'
              }`}
            >
              {entry.type.replace(/_/g, ' ')}
            </span>
          </div>
          {entry.qty && (
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Quantity</span>
              <span className="text-zinc-300">{entry.qty}</span>
            </div>
          )}
          {entry.strike && (
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Strike</span>
              <span className="text-zinc-300">${entry.strike.toFixed(2)}</span>
            </div>
          )}
          {entry.expiration && (
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Expiration</span>
              <span className="text-zinc-300">{fmtDate(entry.expiration)}</span>
            </div>
          )}
          {dte !== null && (
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Days to Expiration</span>
              <span
                className={`font-semibold ${
                  dte >= 0
                    ? dte < 7
                      ? 'text-red-400'
                      : dte < 30
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    : 'text-zinc-400'
                }`}
              >
                {dte >= 0 ? dte : `(${Math.abs(dte)})`}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Amount</span>
            <span
              className={`font-semibold ${entry.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {fmtMoney(entry.amount)}
            </span>
          </div>
          {entry.notes && (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-zinc-500">Notes</span>
              <span className="text-sm text-zinc-300">{entry.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Options Analytics */}
      {(delta !== null || ivRank !== null || ivPercentile !== null || commission !== null) && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-950/50 p-4">
          <h3 className="mb-4 text-sm font-semibold tracking-wide text-zinc-400 uppercase">
            Options Analytics
          </h3>
          <div className="space-y-3">
            {delta !== null && (
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Delta</span>
                <span className="text-zinc-300">{delta.toFixed(2)}</span>
              </div>
            )}
            {ivRank !== null && (
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">IV Rank</span>
                <span className="text-zinc-300">{ivRank.toFixed(0)}%</span>
              </div>
            )}
            {ivPercentile !== null && (
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">IV Percentile</span>
                <span className="text-zinc-300">{ivPercentile.toFixed(0)}%</span>
              </div>
            )}
            {commission !== null && (
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Commission/Fees</span>
                <span className="text-zinc-300">{fmtMoney(commission)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Metrics */}
      {entry.type === 'sell_to_open' && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-950/50 p-4">
          <h3 className="mb-4 text-sm font-semibold tracking-wide text-zinc-400 uppercase">
            Risk Metrics
          </h3>
          <div className="space-y-3">
            {totalExposure > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Total Exposure</span>
                <span className="text-zinc-300">{fmtMoney(totalExposure)}</span>
              </div>
            )}
            {maxLoss > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Max Loss</span>
                <span className="text-red-400">{fmtMoney(maxLoss)}</span>
              </div>
            )}
            {maxProfit > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Max Profit</span>
                <span className="text-green-400">{fmtMoney(maxProfit)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Related Positions */}
      {relatedEntries.length > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-950/50 p-4">
          <h3 className="mb-4 text-sm font-semibold tracking-wide text-zinc-400 uppercase">
            Related Positions ({relatedEntries.length})
          </h3>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {relatedEntries.map(related => (
              <div
                key={related.id}
                className="cursor-pointer rounded border border-zinc-700 bg-zinc-900/50 p-3 transition-colors hover:bg-zinc-800/50"
                onClick={() => {
                  // Scroll to entry in table
                  const element = document.getElementById(`entry-${related.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-200">{fmtDate(related.ts)}</span>
                  <span
                    className={`text-sm font-semibold ${related.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {fmtMoney(related.amount)}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {related.type.replace(/_/g, ' ')}
                  {related.strike && ` @ $${related.strike.toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 border-t border-zinc-700 pt-4">
        <button
          onClick={() => onEdit(entry)}
          className="flex-1 rounded border border-blue-500/50 bg-blue-900/20 px-4 py-2 text-sm text-blue-400 transition-colors hover:bg-blue-900/30"
        >
          Edit
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Delete entry for ${entry.symbol}?`)) {
              onDelete(entry);
            }
          }}
          className="flex-1 rounded border border-red-500/50 bg-red-900/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/30"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
