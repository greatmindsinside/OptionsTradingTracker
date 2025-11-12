/**
 * TradeTab Component
 *
 * PURPOSE:
 * Form interface for adding new option trades to the journal. Handles both sell-to-open
 * (premium collection) and buy-to-close (position closure) trades for puts and calls.
 *
 * HOW IT WORKS:
 * - Uses useTradeComposer hook to manage form state (symbol, type, side, qty, strike, premium, DTE, fees)
 * - Supports two DTE input modes: date picker (feature flag) or numeric DTE input
 * - Validates form data before submission
 * - Creates entries in both in-memory journal (useJournal) and database (useEntriesStore)
 * - Uses entry templates (tmplSellPut, tmplSellCoveredCall, tmplFee) for database persistence
 * - Reloads wheel data after successful submission to update UI
 *
 * INTERACTIONS:
 * - Parent: ActionsDrawer (rendered when actionsTab === 'Trade')
 * - Form state: useTradeComposer hook (manages all form fields)
 * - Data persistence: useJournal (in-memory), useEntriesStore (database via templates)
 * - Data refresh: useWheelStore.reloadFn (reloads wheel calculations after trade added)
 * - UI state: useWheelUIStore.closeActions (closes drawer after successful submission)
 * - Telemetry: track() function for analytics (trade_add_success, trade_add_error, etc.)
 *
 * DATA FLOW:
 * 1. User fills form → useTradeComposer manages state
 * 2. User clicks "Add Trade" → handleAddTrade() validates and submits
 * 3. Entry created in useJournal (in-memory) for immediate UI updates
 * 4. Entry persisted to database via useEntriesStore.addEntry() with appropriate template
 * 5. useWheelStore.reloadFn() called → recalculates positions, lots, metrics
 * 6. Drawer closes → UI updates with new trade data
 *
 * FEATURES:
 * - DTE input: Can use date picker (if feature flag enabled) or numeric DTE
 * - Advanced DTE: Toggle to manually enter DTE number when using date picker
 * - Fee estimation: Shows typical fee calculation ($0.70/contract)
 * - Preview: Real-time preview of trade being entered
 * - Validation: Warns if past date selected for expiration
 */

import React, { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useTradeComposer } from '@/pages/wheel/hooks/useTradeComposer';
import { useJournal } from '@/store/journal';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import type { OptType } from '@/types/wheel';
import { calcDTE, dateFromDTE, isValidYmd } from '@/utils/dates';
import { env } from '@/utils/env';
import { track } from '@/utils/telemetry';
import { fmt } from '@/utils/wheel-calculations';

