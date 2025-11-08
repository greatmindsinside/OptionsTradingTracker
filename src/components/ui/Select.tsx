import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  options: Array<{ value: string | number; label: string }>;
  align?: 'left' | 'center' | 'right';
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  icon,
  options,
  align = 'left',
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-0.5 ml-0.5 text-[10px] tracking-wide text-zinc-200/90 uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-green-500/60">
            <div className="h-3.5 w-3.5 overflow-hidden [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</div>
          </div>
        )}
        <select
          id={selectId}
          className={`w-full ${icon ? 'pl-8' : 'px-3'} appearance-none rounded-lg border border-green-500/70 bg-zinc-900 py-1.5 pr-8 text-sm text-zinc-200 shadow hover:border-green-400/80 hover:bg-zinc-800/70 focus:border-green-400/80 focus:ring-2 focus:ring-green-500/30 focus:ring-offset-1 focus:ring-offset-black/80 focus:outline-none disabled:cursor-not-allowed disabled:text-zinc-500 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${error ? 'border-red-500/50' : ''} ${className}`}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Chevron */}
        <svg
          className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-green-500/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {error && <span className="mt-1 ml-0.5 text-xs text-red-400">{error}</span>}
    </div>
  );
};
