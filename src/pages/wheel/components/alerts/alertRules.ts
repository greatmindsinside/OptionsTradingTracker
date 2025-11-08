import type { Position } from '@/types/wheel';
import { daysTo, pctMaxShortCall } from '@/utils/wheel-calculations';

import type { Alert, AlertContext, AlertRule } from './alertTypes';

/**
 * Phase 1: Core Alert Rules
 * - Profit target alerts
 * - Expiration warnings
 * - Earnings alerts
 * - Roll opportunities
 */

// Helper to calculate days until earnings
function daysUntilEarnings(ticker: string, earnings: Record<string, string>): number | null {
  const earningsDate = earnings[ticker];
  if (!earningsDate) return null;
  return daysTo(earningsDate);
}

/**
 * Rule: Profit Target - Multiple Thresholds
 * Alerts when positions have captured significant profit
 */
export const profitTargetRule: AlertRule = {
  id: 'profit-target',
  name: 'Profit Target',
  category: 'profit_target',
  enabled: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  check: (position: Position, _context: AlertContext): Alert | null => {
    // Only for short positions (we sold them)
    if (position.side !== 'S') return null;

    const pct = pctMaxShortCall(position.entry, position.mark);

    // 90%+ profit - Urgent
    if (pct >= 90) {
      return {
        id: `profit-90-${position.id}`,
        ticker: position.ticker,
        category: 'profit_target',
        priority: 'urgent',
        title: `${position.ticker} ${pct.toFixed(0)}% max profit`,
        message: `${position.ticker} ${position.type} $${position.strike} has captured ${pct.toFixed(0)}% of max profit. Close now to lock in gains.`,
        actions: [
          { label: 'Close', action: 'close' },
          { label: 'View', action: 'view' },
        ],
        dismissible: true,
      };
    }

    // 75%+ profit - Info
    if (pct >= 75) {
      return {
        id: `profit-75-${position.id}`,
        ticker: position.ticker,
        category: 'profit_target',
        priority: 'info',
        title: `${position.ticker} ${pct.toFixed(0)}% profit captured`,
        message: `${position.ticker} ${position.type} $${position.strike} has ${pct.toFixed(0)}% of max profit. Consider closing or holding.`,
        actions: [
          { label: 'Close', action: 'close' },
          { label: 'Dismiss', action: 'dismiss' },
        ],
        dismissible: true,
      };
    }

    // 50%+ profit - Opportunity
    if (pct >= 50) {
      return {
        id: `profit-50-${position.id}`,
        ticker: position.ticker,
        category: 'profit_target',
        priority: 'opportunity',
        title: `${position.ticker} 50%+ profit available`,
        message: `${position.ticker} ${position.type} $${position.strike} has ${pct.toFixed(0)}% profit. Good opportunity to close.`,
        actions: [{ label: 'View', action: 'view' }],
        dismissible: true,
      };
    }

    return null;
  },
};

/**
 * Rule: Expiration Warnings
 * Alerts when options are close to expiration
 */
export const expirationWarningRule: AlertRule = {
  id: 'expiration-warning',
  name: 'Expiration Warning',
  category: 'expiration',
  enabled: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  check: (position: Position, _context: AlertContext): Alert | null => {
    // DTE 0-1: Urgent
    if (position.dte <= 1) {
      return {
        id: `exp-urgent-${position.id}`,
        ticker: position.ticker,
        category: 'expiration',
        priority: 'urgent',
        title: `${position.ticker} expires ${position.dte === 0 ? 'today' : 'tomorrow'}`,
        message: `${position.ticker} ${position.type} $${position.strike} expires in ${position.dte} day${position.dte === 1 ? '' : 's'}. Take action immediately.`,
        actions: [
          { label: 'Close', action: 'close' },
          { label: 'Roll', action: 'roll' },
        ],
        dismissible: false,
      };
    }

    // DTE 2-3: Warning
    if (position.dte <= 3) {
      return {
        id: `exp-warning-${position.id}`,
        ticker: position.ticker,
        category: 'expiration',
        priority: 'warning',
        title: `${position.ticker} expires in ${position.dte} days`,
        message: `${position.ticker} ${position.type} $${position.strike} expires soon. Plan your action.`,
        actions: [
          { label: 'Close', action: 'close' },
          { label: 'Roll', action: 'roll' },
        ],
        dismissible: true,
      };
    }

    // DTE 4-7: Info
    if (position.dte <= 7) {
      return {
        id: `exp-info-${position.id}`,
        ticker: position.ticker,
        category: 'expiration',
        priority: 'info',
        title: `${position.ticker} expires in ${position.dte} days`,
        message: `${position.ticker} ${position.type} $${position.strike} expires this week. Monitor closely.`,
        actions: [{ label: 'View', action: 'view' }],
        dismissible: true,
      };
    }

    return null;
  },
};

