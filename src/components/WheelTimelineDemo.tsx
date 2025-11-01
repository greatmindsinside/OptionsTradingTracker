/**
 * Wheel Timeline Demo Component
 *
 * Demonstrates the LifecycleTimeline component with sample data
 */

import { LifecycleTimeline } from './LifecycleTimeline';
import { WheelState, WheelEvent } from '@/modules/wheel/lifecycle';
import type { WheelCycle, WheelEvent_Record as WheelEventRecord } from '@/modules/db/validation';

export function WheelTimelineDemo() {
  // Sample wheel cycle data
  const sampleCycle: WheelCycle = {
    id: 1,
    lifecycle_id: 'AAPL_2024-10-01_001',
    portfolio_id: 1,
    symbol_id: 1,
    underlying_symbol: 'AAPL',
    status: WheelState.CC_OPEN,
    total_net_credit: 850,
    cost_basis: 150.5,
    shares_owned: 100,
    csp_trade_ids: '["1", "2"]',
    cc_trade_ids: '["3"]',
    stock_trade_ids: '["4"]',
    total_premium_collected: 850,
    realized_pnl: undefined,
    unrealized_pnl: 425,
    days_active: 15,
    annualized_return: 0.24,
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2024-10-15T00:00:00Z',
  };

  // Sample events data
  const sampleEvents: WheelEventRecord[] = [
    {
      id: 1,
      lifecycle_id: 'AAPL_2024-10-01_001',
      event_type: WheelEvent.CSP_SOLD,
      event_date: '2024-10-01',
      trade_id: 1,
      description: 'Sold 1 AAPL $150 put for $3.50 premium',
      amount: 350,
      strike_price: 150,
      expiry_date: '2024-10-18',
      created_at: '2024-10-01T00:00:00Z',
    },
    {
      id: 2,
      lifecycle_id: 'AAPL_2024-10-01_001',
      event_type: WheelEvent.CSP_ASSIGNED,
      event_date: '2024-10-05',
      trade_id: 4,
      description: 'Assigned 100 shares of AAPL at $150.00',
      amount: -15000,
      strike_price: 150,
      expiry_date: undefined,
      created_at: '2024-10-05T00:00:00Z',
    },
    {
      id: 3,
      lifecycle_id: 'AAPL_2024-10-01_001',
      event_type: WheelEvent.CC_SOLD,
      event_date: '2024-10-08',
      trade_id: 3,
      description: 'Sold 1 AAPL $155 call for $5.00 premium',
      amount: 500,
      strike_price: 155,
      expiry_date: '2024-11-15',
      created_at: '2024-10-08T00:00:00Z',
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Wheel Strategy Timeline Demo</h2>
        <p className="text-gray-600">
          Example of a wheel strategy cycle showing the progression from cash-secured put to
          assignment to covered call.
        </p>
      </div>

      {/* Full Timeline */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Full Timeline View</h3>
        <LifecycleTimeline
          cycle={sampleCycle}
          events={sampleEvents}
          showDetails={true}
          compact={false}
        />
      </div>

      {/* Compact Timeline */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compact Timeline View</h3>
        <LifecycleTimeline
          cycle={sampleCycle}
          events={sampleEvents}
          showDetails={true}
          compact={true}
        />
      </div>

      {/* Minimal Timeline */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Minimal Timeline View</h3>
        <LifecycleTimeline
          cycle={sampleCycle}
          events={sampleEvents}
          showDetails={false}
          compact={true}
        />
      </div>
    </div>
  );
}
