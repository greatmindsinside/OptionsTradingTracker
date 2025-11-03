import React from 'react';
import { useFilterStore } from '@/stores/useFilterStore';
import { Select } from '@/components/ui/Select';
import { CheckCircle } from 'lucide-react';

/**
 * StatusFilter
 *
 * Maps the UI selection to the filter store's `status` field.
 * The DB-level filtering is implemented in src/db/queryBuilder.ts:
 * - 'open'   => expiration IS NULL OR expiration > now
 * - 'closed' => expiration <= now OR type IN ('expiration','assignment_shares','share_sale')
 * - 'all'    => no status clause added
 */
export const StatusFilter: React.FC = () => {
  const status = useFilterStore(state => state.status);
  const setFilters = useFilterStore(state => state.setFilters);

  return (
    <Select
      label="Status"
      value={status}
      onChange={e => setFilters({ status: e.target.value as 'all' | 'open' | 'closed' })}
      icon={<CheckCircle className="h-4 w-4" />}
      align="center"
      options={[
        { value: 'all', label: 'All Status' },
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
      ]}
    />
  );
};
