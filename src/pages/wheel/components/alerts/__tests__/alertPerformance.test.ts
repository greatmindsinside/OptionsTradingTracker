/**
 * Performance test for alert generation system
 * Ensures no page freezing by verifying alert generation completes quickly
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Lot, Position } from '@/types/wheel';

import { useAlertGeneration } from '../useAlertGeneration';

// Mock the Zustand store
vi.mock('@/stores/useWheelStore', () => ({
  useWheelStore: vi.fn(),
}));

import { useWheelStore } from '@/stores/useWheelStore';

describe('Alert Generation Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockPosition = (index: number): Position => ({
    id: `pos-${index}`,
    ticker: `TICK${index % 5}`, // 5 different tickers
    qty: 1,
    strike: 100 + index,
    entry: 2.5,
    mark: 1.0,
    dte: 30 - (index % 30),
    type: index % 2 === 0 ? 'P' : 'C',
    side: 'S',
    opened: '2024-01-01',
  });

  const createMockLot = (index: number): Lot => ({
    id: `lot-${index}`,
    ticker: `TICK${index % 5}`,
    qty: 100,
    cost: 10000,
    opened: '2024-01-01',
  });

  it('should generate alerts in under 20ms with 10 positions (includes initial render overhead)', () => {
    const positions = Array.from({ length: 10 }, (_, i) => createMockPosition(i));
    const lots = Array.from({ length: 5 }, (_, i) => createMockLot(i));
    const earnings = { TICK0: '2024-12-01', TICK1: '2024-12-15' };

    (useWheelStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector =>
      selector({ positions, lots, earnings })
    );

    const start = performance.now();
    const { result } = renderHook(() => useAlertGeneration());
    const duration = performance.now() - start;

    console.log(
      `✓ Generated ${result.current.length} alerts in ${duration.toFixed(2)}ms (10 positions)`
    );
    expect(duration).toBeLessThan(20); // Initial render has test framework overhead
    expect(result.current).toBeInstanceOf(Array);
  });

  it('should generate alerts in under 20ms with 50 positions', () => {
    const positions = Array.from({ length: 50 }, (_, i) => createMockPosition(i));
    const lots = Array.from({ length: 10 }, (_, i) => createMockLot(i));
    const earnings = { TICK0: '2024-12-01', TICK1: '2024-12-15', TICK2: '2024-12-20' };

    (useWheelStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector =>
      selector({ positions, lots, earnings })
    );

    const start = performance.now();
    const { result } = renderHook(() => useAlertGeneration());
    const duration = performance.now() - start;

    console.log(
      `✓ Generated ${result.current.length} alerts in ${duration.toFixed(2)}ms (50 positions)`
    );
    expect(duration).toBeLessThan(20);
    expect(result.current).toBeInstanceOf(Array);
  });

  it('should generate alerts in under 50ms with 100 positions', () => {
    const positions = Array.from({ length: 100 }, (_, i) => createMockPosition(i));
    const lots = Array.from({ length: 20 }, (_, i) => createMockLot(i));
    const earnings = {
      TICK0: '2024-12-01',
      TICK1: '2024-12-15',
      TICK2: '2024-12-20',
      TICK3: '2024-12-25',
    };

    (useWheelStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector =>
      selector({ positions, lots, earnings })
    );

    const start = performance.now();
    const { result } = renderHook(() => useAlertGeneration());
    const duration = performance.now() - start;

    console.log(
      `✓ Generated ${result.current.length} alerts in ${duration.toFixed(2)}ms (100 positions)`
    );
    expect(duration).toBeLessThan(50);
    expect(result.current).toBeInstanceOf(Array);
  });

  it('should properly memoize and not recalculate on unrelated updates', () => {
    const positions = Array.from({ length: 10 }, (_, i) => createMockPosition(i));
    const lots = Array.from({ length: 5 }, (_, i) => createMockLot(i));
    const earnings = { TICK0: '2024-12-01' };

    (useWheelStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector =>
      selector({ positions, lots, earnings })
    );

    const { result, rerender } = renderHook(() => useAlertGeneration());
    const firstResult = result.current;

    // Rerender with same data - should return memoized result
    rerender();
    const secondResult = result.current;

    // Should be the exact same reference (memoized)
    expect(firstResult).toBe(secondResult);
  });

  it('should generate alerts with proper priority sorting', () => {
    const positions: Position[] = [
      {
        id: 'pos-1',
        ticker: 'AAPL',
        qty: 1,
        strike: 150,
        entry: 3.0,
        mark: 0.5,
        dte: 1, // Urgent - expires tomorrow
        type: 'P',
        side: 'S',
        opened: '2024-01-01',
      },
      {
        id: 'pos-2',
        ticker: 'TSLA',
        qty: 1,
        strike: 200,
        entry: 5.0,
        mark: 1.0,
        dte: 5, // Info - expires in 5 days
        type: 'C',
        side: 'S',
        opened: '2024-01-01',
      },
      {
        id: 'pos-3',
        ticker: 'NVDA',
        qty: 1,
        strike: 500,
        entry: 10.0,
        mark: 1.0,
        dte: 30, // High profit - opportunity
        type: 'P',
        side: 'S',
        opened: '2024-01-01',
      },
    ];

    (useWheelStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector =>
      selector({ positions, lots: [], earnings: {} })
    );

    const { result } = renderHook(() => useAlertGeneration());
    const alerts = result.current;

    // Should have alerts
    expect(alerts.length).toBeGreaterThan(0);

    // Urgent alerts should come first
    const priorities = alerts.map(a => a.priority);
    let seenNonUrgent = false;
    priorities.forEach(priority => {
      if (priority !== 'urgent') {
        seenNonUrgent = true;
      }
      if (seenNonUrgent) {
        expect(priority).not.toBe('urgent');
      }
    });
  });

  it('should handle empty data gracefully and quickly', () => {
    (useWheelStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector =>
      selector({ positions: [], lots: [], earnings: {} })
    );

    const start = performance.now();
    const { result } = renderHook(() => useAlertGeneration());
    const duration = performance.now() - start;

    console.log(`✓ Handled empty data in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(5);
    expect(result.current).toEqual([]);
  });

  it('should not freeze the main thread (under 50ms threshold)', () => {
    // Real-world scenario: moderate portfolio
    const positions = Array.from({ length: 30 }, (_, i) => createMockPosition(i));
    const lots = Array.from({ length: 15 }, (_, i) => createMockLot(i));
    const earnings = {
      TICK0: '2024-12-01',
      TICK1: '2024-12-05',
      TICK2: '2024-12-10',
    };

    (useWheelStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector =>
      selector({ positions, lots, earnings })
    );

    const start = performance.now();
    const { result } = renderHook(() => useAlertGeneration());
    const duration = performance.now() - start;

    console.log(
      `✓ Real-world scenario: ${result.current.length} alerts in ${duration.toFixed(2)}ms`
    );

    // Main thread freeze threshold is typically 50ms
    expect(duration).toBeLessThan(50);
    expect(result.current).toBeInstanceOf(Array);
  });
});
