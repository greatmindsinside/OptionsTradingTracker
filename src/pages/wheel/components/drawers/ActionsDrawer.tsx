import React from 'react';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import { TradeTab } from './TradeTab';
import { ImportTab } from './ImportTab';
import { DataTab } from './DataTab';

export const ActionsDrawer: React.FC = () => {
  const open = useWheelUIStore(s => s.actionsOpen);
  const close = useWheelUIStore(s => s.closeActions);
  const tab = useWheelUIStore(s => s.actionsTab);
  const setTab = useWheelUIStore(s => s.setActionsTab);

  if (!open) return null;

  const tabs: Array<'Trade' | 'Import' | 'Data'> = ['Trade', 'Import', 'Data'];

  return (
    <div className="fixed inset-0 z-40" aria-modal>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-green-500/30 bg-zinc-950/95 shadow-2xl shadow-green-500/20 p-4">
          <div className="flex items-center justify-between mb-3">
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
            <button onClick={close} className="text-sm text-zinc-400 hover:text-zinc-200">
              Close
            </button>
          </div>
          <div>
            {tab === 'Trade' && <TradeTab />}
            {tab === 'Import' && <ImportTab />}
            {tab === 'Data' && <DataTab />}
          </div>
        </div>
      </div>
    </div>
  );
};
