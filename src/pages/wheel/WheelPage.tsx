import { useEffect } from 'react';
import { WheelContainer } from '@/pages/wheel/components/layout/WheelContainer';
import { WheelHeader } from '@/pages/wheel/components/layout/WheelHeader';
import { SummaryMetrics } from '@/pages/wheel/components/metrics/SummaryMetrics';
import { useWheelDatabase } from '@/hooks/useWheelDatabase';
import { useWheelStore } from '@/stores/useWheelStore';
import { WheelPhaseCard } from '@/pages/wheel/components/wheel-phase/WheelPhaseCard';
import { ExpirationsCard } from '@/pages/wheel/components/expirations/ExpirationsCard';
import { AlertsCard } from '@/pages/wheel/components/alerts/AlertsCard';
import { SharesCard } from '@/pages/wheel/components/shares/SharesCard';
import { ActionsDrawer } from '@/pages/wheel/components/drawers/ActionsDrawer';
import { TickerDrawer } from '@/pages/wheel/components/drawers/TickerDrawer';
import { DataExplorerModal } from '@/pages/wheel/components/data/DataExplorerModal';

export default function WheelPage() {
  const { data, error, loading, reload } = useWheelDatabase();
  const setLots = useWheelStore(s => s.setLots);
  const setPositions = useWheelStore(s => s.setPositions);
  const setEarnings = useWheelStore(s => s.setEarnings);
  const setReloadFn = useWheelStore(s => s.setReloadFn);

  // Store the reload function so TradeTab can call it
  useEffect(() => {
    setReloadFn(reload);
    return () => setReloadFn(null);
  }, [reload, setReloadFn]);

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
      };
      const positions = ((data.positions || []) as RawPosition[]).map(p => ({
        id: p.id || crypto.randomUUID(),
        ticker: p.ticker || '',
        qty: p.qty || 0,
        strike: p.strike || 0,
        entry: p.entry || 0,
        mark: p.mark || 0,
        dte: p.dte || 0,
        type: p.type === 'C' || p.type === 'P' ? p.type : 'P',
        side: p.side === 'S' || p.side === 'B' ? p.side : 'S',
        opened: new Date().toISOString().slice(0, 10),
      }));
      setPositions(positions);

      setEarnings(data.earningsCalendar || {});
    } catch (e) {
      console.error('WheelPage load error:', e);
    }
  }, [data, setLots, setPositions, setEarnings]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
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
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Database Error</h1>
          <p className="text-slate-400">{String(error)}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded bg-emerald-600 px-4 py-2"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <WheelContainer>
      <WheelHeader />
      <div className="flex justify-center px-4 py-8 sm:px-6 lg:px-8">
        <main className="neon-panel relative grid w-full max-w-6xl grid-cols-3 gap-6 rounded-3xl px-6 py-8">
          <div className="col-span-2 space-y-6">
            <SummaryMetrics />
            <WheelPhaseCard />
            <ExpirationsCard />
          </div>
          <div className="space-y-6">
            <AlertsCard />
            <SharesCard />
          </div>
        </main>
      </div>
      <ActionsDrawer />
      <TickerDrawer />
      <DataExplorerModal />
    </WheelContainer>
  );
}
