/**
 * Unit tests for Options Calculations Module
 * Phase 4: Core Calculations - Comprehensive test suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CoveredCall, CashSecuredPut, LongCall } from '../../src/modules/calc/index.js';

describe('Options Calculations Module', () => {
  // =============================================================================
  // COVERED CALL TESTS
  // =============================================================================

  describe('CoveredCall', () => {
    let coveredCall: CoveredCall;

    beforeEach(() => {
      // Example: Own 100 shares of XYZ at $95, sell $100 call for $2.50
      const inputs = {
        sharePrice: 98,
        shareBasis: 95,
        shareQty: 100,
        strike: 100,
        premium: 250, // $2.50 * 100 shares
        expiration: new Date('2024-02-16'),
        fees: 0.65,
      };
      coveredCall = new CoveredCall(inputs, new Date('2024-01-15')); // 32 days to expiration
    });

    it('should calculate breakeven correctly', () => {
      const breakeven = coveredCall.breakeven();
      // Breakeven = Share Basis - Net Premium per Share
      // = $95 - ($250 - $0.65) / 100 = $95 - $2.4935 = $92.51 (rounded)
      expect(breakeven).toBe(92.51);
    });

    it('should calculate maximum profit correctly', () => {
      const maxProfit = coveredCall.maxProfit();
      // Max Profit = (Strike - Share Basis) * Qty + Net Premium
      // = ($100 - $95) * 100 + ($250 - $0.65) = $500 + $249.35 = $749.35
      expect(maxProfit).toBe(749.35);
    });

    it('should calculate maximum loss correctly', () => {
      const maxLoss = coveredCall.maxLoss();
      // Max Loss = (Share Basis * Qty) - Net Premium
      // = ($95 * 100) - ($250 - $0.65) = $9500 - $249.35 = $9250.65
      expect(maxLoss).toBe(9250.65);
    });

    it('should calculate Return on Outlay correctly', () => {
      const roo = coveredCall.returnOnOutlay();
      // ROO = Max Profit / Total Invested
      // = $749.35 / ($95 * 100) = $749.35 / $9500 = 7.89%
      expect(roo).toBe(7.89);
    });

    it('should calculate P&L scenarios correctly', () => {
      // If stock at $90 at expiration (below strike)
      const pnlAt90 = coveredCall.expirationPnL(90);
      // P&L = (Stock Price - Share Basis) * Qty + Net Premium
      // = ($90 - $95) * 100 + $249.35 = -$500 + $249.35 = -$250.65
      expect(pnlAt90).toBe(-250.65);

      // If stock at $105 at expiration (above strike - assigned)
      const pnlAt105 = coveredCall.expirationPnL(105);
      // P&L = Max Profit (shares called away at strike)
      expect(pnlAt105).toBe(749.35);
    });

    it('should identify in-the-money status', () => {
      // Current price $98 vs strike $100 = OTM
      expect(coveredCall.isInTheMoney()).toBe(false);
    });

    it('should generate payoff chart data', () => {
      const chartData = coveredCall.payoffChart([85, 90, 92, 95, 100, 105, 110]);

      expect(chartData).toHaveLength(7);
      expect(chartData[0].stockPrice).toBe(85);
      expect(chartData[4].stockPrice).toBe(100);

      // Check that P&L values are calculated
      expect(chartData[0].profitLoss).toBeDefined();
      expect(typeof chartData[0].profitLoss).toBe('number');
    });
  });

  // =============================================================================
  // CASH-SECURED PUT TESTS
  // =============================================================================

  describe('CashSecuredPut', () => {
    let cashSecuredPut: CashSecuredPut;

    beforeEach(() => {
      // Example: Sell $95 put for $3.00, secure $9500 cash
      const inputs = {
        strike: 95,
        premium: 300, // $3.00 * 100 shares
        expiration: new Date('2024-02-16'),
        fees: 0.65,
        cashSecured: 9500,
        currentPrice: 98,
      };
      cashSecuredPut = new CashSecuredPut(inputs, new Date('2024-01-15'));
    });

    it('should calculate breakeven correctly', () => {
      const breakeven = cashSecuredPut.breakeven();
      // Breakeven = Strike - Net Premium per Share
      // = $95 - ($300 - $0.65) / 100 = $95 - $2.9935 = $92.01 (rounded)
      expect(breakeven).toBe(92.01);
    });

    it('should calculate maximum profit correctly', () => {
      const maxProfit = cashSecuredPut.maxProfit();
      // Max Profit = Net Premium = $300 - $0.65 = $299.35
      expect(maxProfit).toBe(299.35);
    });

    it('should calculate maximum loss correctly', () => {
      const maxLoss = cashSecuredPut.maxLoss();
      // Max Loss = (Strike * 100) - Net Premium
      // = ($95 * 100) - ($300 - $0.65) = $9500 - $299.35 = $9200.65
      expect(maxLoss).toBe(9200.65);
    });

    it('should calculate effective basis if assigned', () => {
      const effectiveBasis = cashSecuredPut.effectiveBasis();
      // Effective Basis = Strike - Premium per Share
      // = $95 - ($300 - $0.65) / 100 = $95 - $2.9935 = $92.01
      expect(effectiveBasis).toBe(92.01);
    });

    it('should calculate P&L scenarios correctly', () => {
      // If stock at $100 at expiration (above strike)
      const pnlAt100 = cashSecuredPut.expirationPnL(100);
      // P&L = Keep premium (put expires worthless)
      expect(pnlAt100).toBe(299.35);

      // If stock at $85 at expiration (below strike - assigned)
      const pnlAt85 = cashSecuredPut.expirationPnL(85);
      // P&L = Premium - (Strike - Stock Price) * 100
      // = $299.35 - ($95 - $85) * 100 = $299.35 - $1000 = -$700.65
      expect(pnlAt85).toBe(-700.65);
    });

    it('should identify in-the-money status', () => {
      // Current price $98 vs strike $95 = OTM for put
      expect(cashSecuredPut.isInTheMoney()).toBe(false);
    });
  });

  // =============================================================================
  // LONG CALL TESTS
  // =============================================================================

  describe('LongCall', () => {
    let longCall: LongCall;

    beforeEach(() => {
      // Example: Buy $100 call for $4.50
      const inputs = {
        strike: 100,
        premium: 450, // $4.50 * 100 shares
        expiration: new Date('2024-02-16'),
        fees: 0.65,
        currentPrice: 103,
        currentPremium: 520, // $5.20 * 100 shares
      };
      longCall = new LongCall(inputs, new Date('2024-01-15'));
    });

    it('should calculate breakeven correctly', () => {
      const breakeven = longCall.breakeven();
      // Breakeven = Strike + Total Premium Paid
      // = $100 + ($450 + $0.65) / 100 = $100 + $4.5065 = $104.51 (rounded)
      expect(breakeven).toBe(104.51);
    });

    it('should calculate maximum profit as unlimited', () => {
      const maxProfit = longCall.maxProfit();
      expect(maxProfit).toBe(Infinity);
    });

    it('should calculate maximum loss correctly', () => {
      const maxLoss = longCall.maxLoss();
      // Max Loss = Total Premium Paid = $450 + $0.65 = $450.65
      expect(maxLoss).toBe(450.65);
    });

    it('should calculate intrinsic value correctly', () => {
      const intrinsicValue = longCall.intrinsicValue();
      // Intrinsic Value = Max(0, Current Price - Strike)
      // = Max(0, $103 - $100) = $3.00
      expect(intrinsicValue).toBe(3);
    });

    it('should calculate time value correctly', () => {
      const timeValue = longCall.timeValue();
      // Time Value = Current Premium - Intrinsic Value
      // = $520 - ($103 - $100) * 100 = $520 - $300 = $220
      expect(timeValue).toBe(220);
    });

    it('should calculate unrealized P&L correctly', () => {
      const unrealizedPnL = longCall.unrealizedPnL();
      // Unrealized P&L = Current Value - Total Cost
      // = $520 - ($450 + $0.65) = $520 - $450.65 = $69.35
      expect(unrealizedPnL).toBe(69.35);
    });

    it('should calculate percentage gain correctly', () => {
      const percentageGain = longCall.percentageGain();
      // Percentage = Unrealized P&L / Total Cost * 100
      // = $69.35 / $450.65 * 100 = 15.39%
      expect(percentageGain).toBe(15.39);
    });

    it('should calculate P&L at expiration correctly', () => {
      // If stock at $110 at expiration
      const pnlAt110 = longCall.expirationPnL(110);
      // P&L = Intrinsic Value - Total Cost
      // = ($110 - $100) * 100 - $450.65 = $1000 - $450.65 = $549.35
      expect(pnlAt110).toBe(549.35);

      // If stock at $95 at expiration (below strike)
      const pnlAt95 = longCall.expirationPnL(95);
      // P&L = $0 - Total Cost = -$450.65 (max loss)
      expect(pnlAt95).toBe(-450.65);
    });

    it('should identify in-the-money status', () => {
      // Current price $103 vs strike $100 = ITM
      expect(longCall.isInTheMoney()).toBe(true);
    });

    it('should classify option moneyness correctly', () => {
      const classification = longCall.getClassification();
      // $103 vs $100 strike = 3% ITM
      expect(classification).toBe('ITM');
    });
  });

  // =============================================================================
  // RISK ANALYSIS TESTS
  // =============================================================================

  describe('Risk Analysis', () => {
    it('should flag low returns correctly', () => {
      const lowReturnCC = new CoveredCall({
        sharePrice: 100,
        shareBasis: 100,
        shareQty: 100,
        strike: 101,
        premium: 10, // Very low premium ($0.10)
        expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        fees: 1,
      });

      const risks = lowReturnCC.analyzeRisks();
      const returnRisk = risks.find(risk => risk.category === 'return');
      expect(returnRisk).toBeDefined();
      expect(returnRisk?.severity).toMatch(/medium|high/);
    });

    it('should flag time risk for near expiration', () => {
      const nearExpirationCall = new LongCall({
        strike: 100,
        premium: 200,
        expiration: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
        fees: 1,
        currentPrice: 98,
      });

      const risks = nearExpirationCall.analyzeRisks();
      const timeRisk = risks.find(risk => risk.category === 'time');
      expect(timeRisk).toBeDefined();
      expect(timeRisk?.severity).toMatch(/high|critical/);
    });

    it('should identify assignment risk for ITM puts', () => {
      const itmPut = new CashSecuredPut({
        strike: 100,
        premium: 100, // Low premium ($1.00)
        expiration: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        fees: 1,
        cashSecured: 10000,
        currentPrice: 90, // Deep ITM, intrinsic value = $10 > 80% of $1 premium
      });

      const risks = itmPut.analyzeRisks();
      const assignmentRisk = risks.find(risk => risk.category === 'assignment');
      expect(assignmentRisk).toBeDefined();
    });
  });

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================

  describe('Integration Tests', () => {
    it('should handle all calculations without errors for valid inputs', () => {
      const cc = new CoveredCall({
        sharePrice: 50,
        shareBasis: 48,
        shareQty: 100,
        strike: 52,
        premium: 150,
        expiration: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        fees: 1,
      });

      expect(() => {
        cc.breakeven();
        cc.maxProfit();
        cc.maxLoss();
        cc.returnOnOutlay();
        cc.returnOnRisk();
        cc.expirationPnL(55);
        cc.getAllMetrics();
        cc.analyzeRisks();
        cc.getSummary();
      }).not.toThrow();
    });

    it('should validate inputs and throw appropriate errors', () => {
      expect(() => {
        new CoveredCall({
          sharePrice: -10, // Invalid
          shareBasis: 50,
          shareQty: 100,
          strike: 52,
          premium: 150,
          expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          fees: 1,
        });
      }).toThrow('Share price must be positive');

      expect(() => {
        new LongCall({
          strike: 100,
          premium: 200,
          expiration: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
          fees: 1,
          currentPrice: 98,
        });
      }).toThrow('Expiration must be in the future');
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle zero days to expiration', () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const expiringTomorrow = new CoveredCall(
        {
          sharePrice: 100,
          shareBasis: 95,
          shareQty: 100,
          strike: 100,
          premium: 200,
          expiration: tomorrow,
          fees: 1,
        },
        today
      );

      expect(expiringTomorrow.daysToExpiration()).toBe(1);
      // At the money, delta should be around 0.5
      expect(expiringTomorrow.currentDelta()).toBeGreaterThan(0.3);
    });

    it('should handle very large numbers correctly', () => {
      const largePosition = new CoveredCall({
        sharePrice: 1000,
        shareBasis: 950,
        shareQty: 10000, // Large position
        strike: 1100,
        premium: 100000,
        expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        fees: 10,
      });

      const maxProfit = largePosition.maxProfit();
      expect(maxProfit).toBeGreaterThan(1000000); // Should handle large numbers
      expect(Number.isFinite(maxProfit)).toBe(true);
    });

    it('should handle minimal premium scenarios', () => {
      const minimalPremium = new LongCall({
        strike: 100,
        premium: 0.01, // $0.01
        expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        fees: 0.65,
        currentPrice: 100.5,
      });

      expect(() => {
        minimalPremium.getAllMetrics();
      }).not.toThrow();

      expect(minimalPremium.maxLoss()).toBe(0.66);
    });
  });
});
