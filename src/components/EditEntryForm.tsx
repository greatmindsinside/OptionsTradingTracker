import React, { useState, useEffect } from 'react';
import type { Entry } from '@/types/entry';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/Button';

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

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setAmount(entry.amount || 0);
      setNotes(entry.notes || '');
      setReason('');
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
      };

      await onSave(updates, reason);
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-zinc-400">Entry Details</h3>
        <div className="space-y-1 text-sm">
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
            <span className="text-zinc-300">{entry.type}</span>
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

      <Input
        label="Amount"
        type="number"
        step="0.01"
        value={amount}
        onChange={e => setAmount(Number(e.target.value))}
      />

      <Input
        label="Notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Optional notes..."
      />

      <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-4">
        <label className="mb-2 block text-sm font-medium text-amber-400">
          Edit Reason (Required) *
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explain why this entry is being edited (for audit trail)..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          rows={3}
        />
        <p className="mt-1 text-xs text-amber-500">
          This edit will create a new entry and soft-delete the original for audit purposes.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
