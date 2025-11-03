import React from 'react';
import { useTradeComposer } from '@/pages/wheel/hooks/useTradeComposer';
import type { OptType } from '@/types/wheel';
import { useJournal } from '@/store/journal';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import { useWheelStore } from '@/stores/useWheelStore';
import { fmt } from '@/utils/wheel-calculations';

export const TradeTab: React.FC = () => {
  const { form, submitTrade, resetForm } = useTradeComposer();
  const { add: addJournal } = useJournal();
  const { addEntry } = useEntriesStore();
  const closeActions = useWheelUIStore(s => s.closeActions);
  const reloadFn = useWheelStore(s => s.reloadFn);

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

    // Calculate expiration date from DTE
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + form.tradeDTE);
    const expiration = expirationDate.toISOString().slice(0, 10);

    try {
      // Update in-memory journal (for WheelModern compatibility)
      if (form.tradeSide === 'S') {
        addJournal({
          kind: form.tradeType === 'P' ? 'sell_put' : 'sell_call',
          symbol: S,
          contracts: form.tradeQty,
          strike: form.tradeStrike,
          premium: form.tradeEntry,
          dte: form.tradeDTE,
          fees: form.tradeFees || undefined,
          when: whenIso,
        });
      } else {
        addJournal({
          kind: 'buy_close',
          symbol: S,
          type: form.tradeType,
          contracts: form.tradeQty,
          strike: form.tradeStrike,
          premium: form.tradeEntry,
          fees: form.tradeFees || undefined,
          when: whenIso,
        });
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
        alert(
          `✅ Trade added: ${form.tradeSide === 'S' ? 'Sell' : 'Buy'} ${form.tradeQty} ${form.tradeType} ${S} $${form.tradeStrike}`
        );
      } else {
        // Fallback to page reload if reload function not available
        alert(
          `✅ Trade added: ${form.tradeSide === 'S' ? 'Sell' : 'Buy'} ${form.tradeQty} ${form.tradeType} ${S} $${form.tradeStrike}`
        );
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to add trade to database:', err);
      alert('❌ Failed to save trade to database. Check console for details.');
    }
  };

  return (
    <div className="space-y-3" data-testid="drawer.trade">
      <div className="text-sm text-zinc-400">Compose a single option trade.</div>
      <div className="grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500">Symbol</label>
          <input
            value={form.tradeSym}
            onChange={e => form.setTradeSym(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
            className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 w-full text-green-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-500">Type</label>
            <select
              value={form.tradeType}
              onChange={e => form.setTradeType(e.target.value as OptType)}
              className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
            >
              <option value="P">Put</option>
              <option value="C">Call</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-500">Side</label>
            <select
              value={form.tradeSide}
              onChange={e => form.setTradeSide(e.target.value as 'S' | 'B')}
              className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
            >
              <option value="S">Sell</option>
              <option value="B">Buy</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-500">Qty</label>
            <input
              type="number"
              value={form.tradeQty || ''}
              onChange={e => form.setTradeQty(e.target.value === '' ? 0 : parseInt(e.target.value))}
              className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-500">DTE</label>
            <input
              type="number"
              value={form.tradeDTE || ''}
              onChange={e => form.setTradeDTE(e.target.value === '' ? 0 : parseInt(e.target.value))}
              className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-500">Strike</label>
            <input
              type="number"
              step="any"
              value={form.tradeStrike || ''}
              onChange={e =>
                form.setTradeStrike(e.target.value === '' ? 0 : parseFloat(e.target.value))
              }
              className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-500">Premium</label>
            <input
              type="number"
              step=".01"
              value={form.tradeEntry || ''}
              onChange={e =>
                form.setTradeEntry(e.target.value === '' ? 0 : parseFloat(e.target.value))
              }
              className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500">
            Fees (optional)
            <span className="ml-2 text-zinc-600 font-normal">
              ≈ ${(form.tradeQty * 0.7).toFixed(2)} typical
            </span>
          </label>
          <input
            type="number"
            step="0.01"
            value={form.tradeFees || ''}
            onChange={e =>
              form.setTradeFees(e.target.value === '' ? 0 : parseFloat(e.target.value))
            }
            placeholder={`≈ ${(form.tradeQty * 0.7).toFixed(2)} (${form.tradeQty} contracts × $0.70)`}
            className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 text-green-400 w-full"
          />
          <div className="text-xs text-zinc-600 space-y-1">
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
          {fmt(Math.max(0, form.tradeEntry || 0), 2)} · DTE {Math.max(0, form.tradeDTE || 0)} · Fees
          ${fmt(Math.max(0, form.tradeFees || 0), 2)}
        </div>
        <button
          className="w-full px-3 py-2 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors font-semibold"
          onClick={handleAddTrade}
        >
          + Add Trade
        </button>
      </div>
    </div>
  );
};
