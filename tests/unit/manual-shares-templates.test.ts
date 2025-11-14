import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { tmplPutAssigned } from '@/models/templates';
import { useWheelPhase } from '@/pages/wheel/hooks/useWheelPhase';
import { useWheelStore } from '@/stores/useWheelStore';
import type { Lot, Position } from '@/types/wheel';

/**
 * This test demonstrates how to manually add shares via the existing templates
 * (without going through UI), and verifies the Wheel phase logic treats calls as covered
 * when at least 100 shares exist for the symbol.
 */
describe('manual shares via templates -> covered calls phase', () => {
  beforeEach(() => {
    // Reset wheel store
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

  it('creates a 100-share lot via tmplPutAssigned and yields covered call phase', () => {
    const symbol = 'COVER';
    const date = new Date().toISOString().slice(0, 10);

    // 1) Manually create journal rows that represent a put assignment (100 shares in)
    //    Using the existing template API used by the rest of the app.
    const rows = tmplPutAssigned({
      accountId: 'acct-1',
      symbol,
      date,
      contracts: 1, // 1 contract -> 100 shares
      strike: 50,
      expiration: date, // assignment date
    });

    // 2) From those rows, find the assignment_shares row and translate into a Lot for Wheel store
    const assignment = rows.find(r => r.type === 'assignment_shares');
    expect(assignment, 'Expected an assignment_shares row from tmplPutAssigned').toBeTruthy();

    const shares = Math.abs(assignment?.qty ?? 0); // should be 100
    const totalCost = Math.abs(assignment?.amount ?? 0); // 50 * 100 = 5000
    const costPerShare = shares > 0 ? totalCost / shares : 0; // 50

    const lots: Lot[] = [
      {
        id: 'lot-test',
        ticker: symbol,
        qty: shares,
        cost: costPerShare,
        opened: date,
      },
    ];

    // 3) Add a short call position for the same symbol (1 contract)
    const positions: Position[] = [
      {
        id: 'pos-test',
        ticker: symbol,
        qty: 1,
        strike: 55,
        entry: 1.5,
        mark: 0,
        dte: 30,
        type: 'C',
        side: 'S',
        opened: date,
      },
    ];

    // 4) Seed the wheel store with our derived data
    useWheelStore.setState({ lots, positions });

    // 5) Verify the phase indicates the call is covered (has shares + short calls)
    const { result } = renderHook(() => useWheelPhase(symbol));
    expect(result.current).toBe('Call Expires Worthless');
  });
});
