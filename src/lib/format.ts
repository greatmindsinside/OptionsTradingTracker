// Helper utilities: money/date formatting and uid generation
export const fmtMoney = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export const fmtDate = (d: Date | string) => {
  const dt = typeof d === 'string' ? new Date(d) : d;
  // yyyy-MM-dd
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const toIso = (d: Date | string): string => {
  if (typeof d === 'string') {
    // If it's a YYYY-MM-DD string, parse it as local date to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-').map(Number);
      const date = new Date(y, m - 1, day);
      return date.toISOString();
    }
    // Otherwise, parse as normal (handles ISO strings and other formats)
    return new Date(d).toISOString();
  }
  return d.toISOString();
};

export const uid = (prefix = 'jrnl') =>
  `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
