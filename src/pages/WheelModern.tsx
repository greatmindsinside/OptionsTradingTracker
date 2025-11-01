import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useWheelDatabase } from '../hooks/useWheelDatabase';

/**
 * MODERN WHEEL TRACKER PAGE
 *
 * A streamlined, production-ready wheel strategy tracker with:
 * - Live database integration
 * - Slide-out action drawer for all manual inputs
 * - Per-ticker context drawers
 * - Auto-refreshing metrics and alerts
 * - Inline expiration editing
 * - Full ledger/data explorer
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type Side = 'B' | 'S';
type OptType = 'C' | 'P';
type WheelPhase =
  | 'Sell Cash Secured Puts'
  | 'Put Expires Worthless'
  | 'Buy At Strike'
  | 'Sell Covered Calls'
  | 'Call Expires Worthless'
  | 'Call Exercised Sell Shares'
  | 'Repeat';

type Position = {
  id: string;
  ticker: string;
  qty: number;
  strike: number;
  entry: number;
  mark: number;
  dte: number;
  type: OptType;
  side: Side;
  opened: string;
};

type Lot = {
  id: string;
  ticker: string;
  qty: number;
  cost: number;
  opened: string;
};

type LedgerEvent = {
  id: string;
  kind: string;
  when: string;
  symbol?: string;
  meta?: Record<string, unknown>;
};

type ExpRow = {
  id: string;
  symbol: string;
  type: OptType;
  strike: number;
  expiration: string;
  side: Side;
  qty: number;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const fmt = (n: number, d = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const ymd = (date: Date) => date.toISOString().slice(0, 10);
const todayYMD = () => ymd(new Date());
const daysTo = (t: string) =>
  Math.ceil(
    (new Date(t + 'T00:00:00').getTime() - new Date(todayYMD() + 'T00:00:00').getTime()) / 864e5
  );
const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 864e5);
const pctMaxShortCall = (e: number, m: number) =>
  e <= 0 ? 0 : Math.min(100, Math.max(0, ((e - Math.max(0, m)) / e) * 100));
const computeCover = (sh: number, sc: number) => ({
  covered: Math.min(sh, sc),
  uncovered: Math.max(0, sh - sc),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WheelModern() {
  // Database integration with error handling
  const { data: wheelData, db, error: dbError, loading: dbLoading } = useWheelDatabase();

  // State management
  const [lots, setLots] = useState<Lot[]>([]);
  const [pos, setPos] = useState<Position[]>([]);
  const [earn, setEarn] = useState<Record<string, string>>({});
  const [ledger, setLedger] = useState<LedgerEvent[]>([]);
  const [phaseOverrides, setPhaseOverrides] = useState<Record<string, WheelPhase>>({});

  // UI state
  const [q, setQ] = useState('');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsTab, setActionsTab] = useState<'Import' | 'Manual' | 'Phase' | 'Data'>('Import');
  const [contextSymbol, setContextSymbol] = useState<string | null>(null);
  const [dataOpen, setDataOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Debug logging
  useEffect(() => {
    console.log('WheelModern render state:', {
      dbLoading,
      dbError,
      hasData: !!wheelData,
      hasDb: !!db,
    });
  }, [dbLoading, dbError, wheelData, db]);

  // Add error logging
  useEffect(() => {
    if (dbError) {
      console.error('Database error:', dbError);
    }
  }, [dbError]);

  // Load data from database with error handling
  useEffect(() => {
    try {
      if (wheelData) {
        // Transform ShareLot[] to Lot[] - use correct property names from useWheelDatabase
        const transformedLots: Lot[] = (wheelData.shareLots || []).map((lot, idx) => ({
          id: `lot-${lot.ticker}-${idx}`,
          ticker: lot.ticker,
          qty: lot.qty,
          cost: lot.costPerShare,
          opened: todayYMD(),
        }));
        setLots(transformedLots);

        // Transform positions and ensure opened field is always set
        const transformedPos: Position[] = (wheelData.positions || []).map(p => ({
          id: p.id || crypto.randomUUID(),
          ticker: p.ticker || '',
          qty: p.qty || 0,
          strike: p.strike || 0,
          entry: p.entry || 0,
          mark: p.mark || 0,
          dte: p.dte || 0,
          type: p.type === 'C' || p.type === 'P' ? p.type : 'P',
          side: p.side === 'S' || p.side === 'B' ? p.side : 'S',
          opened: todayYMD(), // Default to today if not provided
        }));
        setPos(transformedPos);

        setEarn(wheelData.earningsCalendar || {});
      }
    } catch (e) {
      console.error('Error loading wheel data:', e);
    }
  }, [wheelData]);

  // Computed values - must be before any conditional returns
  const tickers = useMemo(
    () => Array.from(new Set([...pos.map(p => p.ticker), ...lots.map(l => l.ticker)])).sort(),
    [pos, lots]
  );
  const ft = useMemo(
    () => tickers.filter(t => t.toLowerCase().includes(q.toLowerCase())),
    [tickers, q]
  );

  const premiumThisWeek = useMemo(() => {
    const c = pos.filter(p => p.side === 'S').reduce((s, p) => s + p.entry * 100 * p.qty, 0);
    const d = pos.filter(p => p.side === 'B').reduce((s, p) => s + p.entry * 100 * p.qty, 0);
    return c - d;
  }, [pos]);

  const capitalInPuts = useMemo(
    () =>
      pos
        .filter(p => p.type === 'P' && p.side === 'S')
        .reduce((s, p) => s + p.strike * 100 * p.qty, 0),
    [pos]
  );

  const sharesForCalls = useMemo(() => {
    const sharesBy = new Map<string, number>();
    lots.forEach(l => sharesBy.set(l.ticker, (sharesBy.get(l.ticker) || 0) + l.qty));
    const shortBy = new Map<string, number>();
    pos
      .filter(p => p.type === 'C' && p.side === 'S')
      .forEach(p => shortBy.set(p.ticker, (shortBy.get(p.ticker) || 0) + p.qty * 100));
    let covered = 0;
    shortBy.forEach((sc, t) => {
      covered += Math.min(sharesBy.get(t) || 0, sc);
    });
    return { covered, cnt: shortBy.size };
  }, [lots, pos]);

  const expirations: ExpRow[] = useMemo(
    () =>
      pos.map(p => ({
        id: p.id,
        symbol: p.ticker,
        type: p.type,
        strike: p.strike,
        expiration: expFor(p),
        side: p.side,
        qty: p.qty,
      })),
    [pos]
  );

  // Show loading state while database initializes - after all hooks
  if (dbLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💸</div>
          <h1 className="text-2xl font-bold mb-2">Loading Wheel Tracker...</h1>
          <p className="text-slate-400">Initializing database connection</p>
        </div>
      </div>
    );
  }

  // Show error state if database fails
  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Database Error</h1>
          <p className="text-slate-400">{String(dbError)}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-emerald-600 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  function expFor(p: Position) {
    if (!p.opened) return todayYMD();
    const b = new Date(p.opened);
    if (isNaN(b.getTime())) return todayYMD();
    b.setDate(b.getDate() + Math.max(0, p.dte));
    return ymd(b);
  }

  function phaseFor(s: string): WheelPhase {
    if (phaseOverrides[s]) return phaseOverrides[s];
    const hasShares = lots.some(l => l.ticker === s && l.qty > 0);
    const hasShortPuts = pos.some(p => p.ticker === s && p.type === 'P' && p.side === 'S');
    const hasShortCalls = pos.some(p => p.ticker === s && p.type === 'C' && p.side === 'S');
    if (!hasShares && !hasShortPuts && !hasShortCalls) return 'Sell Cash Secured Puts';
    if (!hasShares && hasShortPuts) return 'Sell Cash Secured Puts';
    if (hasShares && !hasShortCalls) return 'Sell Covered Calls';
    if (hasShares && hasShortCalls) return 'Call Expires Worthless';
    return 'Repeat';
  }

  // CSV Import
  const handleImportClick = () => fileRef.current?.click();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a valid CSV file.');
      return;
    }

    setImporting(true);
    try {
      const { BatchImportService } = await import('../modules/import/batch-import');
      const { initDatabase } = await import('../modules/db/sqlite');
      const { PortfolioDAO } = await import('../modules/db/portfolio-dao');

      const importDb = db ?? (await initDatabase());
      const portfolioDAO = new PortfolioDAO(importDb);

      let portfolioId = 1;
      const existing = await portfolioDAO.findById(portfolioId);
      if (!existing.success) {
        const created = await portfolioDAO.create({
          name: 'Default Portfolio',
          broker: 'robinhood',
          account_type: 'cash',
          description: 'Auto-created portfolio',
          is_active: true,
        });
        if (created.success && created.data?.id) {
          portfolioId = created.data.id;
          await importDb.persist();
        }
      }

      const importService = new BatchImportService(importDb);
      const results = await importService.importFromFile(selectedFile, {
        portfolioId,
        autoDetectBroker: true,
        forceBrokerType: 'robinhood',
        stopOnError: false,
        skipInvalidRecords: true,
      });

      await importDb.persist();

      if (results.success) {
        const { dataUpdateEmitter } = await import('../utils/data-events');
        dataUpdateEmitter.emit('trades_imported', results);
        setLedger(l => [
          ...l,
          {
            id: crypto.randomUUID(),
            kind: 'trade_imported',
            when: new Date().toISOString(),
            meta: { file: selectedFile.name },
          },
        ]);
        alert(`Import successful! Imported ${results.successfulRecords} trades.`);
        setActionsOpen(false);
      } else {
        alert('Import failed. See console for details.');
      }
    } catch (e) {
      console.error('Import error:', e);
      alert(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // Manual data entry
  function addSymbol(sym: string) {
    if (!sym) return;
    const S = sym.toUpperCase();
    if (tickers.includes(S)) return alert('Already tracked');
    setLots(v => [
      { id: crypto.randomUUID(), ticker: S, qty: 0, cost: 0, opened: todayYMD() },
      ...v,
    ]);
    setLedger(l => [
      ...l,
      { id: crypto.randomUUID(), kind: 'stock_added', when: new Date().toISOString(), symbol: S },
    ]);
  }

  function addLot(sym: string, qty: number, cost: number, opened?: string) {
    const S = sym.toUpperCase();
    setLots(v => [
      { id: crypto.randomUUID(), ticker: S, qty, cost, opened: opened || todayYMD() },
      ...v,
    ]);
    setLedger(l => [
      ...l,
      {
        id: crypto.randomUUID(),
        kind: 'lot_added',
        when: new Date().toISOString(),
        symbol: S,
        meta: { qty, cost },
      },
    ]);
  }

  function addOption(
    sym: string,
    type: OptType,
    side: Side,
    qty: number,
    strike: number,
    entry: number,
    mark: number,
    dte: number,
    opened?: string
  ) {
    const S = sym.toUpperCase();
    setPos(p => [
      {
        id: crypto.randomUUID(),
        ticker: S,
        qty,
        strike,
        entry,
        mark,
        dte,
        type,
        side,
        opened: opened || todayYMD(),
      },
      ...p,
    ]);
    setLedger(l => [
      ...l,
      {
        id: crypto.randomUUID(),
        kind: 'option_added',
        when: new Date().toISOString(),
        symbol: S,
        meta: { type, side, qty, strike, entry, dte },
      },
    ]);
  }

  function addEarnings(sym: string, ds: string) {
    if (!sym || !ds) return;
    const S = sym.toUpperCase();
    setEarn(e => ({ ...e, [S]: ds }));
    setLedger(l => [
      ...l,
      {
        id: crypto.randomUUID(),
        kind: 'earnings_upserted',
        when: new Date().toISOString(),
        symbol: S,
        meta: { date: ds },
      },
    ]);
  }

  function saveExpiration(row: ExpRow, newDate: string) {
    setPos(prev =>
      prev.map(p =>
        p.id === row.id ? { ...p, dte: Math.max(0, daysBetween(p.opened, newDate)) } : p
      )
    );
    setLedger(l => [
      ...l,
      {
        id: crypto.randomUUID(),
        kind: 'expiration_updated',
        when: new Date().toISOString(),
        symbol: row.symbol,
        meta: { from: row.expiration, to: newDate },
      },
    ]);
  }

  // Components
  const Card: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({
    title,
    right,
    children,
  }) => (
    <div className="rounded-2xl border border-green-500/20 bg-linear-to-br from-black/80 to-zinc-950/90 backdrop-blur-xl p-4 shadow-lg shadow-green-500/10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-green-400 font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );

  const Metric: React.FC<{ label: string; value: string; sub?: string; testId?: string }> = ({
    label,
    value,
    sub,
    testId,
  }) => (
    <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 backdrop-blur-xl p-4 shadow-lg shadow-green-500/20 hover:shadow-green-400/30 transition-shadow">
      <div className="text-xs text-green-400/80 font-medium">{label}</div>
      <div className="text-2xl font-bold mt-1 text-green-400" data-testid={testId}>
        {value}
      </div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );

  const RowBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({
    onClick,
    children,
  }) => (
    <button
      onClick={onClick}
      className="text-xs px-2 py-1 rounded border border-green-500/40 bg-green-500/10 hover:bg-green-500/20 hover:border-green-400/60 transition-all text-green-400"
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-zinc-100 cyber-bg">
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-24 -left-20 rounded-full bg-green-500/15 blur-3xl h-112 aspect-square" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 rounded-full bg-green-400/20 blur-3xl h-128 aspect-square" />

      {/* Header */}
      <header className="wheel-header">
        <div className="wheel-header__inner">
          {/* Brand/Title */}
          <h1 className="wheel-header__brand" data-testid="wheel.title">
            💰 Wheel To Tendies Pipeline
          </h1>

          {/* Search */}
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
                id="ticker-filter"
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search tickers..."
                className="wheel-header__search-input"
                aria-label="Filter tickers"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="wheel-header__actions">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="wheel.import.input"
            />
            <button
              onClick={() => {
                setActionsOpen(true);
                setActionsTab('Import');
              }}
              className="wheel-header__btn wheel-header__btn--primary"
              data-testid="wheel.action.open"
              disabled={importing}
              aria-busy={importing}
            >
              {importing ? '⏳ Importing...' : '💸 Premium Printer'}
            </button>
            <button
              onClick={() => setDataOpen(true)}
              className="wheel-header__btn wheel-header__btn--secondary"
            >
              📊 Ledger
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {/* Centering wrapper ensures the panel is always centered regardless of display mode */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
        <main className="relative w-full max-w-6xl px-6 py-8 neon-panel rounded-3xl grid grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <Metric
                label="💰 Premium This Week"
                value={`$${fmt(Math.abs(premiumThisWeek), 2)}`}
                sub="Net option cash flow"
                testId="premium-this-week-value"
              />
              <Metric
                label="🏦 Capital In Puts"
                value={`$${fmt(capitalInPuts, 0)}`}
                sub="Open short puts collateral"
                testId="capital-in-puts-value"
              />
              <Metric
                label="🛡️ Shares For Calls"
                value={`${sharesForCalls.covered}`}
                sub={`${sharesForCalls.cnt} symbols`}
                testId="shares-for-calls-value"
              />
            </div>

            {/* Wheel Phase By Ticker */}
            <Card title="📈 Wheel Phase">
              <div className="grid grid-cols-2 gap-3">
                {ft.map(t => (
                  <div
                    key={t}
                    className="rounded-xl border border-green-500/20 bg-zinc-950/60 p-3 flex items-center gap-3 hover:border-green-400/40 transition-colors"
                  >
                    <div
                      className="text-lg font-semibold cursor-pointer text-green-400 hover:text-green-300 transition-colors"
                      onClick={() => setContextSymbol(t)}
                    >
                      {t}
                    </div>
                    <span className="text-xs px-2 py-1 rounded border border-green-500/40 bg-green-500/15 text-green-400">
                      {phaseFor(t)}
                    </span>
                    <div className="text-xs text-zinc-500 ml-auto">Earnings {earn[t] || 'TBD'}</div>
                    <RowBtn onClick={() => setContextSymbol(t)}>Open</RowBtn>
                  </div>
                ))}
              </div>
            </Card>

            {/* Upcoming Expirations */}
            <Card title="⏳ Upcoming Expirations">
              <div className="space-y-2">
                {expirations.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-4">
                    No upcoming expirations
                  </div>
                )}
                {expirations
                  .sort((a, b) => a.expiration.localeCompare(b.expiration))
                  .map(row => {
                    const d = daysTo(row.expiration);
                    const color =
                      d === 0
                        ? 'border-red-500/60 bg-red-500/10 text-red-300'
                        : d <= 7
                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                          : 'border-green-500/20 bg-zinc-950/40';
                    return (
                      <div
                        key={row.id}
                        className={`rounded-lg border ${color} p-3 flex items-center gap-3 hover:border-green-400/40 transition-colors`}
                      >
                        <div
                          className="font-semibold cursor-pointer text-green-400 hover:text-green-300 transition-colors"
                          onClick={() => setContextSymbol(row.symbol)}
                        >
                          {row.symbol}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {row.type} {row.strike}
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded border ${d === 0 ? 'border-red-500/40 bg-red-500/20 badge-urgent' : d <= 7 ? 'border-amber-500/40 bg-amber-500/20 badge-glow' : 'border-green-500/40 bg-green-500/15'}`}
                        >
                          {row.expiration} · DTE {d}
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <InlineDateEdit
                            date={row.expiration}
                            onSave={ymd => saveExpiration(row, ymd)}
                          />
                          <RowBtn onClick={() => setContextSymbol(row.symbol)}>Plan Roll</RowBtn>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>

          {/* Right Column - Alerts & Info */}
          <div className="space-y-6">
            <Card
              title="📣 Alerts"
              right={<span className="text-xs text-slate-500">auto from data</span>}
            >
              <AlertList pos={pos} earn={earn} onOpenSymbol={setContextSymbol} />
            </Card>
            <Card
              title="📦 Shares"
              right={
                <button className="text-xs underline" onClick={() => setDataOpen(true)}>
                  Show
                </button>
              }
            >
              <LotTable lots={lots} pos={pos} onOpenSymbol={setContextSymbol} />
            </Card>
          </div>
        </main>
      </div>

      {/* Actions Drawer */}
      {actionsOpen && (
        <div className="fixed inset-0 z-20">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setActionsOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[520px] bg-black border-l border-green-500/30 shadow-2xl shadow-green-500/20 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold text-green-400">🧰 Actions</div>
              <button
                className="px-2 py-1 rounded border border-green-500/30 hover:border-green-400/50 hover:bg-zinc-950/60 transition-all text-green-400"
                onClick={() => setActionsOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex gap-2 text-sm mb-4">
              {(['Import', 'Manual', 'Phase', 'Data'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActionsTab(t)}
                  className={`px-3 py-1 rounded border transition-all ${actionsTab === t ? 'border-green-400 bg-green-500/15 text-green-400 shadow-lg shadow-green-500/30' : 'border-zinc-700 hover:border-green-500/30 text-zinc-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {actionsTab === 'Import' && (
              <div className="space-y-3" data-testid="drawer.import">
                <div className="text-sm text-zinc-400">
                  Import Robinhood CSV. Creates trades and emits a data updated event.
                </div>
                <button
                  className="px-3 py-2 rounded border border-green-500/40 bg-green-500/15 hover:bg-green-500/25 hover:border-green-400/60 transition-all text-green-400"
                  onClick={handleImportClick}
                  data-testid="drawer.import.choose"
                  disabled={importing}
                >
                  {importing ? 'Importing...' : 'Choose File'}
                </button>
                <div className="text-xs text-zinc-500">
                  After import the summary and tables will refresh.
                </div>
              </div>
            )}
            {actionsTab === 'Manual' && (
              <ManualForms
                onAddSymbol={addSymbol}
                onAddEarnings={addEarnings}
                onAddOption={addOption}
                onAddLot={addLot}
              />
            )}
            {actionsTab === 'Phase' && (
              <PhaseOverride
                tickers={tickers}
                current={phaseFor}
                onOpenSymbol={setContextSymbol}
                onSave={(s, p) => {
                  setPhaseOverrides(v => ({ ...v, [s]: p }));
                  setLedger(l => [
                    ...l,
                    {
                      id: crypto.randomUUID(),
                      kind: 'phase_overridden',
                      when: new Date().toISOString(),
                      symbol: s,
                      meta: { phase: p },
                    },
                  ]);
                }}
              />
            )}
            {actionsTab === 'Data' && (
              <DataExplorer lots={lots} pos={pos} earn={earn} ledger={ledger} />
            )}
          </div>
        </div>
      )}

      {/* Ticker Context Drawer */}
      {contextSymbol && (
        <TickerDrawer
          symbol={contextSymbol}
          lots={lots}
          pos={pos}
          earn={earn}
          close={() => setContextSymbol(null)}
        />
      )}

      {/* Data Explorer Modal */}
      {dataOpen && (
        <div className="fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDataOpen(false)}
          />
          <div className="absolute inset-10 bg-black border border-green-500/30 rounded-2xl p-4 overflow-y-auto shadow-2xl shadow-green-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold text-green-400">🗃️ Database Preview</div>
              <button
                className="px-2 py-1 rounded border border-green-500/30 hover:border-green-400/50 hover:bg-zinc-950/60 transition-all text-green-400"
                onClick={() => setDataOpen(false)}
              >
                Close
              </button>
            </div>
            <DataExplorer lots={lots} pos={pos} earn={earn} ledger={ledger} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const InlineDateEdit: React.FC<{ date: string; onSave: (ymd: string) => void }> = ({
  date,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(date);
  useEffect(() => setVal(date), [date]);
  if (!editing)
    return (
      <button
        className="text-xs px-2 py-1 rounded border border-green-500/30 hover:border-green-400/50 transition-colors text-green-400"
        onClick={() => setEditing(true)}
      >
        📝 Edit
      </button>
    );
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        className="text-xs px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
        value={val}
        onChange={e => setVal(e.target.value)}
      />
      <button
        className="text-xs px-2 py-1 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
        onClick={() => {
          onSave(val);
          setEditing(false);
        }}
      >
        Save
      </button>
      <button
        className="text-xs px-2 py-1 rounded border border-zinc-600 text-zinc-400 hover:border-zinc-500 transition-colors"
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
    </div>
  );
};

const AlertList: React.FC<{
  pos: Position[];
  earn: Record<string, string>;
  onOpenSymbol: (s: string) => void;
}> = ({ pos, earn, onOpenSymbol }) => {
  const alerts = useMemo(() => {
    const a: { id: string; text: string; sym: string }[] = [];
    pos.forEach(p => {
      if (p.type === 'C' && p.side === 'S') {
        const pct = pctMaxShortCall(p.entry, p.mark);
        if (pct >= 60)
          a.push({
            id: `t-${p.id}`,
            sym: p.ticker,
            text: `${p.ticker} call ${p.strike} at ${pct.toFixed(0)}% max profit. Consider close or roll.`,
          });
      }
      if (p.dte <= 2)
        a.push({
          id: `d-${p.id}`,
          sym: p.ticker,
          text: `${p.ticker} ${p.type} ${p.strike} expires in ${p.dte} day${p.dte === 1 ? '' : 's'}. Plan action.`,
        });
    });
    Object.entries(earn).forEach(([t, d]) => {
      if (daysTo(d) <= 7)
        a.push({ id: `e-${t}`, sym: t, text: `${t} earnings ${d}. Mind assignment risk.` });
    });
    return a;
  }, [pos, earn]);
  if (alerts.length === 0) return <div className="text-sm text-slate-500">All quiet</div>;
  return (
    <div className="space-y-2">
      {alerts.map(x => (
        <div
          key={x.id}
          className="text-sm p-2 rounded border border-slate-700 bg-slate-900/40 flex items-center justify-between"
        >
          <span>{x.text}</span>
          <button className="text-xs underline" onClick={() => onOpenSymbol(x.sym)}>
            Open
          </button>
        </div>
      ))}
    </div>
  );
};

const LotTable: React.FC<{ lots: Lot[]; pos: Position[]; onOpenSymbol: (s: string) => void }> = ({
  lots,
  pos,
  onOpenSymbol,
}) => {
  const rows = useMemo(() => {
    const by: Record<string, { shares: number; costSum: number }> = {};
    lots.forEach(l => {
      by[l.ticker] = by[l.ticker] || { shares: 0, costSum: 0 };
      by[l.ticker].shares += l.qty;
      by[l.ticker].costSum += l.qty * l.cost;
    });
    return Object.entries(by).map(([t, v]) => {
      const sc = pos
        .filter(p => p.ticker === t && p.type === 'C' && p.side === 'S')
        .reduce((n, p) => n + p.qty * 100, 0);
      const { covered, uncovered } = computeCover(v.shares, sc);
      const avg = v.costSum / Math.max(1, v.shares);
      return { t, shares: v.shares, covered, uncovered, avg };
    });
  }, [lots, pos]);
  return (
    <div className="text-sm">
      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr] gap-6 px-2 py-1 text-zinc-500">
        <div>Symbol</div>
        <div className="text-right">Shares</div>
        <div className="text-right">Covered</div>
        <div className="text-right">Uncovered</div>
        <div className="text-right">Avg Cost</div>
      </div>
      {rows.map(r => (
        <div
          key={r.t}
          className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr] gap-6 px-2 py-1 items-center rounded hover:bg-zinc-950/60 text-zinc-300"
        >
          <button
            className="text-left underline text-green-400 hover:text-green-300 transition-colors"
            onClick={() => onOpenSymbol(r.t)}
          >
            {r.t}
          </button>
          <div className="text-right tabular-nums">{r.shares}</div>
          <div className="text-right tabular-nums">{r.covered}</div>
          <div className="text-right tabular-nums">{r.uncovered}</div>
          <div className="text-right tabular-nums">${fmt(r.avg, 2)}</div>
        </div>
      ))}
      {rows.length === 0 && <div className="text-center text-zinc-600 py-4">No data</div>}
    </div>
  );
};

const ManualForms: React.FC<{
  onAddSymbol: (s: string) => void;
  onAddEarnings: (s: string, d: string) => void;
  onAddOption: (
    s: string,
    t: OptType,
    side: Side,
    q: number,
    strike: number,
    entry: number,
    mark: number,
    dte: number,
    opened?: string
  ) => void;
  onAddLot: (s: string, q: number, c: number, opened?: string) => void;
}> = ({ onAddSymbol, onAddEarnings, onAddOption, onAddLot }) => {
  const [sym, setSym] = useState('');
  const [esym, setEsym] = useState('');
  const [edate, setEdate] = useState('');
  return (
    <div className="space-y-6" data-testid="drawer.manual">
      <div>
        <div className="text-sm mb-2">Add Stock</div>
        <div className="flex gap-2">
          <input
            value={sym}
            onChange={e => setSym(e.target.value.toUpperCase())}
            placeholder="Symbol"
            className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 w-40 text-green-400"
          />
          <button
            className="px-3 py-2 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
            onClick={() => {
              onAddSymbol(sym);
              setSym('');
            }}
          >
            Add
          </button>
        </div>
      </div>
      <div>
        <div className="text-sm mb-2">Add Earnings</div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={esym}
            onChange={e => setEsym(e.target.value.toUpperCase())}
            placeholder="Symbol"
            className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 w-32 text-green-400"
          />
          <input
            type="date"
            value={edate}
            onChange={e => setEdate(e.target.value)}
            className="px-3 py-2 rounded bg-zinc-950/60 border border-green-500/30 w-44 text-green-400"
          />
          <button
            className="px-3 py-2 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
            onClick={() => {
              onAddEarnings(esym, edate);
              setEsym('');
              setEdate('');
            }}
          >
            Save
          </button>
        </div>
      </div>
      <div>
        <div className="text-sm mb-2">Add Option Position</div>
        <AddOptionInline
          onAdd={o =>
            onAddOption(o.sym, o.type, o.side, o.qty, o.strike, o.entry, o.mark, o.dte, o.opened)
          }
        />
      </div>
      <div>
        <div className="text-sm mb-2">Add Shares Lot</div>
        <AddLotInline onAdd={r => onAddLot(r.sym, r.qty, r.cost, r.opened)} />
      </div>
    </div>
  );
};

const AddOptionInline: React.FC<{
  onAdd: (o: {
    sym: string;
    type: OptType;
    side: Side;
    qty: number;
    strike: number;
    entry: number;
    mark: number;
    dte: number;
    opened?: string;
  }) => void;
}> = ({ onAdd }) => {
  const [sym, setSym] = useState('');
  const [type, setType] = useState<OptType>('P');
  const [side, setSide] = useState<Side>('S');
  const [qty, setQty] = useState(1);
  const [strike, setStrike] = useState(10);
  const [entry, setEntry] = useState(0.2);
  const [mark, setMark] = useState(0.1);
  const [dte, setDte] = useState(7);
  const [opened, setOpened] = useState('');
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <input
        value={sym}
        onChange={e => setSym(e.target.value.toUpperCase())}
        placeholder="Symbol"
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 w-24 text-green-400"
      />
      <select
        value={type}
        onChange={e => setType(e.target.value as OptType)}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
      >
        <option value="P">P</option>
        <option value="C">C</option>
      </select>
      <select
        value={side}
        onChange={e => setSide(e.target.value as Side)}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
      >
        <option value="S">S</option>
        <option value="B">B</option>
      </select>
      <input
        type="number"
        value={qty}
        onChange={e => setQty(parseInt(e.target.value || '1'))}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 w-20 text-green-400"
        placeholder="Qty"
      />
      <input
        type="number"
        step=".01"
        value={strike}
        onChange={e => setStrike(parseFloat(e.target.value || '0'))}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 w-24 text-green-400"
        placeholder="Strike"
      />
      <input
        type="number"
        step=".01"
        value={entry}
        onChange={e => setEntry(parseFloat(e.target.value || '0'))}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 w-24 text-green-400"
        placeholder="Entry"
      />
      <input
        type="number"
        step=".01"
        value={mark}
        onChange={e => setMark(parseFloat(e.target.value || '0'))}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 w-20 text-green-400"
        placeholder="Mark"
      />
      <input
        type="number"
        value={dte}
        onChange={e => setDte(parseInt(e.target.value || '0'))}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 w-20 text-green-400"
        placeholder="DTE"
      />
      <input
        type="date"
        value={opened}
        onChange={e => setOpened(e.target.value)}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
      />
      <button
        className="px-3 py-1 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
        onClick={() => {
          onAdd({ sym, type, side, qty, strike, entry, mark, dte, opened: opened || undefined });
          setSym('');
        }}
      >
        Add
      </button>
    </div>
  );
};

