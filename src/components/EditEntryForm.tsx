import React, { useEffect, useState } from 'react';

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
  const [amountInput, setAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [deltaInput, setDeltaInput] = useState<string>('');
  const [ivRankInput, setIvRankInput] = useState<string>('');
  const [ivPercentileInput, setIvPercentileInput] = useState<string>('');
  const [commissionInput, setCommissionInput] = useState<string>('');

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setAmount(entry.amount || 0);
      setAmountInput(
        entry.amount !== null && entry.amount !== undefined ? String(entry.amount) : ''
      );
      setNotes(entry.notes || '');
      setReason('');
      // Parse meta if it's a JSON string or object
      let parsedMeta: Record<string, unknown> = {};
      if (entry.meta) {
        if (typeof entry.meta === 'string') {
          try {
            parsedMeta = JSON.parse(entry.meta);
          } catch {
            parsedMeta = {};
          }
        } else if (typeof entry.meta === 'object') {
          parsedMeta = entry.meta;
        }
      }
      setMeta(parsedMeta);

      // Initialize meta field inputs
      setDeltaInput(
        parsedMeta.delta !== null && parsedMeta.delta !== undefined ? String(parsedMeta.delta) : ''
      );
      setIvRankInput(
        parsedMeta.iv_rank !== null && parsedMeta.iv_rank !== undefined
          ? String(parsedMeta.iv_rank)
          : ''
      );
      setIvPercentileInput(
        parsedMeta.iv_percentile !== null && parsedMeta.iv_percentile !== undefined
          ? String(parsedMeta.iv_percentile)
          : ''
      );
      setCommissionInput(
        parsedMeta.commission !== null && parsedMeta.commission !== undefined
          ? String(parsedMeta.commission)
          : ''
      );
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
  const premiumPerDay = dte && dte > 0 && amount && isCredit ? (amount / dte).toFixed(2) : null;

  const breakeven =
    entry.strike && amount && entry.qty
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
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-green-400 uppercase">
          📊 Entry Details
        </h3>
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
        <label className="mb-3 block text-sm font-semibold tracking-wide text-green-400 uppercase">
          💰 Amount
        </label>
        <div>
          <input
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={e => {
              const val = e.target.value;
              setAmountInput(val);
              if (val === '') {
                setAmount(0);
              } else {
                const num = parseFloat(val);
                setAmount(isNaN(num) ? 0 : num);
              }
            }}
            onBlur={e => {
              const val = e.target.value.trim();
              if (val === '') {
                setAmountInput('0');
                setAmount(0);
              } else {
                const num = parseFloat(val);
                if (isNaN(num)) {
                  setAmountInput(amount !== null && amount !== undefined ? String(amount) : '0');
                } else {
                  setAmountInput(String(num));
                  setAmount(num);
                }
              }
            }}
            className={`w-full rounded-lg border bg-zinc-900/60 px-4 py-3 text-lg font-bold placeholder:text-zinc-500/50 focus:ring-2 focus:ring-green-500/30 focus:outline-none ${
              isCredit
                ? 'border-green-500/50 text-green-400 focus:border-green-400'
                : isDebit
                  ? 'border-red-500/50 text-red-400 focus:border-red-400'
                  : 'border-green-500/30 text-green-400 focus:border-green-400'
            }`}
            placeholder="0.00"
          />
        </div>
        <p
          className={`mt-2 text-xs ${
            isCredit ? 'text-green-400/80' : isDebit ? 'text-red-400/80' : 'text-zinc-500'
          }`}
        >
          {isCredit
            ? 'Credit adds to your cash'
            : isDebit
              ? 'Debit reduces your cash'
              : 'Enter the net cash flow'}
        </p>
      </div>

      {/* Options Analytics Card */}
      <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-green-400 uppercase">
          📊 Options Analytics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-200">Delta</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
              value={deltaInput}
              onChange={e => {
                const val = e.target.value;
                setDeltaInput(val);
                if (val === '') {
                  setMetaValue('delta', null);
                } else {
                  const num = parseFloat(val);
                  setMetaValue('delta', isNaN(num) ? null : num);
                }
              }}
              onBlur={e => {
                const val = e.target.value.trim();
                if (val === '') {
                  setDeltaInput('');
                  setMetaValue('delta', null);
                } else {
                  const num = parseFloat(val);
                  if (isNaN(num)) {
                    setDeltaInput(
                      getMetaValue('delta') !== null ? String(getMetaValue('delta')) : ''
                    );
                  } else {
                    setDeltaInput(String(num));
                    setMetaValue('delta', num);
                  }
                }
              }}
              placeholder="e.g., 0.30"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Option delta (e.g., 0.30 for 30-delta)</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-200">IV Rank</label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
              value={ivRankInput}
              onChange={e => {
                const val = e.target.value;
                setIvRankInput(val);
                if (val === '') {
                  setMetaValue('iv_rank', null);
                } else {
                  const num = parseFloat(val);
                  setMetaValue('iv_rank', isNaN(num) ? null : num);
                }
              }}
              onBlur={e => {
                const val = e.target.value.trim();
                if (val === '') {
                  setIvRankInput('');
                  setMetaValue('iv_rank', null);
                } else {
                  const num = parseFloat(val);
                  if (isNaN(num)) {
                    setIvRankInput(
                      getMetaValue('iv_rank') !== null ? String(getMetaValue('iv_rank')) : ''
                    );
                  } else {
                    setIvRankInput(String(num));
                    setMetaValue('iv_rank', num);
                  }
                }
              }}
              placeholder="e.g., 45"
            />
            <p className="mt-1 text-[11px] text-zinc-500">IV Rank (0-100)</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-200">IV Percentile</label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
              value={ivPercentileInput}
              onChange={e => {
                const val = e.target.value;
                setIvPercentileInput(val);
                if (val === '') {
                  setMetaValue('iv_percentile', null);
                } else {
                  const num = parseFloat(val);
                  setMetaValue('iv_percentile', isNaN(num) ? null : num);
                }
              }}
              onBlur={e => {
                const val = e.target.value.trim();
                if (val === '') {
                  setIvPercentileInput('');
                  setMetaValue('iv_percentile', null);
                } else {
                  const num = parseFloat(val);
                  if (isNaN(num)) {
                    setIvPercentileInput(
                      getMetaValue('iv_percentile') !== null
                        ? String(getMetaValue('iv_percentile'))
                        : ''
                    );
                  } else {
                    setIvPercentileInput(String(num));
                    setMetaValue('iv_percentile', num);
                  }
                }
              }}
              placeholder="e.g., 75"
            />
            <p className="mt-1 text-[11px] text-zinc-500">IV Percentile (0-100)</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-200">Commission/Fees</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
              value={commissionInput}
              onChange={e => {
                const val = e.target.value;
                setCommissionInput(val);
                if (val === '') {
                  setMetaValue('commission', null);
                } else {
                  const num = parseFloat(val);
                  setMetaValue('commission', isNaN(num) ? null : num);
                }
              }}
              onBlur={e => {
                const val = e.target.value.trim();
                if (val === '') {
                  setCommissionInput('');
                  setMetaValue('commission', null);
                } else {
                  const num = parseFloat(val);
                  if (isNaN(num)) {
                    setCommissionInput(
                      getMetaValue('commission') !== null ? String(getMetaValue('commission')) : ''
                    );
                  } else {
                    setCommissionInput(String(num));
                    setMetaValue('commission', num);
                  }
                }
              }}
              placeholder="e.g., 0.65"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Broker commissions/fees</p>
          </div>
        </div>

        {/* Calculated Metrics Display */}
        {(dte !== null || premiumPerDay || breakeven) && (
          <div className="mt-4 rounded-lg border border-zinc-700/50 bg-zinc-900/40 p-3">
            <h4 className="mb-2 text-xs font-semibold text-zinc-300 uppercase">
              Calculated Metrics
            </h4>
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
        <label className="mb-3 block text-sm font-semibold tracking-wide text-green-400 uppercase">
          📝 Notes
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes about this entry..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
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
          className="w-full rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-amber-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
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
