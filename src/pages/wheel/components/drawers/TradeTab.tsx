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

import React, { useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { SymbolInput } from '@/components/SymbolInput';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { tmplBuyShares } from '@/models/templates';
import { useTradeComposer } from '@/pages/wheel/hooks/useTradeComposer';
import { useJournal } from '@/store/journal';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import type { OptType } from '@/types/wheel';
import { calcDTE, isValidYmd } from '@/utils/dates';
import { env } from '@/utils/env';
import { track } from '@/utils/telemetry';
import { fmt } from '@/utils/wheel-calculations';

export const TradeTab: React.FC = () => {
  const { form, submitTrade, resetForm } = useTradeComposer();
  const { add: addJournal } = useJournal();
  const { addEntry, addRawEntries } = useEntriesStore();
  const closeActions = useWheelUIStore(s => s.closeActions);
  const reloadFn = useWheelStore(s => s.reloadFn);
  const lots = useWheelStore(s => s.lots);

  // Feature: DTE via date picker with advanced numeric input
  const featureDteUi = env.features.tradeDTE;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expYmd, setExpYmd] = useState<string>('');
  const dteFromExp = useMemo(() => calcDTE(expYmd), [expYmd]);
  const [strikeError, setStrikeError] = useState<string>('');
  const [qtyError, setQtyError] = useState<string>('');
  const [dteError, setDteError] = useState<string>('');
  const [premiumError, setPremiumError] = useState<string>('');
  const [feesError, setFeesError] = useState<string>('');
  const [expirationError, setExpirationError] = useState<string>('');
  const [typeError, setTypeError] = useState<string>('');
  const [sideError, setSideError] = useState<string>('');
  const [ownsShares, setOwnsShares] = useState<boolean>(false);
  const [sharesOwned, setSharesOwned] = useState<string>('0');
  const [averageCost, setAverageCost] = useState<string>('0');
  const [sharesOwnedError, setSharesOwnedError] = useState<string>('');
  const [averageCostError, setAverageCostError] = useState<string>('');

  // Check existing shares for current ticker
  const existingShares = useMemo(() => {
    if (!form.tradeSym) return 0;
    const ticker = form.tradeSym.toUpperCase();
    return lots.filter(l => l.ticker === ticker).reduce((sum, l) => sum + l.qty, 0);
  }, [lots, form.tradeSym]);

  // Calculate shares needed for the call position
  const sharesNeeded = useMemo(() => {
    if (form.tradeType !== 'C' || form.tradeSide !== 'S') return 0;
    return (parseInt(form.tradeQty) || 0) * 100;
  }, [form.tradeType, form.tradeSide, form.tradeQty]);

  // Determine if calls are covered
  const isCovered = useMemo(() => {
    if (!ownsShares) return false;
    const owned = parseInt(sharesOwned) || 0;
    return owned >= sharesNeeded;
  }, [ownsShares, sharesOwned, sharesNeeded]);

  // Note: Expiration date must be explicitly set by the user
  // Advanced DTE mode is for reference only and does not auto-fill the expiration date

  const handleAddTrade = async () => {
    // Validate all fields before submission
    let hasErrors = false;

    // Validate Type
    if (!form.tradeType || (form.tradeType !== 'P' && form.tradeType !== 'C')) {
      setTypeError('Type is required');
      hasErrors = true;
    } else {
      setTypeError('');
    }

    // Validate Side
    if (!form.tradeSide || (form.tradeSide !== 'B' && form.tradeSide !== 'S')) {
      setSideError('Side is required');
      hasErrors = true;
    } else {
      setSideError('');
    }

    // Validate Qty
    const qtyValue = parseInt(form.tradeQty) || 0;
    if (qtyValue <= 0) {
      setQtyError('Quantity must be greater than 0');
      hasErrors = true;
    } else {
      setQtyError('');
    }

    // Validate Expiration Date (when date picker is enabled)
    if (featureDteUi) {
      if (!expYmd || !isValidYmd(expYmd)) {
        setExpirationError('Expiration date is required');
        hasErrors = true;
      } else {
        setExpirationError('');
      }
    }

    // Validate DTE
    const dteValue = parseInt(form.tradeDTE) || 0;
    if (dteValue < 0) {
      setDteError('DTE cannot be negative');
      hasErrors = true;
    } else {
      setDteError('');
    }

    // Validate Strike
    const strikeValue = parseFloat(form.tradeStrike) || 0;
    if (strikeValue <= 0) {
      setStrikeError('Strike must be greater than 0');
      hasErrors = true;
    } else {
      setStrikeError('');
    }

    // Validate Premium
    const premiumValue = parseFloat(form.tradeEntry) || 0;
    if (premiumValue <= 0) {
      setPremiumError('Premium must be greater than 0');
      hasErrors = true;
    } else {
      setPremiumError('');
    }

    // Validate Fees
    const feesValue = parseFloat(form.tradeFees) || 0;
    if (feesValue < 0) {
      setFeesError('Fees cannot be negative');
      hasErrors = true;
    } else {
      setFeesError('');
    }

    // Validate Shares Owned and Average Cost (when checkbox is checked for Call + Sell)
    if (form.tradeType === 'C' && form.tradeSide === 'S' && ownsShares) {
      const sharesValue = parseInt(sharesOwned) || 0;
      if (sharesValue <= 0) {
        setSharesOwnedError('Shares owned must be greater than 0');
        hasErrors = true;
      } else {
        setSharesOwnedError('');
      }

      const costValue = parseFloat(averageCost) || 0;
      if (costValue <= 0) {
        setAverageCostError('Average cost must be greater than 0');
        hasErrors = true;
      } else {
        setAverageCostError('');
      }
    }

    if (hasErrors) {
      return;
    }

    try {
      submitTrade();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Invalid form';
      // Map validation errors to specific fields
      if (errorMessage.includes('Strike')) {
        setStrikeError(errorMessage);
      } else if (errorMessage.includes('Quantity') || errorMessage.includes('Qty')) {
        setQtyError(errorMessage);
      } else if (errorMessage.includes('DTE')) {
        setDteError(errorMessage);
      } else if (errorMessage.includes('Premium')) {
        setPremiumError(errorMessage);
      } else if (errorMessage.includes('Fees')) {
        setFeesError(errorMessage);
      } else {
        alert(errorMessage);
      }
      return;
    }

    if (!form.tradeSym) return;

    const S = form.tradeSym.toUpperCase();
    const todayDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const whenIso = new Date().toISOString();

    // Calculate expiration date: prefer explicit date from UI when feature is enabled
    const expiration = (() => {
      if (featureDteUi) {
        if (!expYmd || !isValidYmd(expYmd)) {
          throw new Error('Expiration date is required');
        }
        return expYmd;
      }
      // Fallback for non-date-picker mode: calculate from DTE
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + (parseInt(form.tradeDTE) || 0));
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
      // At this point, validation has passed, so we know type and side are valid
      const tradeType = form.tradeType as 'P' | 'C';
      const tradeSide = form.tradeSide as 'S' | 'B';

      // Update in-memory journal (for WheelModern compatibility)
      if (tradeSide === 'S') {
        const journalEntry = {
          kind: (tradeType === 'P'
            ? 'sell_put'
            : 'sell_call') as import('@/store/journal').JournalKind,
          symbol: S,
          contracts: parseInt(form.tradeQty) || 0,
          strike: parseFloat(form.tradeStrike) || 0,
          premium: parseFloat(form.tradeEntry) || 0,
          dte: parseInt(form.tradeDTE) || 0,
          fees: parseFloat(form.tradeFees) || undefined,
          type: tradeType,
          side: tradeSide,
          when: whenIso,
        };
        addJournal(journalEntry);
      } else {
        const journalEntry = {
          kind: 'buy_close' as import('@/store/journal').JournalKind,
          symbol: S,
          contracts: parseInt(form.tradeQty) || 0,
          strike: parseFloat(form.tradeStrike) || 0,
          premium: parseFloat(form.tradeEntry) || 0,
          fees: parseFloat(form.tradeFees) || undefined,
          type: tradeType,
          side: tradeSide,
          when: whenIso,
        };
        addJournal(journalEntry);
      }

      // Persist to database (updates both Journal and Wheel pages)
      const base = { accountId: 'acct-1', symbol: S, date: todayDate };

      // Create share lot entry FIRST if checkbox is checked and shares don't exist
      // This ensures shares are available when the min strike calculation runs
      if (process.env.NODE_ENV === 'development') {
        console.log('[TradeTab] Share lot creation check:', {
          tradeType,
          tradeSide,
          ownsShares,
          existingShares,
          sharesOwned,
          averageCost,
          willCreate: tradeType === 'C' && tradeSide === 'S' && ownsShares && existingShares === 0,
        });
      }

      if (tradeType === 'C' && tradeSide === 'S' && ownsShares && existingShares === 0) {
        const sharesValue = parseInt(sharesOwned) || 0;
        const costValue = parseFloat(averageCost) || 0;

        if (process.env.NODE_ENV === 'development') {
          console.log('[TradeTab] Creating share lot (before call entry):', {
            symbol: S,
            shares: sharesValue,
            pricePerShare: costValue,
            sharesValueValid: sharesValue > 0,
            costValueValid: costValue > 0,
          });
        }

        if (sharesValue > 0 && costValue > 0) {
          const shareEntries = tmplBuyShares({
            accountId: 'acct-1',
            symbol: S,
            date: todayDate,
            shares: sharesValue,
            pricePerShare: costValue,
            fee: 0,
          });
          await addRawEntries(shareEntries);
          if (process.env.NODE_ENV === 'development') {
            console.log('[TradeTab] ✅ Share lot entries created:', shareEntries.length);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[TradeTab] ⚠️ Skipping share lot creation - invalid values:', {
              sharesValue,
              costValue,
            });
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('[TradeTab] ⚠️ Share lot creation skipped - condition not met');
        }
      }

      // Now add the trade entry (this will trigger min strike calculation with shares already in place)
      if (tradeSide === 'S' && tradeType === 'P') {
        await addEntry('tmplSellPut', {
          ...base,
          contracts: parseInt(form.tradeQty) || 0,
          premiumPerContract: parseFloat(form.tradeEntry) || 0,
          strike: parseFloat(form.tradeStrike) || 0,
          expiration,
          fee: parseFloat(form.tradeFees) || 0,
        });
      } else if (tradeSide === 'S' && tradeType === 'C') {
        await addEntry('tmplSellCoveredCall', {
          ...base,
          contracts: parseInt(form.tradeQty) || 0,
          premiumPerContract: parseFloat(form.tradeEntry) || 0,
          strike: parseFloat(form.tradeStrike) || 0,
          expiration,
          fee: parseFloat(form.tradeFees) || 0,
        });
      } else if (tradeSide === 'B' && tradeType === 'P') {
        // Buy to close put - use fee template for now or create new template
        await addEntry('tmplFee', {
          ...base,
          amount:
            -((parseInt(form.tradeQty) || 0) * (parseFloat(form.tradeEntry) || 0) * 100) -
            (parseFloat(form.tradeFees) || 0),
        });
      } else {
        // Buy to close call
        await addEntry('tmplFee', {
          ...base,
          amount:
            -((parseInt(form.tradeQty) || 0) * (parseFloat(form.tradeEntry) || 0) * 100) -
            (parseFloat(form.tradeFees) || 0),
        });
      }

      // Reset form, close drawer, and show success
      resetForm();
      setExpYmd('');
      setExpirationError('');
      setTypeError('');
      setSideError('');
      setOwnsShares(false);
      setSharesOwned('0');
      setAverageCost('0');
      setSharesOwnedError('');
      setAverageCostError('');
      setShowAdvanced(false);
      closeActions();

      // Reload wheel data from database
      if (reloadFn) {
        await reloadFn();
        const msg = `✅ Trade added: ${tradeSide === 'S' ? 'Sell' : 'Buy'} ${parseInt(form.tradeQty) || 0} ${tradeType} ${S} $${parseFloat(form.tradeStrike) || 0}`;
        alert(msg);
        track('trade_add_success', {
          symbol: S,
          side: tradeSide,
          type: tradeType,
          qty: parseInt(form.tradeQty) || 0,
          strike: parseFloat(form.tradeStrike) || 0,
          dte: featureDteUi ? dteFromExp : parseInt(form.tradeDTE) || 0,
          expiration,
        });
      } else {
        // Fallback to page reload if reload function not available
        const msg = `✅ Trade added: ${tradeSide === 'S' ? 'Sell' : 'Buy'} ${parseInt(form.tradeQty) || 0} ${tradeType} ${S} $${parseFloat(form.tradeStrike) || 0}`;
        alert(msg);
        track('trade_add_success', {
          symbol: S,
          side: tradeSide,
          type: tradeType,
          qty: parseInt(form.tradeQty) || 0,
          strike: parseFloat(form.tradeStrike) || 0,
          dte: featureDteUi ? dteFromExp : parseInt(form.tradeDTE) || 0,
          expiration,
        });
        window.location.reload();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      console.error('Failed to add trade to database:', err);
      console.error('Error details:', { errorMessage, errorStack, formData: form });
      alert(
        `❌ Failed to save trade to database.\n\nError: ${errorMessage}\n\nCheck console for full details.`
      );
      track('trade_add_error', { error: errorMessage, stack: errorStack });
    }
  };

  return (
    <div className="space-y-3" data-testid="drawer.trade">
      <div className="mt-2 grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-2">
          <SymbolInput
            label="Symbol"
            value={form.tradeSym}
            onChange={value => form.setTradeSym(value.toUpperCase())}
            placeholder="e.g. AAPL"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Select
              label="Type"
              value={form.tradeType || ''}
              onChange={e => {
                const value = e.target.value;
                form.setTradeType(value === '' ? '' : (value as OptType));
                if (typeError) setTypeError('');
              }}
              options={[
                { value: '', label: 'Select Type...' },
                { value: 'P', label: 'Put' },
                { value: 'C', label: 'Call' },
              ]}
              error={typeError}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Select
              label="Side"
              value={form.tradeSide || ''}
              onChange={e => {
                const value = e.target.value;
                form.setTradeSide(value === '' ? '' : (value as 'S' | 'B'));
                if (sideError) setSideError('');
              }}
              options={[
                { value: '', label: 'Select Side...' },
                { value: 'S', label: 'Sell' },
                { value: 'B', label: 'Buy' },
              ]}
              error={sideError}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Input
              label="Contracts (Qty)"
              type="number"
              value={form.tradeQty ?? ''}
              onChange={e => {
                form.setTradeQty(e.target.value);
                if (qtyError) setQtyError('');
              }}
              onBlur={e => {
                const qtyValue = parseInt(e.target.value) || 0;
                if (qtyValue <= 0) {
                  setQtyError('Quantity must be greater than 0');
                } else {
                  setQtyError('');
                }
              }}
              className={
                qtyError ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50' : ''
              }
            />
            {qtyError && <div className="mt-0.5 text-xs text-red-400">{qtyError}</div>}
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
                  form.setTradeDTE(String(next));
                  if (dteError) setDteError('');
                  if (expirationError) setExpirationError('');
                  track('trade_dte_date_change', { exp: ymd, dte: next });
                }}
                onBlur={e => {
                  const ymd = e.target.value.trim();
                  if (!ymd || !isValidYmd(ymd)) {
                    setExpirationError('Expiration date is required');
                  } else {
                    setExpirationError('');
                  }
                }}
                className={
                  expirationError
                    ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50'
                    : ''
                }
              />
              {expirationError && (
                <div className="mt-0.5 text-xs text-red-400">{expirationError}</div>
              )}
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div>
                  DTE: <span className="font-medium text-zinc-300">{Math.max(0, dteFromExp)}</span>
                  {dteFromExp < 0 && <span className="ml-2 text-red-400">Past date selected</span>}
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
                <div className="flex flex-col gap-2">
                  <Input
                    label="DTE (advanced)"
                    type="number"
                    value={form.tradeDTE ?? ''}
                    onChange={e => {
                      form.setTradeDTE(e.target.value);
                      if (dteError) setDteError('');
                      // Note: We don't auto-fill expiration date - user must set it explicitly
                    }}
                    onBlur={e => {
                      const dteValue = parseInt(e.target.value) || 0;
                      if (dteValue < 0) {
                        setDteError('DTE cannot be negative');
                      } else {
                        setDteError('');
                      }
                    }}
                    className={
                      dteError
                        ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50'
                        : ''
                    }
                  />
                  {dteError && <div className="mt-0.5 text-xs text-red-400">{dteError}</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                label="DTE"
                type="number"
                value={form.tradeDTE ?? ''}
                onChange={e => {
                  form.setTradeDTE(e.target.value);
                  if (dteError) setDteError('');
                }}
                onBlur={e => {
                  const dteValue = parseInt(e.target.value) || 0;
                  if (dteValue < 0) {
                    setDteError('DTE cannot be negative');
                  } else {
                    setDteError('');
                  }
                }}
                className={
                  dteError ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50' : ''
                }
              />
              {dteError && <div className="mt-0.5 text-xs text-red-400">{dteError}</div>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Input
              label="Strike"
              type="number"
              step="any"
              value={form.tradeStrike ?? ''}
              onChange={e => {
                form.setTradeStrike(e.target.value);
                // Clear error when user starts typing
                if (strikeError) setStrikeError('');
              }}
              onBlur={e => {
                const strikeValue = parseFloat(e.target.value) || 0;
                if (strikeValue <= 0) {
                  setStrikeError('Strike must be greater than 0');
                } else {
                  setStrikeError('');
                }
              }}
              className={
                strikeError ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50' : ''
              }
            />
            {strikeError && <div className="mt-0.5 text-xs text-red-400">{strikeError}</div>}
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
              value={form.tradeEntry ?? ''}
              onChange={e => {
                form.setTradeEntry(e.target.value);
                if (premiumError) setPremiumError('');
              }}
              onBlur={e => {
                const premiumValue = parseFloat(e.target.value) || 0;
                if (premiumValue <= 0) {
                  setPremiumError('Premium must be greater than 0');
                } else {
                  setPremiumError('');
                }
              }}
              className={
                premiumError
                  ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50'
                  : ''
              }
            />
            {premiumError && <div className="mt-0.5 text-xs text-red-400">{premiumError}</div>}
          </div>
        </div>
        {/* Covered Call Checkbox and Share Entry - Only for Call + Sell */}
        {form.tradeType === 'C' && form.tradeSide === 'S' && (
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-700/50 bg-zinc-900/30 p-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ownsShares"
                checked={ownsShares}
                onChange={e => {
                  setOwnsShares(e.target.checked);
                  if (!e.target.checked) {
                    setSharesOwned('0');
                    setAverageCost('0');
                    setSharesOwnedError('');
                    setAverageCostError('');
                  }
                }}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-green-500 focus:ring-2 focus:ring-green-500/50"
              />
              <label htmlFor="ownsShares" className="text-sm font-medium text-zinc-200">
                I own the underlying shares
              </label>
            </div>
            {ownsShares && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Input
                      label="Shares Owned"
                      type="number"
                      value={sharesOwned}
                      onChange={e => {
                        setSharesOwned(e.target.value);
                        if (sharesOwnedError) setSharesOwnedError('');
                      }}
                      onBlur={e => {
                        const sharesValue = parseInt(e.target.value) || 0;
                        if (sharesValue <= 0) {
                          setSharesOwnedError('Shares owned must be greater than 0');
                        } else {
                          setSharesOwnedError('');
                        }
                      }}
                      className={
                        sharesOwnedError
                          ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50'
                          : ''
                      }
                    />
                    {sharesOwnedError && (
                      <div className="mt-0.5 text-xs text-red-400">{sharesOwnedError}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input
                      label="Average Cost"
                      type="number"
                      step="0.01"
                      value={averageCost}
                      onChange={e => {
                        setAverageCost(e.target.value);
                        if (averageCostError) setAverageCostError('');
                      }}
                      onBlur={e => {
                        const costValue = parseFloat(e.target.value) || 0;
                        if (costValue <= 0) {
                          setAverageCostError('Average cost must be greater than 0');
                        } else {
                          setAverageCostError('');
                        }
                      }}
                      className={
                        averageCostError
                          ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50'
                          : ''
                      }
                    />
                    {averageCostError && (
                      <div className="mt-0.5 text-xs text-red-400">{averageCostError}</div>
                    )}
                  </div>
                </div>
                {/* Coverage Status Display */}
                <div className="flex items-center gap-2 text-xs">
                  {isCovered ? (
                    <span className="rounded border border-green-500/40 bg-green-500/20 px-2 py-1 text-green-400">
                      ✓ Covered
                    </span>
                  ) : (
                    <span className="rounded border border-orange-500/40 bg-orange-500/20 px-2 py-1 text-orange-400">
                      ⚠ Naked
                    </span>
                  )}
                  <span className="text-zinc-400">
                    {parseInt(sharesOwned) || 0} shares owned | {sharesNeeded} shares needed
                    {existingShares > 0 && ` (${existingShares} already recorded)`}
                  </span>
                </div>
              </div>
            )}
            {!ownsShares && (
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded border border-orange-500/40 bg-orange-500/20 px-2 py-1 text-orange-400">
                  ⚠ Naked
                </span>
                <span className="text-zinc-400">
                  {sharesNeeded} shares needed
                  {existingShares > 0 && ` (${existingShares} already recorded)`}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500">
            Fees (optional)
            <span className="ml-2 font-normal text-zinc-600">
              ≈ ${((parseInt(form.tradeQty) || 0) * 0.7).toFixed(2)} typical
            </span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={form.tradeFees ?? ''}
            onChange={e => {
              form.setTradeFees(e.target.value);
              if (feesError) setFeesError('');
            }}
            onBlur={e => {
              const feesValue = parseFloat(e.target.value) || 0;
              if (feesValue < 0) {
                setFeesError('Fees cannot be negative');
              } else {
                setFeesError('');
              }
            }}
            className={
              feesError ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50' : ''
            }
            placeholder={`≈ ${((parseInt(form.tradeQty) || 0) * 0.7).toFixed(2)} (${parseInt(form.tradeQty) || 0} contracts × $0.70)`}
          />
          {feesError && <div className="mt-0.5 text-xs text-red-400">{feesError}</div>}
          <div className="space-y-1 text-xs text-zinc-600">
            <div>• Most brokers: $0.65/contract + $0.05 regulatory</div>
            <div>
              • Quick fill: ${((parseInt(form.tradeQty) || 0) * 0.65).toFixed(2)} (commission only)
              or ${((parseInt(form.tradeQty) || 0) * 0.7).toFixed(2)} (w/ fees)
            </div>
          </div>
        </div>
        <div className="text-xs text-zinc-500">Preview</div>
        <div className="rounded-lg border border-green-500/20 bg-zinc-950/40 p-3 text-sm text-zinc-300">
          {form.tradeSide === 'S' ? 'Sell' : form.tradeSide === 'B' ? 'Buy' : 'Select Side'}{' '}
          {parseInt(form.tradeQty) || 0}{' '}
          {form.tradeType === 'P' ? 'Put' : form.tradeType === 'C' ? 'Call' : 'Select Type'}{' '}
          {form.tradeSym || '—'} {parseFloat(form.tradeStrike) || 0} @ $
          {fmt(Math.max(0, parseFloat(form.tradeEntry) || 0), 2)} · DTE{' '}
          {Math.max(0, featureDteUi ? dteFromExp : parseInt(form.tradeDTE) || 0)}
          {featureDteUi && isValidYmd(expYmd) ? ` · Exp ${expYmd}` : ''} · Fees $
          {fmt(Math.max(0, parseFloat(form.tradeFees) || 0), 2)}
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
