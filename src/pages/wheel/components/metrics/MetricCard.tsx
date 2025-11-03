import { fmt } from '@/utils/wheel-calculations';

interface MetricCardProps {
  label: string;
  value: number;
  subtitle?: string;
  testId?: string;
  format?: 'currency' | 'number';
}

export function MetricCard({ label, value, subtitle, testId, format = 'number' }: MetricCardProps) {
  const displayValue = format === 'currency' ? `$${fmt(value, 2)}` : fmt(value, 0);

  return (
    <div className="rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-4 shadow-lg shadow-green-500/20 backdrop-blur-xl transition-shadow hover:shadow-green-400/30">
      <div className="text-xs font-medium text-green-400/80">{label}</div>
      <div className="mt-1 text-2xl font-bold text-green-400" data-testid={testId}>
        {displayValue}
      </div>
      {subtitle && <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>}
    </div>
  );
}
