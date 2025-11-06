import { useMemo } from 'react';

import { useEntriesStore } from '@/stores/useEntriesStore';
import { useFilterStore } from '@/stores/useFilterStore';
import type { Entry } from '@/types/entry';

/**
 * Custom hook to filter entries based on current filter state (client-side only)
 *
 * Note: The Journal page now performs filtering at the database level using
 * SQL WHERE clauses (see src/db/queryBuilder.ts and useEntriesStore.loadEntries).
 * This hook is kept as a fallback/illustration and can be reused in contexts
 * where a DB roundtrip is undesirable or impossible (e.g., ephemeral views).
 */
export function useEntriesFilter(): Entry[] {
  const entries = useEntriesStore(state => state.entries);
  const filters = useFilterStore();

  return useMemo(() => {
    let filtered = entries;

    // Symbol filter
    if (filters.symbol) {
      const searchTerm = filters.symbol.toUpperCase();
      filtered = filtered.filter(entry => entry.symbol.toUpperCase().includes(searchTerm));
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(entry => entry.type === filters.type);
    }

    // Date range filters
    if (filters.from) {
      filtered = filtered.filter(entry => entry.ts >= filters.from);
    }
    if (filters.to) {
      filtered = filtered.filter(entry => entry.ts <= filters.to);
    }

    // Status filter (open/closed) - simplified logic
    if (filters.status !== 'all') {
      // This is placeholder logic - you can expand based on your business rules
      // For example, "open" might mean options that haven't expired yet
      if (filters.status === 'open') {
        filtered = filtered.filter(entry => {
          if (entry.expiration) {
            return new Date(entry.expiration) > new Date();
          }
          return true; // Non-expiring entries are considered "open"
        });
      } else if (filters.status === 'closed') {
        filtered = filtered.filter(entry => {
          if (entry.expiration) {
            return new Date(entry.expiration) <= new Date();
          }
          return entry.type === 'expiration' || entry.type === 'assignment_shares';
        });
      }
    }

    return filtered;
  }, [entries, filters]);
}
