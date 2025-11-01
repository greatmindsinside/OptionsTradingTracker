/**
 * Comprehensive tests for data validation schemas
 * Tests all Zod schemas with valid and invalid data
 */

import { describe, it, expect } from 'vitest';
import {
  PortfolioSchema,
  SymbolSchema,
  TradeSchema,
  PositionSchema,
  MarketDataSchema,
  PerformanceMetricsSchema,
  validateData,
  validateArray,
  sanitizeString,
  sanitizeNumber,
  sanitizeBoolean,
} from '../../../src/modules/db/validation';

describe('Data Validation Schemas', () => {
  describe('Portfolio Schema', () => {
    it('should validate valid portfolio data', () => {
      const validPortfolio = {
        name: 'Main Portfolio',
        broker: 'td_ameritrade',
        account_number: '123456789',
        account_type: 'margin' as const,
        description: 'Primary trading account',
        is_active: true,
      };

      const result = validateData(PortfolioSchema, validPortfolio);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPortfolio);
    });

    it('should reject invalid portfolio data', () => {
      const invalidPortfolio = {
        name: '', // Empty name
        broker: '', // Empty broker
        account_type: 'invalid_type', // Invalid account type
      };

      const result = validateData(PortfolioSchema, invalidPortfolio);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should trim whitespace from strings', () => {
      const portfolioWithWhitespace = {
        name: '  Test Portfolio  ',
        broker: '  td_ameritrade  ',
        account_type: 'cash' as const,
        description: '  Description with spaces  ',
      };

      const result = validateData(PortfolioSchema, portfolioWithWhitespace);
      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Test Portfolio');
      expect(result.data!.broker).toBe('td_ameritrade');
      expect(result.data!.description).toBe('Description with spaces');
    });
  });

  describe('Symbol Schema', () => {
    it('should validate valid symbol data', () => {
      const validSymbol = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        asset_type: 'stock' as const,
        sector: 'Technology',
        industry: 'Consumer Electronics',
        current_price: 150.25,
      };

      const result = validateData(SymbolSchema, validSymbol);
      expect(result.success).toBe(true);
      expect(result.data!.symbol).toBe('AAPL');
    });

    it('should convert symbol to uppercase', () => {
      const symbolLowercase = {
        symbol: 'aapl',
        name: 'Apple Inc.',
        asset_type: 'stock' as const,
      };

      const result = validateData(SymbolSchema, symbolLowercase);
      expect(result.success).toBe(true);
      expect(result.data!.symbol).toBe('AAPL');
    });

    it('should reject invalid asset types', () => {
      const invalidSymbol = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        asset_type: 'invalid_type',
      };

      const result = validateData(SymbolSchema, invalidSymbol);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Trade Schema', () => {
    it('should validate valid trade data', () => {
      const validTrade = {
        portfolio_id: 1,
        symbol_id: 1,
        strategy_id: 1,
        option_type: 'call' as const,
        strike_price: 150,
        expiration_date: '2024-12-20',
        trade_action: 'buy_to_open' as const,
        quantity: 1,
        premium: 5.5,
        commission: 1.5,
        fees: 0.5,
        trade_date: '2024-01-15',
        notes: 'Initial position',
      };

      const result = validateData(TradeSchema, validTrade);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validTrade);
    });

    it('should reject invalid date formats', () => {
      const invalidTrade = {
        portfolio_id: 1,
        symbol_id: 1,
        option_type: 'call' as const,
        strike_price: 150,
        expiration_date: '12/20/2024', // Invalid format
        trade_action: 'buy_to_open' as const,
        quantity: 1,
        premium: 5.5,
        trade_date: '2024-01-15',
      };

      const result = validateData(TradeSchema, invalidTrade);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject negative quantities', () => {
      const invalidTrade = {
        portfolio_id: 1,
        symbol_id: 1,
        option_type: 'call' as const,
        strike_price: 150,
        expiration_date: '2024-12-20',
        trade_action: 'buy_to_open' as const,
        quantity: -1, // Negative quantity
        premium: 5.5,
        trade_date: '2024-01-15',
      };

      const result = validateData(TradeSchema, invalidTrade);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Position Schema', () => {
    it('should validate valid position data', () => {
      const validPosition = {
        portfolio_id: 1,
        symbol_id: 1,
        option_type: 'call' as const,
        strike_price: 150,
        expiration_date: '2024-12-20',
        quantity: -1, // Short position (negative allowed)
        average_cost: 5.5,
        current_value: 4.25,
        unrealized_pnl: -125,
        realized_pnl: 0,
        status: 'open' as const,
      };

      const result = validateData(PositionSchema, validPosition);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPosition);
    });

    it('should allow negative quantities for short positions', () => {
      const shortPosition = {
        portfolio_id: 1,
        symbol_id: 1,
        option_type: 'put' as const,
        strike_price: 140,
        expiration_date: '2024-12-20',
        quantity: -5,
        average_cost: 3.0,
        status: 'open' as const,
      };

      const result = validateData(PositionSchema, shortPosition);
      expect(result.success).toBe(true);
      expect(result.data!.quantity).toBe(-5);
    });
  });

  describe('Market Data Schema', () => {
    it('should validate valid market data', () => {
      const validMarketData = {
        symbol_id: 1,
        data_date: '2024-01-15',
        open_price: 149.5,
        high_price: 152.0,
        low_price: 148.75,
        close_price: 151.25,
        volume: 1500000,
        implied_volatility: 25.5,
        delta: 0.65,
        gamma: 0.025,
        theta: -0.15,
        vega: 0.35,
        rho: 0.45,
      };

      const result = validateData(MarketDataSchema, validMarketData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validMarketData);
    });

    it('should enforce delta range constraints', () => {
      const invalidMarketData = {
        symbol_id: 1,
        data_date: '2024-01-15',
        close_price: 151.25,
        delta: 1.5, // Delta > 1 (invalid)
      };

      const result = validateData(MarketDataSchema, invalidMarketData);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should enforce gamma non-negative constraint', () => {
      const invalidMarketData = {
        symbol_id: 1,
        data_date: '2024-01-15',
        close_price: 151.25,
        gamma: -0.1, // Negative gamma (invalid)
      };

      const result = validateData(MarketDataSchema, invalidMarketData);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Performance Metrics Schema', () => {
    it('should validate valid performance metrics', () => {
      const validMetrics = {
        portfolio_id: 1,
        calculation_date: '2024-01-15',
        total_value: 12500,
        total_pnl: 2500,
        total_pnl_percentage: 25.0,
        daily_pnl: 150,
        daily_pnl_percentage: 1.2,
        win_rate: 68.5,
        profit_factor: 1.45,
        sharpe_ratio: 1.8,
        max_drawdown: 500,
        max_drawdown_percentage: 4.2,
        total_trades: 25,
        winning_trades: 17,
        losing_trades: 8,
      };

      const result = validateData(PerformanceMetricsSchema, validMetrics);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validMetrics);
    });

    it('should reject invalid win rate > 100%', () => {
      const invalidMetrics = {
        portfolio_id: 1,
        calculation_date: '2024-01-15',
        total_value: 12500,
        total_pnl: 2500,
        total_pnl_percentage: 25.0,
        win_rate: 105, // > 100% (invalid)
      };

      const result = validateData(PerformanceMetricsSchema, invalidMetrics);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize strings properly', () => {
      expect(sanitizeString('  test  ')).toBe('test');
      expect(sanitizeString(123)).toBe('123');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('should sanitize numbers properly', () => {
      expect(sanitizeNumber('123.45')).toBe(123.45);
      expect(sanitizeNumber('invalid')).toBe(0);
      expect(sanitizeNumber(null)).toBe(0);
      expect(sanitizeNumber(undefined)).toBe(0);
    });

    it('should sanitize booleans properly', () => {
      expect(sanitizeBoolean('true')).toBe(true);
      expect(sanitizeBoolean('TRUE')).toBe(true);
      expect(sanitizeBoolean('1')).toBe(true);
      expect(sanitizeBoolean('yes')).toBe(true);
      expect(sanitizeBoolean('false')).toBe(false);
      expect(sanitizeBoolean('0')).toBe(false);
      expect(sanitizeBoolean('')).toBe(false);
      expect(sanitizeBoolean(1)).toBe(true);
      expect(sanitizeBoolean(0)).toBe(false);
    });
  });

  describe('Array Validation', () => {
    it('should validate array of valid data', () => {
      const portfolios = [
        {
          name: 'Portfolio 1',
          broker: 'td_ameritrade',
          account_type: 'margin' as const,
        },
        {
          name: 'Portfolio 2',
          broker: 'schwab',
          account_type: 'cash' as const,
        },
      ];

      const result = validateArray(PortfolioSchema, portfolios);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should report errors for invalid items in array', () => {
      const portfolios = [
        {
          name: 'Valid Portfolio',
          broker: 'td_ameritrade',
          account_type: 'margin' as const,
        },
        {
          name: '', // Invalid
          broker: '', // Invalid
          account_type: 'invalid_type', // Invalid
        },
      ];

      const result = validateArray(PortfolioSchema, portfolios);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('Generic Validation Function', () => {
    it('should handle validation errors gracefully', () => {
      const result = validateData(PortfolioSchema, null);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should provide detailed error messages', () => {
      const invalidData = {
        name: '',
        broker: '',
        account_type: 'invalid_type',
      };

      const result = validateData(PortfolioSchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(err => err.includes('name'))).toBe(true);
      expect(result.errors!.some(err => err.includes('broker'))).toBe(true);
      expect(result.errors!.some(err => err.includes('account_type'))).toBe(true);
    });
  });
});
