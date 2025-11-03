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
          className="text-[11px] uppercase tracking-wide text-zinc-400/90 mb-1 ml-0.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-green-500/60">
            {icon}
          </div>
        )}
        <select
          id={selectId}
          className={`h-9 w-full ${icon ? 'pl-9' : 'pl-3'} pr-10 rounded-lg border border-green-500/20 bg-zinc-950/60 text-green-300 shadow-inner appearance-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400/40 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${error ? 'border-red-500/50' : ''} ${className}`}
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
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500/60"
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
      {error && <span className="text-xs text-red-400 mt-1 ml-0.5">{error}</span>}
    </div>
  );
};
