/**
 * Price Data Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PriceDataManager,
  MockPriceAdapter,
  PriceSource,
  UpdateFrequency,
} from '../../../../src/modules/price/price-data';
import type { PriceAlert } from '../../../../src/modules/price/price-data';

describe('Price Data Integration System', () => {
  let priceManager: PriceDataManager;
  let mockAdapter: MockPriceAdapter;

  beforeEach(() => {
    priceManager = new PriceDataManager();
    mockAdapter = new MockPriceAdapter();
  });

  afterEach(() => {
    priceManager.cleanup();
    vi.clearAllTimers();
  });

  describe('Price Adapter Registration', () => {
    it('should register and use price adapters', async () => {
      priceManager.registerAdapter(mockAdapter);

      const quote = await priceManager.getQuote('AAPL', PriceSource.MOCK);

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
      expect(quote.source).toBe(PriceSource.MOCK);
      expect(typeof quote.price).toBe('number');
      expect(quote.price).toBeGreaterThan(0);
    });

    it('should throw error for unregistered adapter', async () => {
      await expect(priceManager.getQuote('AAPL', PriceSource.YAHOO_FINANCE)).rejects.toThrow(
        'Price adapter not found for source: yahoo_finance'
      );
    });
  });

  describe('Single Quote Retrieval', () => {
    beforeEach(() => {
      priceManager.registerAdapter(mockAdapter);
    });

    it('should retrieve valid price quote', async () => {
      const quote = await priceManager.getQuote('AAPL');

      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.bid).toBeDefined();
      expect(quote.ask).toBeDefined();
      expect(quote.ask).toBeGreaterThan(quote.bid!);
      expect(quote.volume).toBeGreaterThan(0);
      expect(quote.timestamp).toBeDefined();
      expect(quote.confidence).toBeGreaterThan(0.9);
    });

    it('should include market status information', async () => {
      const quote = await priceManager.getQuote('MSFT');

      expect(typeof quote.isMarketHours).toBe('boolean');
      expect(quote.previousClose).toBeDefined();
      expect(quote.change).toBeDefined();
      expect(quote.changePercent).toBeDefined();
    });

    it('should cache quotes to improve performance', async () => {
      const quote1 = await priceManager.getQuote('AAPL');
      const quote2 = await priceManager.getQuote('AAPL'); // Should be cached

      // Cached quotes should return the exact same data
      expect(quote1.price).toBe(quote2.price);
      expect(quote1.timestamp).toBe(quote2.timestamp);

      // Test cache bypass
      const quote3 = await priceManager.getQuote('AAPL', PriceSource.MOCK, false);
      expect(quote3.symbol).toBe('AAPL');
    });

    it('should bypass cache when requested', async () => {
      const quote1 = await priceManager.getQuote('AAPL', PriceSource.MOCK, true);
      const quote2 = await priceManager.getQuote('AAPL', PriceSource.MOCK, false);

      // Prices might be different due to mock randomization
      expect(quote1.symbol).toBe(quote2.symbol);
      expect(quote1.source).toBe(quote2.source);
    });
  });

  describe('Multi-Quote Retrieval', () => {
    beforeEach(() => {
      priceManager.registerAdapter(mockAdapter);
    });

    it('should retrieve quotes for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const quotes = await priceManager.getQuotes(symbols);

      expect(quotes).toHaveLength(3);

      quotes.forEach((quote, index) => {
        expect(quote.symbol).toBe(symbols[index]);
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.source).toBe(PriceSource.MOCK);
      });
    });

    it('should handle empty symbol array', async () => {
      const quotes = await priceManager.getQuotes([]);
      expect(quotes).toHaveLength(0);
    });

    it('should cache all retrieved quotes', async () => {
      const symbols = ['AAPL', 'MSFT'];
      await priceManager.getQuotes(symbols);

      // Subsequent individual calls should be cached
      const start = Date.now();
      await priceManager.getQuote('AAPL');
      const cachedCallTime = Date.now() - start;

      expect(cachedCallTime).toBeLessThan(10); // Very fast cached response
    });
  });

  describe('Historical Data', () => {
    beforeEach(() => {
      priceManager.registerAdapter(mockAdapter);
    });

    it('should retrieve historical price data', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';

      const historicalData = await priceManager.getHistoricalData('AAPL', startDate, endDate);

      expect(historicalData.length).toBeGreaterThan(15); // Should have weekdays

      historicalData.forEach(price => {
        expect(price.symbol).toBe('AAPL');
        expect(price.open).toBeGreaterThan(0);
        expect(price.high).toBeGreaterThanOrEqual(price.open);
        expect(price.low).toBeLessThanOrEqual(price.open);
        expect(price.close).toBeGreaterThan(0);
        expect(price.volume).toBeGreaterThan(0);
        expect(price.source).toBe(PriceSource.MOCK);
      });
    });

    it('should return data in chronological order', async () => {
      const historicalData = await priceManager.getHistoricalData(
        'AAPL',
        '2023-01-01',
        '2023-01-15'
      );

      for (let i = 1; i < historicalData.length; i++) {
        const currentDate = new Date(historicalData[i].date);
        const previousDate = new Date(historicalData[i - 1].date);
        expect(currentDate.getTime()).toBeGreaterThan(previousDate.getTime());
      }
    });

    it('should skip weekends in daily data', async () => {
      const historicalData = await priceManager.getHistoricalData(
        'AAPL',
        '2023-01-01',
        '2023-01-15'
      );

      historicalData.forEach(price => {
        const date = new Date(price.date);
        const dayOfWeek = date.getDay();
        expect(dayOfWeek).not.toBe(0); // Not Sunday
        expect(dayOfWeek).not.toBe(6); // Not Saturday
      });
    });
  });

  describe('Price Subscriptions', () => {
    beforeEach(() => {
      priceManager.registerAdapter(mockAdapter);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create and manage price subscriptions', async () => {
      const subscriptionId = await priceManager.subscribeToPrice(
        'AAPL',
        UpdateFrequency.ONE_MINUTE
      );

      expect(subscriptionId).toBeDefined();

      const subscriptions = priceManager.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].symbol).toBe('AAPL');
      expect(subscriptions[0].frequency).toBe(UpdateFrequency.ONE_MINUTE);
      expect(subscriptions[0].isActive).toBe(true);
    });

    it('should execute subscription callbacks', async () => {
      const callback = vi.fn();

      await priceManager.subscribeToPrice(
        'AAPL',
        UpdateFrequency.FIVE_SECONDS,
        PriceSource.MOCK,
        callback
      );

      // Fast-forward time to trigger the subscription
      await vi.advanceTimersByTimeAsync(6000); // 6 seconds

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
          price: expect.any(Number),
          source: PriceSource.MOCK,
        })
      );
    });

    it('should unsubscribe properly', async () => {
      const subscriptionId = await priceManager.subscribeToPrice(
        'AAPL',
        UpdateFrequency.ONE_MINUTE
      );

      expect(priceManager.getActiveSubscriptions()).toHaveLength(1);

      priceManager.unsubscribeFromPrice(subscriptionId);

      expect(priceManager.getActiveSubscriptions()).toHaveLength(0);
    });

    it('should handle subscription errors gracefully', async () => {
      // Create a failing adapter
      const failingAdapter = new MockPriceAdapter();
      failingAdapter.getQuote = vi.fn().mockRejectedValue(new Error('Network error'));

      priceManager.registerAdapter(failingAdapter);

      const subscriptionId = await priceManager.subscribeToPrice(
        'FAIL',
        UpdateFrequency.FIVE_SECONDS
      );

      // Advance time to trigger failures
      await vi.advanceTimersByTimeAsync(30000); // 30 seconds = 6 attempts

      // Subscription should be disabled after max errors
      const activeSubscriptions = priceManager.getActiveSubscriptions();
      const activeSubscription = activeSubscriptions.find(s => s.id === subscriptionId);
      expect(activeSubscription).toBeUndefined(); // Should not be in active subscriptions
    });
  });

  describe('Price Alerts', () => {
    beforeEach(() => {
      priceManager.registerAdapter(mockAdapter);
    });

    it('should create price alerts', () => {
      const alertConfig: Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt'> = {
        symbol: 'AAPL',
        alertType: 'above',
        triggerValue: 200.0,
        isTriggered: false,
        isActive: true,
        message: 'AAPL above $200',
        portfolioId: 'portfolio_1',
        userId: 'user_1',
      };

      const alertId = priceManager.createPriceAlert(alertConfig);

      expect(alertId).toBeDefined();

      const alerts = priceManager.getPriceAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].symbol).toBe('AAPL');
      expect(alerts[0].alertType).toBe('above');
      expect(alerts[0].triggerValue).toBe(200.0);
    });

    it('should trigger above alerts when price exceeds threshold', async () => {
      // Create an alert for a low threshold that will trigger
      const alertConfig: Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt'> = {
        symbol: 'AAPL',
        alertType: 'above',
        triggerValue: 100.0, // Very low threshold, should trigger
        isTriggered: false,
        isActive: true,
        portfolioId: 'portfolio_1',
        userId: 'user_1',
      };

      priceManager.createPriceAlert(alertConfig);

      // Getting quote should check and trigger alerts
      await priceManager.getQuote('AAPL');

      const alerts = priceManager.getPriceAlerts();
      expect(alerts[0].isTriggered).toBe(true);
    });

    it('should trigger below alerts when price falls below threshold', async () => {
      const alertConfig: Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt'> = {
        symbol: 'AAPL',
        alertType: 'below',
        triggerValue: 1000.0, // Very high threshold, should trigger
        isTriggered: false,
        isActive: true,
        portfolioId: 'portfolio_1',
        userId: 'user_1',
      };

      priceManager.createPriceAlert(alertConfig);

      await priceManager.getQuote('AAPL');

      const alerts = priceManager.getPriceAlerts();
      expect(alerts[0].isTriggered).toBe(true);
    });

    it('should not trigger inactive alerts', async () => {
      const alertConfig: Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt'> = {
        symbol: 'AAPL',
        alertType: 'above',
        triggerValue: 100.0,
        isTriggered: false,
        isActive: false, // Inactive alert
        portfolioId: 'portfolio_1',
        userId: 'user_1',
      };

      priceManager.createPriceAlert(alertConfig);

      await priceManager.getQuote('AAPL');

      const alerts = priceManager.getPriceAlerts();
      expect(alerts[0].isTriggered).toBe(false); // Should remain untriggered
    });
  });

  describe('Position Valuation', () => {
    beforeEach(() => {
      priceManager.registerAdapter(mockAdapter);
    });

    it('should calculate position values correctly', async () => {
      const positions = [
        { symbol: 'AAPL', quantity: 100 },
        { symbol: 'MSFT', quantity: 50 },
        { symbol: 'GOOGL', quantity: 25 },
      ];

      const valuation = await priceManager.calculatePositionValue(positions);

      expect(valuation.totalValue).toBeGreaterThan(0);
      expect(valuation.positions).toHaveLength(3);

      valuation.positions.forEach((pos, index) => {
        expect(pos.symbol).toBe(positions[index].symbol);
        expect(pos.quantity).toBe(positions[index].quantity);
        expect(pos.currentPrice).toBeGreaterThan(0);
        expect(pos.marketValue).toBe(pos.currentPrice * pos.quantity);
      });

      // Verify total is sum of individual position values
      const calculatedTotal = valuation.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
      expect(valuation.totalValue).toBeCloseTo(calculatedTotal, 2);
    });

    it('should handle empty positions array', async () => {
      const valuation = await priceManager.calculatePositionValue([]);

      expect(valuation.totalValue).toBe(0);
      expect(valuation.positions).toHaveLength(0);
    });

    it('should handle duplicate symbols correctly', async () => {
      const positions = [
        { symbol: 'AAPL', quantity: 100 },
        { symbol: 'AAPL', quantity: 50 }, // Duplicate symbol
      ];

      const valuation = await priceManager.calculatePositionValue(positions);

      expect(valuation.positions).toHaveLength(2);
      expect(valuation.positions[0].currentPrice).toBe(valuation.positions[1].currentPrice);
    });
  });

  describe('Mock Price Adapter', () => {
    it('should validate symbols correctly', () => {
      expect(mockAdapter.validateSymbol('AAPL')).toBe(true);
      expect(mockAdapter.validateSymbol('MSFT')).toBe(true);
      expect(mockAdapter.validateSymbol('GOOGL')).toBe(true);

      expect(mockAdapter.validateSymbol('aapl')).toBe(false); // lowercase
      expect(mockAdapter.validateSymbol('TOOLONG')).toBe(false); // too long
      expect(mockAdapter.validateSymbol('A1')).toBe(false); // contains number
      expect(mockAdapter.validateSymbol('')).toBe(false); // empty
    });

    it('should report rate limits', () => {
      const limits = mockAdapter.getRateLimits();

      expect(limits.remainingRequests).toBeGreaterThan(0);
      expect(limits.resetTime).toBeInstanceOf(Date);
      expect(limits.resetTime.getTime()).toBeGreaterThan(Date.now());
    });

    it('should determine market hours status', async () => {
      const isOpen = await mockAdapter.isMarketOpen();
      expect(typeof isOpen).toBe('boolean');

      // Mock should simulate market hours based on current time
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      const expectedOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 16;

      expect(isOpen).toBe(expectedOpen);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      priceManager.registerAdapter(mockAdapter);
    });

    it('should handle malformed symbols gracefully', async () => {
      // Mock adapter should still return data for any symbol
      const quote = await priceManager.getQuote('INVALID123');
      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('INVALID123');
    });

    it('should handle date range edge cases in historical data', async () => {
      // Same start and end date
      const sameDay = await priceManager.getHistoricalData('AAPL', '2023-01-15', '2023-01-15');
      expect(sameDay.length).toBeGreaterThanOrEqual(0);

      // End date before start date
      const reversed = await priceManager.getHistoricalData('AAPL', '2023-01-31', '2023-01-01');
      expect(reversed.length).toBe(0);
    });

    it('should cleanup properly', () => {
      priceManager.subscribeToPrice('AAPL', UpdateFrequency.ONE_MINUTE);
      priceManager.subscribeToPrice('MSFT', UpdateFrequency.FIVE_MINUTES);

      expect(priceManager.getActiveSubscriptions()).toHaveLength(2);

      priceManager.cleanup();

      expect(priceManager.getActiveSubscriptions()).toHaveLength(0);
    });
  });
});
