import React from 'react';
import { clsx, type ClassValue } from 'clsx';

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
          className="text-[11px] uppercase tracking-wide text-zinc-400/90 mb-1 ml-0.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 z-10">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'h-9 w-full rounded-lg border border-green-500/20 bg-zinc-950/60 text-green-300 placeholder-green-400/40 shadow-inner',
            'focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400/40 transition-colors',
            // Padding logic - date inputs need extra right padding for calendar picker
            type === 'date' && icon && align === 'center'
              ? 'pl-9 pr-10'
              : icon && align === 'center'
                ? 'pl-9 pr-9'
                : icon
                  ? 'pl-9 pr-3'
                  : 'pl-3 pr-3',
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
