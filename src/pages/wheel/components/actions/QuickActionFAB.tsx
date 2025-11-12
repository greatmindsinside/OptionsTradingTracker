import { Icon } from '@iconify/react';
import React, { useCallback, useState } from 'react';

import { AssignmentForm } from './AssignmentForm';
import { QuickActionsMenu } from './QuickActionsMenu';
import { RollForm } from './RollForm';
import { ShareTransactionForm } from './ShareTransactionForm';
import { useQuickActions } from './useQuickActions';

export const QuickActionFAB: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isOpen, activeForm, prefillData, closeForm } = useQuickActions();

  const handleFABClick = () => {
    setMenuOpen(!menuOpen);
  };

  // Memoize onClose to prevent inline function recreation
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleFABClick}
        className="group fixed right-6 bottom-6 z-100 flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(245,179,66,0.4)] bg-[rgba(245,179,66,0.15)] shadow-[0_0_20px_rgba(245,179,66,0.15),0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-all hover:border-[rgba(245,179,66,0.6)] hover:bg-[rgba(245,179,66,0.25)] hover:shadow-[0_0_30px_rgba(245,179,66,0.25),0_12px_48px_rgba(0,0,0,0.9)] active:scale-95"
        aria-label="Quick Actions"
        title="Quick Actions"
      >
        <Icon
          icon={menuOpen ? 'mdi:close' : 'mdi:plus'}
          className="h-7 w-7 text-[#F5B342] transition-transform group-hover:scale-110"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(245, 179, 66, 0.3))',
          }}
        />
      </button>

      {/* Quick Actions Menu */}
      <QuickActionsMenu isOpen={menuOpen} onClose={handleMenuClose} />

      {/* Modal Forms */}
      {isOpen && activeForm === 'assignPut' && (
        <AssignmentForm type="put" prefillData={prefillData} onClose={closeForm} />
      )}
      {isOpen && activeForm === 'assignCall' && (
        <AssignmentForm type="call" prefillData={prefillData} onClose={closeForm} />
      )}
      {isOpen && activeForm === 'buyShares' && (
        <ShareTransactionForm type="buy" prefillData={prefillData} onClose={closeForm} />
      )}
      {isOpen && activeForm === 'sellShares' && (
        <ShareTransactionForm type="sell" prefillData={prefillData} onClose={closeForm} />
      )}
      {isOpen && activeForm === 'rollPut' && (
        <RollForm type="put" prefillData={prefillData} onClose={closeForm} />
      )}
      {isOpen && activeForm === 'rollCall' && (
        <RollForm type="call" prefillData={prefillData} onClose={closeForm} />
      )}
    </>
  );
};
