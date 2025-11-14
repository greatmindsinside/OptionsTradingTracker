import React, { useMemo } from 'react';

import { useSymbolAutocomplete } from '@/hooks/useSymbolAutocomplete';

import { Input } from './ui/Input';

// Helper to get user symbols (for showing "Recent" badge)
function getUserSymbols(): string[] {
  try {
    const stored = localStorage.getItem('user_symbols_history');
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // Ignore errors
  }
  return [];
}

interface SymbolInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'onFocus' | 'onBlur' | 'onKeyDown'
  > {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  maxSuggestions?: number;
  className?: string;
  error?: string;
}

/**
 * SymbolInput component with autocomplete functionality
 *
 * Features:
 * - Autocomplete from comprehensive stock ticker list
 * - Prioritizes user's previously used symbols
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Saves symbols to history when selected
 */
export const SymbolInput: React.FC<SymbolInputProps> = ({
  label = 'Symbol',
  value,
  onChange,
  onFocus,
  onBlur,
  maxSuggestions = 10,
  className,
  error,
  placeholder = 'e.g. AAPL',
  ...props
}) => {
  const {
    value: autocompleteValue,
    suggestions,
    showSuggestions,
    selectedIndex,
    handleChange,
    handleSelect,
    handleKeyDown,
    handleFocus: handleAutocompleteFocus,
    handleBlur: handleAutocompleteBlur,
    setValue,
  } = useSymbolAutocomplete(value, maxSuggestions);

  // Sync external value changes
  React.useEffect(() => {
    if (value !== autocompleteValue) {
      setValue(value);
    }
  }, [value, autocompleteValue, setValue]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    handleChange(newValue);
    onChange(newValue);
  };

  // Handle focus
  const handleInputFocus = () => {
    handleAutocompleteFocus();
    onFocus?.();
  };

  // Handle blur - use a ref to track if we're clicking on a suggestion
  const suggestionRef = React.useRef<HTMLDivElement>(null);
  const isClickingSuggestionRef = React.useRef(false);

  const handleInputBlur = () => {
    // Check if the blur is happening because we clicked on a suggestion
    if (isClickingSuggestionRef.current) {
      isClickingSuggestionRef.current = false;
      return; // Don't close suggestions if clicking on one
    }
    handleAutocompleteBlur();
    onBlur?.();
  };

  // Get user symbols for "Recent" badge
  const userSymbols = useMemo(() => getUserSymbols(), []);

  // Extract onKeyDown from props to avoid passing it to Input (we handle it separately)
  const { onKeyDown, ...inputProps } = props;

  // Handle key down
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleKeyDown(e);
    // Call original onKeyDown if provided
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <Input
        label={label}
        value={autocompleteValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        className={error ? `${className || ''} border-red-500`.trim() : className}
        {...inputProps}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg"
          onMouseDown={() => {
            // Mark that we're clicking on a suggestion to prevent blur from closing it
            isClickingSuggestionRef.current = true;
          }}
        >
          {suggestions.map((symbol, index) => {
            const isRecent = userSymbols.includes(symbol);
            return (
              <button
                key={symbol}
                type="button"
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-[rgba(245,179,66,0.2)] text-[#F5B342]'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
                onMouseDown={e => {
                  // Prevent blur event from firing on the input
                  e.preventDefault();
                  const selectedSymbol = symbol.toUpperCase();
                  handleSelect(selectedSymbol);
                  onChange(selectedSymbol);
                  // Small delay to ensure state updates before blur
                  setTimeout(() => {
                    isClickingSuggestionRef.current = false;
                  }, 100);
                }}
                onMouseEnter={() => {
                  // Could update selected index on hover if desired
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{symbol}</span>
                  {isRecent && <span className="text-xs text-zinc-500">Recent</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
