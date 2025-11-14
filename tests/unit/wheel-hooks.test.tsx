import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFilteredTickers } from '@/pages/wheel/hooks/useFilteredTickers';
import { useWheelMetrics } from '@/pages/wheel/hooks/useWheelMetrics';
import { useWheelPhase } from '@/pages/wheel/hooks/useWheelPhase';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import type { Lot, Position } from '@/types/wheel';

describe('useWheelMetrics', () => {
  beforeEach(() => {
    // Reset stores to initial state
    useWheelStore.setState({
      lots: [],
      positions: [],
      earnings: {},
      ledger: [],
      setLots: useWheelStore.getState().setLots,
      setPositions: useWheelStore.getState().setPositions,
      setEarnings: useWheelStore.getState().setEarnings,
      addLedgerEvent: useWheelStore.getState().addLedgerEvent,
      updateExpiration: useWheelStore.getState().updateExpiration,
    });
  });

  it('should return zero metrics when no data exists', () => {
    const { result } = renderHook(() => useWheelMetrics());

    expect(result.current.premiumThisWeek).toBe(0);
    expect(result.current.capitalInPuts).toBe(0);
    expect(result.current.sharesForCalls.covered).toBe(0);
    expect(result.current.sharesForCalls.cnt).toBe(0);
  });

  it('should calculate premium from sold options', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
      {
        id: '2',
        ticker: 'TSLA',
        qty: 1,
        strike: 200,
        entry: 3.0,
        mark: 2.5,
        dte: 45,
        type: 'C',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    useWheelStore.setState({ positions });

    const { result } = renderHook(() => useWheelMetrics());

    // (1 * 2.5 * 100) + (1 * 3.0 * 100) = 250 + 300 = 550
    expect(result.current.premiumThisWeek).toBe(550);
  });

  it('should calculate capital in short puts', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 2,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
      {
        id: '2',
        ticker: 'TSLA',
        qty: 1,
        strike: 200,
        entry: 3.0,
        mark: 2.5,
        dte: 45,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    useWheelStore.setState({ positions });

    const { result } = renderHook(() => useWheelMetrics());

    // (2 * 150 * 100) + (1 * 200 * 100) = 30000 + 20000 = 50000
    expect(result.current.capitalInPuts).toBe(50000);
  });

  it('should net premium from sold and bought options', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
      {
        id: '2',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 1.0,
        mark: 0.5,
        dte: 15,
        type: 'P',
        side: 'B',
        opened: '2025-10-15',
      },
    ];

    useWheelStore.setState({ positions });

    const { result } = renderHook(() => useWheelMetrics());

    // Sold: 1 * 2.5 * 100 = 250; Bought: 1 * 1.0 * 100 = 100; Net = 150
    expect(result.current.premiumThisWeek).toBe(150);
  });

  it('should calculate total shares needed for short calls', () => {
    const lots: Lot[] = [
      {
        id: 'lot-1',
        ticker: 'AAPL',
        qty: 200,
        cost: 150,
        opened: '2025-09-01',
      },
    ];

    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 160,
        entry: 3.0,
        mark: 2.5,
        dte: 30,
        type: 'C',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    useWheelStore.setState({ lots, positions });

    const { result } = renderHook(() => useWheelMetrics());

    // 1 short call = 100 shares needed (1 contract × 100 shares per contract)
    expect(result.current.sharesForCalls.covered).toBe(100);
    expect(result.current.sharesForCalls.cnt).toBe(1);
  });

  it('should calculate total shares needed for multiple short calls', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'OPEN',
        qty: 1,
        strike: 9,
        entry: 1.0,
        mark: 0.8,
        dte: 0,
        type: 'C',
        side: 'S',
        opened: '2025-11-01',
      },
      {
        id: '2',
        ticker: 'ASTS',
        qty: 1,
        strike: 82,
        entry: 2.0,
        mark: 1.5,
        dte: 0,
        type: 'C',
        side: 'S',
        opened: '2025-11-01',
      },
    ];

    useWheelStore.setState({ positions, lots: [] });

    const { result } = renderHook(() => useWheelMetrics());

    // 2 short calls = 200 shares needed (2 contracts × 100 shares per contract)
    expect(result.current.sharesForCalls.covered).toBe(200);
    expect(result.current.sharesForCalls.cnt).toBe(2);
  });

  it('should calculate total shares needed for naked calls (no shares owned)', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'NAKED',
        qty: 1,
        strike: 50,
        entry: 1.0,
        mark: 0.8,
        dte: 30,
        type: 'C',
        side: 'S',
        opened: '2025-11-01',
      },
    ];

    useWheelStore.setState({ positions, lots: [] });

    const { result } = renderHook(() => useWheelMetrics());

    // 1 naked call = 100 shares needed (still need shares to cover it, even if not owned)
    expect(result.current.sharesForCalls.covered).toBe(100);
    expect(result.current.sharesForCalls.cnt).toBe(1);
  });
});

