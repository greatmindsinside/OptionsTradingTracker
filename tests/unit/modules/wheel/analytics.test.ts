/**
 * Wheel Analytics Tests
 *
 * Test suite for wheel strategy analytics calculations
 */

import { describe, it, expect } from 'vitest';
import { WheelAnalytics } from '../../../../src/modules/wheel/analytics';
import { WheelState, WheelEvent } from '../../../../src/modules/wheel/lifecycle';
import type {
  WheelCycle,
  WheelEvent_Record as WheelEventRecord,
} from '../../../../src/modules/db/validation';

describe('WheelAnalytics', () => {
  const mockCycle: WheelCycle = {
    id: 1,
    lifecycle_id: 'AAPL_2024-01-15_001',
    portfolio_id: 1,
    symbol_id: 1,
    underlying_symbol: 'AAPL',
    status: WheelState.CC_OPEN,
    total_net_credit: 850,
    cost_basis: 150.5,
    shares_owned: 100,
    csp_trade_ids: '["1", "2"]',
    cc_trade_ids: '["3"]',
    stock_trade_ids: '["4"]',
    total_premium_collected: 850,
    realized_pnl: undefined,
    unrealized_pnl: 425,
    days_active: 15,
    annualized_return: 0.24,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-30T00:00:00Z',
  };

  const mockEvents: WheelEventRecord[] = [
    {
      id: 1,
      lifecycle_id: 'AAPL_2024-01-15_001',
      event_type: WheelEvent.CSP_SOLD,
      event_date: '2024-01-15',
      trade_id: 1,
      description: 'Sold 1 AAPL $150 put for $3.50 premium',
      amount: 350,
      strike_price: 150,
      expiry_date: '2024-02-16',
      created_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 2,
      lifecycle_id: 'AAPL_2024-01-15_001',
      event_type: WheelEvent.CSP_ASSIGNED,
      event_date: '2024-01-20',
      trade_id: 4,
      description: 'Assigned 100 shares of AAPL at $150.00',
      amount: -15000,
      strike_price: 150,
      expiry_date: undefined,
      created_at: '2024-01-20T00:00:00Z',
    },
    {
      id: 3,
      lifecycle_id: 'AAPL_2024-01-15_001',
      event_type: WheelEvent.CC_SOLD,
      event_date: '2024-01-25',
      trade_id: 3,
      description: 'Sold 1 AAPL $155 call for $5.00 premium',
      amount: 500,
      strike_price: 155,
      expiry_date: '2024-03-15',
      created_at: '2024-01-25T00:00:00Z',
    },
  ];

  describe('calculateCycleAnalytics', () => {
    it('should calculate basic cycle metrics correctly', () => {
      const analytics = WheelAnalytics.calculateCycleAnalytics(mockCycle, mockEvents, 152);

      expect(analytics.lifecycleId).toBe('AAPL_2024-01-15_001');
      expect(analytics.underlying).toBe('AAPL');
      expect(analytics.totalNetCredit).toBeGreaterThan(0);
      expect(analytics.legMetrics).toHaveLength(3);
      expect(analytics.maxCapitalAtRisk).toBeGreaterThan(0);
    });

    it('should calculate ROO and ROR correctly', () => {
      const analytics = WheelAnalytics.calculateCycleAnalytics(mockCycle, mockEvents, 152);

      expect(analytics.cumulativeROO).toBeGreaterThan(0);
      expect(analytics.cumulativeROR).toBeDefined();
      expect(analytics.annualizedReturn).toBeDefined();
    });

    it('should handle cycles with no events', () => {
      const analytics = WheelAnalytics.calculateCycleAnalytics(mockCycle, [], 152);

      expect(analytics.legMetrics).toHaveLength(0);
      expect(analytics.maxCapitalAtRisk).toBe(0);
      expect(analytics.cumulativeROO).toBe(0);
    });
  });

  describe('calculatePortfolioAnalytics', () => {
    it('should calculate portfolio-level metrics', () => {
      const cycles = [mockCycle];
      const eventsMap = new Map([['AAPL_2024-01-15_001', mockEvents]]);
      const currentPrices = new Map([['AAPL', 152]]);

      const portfolio = WheelAnalytics.calculatePortfolioAnalytics(
        cycles,
        eventsMap,
        currentPrices
      );

      expect(portfolio.totalCycles).toBe(1);
      expect(portfolio.activeCycles).toBe(1);
      expect(portfolio.completedCycles).toBe(0);
      expect(portfolio.overallROO).toBeDefined();
      expect(portfolio.overallROR).toBeDefined();
    });

    it('should handle empty portfolio', () => {
      const portfolio = WheelAnalytics.calculatePortfolioAnalytics([], new Map(), new Map());

      expect(portfolio.totalCycles).toBe(0);
      expect(portfolio.activeCycles).toBe(0);
      expect(portfolio.totalPremiumCollected).toBe(0);
    });
  });

  describe('compareCycles', () => {
    it('should identify top and bottom performers', () => {
      const analytics1 = WheelAnalytics.calculateCycleAnalytics(mockCycle, mockEvents, 152);
      const analytics2 = WheelAnalytics.calculateCycleAnalytics(
        {
          ...mockCycle,
          lifecycle_id: 'AAPL_2024-02-15_001',
          unrealized_pnl: -200,
          annualized_return: -0.1,
        },
        mockEvents,
        145
      );

      const comparison = WheelAnalytics.compareCycles([analytics1, analytics2]);

      expect(comparison.topPerformers).toHaveLength(1);
      expect(comparison.underPerformers).toHaveLength(1);
      expect(comparison.averageMetrics.cumulativeROO).toBeDefined();
    });
  });
});
