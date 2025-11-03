// Pure calculation utilities for the Wheel feature

export const fmt = (n: number, d = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

export const ymd = (date: Date) => date.toISOString().slice(0, 10);

export const todayYMD = () => ymd(new Date());

export const daysTo = (t: string) =>
  Math.ceil(
    (new Date(t + 'T00:00:00').getTime() - new Date(todayYMD() + 'T00:00:00').getTime()) / 864e5
  );

export const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 864e5);

export const pctMaxShortCall = (e: number, m: number) =>
  e <= 0 ? 0 : Math.min(100, Math.max(0, ((e - Math.max(0, m)) / e) * 100));

export const computeCover = (sh: number, sc: number) => ({
  covered: Math.min(sh, sc),
  uncovered: Math.max(0, sh - sc),
});
