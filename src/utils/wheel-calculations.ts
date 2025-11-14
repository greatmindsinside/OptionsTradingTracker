// Pure calculation utilities for the Wheel feature

import { calcDTE, toYmdLocal } from './dates';

export const fmt = (n: number, d = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

export const ymd = (date: Date) => date.toISOString().slice(0, 10);

export const todayYMD = () => ymd(new Date());

/**
 * Add days to a YYYY-MM-DD date string using local date arithmetic
 * This avoids timezone issues when recalculating expiration dates
 */
export const addDaysToYmd = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return ymd;
  date.setDate(date.getDate() + days);
  return toYmdLocal(date);
};

/**
 * Calculate days to a YYYY-MM-DD date string (local calendar days)
 * Uses the same logic as calcDTE for consistency
 * Today to today is 0. Today to tomorrow is 1.
 */
export const daysTo = (t: string) => calcDTE(t);

export const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 864e5);

export const pctMaxShortCall = (e: number, m: number) =>
  e <= 0 ? 0 : Math.min(100, Math.max(0, ((e - Math.max(0, m)) / e) * 100));

export const computeCover = (sh: number, sc: number) => ({
  covered: Math.min(sh, sc),
  uncovered: Math.max(0, sh - sc),
});
