import { type ClassValue, clsx } from 'clsx';
import React from 'react';

// Define cn inline to avoid path resolution issues
function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  className,
  align = 'left',
  type,
  ...props
}) => {
  const inputId = React.useId();

  return (
    <div className="flex flex-col">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-0.5 ml-0.5 text-[10px] tracking-wide text-zinc-200/90 uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute top-1/2 left-2.5 z-10 -translate-y-1/2 text-zinc-400">
            <div className="h-3.5 w-3.5 overflow-hidden [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</div>
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'w-full rounded-lg border border-[rgba(245,179,66,0.3)] bg-zinc-900 text-sm text-zinc-200 shadow placeholder:text-zinc-200/70',
            'transition-colors focus:border-[rgba(245,179,66,0.8)] focus:ring-2 focus:ring-[rgba(245,179,66,0.3)] focus:ring-offset-1 focus:ring-offset-black/80 focus:outline-none',
            'hover:border-[rgba(245,179,66,0.5)] hover:bg-zinc-800/70',
            'disabled:cursor-not-allowed disabled:text-zinc-500 disabled:shadow-none',
            // Soft gold focus glow
            'focus:shadow-[0_0_0_4px_rgba(245,179,66,0.12)]',
            // Padding logic - date inputs need extra right padding for calendar picker
            type === 'date' && icon && align === 'center'
              ? 'py-1.5 pr-8 pl-8'
              : icon && align === 'center'
                ? 'py-1.5 pr-8 pl-8'
                : icon
                  ? 'py-1.5 pr-3 pl-8'
                  : 'px-3 py-1.5',
            // Text alignment
            align === 'center' && 'text-center',
            align === 'right' && 'text-right',
            align === 'left' && 'text-left',
            // Webkit pseudo-elements for date inputs
            type === 'date' &&
              align === 'center' && [
                '[&::-webkit-date-and-time-value]:text-center',
                '[&::-webkit-datetime-edit]:text-center',
                '[&::-webkit-datetime-edit-fields-wrapper]:text-center',
                '[&::-webkit-datetime-edit-text]:text-center',
                '[&::-webkit-datetime-edit-month-field]:text-center',
                '[&::-webkit-datetime-edit-day-field]:text-center',
                '[&::-webkit-datetime-edit-year-field]:text-center',
                '[&::-webkit-calendar-picker-indicator]:absolute',
                '[&::-webkit-calendar-picker-indicator]:right-2',
                '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
              ],
            align === 'right' && [
              '[&::-webkit-date-and-time-value]:text-right',
              '[&::-webkit-datetime-edit]:text-right',
            ],
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
};
