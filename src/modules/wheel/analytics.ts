/**
 * Wheel Strategy Analytics Module
 *
 * Provides comprehensive analytics for wheel strategy performance including:
 * - Return on Options (ROO) calculations per leg and cumulative
 * - Return on Risk (ROR) calculations
 * - Annualized returns and performance metrics
 * - Risk-adjusted returns and volatility metrics
 */

import type { WheelCycle, WheelEvent_Record as WheelEventRecord } from '@/modules/db/validation';
import { WheelEvent, WheelState } from './lifecycle';

export interface WheelLegMetrics {
  legType: 'csp' | 'cc' | 'stock';
  premium: number;
  fees: number;
  netCredit: number;
  daysHeld: number;
  capitalAtRisk: number;
  returnOnOptions: number; // ROO = premium / capital at risk
  returnOnRisk: number; // ROR = net profit / max risk
  annualizedReturn: number;
}

export interface WheelCycleAnalytics {
  lifecycleId: string;
  underlying: string;

  // Basic Metrics
  totalNetCredit: number;
  totalFees: number;
  totalDays: number;
  realizedPnL: number;
  unrealizedPnL: number;

  // Return Calculations
  cumulativeROO: number; // Total premium / total capital at risk
  cumulativeROR: number; // Total profit / maximum risk exposure
  annualizedReturn: number;

  // Risk Metrics
  maxCapitalAtRisk: number;
  averageCapitalAtRisk: number;
  riskAdjustedReturn: number; // Return per unit of risk

  // Performance Ratios
  profitFactor: number; // Gross profit / gross loss
  winRate: number; // Percentage of profitable legs
  averageWin: number;
  averageLoss: number;

  // Cycle Metrics
  cyclesCompleted: number;
  averageCycleDays: number;

  // Status and Breakdown
  status: WheelState;
  legMetrics: WheelLegMetrics[];
}

export interface WheelPortfolioAnalytics {
  totalCycles: number;
  activeCycles: number;
  completedCycles: number;

  // Aggregate Performance
  totalPremiumCollected: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  netPnL: number;

  // Portfolio Returns
  overallROO: number;
  overallROR: number;
  portfolioAnnualizedReturn: number;

  // Risk Metrics
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;

  // Distribution Analysis
  winRate: number;
  profitFactor: number;
  bestCycle: WheelCycleAnalytics;
  worstCycle: WheelCycleAnalytics;

  // Time Analysis
  averageCycleDuration: number;
  longestCycle: number;
  shortestCycle: number;
}

/**
 * Wheel Analytics Calculator
 */
export class WheelAnalytics {
  /**
   * Calculate comprehensive analytics for a single wheel cycle
   */
  static calculateCycleAnalytics(
    cycle: WheelCycle,
    events: WheelEventRecord[],
    currentPrice?: number
  ): WheelCycleAnalytics {
    const legMetrics = this.calculateLegMetrics(events, currentPrice);

    // Calculate aggregate metrics
    const totalNetCredit = legMetrics.reduce((sum, leg) => sum + leg.netCredit, 0);
    const totalFees = legMetrics.reduce((sum, leg) => sum + leg.fees, 0);
    const totalDays = legMetrics.length > 0 ? Math.max(...legMetrics.map(leg => leg.daysHeld)) : 0;
    const maxCapitalAtRisk =
      legMetrics.length > 0 ? Math.max(...legMetrics.map(leg => leg.capitalAtRisk)) : 0;
    const averageCapitalAtRisk =
      legMetrics.length > 0
        ? legMetrics.reduce((sum, leg) => sum + leg.capitalAtRisk, 0) / legMetrics.length
        : 0;

    // ROO/ROR Calculations
    const cumulativeROO = maxCapitalAtRisk > 0 ? (totalNetCredit / maxCapitalAtRisk) * 100 : 0;
    const totalProfit = (cycle.realized_pnl || 0) + (cycle.unrealized_pnl || 0);
    const cumulativeROR = maxCapitalAtRisk > 0 ? (totalProfit / maxCapitalAtRisk) * 100 : 0;

    // Annualized return
    const annualizedReturn = totalDays > 0 ? (cumulativeROR * 365) / totalDays : 0;

    // Performance metrics
    const profitableLegs = legMetrics.filter(leg => leg.netCredit > leg.fees);
    const winRate = legMetrics.length > 0 ? (profitableLegs.length / legMetrics.length) * 100 : 0;

    const wins = profitableLegs.map(leg => leg.netCredit - leg.fees);
    const losses = legMetrics
      .filter(leg => leg.netCredit <= leg.fees)
      .map(leg => leg.netCredit - leg.fees);

    const averageWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const averageLoss =
      losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;

    return {
      lifecycleId: cycle.lifecycle_id,
      underlying: cycle.underlying_symbol,
      totalNetCredit,
      totalFees,
      totalDays,
      realizedPnL: cycle.realized_pnl || 0,
      unrealizedPnL: cycle.unrealized_pnl || 0,
      cumulativeROO,
      cumulativeROR,
      annualizedReturn,
      maxCapitalAtRisk,
      averageCapitalAtRisk,
      riskAdjustedReturn: maxCapitalAtRisk > 0 ? totalProfit / maxCapitalAtRisk : 0,
      profitFactor,
      winRate,
      averageWin,
      averageLoss,
      cyclesCompleted: cycle.status === WheelState.CLOSED ? 1 : 0,
      averageCycleDays: totalDays,
      status: cycle.status,
      legMetrics,
    };
  }

