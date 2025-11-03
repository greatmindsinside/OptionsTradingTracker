import React from 'react';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export const DataTab: React.FC = () => {
  const toggleData = useWheelUIStore(s => s.toggleData);
  return (
    <div className="space-y-3" data-testid="drawer.dataTab">
      <div className="text-sm text-zinc-400">
        Open the full-screen Data Explorer to inspect stores.
      </div>
      <button
        className="px-3 py-2 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
        onClick={toggleData}
      >
        Open Data Explorer
      </button>
      <div className="text-xs text-zinc-500">You can also open it from the header · Data</div>
    </div>
  );
};
