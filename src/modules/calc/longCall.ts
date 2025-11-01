/**
 * Long Call Options Strategy Calculations
 * Phase 4: Core Calculations - Long Call Implementation
 */

import {
  type ChartDataPoint,
  type RiskFlag,
  daysBetween,
  roundTo,
  generatePriceRange,
  approximateDelta,
  approximateTheta,
} from './common.js';

// =============================================================================
// INTERFACES
// =============================================================================

export interface LongCallInputs {
  /** Strike price of purchased call option */
  strike: number;
  /** Premium paid for buying the call */
  premium: number;
  /** Expiration date of the option */
  expiration: Date;
  /** Total fees paid (commissions, etc.) */
  fees: number;
  /** Current stock price */
  currentPrice: number;
  /** Current option premium (for unrealized P&L) */
  currentPremium?: number;
}

export interface LongCallMetrics {
  breakeven: number;
  maxProfit: number; // Theoretically unlimited
  maxLoss: number;
  intrinsicValue: number;
  timeValue: number;
  unrealizedPnL: number;
  currentDelta: number;
  currentTheta: number;
  daysToExpiration: number;
  percentageGain: number;
  leverageRatio: number;
}

// =============================================================================
// LONG CALL CLASS
// =============================================================================

export class LongCall {
  private inputs: LongCallInputs;
  private today: Date;