  /**
   * Calculate metrics for individual legs of a wheel cycle
   */
  private static calculateLegMetrics(
    events: WheelEventRecord[],
    currentPrice?: number
  ): WheelLegMetrics[] {
    const legs: WheelLegMetrics[] = [];

    for (const event of events) {
      const leg = this.calculateSingleLegMetrics(event, currentPrice);
      if (leg) {
        legs.push(leg);
      }
    }

    return legs;
  }

  /**
   * Calculate metrics for a single wheel leg
   */
  private static calculateSingleLegMetrics(
    event: WheelEventRecord,
    currentPrice?: number
  ): WheelLegMetrics | null {
    const eventDate = new Date(event.event_date);
    const now = new Date();
    const daysHeld = Math.ceil((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));

    let legType: 'csp' | 'cc' | 'stock';
    let capitalAtRisk = 0;
    let premium = Math.abs(event.amount || 0);

    // Determine leg type and capital at risk
    switch (event.event_type) {
      case WheelEvent.CSP_SOLD:
        legType = 'csp';
        capitalAtRisk = (event.strike_price || 0) * 100; // Strike price × 100 shares
        break;

      case WheelEvent.CC_SOLD:
        legType = 'cc';
        capitalAtRisk = (currentPrice || event.strike_price || 0) * 100; // Current stock value
        break;

      case WheelEvent.CSP_ASSIGNED:
      case WheelEvent.CC_ASSIGNED:
        legType = 'stock';
        capitalAtRisk = Math.abs(event.amount || 0); // Stock purchase/sale amount
        premium = 0; // No premium for stock transactions
        break;

      default:
        return null; // Skip other event types
    }

    const fees = 0; // Would need to extract from trade data
    const netCredit = premium - fees;

    // Calculate returns
    const returnOnOptions = capitalAtRisk > 0 ? (premium / capitalAtRisk) * 100 : 0;
    const returnOnRisk = capitalAtRisk > 0 ? (netCredit / capitalAtRisk) * 100 : 0;
    const annualizedReturn = daysHeld > 0 ? (returnOnRisk * 365) / daysHeld : 0;

    return {
      legType,
      premium,
      fees,
      netCredit,
      daysHeld,
      capitalAtRisk,
      returnOnOptions,
      returnOnRisk,
      annualizedReturn,
    };
  }

