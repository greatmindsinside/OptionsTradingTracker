import { useMemo } from 'react';
import type { ExpRow } from '@/types/wheel';

export function useExpirationSort(rows: ExpRow[]) {
  return useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.expiration.localeCompare(b.expiration));
    return sorted;
  }, [rows]);
}
