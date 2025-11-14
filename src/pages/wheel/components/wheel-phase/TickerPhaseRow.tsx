import { Icon } from '@iconify/react';
import React, { useMemo } from 'react';

import { DropdownMenu, type DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { all } from '@/db/sql';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import type { Entry } from '@/types/entry';
import { fmt } from '@/utils/wheel-calculations';

import { usePhaseCalculation } from './usePhaseCalculation';

export const TickerPhaseRow: React.FC<{ ticker: string }> = ({ ticker }) => {
  const { phase } = usePhaseCalculation(ticker);
  const openContext = useWheelUIStore(s => s.openContext);
  const openActions = useWheelUIStore(s => s.openActions);
  const { deleteEntry } = useEntriesStore();
  const reloadFn = useWheelStore(s => s.reloadFn);
  const lots = useWheelStore(s => s.lots);
  const positions = useWheelStore(s => s.positions);

  // Calculate average cost for the ticker
  const avgCost = useMemo(() => {
    const tickerLots = lots.filter(l => l.ticker === ticker);
    if (tickerLots.length === 0) return 0;
    const totalShares = tickerLots.reduce((sum, l) => sum + l.qty, 0);
    const totalCost = tickerLots.reduce((sum, l) => sum + l.qty * l.cost, 0);
    return totalShares > 0 ? totalCost / totalShares : 0;
  }, [lots, ticker]);

  // Calculate minimum strike and check if current calls are profitable
  const minStrikeInfo = useMemo(() => {
    // Calculate for phases where we have shares (Sell Covered Calls or Call Expires Worthless)
    if ((phase !== 'Sell Covered Calls' && phase !== 'Call Expires Worthless') || avgCost === 0)
      return null;

    const shortCalls = positions.filter(
      p => p.ticker === ticker && p.type === 'C' && p.side === 'S'
    );

    if (shortCalls.length === 0) {
      // No calls yet - minimum strike depends on premium received
      // Without premium, we can't calculate exact minimum strike
      // Show average cost as reference (minimum strike will be lower than this)
      return {
        minimumStrike: avgCost,
        hasOpenCalls: false,
        allProfitable: true,
        anyProfitable: true,
        note: 'Based on avg cost (premium will lower min strike)',
      };
    }

    // Calculate average premium per share from open calls
    const totalPremium = shortCalls.reduce((sum, p) => sum + p.entry * p.qty, 0);
    const totalContracts = shortCalls.reduce((sum, p) => sum + p.qty, 0);
    const avgPremiumPerShare = totalContracts > 0 ? totalPremium / totalContracts : 0;

    const minimumStrike = avgCost - avgPremiumPerShare;

    // Check if all/any calls are profitable
    const profitableCalls = shortCalls.filter(p => p.strike >= minimumStrike);
    const allProfitable = profitableCalls.length === shortCalls.length;
    const anyProfitable = profitableCalls.length > 0;

    return {
      minimumStrike,
      hasOpenCalls: true,
      allProfitable,
      anyProfitable,
      openCallsCount: shortCalls.length,
    };
  }, [phase, avgCost, positions, ticker]);

  // Determine action button based on phase
  const getPhaseAction = () => {
    switch (phase) {
      case 'Sell Cash Secured Puts':
      case 'Put Expires Worthless':
        return { label: 'Sell Put', action: () => openActions('Trade') };
      case 'Call Expires Worthless':
      case 'Sell Covered Calls':
        return { label: 'Sell Call', action: () => openActions('Trade') };
      default:
        return null;
    }
  };

  const phaseAction = getPhaseAction();

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
      className="flex min-w-0 items-center gap-2 rounded-xl backdrop-blur-sm transition-all hover:-translate-y-0.5"
      style={{
        border: '1px solid rgba(245, 179, 66, 0.4)',
        background: `
          radial-gradient(ellipse at 50% 100%, rgba(0, 227, 159, 0.05), transparent 60%),
          linear-gradient(135deg, rgba(11, 15, 14, 0.88), rgba(15, 25, 22, 0.94))
        `,
        padding: '0.75rem',
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
        className="cursor-pointer text-base font-semibold tracking-wide transition-all"
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
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="rounded px-2 py-1 text-xs font-semibold"
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
        {minStrikeInfo && (
          <span
            className="rounded px-2 py-1 text-xs font-semibold"
            style={{
              border: minStrikeInfo.allProfitable
                ? '1px solid rgba(34, 197, 94, 0.5)'
                : minStrikeInfo.anyProfitable
                  ? '1px solid rgba(251, 146, 60, 0.5)'
                  : '1px solid rgba(239, 68, 68, 0.5)',
              background: minStrikeInfo.allProfitable
                ? 'rgba(34, 197, 94, 0.15)'
                : minStrikeInfo.anyProfitable
                  ? 'rgba(251, 146, 60, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
              color: minStrikeInfo.allProfitable
                ? '#22C55E'
                : minStrikeInfo.anyProfitable
                  ? '#FB923C'
                  : '#EF4444',
            }}
            title={
              minStrikeInfo.hasOpenCalls
                ? `Min Strike: $${fmt(minStrikeInfo.minimumStrike, 2)} | Avg Cost: $${fmt(avgCost, 2)} | ${minStrikeInfo.openCallsCount} call${minStrikeInfo.openCallsCount > 1 ? 's' : ''} ${minStrikeInfo.allProfitable ? 'all profitable' : minStrikeInfo.anyProfitable ? 'some profitable' : 'all losing'}`
                : `Avg Cost: $${fmt(avgCost, 2)} | Min Strike will be lower than avg cost (depends on premium received)`
            }
          >
            {minStrikeInfo.allProfitable ? '✓' : minStrikeInfo.anyProfitable ? '⚠' : '⚠'} Min
            Strike: ${fmt(minStrikeInfo.minimumStrike, 2)}
          </span>
        )}
      </div>
      <div className="relative z-10 ml-auto">
        <DropdownMenu
          align="right"
          className="[&>button]:flex! [&>button]:min-w-0! [&>button]:items-center! [&>button]:gap-1! [&>button]:rounded! [&>button]:border! [&>button]:border-[rgba(245,179,66,0.3)]! [&>button]:bg-[rgba(245,179,66,0.08)]! [&>button]:px-1.5! [&>button]:py-0.5! [&>button]:text-xs! [&>button]:font-semibold! [&>button]:text-[#F5B342]! [&>button]:shadow-[0_0_4px_rgba(245,179,66,0.06)]! [&>button]:transition-all! [&>button]:hover:border-[rgba(245,179,66,0.5)]! [&>button]:hover:bg-[rgba(245,179,66,0.15)]! [&>button]:hover:shadow-[0_0_6px_rgba(245,179,66,0.1)]! [&>button_svg:last-child]:hidden!"
          trigger={<Icon icon="mdi:dots-vertical" className="h-4 w-4" />}
          items={[
            ...(phaseAction
              ? [
                  {
                    label: phaseAction.label,
                    onClick: phaseAction.action,
                  } as DropdownMenuItem,
                ]
              : []),
            {
              label: 'View',
              onClick: () => openContext(ticker),
            },
            {
              divider: true,
            },
            {
              label: 'Close Position',
              onClick: handleClosePosition,
            },
            {
              label: 'Delete',
              onClick: handleClosePosition,
            },
          ]}
        />
      </div>
    </div>
  );
};
