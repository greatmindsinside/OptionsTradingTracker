import React from 'react';

import { all } from '@/db/sql';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import type { Entry } from '@/types/entry';

import { usePhaseCalculation } from './usePhaseCalculation';

export const TickerPhaseRow: React.FC<{ ticker: string }> = ({ ticker }) => {
  const { phase } = usePhaseCalculation(ticker);
  const earnings = useWheelStore(s => s.earnings);
  const openContext = useWheelUIStore(s => s.openContext);
  const { deleteEntry } = useEntriesStore();
  const reloadFn = useWheelStore(s => s.reloadFn);

  const handleClosePosition = async () => {
    const confirmed = window.confirm(
      `Close all positions for ${ticker}?\n\n` +
        `This will soft-delete all journal entries for this ticker.\n` +
        `Entries can be restored from the Journal page's Deleted tab.`
    );

    if (!confirmed) return;

    try {
      // Query database directly for all entries with this ticker (bypassing filters)
      // Select only core columns that are guaranteed to exist
      const sql = `
        SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration, 
               underlying_price, notes, meta
        FROM journal 
        WHERE symbol = ?
      `;
      let tickerEntries = await all<Entry>(sql, [ticker]);

      // Filter out any soft-deleted entries (if the column exists)
      try {
        const deletedCheckSql = `
          SELECT id FROM journal 
          WHERE symbol = ? AND deleted_at IS NOT NULL AND deleted_at != ''
        `;
        const deletedIds = await all<{ id: string }>(deletedCheckSql, [ticker]);
        const deletedIdSet = new Set(deletedIds.map(d => d.id));
        tickerEntries = tickerEntries.filter(e => !deletedIdSet.has(e.id));
      } catch {
        // If deleted_at column doesn't exist yet, just use all entries
        console.log('Note: deleted_at column not found, will delete all entries for ticker');
      }

      if (tickerEntries.length === 0) {
        alert(`No entries found for ${ticker}`);
        return;
      }

      // Delete all entries for this ticker
      for (const entry of tickerEntries) {
        await deleteEntry(entry.id, `Position closed for ${ticker}`);
      }

      // Reload wheel data to reflect changes
      if (reloadFn) {
        await reloadFn();
      }

      alert(`Successfully closed ${tickerEntries.length} entries for ${ticker}`);
    } catch (err) {
      alert(`Failed to close position: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div
      className="flex items-center gap-4 rounded-xl backdrop-blur-sm transition-all hover:-translate-y-0.5"
      style={{
        border: '1px solid rgba(245, 179, 66, 0.4)',
        background: `
          radial-gradient(ellipse at 50% 100%, rgba(0, 227, 159, 0.05), transparent 60%),
          linear-gradient(135deg, rgba(11, 15, 14, 0.88), rgba(15, 25, 22, 0.94))
        `,
        padding: '1rem',
        boxShadow: `
          0 0 10px rgba(245, 179, 66, 0.075),
          0 4px 12px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(245, 179, 66, 0.05)
        `,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `
          0 0 15px rgba(245, 179, 66, 0.125),
          0 6px 16px rgba(0, 0, 0, 0.6),
          inset 0 1px 0 rgba(245, 179, 66, 0.075)
        `;
        e.currentTarget.style.background = `
          radial-gradient(ellipse at 50% 100%, rgba(0, 227, 159, 0.08), transparent 60%),
          linear-gradient(135deg, rgba(15, 20, 18, 0.92), rgba(20, 30, 26, 0.96))
        `;
        e.currentTarget.style.borderColor = 'rgba(245, 179, 66, 0.6)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = `
          0 0 10px rgba(245, 179, 66, 0.075),
          0 4px 12px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(245, 179, 66, 0.05)
        `;
        e.currentTarget.style.background = `
          radial-gradient(ellipse at 50% 100%, rgba(0, 227, 159, 0.05), transparent 60%),
          linear-gradient(135deg, rgba(11, 15, 14, 0.88), rgba(15, 25, 22, 0.94))
        `;
        e.currentTarget.style.borderColor = 'rgba(245, 179, 66, 0.4)';
      }}
    >
      <div
        className="cursor-pointer text-xl font-semibold tracking-wide transition-all"
        onClick={() => openContext(ticker)}
        style={{
          color: '#FFFFFF',
          textShadow: `
            0 0 6px rgba(245, 179, 66, 0.3),
            0 0 12px rgba(245, 179, 66, 0.15),
            0 2px 4px rgba(0, 0, 0, 0.8)
          `,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.textShadow = `
            0 0 8px rgba(245, 179, 66, 0.4),
            0 0 16px rgba(245, 179, 66, 0.25),
            0 2px 4px rgba(0, 0, 0, 0.8)
          `;
          e.currentTarget.style.color = '#FFFFFF';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.textShadow = `
            0 0 6px rgba(245, 179, 66, 0.3),
            0 0 12px rgba(245, 179, 66, 0.15),
            0 2px 4px rgba(0, 0, 0, 0.8)
          `;
          e.currentTarget.style.color = '#FFFFFF';
        }}
      >
        {ticker}
      </div>
      <span
        className="rounded px-3 py-1.5 text-xs font-semibold"
        style={{
          border: '1px solid rgba(245, 179, 66, 0.4)',
          background: 'linear-gradient(135deg, rgba(5, 30, 25, 0.95), rgba(8, 20, 18, 0.98))',
          color: '#F5B342',
          textShadow: `
            0 0 4px rgba(245, 179, 66, 0.35),
            0 0 8px rgba(245, 179, 66, 0.15),
            0 1px 2px rgba(0, 0, 0, 0.8)
          `,
          boxShadow: `
            0 0 7px rgba(245, 179, 66, 0.1),
            0 4px 12px rgba(0, 0, 0, 0.7),
            inset 0 1px 0 rgba(245, 179, 66, 0.1)
          `,
        }}
      >
        {phase}
      </span>
      {earnings[ticker] && (
        <div className="ml-auto text-xs" style={{ color: 'rgba(245, 179, 66, 0.7)' }}>
          📊 Earnings:{' '}
          {new Date(earnings[ticker]).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )}
      {!earnings[ticker] && <div className="ml-auto text-xs text-slate-500">📊 Earnings: TBD</div>}
      <button
        onClick={() => openContext(ticker)}
        className="rounded px-2.5 py-1 text-xs font-semibold transition-all"
        style={{
          border: '1px solid rgba(245, 179, 66, 0.3)',
          background: 'rgba(245, 179, 66, 0.08)',
          color: '#F5B342',
          boxShadow: '0 0 5px rgba(245, 179, 66, 0.075), inset 0 1px 0 rgba(245, 179, 66, 0.05)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(245, 179, 66, 0.5)';
          e.currentTarget.style.background = 'rgba(245, 179, 66, 0.15)';
          e.currentTarget.style.boxShadow =
            '0 0 7px rgba(245, 179, 66, 0.125), inset 0 1px 0 rgba(245, 179, 66, 0.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(245, 179, 66, 0.3)';
          e.currentTarget.style.background = 'rgba(245, 179, 66, 0.08)';
          e.currentTarget.style.boxShadow =
            '0 0 5px rgba(245, 179, 66, 0.075), inset 0 1px 0 rgba(245, 179, 66, 0.05)';
        }}
      >
        Open
      </button>
      <button
        onClick={handleClosePosition}
        className="rounded px-2.5 py-1 text-xs font-semibold transition-all"
        style={{
          border: '1px solid rgba(239, 68, 68, 0.4)',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#EF4444',
          boxShadow: '0 0 5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(239, 68, 68, 0.075)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
          e.currentTarget.style.boxShadow =
            '0 0 7px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(239, 68, 68, 0.125)';
          e.currentTarget.style.color = '#FCA5A5';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          e.currentTarget.style.boxShadow =
            '0 0 5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(239, 68, 68, 0.075)';
          e.currentTarget.style.color = '#EF4444';
        }}
        title="Close all positions for this ticker"
      >
        ✕ Close
      </button>
    </div>
  );
};
