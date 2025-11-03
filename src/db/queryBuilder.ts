import type { FilterState } from '@/types/entry';

/**
 * Shared SQL query builder for journal entries
 * Builds WHERE clause and parameters from filter state
 *
 * Status filtering logic:
 * - 'open': Entries with no expiration OR expiration in the future
 * - 'closed': Entries with expiration in the past OR specific closing types
 * - 'all': No status filtering applied
 *
 * Safety & contract:
 * - Returns a parameterized clause and a params array to avoid SQL injection.
 * - Callers must pass both `clause` and `params` into db/sql.ts helpers.
 *
 * Example:
 *   buildWhere({ symbol: 'AAPL', status: 'open' }) ->
 *   {
 *     clause: "WHERE symbol LIKE ? AND (expiration IS NULL OR datetime(expiration) > datetime('now'))",
 *     params: ['%AAPL%']
 *   }
 */
export function buildWhere(filters?: Partial<FilterState>) {
  const where: string[] = [];
  const params: (string | number | null)[] = [];

  if (filters?.symbol) {
    where.push('symbol LIKE ?');
    params.push(`%${filters.symbol.toUpperCase()}%`);
  }
  if (filters?.type) {
    where.push('type = ?');
    params.push(filters.type);
  }
  if (filters?.from) {
    where.push('ts >= ?');
    params.push(filters.from);
  }
  if (filters?.to) {
    where.push('ts <= ?');
    params.push(filters.to);
  }

  // Status filter with expiration-based logic
  if (filters?.status && filters.status !== 'all') {
    if (filters.status === 'open') {
      // Open = no expiration OR expiration is in the future
      where.push("(expiration IS NULL OR datetime(expiration) > datetime('now'))");
    } else if (filters.status === 'closed') {
      // Closed = expiration in the past OR explicit closing transaction types
      where.push(
        "(datetime(expiration) <= datetime('now') OR type IN ('expiration', 'assignment_shares', 'share_sale'))"
      );
    }
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { clause, params };
}
