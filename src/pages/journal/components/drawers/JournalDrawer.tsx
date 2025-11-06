import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Input } from '@/components/ui/Input';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useJournalUIStore } from '@/stores/useJournalUIStore';
import type { Entry, TradeType } from '@/types/entry';
import { EntrySchema, TradeTypeSchema } from '@/types/entry';
import { track } from '@/utils/telemetry';

function toYmd(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function fromYmd(ymd: string): string | null {
  if (!ymd) return null;
  const d = new Date(ymd);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function calculateDTE(date: string | null, expiration: string | null): number | null {
  if (!date || !expiration) return null;
  const d1 = new Date(date);
  const d2 = new Date(expiration);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const diff = d2.getTime() - d1.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export const JournalDrawer: React.FC = () => {
  const open = useJournalUIStore(s => s.editOpen);
  const close = useJournalUIStore(s => s.closeEdit);
  const entry = useJournalUIStore(s => s.selected);
  const editEntry = useEntriesStore(s => s.editEntry);

  const [form, setForm] = useState<Partial<Entry>>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form from selected entry
  useEffect(() => {
    if (entry) {
      // Parse meta if it's a JSON string from the database
      let parsedMeta: Record<string, unknown> | undefined;
      if (entry.meta) {
        if (typeof entry.meta === 'string') {
          try {
            parsedMeta = JSON.parse(entry.meta);
          } catch {
            parsedMeta = undefined;
          }
        } else {
          parsedMeta = entry.meta;
        }
      }

      setForm({
        id: entry.id,
        ts: entry.ts,
        account_id: entry.account_id,
        symbol: entry.symbol,
        type: entry.type,
        qty: entry.qty,
        amount: entry.amount,
        strike: entry.strike,
        expiration: entry.expiration,
        underlying_price: entry.underlying_price,
        notes: entry.notes ?? '',
        meta: parsedMeta,
      });
      setReason('');
      if (open) track('journal_edit_open', { id: entry.id, symbol: entry.symbol, type: entry.type });
    }
  }, [entry, open]);

  // Auto-calculate or reset amount when type/inputs change
  useEffect(() => {
    const type = form.type;
    const qty = form.qty;
    const strike = form.strike;

    // If no type selected, leave as is
    if (!type) return;

    let nextAmount = 0; // default to 0 when not calculable

    if (type === 'assignment_shares' || type === 'share_sale') {
      if (qty && qty > 0 && strike && strike > 0) {
        // For share-related types, qty represents shares (not contracts).
        // Cash flow = strike * shares, rounded to cents.
        const base = Math.round(strike * qty * 100) / 100;
        nextAmount = type === 'assignment_shares' ? -base : base;
      } else {
        nextAmount = 0; // missing inputs → reset to zero
      }
    } else {
      // Non-calculable types should not inherit previous computed amounts
      nextAmount = 0;
    }

    if (form.amount !== nextAmount) {
      setForm(f => ({ ...f, amount: nextAmount }));
    }
  }, [form.type, form.qty, form.strike, form.amount]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        track('journal_edit_close', { id: entry?.id });
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close, entry?.id]);

  const disabled = !open;

  const handleSave = async () => {
    if (!entry) return;
    if (!reason.trim()) {
      alert('An edit reason is required.');
      return;
    }

    // Build updates with proper null handling
    const updates: Partial<Entry> = {
      ts: form.ts,
      account_id: form.account_id,
      symbol: (form.symbol || '').toUpperCase(),
      type: form.type as TradeType,
  qty: form.qty === undefined || form.qty === null || (form.qty as unknown) === '' ? null : Number(form.qty),
      amount: form.amount === undefined ? entry.amount : Number(form.amount),
      strike:
        form.strike === undefined || form.strike === null || (form.strike as unknown) === ''
          ? null
          : Number(form.strike),
      expiration: form.expiration || null,
      underlying_price:
        form.underlying_price === undefined ||
        form.underlying_price === null ||
        (form.underlying_price as unknown) === ''
          ? null
          : Number(form.underlying_price),
      notes: (form.notes ?? '') as string,
      // Only include meta if it's a valid object
      ...(form.meta && typeof form.meta === 'object' ? { meta: form.meta } : {}),
    };

    // Coerce date inputs
    if (updates.ts && updates.ts.length === 10) updates.ts = fromYmd(updates.ts) || updates.ts;
    if (updates.expiration && updates.expiration.length === 10)
      updates.expiration = fromYmd(updates.expiration) || updates.expiration;

    // Validate a full entry by merging with original
    const candidate = { ...entry, ...updates } as Entry;
    const parsed = EntrySchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Unknown validation error';
      alert(`Fix validation error: ${msg}`);
      return;
    }

    setSaving(true);
    try {
      await editEntry(entry.id, updates, reason);
      track('journal_edit_save', { id: entry.id, updates: Object.keys(updates) });
      close();
    } catch (err) {
      track('journal_edit_error', { id: entry.id, error: String(err) });
      alert(`Failed to save changes: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const onOverlayClick = () => {
    track('journal_edit_close', { id: entry?.id });
    close();
  };

  // Type options
  const typeOptions = useMemo(() => (TradeTypeSchema.options as string[]).map(t => ({ value: t, label: t.replaceAll('_', ' ') })), []);

  // Calculate DTE
  const dte = calculateDTE(form.ts || entry?.ts || null, form.expiration || entry?.expiration || null);
  
  // Amount sign helper
  const isCredit = (form.amount ?? 0) > 0;
  const isDebit = (form.amount ?? 0) < 0;

  // Helper functions for meta fields
  const getMetaValue = (key: string): number | null => {
    if (!form.meta || typeof form.meta !== 'object') return null;
    const value = form.meta[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  const setMetaValue = (key: string, value: number | null) => {
    setForm(f => {
      const meta = f.meta && typeof f.meta === 'object' ? { ...f.meta } : {};
      if (value === null || value === undefined || isNaN(value)) {
        delete meta[key];
      } else {
        meta[key] = value;
      }
      return { ...f, meta: Object.keys(meta).length > 0 ? meta : undefined };
    });
  };

  // Calculate derived metrics
  const premiumPerDay = dte && dte > 0 && form.amount && isCredit 
    ? (form.amount / dte).toFixed(2) 
    : null;
  
  const breakeven = form.strike && form.amount && form.qty
    ? (() => {
        const premiumPerContract = Math.abs(form.amount) / (form.qty || 1);
        const isPut = form.type === 'sell_to_open' || form.type === 'buy_to_close';
        return isPut 
          ? (form.strike - premiumPerContract).toFixed(2)
          : (form.strike + premiumPerContract).toFixed(2);
      })()
    : null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40" aria-modal role="dialog" aria-labelledby="journal-edit-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onOverlayClick} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-3xl border-l border-green-500/30 bg-zinc-950/95 shadow-2xl shadow-green-500/20 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 p-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="journal-edit-title" className="text-base font-semibold text-emerald-400">
              Edit Entry
            </h2>
            <button 
              onClick={onOverlayClick} 
              className="rounded-lg px-2.5 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Close"
            >
              Close
            </button>
          </div>
          
          {/* Pills and Meta */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              {form.symbol || entry?.symbol || '—'}
            </div>
            <div className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
              {(form.type || entry?.type || '').replaceAll('_', ' ')}
            </div>
            <div className="ml-auto flex gap-1.5 text-xs text-zinc-500">
              <span>{toYmd(form.ts || entry?.ts || '')}</span>
              {(form.expiration || entry?.expiration) && (
                <>
                  <span>→</span>
                  <span>{toYmd(form.expiration || entry?.expiration || '')}</span>
                  {dte !== null && <span className="text-zinc-400">({dte}d)</span>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Body: Single Column Layout */}
        <div className="p-3 space-y-6">
          <div className="space-y-6">
            {/* Entry Identity Card */}
            <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-green-400 uppercase">📊 Entry Identity</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input 
                    label="Symbol" 
                    value={form.symbol ?? entry?.symbol ?? ''} 
                    onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} 
                    disabled={disabled} 
                    placeholder="e.g., AAPL, SPY" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-200">Type</label>
                  <select
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={(form.type as string) ?? entry?.type ?? ''}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as TradeType }))}
                    disabled={disabled}
                  >
                    {typeOptions.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Input 
                    label="Account" 
                    value={form.account_id ?? entry?.account_id ?? ''} 
                    onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} 
                    disabled={disabled} 
                    placeholder="e.g., Main-Brokerage" 
                  />
                </div>
              </div>
            </div>

            {/* Contract Details Card */}
            <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-green-400 uppercase">📋 Contract Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-200">
                    {form.type === 'assignment_shares' || form.type === 'share_sale' ? 'Shares' : 'Contracts'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={form.qty === null || form.qty === undefined ? '' : String(form.qty)}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        setForm(f => ({ ...f, qty: null }));
                      } else {
                        const num = Number(val);
                        if (!isNaN(num) && num >= 0 && num <= 999) {
                          setForm(f => ({ ...f, qty: num }));
                        }
                      }
                    }}
                    disabled={disabled}
                    placeholder={form.type === 'assignment_shares' || form.type === 'share_sale' ? 'e.g., 100' : 'e.g., 1'}
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">Number of {form.type === 'assignment_shares' || form.type === 'share_sale' ? 'shares' : 'option contracts'}</p>
                </div>
                
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-200">Strike</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={(form.strike ?? entry?.strike ?? '') as number | string}
                    onChange={e => setForm(f => ({ ...f, strike: e.target.value === '' ? null : Number(e.target.value) }))}
                    disabled={disabled}
                    placeholder="e.g., 170.00"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-200">Expiration Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={toYmd(form.expiration ?? entry?.expiration ?? null)}
                    onChange={e => setForm(f => ({ ...f, expiration: e.target.value ? e.target.value : null }))}
                    disabled={disabled}
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">Options contract expiration</p>
                </div>
              </div>
            </div>

            {/* Market Context Card */}
            <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-green-400 uppercase">📅 Market Context</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input 
                    label="Trade Date" 
                    type="date" 
                    value={toYmd(form.ts || entry?.ts || '')} 
                    onChange={e => setForm(f => ({ ...f, ts: e.target.value }))} 
                    disabled={disabled} 
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">When the trade was executed</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-200">Underlying Price</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={(form.underlying_price ?? entry?.underlying_price ?? '') as number | string}
                    onChange={e => setForm(f => ({ ...f, underlying_price: e.target.value === '' ? null : Number(e.target.value) }))}
                    disabled={disabled}
                    placeholder="e.g., 172.50"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">Stock price when you entered the trade</p>
                </div>
              </div>
            </div>

            {/* Money Card */}
            <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-green-400 uppercase">💰 Money</h3>
                {(form.type === 'assignment_shares' || form.type === 'share_sale') && form.qty && form.strike && (
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">✓ Auto-calculated</span>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-200">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={String(form.amount ?? entry?.amount ?? 0)}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value === '' ? 0 : Number(e.target.value) }))}
                  disabled={disabled}
                  placeholder="0.00"
                  className={`w-full rounded-lg border bg-zinc-900/60 px-4 py-3 text-lg font-bold placeholder:text-zinc-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
                    isCredit
                      ? 'border-green-500/50 text-green-400 focus:border-green-400'
                      : isDebit
                      ? 'border-red-500/50 text-red-400 focus:border-red-400'
                      : 'border-green-500/30 text-green-400 focus:border-green-400'
                  }`}
                />
                <p className={`mt-2 text-xs ${
                  isCredit ? 'text-green-400/80' : isDebit ? 'text-red-400/80' : 'text-zinc-500'
                }`}>
                  {isCredit ? 'Credit adds to your cash' : isDebit ? 'Debit reduces your cash' : 'Enter the net cash flow'}
                </p>
              </div>
            </div>

            {/* Options Analytics Card */}
            <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-green-400 uppercase">📊 Options Analytics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-200">Delta</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={getMetaValue('delta') ?? ''}
                    onChange={e => setMetaValue('delta', e.target.value === '' ? null : Number(e.target.value))}
                    disabled={disabled}
                    placeholder="e.g., 0.30"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">Option delta (e.g., 0.30 for 30-delta)</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-200">IV Rank</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={getMetaValue('iv_rank') ?? ''}
                    onChange={e => setMetaValue('iv_rank', e.target.value === '' ? null : Number(e.target.value))}
                    disabled={disabled}
                    placeholder="e.g., 45"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">IV Rank (0-100)</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-200">IV Percentile</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={getMetaValue('iv_percentile') ?? ''}
                    onChange={e => setMetaValue('iv_percentile', e.target.value === '' ? null : Number(e.target.value))}
                    disabled={disabled}
                    placeholder="e.g., 75"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">IV Percentile (0-100)</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-200">Commission/Fees</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={getMetaValue('commission') ?? ''}
                    onChange={e => setMetaValue('commission', e.target.value === '' ? null : Number(e.target.value))}
                    disabled={disabled}
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
          </div>

          {/* Bottom (Full Width): Notes & Reason Card */}
          <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-5 shadow-lg shadow-green-500/20 backdrop-blur-xl">
            <h3 className="mb-4 text-sm font-semibold tracking-wide text-green-400 uppercase">📝 Notes & Reason</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-200">Notes</label>
                <textarea
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[100px]"
                  value={(form.notes as string) ?? (entry?.notes ?? '')}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g., Sold 30-delta put, IV Rank 45%, earnings next week"
                  disabled={disabled}
                />
              </div>
              <div className="rounded-lg border border-amber-700/50 bg-linear-to-br from-amber-950/30 to-black/80 p-4">
                <label className="mb-2 block text-xs font-medium text-amber-400">⚠️ Edit Reason (required)</label>
                <textarea
                  className="w-full rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-amber-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 min-h-[100px]"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g., Correcting strike price from broker statement"
                />
                <p className="mt-2 text-[11px] text-amber-500">Creates a new corrected entry and soft-deletes the original.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 p-3 backdrop-blur-sm">
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onOverlayClick} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
