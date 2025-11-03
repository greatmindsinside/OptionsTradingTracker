import React from 'react';
import { useFilterStore } from '@/stores/useFilterStore';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { TradeTypeFilter } from './TradeTypeFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { StatusFilter } from './StatusFilter';
import { SummaryStats } from './SummaryStats';
import { Button } from '@/components/ui/Button';

/**
 * FilterBar
 *
 * Pure UI wrapper that composes all filter controls and the summary tiles.
 * - Changing any filter updates the central filter store (useFilterStore).
 * - JournalPage subscribes to the primitive filter fields and re-queries the
 *   SQLite database through useEntriesStore.loadEntries when any field changes.
 * - The SummaryStats component reads totals from useEntriesStore, which are
 *   computed via an SQL SUM query using the same WHERE clause as the entries list.
 */
export const FilterBar: React.FC = () => {
  const resetFilters = useFilterStore(state => state.resetFilters);
  const totals = useEntriesStore(state => state.totals);

  const handleClearAll = () => {
    resetFilters();
    // This will trigger a reload in the parent via the filter store
  };

  return (
    <div className="px-6 py-5 mb-6 rounded-2xl neon-panel">
      <div className="flex flex-col gap-3">
        {/* Section titles */}
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-wider uppercase text-zinc-400">Filters</span>
          <span className="text-xs tracking-wider uppercase text-zinc-400">Totals</span>
        </div>

        <div className="flex items-start gap-6 flex-wrap">
          {/* Left: Filter controls */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 flex-1 min-w-0">
            <TradeTypeFilter />
            <DateRangeFilter />
            <StatusFilter />
            <div className="flex flex-col">
              <label
                className="text-[11px] uppercase tracking-wide text-zinc-400/90 mb-1 ml-0.5 opacity-0 pointer-events-none"
                aria-hidden="true"
              >
                Actions
              </label>
              <Button onClick={handleClearAll} className="h-9 w-full">
                Clear All
              </Button>
            </div>
          </div>

          {/* Right: Summary stats */}
          <div className="flex flex-col">
            <label
              className="text-[11px] uppercase tracking-wide text-zinc-400/90 mb-1 ml-0.5 opacity-0 pointer-events-none"
              aria-hidden="true"
            >
              Summary
            </label>
            <SummaryStats totals={totals} />
          </div>
        </div>
      </div>
    </div>
  );
};
