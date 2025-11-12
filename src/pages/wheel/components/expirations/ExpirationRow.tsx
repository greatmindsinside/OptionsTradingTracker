import { Icon } from '@iconify/react';
import React, { useState } from 'react';

import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { useQuickActions } from '@/pages/wheel/components/actions/useQuickActions';
import { useWheelStore } from '@/stores/useWheelStore';
import type { ExpRow } from '@/types/wheel';
import { daysTo } from '@/utils/wheel-calculations';

import { InlineDateEdit } from './InlineDateEdit';

export const ExpirationRow: React.FC<{ row: ExpRow }> = ({ row }) => {
  const updateExpiration = useWheelStore(s => s.updateExpiration);
  const { openForm } = useQuickActions();
  const d = daysTo(row.expiration);
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Determine urgency styling
  const isUrgent = d === 0;
  const isWarning = d <= 7 && d > 0;

  // Show Assign button for options expiring soon (DTE ≤ 3)
  const showAssignButton = d <= 3 && d >= 0;

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
      <div className="text-xs text-slate-500">
        {row.type} {row.strike}
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
        {row.expiration} · DTE {d}
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
                className="[&>button]:rounded! [&>button]:px-1.5! [&>button]:py-0.5! [&>button]:text-xs! [&>button]:font-semibold! [&>button]:transition-all! [&>button]:border! [&>button]:border-[rgba(245,179,66,0.3)]! [&>button]:bg-[rgba(245,179,66,0.08)]! [&>button]:text-[#F5B342]! [&>button]:shadow-[0_0_4px_rgba(245,179,66,0.06)]! [&>button]:hover:border-[rgba(245,179,66,0.5)]! [&>button]:hover:bg-[rgba(245,179,66,0.15)]! [&>button]:hover:shadow-[0_0_6px_rgba(245,179,66,0.1)]! [&>button]:flex! [&>button]:items-center! [&>button]:gap-1! [&>button]:min-w-0! [&>button_svg:last-child]:hidden!"
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
                ]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
