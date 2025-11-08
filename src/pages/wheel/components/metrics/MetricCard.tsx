import { fmt } from '@/utils/wheel-calculations';

interface MetricCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  subtitle?: string;
  testId?: string;
  format?: 'currency' | 'number';
}

export function MetricCard({
  label,
  value,
  icon,
  subtitle,
  testId,
  format = 'number',
}: MetricCardProps) {
  const displayValue = format === 'currency' ? `$${fmt(value, 2)}` : fmt(value, 0);

  return (
    <div className="glass-card-teal rounded-2xl p-4 transition-all hover:scale-[1.02]">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        {icon && <span className="text-emerald-400">{icon}</span>}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-100" data-testid={testId}>
        {displayValue}
      </div>
      {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
    </div>
  );
}
