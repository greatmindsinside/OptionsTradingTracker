import React, { useEffect, useState } from 'react';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useFilterStore } from '@/stores/useFilterStore';
import { useJournal } from '@/store/journal';
import { FilterBar } from './components/filters/FilterBar';
import { fmtMoney, fmtDate } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/ui/Input';
import { useWheelCalculations } from './hooks/useWheelCalculations';
import { EditEntryForm } from '@/components/EditEntryForm';
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
  const {
    loadEntries,
    addEntry,
    entries,
    loading,
    deleteEntry,
    editEntry,
    getDeletedEntries,
    restoreEntry,
  } = useEntriesStore();
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

  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [deletedEntries, setDeletedEntries] = useState<Entry[]>([]);

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

  // Load deleted entries when tab switches to deleted
  useEffect(() => {
    if (activeTab === 'deleted') {
      const fetchDeleted = async () => {
        const deleted = await getDeletedEntries();
        setDeletedEntries(deleted);
      };
      fetchDeleted();
    }
  }, [activeTab, getDeletedEntries]);

  // Calculate wheel metrics
  const wheelCalcs = useWheelCalculations(entries);

  // Delete handler
  const handleDeleteClick = async (entry: Entry) => {
    const confirmed = window.confirm(
      `Delete entry for ${entry.symbol}?\n\n` +
        `Date: ${entry.ts}\n` +
        `Type: ${entry.type}\n\n` +
        `This will soft-delete the entry (can be restored later).`
    );

    if (!confirmed) return;

    try {
      await deleteEntry(entry.id, 'Deleted by user from Journal page');
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Edit handler
  const handleEditClick = (entry: Entry) => {
    setEditingEntry(entry);
    setEditModalOpen(true);
  };

  const handleEditSave = async (updates: Partial<Entry>, reason: string) => {
    if (!editingEntry) return;

    try {
      await editEntry(editingEntry.id, updates, reason);
      setEditModalOpen(false);
      setEditingEntry(null);
    } catch (err) {
      alert(`Failed to edit: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Restore handler
  const handleRestoreClick = async (entry: Entry) => {
    const confirmed = window.confirm(
      `Restore entry for ${entry.symbol}?\n\n` +
        `Date: ${entry.ts}\n` +
        `Type: ${entry.type}\n\n` +
        `This will make the entry active again.`
    );

    if (!confirmed) return;

    try {
      await restoreEntry(entry.id);
      // Refresh deleted entries list
      const deleted = await getDeletedEntries();
      setDeletedEntries(deleted);
    } catch (err) {
      alert(`Failed to restore: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

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
    <div className="cyber-bg relative min-h-screen overflow-hidden bg-black text-zinc-200">
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-24 -left-20 aspect-square h-112 rounded-full bg-green-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-32 aspect-square h-128 rounded-full bg-green-400/20 blur-3xl" />

      {/* Header */}
      <header className="page-header">
        <div className="page-header__inner">
          <h1 className="page-header__brand page-header__brand--cyberpunk">💼 Wheel Strategy Journal</h1>
          <div className="page-header__search">
            <div className="page-header__search-wrapper">
              <svg
                className="page-header__search-icon"
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
                className="page-header__search-input"
              />
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="page-header__btn page-header__btn--primary"
          >
            ✨ New Entry
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex justify-center px-4 py-8 sm:px-6 lg:px-8">
        <main className="relative w-full max-w-7xl">
          {/* Filter Bar with Summary Stats */}
          <FilterBar />

          {/* Wheel Cycles Summary */}
          {wheelCalcs.byTicker.length > 0 && (
            <div className="neon-panel mb-6 rounded-2xl px-6 py-4">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <span>📊</span> Wheel Strategy Summary by Ticker
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {wheelCalcs.byTicker.map(ticker => (
                  <div
                    key={ticker.symbol}
                    className="rounded-xl border border-green-500/20 bg-zinc-950/40 p-4"
                  >
                    <div className="mb-2 text-lg font-bold text-green-400">{ticker.symbol}</div>
                    <div className="mb-1 text-xs text-zinc-400">{ticker.daysActive} days</div>
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

          {/* Tab Navigation */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`rounded-lg px-6 py-3 font-semibold transition-all ${
                activeTab === 'active'
                  ? 'border-2 border-green-500/50 bg-green-500/20 text-green-400'
                  : 'border-2 border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              📊 Active Entries ({entries.length})
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={`rounded-lg px-6 py-3 font-semibold transition-all ${
                activeTab === 'deleted'
                  ? 'border-2 border-red-500/50 bg-red-500/20 text-red-400'
                  : 'border-2 border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              🗑️ Deleted Entries ({deletedEntries.length})
            </button>
          </div>

          {/* Entries Table */}
          <div className="neon-panel rounded-2xl px-6 py-4">
            {loading ? (
              <div className="py-12 text-center text-zinc-400">Loading entries...</div>
            ) : activeTab === 'active' ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="text-left">Date</th>
                      <th className="text-left">Symbol</th>
                      <th className="text-left">Type</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Strike</th>
                      <th>Exp</th>
                      <th className="text-right">DTE</th>
                      <th className="text-right">Stock</th>
                      <th className="text-right">Amount</th>
                      <th className="text-left">Notes</th>
                      <th className="text-center">Actions</th>
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
                        <tr key={r.id}>
                          <td className="px-3 py-2">{fmtDate(r.ts)}</td>
                          <td className="px-3 py-2 font-semibold">{r.symbol}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs ${
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
                          <td className="max-w-[150px] truncate px-3 py-2 text-xs text-zinc-500">
                            {r.notes || '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleEditClick(r)}
                              className="mr-2 text-blue-400 transition-colors hover:text-blue-300"
                              title="Edit entry"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteClick(r)}
                              className="text-red-400 transition-colors hover:text-red-300"
                              title="Delete entry"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {entries.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-zinc-500" colSpan={11}>
                          No entries yet. Click "New Entry" to start tracking your wheel strategy.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              // Deleted Entries Table
              <div className="table-container border-red-500/20">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="text-left">Deleted Date</th>
                      <th className="text-left">Symbol</th>
                      <th className="text-left">Type</th>
                      <th className="text-left">Original Date</th>
                      <th className="text-right">Amount</th>
                      <th className="text-left">Delete Reason</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedEntries.map((r: Entry) => (
                      <tr key={r.id} className="opacity-60">
                        <td className="px-3 py-2 text-zinc-500">
                          {r.deleted_at ? fmtDate(r.deleted_at) : '—'}
                        </td>
                        <td className="px-3 py-2 font-semibold text-zinc-400">{r.symbol}</td>
                        <td className="px-3 py-2 text-zinc-500">{r.type}</td>
                        <td className="px-3 py-2 text-zinc-500">{fmtDate(r.ts)}</td>
                        <td
                          className={`px-3 py-2 text-right font-semibold ${r.amount >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}
                        >
                          {fmtMoney(r.amount)}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-xs text-zinc-500">
                          {r.edit_reason || 'No reason provided'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleRestoreClick(r)}
                            className="text-green-400 transition-colors hover:text-green-300"
                            title="Restore entry"
                          >
                            ♻️ Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                    {deletedEntries.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-zinc-500" colSpan={7}>
                          No deleted entries. Deleted entries will appear here and can be restored.
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
          <div className="mb-4 grid grid-cols-3 gap-2">
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Entry</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="✏️ Edit Entry"
        size="lg"
      >
        <EditEntryForm
          entry={editingEntry}
          onSave={handleEditSave}
          onCancel={() => {
            setEditModalOpen(false);
            setEditingEntry(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default JournalPage;