  constructor(inputs: LongCallInputs, currentDate: Date = new Date()) {
    this.inputs = inputs;
    this.today = currentDate;

    // Validate inputs
    this.validateInputs();
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  private validateInputs(): void {
    const { strike, premium, fees, currentPrice } = this.inputs;

    if (strike <= 0) throw new Error('Strike price must be positive');
    if (premium <= 0) throw new Error('Premium must be positive');
    if (fees < 0) throw new Error('Fees cannot be negative');
    if (currentPrice <= 0) throw new Error('Current price must be positive');
    if (this.inputs.expiration <= this.today) {
      throw new Error('Expiration must be in the future');
    }
  }

  // ===========================================================================
  // BASIC CALCULATIONS
  // ===========================================================================

  /**
   * Calculate breakeven price
   * Breakeven = Strike + Total Premium Paid per Share
   */
  breakeven(): number {
    const totalCost = this.inputs.premium + this.inputs.fees;
    const costPerShare = totalCost / 100; // Assuming 100 shares per contract
    return roundTo(this.inputs.strike + costPerShare, 2);
  }

  /**
   * Calculate maximum profit (theoretically unlimited)
   * Returns a large number to represent "unlimited"
   */
  maxProfit(): number {
    return Infinity;
  }

  /**
   * Calculate maximum loss (total premium paid)
   * Max Loss = Premium + Fees
   */
  maxLoss(): number {
    return roundTo(this.inputs.premium + this.inputs.fees, 2);
  }

  /**
   * Calculate intrinsic value at current price
   * Intrinsic Value = Max(0, Current Price - Strike)
   */
  intrinsicValue(sharePrice?: number): number {
    const price = sharePrice || this.inputs.currentPrice;
    return roundTo(Math.max(0, price - this.inputs.strike), 2);
  }

  /**
   * Calculate time value
   * Time Value = Current Premium - Intrinsic Value (in dollars)
   */
  timeValue(sharePrice?: number, currentPremium?: number): number {
    const price = sharePrice || this.inputs.currentPrice;
    const premium = currentPremium || this.inputs.currentPremium || 0;
    const intrinsicValue = this.intrinsicValue(price);
    const intrinsicValueDollars = intrinsicValue * 100; // Convert to contract value
    return roundTo(Math.max(0, premium - intrinsicValueDollars), 2);
  }

  /**
   * Calculate current profit/loss
   */
  profitLoss(sharePrice?: number, currentPremium?: number): number {
    const currentValue =
      currentPremium || this.inputs.currentPremium || this.intrinsicValue(sharePrice);
    const totalCost = this.inputs.premium + this.inputs.fees;
    return roundTo(currentValue - totalCost, 2);
  }

  /**
   * Calculate unrealized P&L based on current premium or intrinsic value
   */
  unrealizedPnL(): number {
    return this.profitLoss();
  }

  /**
   * Calculate P&L at expiration for given share price
   */
  expirationPnL(sharePrice: number): number {
    const intrinsicValue = Math.max(0, sharePrice - this.inputs.strike);
    const intrinsicValueDollars = intrinsicValue * 100; // Convert to contract value
    const totalCost = this.inputs.premium + this.inputs.fees;
    return roundTo(intrinsicValueDollars - totalCost, 2);
  }

  /**
   * Calculate percentage gain/loss
   */
  percentageGain(): number {
    const pnl = this.unrealizedPnL();
    const totalCost = this.inputs.premium + this.inputs.fees;
    return roundTo((pnl / totalCost) * 100, 2);
  }

  /**
   * Calculate leverage ratio (how much stock movement affects option)
   */
  leverageRatio(): number {
    const totalCost = this.inputs.premium + this.inputs.fees;
    if (totalCost === 0) return 0;
    return roundTo(this.inputs.currentPrice / totalCost, 2);
  }

  /**
   * Get days to expiration
   */
  daysToExpiration(): number {
    return daysBetween(this.today, this.inputs.expiration);
  }

  // ===========================================================================
  // GREEKS
  // ===========================================================================

  /**
   * Get current delta approximation
   */
  currentDelta(): number {
    const timeToExpiry = this.daysToExpiration();
    return approximateDelta(this.inputs.currentPrice, this.inputs.strike, timeToExpiry, 'call');
  }

  /**
   * Get current theta approximation
   */
  currentTheta(): number {
    const timeToExpiry = this.daysToExpiration();
    const currentPremium = this.inputs.currentPremium || this.inputs.premium;
    return approximateTheta(currentPremium, timeToExpiry);
  }

  // ===========================================================================
  // ANALYSIS
  // ===========================================================================

  /**
   * Generate payoff chart data
   */
  payoffChart(priceRange?: number[]): ChartDataPoint[] {
    const prices = priceRange || generatePriceRange(this.inputs.currentPrice, 50, 15);
    const breakeven = this.breakeven();

    return prices.map(price => ({
      stockPrice: price,
      profitLoss: this.expirationPnL(price),
      breakeven: Math.abs(price - breakeven) < 0.01,
    }));
  }

  /**
   * Get all metrics in a single object
   */
  getAllMetrics(): LongCallMetrics {
    return {
      breakeven: this.breakeven(),
      maxProfit: this.maxProfit(),
      maxLoss: this.maxLoss(),
      intrinsicValue: this.intrinsicValue(),
      timeValue: this.timeValue(),
      unrealizedPnL: this.unrealizedPnL(),
      currentDelta: this.currentDelta(),
      currentTheta: this.currentTheta(),
      daysToExpiration: this.daysToExpiration(),
      percentageGain: this.percentageGain(),
      leverageRatio: this.leverageRatio(),
    };
  }

  /**
   * Analyze risks for this position
   */
  analyzeRisks(): RiskFlag[] {
    const breakeven = this.breakeven();
    const days = this.daysToExpiration();

    // For long calls, we focus on time decay and price distance from breakeven
    const risks: RiskFlag[] = [];

    // Time risk (theta decay)
    if (days <= 30) {
      const severity = days <= 7 ? 'critical' : days <= 14 ? 'high' : 'medium';
      risks.push({
        severity,
        message: `Time decay risk: ${days} days to expiration`,
        category: 'time',
      });
    }

    // Price risk (distance from breakeven)
    const distanceFromBreakeven = ((this.inputs.currentPrice - breakeven) / breakeven) * 100;
    if (distanceFromBreakeven < -10) {
      const severity = distanceFromBreakeven < -20 ? 'high' : 'medium';
      risks.push({
        severity,
        message: `Stock below breakeven: ${Math.abs(distanceFromBreakeven).toFixed(1)}% away`,
        category: 'price',
      });
    }

    // Out of the money with little time
    if (!this.isInTheMoney() && days <= 14) {
      risks.push({
        severity: 'high',
        message: 'Out-of-the-money with limited time remaining',
        category: 'price',
      });
    }

    return risks;
  }

  /**
   * Check if the option is in-the-money
   */
  isInTheMoney(): boolean {
    return this.inputs.currentPrice > this.inputs.strike;
  }

  /**
   * Check if the option is profitable
   */
  isProfitable(): boolean {
    return this.inputs.currentPrice > this.breakeven();
  }

  /**
   * Calculate moneyness (how far ITM/OTM)
   */
  moneyness(): number {
    return roundTo(((this.inputs.currentPrice - this.inputs.strike) / this.inputs.strike) * 100, 2);
  }

  /**
   * Get option classification
   */
  getClassification(): 'Deep ITM' | 'ITM' | 'ATM' | 'OTM' | 'Deep OTM' {
    const moneyness = this.moneyness();

    if (moneyness > 10) return 'Deep ITM';
    if (moneyness > 2) return 'ITM';
    if (Math.abs(moneyness) <= 2) return 'ATM';
    if (moneyness > -10) return 'OTM';
    return 'Deep OTM';
  }

  /**
   * Calculate probability of expiring ITM (simplified)
   */
  probabilityITM(): number {
    const moneyness = this.moneyness();
    const days = this.daysToExpiration();

    // Very simplified probability based on moneyness and time
    let probability = 50; // Start at 50%

    // Adjust for moneyness
    probability += moneyness * 2;

    // Adjust for time (less time = less chance of movement)
    const timeAdjustment = Math.max(0, (30 - days) / 30) * 20;
    if (moneyness < 0) {
      probability -= timeAdjustment;
    }

    return Math.max(0, Math.min(100, roundTo(probability, 1)));
  }

  /**
   * Get position summary string
   */
  getSummary(): string {
    const metrics = this.getAllMetrics();
    const risks = this.analyzeRisks();

    return [
      `Long Call: $${this.inputs.strike} strike, expires ${this.inputs.expiration.toLocaleDateString()}`,
      `Premium Paid: $${this.inputs.premium} (total cost: $${this.maxLoss()})`,
      `Current Price: $${this.inputs.currentPrice}`,
      `Breakeven: $${metrics.breakeven}`,
      `Intrinsic Value: $${metrics.intrinsicValue}`,
      `Unrealized P&L: $${metrics.unrealizedPnL} (${metrics.percentageGain}%)`,
      `Classification: ${this.getClassification()}`,
      `Days to Expiration: ${metrics.daysToExpiration}`,
      `Probability ITM: ${this.probabilityITM()}%`,
      risks.length > 0 ? `Risks: ${risks.length} flag(s)` : 'No risk flags',
    ].join('\n');
  }
}
