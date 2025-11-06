import { Settings } from 'lucide-react';
import React from 'react';

import { Select } from '@/components/ui/Select';
import { useFilterStore } from '@/stores/useFilterStore';
import type { TradeType } from '@/types/entry';

/**
 * TradeTypeFilter
 *
 * Controls the `type` field in the filter store. When changed, the Journal page
 * re-queries the DB with "WHERE type = ?" (see queryBuilder.ts). The values map
 * directly to the `journal.type` column.
 */
export const TradeTypeFilter: React.FC = () => {
  const type = useFilterStore(state => state.type);
  const setFilters = useFilterStore(state => state.setFilters);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ type: (e.target.value || '') as '' | TradeType });
  };

  return (
    <Select
      label="Trade Type"
      value={type}
      onChange={handleChange}
      icon={<Settings className="h-4 w-4" />}
      align="center"
      options={[
        { value: '', label: 'All types' },
        { value: 'sell_to_open', label: 'Sell to Open' },
        { value: 'buy_to_close', label: 'Buy to Close' },
        { value: 'expiration', label: 'Expiration' },
        { value: 'assignment_shares', label: 'Assignment (Shares)' },
        { value: 'share_sale', label: 'Share Sale' },
        { value: 'dividend', label: 'Dividend' },
        { value: 'fee', label: 'Fee' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'correction', label: 'Correction' },
      ]}
    />
  );
};
