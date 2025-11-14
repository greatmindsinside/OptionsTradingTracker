import { useMemo, useState, useEffect } from 'react';

import { getAllStockTickers } from '@/data/stockTickers';

const STORAGE_KEY = 'user_symbols_history';
const MAX_HISTORY = 50;

/**
 * Get user's previously used symbols from localStorage
 */
function getUserSymbols(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.warn('Failed to load user symbols from localStorage:', error);
  }
  return [];
}

/**
 * Save a symbol to user's history
 */
function saveUserSymbol(symbol: string): void {
  try {
    const symbols = getUserSymbols();
    const upperSymbol = symbol.toUpperCase();

    // Remove if already exists (to move to front)
    const filtered = symbols.filter(s => s !== upperSymbol);

    // Add to front
    const updated = [upperSymbol, ...filtered].slice(0, MAX_HISTORY);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save user symbol to localStorage:', error);
  }
}

/**
 * Hook for symbol autocomplete functionality
 *
 * Features:
 * - Autocomplete from comprehensive stock ticker list
 * - Prioritizes user's previously used symbols
 * - Filters suggestions based on input
 * - Saves symbols to history when used
 *
 * @param initialValue - Initial symbol value
 * @param maxSuggestions - Maximum number of suggestions to show (default: 10)
 * @returns Autocomplete state and handlers
 */
export function useSymbolAutocomplete(
  initialValue: string = '',
  maxSuggestions: number = 10
) {
  const [value, setValue] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!value || value.length === 0) {
      // Show top user symbols when input is empty
      const userSymbols = getUserSymbols();
      return userSymbols.slice(0, maxSuggestions);
    }

    const upperValue = value.toUpperCase();
    const userSymbols = getUserSymbols();

    // Separate matches into user symbols and stock tickers
    const userMatches: string[] = [];
    const tickerMatches: string[] = [];

    // Check user symbols first (prioritized)
    for (const symbol of userSymbols) {
      if (symbol.startsWith(upperValue)) {
        userMatches.push(symbol);
      }
    }

    // Check stock tickers
    for (const ticker of getAllStockTickers()) {
      if (ticker.startsWith(upperValue) && !userSymbols.includes(ticker)) {
        tickerMatches.push(ticker);
      }
    }

    // Combine: user matches first, then ticker matches
    const combined = [...userMatches, ...tickerMatches];

    return combined.slice(0, maxSuggestions);
  }, [value, maxSuggestions]);

  // Handle input change
  const handleChange = (newValue: string) => {
    setValue(newValue.toUpperCase());
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  // Handle suggestion selection
  const handleSelect = (symbol: string) => {
    const upperSymbol = symbol.toUpperCase();
    setValue(upperSymbol);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    saveUserSymbol(upperSymbol);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]!);
        } else if (suggestions.length > 0) {
          handleSelect(suggestions[0]!);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle focus
  const handleFocus = () => {
    setShowSuggestions(true);
  };

  // Handle blur (with delay to allow click on suggestion)
  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // Save symbol when value changes and is valid
  useEffect(() => {
    if (value && value.length > 0) {
      const upperValue = value.toUpperCase();
      // Only save if it's a valid ticker or user has typed it
      if (getAllStockTickers().includes(upperValue)) {
        // Don't save on every keystroke, only when user selects or completes
      }
    }
  }, [value]);

  return {
    value,
    suggestions,
    showSuggestions,
    selectedIndex,
    handleChange,
    handleSelect,
    handleKeyDown,
    handleFocus,
    handleBlur,
    setValue,
    setShowSuggestions,
  };
}
