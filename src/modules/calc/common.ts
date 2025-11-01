/**
 * Common utilities and interfaces for options calculations
 * Phase 4: Core Calculations - Shared calculation infrastructure
 */

// =============================================================================
// INTERFACES
// =============================================================================

export interface RiskFlag {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  category: 'return' | 'size' | 'time' | 'price' | 'assignment';
}

export interface ChartDataPoint {
  stockPrice: number;
  profitLoss: number;
  breakeven?: boolean;
}

export interface RiskThresholds {
  /** Minimum ROO/ROR annualized percentage */
  minAnnualizedReturn: number;
  /** Maximum position size as percentage of account value */
  maxPositionSize: number;
  /** Days to expiration warning threshold */
  daysToExpirationWarning: number;
  /** Below breakeven threshold percentage */
  belowBreakevenThreshold: number;
}

// =============================================================================
// DEFAULT RISK THRESHOLDS
// =============================================================================

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  minAnnualizedReturn: 15, // 15% annualized
  maxPositionSize: 5, // 5% of account value
  daysToExpirationWarning: 7, // 7 days warning
  belowBreakevenThreshold: 5, // 5% below breakeven
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Annualize a return percentage based on days
 */
export function annualizeReturn(returnPercent: number, days: number): number {
  if (days <= 0) return 0;
  return (returnPercent * 365) / days;
}

/**
 * Format currency values
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage values
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate price range for payoff charts
 */
export function generatePriceRange(
  centerPrice: number,
  rangePercent: number = 50,
  steps: number = 21
): number[] {
  const minPrice = centerPrice * (1 - rangePercent / 100);
  const maxPrice = centerPrice * (1 + rangePercent / 100);
  const stepSize = (maxPrice - minPrice) / (steps - 1);

  const prices: number[] = [];
  for (let i = 0; i < steps; i++) {
    prices.push(roundTo(minPrice + i * stepSize, 2));
  }

  return prices;
}

// =============================================================================
// GREEKS APPROXIMATIONS (Educational Purposes)
// =============================================================================

/**
 * Approximate delta using simplified Black-Scholes
 * Note: This is for educational purposes only, not for actual trading
 */
export function approximateDelta(
  spot: number,
  strike: number,
  timeToExpiry: number,
  optionType: 'call' | 'put',
  volatility: number = 0.2 // 20% default volatility
): number {
  if (timeToExpiry <= 0) {
    // At expiration, delta is 0 or 1
    if (optionType === 'call') {
      return spot >= strike ? 1 : 0;
    } else {
      return spot <= strike ? -1 : 0;
    }
  }

  // Simplified delta calculation
  const moneyness = Math.log(spot / strike);
  const timeComponent = Math.sqrt(timeToExpiry / 365);
  const volatilityComponent = volatility * timeComponent;

  // Very simplified approximation - not for production use
  let delta = 0.5 + moneyness / (2 * volatilityComponent);
  delta = clamp(delta, 0.01, 0.99);

  return optionType === 'call' ? delta : delta - 1;
}

/**
 * Approximate theta (time decay) using linear approximation
 * Returns negative value (options lose value over time)
 */
export function approximateTheta(
  premium: number,
  daysToExpiry: number,
  accelerationFactor: number = 1.5
): number {
  if (daysToExpiry <= 0) return 0;

  // Linear decay with acceleration in final 30 days
  let decayRate = premium / daysToExpiry;

  // Accelerate decay in final month
  if (daysToExpiry <= 30) {
    decayRate *= accelerationFactor;
  }

  return -Math.abs(decayRate);
}

/**
 * Approximate gamma (delta sensitivity to price changes)
 * Highest at-the-money, decreases away from strike
 */
export function approximateGamma(
  spot: number,
  strike: number,
  timeToExpiry: number,
  volatility: number = 0.2
): number {
  if (timeToExpiry <= 0) return 0;

  // Gamma peaks at-the-money
  const moneyness = Math.abs(Math.log(spot / strike));
  const timeComponent = Math.sqrt(timeToExpiry / 365);

  // Simplified gamma calculation
  const atTheMoneyGamma = 1 / (volatility * timeComponent * spot);
  const distanceFromATM = Math.exp(-moneyness * 2);

  return atTheMoneyGamma * distanceFromATM;
}

// =============================================================================
// RISK ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Check if position meets minimum return thresholds
 */
export function checkReturnRisk(
  returnPercent: number,
  days: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): RiskFlag | null {
  const annualizedReturn = annualizeReturn(returnPercent, days);

  if (annualizedReturn < thresholds.minAnnualizedReturn) {
    const severity = annualizedReturn < thresholds.minAnnualizedReturn / 2 ? 'high' : 'medium';
    return {
      severity,
      message: `Low annualized return: ${formatPercent(annualizedReturn)} (target: ${formatPercent(thresholds.minAnnualizedReturn)})`,
      category: 'return',
    };
  }

  return null;
}

/**
 * Check if position is too close to expiration
 */
export function checkTimeRisk(
  expiration: Date,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): RiskFlag | null {
  const daysToExpiry = daysBetween(new Date(), expiration);

  if (daysToExpiry <= thresholds.daysToExpirationWarning) {
    const severity = daysToExpiry <= 3 ? 'critical' : daysToExpiry <= 7 ? 'high' : 'medium';
    return {
      severity,
      message: `Expiration approaching: ${daysToExpiry} day(s) remaining`,
      category: 'time',
    };
  }

  return null;
}

/**
 * Check if current price is near breakeven
 */
export function checkPriceRisk(
  currentPrice: number,
  breakeven: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): RiskFlag | null {
  const percentFromBreakeven = Math.abs((currentPrice - breakeven) / breakeven) * 100;

  if (percentFromBreakeven <= thresholds.belowBreakevenThreshold) {
    const severity = percentFromBreakeven <= 2 ? 'high' : 'medium';
    return {
      severity,
      message: `Near breakeven: ${formatPercent(percentFromBreakeven)} from break-even price`,
      category: 'price',
    };
  }

  return null;
}

/**
 * Aggregate all risk flags for a position
 */
export function analyzeRisks(params: {
  returnPercent: number;
  days: number;
  currentPrice: number;
  breakeven: number;
  expiration: Date;
  thresholds?: RiskThresholds;
}): RiskFlag[] {
  const {
    returnPercent,
    days,
    currentPrice,
    breakeven,
    expiration,
    thresholds = DEFAULT_RISK_THRESHOLDS,
  } = params;

  const risks: RiskFlag[] = [];

  // Check return risk
  const returnRisk = checkReturnRisk(returnPercent, days, thresholds);
  if (returnRisk) risks.push(returnRisk);

  // Check time risk
  const timeRisk = checkTimeRisk(expiration, thresholds);
  if (timeRisk) risks.push(timeRisk);

  // Check price risk
  const priceRisk = checkPriceRisk(currentPrice, breakeven, thresholds);
  if (priceRisk) risks.push(priceRisk);

  return risks;
}
