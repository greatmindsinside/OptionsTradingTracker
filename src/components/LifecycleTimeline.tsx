/**
 * Lifecycle Timeline Component
 *
 * Visual timeline component for displaying wheel strategy cycle progression
 * with events, dates, P&L tracking, and current status indicators.
 */

import React from 'react';
import { format } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Circle,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
} from 'lucide-react';

import type { WheelCycle, WheelEvent_Record as WheelEventRecord } from '@/modules/db/validation';
import { WheelState, WheelEvent } from '@/modules/wheel/lifecycle';

export interface LifecycleTimelineProps {
  cycle: WheelCycle;
  events: WheelEventRecord[];
  showDetails?: boolean;
  compact?: boolean;
}

interface TimelineEventData {
  id: number;
  date: string;
  type: WheelEvent;
  title: string;
  description: string;
  amount?: number;
  strikePrice?: number;
  expiryDate?: string;
  isPositive?: boolean;
}

/**
 * Get appropriate icon for event type
 */
const getEventIcon = (eventType: WheelEvent, className: string = '') => {
  const iconProps = { size: 16, className };

  switch (eventType) {
    case WheelEvent.CSP_SOLD:
    case WheelEvent.CC_SOLD:
      return <DollarSign {...iconProps} />;

    case WheelEvent.CSP_ASSIGNED:
    case WheelEvent.CC_ASSIGNED:
      return <AlertTriangle {...iconProps} />;

    case WheelEvent.CSP_EXPIRED:
    case WheelEvent.CC_EXPIRED:
    case WheelEvent.POSITION_CLOSED:
      return <CheckCircle {...iconProps} />;

    case WheelEvent.CC_CLOSED:
      return <Circle {...iconProps} />;

    default:
      return <Clock {...iconProps} />;
  }
};

/**
 * Get status color classes based on wheel state
 */
const getStatusColorClass = (status: WheelState): string => {
  switch (status) {
    case WheelState.CLOSED:
      return 'bg-green-100 text-green-800 border-green-200';
    case WheelState.CSP_ASSIGNED:
    case WheelState.CC_ASSIGNED:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case WheelState.CSP_OPEN:
    case WheelState.CC_OPEN:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Format currency values
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Convert events to timeline data
 */
const processEvents = (events: WheelEventRecord[]): TimelineEventData[] => {
  return events.map(event => ({
    id: event.id || 0,
    date: event.event_date,
    type: event.event_type as WheelEvent,
    title: getEventTitle(event.event_type as WheelEvent),
    description: event.description,
    amount: event.amount || undefined,
    strikePrice: event.strike_price || undefined,
    expiryDate: event.expiry_date || undefined,
    isPositive: (event.amount || 0) > 0,
  }));
};

/**
 * Get display title for event type
 */
const getEventTitle = (eventType: WheelEvent): string => {
  switch (eventType) {
    case WheelEvent.CSP_SOLD:
      return 'Put Sold';
    case WheelEvent.CSP_ASSIGNED:
      return 'Put Assigned';
    case WheelEvent.CSP_EXPIRED:
      return 'Put Expired';
    case WheelEvent.CC_SOLD:
      return 'Call Sold';
    case WheelEvent.CC_CLOSED:
      return 'Call Closed';
    case WheelEvent.CC_ASSIGNED:
      return 'Call Assigned';
    case WheelEvent.CC_EXPIRED:
      return 'Call Expired';
    case WheelEvent.POSITION_CLOSED:
      return 'Position Closed';
    default:
      return 'Event';
  }
};

/**
 * Lifecycle Timeline Component
 */
export const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({
  cycle,
  events,
  showDetails = true,
  compact = false,
}) => {
  const timelineEvents = processEvents(events);

  // Calculate summary metrics
  const totalPremium = cycle.total_premium_collected;
  const realizedPnL = cycle.realized_pnl;
  const unrealizedPnL = cycle.unrealized_pnl;
  const currentPnL = realizedPnL || unrealizedPnL || 0;

  return (
    <div className="w-full">
      {/* Cycle Header */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {cycle.underlying_symbol} Wheel Cycle
            </h3>
            <p className="text-sm text-gray-500">{cycle.lifecycle_id}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Badge */}
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColorClass(cycle.status)}`}
            >
              {cycle.status.replace('_', ' ')}
            </span>

            {showDetails && (
              <>
                {/* Premium Collected */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">Premium Collected</p>
                  <p className="text-sm font-medium text-green-600">
                    {formatCurrency(totalPremium)}
                  </p>
                </div>

                {/* Current P&L */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">Current P&L</p>
                  <div className="flex items-center gap-1">
                    {currentPnL >= 0 ? (
                      <TrendingUp size={14} className="text-green-600" />
                    ) : (
                      <TrendingDown size={14} className="text-red-600" />
                    )}
                    <p
                      className={`text-sm font-medium ${currentPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(Math.abs(currentPnL))}
                    </p>
                  </div>
                </div>

                {/* Annualized Return */}
                {cycle.annualized_return && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Annualized Return</p>
                    <p className="text-sm font-medium text-gray-900">
                      {(cycle.annualized_return * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {timelineEvents.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {timelineEvents.map(event => (
            <div key={event.id} className="relative flex items-start mb-6">
              {/* Timeline dot with icon */}
              <div
                className={`
                relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2
                ${
                  event.isPositive
                    ? 'bg-green-50 border-green-300'
                    : event.amount !== undefined
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-blue-50 border-blue-300'
                }
              `}
              >
                {getEventIcon(
                  event.type,
                  event.isPositive
                    ? 'text-green-600'
                    : event.amount !== undefined
                      ? 'text-yellow-600'
                      : 'text-blue-600'
                )}
              </div>

              {/* Event content */}
              <div className="ml-4 flex-1">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  {/* Event header */}
                  <div className="flex justify-between items-start mb-2">
                    <h4
                      className={`font-medium ${compact ? 'text-sm' : 'text-base'} text-gray-900`}
                    >
                      {event.title}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {format(new Date(event.date), compact ? 'MMM dd' : 'MMM dd, yyyy')}
                    </span>
                  </div>

                  {/* Event description */}
                  <p className={`text-gray-600 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
                    {event.description}
                  </p>

                  {/* Event details */}
                  {showDetails && (
                    <div className="flex flex-wrap gap-2">
                      {event.amount !== undefined && (
                        <span
                          className={`
                          px-2 py-1 rounded text-xs font-medium border
                          ${
                            event.isPositive
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }
                        `}
                        >
                          {formatCurrency(event.amount)}
                        </span>
                      )}

                      {event.strikePrice !== undefined && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                          Strike: ${event.strikePrice}
                        </span>
                      )}

                      {event.expiryDate && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                          Exp: {format(new Date(event.expiryDate), 'MMM dd')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
          <Clock size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No events recorded for this wheel cycle yet.</p>
        </div>
      )}
    </div>
  );
};
