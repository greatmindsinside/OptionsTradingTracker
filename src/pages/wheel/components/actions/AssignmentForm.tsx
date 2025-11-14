import { Icon } from '@iconify/react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { SymbolInput } from '@/components/SymbolInput';
import { Input } from '@/components/ui/Input';
import { tmplCallAssigned, tmplPutAssigned } from '@/models/templates';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { showError, showSuccess } from '@/stores/useToastStore';
import { useWheelStore } from '@/stores/useWheelStore';

import type { PrefillData } from './useQuickActions';

interface AssignmentFormProps {
  type: 'put' | 'call';
  prefillData?: PrefillData;
  onClose: () => void;
}

export const AssignmentForm: React.FC<AssignmentFormProps> = ({ type, prefillData, onClose }) => {
  const { addRawEntries } = useEntriesStore();
  const reloadFn = useWheelStore(s => s.reloadFn);

  const [symbol, setSymbol] = useState(prefillData?.symbol || '');
  const [contracts, setContracts] = useState(prefillData?.contracts || 1);
  const [strike, setStrike] = useState(prefillData?.strike || 0);
  const [expiration, setExpiration] = useState(
    prefillData?.expiration || new Date().toISOString().slice(0, 10)
  );
  const [fee, setFee] = useState(0);
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

  const totalShares = contracts * 100;
  const totalCost = strike * totalShares;

  const handleSubmit = async () => {
    if (!symbol || contracts <= 0 || strike <= 0) {
      showError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const accountId = 'acct-1';
      const date = new Date().toISOString().slice(0, 10);

      // Generate journal entries using template
      const template = type === 'put' ? tmplPutAssigned : tmplCallAssigned;
      const entries = template({
        accountId,
        symbol: symbol.toUpperCase(),
        date,
        contracts,
        strike,
        expiration,
        fee: fee > 0 ? fee : undefined,
      });

      // Add to database
      await addRawEntries(entries);

      // Reload wheel data
      if (reloadFn) {
        await reloadFn();
      }

      const action = type === 'put' ? 'acquired' : 'called away';
      showSuccess(
        `✅ ${type === 'put' ? 'Put' : 'Call'} assignment recorded: ${totalShares} ${symbol.toUpperCase()} shares ${action} at $${strike.toFixed(2)}`
      );

      onClose();
    } catch (error) {
      console.error('Failed to record assignment:', error);
      showError('Failed to record assignment. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="modal w-full max-w-md">
        <div className="modal-header">
          <h2 className="modal-title">
            {type === 'put' ? 'Record Put Assignment' : 'Record Call Assignment'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <Icon icon="mdi:close" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <SymbolInput
              label="Symbol"
              value={symbol}
              onChange={value => setSymbol(value.toUpperCase())}
              placeholder="e.g. AAPL"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Contracts"
                type="number"
                min="1"
                value={contracts}
                onChange={e => setContracts(parseInt(e.target.value) || 0)}
                required
              />
            </div>
            <div>
              <Input
                label="Strike Price"
                type="number"
                step="0.01"
                min="0"
                value={strike}
                onChange={e => setStrike(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Expiration"
                type="date"
                value={expiration}
                onChange={e => setExpiration(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Fee (optional)"
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={e => setFee(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-[rgba(245,179,66,0.3)] bg-[rgba(11,15,14,0.6)] p-4">
            <div className="mb-2 text-xs font-semibold tracking-wider text-[rgba(245,179,66,0.7)] uppercase">
              Preview
            </div>
            <div className="space-y-1 text-sm text-slate-300">
              <div>
                {contracts} contract{contracts !== 1 ? 's' : ''} × 100 shares = {totalShares} shares
              </div>
              <div>
                {type === 'put' ? 'Bought' : 'Sold'} at ${strike.toFixed(2)} per share
              </div>
              <div className="pt-2 text-base font-semibold text-[#F5B342]">
                Total: ${totalCost.toFixed(2)}
              </div>
              {fee > 0 && <div className="text-xs text-slate-500">Fee: ${fee.toFixed(2)}</div>}
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
              disabled={isSubmitting || !symbol || contracts <= 0 || strike <= 0}
            >
              {isSubmitting ? 'Recording...' : 'Record Assignment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
