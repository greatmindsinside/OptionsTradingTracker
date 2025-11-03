import React from 'react';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import { DataExplorer } from './DataExplorer';

export const DataExplorerModal: React.FC = () => {
  const open = useWheelUIStore(s => s.dataOpen);
  const toggle = useWheelUIStore(s => s.toggleData);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" aria-modal>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={toggle} />
      <div className="absolute inset-6 overflow-auto rounded-2xl border border-green-500/30 bg-zinc-950/95 p-6 shadow-2xl shadow-green-500/20">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-semibold text-green-400">🧪 Data Explorer</div>
          <button onClick={toggle} className="text-sm text-zinc-400 hover:text-zinc-200">
            Close
          </button>
        </div>
        <DataExplorer />
      </div>
    </div>
  );
};