export const TradeTab: React.FC = () => {
  const { form, submitTrade, resetForm } = useTradeComposer();
  const { add: addJournal } = useJournal();
  const { addEntry } = useEntriesStore();
  const closeActions = useWheelUIStore(s => s.closeActions);
  const reloadFn = useWheelStore(s => s.reloadFn);

  // Feature: DTE via date picker with advanced numeric input
  const featureDteUi = env.features.tradeDTE;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expYmd, setExpYmd] = useState<string>(() => dateFromDTE(form.tradeDTE));
  const dteFromExp = useMemo(() => calcDTE(expYmd), [expYmd]);

  // Keep expiration and DTE in sync bi-directionally
  useEffect(() => {
    // If DTE changes (e.g., via Advanced input), recompute expiration
    setExpYmd(dateFromDTE(form.tradeDTE));
  }, [form.tradeDTE]);

  const handleAddTrade = async () => {
    try {
      submitTrade();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Invalid form');
      return;
    }

    if (!form.tradeSym) return;

    const S = form.tradeSym.toUpperCase();
    const todayDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const whenIso = new Date().toISOString();

    // Calculate expiration date: prefer explicit date from UI when feature is enabled
    const expiration = (() => {
      if (featureDteUi && isValidYmd(expYmd)) return expYmd;
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + form.tradeDTE);
      return fallback.toISOString().slice(0, 10);
    })();

    // Warn if past date chosen
    if (featureDteUi && dteFromExp < 0) {
      track('trade_dte_past_date_warn', { exp: expYmd, dte: dteFromExp });
      const ok = window.confirm(
        'The selected expiration date is in the past. Do you want to continue?'
      );
      if (!ok) return;
    }

    try {
      // Update in-memory journal (for WheelModern compatibility)
      if (form.tradeSide === 'S') {
        const journalEntry = {
          kind: (form.tradeType === 'P'
            ? 'sell_put'
            : 'sell_call') as import('@/store/journal').JournalKind,
          symbol: S,
          contracts: form.tradeQty,
          strike: form.tradeStrike,
          premium: form.tradeEntry,
          dte: form.tradeDTE,
          fees: form.tradeFees || undefined,
          type: form.tradeType,
          side: form.tradeSide,
          when: whenIso,
        };
        addJournal(journalEntry);
      } else {
        const journalEntry = {
          kind: 'buy_close' as import('@/store/journal').JournalKind,
          symbol: S,
          contracts: form.tradeQty,
          strike: form.tradeStrike,
          premium: form.tradeEntry,
          fees: form.tradeFees || undefined,
          type: form.tradeType,
          side: form.tradeSide,
          when: whenIso,
        };
        addJournal(journalEntry);
      }

      // Persist to database (updates both Journal and Wheel pages)
      const base = { accountId: 'acct-1', symbol: S, date: todayDate };

      if (form.tradeSide === 'S' && form.tradeType === 'P') {
        await addEntry('tmplSellPut', {
          ...base,
          contracts: form.tradeQty,
          premiumPerContract: form.tradeEntry,
          strike: form.tradeStrike,
          expiration,
          fee: form.tradeFees,
        });
      } else if (form.tradeSide === 'S' && form.tradeType === 'C') {
        await addEntry('tmplSellCoveredCall', {
          ...base,
          contracts: form.tradeQty,
          premiumPerContract: form.tradeEntry,
          strike: form.tradeStrike,
          expiration,
          fee: form.tradeFees,
        });
      } else if (form.tradeSide === 'B' && form.tradeType === 'P') {
        // Buy to close put - use fee template for now or create new template
        await addEntry('tmplFee', {
          ...base,
          amount: -(form.tradeQty * form.tradeEntry * 100) - form.tradeFees,
        });
      } else {
        // Buy to close call
        await addEntry('tmplFee', {
          ...base,
          amount: -(form.tradeQty * form.tradeEntry * 100) - form.tradeFees,
        });
      }

      // Reset form, close drawer, and show success
      resetForm();
      closeActions();

      // Reload wheel data from database
      if (reloadFn) {
        await reloadFn();
        const msg = `✅ Trade added: ${form.tradeSide === 'S' ? 'Sell' : 'Buy'} ${form.tradeQty} ${form.tradeType} ${S} $${form.tradeStrike}`;
        alert(msg);
        track('trade_add_success', {
          symbol: S,
          side: form.tradeSide,
          type: form.tradeType,
          qty: form.tradeQty,
          strike: form.tradeStrike,
          dte: featureDteUi ? dteFromExp : form.tradeDTE,
          expiration,
        });
      } else {
        // Fallback to page reload if reload function not available
        const msg = `✅ Trade added: ${form.tradeSide === 'S' ? 'Sell' : 'Buy'} ${form.tradeQty} ${form.tradeType} ${S} $${form.tradeStrike}`;
        alert(msg);
        track('trade_add_success', {
          symbol: S,
          side: form.tradeSide,
          type: form.tradeType,
          qty: form.tradeQty,
          strike: form.tradeStrike,
          dte: featureDteUi ? dteFromExp : form.tradeDTE,
          expiration,
        });
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to add trade to database:', err);
      alert('❌ Failed to save trade to database. Check console for details.');
      track('trade_add_error', { error: String(err) });
    }
  };

  return (
    <div className="space-y-3" data-testid="drawer.trade">
      <div className="mt-2 grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-2">
          <Input
            label="Symbol"
            value={form.tradeSym}
            onChange={e => form.setTradeSym(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Select
              label="Type"
              value={form.tradeType}
              onChange={e => form.setTradeType(e.target.value as OptType)}
              options={[
                { value: 'P', label: 'Put' },
                { value: 'C', label: 'Call' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Select
              label="Side"
              value={form.tradeSide}
              onChange={e => form.setTradeSide(e.target.value as 'S' | 'B')}
              options={[
                { value: 'S', label: 'Sell' },
                { value: 'B', label: 'Buy' },
              ]}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Input
              label="Qty"
              type="number"
              value={form.tradeQty || ''}
              onChange={e => form.setTradeQty(e.target.value === '' ? 0 : parseInt(e.target.value))}
            />
          </div>
          {featureDteUi ? (
            <div className="flex flex-col gap-2">
              <Input
                label="Expiration"
                type="date"
                value={expYmd}
                onChange={e => {
                  const ymd = e.target.value;
                  setExpYmd(ymd);
                  const next = calcDTE(ymd);
                  form.setTradeDTE(next);
                  track('trade_dte_date_change', { exp: ymd, dte: next });
                }}
              />
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div>
                  DTE: <span className="font-medium text-zinc-300">{Math.max(0, dteFromExp)}</span>
                  {dteFromExp < 0 && (
                    <span className="ml-2 text-red-400">Past date selected</span>
                  )}
                </div>
                <button
                  type="button"
                  className="text-emerald-400 hover:text-emerald-300"
                  onClick={() => {
                    const next = !showAdvanced;
                    setShowAdvanced(next);
                    track('trade_dte_toggle_advanced', { enabled: next });
                  }}
                >
                  {showAdvanced ? 'Hide Advanced' : 'Advanced'}
                </button>
              </div>
              {showAdvanced && (
                <Input
                  label="DTE (advanced)"
                  type="number"
                  value={form.tradeDTE || ''}
                  onChange={e => {
                    const v = e.target.value === '' ? 0 : parseInt(e.target.value);
                    form.setTradeDTE(v);
                    setExpYmd(dateFromDTE(v));
                  }}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                label="DTE"
                type="number"
                value={form.tradeDTE || ''}
                onChange={e => form.setTradeDTE(e.target.value === '' ? 0 : parseInt(e.target.value))}
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Input
              label="Strike"
              type="number"
              step="any"
              value={form.tradeStrike || ''}
              onChange={e =>
                form.setTradeStrike(e.target.value === '' ? 0 : parseFloat(e.target.value))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-500">
              Premium <span className="text-zinc-400">(per share)</span>
              <span
                className="ml-2 text-zinc-600"
                title="Enter the premium received per share (not per contract or total amount)"
              >
                ⓘ
              </span>
            </label>
            <Input
              type="number"
              step=".01"
              value={form.tradeEntry || ''}
              onChange={e =>
                form.setTradeEntry(e.target.value === '' ? 0 : parseFloat(e.target.value))
              }
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500">
            Fees (optional)
            <span className="ml-2 font-normal text-zinc-600">
              ≈ ${(form.tradeQty * 0.7).toFixed(2)} typical
            </span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={form.tradeFees || ''}
            onChange={e =>
              form.setTradeFees(e.target.value === '' ? 0 : parseFloat(e.target.value))
            }
            placeholder={`≈ ${(form.tradeQty * 0.7).toFixed(2)} (${form.tradeQty} contracts × $0.70)`}
          />
          <div className="space-y-1 text-xs text-zinc-600">
            <div>• Most brokers: $0.65/contract + $0.05 regulatory</div>
            <div>
              • Quick fill: ${(form.tradeQty * 0.65).toFixed(2)} (commission only) or $
              {(form.tradeQty * 0.7).toFixed(2)} (w/ fees)
            </div>
          </div>
        </div>
        <div className="text-xs text-zinc-500">Preview</div>
        <div className="rounded-lg border border-green-500/20 bg-zinc-950/40 p-3 text-sm text-zinc-300">
          {form.tradeSide === 'S' ? 'Sell' : 'Buy'} {form.tradeQty} {form.tradeType}{' '}
          {form.tradeSym || '—'} {form.tradeStrike || 0} @ $
          {fmt(Math.max(0, form.tradeEntry || 0), 2)} · DTE {Math.max(0, featureDteUi ? dteFromExp : form.tradeDTE || 0)}
          {featureDteUi && isValidYmd(expYmd) ? ` · Exp ${expYmd}` : ''} · Fees
          ${fmt(Math.max(0, form.tradeFees || 0), 2)}
        </div>
        <Button
          fullWidth
          variant="primary"
          className="rounded-xl border-2 border-green-400/80 bg-green-500/20 px-4 py-3 text-green-200 shadow-[0_1px_2px_0_rgba(0,0,0,0.5)] ring-1 ring-green-500/20 [text-shadow:0_0_6px_rgba(16,185,129,0.35)] hover:bg-green-500/30 hover:[text-shadow:0_0_8px_rgba(16,185,129,0.45)] focus-visible:ring-2 focus-visible:ring-green-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-black/80"
          onClick={handleAddTrade}
        >
          + Add Trade
        </Button>
      </div>
    </div>
  );
};
