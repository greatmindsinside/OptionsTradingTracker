/**
 * Date utilities for DTE (Days To Expiration)
 * - Uses local calendar days (start of local day) per acceptance criteria
 */

/** Normalize a Date to local start of day */
function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Format a Date as YYYY-MM-DD (local date)
 */
export function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * calcDTE
 * Calculate whole calendar days from today (local) to the expiration ISO date string.
 * Today to today is 0. Today to tomorrow is 1.
 */
export function calcDTE(expISO: string, now: Date = new Date()): number {
  if (!expISO) return 0;
  const nowStart = startOfLocalDay(now);
  // Parse YYYY-MM-DD as local date to avoid timezone issues
  const [y, m, d] = expISO.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const exp = new Date(y, m - 1, d);
  if (Number.isNaN(exp.getTime())) return 0;
  const expStart = startOfLocalDay(exp);
  const diffMs = expStart.getTime() - nowStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * dateFromDTE
 * Given an integer DTE and optional now, return YYYY-MM-DD string of the expiration date (local)
 */
export function dateFromDTE(n: number, now: Date = new Date()): string {
  const base = startOfLocalDay(now);
  const exp = new Date(base);
  exp.setDate(exp.getDate() + Math.max(0, Math.floor(n)));
  return toYmdLocal(exp);
}

/**
 * Ensure an input is a valid YYYY-MM-DD date string
 */
export function isValidYmd(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  // Parse as local date and check if it round-trips correctly
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return false;
  // Verify the date components match (catches invalid dates like 2024-02-30)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