/**
 * Rule: Earnings Alerts - Enhanced
 * Multi-stage earnings warnings
 */
export const earningsAlertRule: AlertRule = {
  id: 'earnings-alert',
  name: 'Earnings Alert',
  category: 'earnings',
  enabled: true,
  check: (position: Position, context: AlertContext): Alert | null => {
    const daysUntil = daysUntilEarnings(position.ticker, context.earnings);
    if (daysUntil === null) return null;

    // Earnings tomorrow: Urgent
    if (daysUntil <= 1) {
      return {
        id: `earnings-urgent-${position.ticker}`,
        ticker: position.ticker,
        category: 'earnings',
        priority: 'urgent',
        title: `${position.ticker} earnings ${daysUntil === 0 ? 'today' : 'tomorrow'}`,
        message: `URGENT: ${position.ticker} reports earnings ${daysUntil === 0 ? 'today' : 'tomorrow'}. Close ${position.type} $${position.strike} to avoid assignment risk.`,
        actions: [
          { label: 'Close', action: 'close' },
          { label: 'Roll', action: 'roll' },
        ],
        dismissible: false,
      };
    }

    // Earnings in 2-3 days: Warning
    if (daysUntil <= 3) {
      return {
        id: `earnings-warning-${position.ticker}`,
        ticker: position.ticker,
        category: 'earnings',
        priority: 'warning',
        title: `${position.ticker} earnings in ${daysUntil} days`,
        message: `${position.ticker} reports earnings in ${daysUntil} days. High IV. Consider closing ${position.type} $${position.strike} to avoid risk.`,
        actions: [
          { label: 'Close', action: 'close' },
          { label: 'View', action: 'view' },
        ],
        dismissible: true,
      };
    }

    // Earnings in 4-7 days: Info
    if (daysUntil <= 7) {
      return {
        id: `earnings-info-${position.ticker}`,
        ticker: position.ticker,
        category: 'earnings',
        priority: 'info',
        title: `${position.ticker} earnings next week`,
        message: `${position.ticker} reports earnings in ${daysUntil} days. Plan action for ${position.type} $${position.strike}.`,
        actions: [{ label: 'View', action: 'view' }],
        dismissible: true,
      };
    }

    // Earnings in 8-14 days: Opportunity to plan
    if (daysUntil <= 14) {
      return {
        id: `earnings-plan-${position.ticker}`,
        ticker: position.ticker,
        category: 'earnings',
        priority: 'opportunity',
        title: `${position.ticker} earnings in 2 weeks`,
        message: `${position.ticker} reports earnings in ${daysUntil} days. Start planning action for ${position.type} $${position.strike}.`,
        actions: [{ label: 'View', action: 'view' }],
        dismissible: true,
      };
    }

    return null;
  },
};

/**
 * Rule: Roll Opportunities
 * Identifies good times to roll positions
 */
