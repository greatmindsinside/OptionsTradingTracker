import { Icon } from '@iconify/react';
import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Input } from '@/components/ui/Input';
import { tmplRoll } from '@/models/templates';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { showError, showSuccess } from '@/stores/useToastStore';
import { useWheelStore } from '@/stores/useWheelStore';

import type { PrefillData } from './useQuickActions';

interface RollFormProps {
  type: 'put' | 'call';
  prefillData?: PrefillData;
  onClose: () => void;
}

export const RollForm: React.FC<RollFormProps> = ({ type, prefillData, onClose }) => {
  const { addRawEntries } = useEntriesStore();
  const reloadFn = useWheelStore(s => s.reloadFn);

  // Old position (pre-filled if from ExpirationRow)
  const [symbol, setSymbol] = useState(prefillData?.symbol || '');
  const [oldContracts, setOldContracts] = useState(prefillData?.oldContracts || prefillData?.contracts || 1);
  const [oldStrike, setOldStrike] = useState(prefillData?.oldStrike || prefillData?.strike || 0);
  const [oldExpiration, setOldExpiration] = useState(
    prefillData?.oldExpiration || prefillData?.expiration || new Date().toISOString().slice(0, 10)
  );
  const [closePremium, setClosePremium] = useState(prefillData?.closePremium || 0);
  const [closeFee, setCloseFee] = useState(0);

  // New position
  const [newContracts, setNewContracts] = useState(prefillData?.oldContracts || prefillData?.contracts || 1);
  const [newStrike, setNewStrike] = useState(prefillData?.oldStrike || prefillData?.strike || 0);
  const [newPremiumPerContract, setNewPremiumPerContract] = useState(0);
  const [newExpiration, setNewExpiration] = useState(() => {
    // Default to 30 days from old expiration
    const oldDate = prefillData?.oldExpiration || prefillData?.expiration || new Date().toISOString().slice(0, 10);
    const date = new Date(oldDate);
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 10);
  });
  const [openFee, setOpenFee] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // onClose is stable from Zustand store

  // Calculate roll type
  const rollType = useMemo(() => {
    if (newStrike === oldStrike) return 'same_strike';
    if (newStrike > oldStrike) return 'up_strike';
    return 'down_strike';
  }, [newStrike, oldStrike]);

  // Calculate net credit/debit
  const netCredit = useMemo(() => {
    const closeCost = closePremium > 0 ? closePremium * 100 * oldContracts : 0;
    const openCredit = newPremiumPerContract * 100 * newContracts;
    const totalFees = (closeFee || 0) + (openFee || 0);
    return openCredit - closeCost - totalFees;
  }, [closePremium, oldContracts, newPremiumPerContract, newContracts, closeFee, openFee]);

  // Validation
  const isValid = useMemo(() => {
    if (!symbol || oldContracts <= 0 || oldStrike <= 0) return false;
    if (newContracts <= 0 || newStrike <= 0 || newPremiumPerContract <= 0) return false;
    if (!newExpiration || newExpiration <= oldExpiration) return false;
    return true;
  }, [symbol, oldContracts, oldStrike, newContracts, newStrike, newPremiumPerContract, newExpiration, oldExpiration]);

  const handleSubmit = async () => {
    if (!isValid) {
      showError('Please fill in all required fields and ensure new expiration is after old expiration');
      return;
    }

    setIsSubmitting(true);

    try {
      const accountId = 'acct-1';
      const date = new Date().toISOString().slice(0, 10);

      // Generate journal entries using template
      const entries = tmplRoll({
        accountId,
        symbol: symbol.toUpperCase(),
        date,
        oldContracts,
        oldStrike,
        oldExpiration,
        closePremium: closePremium > 0 ? closePremium : undefined,
        newContracts,
        newPremiumPerContract,
        newStrike,
        newExpiration,
        closeFee: closeFee > 0 ? closeFee : undefined,
        openFee: openFee > 0 ? openFee : undefined,
        rollType,
        optionType: type,
      });

      // Add to database (single transaction)
      await addRawEntries(entries);

      // Reload wheel data
      if (reloadFn) {
        await reloadFn();
      }

      const rollTypeLabel = rollType === 'same_strike' ? 'same strike' : rollType === 'up_strike' ? 'up strike' : 'down strike';
      const netLabel = netCredit >= 0 ? 'credit' : 'debit';
      showSuccess(
        `✅ ${type === 'put' ? 'Put' : 'Call'} rolled: ${oldContracts} → ${newContracts} contracts, ${rollTypeLabel}, $${Math.abs(netCredit).toFixed(2)} ${netLabel}`
      );

      onClose();
    } catch (error) {
      console.error('Failed to record roll:', error);
      showError('Failed to record roll. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPrefilled = !!prefillData?.symbol;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="modal w-full max-w-2xl">
        <div className="modal-header">
          <h2 className="modal-title">Roll {type === 'put' ? 'Put' : 'Call'} Position</h2>
          <button className="modal-close" onClick={onClose}>
            <Icon icon="mdi:close" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Old Position Section */}
          <div className="rounded-lg border border-[rgba(245,179,66,0.2)] bg-[rgba(11,15,14,0.4)] p-4">
            <div className="mb-3 text-sm font-semibold text-[rgba(245,179,66,0.9)]">Old Position (Closing)</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Symbol"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  required
                  disabled={isPrefilled}
                />
              </div>
              <div>
                <Input
                  label="Contracts"
                  type="number"
                  min="1"
                  value={oldContracts}
                  onChange={e => setOldContracts(parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Strike Price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={oldStrike}
                  onChange={e => setOldStrike(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Expiration"
                  type="date"
                  value={oldExpiration}
                  onChange={e => setOldExpiration(e.target.value)}
                  required
                  disabled={isPrefilled}
                />
              </div>
              <div>
                <Input
                  label="Close Premium (optional)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={closePremium}
                  onChange={e => setClosePremium(parseFloat(e.target.value) || 0)}
                  placeholder="Leave 0 to let expire"
                  title="Premium paid to buy-to-close. Leave 0 to let position expire."
                />
              </div>
              <div>
                <Input
                  label="Close Fee (optional)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={closeFee}
                  onChange={e => setCloseFee(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* New Position Section */}
          <div className="rounded-lg border border-[rgba(245,179,66,0.2)] bg-[rgba(11,15,14,0.4)] p-4">
            <div className="mb-3 text-sm font-semibold text-[rgba(245,179,66,0.9)]">New Position (Opening)</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Contracts"
                  type="number"
                  min="1"
                  value={newContracts}
                  onChange={e => setNewContracts(parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Strike Price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newStrike}
                  onChange={e => setNewStrike(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Premium per Contract"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPremiumPerContract}
                  onChange={e => setNewPremiumPerContract(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Expiration"
                  type="date"
                  value={newExpiration}
                  onChange={e => setNewExpiration(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Open Fee (optional)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openFee}
                  onChange={e => setOpenFee(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-[rgba(245,179,66,0.3)] bg-[rgba(11,15,14,0.6)] p-4">
            <div className="mb-2 text-xs font-semibold tracking-wider text-[rgba(245,179,66,0.7)] uppercase">
              Roll Preview
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div>
                <span className="font-semibold">Roll Type:</span>{' '}
                <span className="text-[#F5B342]">
                  {rollType === 'same_strike' ? 'Same Strike' : rollType === 'up_strike' ? 'Up Strike' : 'Down Strike'}
                </span>
              </div>
              <div>
                Closing {oldContracts} contract{oldContracts !== 1 ? 's' : ''} @ ${oldStrike.toFixed(2)} expiring {oldExpiration}
              </div>
              <div>
                Opening {newContracts} contract{newContracts !== 1 ? 's' : ''} @ ${newStrike.toFixed(2)} expiring {newExpiration}
              </div>
              <div className="pt-2 border-t border-[rgba(245,179,66,0.2)]">
                <div className="flex items-center justify-between">
                  <span>New Premium:</span>
                  <span className="text-green-400">+${(newPremiumPerContract * 100 * newContracts).toFixed(2)}</span>
                </div>
                {closePremium > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Close Cost:</span>
                    <span className="text-red-400">-${(closePremium * 100 * oldContracts).toFixed(2)}</span>
                  </div>
                )}
                {(closeFee > 0 || openFee > 0) && (
                  <div className="flex items-center justify-between">
                    <span>Fees:</span>
                    <span className="text-red-400">-${((closeFee || 0) + (openFee || 0)).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 text-base font-semibold">
                  <span>Net {netCredit >= 0 ? 'Credit' : 'Debit'}:</span>
                  <span className={netCredit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    ${Math.abs(netCredit).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} fullWidth disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              fullWidth
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? 'Rolling...' : 'Roll Position'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