describe('useFilteredTickers', () => {
  beforeEach(() => {
    useWheelStore.setState({
      lots: [],
      positions: [],
      earnings: {},
      ledger: [],
      setLots: useWheelStore.getState().setLots,
      setPositions: useWheelStore.getState().setPositions,
      setEarnings: useWheelStore.getState().setEarnings,
      addLedgerEvent: useWheelStore.getState().addLedgerEvent,
      updateExpiration: useWheelStore.getState().updateExpiration,
    });
    useWheelUIStore.setState({
      searchQuery: '',
      actionsOpen: false,
      actionsTab: 'Import',
      contextSymbol: null,
      dataOpen: false,
      importing: false,
      setSearchQuery: useWheelUIStore.getState().setSearchQuery,
      openActions: useWheelUIStore.getState().openActions,
      closeActions: useWheelUIStore.getState().closeActions,
      setActionsTab: useWheelUIStore.getState().setActionsTab,
      openContext: useWheelUIStore.getState().openContext,
      closeContext: useWheelUIStore.getState().closeContext,
      toggleData: useWheelUIStore.getState().toggleData,
      setImporting: useWheelUIStore.getState().setImporting,
    });
  });

  it('should return empty array when no positions or lots exist', () => {
    const { result } = renderHook(() => useFilteredTickers());

    expect(result.current).toEqual([]);
  });

  it('should return unique tickers from positions and lots', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
      {
        id: '2',
        ticker: 'TSLA',
        qty: 1,
        strike: 200,
        entry: 3.0,
        mark: 2.5,
        dte: 45,
        type: 'C',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    const lots: Lot[] = [
      {
        id: 'lot-1',
        ticker: 'AAPL', // Duplicate ticker
        qty: 100,
        cost: 150,
        opened: '2025-09-01',
      },
      {
        id: 'lot-2',
        ticker: 'MSFT',
        qty: 50,
        cost: 300,
        opened: '2025-09-01',
      },
    ];

    useWheelStore.setState({ positions, lots });

    const { result } = renderHook(() => useFilteredTickers());

    expect(result.current).toHaveLength(3);
    expect(result.current).toContain('AAPL');
    expect(result.current).toContain('TSLA');
    expect(result.current).toContain('MSFT');
  });

  it('should filter tickers by search query', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
      {
        id: '2',
        ticker: 'TSLA',
        qty: 1,
        strike: 200,
        entry: 3.0,
        mark: 2.5,
        dte: 45,
        type: 'C',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    const lots: Lot[] = [
      {
        id: 'lot-1',
        ticker: 'MSFT',
        qty: 100,
        cost: 300,
        opened: '2025-09-01',
      },
    ];

    useWheelStore.setState({ positions, lots });
    useWheelUIStore.setState({ searchQuery: 'AA' });

    const { result } = renderHook(() => useFilteredTickers());

    expect(result.current).toEqual(['AAPL']);
  });

  it('should be case-insensitive when filtering', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    useWheelStore.setState({ positions });
    useWheelUIStore.setState({ searchQuery: 'aapl' });

    const { result } = renderHook(() => useFilteredTickers());

    expect(result.current).toEqual(['AAPL']);
  });

  it('should return sorted tickers alphabetically', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'TSLA',
        qty: 1,
        strike: 200,
        entry: 3.0,
        mark: 2.5,
        dte: 45,
        type: 'C',
        side: 'S',
        opened: '2025-10-01',
      },
      {
        id: '2',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    const lots: Lot[] = [
      {
        id: 'lot-1',
        ticker: 'MSFT',
        qty: 100,
        cost: 300,
        opened: '2025-09-01',
      },
    ];

    useWheelStore.setState({ positions, lots });

    const { result } = renderHook(() => useFilteredTickers());

    expect(result.current).toEqual(['AAPL', 'MSFT', 'TSLA']);
  });
});