  /**
   * Calculate portfolio-level analytics across all wheel cycles
   */
  static calculatePortfolioAnalytics(
    cycles: WheelCycle[],
    eventsMap: Map<string, WheelEventRecord[]>,
    currentPrices?: Map<string, number>
  ): WheelPortfolioAnalytics {
    const cycleAnalytics = cycles.map(cycle => {
      const events = eventsMap.get(cycle.lifecycle_id) || [];
      const currentPrice = currentPrices?.get(cycle.underlying_symbol);
      return this.calculateCycleAnalytics(cycle, events, currentPrice);
    });

    const activeCycles = cycles.filter(c => c.status !== WheelState.CLOSED).length;
    const completedCycles = cycles.filter(c => c.status === WheelState.CLOSED).length;

    // Aggregate metrics
    const totalPremiumCollected = cycleAnalytics.reduce((sum, c) => sum + c.totalNetCredit, 0);
    const totalRealizedPnL = cycleAnalytics.reduce((sum, c) => sum + c.realizedPnL, 0);
    const totalUnrealizedPnL = cycleAnalytics.reduce((sum, c) => sum + c.unrealizedPnL, 0);
    const netPnL = totalRealizedPnL + totalUnrealizedPnL;

    // Portfolio returns
    const totalCapitalAtRisk = cycleAnalytics.reduce((sum, c) => sum + c.maxCapitalAtRisk, 0);
    const overallROO =
      totalCapitalAtRisk > 0 ? (totalPremiumCollected / totalCapitalAtRisk) * 100 : 0;
    const overallROR = totalCapitalAtRisk > 0 ? (netPnL / totalCapitalAtRisk) * 100 : 0;

    // Time-weighted returns
    const totalDays = cycleAnalytics.reduce((sum, c) => sum + c.totalDays, 0);
    const averageCycleDuration = cycleAnalytics.length > 0 ? totalDays / cycleAnalytics.length : 0;
    const portfolioAnnualizedReturn =
      averageCycleDuration > 0 ? (overallROR * 365) / averageCycleDuration : 0;

    // Risk metrics
    const returns = cycleAnalytics.map(c => c.cumulativeROR);
    const volatility = this.calculateVolatility(returns);
    const sharpeRatio = volatility > 0 ? portfolioAnnualizedReturn / volatility : 0;

    // Performance distribution
    const profitableCycles = cycleAnalytics.filter(c => c.realizedPnL + c.unrealizedPnL > 0);
    const winRate =
      cycleAnalytics.length > 0 ? (profitableCycles.length / cycleAnalytics.length) * 100 : 0;

    const wins = profitableCycles.map(c => c.realizedPnL + c.unrealizedPnL);
    const losses = cycleAnalytics
      .filter(c => c.realizedPnL + c.unrealizedPnL <= 0)
      .map(c => c.realizedPnL + c.unrealizedPnL);

    const grossProfit = wins.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    // Best/worst cycles
    const sortedByPnL = [...cycleAnalytics].sort(
      (a, b) => b.realizedPnL + b.unrealizedPnL - (a.realizedPnL + a.unrealizedPnL)
    );
    const bestCycle = sortedByPnL[0];
    const worstCycle = sortedByPnL[sortedByPnL.length - 1];

    // Cycle duration analysis
    const cycleDurations = cycleAnalytics.map(c => c.totalDays);
    const longestCycle = Math.max(...cycleDurations, 0);
    const shortestCycle = Math.min(...cycleDurations, 0);

    // Max drawdown calculation
    let maxDrawdown = 0;
    let peak = 0;
    let runningPnL = 0;

    for (const cycle of cycleAnalytics) {
      runningPnL += cycle.realizedPnL + cycle.unrealizedPnL;
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      const drawdown = ((peak - runningPnL) / Math.max(peak, 1)) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      totalCycles: cycles.length,
      activeCycles,
      completedCycles,
      totalPremiumCollected,
      totalRealizedPnL,
      totalUnrealizedPnL,
      netPnL,
      overallROO,
      overallROR,
      portfolioAnnualizedReturn,
      maxDrawdown,
      sharpeRatio,
      volatility,
      winRate,
      profitFactor,
      bestCycle,
      worstCycle,
      averageCycleDuration,
      longestCycle,
      shortestCycle,
    };
  }

  /**
   * Calculate volatility (standard deviation) of returns
   */
  private static calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDifferences = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDifferences.reduce((a, b) => a + b, 0) / (returns.length - 1);

    return Math.sqrt(variance);
  }

  /**
   * Generate performance comparison between cycles
   */
  static compareCycles(cycles: WheelCycleAnalytics[]): {
    topPerformers: WheelCycleAnalytics[];
    underPerformers: WheelCycleAnalytics[];
    averageMetrics: Partial<WheelCycleAnalytics>;
  } {
    if (cycles.length === 0) {
      return {
        topPerformers: [],
        underPerformers: [],
        averageMetrics: {},
      };
    }

    // Sort by annualized return
    const sortedCycles = [...cycles].sort((a, b) => b.annualizedReturn - a.annualizedReturn);

    const topCount = Math.ceil(cycles.length * 0.2); // Top 20%
    const bottomCount = Math.ceil(cycles.length * 0.2); // Bottom 20%

    const topPerformers = sortedCycles.slice(0, topCount);
    const underPerformers = sortedCycles.slice(-bottomCount);

    // Calculate averages
    const averageMetrics: Partial<WheelCycleAnalytics> = {
      cumulativeROO: cycles.reduce((sum, c) => sum + c.cumulativeROO, 0) / cycles.length,
      cumulativeROR: cycles.reduce((sum, c) => sum + c.cumulativeROR, 0) / cycles.length,
      annualizedReturn: cycles.reduce((sum, c) => sum + c.annualizedReturn, 0) / cycles.length,
      winRate: cycles.reduce((sum, c) => sum + c.winRate, 0) / cycles.length,
      averageCycleDays: cycles.reduce((sum, c) => sum + c.averageCycleDays, 0) / cycles.length,
      profitFactor: cycles.reduce((sum, c) => sum + c.profitFactor, 0) / cycles.length,
    };

    return {
      topPerformers,
      underPerformers,
      averageMetrics,
    };
  }
}
