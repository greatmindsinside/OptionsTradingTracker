import React from 'react';

import { Button } from '@/components/Button';
import { useClientFilterStore } from '@/stores/useClientFilterStore';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useFilterStore } from '@/stores/useFilterStore';

import { DateRangeFilter } from './DateRangeFilter';
import { StatusFilter } from './StatusFilter';
import { SummaryStats } from './SummaryStats';
import { TradeTypeFilter } from './TradeTypeFilter';

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
  const setFilters = useFilterStore(state => state.setFilters);
  const filters = useFilterStore(state => state);

  // Amount range filter state
  const { minAmount, maxAmount, setAmountRange, clearAmountRange } = useClientFilterStore();
  const [minAmountInput, setMinAmountInput] = React.useState<string>('');
  const [maxAmountInput, setMaxAmountInput] = React.useState<string>('');
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('journal_filter_collapsed');
    return saved === 'true';
  });

  // Sync input with store
  React.useEffect(() => {
    setMinAmountInput(minAmount !== null ? minAmount.toString() : '');
    setMaxAmountInput(maxAmount !== null ? maxAmount.toString() : '');
  }, [minAmount, maxAmount]);

  // Debounce amount range updates
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const min = minAmountInput === '' ? null : Number(minAmountInput);
      const max = maxAmountInput === '' ? null : Number(maxAmountInput);
      if (!isNaN(min as number) || !isNaN(max as number)) {
        setAmountRange(
          min === null || isNaN(min) ? null : min,
          max === null || isNaN(max) ? null : max
        );
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [minAmountInput, maxAmountInput, setAmountRange]);

  // Filter presets state
  const [filterPresets, setFilterPresets] = React.useState<
    Array<{ name: string; filters: typeof filters }>
  >(() => {
    const saved = localStorage.getItem('journal_filter_presets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [showPresetMenu, setShowPresetMenu] = React.useState(false);

  // Save filter preset
  const savePreset = () => {
    const name = window.prompt('Enter a name for this filter preset:');
    if (!name) return;

    const preset = { name, filters: { ...filters } };
    const updated = [...filterPresets, preset];
    setFilterPresets(updated);
    localStorage.setItem('journal_filter_presets', JSON.stringify(updated));
  };

  // Load filter preset
  const loadPreset = (preset: { name: string; filters: typeof filters }) => {
    setFilters(preset.filters);
    setShowPresetMenu(false);
  };

  // Delete filter preset
  const deletePreset = (index: number) => {
    const updated = filterPresets.filter((_, i) => i !== index);
    setFilterPresets(updated);
    localStorage.setItem('journal_filter_presets', JSON.stringify(updated));
  };

  const handleClearAll = () => {
    resetFilters();
    clearAmountRange();
    setMinAmountInput('');
    setMaxAmountInput('');
    // This will trigger a reload in the parent via the filter store
  };

  // Calculate active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.symbol) count++;
    if (filters.type) count++;
    if (filters.from) count++;
    if (filters.to) count++;
    if (filters.status !== 'all') count++;
    if (minAmount !== null) count++;
    if (maxAmount !== null) count++;
    return count;
  }, [filters, minAmount, maxAmount]);

  React.useEffect(() => {
    localStorage.setItem('journal_filter_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const getDateString = (date: Date): string => {
    return date.toISOString().slice(0, 10);
  };

  const handleQuickFilter = (period: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === 'all') {
      setFilters({ from: '', to: '' });
      return;
    }

    const from = new Date(today);

    switch (period) {
      case 'today':
        // Already set to today
        break;
      case 'week':
        from.setDate(from.getDate() - 7);
        break;
      case 'month':
        from.setMonth(from.getMonth() - 1);
        break;
      case 'year':
        from.setFullYear(from.getFullYear() - 1);
        break;
    }

    setFilters({ from: getDateString(from), to: getDateString(today) });
  };

  return (
    <div className="glass-card mb-6 rounded-2xl px-4 py-3">
      <div className="flex flex-col gap-3">
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 text-xs tracking-wider text-zinc-400 uppercase transition-colors hover:text-zinc-300"
          >
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                {activeFilterCount}
              </span>
            )}
            <svg
              className={`h-4 w-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <span className="text-xs tracking-wider text-zinc-400 uppercase">Totals</span>
        </div>

        {/* Quick Filter Chips */}
        {!isCollapsed && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleQuickFilter('today')}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              title="Filter entries from today only"
            >
              Today
            </Button>
            <Button
              onClick={() => handleQuickFilter('week')}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              title="Filter entries from the last 7 days"
            >
              This Week
            </Button>
            <Button
              onClick={() => handleQuickFilter('month')}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              title="Filter entries from the last 30 days"
            >
              This Month
            </Button>
            <Button
              onClick={() => handleQuickFilter('year')}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              title="Filter entries from the last year"
            >
              This Year
            </Button>
            <Button
              onClick={() => handleQuickFilter('all')}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              title="Show all entries (no date filter)"
            >
              All Time
            </Button>
          </div>
        )}

        {!isCollapsed && (
          <div className="flex flex-wrap items-start gap-6">
            {/* Left: Filter controls */}
            <div className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <TradeTypeFilter />
              <DateRangeFilter />
              <StatusFilter />
              <div className="flex flex-col">
                <label className="mb-0.5 ml-0.5 text-[10px] tracking-wide text-zinc-400/90 uppercase">
                  Amount Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={minAmountInput}
                    onChange={e => setMinAmountInput(e.target.value)}
                    placeholder="Min"
                    className="h-7 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-300 placeholder-zinc-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={maxAmountInput}
                    onChange={e => setMaxAmountInput(e.target.value)}
                    placeholder="Max"
                    className="h-7 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-300 placeholder-zinc-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
                  />
                </div>
              </div>
              <div className="relative flex flex-col">
                <label className="mb-0.5 ml-0.5 text-[10px] tracking-wide text-zinc-400/90 uppercase">
                  Presets
                </label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowPresetMenu(!showPresetMenu)}
                    variant="secondary"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    title={
                      filterPresets.length > 0
                        ? `View ${filterPresets.length} saved filter preset(s)`
                        : 'View saved filter presets'
                    }
                  >
                    {filterPresets.length > 0 ? `Presets (${filterPresets.length})` : 'Save Preset'}
                  </Button>
                  {filterPresets.length > 0 && (
                    <Button
                      onClick={savePreset}
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      title="Save current filters as preset"
                    >
                      Save
                    </Button>
                  )}
                </div>
                {showPresetMenu && filterPresets.length > 0 && (
                  <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-lg">
                    <div className="space-y-1">
                      {filterPresets.map((preset, index) => (
                        <div key={index} className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => loadPreset(preset)}
                            className="flex-1 rounded px-2 py-1 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                            title={`Load filter preset: ${preset.name}`}
                          >
                            {preset.name}
                          </button>
                          <button
                            onClick={() => deletePreset(index)}
                            className="rounded px-2 py-1 text-sm text-red-400 hover:bg-red-900/20"
                            title="Delete preset"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <label
                  className="pointer-events-none mb-0.5 ml-0.5 text-[10px] tracking-wide text-zinc-400/90 uppercase opacity-0"
                  aria-hidden="true"
                >
                  Actions
                </label>
                <Button
                  onClick={handleClearAll}
                  className="h-7 w-full"
                  title="Clear all active filters (date range, symbol, type, status, amount range)"
                >
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
        )}
      </div>
    </div>
  );
};
