import { Icon } from '@iconify/react';
import React, { useEffect, useRef } from 'react';

import { type QuickActionType, useQuickActions } from './useQuickActions';

interface QuickActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({ isOpen, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { openForm } = useQuickActions();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // onClose is stable (memoized with useCallback in parent)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close from FAB click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId); // Clean up timeout
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // onClose is stable (memoized with useCallback in parent)

  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'assignPut',
      label: 'Assign Put → Shares',
      description: 'Record put assignment (acquired shares)',
      icon: 'mdi:arrow-down-bold-circle',
      color: 'text-emerald-400',
    },
    {
      id: 'assignCall',
      label: 'Assign Call → Away',
      description: 'Record call assignment (shares called away)',
      icon: 'mdi:arrow-up-bold-circle',
      color: 'text-amber-400',
    },
    {
      id: 'buyShares',
      label: 'Buy Shares Directly',
      description: 'Record direct share purchase',
      icon: 'mdi:cart-plus',
      color: 'text-blue-400',
    },
    {
      id: 'sellShares',
      label: 'Sell Shares Directly',
      description: 'Record direct share sale',
      icon: 'mdi:cart-minus',
      color: 'text-red-400',
    },
  ];

  const handleMenuItemClick = (actionId: string) => {
    openForm(actionId as QuickActionType);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed right-6 bottom-24 z-[101] w-72 overflow-hidden rounded-xl border border-[rgba(245,179,66,0.3)] bg-[rgba(11,15,14,0.95)] shadow-[0_0_60px_-20px_rgba(245,179,66,0.125),0_24px_72px_rgba(0,0,0,0.95)] backdrop-blur-[32px]"
      style={{
        animation: 'fadeInUp 0.2s ease-out',
      }}
    >
      <div className="border-b border-[rgba(245,179,66,0.2)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:lightning-bolt" className="h-5 w-5 text-[#F5B342]" />
          <span className="text-sm font-semibold text-[#F5B342]">Quick Actions</span>
        </div>
      </div>

      <div className="py-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleMenuItemClick(item.id)}
            className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(245,179,66,0.08)] hover:shadow-[0_0_5px_rgba(245,179,66,0.075)]"
          >
            <Icon icon={item.icon} className={`h-5 w-5 ${item.color} flex-shrink-0`} />
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium text-[rgba(245,179,66,0.9)] group-hover:text-[#F5B342]">
                {item.label}
              </div>
              <div className="text-xs text-slate-500">{item.description}</div>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
