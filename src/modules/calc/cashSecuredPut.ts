/**
 * Cash-Secured Put Options Strategy Calculations
 * Phase 4: Core Calculations - Cash-Secured Put Implementation
 */

import {
  type ChartDataPoint,
  type RiskFlag,
  type RiskThresholds,
  DEFAULT_RISK_THRESHOLDS,
  daysBetween,
  annualizeReturn,
  roundTo,
  generatePriceRange,
  analyzeRisks,
  approximateDelta,
  approximateTheta,
} from './common.js';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CashSecuredPutInputs {
  /** Strike price of sold put option */
  strike: number;
  /** Premium received for selling the put */
  premium: number;
  /** Expiration date of the option */
  expiration: Date;
  /** Total fees paid (commissions, etc.) */
  fees: number;
  /** Cash secured for potential assignment */
  cashSecured: number;
  /** Current stock price (for analysis) */
  currentPrice?: number;
}

export interface CashSecuredPutMetrics {
  breakeven: number;
  maxProfit: number;
  maxLoss: number;
  returnOnOutlay: number;
  returnOnRisk: number;
  annualizedROO: number;
  annualizedROR: number;
  assignmentPnL: number;
  currentDelta: number;
  currentTheta: number;
  daysToExpiration: number;
  effectiveBasis: number;
}

// =============================================================================
// CASH-SECURED PUT CLASS
// =============================================================================

export class CashSecuredPut {
  private inputs: CashSecuredPutInputs;
  private today: Date;