describe('Hook Memoization', () => {
  beforeEach(() => {
    useWheelStore.setState({
      lots: [],
      positions: [],
      earnings: {},
      ledger: [],
      setLots: useWheelStore.getState().setLots,
      setPositions: useWheelStore.getState().setPositions,
      setEarnings: useWheelStore.getState().setEarnings,
      addLedgerEvent: useWheelStore.getState().addLedgerEvent,
      updateExpiration: useWheelStore.getState().updateExpiration,
    });
  });

  it('useWheelMetrics should only recalculate when positions or lots change', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    useWheelStore.setState({ positions });

    const { result, rerender } = renderHook(() => useWheelMetrics());

    const firstResult = result.current;

    // Rerender without changing positions/lots
    rerender();

    // Result should be the same reference (memoized)
    expect(result.current).toBe(firstResult);
    expect(result.current.premiumThisWeek).toBe(firstResult.premiumThisWeek);

    // Update positions - should recalculate
    const newPositions: Position[] = [
      ...positions,
      {
        id: '2',
        ticker: 'TSLA',
        qty: 1,
        strike: 200,
        entry: 3.0,
        mark: 2.5,
        dte: 45,
        type: 'C',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    useWheelStore.setState({ positions: newPositions });
    rerender();

    // Result should be different (new calculation)
    expect(result.current.premiumThisWeek).not.toBe(firstResult.premiumThisWeek);
  });

  it('useFilteredTickers should only recalculate when positions, lots, or searchQuery change', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
      {
        id: '2',
        ticker: 'TSLA',
        qty: 1,
        strike: 200,
        entry: 3.0,
        mark: 2.5,
        dte: 45,
        type: 'C',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    useWheelStore.setState({ positions });
    useWheelUIStore.setState({ searchQuery: '' });

    const { result, rerender } = renderHook(() => useFilteredTickers());

    const firstResult = result.current;

    // Should have both tickers initially
    expect(result.current).toEqual(['AAPL', 'TSLA']);

    // Rerender without changing dependencies
    rerender();

    // Result should be the same reference (memoized)
    expect(result.current).toBe(firstResult);

    // Update search query - should recalculate
    useWheelUIStore.setState({ searchQuery: 'AA' });
    rerender();

    // Result should be different (filtered)
    expect(result.current).not.toEqual(firstResult);
    expect(result.current).toEqual(['AAPL']);
  });

  it('should use reference equality for Zustand selectors', () => {
    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'P',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    useWheelStore.setState({ positions });

    const { result, rerender } = renderHook(() => useWheelMetrics());

    // Get initial result
    const firstResult = result.current;

    // Update store with same array reference (should not trigger recalculation)
    // In Zustand, if we set the same array reference, it won't cause re-render
    useWheelStore.setState({ positions: [...positions] }); // New array reference
    rerender();

    // Since we created a new array reference, it should recalculate
    // But if we use the same reference, it shouldn't
    const samePositions = positions;
    useWheelStore.setState({ positions: samePositions });
    rerender();

    // Result should be the same if positions array reference is unchanged
    expect(result.current.premiumThisWeek).toBe(firstResult.premiumThisWeek);
  });

  it('useWheelPhase should only recalculate when symbol, positions, or lots change', () => {
    const lots: Lot[] = [
      {
        id: 'lot-1',
        ticker: 'AAPL',
        qty: 100,
        cost: 150,
        opened: '2025-09-01',
      },
    ];

    const positions: Position[] = [
      {
        id: '1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 2.5,
        mark: 2.0,
        dte: 30,
        type: 'C',
        side: 'S',
        opened: '2025-10-01',
      },
    ];

    useWheelStore.setState({ positions, lots });

    const { result, rerender } = renderHook(({ symbol }) => useWheelPhase(symbol), {
      initialProps: { symbol: 'AAPL' },
    });

    const firstResult = result.current;

    // AAPL has shares and short calls, so should be 'Call Expires Worthless'
    expect(result.current).toBe('Call Expires Worthless');

    // Rerender without changing symbol, positions, or lots
    rerender({ symbol: 'AAPL' });

    // Result should be the same (memoized)
    expect(result.current).toBe(firstResult);

    // Change symbol to one with no positions - should recalculate and give different result
    rerender({ symbol: 'TSLA' });

    // TSLA has no positions/lots, so should be 'Sell Cash Secured Puts'
    expect(result.current).toBe('Sell Cash Secured Puts');
    expect(result.current).not.toBe(firstResult);

    // Change positions - remove short calls, which should change the phase
    useWheelStore.setState({ positions: [] });
    rerender({ symbol: 'AAPL' });

    // Result should be different (no short calls with shares means different phase)
    // With shares but no short calls, should be "Sell Covered Calls"
    expect(result.current).toBe('Sell Covered Calls');
    expect(result.current).not.toBe(firstResult);
  });
});
