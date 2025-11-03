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
          className="mb-1 ml-0.5 text-[11px] tracking-wide text-zinc-200/90 uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-green-500/60">
            {icon}
          </div>
        )}
        <select
          id={selectId}
          className={`w-full ${icon ? 'pl-9' : 'px-4'} appearance-none rounded-xl border border-green-500/60 bg-zinc-950/60 py-3 pr-10 text-zinc-200 shadow hover:border-green-400/70 hover:bg-zinc-900/60 focus:border-green-400/70 focus:ring-2 focus:ring-green-500/30 focus:outline-none disabled:cursor-not-allowed disabled:text-zinc-500 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${error ? 'border-red-500/50' : ''} ${className}`}
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
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-green-500/60"
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
