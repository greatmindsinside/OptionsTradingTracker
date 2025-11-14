import { beforeEach, describe, expect, it, vi } from 'vitest';

import { all, run } from '@/db/sql';
import type { Position, ShareLot } from '@/hooks/useWheelDatabase';
import {
  calculateCurrentMinStrike,
  type MinStrikeCalculation,
  recordMinStrikeSnapshot,
} from '@/services/minStrikeSnapshot';

// Mock the database functions
vi.mock('@/db/sql', () => ({
  run: vi.fn(),
  all: vi.fn(),
}));

describe('minStrikeSnapshot service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateCurrentMinStrike', () => {
    it('should calculate avg cost from multiple lots', () => {
      const lots: ShareLot[] = [
        { ticker: 'AAPL', qty: 100, costPerShare: 150.0 },
        { ticker: 'AAPL', qty: 50, costPerShare: 155.0 },
      ];
      const positions: Position[] = [];

      // Expected: (100 * 150 + 50 * 155) / 150 = 151.67
      const expected: MinStrikeCalculation = {
        avgCost: 151.67,
        premiumReceived: 0,
        sharesOwned: 150,
        minStrike: 151.67,
      };

      const result = calculateCurrentMinStrike('AAPL', lots, positions);
      expect(result.avgCost).toBeCloseTo(expected.avgCost, 2);
      expect(result.sharesOwned).toBe(expected.sharesOwned);
      expect(result.premiumReceived).toBe(expected.premiumReceived);
      expect(result.minStrike).toBeCloseTo(expected.minStrike, 2);
    });

    it('should sum premium from multiple open covered calls', () => {
      const lots: ShareLot[] = [{ ticker: 'AAPL', qty: 100, costPerShare: 150.0 }];
      const positions: Position[] = [
        {
          id: '1',
          ticker: 'AAPL',
          type: 'C',
          side: 'S',
          qty: 1,
          strike: 160,
          entry: 2.5, // $2.50 per share premium
          mark: 2.5,
          dte: 7,
          m: 0,
        },
        {
          id: '2',
          ticker: 'AAPL',
          type: 'C',
          side: 'S',
          qty: 1,
          strike: 165,
          entry: 1.5, // $1.50 per share premium
          mark: 1.5,
          dte: 14,
          m: 0,
        },
      ];

      // Expected: avg premium = (2.5 * 1 + 1.5 * 1) / 2 = 2.0 per share
      // minStrike = 150 - 2.0 = 148.0
      const expected: MinStrikeCalculation = {
        avgCost: 150.0,
        premiumReceived: 2.0,
        sharesOwned: 100,
        minStrike: 148.0,
      };

      const result = calculateCurrentMinStrike('AAPL', lots, positions);
      expect(result.avgCost).toBe(expected.avgCost);
      expect(result.premiumReceived).toBe(expected.premiumReceived);
      expect(result.sharesOwned).toBe(expected.sharesOwned);
      expect(result.minStrike).toBe(expected.minStrike);
    });

    it('should handle no shares (returns 0)', () => {
      const lots: ShareLot[] = [];
      const positions: Position[] = [];

      const expected: MinStrikeCalculation = {
        avgCost: 0,
        premiumReceived: 0,
        sharesOwned: 0,
        minStrike: 0,
      };

      const result = calculateCurrentMinStrike('AAPL', lots, positions);
      expect(result).toEqual(expected);
    });

    it('should handle no calls (premium = 0)', () => {
      const lots: ShareLot[] = [{ ticker: 'AAPL', qty: 100, costPerShare: 150.0 }];
      const positions: Position[] = [];

      const expected: MinStrikeCalculation = {
        avgCost: 150.0,
        premiumReceived: 0,
        sharesOwned: 100,
        minStrike: 150.0,
      };

      const result = calculateCurrentMinStrike('AAPL', lots, positions);
      expect(result).toEqual(expected);
    });

    it('should ignore non-covered-call positions', () => {
      const lots: ShareLot[] = [{ ticker: 'AAPL', qty: 100, costPerShare: 150.0 }];
      const positions: Position[] = [
        {
          id: '1',
          ticker: 'AAPL',
          type: 'P', // Put, not Call
          side: 'S',
          qty: 1,
          strike: 140,
          entry: 2.0,
          mark: 2.0,
          dte: 7,
          m: 0,
        },
        {
          id: '2',
          ticker: 'AAPL',
          type: 'C',
          side: 'B', // Buy, not Sell
          qty: 1,
          strike: 160,
          entry: 2.0,
          mark: 2.0,
          dte: 7,
          m: 0,
        },
      ];

      const expected: MinStrikeCalculation = {
        avgCost: 150.0,
        premiumReceived: 0, // No covered calls (Call + Sell)
        sharesOwned: 100,
        minStrike: 150.0,
      };

      const result = calculateCurrentMinStrike('AAPL', lots, positions);
      expect(result).toEqual(expected);
    });
  });

  describe('recordMinStrikeSnapshot', () => {
    it('should insert new snapshot', async () => {
      const ticker = 'AAPL';
      const date = '2025-11-14';
      const avgCost = 150.0;
      const premiumReceived = 2.5;
      const sharesOwned = 100;

      // Mock all() to return empty (no existing snapshot)
      vi.mocked(all).mockResolvedValueOnce([]);

      await recordMinStrikeSnapshot(ticker, date, avgCost, premiumReceived, sharesOwned);

      // Verify run() was called with INSERT statement
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ticker_min_strikes'),
        expect.arrayContaining([
          expect.any(String),
          ticker,
          date,
          avgCost,
          premiumReceived,
          147.5,
          sharesOwned,
        ])
      );
    });

    it('should handle duplicate date (update existing)', async () => {
      const ticker = 'AAPL';
      const date = '2025-11-14';
      const avgCost = 150.0;
      const premiumReceived = 2.5;
      const sharesOwned = 100;

      // Mock all() to return existing snapshot
      vi.mocked(all).mockResolvedValueOnce([{ id: 'existing-1', ticker, date }]);

      await recordMinStrikeSnapshot(ticker, date, avgCost, premiumReceived, sharesOwned);

      // Verify run() was called with UPDATE statement
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ticker_min_strikes'),
        expect.arrayContaining([avgCost, premiumReceived, 147.5, sharesOwned, 'existing-1'])
      );
    });

    it('should validate data before insertion', async () => {
      const ticker = 'AAPL';
      const date = '2025-11-14';
      const avgCost = -10; // Invalid: negative
      const premiumReceived = 2.5;
      const sharesOwned = 100;

      // Should throw error for invalid data
      await expect(
        recordMinStrikeSnapshot(ticker, date, avgCost, premiumReceived, sharesOwned)
      ).rejects.toThrow();
    });

    it('should calculate min_strike correctly (avgCost - premiumReceived)', async () => {
      const ticker = 'AAPL';
      const date = '2025-11-14';
      const avgCost = 150.0;
      const premiumReceived = 2.5;
      const sharesOwned = 100;
      const expectedMinStrike = 147.5; // 150.0 - 2.5

      vi.mocked(all).mockResolvedValueOnce([]);

      await recordMinStrikeSnapshot(ticker, date, avgCost, premiumReceived, sharesOwned);

      // Verify min_strike is calculated correctly in the INSERT
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ticker_min_strikes'),
        expect.arrayContaining([
          expect.any(String),
          ticker,
          date,
          avgCost,
          premiumReceived,
          expectedMinStrike,
          sharesOwned,
        ])
      );
    });
  });
});
