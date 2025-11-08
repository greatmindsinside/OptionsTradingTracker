import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFilteredTickers } from '@/pages/wheel/hooks/useFilteredTickers';
import { useWheelMetrics } from '@/pages/wheel/hooks/useWheelMetrics';
import { useWheelPhase } from '@/pages/wheel/hooks/useWheelPhase';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

/**
 * Unit tests to verify hook memoization works correctly
 * Ensures that hooks only recalculate when dependencies actually change
 */

describe('Wheel Hooks Memoization', () => {
  beforeEach(() => {
    // Reset stores before each test
    useWheelStore.setState({
      positions: [],
      lots: [],
      earnings: {},
      ledger: [],
      reloadFn: null,
    });
    useWheelUIStore.setState({
      searchQuery: '',
      actionsOpen: false,
      tickerOpen: false,
      selectedTicker: null,
      importing: false,
    });
  });

  describe('useWheelMetrics', () => {
    it('should only recalculate when positions or lots change', () => {
      const { result, rerender } = renderHook(() => useWheelMetrics());

      const firstResult = result.current;

      // Re-render without changing dependencies
      rerender();

      // Result should be the same reference (memoized)
      expect(result.current).toBe(firstResult);

      // Change positions
      act(() => {
        useWheelStore.setState({
          positions: [
            {
              id: '1',
              ticker: 'TEST',
              type: 'P',
              side: 'S',
              qty: 1,
              strike: 100,
              entry: 1.5,
              mark: 1.5,
              dte: 30,
              opened: new Date().toISOString().slice(0, 10),
            },
          ],
        });
      });

      // Result should be different now
      expect(result.current).not.toBe(firstResult);
      expect(result.current.premiumThisWeek).toBeGreaterThan(0);
    });

    it('should calculate metrics correctly with memoization', () => {
      act(() => {
        useWheelStore.setState({
          positions: [
            {
              id: '1',
              ticker: 'TEST',
              type: 'P',
              side: 'S',
              qty: 2,
              strike: 100,
              entry: 2.0,
              mark: 2.0,
              dte: 30,
              opened: new Date().toISOString().slice(0, 10),
            },
          ],
          lots: [
            {
              id: 'lot-1',
              ticker: 'TEST',
              qty: 200,
              cost: 100,
              opened: new Date().toISOString().slice(0, 10),
            },
          ],
        });
      });

      const { result } = renderHook(() => useWheelMetrics());

      // Premium should be 2 contracts * 2.0 premium * 100 multiplier = 400
      expect(result.current.premiumThisWeek).toBe(400);

      // Capital in puts should be 2 contracts * 100 strike * 100 multiplier = 20,000
      expect(result.current.capitalInPuts).toBe(20000);
    });
  });

  describe('useWheelPhase', () => {
    it('should only recalculate when symbol, positions, or lots change', () => {
      const { result, rerender } = renderHook(() => useWheelPhase('TEST'));

      const firstResult = result.current;

      // Re-render with same symbol
      rerender();

      // Result should be the same (memoized)
      expect(result.current).toBe(firstResult);

      // Change symbol
      const { result: result2 } = renderHook(() => useWheelPhase('OTHER'));

      // Different symbol should give different result
      expect(result2.current).toBe('Sell Cash Secured Puts');

      // Add positions for TEST symbol
      act(() => {
        useWheelStore.setState({
          positions: [
            {
              id: '1',
              ticker: 'TEST',
              type: 'P',
              side: 'S',
              qty: 1,
              strike: 100,
              entry: 1.5,
              mark: 1.5,
              dte: 30,
              opened: new Date().toISOString().slice(0, 10),
            },
          ],
        });
      });

      const { result: result3 } = renderHook(() => useWheelPhase('TEST'));
      expect(result3.current).toBe('Sell Cash Secured Puts');
    });

    it('should calculate correct phase based on positions and lots', () => {
      // No positions or lots - should be Sell Cash Secured Puts
      const { result: result1 } = renderHook(() => useWheelPhase('TEST'));
      expect(result1.current).toBe('Sell Cash Secured Puts');

      // Add shares but no calls - should be Sell Covered Calls
      act(() => {
        useWheelStore.setState({
          lots: [
            {
              id: 'lot-1',
              ticker: 'TEST',
              qty: 100,
              cost: 100,
              opened: new Date().toISOString().slice(0, 10),
            },
          ],
        });
      });

      const { result: result2 } = renderHook(() => useWheelPhase('TEST'));
      expect(result2.current).toBe('Sell Covered Calls');

      // Add short calls - should be Call Expires Worthless
      act(() => {
        useWheelStore.setState({
          positions: [
            {
              id: '1',
              ticker: 'TEST',
              type: 'C',
              side: 'S',
              qty: 1,
              strike: 100,
              entry: 1.5,
              mark: 1.5,
              dte: 30,
              opened: new Date().toISOString().slice(0, 10),
            },
          ],
        });
      });

      const { result: result3 } = renderHook(() => useWheelPhase('TEST'));
      expect(result3.current).toBe('Call Expires Worthless');
    });
  });

  describe('useFilteredTickers', () => {
    it('should only recalculate when positions, lots, or searchQuery change', () => {
      act(() => {
        useWheelStore.setState({
          positions: [
            {
              id: '1',
              ticker: 'TEST1',
              type: 'P',
              side: 'S',
              qty: 1,
              strike: 100,
              entry: 1.5,
              mark: 1.5,
              dte: 30,
              opened: new Date().toISOString().slice(0, 10),
            },
          ],
        });
      });

      const { result, rerender } = renderHook(() => useFilteredTickers());

      const firstResult = result.current;

      // Re-render without changing dependencies
      rerender();

      // Result should be the same reference (memoized)
      expect(result.current).toBe(firstResult);

      // Change search query
      act(() => {
        useWheelUIStore.setState({ searchQuery: 'TEST' });
      });

      // Result should be different now
      expect(result.current).not.toBe(firstResult);
      expect(result.current).toEqual(['TEST1']);
    });

    it('should filter tickers correctly based on search query', () => {
      act(() => {
        useWheelStore.setState({
          positions: [
            {
              id: '1',
              ticker: 'ASTS',
              type: 'P',
              side: 'S',
              qty: 1,
              strike: 100,
              entry: 1.5,
              mark: 1.5,
              dte: 30,
              opened: new Date().toISOString().slice(0, 10),
            },
            {
              id: '2',
              ticker: 'OPEN',
              type: 'C',
              side: 'S',
              qty: 1,
              strike: 50,
              entry: 1.0,
              mark: 1.0,
              dte: 30,
              opened: new Date().toISOString().slice(0, 10),
            },
          ],
        });
      });

      // No search query - should return all tickers
      const { result: result1 } = renderHook(() => useFilteredTickers());
      expect(result1.current).toContain('ASTS');
      expect(result1.current).toContain('OPEN');

      // Search for 'ASTS'
      act(() => {
        useWheelUIStore.setState({ searchQuery: 'ASTS' });
      });

      const { result: result2 } = renderHook(() => useFilteredTickers());
      expect(result2.current).toEqual(['ASTS']);
      expect(result2.current).not.toContain('OPEN');

      // Search for 'open' (case insensitive)
      act(() => {
        useWheelUIStore.setState({ searchQuery: 'open' });
      });

      const { result: result3 } = renderHook(() => useFilteredTickers());
      expect(result3.current).toEqual(['OPEN']);
    });
  });
});
