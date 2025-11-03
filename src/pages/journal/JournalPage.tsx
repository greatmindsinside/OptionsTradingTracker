import React, { useEffect, useState } from 'react';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useFilterStore } from '@/stores/useFilterStore';
import { useJournal } from '@/store/journal';
import { FilterBar } from './components/filters/FilterBar';
import { fmtMoney, fmtDate } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useWheelCalculations } from './hooks/useWheelCalculations';
import type { Entry } from '@/types/entry';

/**
 * Professional Refactored Journal Page
 *
 * Architecture:
 * - Zustand stores for state management (useEntriesStore, useFilterStore)
 * - Component composition pattern (FilterBar, table components, modal)
 * - Custom hooks for calculations (useWheelCalculations)
 * - Database-level filtering with status logic in queryBuilder
 * - SQL.js persistence via stores
 *
 * Data flow and DB interactions:
 * - This page reads entries from useEntriesStore. When filters change, we call
 *   loadEntries(filters). That function (in the store) builds an SQL WHERE clause
 *   via src/db/queryBuilder.ts and executes a parameterized SELECT against the
 *   in-browser SQLite (sql.js) "journal" table. Results are set back into the store.
 * - Totals are computed in the store via a separate SQL SUM query that reuses the
 *   exact same WHERE clause so the totals always mirror the current filter.
 * - Creating a new entry calls addEntry(...), which uses a template to generate one
 *   or more JournalRow records, inserts them into the journal table, saves the DB,
 *   and finally triggers a reload (loadEntries) so the table reflects the change.
 */

