import React from 'react';
import { useAlertGeneration } from './useAlertGeneration';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export const AlertsCard: React.FC = () => {
  const alerts = useAlertGeneration();
  const openContext = useWheelUIStore(s => s.openContext);
  return (
    <div className="rounded-2xl border border-green-500/20 bg-linear-to-br from-black/80 to-zinc-950/90 p-4 shadow-lg shadow-green-500/10 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold text-green-400">📣 Alerts</div>
        <span className="text-xs text-slate-500">auto from data</span>
      </div>
      <div className="space-y-2">
        {alerts.length === 0 && <div className="text-sm text-slate-500">All quiet</div>}
        {alerts.map(a => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/40 p-2 text-sm"
          >
            <span>{a.text}</span>
            <button className="text-xs underline" onClick={() => openContext(a.sym)}>
              Open
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
