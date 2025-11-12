/**
 * ActionsDrawer Component
 *
 * PURPOSE:
 * Main modal drawer container that provides access to three primary actions:
 * - Trade: Add new option trades (sell puts/calls, buy to close)
 * - Import: Import trades from CSV files
 * - Data: Open the Data Explorer for debugging/inspection
 *
 * HOW IT WORKS:
 * - Opens as a centered modal overlay when actionsOpen is true
 * - Contains tab navigation to switch between Trade/Import/Data tabs
 * - Each tab is a separate component (TradeTab, ImportTab, DataTab)
 * - Tab state is managed in useWheelUIStore.actionsTab
 * - Closes when user clicks backdrop or close button
 *
 * INTERACTIONS:
 * - Opened by: WheelHeader ("Premium Printer" button), QuickActionFAB, TickerPhaseRow ("Sell Put/Call" buttons)
 * - State managed by: useWheelUIStore (actionsOpen, actionsTab, openActions, closeActions, setActionsTab)
 * - Contains: TradeTab, ImportTab, DataTab components
 * - UI pattern: Fixed overlay with centered modal panel (different from TickerDrawer's side panel)
 *
 * DATA FLOW:
 * 1. User triggers action → openActions(tab?) called → actionsOpen=true, actionsTab set
 * 2. ActionsDrawer renders → shows selected tab component
 * 3. Tab component handles its own logic (form submission, file import, etc.)
 * 4. User closes → closeActions() called → actionsOpen=false → drawer unmounts
 */

import React from 'react';

import { useWheelUIStore } from '@/stores/useWheelUIStore';

import { DataTab } from './DataTab';
import { ImportTab } from './ImportTab';
import { TradeTab } from './TradeTab';

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
        <div className="w-full max-w-3xl rounded-2xl border border-green-500/30 bg-zinc-950/95 p-4 shadow-2xl shadow-green-500/20">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-2 text-sm">
              {tabs.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded border px-3 py-1 transition-colors ${tab === t ? 'border-green-400 bg-green-500/15 text-green-400 shadow-lg shadow-green-500/20' : 'border-zinc-700 text-zinc-400 hover:border-green-500/30'}`}
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