const JournalPage: React.FC = () => {
  const { loadEntries, addEntry, entries, loading } = useEntriesStore();
  const filters = useFilterStore();
  const { add: addLocal } = useJournal(); // For WheelModern compatibility

  const [open, setOpen] = useState(false);
  const [tmpl, setTmpl] = useState<
    'sellPut' | 'putAssigned' | 'sellCC' | 'callAssigned' | 'dividend' | 'fee'
  >('sellPut');

  // Form state
  const [symbol, setSymbol] = useState('');
  const [date, setDate] = useState<string>(() => fmtDate(new Date()));
  const [contracts, setContracts] = useState(1);
  const [strike, setStrike] = useState<number>(100);
  const [expiration, setExpiration] = useState<string>(() => fmtDate(new Date()));
  const [premium, setPremium] = useState<number>(1.0);
  const [amount, setAmount] = useState<number>(0);
  const [fee, setFee] = useState<number>(0.0);
  const [notes, setNotes] = useState<string>('');

  // Load entries on mount and when filters change
  useEffect(() => {
    // When any primitive filter changes, fetch matching rows from the DB.
    // Internally: useEntriesStore.loadEntries -> buildWhere(filters) -> SELECT ... FROM journal
    loadEntries({
      symbol: filters.symbol,
      type: filters.type,
      from: filters.from,
      to: filters.to,
      status: filters.status,
    });
  }, [filters.symbol, filters.type, filters.from, filters.to, filters.status, loadEntries]);

  // Calculate wheel metrics
  const wheelCalcs = useWheelCalculations(entries);

  const handleSave = async () => {
    if (!symbol || symbol.trim() === '') {
      alert('Please enter a symbol');
      return;
    }

    const base = { accountId: 'acct-1', symbol: symbol.toUpperCase(), date };

    try {
      // Persist new entry/entries:
      // - We update an in-memory wheel journal for compatibility (useJournal.add)
      // - We call useEntriesStore.addEntry with a template name; templates
      //   expand into concrete JournalRow records which are inserted into the
      //   SQLite journal table (see models/templates and db/sql.ts).
      // - After insert, the store saves the DB and reloads entries so the UI
      //   immediately reflects the new data under current filters.
      switch (tmpl) {
        case 'sellPut':
          addLocal({
            kind: 'sell_put',
            symbol: base.symbol,
            contracts,
            strike,
            premium,
            dte: Math.max(
              0,
              Math.ceil((new Date(expiration).getTime() - new Date(date).getTime()) / 86400000)
            ),
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: fee,
          });
          await addEntry('tmplSellPut', {
            ...base,
            contracts,
            premiumPerContract: premium,
            strike,
            expiration,
            fee,
          });
          break;
        case 'sellCC':
          addLocal({
            kind: 'sell_call',
            symbol: base.symbol,
            contracts,
            strike,
            premium,
            dte: Math.max(
              0,
              Math.ceil((new Date(expiration).getTime() - new Date(date).getTime()) / 86400000)
            ),
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: fee,
          });
          await addEntry('tmplSellCoveredCall', {
            ...base,
            contracts,
            premiumPerContract: premium,
            strike,
            expiration,
            fee,
          });
          break;
        case 'putAssigned':
          addLocal({
            kind: 'put_assigned',
            symbol: base.symbol,
            contracts,
            price: strike,
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: fee,
          });
          await addEntry('tmplPutAssigned', { ...base, contracts, strike, expiration, fee });
          break;
        case 'callAssigned':
          addLocal({
            kind: 'call_assigned',
            symbol: base.symbol,
            contracts,
            price: strike,
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: fee,
          });
          await addEntry('tmplCallAssigned', { ...base, contracts, strike, expiration, fee });
          break;
        case 'dividend':
          addLocal({
            kind: 'dividend',
            symbol: base.symbol,
            when: new Date(date + 'T00:00:00').toISOString(),
            meta: { amount },
          });
          await addEntry('tmplDividend', { ...base, amount });
          break;
        case 'fee':
          addLocal({
            kind: 'fee',
            symbol: base.symbol,
            when: new Date(date + 'T00:00:00').toISOString(),
            fees: amount,
          });
          await addEntry('tmplFee', { ...base, amount });
          break;
      }

      setOpen(false);
      // Reset form
      setSymbol('');
      setDate(fmtDate(new Date()));
      setNotes('');
    } catch (error) {
      alert('Failed to save entry: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-zinc-200 cyber-bg">
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-24 -left-20 rounded-full bg-green-500/15 blur-3xl h-112 aspect-square" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 rounded-full bg-green-400/20 blur-3xl h-128 aspect-square" />

      {/* Header */}
      <header className="wheel-header">
        <div className="wheel-header__inner">
          <h1 className="wheel-header__brand">💼 Wheel Strategy Journal</h1>
          <div className="wheel-header__search">
            <div className="wheel-header__search-wrapper">
              <svg
                className="wheel-header__search-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16a8 8 0 100-16 8 8 0 000 16zM15 15l5 5"
                />
              </svg>
              <input
                id="sym"
                type="search"
                value={filters.symbol}
                onChange={e => {
                  // Update filter store; JournalPage effect above will detect
                  // the primitive value change and re-query the DB with a
                  // WHERE symbol LIKE ? clause.
                  filters.setFilters({ symbol: e.target.value });
                }}
                placeholder="Search symbol..."
                className="wheel-header__search-input"
              />
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="wheel-header__btn wheel-header__btn--primary"
          >
            ✨ New Entry
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
        <main className="relative w-full max-w-7xl">
          {/* Filter Bar with Summary Stats */}
          <FilterBar />

          {/* Wheel Cycles Summary */}
          {wheelCalcs.byTicker.length > 0 && (
            <div className="px-6 py-4 mb-6 rounded-2xl neon-panel">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>📊</span> Wheel Strategy Summary by Ticker
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wheelCalcs.byTicker.map(ticker => (
                  <div
                    key={ticker.symbol}
                    className="p-4 rounded-xl border border-green-500/20 bg-zinc-950/40"
                  >
                    <div className="font-bold text-green-400 text-lg mb-2">{ticker.symbol}</div>
                    <div className="text-xs text-zinc-400 mb-1">{ticker.daysActive} days</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-zinc-500">Premium:</span>{' '}
                        <span className="text-emerald-400">
                          {fmtMoney(ticker.premiumCollected)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Net P/L:</span>{' '}
                        <span className={ticker.netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {fmtMoney(ticker.netPL)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Shares:</span>{' '}
                        <span className="text-zinc-300">
                          {ticker.sharesOwned} @ ${ticker.avgCost.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Open Pos:</span>{' '}
                        <span className="text-zinc-300">
                          {ticker.openPuts}P / {ticker.openCalls}C
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entries Table */}
          <div className="px-6 py-4 rounded-2xl neon-panel">
            {loading ? (
              <div className="text-center py-12 text-zinc-400">Loading entries...</div>
            ) : (
              <div className="overflow-auto rounded-xl border border-green-500/20">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-950/60 text-zinc-400">
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Strike</th>
                      <th className="px-3 py-2">Exp</th>
                      <th className="px-3 py-2 text-right">DTE</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((r: Entry) => {
                      const dte = r.expiration
                        ? Math.ceil(
                            (new Date(r.expiration).getTime() - new Date(r.ts).getTime()) / 86400000
                          )
                        : null;
                      return (
                        <tr key={r.id} className="border-t border-zinc-900 hover:bg-zinc-950/30">
                          <td className="px-3 py-2">{fmtDate(r.ts)}</td>
                          <td className="px-3 py-2 font-semibold">{r.symbol}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs ${
                                r.type === 'sell_to_open'
                                  ? 'bg-green-500/20 text-green-400'
                                  : r.type === 'assignment_shares'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : r.type === 'share_sale'
                                      ? 'bg-purple-500/20 text-purple-400'
                                      : r.type === 'expiration'
                                        ? 'bg-zinc-500/20 text-zinc-400'
                                        : r.type === 'dividend'
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-zinc-700/20 text-zinc-400'
                              }`}
                            >
                              {r.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-300">{r.qty ?? '—'}</td>
                          <td className="px-3 py-2 text-right">
                            {r.strike ? `$${r.strike.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-zinc-400">
                            {r.expiration ? fmtDate(r.expiration) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {dte !== null ? (dte >= 0 ? dte : `(${Math.abs(dte)})`) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-400">
                            {r.underlying_price ? `$${r.underlying_price.toFixed(2)}` : '—'}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-semibold ${r.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {fmtMoney(r.amount)}
                          </td>
                          <td className="px-3 py-2 text-zinc-500 text-xs max-w-[150px] truncate">
                            {r.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {entries.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-zinc-500" colSpan={10}>
                          No entries yet. Click "New Entry" to start tracking your wheel strategy.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* New Entry Modal */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="✨ New Entry" size="xl">
        <div className="space-y-4">
          {/* Template Selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Button
              variant={tmpl === 'sellPut' ? 'primary' : 'secondary'}
              onClick={() => setTmpl('sellPut')}
              size="sm"
            >
              Sell Put
            </Button>
            <Button
              variant={tmpl === 'putAssigned' ? 'primary' : 'secondary'}
              onClick={() => setTmpl('putAssigned')}
              size="sm"
            >
              Put Assigned
            </Button>
            <Button
              variant={tmpl === 'sellCC' ? 'primary' : 'secondary'}
              onClick={() => setTmpl('sellCC')}
              size="sm"
            >
              Sell Covered Call
            </Button>
            <Button
              variant={tmpl === 'callAssigned' ? 'primary' : 'secondary'}
              onClick={() => setTmpl('callAssigned')}
              size="sm"
            >
              Call Assigned
            </Button>
            <Button
              variant={tmpl === 'dividend' ? 'primary' : 'secondary'}
              onClick={() => setTmpl('dividend')}
              size="sm"
            >
              Dividend
            </Button>
            <Button
              variant={tmpl === 'fee' ? 'primary' : 'secondary'}
              onClick={() => setTmpl('fee')}
              size="sm"
            >
              Fee
            </Button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input
              label="Symbol"
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              placeholder="AAPL"
            />
          </div>

          {(tmpl === 'sellPut' ||
            tmpl === 'sellCC' ||
            tmpl === 'putAssigned' ||
            tmpl === 'callAssigned') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Contracts"
                  type="number"
                  value={contracts}
                  onChange={e => setContracts(Number(e.target.value))}
                />
                <Input
                  label="Strike"
                  type="number"
                  step="0.01"
                  value={strike}
                  onChange={e => setStrike(Number(e.target.value))}
                />
              </div>
              {(tmpl === 'sellPut' || tmpl === 'sellCC') && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Premium/Contract"
                    type="number"
                    step="0.01"
                    value={premium}
                    onChange={e => setPremium(Number(e.target.value))}
                  />
                  <Input
                    label="Expiration"
                    type="date"
                    value={expiration}
                    onChange={e => setExpiration(e.target.value)}
                  />
                </div>
              )}
              {(tmpl === 'putAssigned' || tmpl === 'callAssigned') && (
                <Input
                  label="Expiration"
                  type="date"
                  value={expiration}
                  onChange={e => setExpiration(e.target.value)}
                />
              )}
              <Input
                label="Fee"
                type="number"
                step="0.01"
                value={fee}
                onChange={e => setFee(Number(e.target.value))}
              />
            </>
          )}

          {(tmpl === 'dividend' || tmpl === 'fee') && (
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
          )}

          <Input
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes..."
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Entry</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default JournalPage;
