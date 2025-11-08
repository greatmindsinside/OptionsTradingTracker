import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
  icon?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  trend,
  trendLabel,
  onClick,
  className = '',
  valueClassName = '',
  icon,
}) => {
  const isPositive = trend !== undefined && trend >= 0;
  const trendDisplay =
    trend !== undefined ? (isPositive ? '+' : '') + trend.toFixed(1) + '%' : null;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-green-500/30 bg-linear-to-br from-black/80 to-green-950/20 p-4 shadow-lg shadow-green-500/20 backdrop-blur-xl transition-all ${
        onClick
          ? 'cursor-pointer hover:scale-105 hover:border-green-500/50 hover:shadow-green-500/30'
          : ''
      } ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon && <span className="text-sm">{icon}</span>}
            <div className="text-xs tracking-wide text-zinc-500 uppercase">{title}</div>
          </div>
          <div className={`mt-1 text-2xl font-bold ${valueClassName}`}>{value}</div>
          {trendDisplay && (
            <div className="mt-1 flex items-center gap-1 text-xs">
              <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
                {isPositive ? '↑' : '↓'} {trendDisplay}
              </span>
              {trendLabel && <span className="text-zinc-500">{trendLabel}</span>}
            </div>
          )}
        </div>
        {onClick && (
          <div className="text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
