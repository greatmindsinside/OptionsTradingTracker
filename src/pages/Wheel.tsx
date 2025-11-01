import React, { useState, useEffect, useRef } from 'react';
import { useWheelDatabase } from '../hooks/useWheelDatabase';
import type { Position, ShareLot, WheelPhase } from '../hooks/useWheelDatabase';

// Utility functions
const format = (num: number, decimals = 2) => num.toFixed(decimals);
const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const returnOnCollateral = (entry: number, strike: number) => (entry / strike) * 100;
const pctOfMaxProfitShortCall = (entry: number, mark: number) =>
  Math.max(0, Math.min(100, ((entry - mark) / entry) * 100));

const nextPhaseFor = (ticker: string, positions: Position[], shareLots: ShareLot[]): WheelPhase => {
  const hasShares = shareLots.some(lot => lot.ticker === ticker);
  const hasCalls = positions.some(p => p.ticker === ticker && p.type === 'C' && p.side === 'S');

  if (hasShares && !hasCalls) return 'Sell Cash Secured Puts';
  if (hasCalls) return 'Call Expires Worthless';
  return 'Put Cash Secured Puts';
};

export default function WheelTracker() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [rightOpen, setRightOpen] = useState(true);
  const [importing, setImporting] = useState(false);
  const { data: wheelData, loading, error, reload, db } = useWheelDatabase();

  // Lightweight DB snapshot (raw table counts and sample symbols)
  const [dbStats, setDbStats] = useState<{
    portfolios: number;
    symbols: number;
    trades: number;
    wheel_cycles: number;
    wheel_events: number;
    sampleSymbols: string[];
  } | null>(null);
  const [dbStatsError, setDbStatsError] = useState<string | null>(null);

  type CountRow = { c: number };
  type SymbolRow = { symbol: string };

  const fetchDbStats = () => {
    if (!db) return;
    try {
      const getCount = (table: string) => {
        const rows = db.query(`SELECT COUNT(*) as c FROM ${table}`) as CountRow[];
        return Number(rows?.[0]?.c ?? 0);
      };
      const portfolios = getCount('portfolios');
      const symbols = getCount('symbols');
      const trades = getCount('trades');
      const wheel_cycles = getCount('wheel_cycles');
      const wheel_events = getCount('wheel_events');
      const sampleRows = db.query(
        'SELECT symbol FROM symbols ORDER BY symbol LIMIT 8'
      ) as SymbolRow[];
      const sampleSymbols = Array.isArray(sampleRows)
        ? sampleRows.map(r => r.symbol).filter(Boolean)
        : [];
      setDbStats({ portfolios, symbols, trades, wheel_cycles, wheel_events, sampleSymbols });
      setDbStatsError(null);
    } catch (e) {
      setDbStats(null);
      setDbStatsError(e instanceof Error ? e.message : 'Unknown DB error');
    }
  };

  useEffect(() => {
    if (db) fetchDbStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // Import CSV handlers
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate CSV file
    if (!selectedFile.name.toLowerCase().endsWith('.csv') && selectedFile.type !== 'text/csv') {
      alert('Please select a valid CSV file.');
      return;
    }

    setImporting(true);

    try {
      // Import the CSV processing modules
      const { BatchImportService } = await import('../modules/import/batch-import');
      const { initDatabase } = await import('../modules/db/sqlite');
      const { PortfolioDAO } = await import('../modules/db/portfolio-dao');

      const importDb = await initDatabase();
      const portfolioDAO = new PortfolioDAO(importDb);

      // Ensure default portfolio exists
      let portfolioId = 1;
      const existingPortfolio = await portfolioDAO.findById(portfolioId);

      if (!existingPortfolio.success) {
        const createResult = await portfolioDAO.create({
          name: 'Default Portfolio',
          broker: 'robinhood',
          account_type: 'cash',
          description: 'Auto-created portfolio for CSV imports',
          is_active: true,
        });

        if (createResult.success && createResult.data) {
          portfolioId = createResult.data.id!;
          await importDb.persist();
        } else {
          throw new Error('Failed to create default portfolio');
        }
      }

      // Import the data
      const importService = new BatchImportService(importDb);
      const results = await importService.importFromFile(selectedFile, {
        portfolioId: portfolioId,
        autoDetectBroker: true,
        forceBrokerType: 'robinhood',
        stopOnError: false,
        skipInvalidRecords: true,
      });

      // Persist all imported data
      await importDb.persist();

      if (results.success) {
        // Emit data update event
        const { dataUpdateEmitter } = await import('../utils/data-events');
        dataUpdateEmitter.emit('trades_imported', results);

        alert(`Import successful! Imported ${results.successfulRecords} trades.`);

        // Reload the wheel data
        reload();
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#1a1a1a',
          color: 'white',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div>
          <h2>Loading Wheel Data...</h2>
          <p>Connecting to database and loading your positions...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#1a1a1a',
          color: 'white',
          minHeight: '100vh',
        }}
      >
        <div>
          <h2 style={{ color: '#ef4444' }}>Database Connection Error</h2>
          <p>Failed to load wheel data: {error}</p>
          <button
            onClick={reload}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '16px',
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Handle no data state
  if (!wheelData) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#1a1a1a',
          color: 'white',
          minHeight: '100vh',
        }}
      >
        {/* Hidden file input for CSV import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <h2>No Data Available</h2>
        <p>No wheel trading data found. Import some trades to get started!</p>

        <button
          onClick={handleImportClick}
          disabled={importing}
          style={{
            padding: '12px 24px',
            backgroundColor: importing ? '#64748b' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: importing ? 'not-allowed' : 'pointer',
            marginTop: '16px',
            fontSize: '16px',
          }}
        >
          {importing ? 'Importing...' : 'Import CSV File'}
        </button>
      </div>
    );
  }

  const { positions, shareLots, alerts, earningsCalendar, tickers } = wheelData;

  const filteredTickers = tickers.filter(ticker =>
    ticker.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-950 to-black text-slate-100">
      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur overflow-hidden">
        <HeaderFX />
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-emerald-300 via-lime-300 to-emerald-500 drop-shadow-[0_0_16px_rgba(16,185,129,0.45)]">
            Marks Penny Stocks In His Socks
            <span className="ml-2 inline-block align-middle h-[1em] w-[0.1em] bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse" />
          </div>
          <div className="flex-1" />
          <div className="relative w-[320px]">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter tickers..."
              className="w-full rounded-xl bg-slate-900/70 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/40 shadow-[0_0_0_1px_rgba(59,130,246,0.15)] transition"
            />
          </div>
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="ml-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm hover:border-blue-500/40 hover:shadow-[0_0_16px_rgba(59,130,246,0.25)] transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            className="ml-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm hover:border-blue-500/40 hover:shadow-[0_0_16px_rgba(59,130,246,0.25)] transition active:scale-[0.98]"
            onClick={() => setRightOpen(s => !s)}
          >
            {rightOpen ? 'Hide' : 'Show'} Alerts
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard label="Premium This Week" value="$412.00" sub="Across 6 legs" />
            <MetricCard label="Capital In Puts" value="$14,500" sub="CSP collateral" />
            <MetricCard label="Shares For Calls" value="220" sub="Across 3 tickers" />
          </div>

          {/* Phase panel */}
          <Card
            title="Wheel Phase By Ticker"
            right={<span className="text-xs text-slate-400">Click a chip to filter tables</span>}
          >
            <div className="flex flex-wrap gap-3">
              {filteredTickers.map(t => (
                <PhaseCard
                  key={t}
                  ticker={t}
                  phase={nextPhaseFor(t, positions, shareLots)}
                  positions={positions}
                  earningsCalendar={earningsCalendar}
                />
              ))}
            </div>
          </Card>

          {/* Positions */}
          <Card title="Open Puts">
            <Table
              columns={[
                'Ticker',
                'Qty',
                'Strike',
                'Entry',
                'Mark',
                'DTE',
                'ROC',
                'Moneyness',
                'Next',
              ]}
              rows={positions
                .filter(p => p.type === 'P' && p.side === 'S')
                .map(p => [
                  p.ticker,
                  p.qty * 100,
                  `$${p.strike}`,
                  `$${format(p.entry)}`,
                  `$${format(p.mark)}`,
                  p.dte,
                  `${format(returnOnCollateral(p.entry, p.strike))}%`,
                  `${p.m > 0 ? '+' : ''}${format(p.m, 1)}%`,
                  <RowAction key={p.id} text="Plan Roll" />,
                ])}
            />
          </Card>

          <Card title="Open Calls">
            <Table
              columns={[
                'Ticker',
                'Qty',
                'Strike',
                'Entry',
                'Mark',
                'DTE',
                'Pct Max',
                'Linked Lot',
                'Next',
              ]}
              rows={positions
                .filter(p => p.type === 'C' && p.side === 'S')
                .map(p => [
                  p.ticker,
                  p.qty * 100,
                  `$${p.strike}`,
                  `$${format(p.entry)}`,
                  `$${format(p.mark)}`,
                  p.dte,
                  `${pctOfMaxProfitShortCall(p.entry, p.mark)}%`,
                  p.linkedLotId || 'none',
                  <RowAction
                    key={p.id}
                    text={
                      pctOfMaxProfitShortCall(p.entry, p.mark) >= 60 ? 'Close At Target' : 'Monitor'
                    }
                  />,
                ])}
            />
          </Card>

          <Card title="Shares">
            <Table
              columns={['Ticker', 'Lots', 'Qty', 'Cost/Share', 'Covered', 'Uncovered', 'Next']}
              rows={aggregateLots(shareLots, positions).map(r => [
                r.ticker,
                r.lots,
                r.qty,
                `$${format(r.avgCost)}`,
                `${r.covered}%`,
                r.uncovered,
                <RowAction key={r.ticker} text={r.uncovered > 0 ? 'Sell Calls' : 'All Covered'} />,
              ])}
            />
          </Card>

          {/* Ledger teaser */}
          <Card title="Recent Events">
            <ul className="space-y-2 text-sm text-slate-300">
              {[
                '2025-10-27 Sold CC ASTS 85 @ 2.10',
                '2025-10-26 Sold CC OPEN 9 @ 0.24',
                '2025-10-25 Sold CSP LUMN 1.5 @ 0.05',
                '2025-10-24 ASTS Put Assigned @ 80',
              ].map((t, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right column */}
        <div className={`lg:col-span-4 space-y-6 ${rightOpen ? '' : 'hidden lg:block'}`}>
          <Card title="Alerts Today" right={<Badge tone="amber">{alerts.length}</Badge>}>
            <div className="space-y-3">
              {alerts.length === 0 && (
                <div className="text-sm text-slate-400">No alerts. Enjoy your coffee.</div>
              )}
              {alerts.map(a => (
                <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div className="text-sm text-slate-200">{a.text}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="rounded-lg border border-slate-700 px-2 py-1 text-xs">
                      Open {a.ticker}
                    </button>
                    <button className="rounded-lg border border-blue-700 bg-blue-600/20 px-2 py-1 text-xs">
                      Suggest Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Database snapshot */}
          <Card
            title="Database Snapshot"
            right={
              <button
                className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm"
                onClick={fetchDbStats}
              >
                Refresh
              </button>
            }
          >
            {!db && <div className="text-sm text-slate-400">Database not initialized yet.</div>}
            {db && dbStatsError && <div className="text-sm text-red-400">{dbStatsError}</div>}
            {db && dbStats && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Portfolios" value={`${dbStats.portfolios}`} />
                  <MetricCard label="Symbols" value={`${dbStats.symbols}`} />
                  <MetricCard label="Trades" value={`${dbStats.trades}`} />
                  <MetricCard label="Wheel Cycles" value={`${dbStats.wheel_cycles}`} />
                  <MetricCard label="Wheel Events" value={`${dbStats.wheel_events}`} />
                </div>
                {dbStats.sampleSymbols.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Sample symbols</div>
                    <div className="flex flex-wrap gap-2">
                      {dbStats.sampleSymbols.map(sym => (
                        <span
                          key={sym}
                          className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs"
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Profit Targets">
            <div className="grid grid-cols-2 gap-4">
              {positions
                .filter(p => p.type === 'C' && p.side === 'S')
                .map(p => {
                  const pct = pctOfMaxProfitShortCall(p.entry, p.mark);
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <Ring percent={pct} />
                      <div>
                        <div className="text-slate-200 text-sm font-semibold">
                          {p.ticker} {p.type} {p.strike}
                        </div>
                        <div className="text-xs text-slate-400">Target 60% • DTE {p.dte}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function HeaderFX() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let r: number;
    const t = () => {
      setY(v => (v + 1) % 12);
      r = requestAnimationFrame(t);
    };
    r = requestAnimationFrame(t);
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(16,185,129,0.15) 0 2px, transparent 2px 6px)',
          backgroundPosition: `0 ${y}px`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 120px at 15% 0%, rgba(16,185,129,0.20), transparent 60%)',
        }}
      />
    </div>
  );
}

// Sub components
function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function PhaseCard({
  ticker,
  phase,
  positions,
  earningsCalendar,
}: {
  ticker: string;
  phase: WheelPhase;
  positions: Position[];
  earningsCalendar: Record<string, string>;
}) {
  const dteAvg = Math.max(
    0,
    Math.round(avg(positions.filter(p => p.ticker === ticker).map(p => p.dte)))
  );
  const ring = Math.max(0, Math.min(100, Math.round(100 - dteAvg * 5)));
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 pr-4">
      <Ring percent={ring} />
      <div>
        <div className="text-lg font-semibold tracking-tight">{ticker}</div>
        <div className="mt-0.5">
          <Badge tone="blue">{phase}</Badge>
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Avg DTE {dteAvg} • Earnings {earningsCalendar[ticker] || 'TBD'}
        </div>
      </div>
      <div className="flex-1" />
      <button className="rounded-xl border border-blue-700 bg-blue-600/20 px-3 py-1.5 text-sm">
        Suggest Roll
      </button>
    </div>
  );
}

function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900/60">
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 font-medium text-slate-300 whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={
                i % 2
                  ? 'bg-slate-950'
                  : 'bg-slate-900/40' + ' hover:bg-slate-800/30 transition-colors'
              }
            >
              {r.map((cell, j) => (
                <td
                  key={j}
                  className="px-3 py-2 text-slate-200 whitespace-nowrap transition-colors hover:bg-slate-800/40"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowAction({ text }: { text: string }) {
  const [state, setState] = useState(text);
  return (
    <button
      onClick={() => setState('Queued')}
      className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs hover:border-blue-500/40 hover:shadow-[0_0_12px_rgba(59,130,246,0.25)] transition active:scale-[0.98]"
    >
      {state}
    </button>
  );
}

// UI Components
function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        color: 'white',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Badge({ tone, children }: { tone: 'blue' | 'amber'; children: React.ReactNode }) {
  const colors = {
    blue: { bg: '#1e40af', text: '#bfdbfe' },
    amber: { bg: '#d97706', text: '#fef3c7' },
  };
  const color = colors[tone];

  return (
    <span
      style={{
        backgroundColor: color.bg,
        color: color.text,
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500',
      }}
    >
      {children}
    </span>
  );
}

function Ring({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 16;
  const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;

  return (
    <div style={{ position: 'relative', width: '40px', height: '40px' }}>
      <svg width="40" height="40" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="20" cy="20" r="16" fill="none" stroke="#374151" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke={percent > 75 ? '#ef4444' : percent > 50 ? '#f59e0b' : '#10b981'}
          strokeWidth="3"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '10px',
          fontWeight: '600',
          color: 'white',
        }}
      >
        {Math.round(percent)}%
      </div>
    </div>
  );
}

function aggregateLots(lots: ShareLot[], positions: Position[]) {
  const byTicker: Record<
    string,
    {
      ticker: string;
      qty: number;
      sum: number;
      lots: number;
      covered: number;
      uncovered: number;
      avgCost: number;
    }
  > = {};
  lots.forEach(l => {
    if (!byTicker[l.ticker])
      byTicker[l.ticker] = {
        ticker: l.ticker,
        qty: 0,
        sum: 0,
        lots: 0,
        covered: 0,
        uncovered: 0,
        avgCost: 0,
      };
    byTicker[l.ticker].qty += l.qty;
    byTicker[l.ticker].sum += l.qty * l.costPerShare;
    byTicker[l.ticker].lots += 1;
  });
  Object.values(byTicker).forEach(row => {
    const shortCalls = positions
      .filter(p => p.ticker === row.ticker && p.type === 'C' && p.side === 'S')
      .reduce((n, p) => n + p.qty * 100, 0);
    row.covered = Math.round(Math.min(100, (shortCalls / row.qty) * 100));
    row.uncovered = Math.max(0, row.qty - shortCalls);
    row.avgCost = row.sum / row.qty;
  });
  return Object.values(byTicker);
}
