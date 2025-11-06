/**
 * Options Calculations Module
 * Phase 4: Core Calculations - Clean exports for all calculation classes
 */

// =============================================================================
// COMMON UTILITIES (import first for types)
// =============================================================================

export {
  analyzeRisks,
  annualizeReturn,
  // Greeks Approximations
  approximateDelta,
  approximateGamma,
  approximateTheta,
  type ChartDataPoint,
  checkPriceRisk,
  // Risk Analysis
  checkReturnRisk,
  checkTimeRisk,
  clamp,
  // Utility Functions
  daysBetween,
  // Constants
  DEFAULT_RISK_THRESHOLDS,
  formatCurrency,
  formatPercent,
  generatePriceRange,
  // Interfaces
  type RiskFlag,
  type RiskThresholds,
  roundTo,
} from './common.js';

// =============================================================================
// STRATEGY CLASSES
// =============================================================================

export type { CashSecuredPutInputs, CashSecuredPutMetrics } from './cashSecuredPut.js';
export { CashSecuredPut } from './cashSecuredPut.js';
export type { CoveredCallInputs, CoveredCallMetrics } from './coveredCall.js';
export { CoveredCall } from './coveredCall.js';
export type { LongCallInputs, LongCallMetrics } from './longCall.js';
export { LongCall } from './longCall.js';

// =============================================================================
// CONVENIENCE FACTORY FUNCTIONS
// =============================================================================

import { CashSecuredPut, type CashSecuredPutInputs } from './cashSecuredPut.js';
import { type RiskFlag, roundTo } from './common.js';
import { CoveredCall, type CoveredCallInputs } from './coveredCall.js';
import { LongCall, type LongCallInputs } from './longCall.js';

/**
 * Create a new Covered Call position with validation
 */
export function createCoveredCall(inputs: CoveredCallInputs): CoveredCall {
  return new CoveredCall(inputs);
}

/**
 * Create a new Cash-Secured Put position with validation
 */
export function createCashSecuredPut(inputs: CashSecuredPutInputs): CashSecuredPut {
  return new CashSecuredPut(inputs);
}

/**
 * Create a new Long Call position with validation
 */
export function createLongCall(inputs: LongCallInputs): LongCall {
  return new LongCall(inputs);
}

// =============================================================================
// BATCH ANALYSIS UTILITIES
// =============================================================================

/**
 * Analyze multiple positions and aggregate risk flags
 */
export function analyzeBatchRisks(positions: Array<CoveredCall | CashSecuredPut | LongCall>): {
  totalPositions: number;
  totalRisks: number;
  risksByCategory: Record<RiskFlag['category'], number>;
  risksBySeverity: Record<RiskFlag['severity'], number>;
  highestSeverity: RiskFlag['severity'] | null;
} {
  const allRisks: RiskFlag[] = [];

  // Collect all risks from all positions
  positions.forEach(position => {
    const risks = position.analyzeRisks();
    allRisks.push(...risks);
  });

  // Aggregate by category
  const risksByCategory: Record<RiskFlag['category'], number> = {
    return: 0,
    size: 0,
    time: 0,
    price: 0,
    assignment: 0,
  };

  // Aggregate by severity
  const risksBySeverity: Record<RiskFlag['severity'], number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  allRisks.forEach(risk => {
    risksByCategory[risk.category]++;
    risksBySeverity[risk.severity]++;
  });

  // Determine highest severity
  let highestSeverity: RiskFlag['severity'] | null = null;
  if (risksBySeverity.critical > 0) highestSeverity = 'critical';
  else if (risksBySeverity.high > 0) highestSeverity = 'high';
  else if (risksBySeverity.medium > 0) highestSeverity = 'medium';
  else if (risksBySeverity.low > 0) highestSeverity = 'low';

  return {
    totalPositions: positions.length,
    totalRisks: allRisks.length,
    risksByCategory,
    risksBySeverity,
    highestSeverity,
  };
}

/**
 * Calculate portfolio-level metrics from multiple positions
 */
export function calculatePortfolioMetrics(
  positions: Array<{
    maxProfit: () => number;
    maxLoss: () => number;
    daysToExpiration: () => number;
  }>
): {
  totalMaxProfit: number;
  totalMaxLoss: number;
  averageDaysToExpiration: number;
  portfolioROO: number; // Assuming equal capital allocation
} {
  if (positions.length === 0) {
    return {
      totalMaxProfit: 0,
      totalMaxLoss: 0,
      averageDaysToExpiration: 0,
      portfolioROO: 0,
    };
  }

  const totalMaxProfit = positions.reduce((sum, pos) => sum + pos.maxProfit(), 0);
  const totalMaxLoss = positions.reduce((sum, pos) => sum + pos.maxLoss(), 0);
  const averageDaysToExpiration =
    positions.reduce((sum, pos) => sum + pos.daysToExpiration(), 0) / positions.length;

  // Simple ROO calculation (would need capital allocation for precise calculation)
  const portfolioROO = totalMaxLoss > 0 ? (totalMaxProfit / totalMaxLoss) * 100 : 0;

  return {
    totalMaxProfit: roundTo(totalMaxProfit, 2),
    totalMaxLoss: roundTo(totalMaxLoss, 2),
    averageDaysToExpiration: roundTo(averageDaysToExpiration, 1),
    portfolioROO: roundTo(portfolioROO, 2),
  };
}