export const rollOpportunityRule: AlertRule = {
  id: 'roll-opportunity',
  name: 'Roll Opportunity',
  category: 'roll_opportunity',
  enabled: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  check: (position: Position, _context: AlertContext): Alert | null => {
    // Only for short positions with high profit and near expiration
    if (position.side !== 'S') return null;
    if (position.dte > 7 || position.dte < 3) return null;

    const pct = pctMaxShortCall(position.entry, position.mark);

    // High profit captured (70%+) + 3-7 DTE = good roll candidate
    if (pct >= 70) {
      return {
        id: `roll-${position.id}`,
        ticker: position.ticker,
        category: 'roll_opportunity',
        priority: 'info',
        title: `${position.ticker} ready to roll`,
        message: `${position.ticker} ${position.type} $${position.strike} has ${position.dte} DTE and ${pct.toFixed(0)}% profit captured. Consider rolling to next month for additional premium.`,
        actions: [
          { label: 'Roll', action: 'roll' },
          { label: 'Close', action: 'close' },
        ],
        dismissible: true,
      };
    }

    return null;
  },
};

/**
 * Rule: Uncovered Short Calls
 * Warns about naked call positions
 */
export const uncoveredCallsRule: AlertRule = {
  id: 'uncovered-calls',
  name: 'Uncovered Calls Warning',
  category: 'risk_management',
  enabled: true,
  check: (position: Position, context: AlertContext): Alert | null => {
    // Only for short calls
    if (position.type !== 'C' || position.side !== 'S') return null;

    const sharesOwned = context.sharesByTicker.get(position.ticker) || 0;
    const sharesNeeded = position.qty * 100;
    const uncovered = Math.max(0, sharesNeeded - sharesOwned);

    if (uncovered > 0) {
      return {
        id: `uncovered-${position.id}`,
        ticker: position.ticker,
        category: 'risk_management',
        priority: 'warning',
        title: `${position.ticker} calls partially uncovered`,
        message: `Short ${position.qty} ${position.ticker} call${position.qty > 1 ? 's' : ''} but only own ${sharesOwned} shares. ${uncovered} shares uncovered (unlimited risk).`,
        actions: [
          { label: 'Buy Shares', action: 'custom' },
          { label: 'Close Calls', action: 'close' },
        ],
        dismissible: true,
      };
    }

    return null;
  },
};

/**
 * Rule: Covered Call Opportunities
 * Identifies shares that could generate income
 */
export const coveredCallOpportunityRule: AlertRule = {
  id: 'covered-call-opportunity',
  name: 'Covered Call Opportunity',
  category: 'strategic',
  enabled: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  check: (_position: Position, _context: AlertContext): Alert | null => {
    // This rule checks share lots, not positions
    // We'll handle this differently in the generation function
    return null;
  },
};

/**
 * All active alert rules (Phase 1)
 */
export const ALERT_RULES: AlertRule[] = [
  profitTargetRule,
  expirationWarningRule,
  earningsAlertRule,
  rollOpportunityRule,
  uncoveredCallsRule,
  coveredCallOpportunityRule,
];

/**
 * Generate strategic alerts for share lots
 */
export function generateStrategicAlerts(context: AlertContext): Alert[] {
  const alerts: Alert[] = [];

  // Check each ticker with shares
  context.sharesByTicker.forEach((shares, ticker) => {
    const shortCalls = context.shortCallsByTicker.get(ticker) || 0;
    const uncoveredShares = Math.max(0, shares - shortCalls);

    // If we have shares with no calls (or not enough calls), suggest selling covered calls
    if (uncoveredShares >= 100) {
      const contracts = Math.floor(uncoveredShares / 100);
      alerts.push({
        id: `cc-opp-${ticker}`,
        ticker,
        category: 'strategic',
        priority: 'opportunity',
        title: `${ticker} covered call opportunity`,
        message: `Own ${uncoveredShares} ${ticker} shares with no covered calls. Sell ${contracts} call${contracts > 1 ? 's' : ''} for premium income.`,
        actions: [
          { label: 'Sell Calls', action: 'custom' },
          { label: 'Dismiss', action: 'dismiss' },
        ],
        dismissible: true,
      });
    }
  });

  return alerts;
}
