/**
 * Price Data Integration System
 *
 * Multi-source price data management with historical tracking,
 * real-time updates, and comprehensive price analytics for options trading.
 */

import { z } from 'zod';

// Price data source types
export const PriceSource = {
  YAHOO_FINANCE: 'yahoo_finance',
  ALPHA_VANTAGE: 'alpha_vantage',
  IEX_CLOUD: 'iex_cloud',
  POLYGON: 'polygon',
  FINNHUB: 'finnhub',
  TWELVE_DATA: 'twelve_data',
  MOCK: 'mock', // For testing/development
} as const;

export type PriceSource = (typeof PriceSource)[keyof typeof PriceSource];

// Price data update frequency
export const UpdateFrequency = {
  REAL_TIME: 'real_time', // Live streaming
  FIVE_SECONDS: '5s', // 5 second intervals
  ONE_MINUTE: '1m', // 1 minute intervals
  FIVE_MINUTES: '5m', // 5 minute intervals
  FIFTEEN_MINUTES: '15m', // 15 minute intervals
  ONE_HOUR: '1h', // Hourly updates
  DAILY: '1d', // Daily close
  ON_DEMAND: 'on_demand', // Manual refresh only
} as const;

export type UpdateFrequency = (typeof UpdateFrequency)[keyof typeof UpdateFrequency];

// Price quote schema
export const PriceQuoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  bid: z.number().optional(),
  ask: z.number().optional(),
  bidSize: z.number().optional(),
  askSize: z.number().optional(),
  volume: z.number().optional(),
  openPrice: z.number().optional(),
  highPrice: z.number().optional(),
  lowPrice: z.number().optional(),
  previousClose: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  marketCap: z.number().optional(),
  timestamp: z.string(),
  source: z.nativeEnum(PriceSource),
  isMarketHours: z.boolean().default(true),
  confidence: z.number().min(0).max(1).default(1.0), // Data quality confidence
});

export type PriceQuote = z.infer<typeof PriceQuoteSchema>;

// Historical price point
export const HistoricalPriceSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  date: z.string(), // ISO date string (YYYY-MM-DD)
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  adjustedClose: z.number().optional(),
  source: z.nativeEnum(PriceSource),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type HistoricalPrice = z.infer<typeof HistoricalPriceSchema>;

// Price subscription configuration
export const PriceSubscriptionSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  source: z.nativeEnum(PriceSource),
  frequency: z.nativeEnum(UpdateFrequency),
  isActive: z.boolean(),
  lastUpdate: z.string().optional(),
  errorCount: z.number().default(0),
  maxErrors: z.number().default(5),
  portfolioId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PriceSubscription = z.infer<typeof PriceSubscriptionSchema>;

// Price alert configuration
export const PriceAlertSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  alertType: z.enum(['above', 'below', 'change_percent']),
  triggerValue: z.number(),
  isTriggered: z.boolean().default(false),
  isActive: z.boolean().default(true),
  message: z.string().optional(),
  portfolioId: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PriceAlert = z.infer<typeof PriceAlertSchema>;

// Price data adapter interface
export interface IPriceAdapter {
  source: PriceSource;

  // Get current quote for a symbol
  getQuote(symbol: string): Promise<PriceQuote>;

  // Get quotes for multiple symbols
  getQuotes(symbols: string[]): Promise<PriceQuote[]>;

  // Get historical data for a date range
  getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string,
    interval?: '1d' | '1h' | '5m'
  ): Promise<HistoricalPrice[]>;

  // Check if market is open
  isMarketOpen(): Promise<boolean>;

  // Validate symbol format
  validateSymbol(symbol: string): boolean;

  // Get rate limits/usage info
  getRateLimits(): { remainingRequests: number; resetTime: Date };
}

// Mock price adapter for development/testing
export class MockPriceAdapter implements IPriceAdapter {
  source = PriceSource.MOCK;

  private mockPrices: Record<string, number> = {
    AAPL: 175.5,
    MSFT: 345.75,
    GOOGL: 125.8,
    TSLA: 225.4,
    SPY: 445.25,
    QQQ: 365.9,
    IWM: 195.3,
    NVDA: 485.2,
  };

