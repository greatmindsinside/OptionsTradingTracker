import { Icon } from '@iconify/react';
import React, { useMemo, useState } from 'react';

import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { all } from '@/db/sql';
import { useQuickActions } from '@/pages/wheel/components/actions/useQuickActions';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useWheelStore } from '@/stores/useWheelStore';
import type { Entry } from '@/types/entry';
import type { ExpRow } from '@/types/wheel';
import { daysTo, fmt } from '@/utils/wheel-calculations';

import { InlineDateEdit } from './InlineDateEdit';

export const ExpirationRow: React.FC<{ row: ExpRow }> = ({ row }) => {
  const updateExpiration = useWheelStore(s => s.updateExpiration);
  const { openForm } = useQuickActions();
  const { deleteEntry } = useEntriesStore();
  const reloadFn = useWheelStore(s => s.reloadFn);
  const lots = useWheelStore(s => s.lots);
  const positions = useWheelStore(s => s.positions);
  const d = daysTo(row.expiration);
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Find the position to get entry (premium) price
  const position = useMemo(() => {
    return positions.find(p => p.id === row.id);
  }, [positions, row.id]);

  // Calculate average cost for the ticker
  const avgCost = useMemo(() => {
    const tickerLots = lots.filter(l => l.ticker === row.symbol);
    if (tickerLots.length === 0) return 0;
    const totalShares = tickerLots.reduce((sum, l) => sum + l.qty, 0);
    const totalCost = tickerLots.reduce((sum, l) => sum + l.qty * l.cost, 0);
    return totalShares > 0 ? totalCost / totalShares : 0;
  }, [lots, row.symbol]);

  // Calculate profit/loss for covered calls
  const profitLoss = useMemo(() => {
    // Only calculate for Call + Sell positions where shares exist
    if (row.type !== 'C' || row.side !== 'S' || avgCost === 0 || !position) return null;

    const premiumPerShare = position.entry; // entry is already per share
    const minimumStrike = avgCost - premiumPerShare;
    const isProfitable = row.strike >= minimumStrike;

    // Calculate profit/loss amount: (Strike - Average Cost + Premium) * Contracts * 100
    const profitLossAmount = (row.strike - avgCost + premiumPerShare) * row.qty * 100;

    return {
      isProfitable,
      amount: profitLossAmount,
      minimumStrike,
    };
  }, [row.type, row.side, row.strike, row.qty, avgCost, position]);

  // Determine urgency styling
  const isUrgent = d === 0;
  const isWarning = d <= 7 && d > 0;

  // Show Assign button for options expiring soon (DTE ≤ 3)
  const showAssignButton = d <= 3 && d >= 0;

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete position for ${row.symbol} ${row.type} ${row.strike} expiring ${row.expiration}?\n\n` +
        `This will soft-delete all journal entries for this position.\n` +
        `Entries can be restored from the Journal page's Deleted tab.`
    );

    if (!confirmed) return;

    try {
      // Extract YYYY-MM-DD from expiration date (handle both ISO strings and YYYY-MM-DD)
      const expDate = row.expiration.includes('T') ? row.expiration.slice(0, 10) : row.expiration;

      // Query database for all entries matching this position
      // The position ID is constructed as: ${symbol}_${strike}_${expiration}
      // But expiration in DB might be ISO format while row.expiration is YYYY-MM-DD
      // So we query by symbol and strike, and match expiration dates flexibly
      const mainEntriesSql = `
        SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration,
               underlying_price, notes, meta
        FROM journal
        WHERE symbol = ?
          AND strike = ?
          AND expiration IS NOT NULL
          AND expiration != ''
          AND (
            substr(expiration, 1, 10) = ?
            OR expiration LIKE ?
            OR datetime(substr(expiration, 1, 10)) = datetime(?)
          )
          AND (deleted_at IS NULL OR deleted_at = '')
      `;
      const expDatePattern = `${expDate}%`; // Match any expiration starting with this date
      const mainEntries = await all<Entry>(mainEntriesSql, [
        row.symbol,
        row.strike,
        expDate,
        expDatePattern,
        expDate,
      ]);

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[Delete Debug]', {
          symbol: row.symbol,
          strike: row.strike,
          expiration: row.expiration,
          expDate,
          foundEntries: mainEntries.length,
          entryTypes: mainEntries.map(e => e.type),
        });
      }

      // Find the sell_to_open entry to get its date for matching fee entries
      const sellToOpenEntry = mainEntries.find(
        e => e.type === 'sell_to_open' || e.type === 'option_premium'
      );
      const positionDate = sellToOpenEntry?.ts ? sellToOpenEntry.ts.slice(0, 10) : expDate;

      // Find related fee entries (same symbol, same date, no strike/expiration)
      const feeEntriesSql = `
        SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration,
               underlying_price, notes, meta
        FROM journal
        WHERE symbol = ?
          AND type = 'fee'
          AND substr(ts, 1, 10) = ?
          AND (strike IS NULL OR strike = 0)
          AND (expiration IS NULL OR expiration = '')
          AND (deleted_at IS NULL OR deleted_at = '')
      `;
      const feeEntries = await all<Entry>(feeEntriesSql, [row.symbol, positionDate]);

      // Combine all entries
      let positionEntries = [...mainEntries, ...feeEntries];

      // If no entries found, try a broader search by symbol and strike only
      // (in case expiration date doesn't match exactly)
      if (positionEntries.length === 0) {
        console.warn('[Delete] No entries found with expiration date, trying broader search...');
        const fallbackSql = `
          SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration,
                 underlying_price, notes, meta
          FROM journal
          WHERE symbol = ?
            AND strike = ?
            AND expiration IS NOT NULL
            AND expiration != ''
            AND (deleted_at IS NULL OR deleted_at = '')
          ORDER BY datetime(ts) DESC
        `;
        const fallbackEntries = await all<Entry>(fallbackSql, [row.symbol, row.strike]);

        if (fallbackEntries.length > 0) {
          // Use the most recent entry's date for fee matching
          const mostRecentEntry = fallbackEntries[0];
          if (!mostRecentEntry) {
            console.error('[Delete] No entries in fallback results');
            return;
          }
          const fallbackDate = mostRecentEntry.ts ? mostRecentEntry.ts.slice(0, 10) : expDate;

          const fallbackFeeEntries = await all<Entry>(
            `SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration,
                    underlying_price, notes, meta
             FROM journal
             WHERE symbol = ?
               AND type = 'fee'
               AND substr(ts, 1, 10) = ?
               AND (strike IS NULL OR strike = 0)
               AND (expiration IS NULL OR expiration = '')
               AND (deleted_at IS NULL OR deleted_at = '')`,
            [row.symbol, fallbackDate]
          );

          positionEntries = [...fallbackEntries, ...fallbackFeeEntries];
          console.log('[Delete] Found entries with fallback search:', positionEntries.length);
        }
      }

      if (positionEntries.length === 0) {
        alert(
          `No entries found for ${row.symbol} ${row.type} ${row.strike} expiring ${row.expiration}.\n\n` +
            `This position may have already been deleted or the entries may not exist in the database.`
        );
        return;
      }

      // Delete all entries for this position
      for (const entry of positionEntries) {
        await deleteEntry(entry.id, `Position deleted for ${row.symbol} ${row.type} ${row.strike}`);
      }

      // Save database after all deletions
      await import('@/db/sql').then(({ saveDb }) => saveDb());

      // Reload wheel data to reflect changes
      if (reloadFn) {
        await reloadFn();
      } else {
        // Fallback: reload the page if reloadFn is not available
        window.location.reload();
      }

      alert(
        `Successfully deleted ${positionEntries.length} entries for ${row.symbol} ${row.type} ${row.strike}`
      );
    } catch (err) {
      console.error('Delete error:', err);
      alert(`Failed to delete position: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div
      className="flex items-center gap-3 rounded-lg p-3 backdrop-blur-sm transition-all"
      style={{
        border: isUrgent
          ? '1px solid rgba(239, 68, 68, 0.5)'
          : isWarning
            ? '1px solid rgba(251, 146, 60, 0.4)'
            : '1px solid rgba(245, 179, 66, 0.3)',
        background: isUrgent
          ? `radial-gradient(ellipse at 50% 100%, rgba(239, 68, 68, 0.08), transparent 60%), linear-gradient(135deg, rgba(30, 8, 8, 0.88), rgba(20, 5, 5, 0.94))`
          : isWarning
            ? `radial-gradient(ellipse at 50% 100%, rgba(251, 146, 60, 0.06), transparent 60%), linear-gradient(135deg, rgba(25, 15, 10, 0.88), rgba(18, 12, 8, 0.94))`
            : `radial-gradient(ellipse at 50% 100%, rgba(0, 227, 159, 0.05), transparent 60%), linear-gradient(135deg, rgba(11, 15, 14, 0.88), rgba(15, 25, 22, 0.94))`,
        boxShadow: isUrgent
          ? '0 0 7px rgba(239, 68, 68, 0.1), 0 4px 12px rgba(0, 0, 0, 0.5)'
          : isWarning
            ? '0 0 6px rgba(251, 146, 60, 0.075), 0 4px 12px rgba(0, 0, 0, 0.5)'
            : '0 0 6px rgba(245, 179, 66, 0.06), 0 4px 12px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        className="font-semibold"
        style={{
          color: '#FFFFFF',
          textShadow: `
            0 0 5px rgba(245, 179, 66, 0.25),
            0 0 10px rgba(245, 179, 66, 0.125),
            0 2px 4px rgba(0, 0, 0, 0.8)
          `,
        }}
      >
        {row.symbol}
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-slate-500">
          {row.type} {row.strike}
        </div>
        {profitLoss && (
          <span
            className="rounded px-1.5 py-0.5 text-xs font-semibold"
            style={{
              border: profitLoss.isProfitable
                ? '1px solid rgba(34, 197, 94, 0.5)'
                : '1px solid rgba(239, 68, 68, 0.5)',
              background: profitLoss.isProfitable
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              color: profitLoss.isProfitable ? '#22C55E' : '#EF4444',
            }}
            title={
              profitLoss.isProfitable
                ? `Profit if assigned: $${fmt(Math.abs(profitLoss.amount), 2)} | Min Strike: $${fmt(profitLoss.minimumStrike, 2)} | Calculation: (Strike $${fmt(row.strike, 2)} - Avg Cost $${fmt(avgCost, 2)} + Premium $${fmt(position?.entry || 0, 2)}) × ${row.qty} contracts`
                : `Loss if assigned: $${fmt(Math.abs(profitLoss.amount), 2)} | Min Strike: $${fmt(profitLoss.minimumStrike, 2)} | Calculation: (Strike $${fmt(row.strike, 2)} - Avg Cost $${fmt(avgCost, 2)} + Premium $${fmt(position?.entry || 0, 2)}) × ${row.qty} contracts`
            }
          >
            {profitLoss.isProfitable ? '✓' : '⚠'} {profitLoss.isProfitable ? 'Profit' : 'Loss'} if
            assigned: ${fmt(Math.abs(profitLoss.amount), 2)}
          </span>
        )}
      </div>
      <div
        className="rounded px-2 py-1 text-xs font-medium"
        style={{
          border: isUrgent
            ? '1px solid rgba(239, 68, 68, 0.5)'
            : isWarning
              ? '1px solid rgba(251, 146, 60, 0.4)'
              : '1px solid rgba(245, 179, 66, 0.4)',
          background: isUrgent
            ? 'linear-gradient(135deg, rgba(30, 8, 8, 0.95), rgba(25, 6, 6, 0.98))'
            : isWarning
              ? 'linear-gradient(135deg, rgba(25, 15, 10, 0.95), rgba(20, 12, 8, 0.98))'
              : 'linear-gradient(135deg, rgba(5, 30, 25, 0.95), rgba(8, 20, 18, 0.98))',
          color: isUrgent ? '#EF4444' : isWarning ? '#FB923C' : '#F5B342',
          textShadow: isUrgent
            ? '0 0 4px rgba(239, 68, 68, 0.3), 0 1px 2px rgba(0, 0, 0, 0.8)'
            : isWarning
              ? '0 0 4px rgba(251, 146, 60, 0.3), 0 1px 2px rgba(0, 0, 0, 0.8)'
              : '0 0 4px rgba(245, 179, 66, 0.3), 0 1px 2px rgba(0, 0, 0, 0.8)',
          boxShadow: isUrgent
            ? '0 0 6px rgba(239, 68, 68, 0.1)'
            : isWarning
              ? '0 0 5px rgba(251, 146, 60, 0.075)'
              : '0 0 5px rgba(245, 179, 66, 0.075)',
        }}
      >
        {row.expiration} · DTE {Math.max(0, d)}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {isEditingDate ? (
          <InlineDateEdit
            date={row.expiration}
            isEditing={true}
            onSave={ymd => {
              updateExpiration(row.id, ymd, row.expiration);
              setIsEditingDate(false);
            }}
            onCancel={() => setIsEditingDate(false)}
          />
        ) : (
          <>
            {showAssignButton && (
              <button
                className="rounded px-2 py-1 text-xs font-semibold transition-all"
                style={{
                  border: '1px solid rgba(251, 146, 60, 0.4)',
                  background: 'rgba(251, 146, 60, 0.1)',
                  color: '#FB923C',
                  boxShadow: '0 0 4px rgba(251, 146, 60, 0.08)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.6)';
                  e.currentTarget.style.background = 'rgba(251, 146, 60, 0.18)';
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(251, 146, 60, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.4)';
                  e.currentTarget.style.background = 'rgba(251, 146, 60, 0.1)';
                  e.currentTarget.style.boxShadow = '0 0 4px rgba(251, 146, 60, 0.08)';
                }}
                onClick={() => {
                  const formType = row.type === 'P' ? 'assignPut' : 'assignCall';
                  openForm(formType, {
                    symbol: row.symbol,
                    contracts: row.qty,
                    strike: row.strike,
                    expiration: row.expiration,
                  });
                }}
                title="Record assignment (option expires in ≤3 days)"
              >
                Assign
              </button>
            )}
            <div className="relative z-10">
              <DropdownMenu
                align="right"
                className="[&>button]:flex! [&>button]:min-w-0! [&>button]:items-center! [&>button]:gap-1! [&>button]:rounded! [&>button]:border! [&>button]:border-[rgba(245,179,66,0.3)]! [&>button]:bg-[rgba(245,179,66,0.08)]! [&>button]:px-1.5! [&>button]:py-0.5! [&>button]:text-xs! [&>button]:font-semibold! [&>button]:text-[#F5B342]! [&>button]:shadow-[0_0_4px_rgba(245,179,66,0.06)]! [&>button]:transition-all! [&>button]:hover:border-[rgba(245,179,66,0.5)]! [&>button]:hover:bg-[rgba(245,179,66,0.15)]! [&>button]:hover:shadow-[0_0_6px_rgba(245,179,66,0.1)]! [&>button_svg:last-child]:hidden!"
                trigger={<Icon icon="mdi:dots-vertical" className="h-4 w-4" />}
                items={[
                  {
                    label: 'Edit',
                    onClick: () => setIsEditingDate(true),
                  },
                  {
                    label: 'Plan Roll',
                    onClick: () => {
                      const formType = row.type === 'P' ? 'rollPut' : 'rollCall';
                      openForm(formType, {
                        symbol: row.symbol,
                        oldContracts: row.qty,
                        oldStrike: row.strike,
                        oldExpiration: row.expiration,
                      });
                    },
                  },
                  {
                    divider: true,
                  },
                  {
                    label: 'Delete',
                    onClick: handleDelete,
                  },
                ]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
