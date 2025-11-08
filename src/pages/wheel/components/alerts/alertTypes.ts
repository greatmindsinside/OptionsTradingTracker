import type { Lot, Position } from '@/types/wheel';

/**
 * Alert priority levels determine visual styling and sort order
 */
export type AlertPriority = 'urgent' | 'warning' | 'info' | 'opportunity';

/**
 * Alert category for grouping and filtering
 */
export type AlertCategory =
  | 'expiration'
  | 'profit_target'
  | 'assignment_risk'
  | 'roll_opportunity'
  | 'risk_management'
  | 'strategic'
  | 'earnings'
  | 'theta_decay';

/**
 * Individual alert displayed to the user
 */
export interface Alert {
  id: string;
  ticker: string;
  category: AlertCategory;
  priority: AlertPriority;
  title: string;
  message: string;
  actions?: AlertAction[];
  dismissible?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Action button for an alert
 */
export interface AlertAction {
  label: string;
  action: 'close' | 'roll' | 'view' | 'dismiss' | 'custom';
  callback?: () => void;
}

/**
 * Context provided to alert rules for analysis
 */
export interface AlertContext {
  positions: Position[];
  lots: Lot[];
  earnings: Record<string, string>;
  currentDate: Date;
  // Aggregated metrics
  totalCapital: number;
  capitalByTicker: Map<string, number>;
  sharesByTicker: Map<string, number>;
  shortCallsByTicker: Map<string, number>;
}

/**
 * Rule function that checks if an alert should be generated
 */
export type AlertRuleFunction = (position: Position, context: AlertContext) => Alert | null;

/**
 * Rule definition for an alert type
 */
export interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  enabled: boolean;
  check: AlertRuleFunction;
}

/**
 * Priority level configurations
 */
export const PRIORITY_CONFIG = {
  urgent: {
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    icon: '🔴',
    label: 'URGENT',
  },
  warning: {
    color: '#FB923C',
    bgColor: 'rgba(251, 146, 60, 0.15)',
    borderColor: 'rgba(251, 146, 60, 0.4)',
    icon: '🟠',
    label: 'WARNING',
  },
  info: {
    color: '#F5B342',
    bgColor: 'rgba(245, 179, 66, 0.15)',
    borderColor: 'rgba(245, 179, 66, 0.4)',
    icon: '🟡',
    label: 'INFO',
  },
  opportunity: {
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    icon: '🟢',
    label: 'OPPORTUNITY',
  },
} as const;

/**
 * Sort order for priorities (lower number = higher priority)
 */
export const PRIORITY_ORDER: Record<AlertPriority, number> = {
  urgent: 1,
  warning: 2,
  info: 3,
  opportunity: 4,
};