  async getQuote(symbol: string): Promise<PriceQuote> {
    const basePrice = this.mockPrices[symbol] || 100.0;
    const randomVariation = (Math.random() - 0.5) * 2; // ±1% random variation
    const price = basePrice + randomVariation;

    const previousClose = basePrice;
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol,
      price,
      bid: price - 0.01,
      ask: price + 0.01,
      bidSize: Math.floor(Math.random() * 1000) + 100,
      askSize: Math.floor(Math.random() * 1000) + 100,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      openPrice: basePrice + (Math.random() - 0.5),
      highPrice: price + Math.random() * 2,
      lowPrice: price - Math.random() * 2,
      previousClose,
      change,
      changePercent,
      marketCap: Math.floor(Math.random() * 1000000000000),
      timestamp: new Date().toISOString(),
      source: this.source,
      isMarketHours: this.isMarketHours(),
      confidence: 0.95,
    };
  }

  async getQuotes(symbols: string[]): Promise<PriceQuote[]> {
    return Promise.all(symbols.map(symbol => this.getQuote(symbol)));
  }

  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<HistoricalPrice[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const basePrice = this.mockPrices[symbol] || 100.0;
    const data: HistoricalPrice[] = [];

    const currentDate = new Date(start);
    let price = basePrice * (0.9 + Math.random() * 0.2); // Start with ±10% variation

    while (currentDate <= end) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const dailyVariation = (Math.random() - 0.5) * 0.04; // ±2% daily variation
        const open = price;
        const volatility = Math.random() * 0.02; // 0-2% intraday volatility

        const high = open * (1 + volatility);
        const low = open * (1 - volatility);
        const close = open * (1 + dailyVariation);

        data.push({
          id: `${symbol}_${currentDate.toISOString().split('T')[0]}`,
          symbol,
          date: currentDate.toISOString().split('T')[0],
          open,
          high,
          low,
          close,
          volume: Math.floor(Math.random() * 10000000) + 1000000,
          adjustedClose: close,
          source: this.source,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        price = close;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  async isMarketOpen(): Promise<boolean> {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Simple mock: market open 9:30 AM - 4:00 PM ET on weekdays
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
  }

  validateSymbol(symbol: string): boolean {
    return /^[A-Z]{1,5}$/.test(symbol);
  }

  getRateLimits() {
    return {
      remainingRequests: 1000,
      resetTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    };
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
  }
}

// Price data manager - orchestrates multiple sources and caching
export class PriceDataManager {
  private adapters: Map<PriceSource, IPriceAdapter> = new Map();
  private subscriptions: Map<string, PriceSubscription> = new Map();
  private priceCache: Map<string, { quote: PriceQuote; expiry: Date }> = new Map();
  private alerts: PriceAlert[] = [];

  private defaultCacheTime = 5 * 1000; // 5 seconds default cache
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Register default mock adapter
    this.registerAdapter(new MockPriceAdapter());
  }

  /**
   * Register a price data adapter
   */
  registerAdapter(adapter: IPriceAdapter): void {
    this.adapters.set(adapter.source, adapter);
  }

  /**
   * Get current price quote with caching
   */
  async getQuote(
    symbol: string,
    source: PriceSource = PriceSource.MOCK,
    useCache: boolean = true
  ): Promise<PriceQuote> {
    const cacheKey = `${symbol}_${source}`;

    // Check cache first
    if (useCache && this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey)!;
      if (new Date() < cached.expiry) {
        return cached.quote;
      }
    }

    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new Error(`Price adapter not found for source: ${source}`);
    }

    const quote = await adapter.getQuote(symbol);

    // Cache the result
    this.priceCache.set(cacheKey, {
      quote,
      expiry: new Date(Date.now() + this.defaultCacheTime),
    });

    // Check price alerts
    await this.checkPriceAlerts(symbol, quote.price);

    return quote;
  }

  /**
   * Get multiple quotes efficiently
   */
  async getQuotes(
    symbols: string[],
    source: PriceSource = PriceSource.MOCK
  ): Promise<PriceQuote[]> {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new Error(`Price adapter not found for source: ${source}`);
    }

    const quotes = await adapter.getQuotes(symbols);

    // Cache results and check alerts
    await Promise.all(
      quotes.map(async quote => {
        const cacheKey = `${quote.symbol}_${source}`;
        this.priceCache.set(cacheKey, {
          quote,
          expiry: new Date(Date.now() + this.defaultCacheTime),
        });

        await this.checkPriceAlerts(quote.symbol, quote.price);
      })
    );

    return quotes;
  }

  /**
   * Get historical price data
   */
  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string,
    source: PriceSource = PriceSource.MOCK,
    interval: '1d' | '1h' | '5m' = '1d'
  ): Promise<HistoricalPrice[]> {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new Error(`Price adapter not found for source: ${source}`);
    }

    return adapter.getHistoricalData(symbol, startDate, endDate, interval);
  }

  /**
   * Subscribe to price updates
   */
  async subscribeToPrice(
    symbol: string,
    frequency: UpdateFrequency,
    source: PriceSource = PriceSource.MOCK,
    callback?: (quote: PriceQuote) => void
  ): Promise<string> {
    const subscriptionId = `${symbol}_${source}_${Date.now()}`;

    const subscription: PriceSubscription = {
      id: subscriptionId,
      symbol,
      source,
      frequency,
      isActive: true,
      errorCount: 0,
      maxErrors: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Set up update interval based on frequency
    if (frequency !== UpdateFrequency.ON_DEMAND) {
      const intervalMs = this.getIntervalMs(frequency);
      const interval = setInterval(async () => {
        try {
          const quote = await this.getQuote(symbol, source, false); // Skip cache for subscriptions
          subscription.lastUpdate = new Date().toISOString();
          subscription.errorCount = 0; // Reset error count on success

          if (callback) {
            callback(quote);
          }
        } catch (error) {
          subscription.errorCount++;
          console.error(`Price subscription error for ${symbol}:`, error);

          // Disable subscription if too many errors
          if (subscription.errorCount >= subscription.maxErrors) {
            subscription.isActive = false;
            this.unsubscribeFromPrice(subscriptionId);
          }
        }
      }, intervalMs);

      this.updateIntervals.set(subscriptionId, interval);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPrice(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isActive = false;
      this.subscriptions.delete(subscriptionId);

      const interval = this.updateIntervals.get(subscriptionId);
      if (interval) {
        clearInterval(interval);
        this.updateIntervals.delete(subscriptionId);
      }
    }
  }

  /**
   * Create price alert
   */
  createPriceAlert(alert: Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt'>): string {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newAlert: PriceAlert = {
      ...alert,
      id: alertId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.alerts.push(newAlert);
    return alertId;
  }

  /**
   * Check price alerts for a symbol
   */
  private async checkPriceAlerts(symbol: string, currentPrice: number): Promise<void> {
    const symbolAlerts = this.alerts.filter(
      alert => alert.symbol === symbol && alert.isActive && !alert.isTriggered
    );

    for (const alert of symbolAlerts) {
      let shouldTrigger = false;

      switch (alert.alertType) {
        case 'above':
          shouldTrigger = currentPrice > alert.triggerValue;
          break;
        case 'below':
          shouldTrigger = currentPrice < alert.triggerValue;
          break;
        case 'change_percent':
          // This would need previous price to calculate
          // For now, we'll skip this type
          break;
      }

      if (shouldTrigger) {
        alert.isTriggered = true;
        alert.updatedAt = new Date().toISOString();

        // In a real app, you'd send notifications here
        console.log(
          `Price Alert Triggered: ${symbol} ${alert.alertType} ${alert.triggerValue}, current: ${currentPrice}`
        );
      }
    }
  }

  /**
   * Get interval in milliseconds for update frequency
   */
  private getIntervalMs(frequency: UpdateFrequency): number {
    switch (frequency) {
      case UpdateFrequency.FIVE_SECONDS:
        return 5 * 1000;
      case UpdateFrequency.ONE_MINUTE:
        return 60 * 1000;
      case UpdateFrequency.FIVE_MINUTES:
        return 5 * 60 * 1000;
      case UpdateFrequency.FIFTEEN_MINUTES:
        return 15 * 60 * 1000;
      case UpdateFrequency.ONE_HOUR:
        return 60 * 60 * 1000;
      case UpdateFrequency.DAILY:
        return 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000; // Default to 1 minute
    }
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): PriceSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }

  /**
   * Get all price alerts
   */
  getPriceAlerts(): PriceAlert[] {
    return [...this.alerts];
  }

  /**
   * Calculate position value using current prices
   */
  async calculatePositionValue(positions: Array<{ symbol: string; quantity: number }>): Promise<{
    totalValue: number;
    positions: Array<{
      symbol: string;
      quantity: number;
      currentPrice: number;
      marketValue: number;
    }>;
  }> {
    const symbols = [...new Set(positions.map(pos => pos.symbol))];
    const quotes = await this.getQuotes(symbols);
    const priceMap = new Map(quotes.map(quote => [quote.symbol, quote.price]));

    let totalValue = 0;
    const positionValues = positions.map(pos => {
      const currentPrice = priceMap.get(pos.symbol) || 0;
      const marketValue = pos.quantity * currentPrice;
      totalValue += marketValue;

      return {
        symbol: pos.symbol,
        quantity: pos.quantity,
        currentPrice,
        marketValue,
      };
    });

    return {
      totalValue,
      positions: positionValues,
    };
  }

  /**
   * Clean up - clear all intervals and subscriptions
   */
  cleanup(): void {
    // Clear all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    // Clear subscriptions
    this.subscriptions.clear();

    // Clear cache
    this.priceCache.clear();
  }
}

export default PriceDataManager;
