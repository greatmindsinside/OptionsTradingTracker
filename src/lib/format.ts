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

export const toIso = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d).toISOString();

export const uid = (prefix = 'jrnl') =>
  `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