const AddLotInline: React.FC<{
  onAdd: (r: { sym: string; qty: number; cost: number; opened?: string }) => void;
}> = ({ onAdd }) => {
  const [sym, setSym] = useState('');
  const [qty, setQty] = useState(100);
  const [cost, setCost] = useState(10);
  const [opened, setOpened] = useState('');
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <input
        value={sym}
        onChange={e => setSym(e.target.value.toUpperCase())}
        placeholder="Symbol"
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 w-24 text-green-400"
      />
      <input
        type="number"
        value={qty}
        onChange={e => setQty(parseInt(e.target.value || '0'))}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 w-24 text-green-400"
        placeholder="Qty"
      />
      <input
        type="number"
        step=".01"
        value={cost}
        onChange={e => setCost(parseFloat(e.target.value || '0'))}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 w-24 text-green-400"
        placeholder="Cost"
      />
      <input
        type="date"
        value={opened}
        onChange={e => setOpened(e.target.value)}
        className="px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
      />
      <button
        className="px-3 py-1 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
        onClick={() => {
          onAdd({ sym, qty, cost, opened: opened || undefined });
          setSym('');
        }}
      >
        Add
      </button>
    </div>
  );
};

const PhaseOverride: React.FC<{
  tickers: string[];
  current: (s: string) => WheelPhase;
  onOpenSymbol: (s: string) => void;
  onSave: (s: string, p: WheelPhase) => void;
}> = ({ tickers, current, onOpenSymbol, onSave }) => (
  <div className="space-y-2" data-testid="drawer.phase">
    {tickers.map(t => (
      <div
        key={t}
        className="flex items-center gap-3 rounded border border-green-500/20 bg-zinc-950/40 p-2"
      >
        <div className="font-semibold w-16 text-green-400">{t}</div>
        <div className="text-xs px-2 py-1 rounded border border-green-500/30 bg-green-500/10 text-green-400">
          {current(t)}
        </div>
        <button
          className="text-xs px-2 py-1 rounded border border-green-500/30 hover:border-green-400/50 text-green-400 transition-colors"
          onClick={() => onOpenSymbol(t)}
        >
          Open
        </button>
        <select
          id={`phase-${t}`}
          defaultValue={current(t)}
          className="ml-auto text-xs px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
        >
          {[
            'Sell Cash Secured Puts',
            'Put Expires Worthless',
            'Buy At Strike',
            'Sell Covered Calls',
            'Call Expires Worthless',
            'Call Exercised Sell Shares',
            'Repeat',
          ].map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          className="text-xs px-2 py-1 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
          onClick={() => {
            const val = (document.getElementById(`phase-${t}`) as HTMLSelectElement)
              .value as WheelPhase;
            onSave(t, val);
          }}
        >
          Save
        </button>
      </div>
    ))}
    {tickers.length === 0 && <div className="text-sm text-zinc-600">No symbols</div>}
  </div>
);

const DataExplorer: React.FC<{
  lots: Lot[];
  pos: Position[];
  earn: Record<string, string>;
  ledger: LedgerEvent[];
}> = ({ lots, pos, earn, ledger }) => {
  const tabs = ['Overview', 'Tables', 'Ledger'] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview');
  return (
    <div className="space-y-3" data-testid="drawer.data">
      <div className="flex gap-2 text-sm">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded border transition-colors ${tab === t ? 'border-green-400 bg-green-500/15 text-green-400 shadow-lg shadow-green-500/20' : 'border-zinc-700 text-zinc-400 hover:border-green-500/30'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Overview' && (
        <div className="grid grid-cols-4 gap-3">
          <Stat
            label="Symbols"
            value={String(new Set([...pos.map(p => p.ticker), ...lots.map(l => l.ticker)]).size)}
          />
          <Stat label="Lots" value={String(lots.length)} />
          <Stat label="Positions" value={String(pos.length)} />
          <Stat label="Events" value={String(ledger.length)} />
        </div>
      )}
      {tab === 'Tables' && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MiniTable
            title="Lots"
            cols={['Ticker', 'Qty', 'Cost', 'Opened']}
            rows={lots.map(l => [l.ticker, l.qty, `$${fmt(l.cost)}`, l.opened])}
          />
          <MiniTable
            title="Positions"
            cols={['Sym', 'Type', 'Side', 'Qty', 'Strike', 'Entry', 'Mark', 'DTE']}
            rows={pos.map(p => [
              p.ticker,
              p.type,
              p.side,
              p.qty,
              p.strike,
              `$${p.entry}`,
              `$${p.mark}`,
              p.dte,
            ])}
          />
          <MiniTable
            title="Earnings"
            cols={['Symbol', 'Date']}
            rows={Object.entries(earn).map(([s, d]) => [s, d])}
          />
        </div>
      )}
      {tab === 'Ledger' && (
        <div className="text-sm space-y-1 max-h-64 overflow-auto">
          {ledger.map(e => (
            <div
              key={e.id}
              className="px-2 py-1 rounded border border-green-500/20 bg-zinc-950/40 text-zinc-300"
            >
              {e.when} · {e.kind} · {e.symbol || ''}
            </div>
          ))}
          {ledger.length === 0 && <div className="text-zinc-600">Empty</div>}
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-green-500/20 bg-zinc-950/40 p-3">
    <div className="text-xs text-zinc-500">{label}</div>
    <div className="text-lg font-semibold text-green-400">{value}</div>
  </div>
);

const MiniTable: React.FC<{ title: string; cols: string[]; rows: (string | number)[][] }> = ({
  title,
  cols,
  rows,
}) => (
  <div className="rounded-xl border border-green-500/20 bg-zinc-950/40 p-3">
    <div className="font-semibold mb-2 text-green-400">{title}</div>
    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols.length},minmax(0,1fr))` }}>
      {cols.map(c => (
        <div key={c} className="text-xs text-zinc-500 pb-1">
          {c}
        </div>
      ))}
      {rows.map((r, i) =>
        r.map((cell, j) => (
          <div key={`${i}-${j}`} className="text-sm py-1 border-t border-zinc-800 text-zinc-300">
            {cell}
          </div>
        ))
      )}
      {rows.length === 0 && <div className="col-span-full text-sm text-zinc-600 py-2">No rows</div>}
    </div>
  </div>
);

const TickerDrawer: React.FC<{
  symbol: string;
  lots: Lot[];
  pos: Position[];
  earn: Record<string, string>;
  close: () => void;
}> = ({ symbol, lots, pos, earn, close }) => {
  const L = lots.filter(l => l.ticker === symbol);
  const P = pos.filter(p => p.ticker === symbol);
  const shares = L.reduce((s, l) => s + l.qty, 0);
  const avg = L.reduce((s, l) => s + l.qty * l.cost, 0) / Math.max(1, shares);
  const shortCalls = P.filter(p => p.type === 'C' && p.side === 'S').reduce(
    (n, p) => n + p.qty * 100,
    0
  );
  const { covered, uncovered } = computeCover(shares, shortCalls);
  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div className="absolute right-0 top-0 h-full w-[560px] bg-black border-l border-green-500/30 shadow-2xl shadow-green-500/20 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold text-green-400">{symbol}</div>
          <button
            className="px-2 py-1 rounded border border-green-500/30 hover:border-green-400/50 text-green-400 transition-colors"
            onClick={close}
          >
            Close
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Stat label="Shares" value={String(shares)} />
          <Stat label="Covered" value={String(covered)} />
          <Stat label="Uncovered" value={String(uncovered)} />
          <Stat label="Avg Cost" value={`$${fmt(avg || 0, 2)}`} />
        </div>
        <MiniTable
          title="Positions"
          cols={['Type', 'Side', 'Qty', 'Strike', 'Entry', 'Mark', 'DTE']}
          rows={P.map(p => [p.type, p.side, p.qty, p.strike, `$${p.entry}`, `$${p.mark}`, p.dte])}
        />
        <div className="mt-4 text-sm text-zinc-500">Earnings {earn[symbol] || 'TBD'}</div>
        <div className="mt-4 flex gap-2">
          <button className="px-3 py-2 rounded border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors">
            💵 Sell Call
          </button>
          <button className="px-3 py-2 rounded border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors">
            🔁 Roll
          </button>
          <button className="px-3 py-2 rounded border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
