import React from 'react';
import { useFilterStore } from '@/stores/useFilterStore';
import { Input } from '@/components/ui/Input';

/**
 * DateRangeFilter
 *
 * Provides From/To date inputs that write to the filter store.
 * JournalPage listens for changes to these primitive values and
 * re-queries the DB using a WHERE ts BETWEEN ? AND ? clause
 * built in src/db/queryBuilder.ts.
 */
export const DateRangeFilter: React.FC = () => {
  const from = useFilterStore(state => state.from);
  const to = useFilterStore(state => state.to);
  const setFilters = useFilterStore(state => state.setFilters);

  return (
    <>
      <Input
        label="From Date"
        type="date"
        value={from}
        onChange={e => setFilters({ from: e.target.value })}
        align="center"
      />
      <Input
        label="To Date"
        type="date"
        value={to}
        onChange={e => setFilters({ to: e.target.value })}
        align="center"
      />
    </>
  );
};
