/**
 * Button Component (CVA)
 * Reusable button with variant and size using global .btn patterns
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const buttonStyles = cva('btn', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
      // outline maps to secondary style for now
      outline: 'btn-secondary',
    },
    size: {
      small: 'btn-sm',
      medium: 'btn-md',
      large: 'btn-lg',
      // aliases for convenience
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
    },
    fullWidth: {
      true: 'w-full',
      false: '',
    },
    loading: {
      true: 'opacity-60 pointer-events-none',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'medium',
    fullWidth: false,
    loading: false,
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant,
  size,
  loading = false,
  icon,
  fullWidth,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled: boolean = !!disabled || !!loading;
  return (
    <button
      className={clsx(buttonStyles({ variant, size, fullWidth, loading }), className)}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {icon && !loading && <span className="mr-2 inline-flex items-center">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export default Button;
