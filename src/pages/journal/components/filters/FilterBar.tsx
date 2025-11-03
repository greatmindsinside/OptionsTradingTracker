import React from 'react';
import { useFilterStore } from '@/stores/useFilterStore';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { TradeTypeFilter } from './TradeTypeFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { StatusFilter } from './StatusFilter';
import { SummaryStats } from './SummaryStats';
import { Button } from '@/components/Button';

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
    <div className="neon-panel mb-6 rounded-2xl px-6 py-5">
      <div className="flex flex-col gap-3">
        {/* Section titles */}
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-wider text-zinc-400 uppercase">Filters</span>
          <span className="text-xs tracking-wider text-zinc-400 uppercase">Totals</span>
        </div>

        <div className="flex flex-wrap items-start gap-6">
          {/* Left: Filter controls */}
          <div className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <TradeTypeFilter />
            <DateRangeFilter />
            <StatusFilter />
            <div className="flex flex-col">
              <label
                className="pointer-events-none mb-1 ml-0.5 text-[11px] tracking-wide text-zinc-400/90 uppercase opacity-0"
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
              className="pointer-events-none mb-1 ml-0.5 text-[11px] tracking-wide text-zinc-400/90 uppercase opacity-0"
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
