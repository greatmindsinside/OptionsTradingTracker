import { describe, expect, it } from 'vitest';

import { transformJournalToPositions } from '@/hooks/useWheelDatabase';
import { tmplPutAssigned, tmplSellPut } from '@/models/templates';
import type { Entry } from '@/types/entry';

/**
 * Test that positions are removed from Upcoming Expirations after recording a Put Assignment.
 * 
 * When a Put Assignment is recorded:
 * 1. A position should exist (from selling a put)
 * 2. An assignment entry is created with meta.assigned: true
 * 3. The position should be closed (qty reduced to 0)
 * 4. The position should not appear in the results (filtered out)
 */
describe('Assignment Position Removal', () => {
  it('should remove position from results after put assignment', () => {
    const symbol = 'TEST';
    const strike = 150;
    const expiration = '2025-12-20';
    const date = '2025-11-01';
    const accountId = 'acct-1';

    // Step 1: Create a sell put entry (opens a position)
    const sellPutRows = tmplSellPut({
      accountId,
      symbol,
      date,
      contracts: 1,
      premiumPerContract: 2.5,
      strike,
      expiration,
    });

    // Step 2: Create a put assignment entry (closes the position)
    const assignmentRows = tmplPutAssigned({
      accountId,
      symbol,
      date: expiration, // Assignment happens on expiration date
      contracts: 1,
      strike,
      expiration,
    });

    // Combine all entries
    const allEntries: Entry[] = [
      ...sellPutRows,
      ...assignmentRows,
    ].map(row => ({
      id: row.id,
      ts: row.ts,
      account_id: row.account_id,
      symbol: row.symbol,
      type: row.type,
      qty: row.qty,
      amount: row.amount,
      strike: row.strike,
      expiration: row.expiration,
      underlying_price: row.underlying_price,
      notes: row.notes,
      meta: row.meta,
    }));

    // Transform entries to positions
    const positions = transformJournalToPositions(allEntries);

    // Verify: Position should NOT be in results (it was closed by assignment)
    const matchingPosition = positions.find(
      p => p.ticker === symbol && p.strike === strike
    );

    expect(matchingPosition).toBeUndefined();
    expect(positions.length).toBe(0);
  });

  it('should keep position open if assignment only partially closes it', () => {
    const symbol = 'TEST';
    const strike = 150;
    const expiration = '2025-12-20';
    const date = '2025-11-01';
    const accountId = 'acct-1';

    // Step 1: Create a sell put entry for 2 contracts (opens position with qty 2)
    const sellPutRows = tmplSellPut({
      accountId,
      symbol,
      date,
      contracts: 2,
      premiumPerContract: 2.5,
      strike,
      expiration,
    });

    // Step 2: Create a put assignment entry for only 1 contract (partially closes)
    const assignmentRows = tmplPutAssigned({
      accountId,
      symbol,
      date: expiration,
      contracts: 1, // Only 1 contract assigned
      strike,
      expiration,
    });

    // Combine all entries
    const allEntries: Entry[] = [
      ...sellPutRows,
      ...assignmentRows,
    ].map(row => ({
      id: row.id,
      ts: row.ts,
      account_id: row.account_id,
      symbol: row.symbol,
      type: row.type,
      qty: row.qty,
      amount: row.amount,
      strike: row.strike,
      expiration: row.expiration,
      underlying_price: row.underlying_price,
      notes: row.notes,
      meta: row.meta,
    }));

    // Transform entries to positions
    const positions = transformJournalToPositions(allEntries);

    // Verify: Position should still exist with qty = 1 (2 - 1 = 1)
    const matchingPosition = positions.find(
      p => p.ticker === symbol && p.strike === strike
    );

    expect(matchingPosition).toBeDefined();
    expect(matchingPosition?.qty).toBe(1);
  });

  it('should handle multiple positions with same symbol but different strikes', () => {
    const symbol = 'TEST';
    const expiration = '2025-12-20';
    const date = '2025-11-01';
    const accountId = 'acct-1';

    // Create two positions with different strikes
    const sellPut1 = tmplSellPut({
      accountId,
      symbol,
      date,
      contracts: 1,
      premiumPerContract: 2.5,
      strike: 150,
      expiration,
    });

    const sellPut2 = tmplSellPut({
      accountId,
      symbol,
      date,
      contracts: 1,
      premiumPerContract: 3.0,
      strike: 160,
      expiration,
    });

    // Assign only the first position (strike 150)
    const assignment = tmplPutAssigned({
      accountId,
      symbol,
      date: expiration,
      contracts: 1,
      strike: 150,
      expiration,
    });

    const allEntries: Entry[] = [
      ...sellPut1,
      ...sellPut2,
      ...assignment,
    ].map(row => ({
      id: row.id,
      ts: row.ts,
      account_id: row.account_id,
      symbol: row.symbol,
      type: row.type,
      qty: row.qty,
      amount: row.amount,
      strike: row.strike,
      expiration: row.expiration,
      underlying_price: row.underlying_price,
      notes: row.notes,
      meta: row.meta,
    }));

    const positions = transformJournalToPositions(allEntries);

    // Verify: Only strike 150 position should be closed, strike 160 should remain
    const position150 = positions.find(p => p.ticker === symbol && p.strike === 150);
    const position160 = positions.find(p => p.ticker === symbol && p.strike === 160);

    expect(position150).toBeUndefined(); // Closed by assignment
    expect(position160).toBeDefined(); // Still open
    expect(position160?.qty).toBe(1);
  });

  it('should not close position if expiration entry does not have meta.assigned: true', () => {
    const symbol = 'TEST';
    const strike = 150;
    const expiration = '2025-12-20';
    const date = '2025-11-01';
    const accountId = 'acct-1';

    // Create a sell put entry
    const sellPutRows = tmplSellPut({
      accountId,
      symbol,
      date,
      contracts: 1,
      premiumPerContract: 2.5,
      strike,
      expiration,
    });

    // Create an expiration entry WITHOUT assigned flag (just expires worthless)
    const expirationEntry: Entry = {
      id: 'exp-1',
      ts: expiration,
      account_id: accountId,
      symbol,
      type: 'expiration',
      qty: 1,
      amount: 0,
      strike,
      expiration,
      underlying_price: null,
      notes: null,
      meta: {}, // No assigned flag
    };

    const allEntries: Entry[] = [
      ...sellPutRows.map(row => ({
        id: row.id,
        ts: row.ts,
        account_id: row.account_id,
        symbol: row.symbol,
        type: row.type,
        qty: row.qty,
        amount: row.amount,
        strike: row.strike,
        expiration: row.expiration,
        underlying_price: row.underlying_price,
        notes: row.notes,
        meta: row.meta,
      })),
      expirationEntry,
    ];

    const positions = transformJournalToPositions(allEntries);

    // Verify: Position should still exist (expired worthless, not assigned)
    const matchingPosition = positions.find(
      p => p.ticker === symbol && p.strike === strike
    );

    // Note: Currently the function doesn't handle expiration without assignment,
    // so the position will remain. This test documents the current behavior.
    expect(matchingPosition).toBeDefined();
    expect(matchingPosition?.qty).toBe(1);
  });

  it('should handle assignment with JSON string meta', () => {
    const symbol = 'TEST';
    const strike = 150;
    const expiration = '2025-12-20';
    const date = '2025-11-01';
    const accountId = 'acct-1';

    // Create a sell put entry
    const sellPutRows = tmplSellPut({
      accountId,
      symbol,
      date,
      contracts: 1,
      premiumPerContract: 2.5,
      strike,
      expiration,
    });

    // Create assignment entry with meta as JSON string (simulating database storage)
    const assignmentRows = tmplPutAssigned({
      accountId,
      symbol,
      date: expiration,
      contracts: 1,
      strike,
      expiration,
    });

    // Convert meta to JSON string for one of the expiration entries
    const allEntries: Entry[] = [
      ...sellPutRows,
      ...assignmentRows,
    ].map(row => {
      const entry: Entry = {
        id: row.id,
        ts: row.ts,
        account_id: row.account_id,
        symbol: row.symbol,
        type: row.type,
        qty: row.qty,
        amount: row.amount,
        strike: row.strike,
        expiration: row.expiration,
        underlying_price: row.underlying_price,
        notes: row.notes,
        meta: row.meta,
      };

      // If this is the expiration entry, convert meta to JSON string
      if (row.type === 'expiration' && row.meta && typeof row.meta === 'object') {
        entry.meta = JSON.stringify(row.meta) as unknown as Record<string, unknown>;
      }

      return entry;
    });

    const positions = transformJournalToPositions(allEntries);

    // Verify: Position should be closed even with JSON string meta
    const matchingPosition = positions.find(
      p => p.ticker === symbol && p.strike === strike
    );

    expect(matchingPosition).toBeUndefined();
    expect(positions.length).toBe(0);
  });
});

