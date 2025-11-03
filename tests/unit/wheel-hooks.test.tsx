import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWheelMetrics } from '@/pages/wheel/hooks/useWheelMetrics';
import { useFilteredTickers } from '@/pages/wheel/hooks/useFilteredTickers';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import type { Position, Lot } from '@/types/wheel';

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

  it('should calculate covered shares for short calls', () => {
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

    // 1 short call = 100 shares needed; we have 200 shares, so 100 covered
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
