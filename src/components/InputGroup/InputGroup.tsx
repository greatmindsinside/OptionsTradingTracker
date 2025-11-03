/**
 * InputGroup Component
 * A reusable form input with label, validation, and styling
 */

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import styles from './InputGroup.module.css';

interface InputGroupProps {
  label: string;
  type?: 'text' | 'number' | 'date' | 'email';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  prefix?: string;
  suffix?: string;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

export const InputGroup = forwardRef<HTMLInputElement, InputGroupProps>(
  (
    {
      label,
      type = 'text',
      value,
      onChange,
      placeholder,
      error,
      disabled = false,
      required = false,
      min,
      max,
      step,
      prefix,
      suffix,
      className = '',
      id,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = Boolean(error);

    return (
      <div className={clsx(styles.inputGroup, className)}>
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="label-required">*</span>}
        </label>

        <div className={clsx('input-wrapper', hasError && 'error')}>
          {prefix && <span className="input-prefix">{prefix}</span>}

          <input
            ref={ref}
            id={inputId}
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            min={min}
            max={max}
            step={step}
            data-testid={testId}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            {...props}
          />

          {suffix && <span className="input-suffix">{suffix}</span>}
        </div>

        {error && (
          <div id={`${inputId}-error`} className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }
);
