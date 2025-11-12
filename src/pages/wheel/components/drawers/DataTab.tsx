/**
 * DataTab Component
 *
 * PURPOSE:
 * Simple button interface to open the Data Explorer modal. The Data Explorer provides
 * debugging and inspection tools to view raw store data (lots, positions, earnings, ledger).
 *
 * HOW IT WORKS:
 * - Renders a single button that toggles the Data Explorer modal
 * - Uses useWheelUIStore.toggleData to open/close the Data Explorer
 * - Data Explorer is a separate modal component (DataExplorerModal) that shows:
 *   - Overview stats (symbol count, lots, positions, events)
 *   - Tables view (formatted data for lots, positions, earnings)
 *   - Ledger view (chronological event log)
 *
 * INTERACTIONS:
 * - Parent: ActionsDrawer (rendered when actionsTab === 'Data')
 * - State: useWheelUIStore.toggleData (opens/closes DataExplorerModal)
 * - Data Explorer: DataExplorerModal component (lazy-loaded in WheelPage)
 * - Alternative access: Can also be opened from WheelHeader via "Data" button
 *
 * DATA FLOW:
 * 1. User clicks "Open Data Explorer" → toggleData() called
 * 2. useWheelUIStore.dataOpen toggles → DataExplorerModal renders/unmounts
 * 3. DataExplorerModal reads data from useWheelStore (lots, positions, earnings, ledger)
 * 4. Displays data in organized tabs (Overview, Tables, Ledger)
 *
 * USE CASES:
 * - Debugging: Inspect raw store data to verify calculations
 * - Verification: Check that trades were imported/added correctly
 * - Development: Understand data structure and relationships
 */

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
        className="rounded border border-green-500 bg-green-500/15 px-3 py-2 text-green-400 transition-colors hover:bg-green-500/25"
        onClick={toggleData}
      >
        Open Data Explorer
      </button>
      <div className="text-xs text-zinc-500">You can also open it from the header · Data</div>
    </div>
  );
};
