import { Icon } from '@iconify/react';
import React, { useMemo } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';
import type { ExpRow } from '@/types/wheel';
import { addDaysToYmd, daysTo } from '@/utils/wheel-calculations';

import { ExpirationRow } from './ExpirationRow';
import { useExpirationSort } from './useExpirationSort';

export const ExpirationsCard: React.FC = () => {
  const positions = useWheelStore(s => s.positions);
  const rows: ExpRow[] = useMemo(
    () => {
      const result = positions.map(p => {
        const calculatedExpiration = addDaysToYmd(p.opened, p.dte);

        // Debug logging to track date calculation
        if (process.env.NODE_ENV === 'development') {
          console.log('[ExpirationsCard] Position expiration calculation:', {
            id: p.id,
            ticker: p.ticker,
            strike: p.strike,
            opened: p.opened,
            dte: p.dte,
            calculatedExpiration,
          });
        }

        return {
          id: p.id,
          symbol: p.ticker,
          type: p.type,
          strike: p.strike,
          expiration: calculatedExpiration,
          side: p.side,
          qty: p.qty,
        };
      });
      return result;
    },
    [positions]
  );
  const sorted = useExpirationSort(rows);
  const filtered = sorted.filter(row => daysTo(row.expiration) >= 0);

  return (
    <div className="glass-card-deep rounded-2xl p-4">
      <div className="mb-2 flex items-center gap-2 font-semibold text-slate-100">
        <Icon icon="fluent:timer-24-filled" className="h-4 w-4" style={{ color: '#F5B342' }} />
        Upcoming Expirations
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-4 text-center text-sm text-slate-500">No upcoming expirations</div>
        )}
        {filtered.map(row => (
          <ExpirationRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
};
