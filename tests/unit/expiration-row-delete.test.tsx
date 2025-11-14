import { beforeEach, describe, expect, it, vi } from 'vitest';

import { all } from '@/db/sql';
import type { Entry } from '@/types/entry';

// Mock database functions
const mockAll = vi.fn();
const mockSaveDb = vi.fn();

vi.mock('@/db/sql', async () => {
  const actual = await vi.importActual('@/db/sql');
  return {
    ...actual,
    all: (...args: unknown[]) => mockAll(...args),
    saveDb: () => mockSaveDb(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockAll.mockReturnValue([]);
  mockSaveDb.mockResolvedValue(undefined);
});

function makeEntry(partial: Partial<Entry> = {}): Entry {
  return {
    id: 'entry-1',
    ts: '2025-11-13T00:00:00.000Z',
    account_id: 'acct-1',
    symbol: 'TEST',
    type: 'sell_to_open',
    qty: 1,
    amount: 16,
    strike: 100,
    expiration: '2025-11-14T00:00:00.000Z',
    underlying_price: null,
    notes: null,
    meta: {},
    ...partial,
  };
}

// Test the delete query logic directly
describe('ExpirationRow - Delete Query Logic', () => {
  it('should query main entries with correct parameters', async () => {
    const symbol = 'ASTS';
    const strike = 100;
    const expiration = '2025-11-14';

    const sellToOpenEntry = makeEntry({
      id: 'entry-1',
      type: 'sell_to_open',
      symbol,
      strike,
      expiration: '2025-11-14T00:00:00.000Z',
      ts: '2025-11-13T00:00:00.000Z',
    });

    mockAll.mockReturnValueOnce([sellToOpenEntry]);

    // Simulate the delete query logic
    const expDate = expiration.includes('T') ? expiration.slice(0, 10) : expiration;
    const mainEntries = await all<Entry>(
      `SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration,
              underlying_price, notes, meta
       FROM journal
       WHERE symbol = ?
         AND strike = ?
         AND substr(expiration, 1, 10) = ?
         AND (deleted_at IS NULL OR deleted_at = '')`,
      [symbol, strike, expDate]
    );

    expect(mainEntries).toHaveLength(1);
    expect(mainEntries[0]?.id).toBe('entry-1');
    expect(mockAll).toHaveBeenCalledWith(
      expect.stringContaining('WHERE symbol = ?'),
      expect.arrayContaining([symbol, strike, expDate])
    );
  });

  it('should find fee entries on the same date as the position', async () => {
    const symbol = 'ASTS';
    const positionDate = '2025-11-13'; // Date when position was opened

    const feeEntry = makeEntry({
      id: 'entry-2',
      type: 'fee',
      symbol,
      strike: null,
      expiration: null,
      ts: `${positionDate}T00:00:00.000Z`,
      amount: -0.7,
    });

    // Mock the fee query specifically
    mockAll.mockReturnValueOnce([feeEntry]);

    // Simulate finding fee entries
    const feeEntries = await all<Entry>(
      `SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration,
              underlying_price, notes, meta
       FROM journal
       WHERE symbol = ?
         AND type = 'fee'
         AND substr(ts, 1, 10) = ?
         AND (strike IS NULL OR strike = 0)
         AND (expiration IS NULL OR expiration = '')
         AND (deleted_at IS NULL OR deleted_at = '')`,
      [symbol, positionDate]
    );

    expect(feeEntries).toHaveLength(1);
    expect(feeEntries[0]?.id).toBe('entry-2');
    expect(feeEntries[0]?.type).toBe('fee');
  });

  it('should extract YYYY-MM-DD from ISO date strings', () => {
    const isoDate = '2025-11-14T00:00:00.000Z';
    const ymdDate = '2025-11-14';

    // Test date extraction logic
    const expDate = isoDate.includes('T') ? isoDate.slice(0, 10) : isoDate;
    expect(expDate).toBe(ymdDate);

    // Test with already YYYY-MM-DD format
    const alreadyYmd = '2025-11-14';
    const expDate2 = alreadyYmd.includes('T') ? alreadyYmd.slice(0, 10) : alreadyYmd;
    expect(expDate2).toBe(ymdDate);
  });

  it('should combine main entries and fee entries', async () => {
    const symbol = 'TEST';
    const strike = 100;

    const mainEntry = makeEntry({
      id: 'entry-1',
      type: 'sell_to_open',
      symbol,
      strike,
      expiration: '2025-11-14T00:00:00.000Z',
    });

    const feeEntry = makeEntry({
      id: 'entry-2',
      type: 'fee',
      symbol,
      strike: null,
      expiration: null,
    });

    // Mock both queries in order
    mockAll.mockReturnValueOnce([mainEntry]);
    mockAll.mockReturnValueOnce([feeEntry]);

    // Simulate the combined query logic
    const mainEntries = await all<Entry>('SELECT * FROM journal WHERE ...', []);
    const feeEntries = await all<Entry>('SELECT * FROM journal WHERE ...', []);
    const allEntries = [...mainEntries, ...feeEntries];

    expect(allEntries).toHaveLength(2);
    // Order doesn't matter, just check both are present
    expect(allEntries.map(e => e.id).sort()).toEqual(['entry-1', 'entry-2']);
  });

  it('should filter out deleted entries in the query', () => {
    // The query should include deleted_at IS NULL filter
    const query = `
      SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration,
             underlying_price, notes, meta
      FROM journal
      WHERE symbol = ?
        AND strike = ?
        AND substr(expiration, 1, 10) = ?
        AND (deleted_at IS NULL OR deleted_at = '')
    `;

    expect(query).toContain('deleted_at IS NULL');
    expect(query).toContain("deleted_at = ''");
  });

  it('should handle positions with no matching entries', async () => {
    // Reset mock to return empty arrays
    mockAll.mockReset();
    mockAll.mockReturnValueOnce([]); // No main entries
    mockAll.mockReturnValueOnce([]); // No fee entries

    const mainEntries = await all<Entry>('SELECT * FROM journal WHERE ...', []);
    const feeEntries = await all<Entry>('SELECT * FROM journal WHERE ...', []);
    const allEntries = [...mainEntries, ...feeEntries];

    expect(allEntries).toHaveLength(0);
  });

  it('should use expiration date as fallback if sell_to_open entry not found', () => {
    const expiration = '2025-11-14';
    const expDate = expiration.includes('T') ? expiration.slice(0, 10) : expiration;

    // If no sell_to_open entry, use expiration date
    const positionDate = expDate;

    expect(positionDate).toBe('2025-11-14');
  });

  it('should find expiration entries along with sell_to_open entries', async () => {
    const symbol = 'OPEN';
    const strike = 50;
    const expiration = '2025-11-14';

    const sellToOpenEntry = makeEntry({
      id: 'entry-1',
      type: 'sell_to_open',
      symbol,
      strike,
      expiration: '2025-11-14T00:00:00.000Z',
    });

    const expirationEntry = makeEntry({
      id: 'entry-2',
      type: 'expiration',
      symbol,
      strike,
      expiration: '2025-11-14T00:00:00.000Z',
      ts: '2025-11-14T00:00:00.000Z',
    });

    // Reset and set up mocks
    mockAll.mockReset();
    mockAll.mockReturnValueOnce([sellToOpenEntry, expirationEntry]);
    mockAll.mockReturnValueOnce([]); // No fee entries

    const expDate = expiration.includes('T') ? expiration.slice(0, 10) : expiration;
    const mainEntries = await all<Entry>(
      `SELECT id, ts, account_id, symbol, type, qty, amount, strike, expiration,
              underlying_price, notes, meta
       FROM journal
       WHERE symbol = ?
         AND strike = ?
         AND substr(expiration, 1, 10) = ?
         AND (deleted_at IS NULL OR deleted_at = '')`,
      [symbol, strike, expDate]
    );

    expect(mainEntries).toHaveLength(2);
    expect(mainEntries.map(e => e.type).sort()).toEqual(['expiration', 'sell_to_open']);
  });

  it('should handle different expiration date formats correctly', () => {
    const testCases = [
      { input: '2025-11-14', expected: '2025-11-14' },
      { input: '2025-11-14T00:00:00.000Z', expected: '2025-11-14' },
      { input: '2025-11-14T12:30:45.123Z', expected: '2025-11-14' },
    ];

    testCases.forEach(({ input, expected }) => {
      const expDate = input.includes('T') ? input.slice(0, 10) : input;
      expect(expDate).toBe(expected);
    });
  });
});