  constructor(inputs: CashSecuredPutInputs, currentDate: Date = new Date()) {
    this.inputs = inputs;
    this.today = currentDate;

    // Default cash secured to strike price if not provided
    if (!this.inputs.cashSecured) {
      this.inputs.cashSecured = this.inputs.strike * 100; // Assume 1 contract (100 shares)
    }

    // Validate inputs
    this.validateInputs();
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  private validateInputs(): void {
    const { strike, premium, fees, cashSecured } = this.inputs;

    if (strike <= 0) throw new Error('Strike price must be positive');
    if (premium < 0) throw new Error('Premium cannot be negative');
    if (fees < 0) throw new Error('Fees cannot be negative');
    if (cashSecured <= 0) throw new Error('Cash secured must be positive');
    if (this.inputs.expiration <= this.today) {
      throw new Error('Expiration must be in the future');
    }

    // Warn if cash secured is insufficient
    const requiredCash = this.inputs.strike * 100; // Assume 100 shares per contract
    if (cashSecured < requiredCash * 0.9) {
      // Allow 10% margin
      console.warn(
        `Cash secured ($${cashSecured}) may be insufficient for strike $${strike} (requires ~$${requiredCash})`
      );
    }
  }

  // ===========================================================================
  // BASIC CALCULATIONS
  // ===========================================================================

  /**
   * Calculate breakeven price
   * Breakeven = Strike - Net Premium Received
   */
  breakeven(): number {
    const netPremium = this.inputs.premium - this.inputs.fees;
    return roundTo(this.inputs.strike - netPremium / 100, 2); // Assuming 100 shares per contract
  }

  /**
   * Calculate maximum profit (premium received)
   * Max Profit = Net Premium Received
   */
  maxProfit(): number {
    const netPremium = this.inputs.premium - this.inputs.fees;
    return roundTo(netPremium, 2);
  }

  /**
   * Calculate maximum loss (if stock goes to zero)
   * Max Loss = (Strike * 100) - Net Premium Received
   */
  maxLoss(): number {
    const netPremium = this.inputs.premium - this.inputs.fees;
    const sharesPerContract = 100;
    const maxLoss = this.inputs.strike * sharesPerContract - netPremium;
    return roundTo(maxLoss, 2);
  }

  /**
   * Calculate Return on Outlay (ROO)
   * ROO = Max Profit / Cash Secured
   */
  returnOnOutlay(): number {
    const maxProfit = this.maxProfit();
    return roundTo((maxProfit / this.inputs.cashSecured) * 100, 2);
  }

  /**
   * Calculate Return on Risk (ROR)
   * ROR = Max Profit / Max Loss
   */
  returnOnRisk(): number {
    const maxProfit = this.maxProfit();
    const maxLoss = this.maxLoss();
    if (maxLoss === 0) return 0;
    return roundTo((maxProfit / maxLoss) * 100, 2);
  }

  /**
   * Calculate annualized returns
   */
  annualizedReturns(): { roo: number; ror: number } {
    const days = this.daysToExpiration();
    const roo = annualizeReturn(this.returnOnOutlay(), days);
    const ror = annualizeReturn(this.returnOnRisk(), days);

    return {
      roo: roundTo(roo, 2),
      ror: roundTo(ror, 2),
    };
  }

  /**
   * Calculate effective basis if assigned
   * Effective Basis = Strike - Premium per Share
   */
  effectiveBasis(): number {
    const netPremium = this.inputs.premium - this.inputs.fees;
    const premiumPerShare = netPremium / 100; // Assuming 100 shares
    return roundTo(this.inputs.strike - premiumPerShare, 2);
  }

  /**
   * Calculate P&L if assigned at expiration
   */
  assignmentPnL(): number {
    // If assigned, we get the premium but buy shares at strike
    // P&L is just the premium received (assignment is neutral at strike)
    return this.maxProfit();
  }

  /**
   * Calculate P&L at expiration for given share price
   */
  expirationPnL(sharePrice: number): number {
    const netPremium = this.inputs.premium - this.inputs.fees;

    if (sharePrice < this.inputs.strike) {
      // Option exercised - we buy shares at strike
      // P&L = Premium - (Strike - Current Price) * 100
      const sharesPerContract = 100;
      const assignmentLoss = (this.inputs.strike - sharePrice) * sharesPerContract;
      return roundTo(netPremium - assignmentLoss, 2);
    } else {
      // Option expires worthless - keep premium
      return roundTo(netPremium, 2);
    }
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
    const currentPrice = this.inputs.currentPrice || this.inputs.strike;
    const timeToExpiry = this.daysToExpiration();
    return approximateDelta(currentPrice, this.inputs.strike, timeToExpiry, 'put');
  }

  /**
   * Get current theta approximation
   */
  currentTheta(): number {
    const timeToExpiry = this.daysToExpiration();
    return approximateTheta(this.inputs.premium, timeToExpiry);
  }

  // ===========================================================================
  // ANALYSIS
  // ===========================================================================

  /**
   * Generate payoff chart data
   */
  payoffChart(priceRange?: number[]): ChartDataPoint[] {
    const centerPrice = this.inputs.currentPrice || this.inputs.strike;
    const prices = priceRange || generatePriceRange(centerPrice, 40, 15);
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
  getAllMetrics(): CashSecuredPutMetrics {
    const annualized = this.annualizedReturns();

    return {
      breakeven: this.breakeven(),
      maxProfit: this.maxProfit(),
      maxLoss: this.maxLoss(),
      returnOnOutlay: this.returnOnOutlay(),
      returnOnRisk: this.returnOnRisk(),
      annualizedROO: annualized.roo,
      annualizedROR: annualized.ror,
      assignmentPnL: this.assignmentPnL(),
      currentDelta: this.currentDelta(),
      currentTheta: this.currentTheta(),
      daysToExpiration: this.daysToExpiration(),
      effectiveBasis: this.effectiveBasis(),
    };
  }

  /**
   * Analyze risks for this position
   */
  analyzeRisks(thresholds?: RiskThresholds): RiskFlag[] {
    const currentPrice = this.inputs.currentPrice || this.inputs.strike;
    const breakeven = this.breakeven();
    const returnPercent = this.returnOnOutlay();
    const days = this.daysToExpiration();

    const risks = analyzeRisks({
      returnPercent,
      days,
      currentPrice,
      breakeven,
      expiration: this.inputs.expiration,
      thresholds: thresholds || DEFAULT_RISK_THRESHOLDS,
    });

    // Add CSP-specific risk checks
    if (this.isLikelyAssignment()) {
      risks.push({
        severity: 'medium',
        message: 'High probability of assignment - prepare for stock purchase',
        category: 'assignment',
      });
    }

    return risks;
  }

  /**
   * Check if the position is in-the-money (stock below strike)
   */
  isInTheMoney(): boolean {
    const currentPrice = this.inputs.currentPrice || this.inputs.strike;
    return currentPrice < this.inputs.strike;
  }

  /**
   * Check if likely to be assigned
   */
  isLikelyAssignment(): boolean {
    const currentPrice = this.inputs.currentPrice || this.inputs.strike;
    const daysToExpiry = this.daysToExpiration();
    const intrinsicValue = Math.max(0, this.inputs.strike - currentPrice);
    const intrinsicValueDollars = intrinsicValue * 100; // Convert to contract value

    // If deep ITM with little time value, assignment likely
    return (
      this.isInTheMoney() && daysToExpiry <= 7 && intrinsicValueDollars >= this.inputs.premium * 0.8
    );
  }

  /**
   * Calculate what the stock basis would be if assigned
   */
  wouldBeStockBasis(): number {
    return this.effectiveBasis();
  }

  /**
   * Get position summary string
   */
  getSummary(): string {
    const metrics = this.getAllMetrics();
    const risks = this.analyzeRisks();
    const currentPrice = this.inputs.currentPrice || this.inputs.strike;

    return [
      `Cash-Secured Put: $${this.inputs.strike} strike, expires ${this.inputs.expiration.toLocaleDateString()}`,
      `Premium Received: $${this.inputs.premium} (net: $${this.inputs.premium - this.inputs.fees})`,
      `Cash Secured: $${this.inputs.cashSecured}`,
      `Current Price: $${currentPrice}`,
      `Breakeven: $${metrics.breakeven}`,
      `Max Profit: $${metrics.maxProfit} (${metrics.annualizedROO}% annualized ROO)`,
      `If Assigned: Effective basis $${metrics.effectiveBasis}`,
      `Days to Expiration: ${metrics.daysToExpiration}`,
      `Status: ${this.isInTheMoney() ? 'In-The-Money' : 'Out-Of-The-Money'}`,
      risks.length > 0 ? `Risks: ${risks.length} flag(s)` : 'No risk flags',
    ].join('\n');
  }
}
