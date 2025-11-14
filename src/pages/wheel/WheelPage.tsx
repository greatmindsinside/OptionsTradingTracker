import { lazy, Suspense, useEffect, useMemo } from 'react';

import { ToastContainer } from '@/components/ui/Toast';
import { useEarningsSync } from '@/hooks/useEarningsSync';
import { useWheelDatabase } from '@/hooks/useWheelDatabase';
import { QuickActionFAB } from '@/pages/wheel/components/actions/QuickActionFAB';
import { AlertsCard } from '@/pages/wheel/components/alerts/AlertsCard';
import { ActionsDrawer } from '@/pages/wheel/components/drawers/ActionsDrawer';
import { ExpirationsCard } from '@/pages/wheel/components/expirations/ExpirationsCard';
import { HistoricalMinStrikesCard } from '@/pages/wheel/components/historical-min-strikes/HistoricalMinStrikesCard';
import { WheelContainer } from '@/pages/wheel/components/layout/WheelContainer';
import { SummaryMetrics } from '@/pages/wheel/components/metrics/SummaryMetrics';
import { SharesCard } from '@/pages/wheel/components/shares/SharesCard';
import { WheelPhaseCard } from '@/pages/wheel/components/wheel-phase/WheelPhaseCard';
import { useToastStore } from '@/stores/useToastStore';
import { useWheelStore } from '@/stores/useWheelStore';

// Lazy-load heavy components that are not immediately visible
const TickerDrawer = lazy(() =>
  import('@/pages/wheel/components/drawers/TickerDrawer').then(module => ({
    default: module.TickerDrawer,
  }))
);
const DataExplorerModal = lazy(() =>
  import('@/pages/wheel/components/data/DataExplorerModal').then(module => ({
    default: module.DataExplorerModal,
  }))
);
const ObserverTerminal = lazy(() =>
  import('@/components/debug/ObserverTerminal').then(module => ({
    default: module.ObserverTerminal,
  }))
);

export default function WheelPage() {
  const { data, error, loading, reload } = useWheelDatabase();
  const setLots = useWheelStore(s => s.setLots);
  const setPositions = useWheelStore(s => s.setPositions);
  const setEarnings = useWheelStore(s => s.setEarnings);
  const setReloadFn = useWheelStore(s => s.setReloadFn);
  const toasts = useToastStore(s => s.toasts);
  const removeToast = useToastStore(s => s.removeToast);

  // Extract tickers from data
  const tickers = useMemo(() => {
    if (!data) return [];
    return data.tickers || [];
  }, [data]);

  // Sync earnings data
  const { syncEarnings, status } = useEarningsSync(tickers);

  // Trigger earnings sync when tickers change
  useEffect(() => {
    if (tickers.length > 0) {
      syncEarnings();
    }
  }, [tickers, syncEarnings]);

  // Store the reload function so TradeTab can call it
  useEffect(() => {
    setReloadFn(reload);
    return () => setReloadFn(null);
  }, [reload, setReloadFn]);

  // Intercept console.log for terminal (DISABLED - causes performance issues)
  // useEffect(() => {
  //   interceptConsoleLog();
  // }, []);

  // Load data into store on mount
  useEffect(() => {
    if (!data) return;
    try {
      type RawLot = { ticker: string; qty: number; costPerShare: number };
      const lots = ((data.shareLots || []) as RawLot[]).map((lot, idx: number) => ({
        id: `lot-${lot.ticker}-${idx}`,
        ticker: lot.ticker,
        qty: lot.qty,
        cost: lot.costPerShare,
        opened: new Date().toISOString().slice(0, 10),
      }));
      setLots(lots);

      type RawPosition = {
        id?: string;
        ticker?: string;
        qty?: number;
        strike?: number;
        entry?: number;
        mark?: number;
        dte?: number;
        type?: 'C' | 'P';
        side?: 'S' | 'B';
        opened?: string;
      };
      const rawPositions = ((data.positions || []) as RawPosition[]).map(p => ({
        id: p.id || crypto.randomUUID(),
        ticker: p.ticker || '',
        qty: p.qty || 0,
        strike: p.strike || 0,
        entry: p.entry || 0,
        mark: p.mark || 0,
        dte: p.dte || 0,
        type: p.type === 'C' || p.type === 'P' ? p.type : 'P',
        side: p.side === 'S' || p.side === 'B' ? p.side : 'S',
        opened: p.opened || new Date().toISOString().slice(0, 10),
      }));

      // Apply DTE overrides from localStorage
      import('@/utils/dteOverrides').then(({ applyDteOverrides }) => {
        const positions = applyDteOverrides(rawPositions);
        setPositions(positions);
        // console.log('✅ Applied DTE overrides to', positions.length, 'positions');
      });

      setEarnings(data.earningsCalendar || {});
    } catch (e) {
      console.error('WheelPage load error:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]); // Zustand setters (setLots, setPositions, setEarnings) are stable

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-slate-100"
        style={{ backgroundColor: 'rgba(2, 6, 23, 1)' }}
      >
        <div className="text-center">
          <div className="mb-4 text-4xl">💸</div>
          <h1 className="mb-2 text-2xl font-bold">Loading Wheel Tracker...</h1>
          <p className="text-slate-400">Initializing database connection</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-slate-100"
        style={{ backgroundColor: 'rgba(2, 6, 23, 1)' }}
      >
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Database Error</h1>
          <p className="text-slate-400">{String(error)}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded border border-teal-500 bg-teal-500/20 px-4 py-2 text-teal-300 transition-colors hover:bg-teal-500/30"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <WheelContainer>
      <div className="flex justify-center px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        <main className="glass-panel-dark light-refraction shimmer-effect relative grid w-full max-w-6xl grid-cols-3 gap-6 rounded-3xl px-6 py-8">
          <div className="col-span-2 space-y-6">
            <SummaryMetrics />
            <div className="py-3">
              <WheelPhaseCard />
            </div>
            <ExpirationsCard />
          </div>
          <div className="space-y-6">
            <div className="py-3">
              <AlertsCard />
            </div>
            <div className="py-3">
              <SharesCard />
            </div>
            <div className="py-3">
              <HistoricalMinStrikesCard />
            </div>
          </div>
        </main>
      </div>
      <ActionsDrawer />
      <Suspense fallback={null}>
        <TickerDrawer />
        <DataExplorerModal />
        <ObserverTerminal />
      </Suspense>
      {status.isLoading && (
        <div className="fixed right-4 bottom-4 rounded-lg border border-[rgba(245,179,66,0.3)] bg-[rgba(11,15,14,0.9)] px-4 py-2 text-sm text-[#F5B342] shadow-lg backdrop-blur">
          Syncing earnings: {status.progress}/{status.total}
        </div>
      )}
      <QuickActionFAB />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </WheelContainer>
  );
}
