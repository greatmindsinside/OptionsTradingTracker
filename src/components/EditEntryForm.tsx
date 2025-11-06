import React, { useEffect,useState } from 'react';

import { Button } from '@/components/Button';
import type { Entry } from '@/types/entry';

interface EditEntryFormProps {
  entry: Entry | null;
  onSave: (updates: Partial<Entry>, reason: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * EditEntryForm - Form for editing journal entries
 * Allows editing key fields and requires a reason for the audit trail
 */
export const EditEntryForm: React.FC<EditEntryFormProps> = ({ entry, onSave, onCancel }) => {
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<Record<string, unknown>>({});

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setAmount(entry.amount || 0);
      setNotes(entry.notes || '');
      setReason('');
      // Parse meta if it's a JSON string or object
      if (entry.meta) {
        if (typeof entry.meta === 'string') {
          try {
            setMeta(JSON.parse(entry.meta));
          } catch {
            setMeta({});
          }
        } else if (typeof entry.meta === 'object') {
          setMeta(entry.meta);
        } else {
          setMeta({});
        }
      } else {
        setMeta({});
      }
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry) return;

    if (!reason.trim()) {
      alert('Please provide a reason for this edit (required for audit trail)');
      return;
    }

    setLoading(true);
    try {
      const updates: Partial<Entry> = {
        amount,
        notes,
        ...(Object.keys(meta).length > 0 ? { meta } : {}),
      };

      await onSave(updates, reason);
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  const isCredit = amount > 0;
  const isDebit = amount < 0;

  // Helper functions for meta fields
  const getMetaValue = (key: string): number | null => {
    const value = meta[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  const setMetaValue = (key: string, value: number | null) => {
    setMeta(prev => {
      const next = { ...prev };
      if (value === null || value === undefined || isNaN(value)) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  // Calculate DTE
  const calculateDTE = (date: string | null, expiration: string | null): number | null => {
    if (!date || !expiration) return null;
    const d1 = new Date(date);
    const d2 = new Date(expiration);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    const diff = d2.getTime() - d1.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  const dte = calculateDTE(entry.ts || null, entry.expiration || null);

  // Calculate derived metrics
  const premiumPerDay = dte && dte > 0 && amount && isCredit 
    ? (amount / dte).toFixed(2) 
    : null;
  
  const breakeven = entry.strike && amount && entry.qty
    ? (() => {
        const premiumPerContract = Math.abs(amount) / (entry.qty || 1);
        const isPut = entry.type === 'sell_to_open' || entry.type === 'buy_to_close';
        return isPut 
          ? (entry.strike - premiumPerContract).toFixed(2)
          : (entry.strike + premiumPerContract).toFixed(2);
      })()
    : null;

  return (
    <div className="space-y-6">
      {/* Entry Summary Card */}
      <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-green-400 uppercase">📊 Entry Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Symbol:</span>
            <span className="font-semibold text-zinc-300">{entry.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Date:</span>
            <span className="text-zinc-300">{entry.ts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Type:</span>
            <span className="text-zinc-300">{entry.type.replace(/_/g, ' ')}</span>
          </div>
          {entry.strike && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Strike:</span>
              <span className="text-zinc-300">${entry.strike.toFixed(2)}</span>
            </div>
          )}
          {entry.qty && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Quantity:</span>
              <span className="text-zinc-300">{entry.qty}</span>
            </div>
          )}
        </div>
      </div>

      {/* Amount Card */}
      <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
        <label className="mb-3 block text-sm font-semibold tracking-wide text-green-400 uppercase">💰 Amount</label>
        <div>
          <input
            type="number"
            step="0.01"
            value={amount === 0 ? '' : amount.toString()}
            onChange={e => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
            className={`w-full rounded-lg border bg-zinc-900/60 px-4 py-3 text-lg font-bold placeholder:text-zinc-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
              isCredit
                ? 'border-green-500/50 text-green-400 focus:border-green-400'
                : isDebit
                ? 'border-red-500/50 text-red-400 focus:border-red-400'
                : 'border-green-500/30 text-green-400 focus:border-green-400'
            }`}
            placeholder="0.00"
          />
        </div>
        <p className={`mt-2 text-xs ${
          isCredit ? 'text-green-400/80' : isDebit ? 'text-red-400/80' : 'text-zinc-500'
        }`}>
          {isCredit ? 'Credit adds to your cash' : isDebit ? 'Debit reduces your cash' : 'Enter the net cash flow'}
        </p>
      </div>

      {/* Options Analytics Card */}
      <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-green-400 uppercase">📊 Options Analytics</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-200">Delta</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              value={getMetaValue('delta') ?? ''}
              onChange={e => setMetaValue('delta', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="e.g., 0.30"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Option delta (e.g., 0.30 for 30-delta)</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-200">IV Rank</label>
            <input
              type="number"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              value={getMetaValue('iv_rank') ?? ''}
              onChange={e => setMetaValue('iv_rank', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="e.g., 45"
            />
            <p className="mt-1 text-[11px] text-zinc-500">IV Rank (0-100)</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-200">IV Percentile</label>
            <input
              type="number"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              value={getMetaValue('iv_percentile') ?? ''}
              onChange={e => setMetaValue('iv_percentile', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="e.g., 75"
            />
            <p className="mt-1 text-[11px] text-zinc-500">IV Percentile (0-100)</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-200">Commission/Fees</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              value={getMetaValue('commission') ?? ''}
              onChange={e => setMetaValue('commission', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="e.g., 0.65"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Broker commissions/fees</p>
          </div>
        </div>
        
        {/* Calculated Metrics Display */}
        {(dte !== null || premiumPerDay || breakeven) && (
          <div className="mt-4 rounded-lg border border-zinc-700/50 bg-zinc-900/40 p-3">
            <h4 className="mb-2 text-xs font-semibold text-zinc-300 uppercase">Calculated Metrics</h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {dte !== null && (
                <div>
                  <span className="text-zinc-500">DTE:</span>
                  <span className="ml-2 font-semibold text-zinc-300">{dte} days</span>
                </div>
              )}
              {premiumPerDay && (
                <div>
                  <span className="text-zinc-500">Premium/Day:</span>
                  <span className="ml-2 font-semibold text-green-400">${premiumPerDay}</span>
                </div>
              )}
              {breakeven && (
                <div>
                  <span className="text-zinc-500">Breakeven:</span>
                  <span className="ml-2 font-semibold text-zinc-300">${breakeven}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes Card */}
      <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
        <label className="mb-3 block text-sm font-semibold tracking-wide text-green-400 uppercase">📝 Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes about this entry..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          rows={3}
        />
      </div>

      {/* Edit Reason Card - Amber Warning */}
      <div className="rounded-2xl border border-amber-700/50 bg-linear-to-br from-amber-950/30 to-black/80 p-5 shadow-lg shadow-amber-500/20 backdrop-blur-xl">
        <label className="mb-3 block text-sm font-semibold tracking-wide text-amber-400 uppercase">
          ⚠️ Edit Reason (Required) *
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explain why this entry is being edited (for audit trail)..."
          className="w-full rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-amber-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          rows={3}
        />
        <p className="mt-2 text-xs text-amber-500">
          This edit will create a new entry and soft-delete the original for audit purposes.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};
