/**
 * Wheel Analytics Dashboard Component
 *
 * Comprehensive analytics visualization for wheel strategy performance
 */

import { useState, useMemo } from 'react';
import { TrendingUp, Target, BarChart3, Activity, Award, AlertTriangle } from 'lucide-react';
import { WheelAnalytics } from '@/modules/wheel/analytics';
import type { WheelCycle, WheelEvent_Record as WheelEventRecord } from '@/modules/db/validation';

interface WheelAnalyticsDashboardProps {
  cycles: WheelCycle[];
  events: WheelEventRecord[];
  currentPrices?: Map<string, number>;
}

export function WheelAnalyticsDashboard({
  cycles,
  events,
  currentPrices,
}: WheelAnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState<'all' | '1y' | '6m' | '3m'>('all');

  // Group events by lifecycle ID
  const eventsMap = useMemo(() => {
    const map = new Map<string, WheelEventRecord[]>();
    events.forEach(event => {
      const existing = map.get(event.lifecycle_id) || [];
      existing.push(event);
      map.set(event.lifecycle_id, existing);
    });
    return map;
  }, [events]);

  // Calculate portfolio analytics
  const portfolioAnalytics = useMemo(() => {
    return WheelAnalytics.calculatePortfolioAnalytics(cycles, eventsMap, currentPrices);
  }, [cycles, eventsMap, currentPrices]);

  // Calculate individual cycle analytics
  const cycleAnalytics = useMemo(() => {
    return cycles.map(cycle => {
      const cycleEvents = eventsMap.get(cycle.lifecycle_id) || [];
      const currentPrice = currentPrices?.get(cycle.underlying_symbol);
      return WheelAnalytics.calculateCycleAnalytics(cycle, cycleEvents, currentPrice);
    });
  }, [cycles, eventsMap, currentPrices]);

  // Filter cycles by timeframe
  const filteredAnalytics = useMemo(() => {
    if (timeframe === 'all') return cycleAnalytics;

    const cutoffDate = new Date();
    switch (timeframe) {
      case '1y':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
      case '6m':
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        break;
      case '3m':
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        break;
    }

    return cycleAnalytics.filter(cycle => {
      const cycleDate = new Date(
        cycles.find(c => c.lifecycle_id === cycle.lifecycleId)?.created_at || ''
      );
      return cycleDate >= cutoffDate;
    });
  }, [cycleAnalytics, cycles, timeframe]);

  // Performance comparison
  const performanceComparison = useMemo(() => {
    return WheelAnalytics.compareCycles(filteredAnalytics);
  }, [filteredAnalytics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (cycles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <BarChart3 className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Wheel Cycles Found</h3>
        <p className="text-gray-500">Import some wheel strategy trades to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Wheel Strategy Analytics</h2>
          <p className="text-gray-600">Comprehensive performance analysis and metrics</p>
        </div>

        <div className="flex gap-2">
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={timeframe}
            onChange={e => setTimeframe(e.target.value as typeof timeframe)}
          >
            <option value="all">All Time</option>
            <option value="1y">Last Year</option>
            <option value="6m">Last 6 Months</option>
            <option value="3m">Last 3 Months</option>
          </select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio ROO</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercent(portfolioAnalytics.overallROO)}
              </p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Return on Options</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio ROR</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercent(portfolioAnalytics.overallROR)}
              </p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Return on Risk</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Annualized Return</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercent(portfolioAnalytics.portfolioAnnualizedReturn)}
              </p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Time-adjusted returns</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercent(portfolioAnalytics.winRate)}
              </p>
            </div>
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Profitable cycles</p>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Premium Collected</span>
              <span className="font-medium text-green-600">
                {formatCurrency(portfolioAnalytics.totalPremiumCollected)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Realized P&L</span>
              <span
                className={`font-medium ${portfolioAnalytics.totalRealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(portfolioAnalytics.totalRealizedPnL)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Unrealized P&L</span>
              <span
                className={`font-medium ${portfolioAnalytics.totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(portfolioAnalytics.totalUnrealizedPnL)}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Net P&L</span>
                <span
                  className={`font-bold text-lg ${portfolioAnalytics.netPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(portfolioAnalytics.netPnL)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Max Drawdown</span>
              <span className="font-medium text-red-600">
                -{formatPercent(portfolioAnalytics.maxDrawdown)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sharpe Ratio</span>
              <span className="font-medium">{portfolioAnalytics.sharpeRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Volatility</span>
              <span className="font-medium">{formatPercent(portfolioAnalytics.volatility)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Profit Factor</span>
              <span className="font-medium">{portfolioAnalytics.profitFactor.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cycle Analysis */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cycle Analysis</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{portfolioAnalytics.totalCycles}</div>
            <div className="text-sm text-gray-600">Total Cycles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {portfolioAnalytics.activeCycles}
            </div>
            <div className="text-sm text-gray-600">Active Cycles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {portfolioAnalytics.completedCycles}
            </div>
            <div className="text-sm text-gray-600">Completed Cycles</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-lg font-semibold">
              {Math.round(portfolioAnalytics.averageCycleDuration)} days
            </div>
            <div className="text-sm text-gray-600">Average Duration</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{portfolioAnalytics.longestCycle} days</div>
            <div className="text-sm text-gray-600">Longest Cycle</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{portfolioAnalytics.shortestCycle} days</div>
            <div className="text-sm text-gray-600">Shortest Cycle</div>
          </div>
        </div>
      </div>

      {/* Top/Bottom Performers */}
      {performanceComparison.topPerformers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              Top Performers
            </h3>
            <div className="space-y-3">
              {performanceComparison.topPerformers.slice(0, 3).map(cycle => (
                <div
                  key={cycle.lifecycleId}
                  className="flex justify-between items-center p-3 bg-green-50 rounded"
                >
                  <div>
                    <div className="font-medium">{cycle.underlying}</div>
                    <div className="text-sm text-gray-600">{cycle.lifecycleId}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatPercent(cycle.annualizedReturn)}
                    </div>
                    <div className="text-sm text-gray-600">{cycle.totalDays} days</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Needs Attention
            </h3>
            <div className="space-y-3">
              {performanceComparison.underPerformers.slice(0, 3).map(cycle => (
                <div
                  key={cycle.lifecycleId}
                  className="flex justify-between items-center p-3 bg-red-50 rounded"
                >
                  <div>
                    <div className="font-medium">{cycle.underlying}</div>
                    <div className="text-sm text-gray-600">{cycle.lifecycleId}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">
                      {formatPercent(cycle.annualizedReturn)}
                    </div>
                    <div className="text-sm text-gray-600">{cycle.totalDays} days</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Cycle Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Cycle Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Annualized
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P&L
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAnalytics.slice(0, 10).map(cycle => {
                const totalPnL = cycle.realizedPnL + cycle.unrealizedPnL;
                return (
                  <tr key={cycle.lifecycleId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{cycle.underlying}</div>
                      <div className="text-sm text-gray-500">{cycle.lifecycleId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {formatPercent(cycle.cumulativeROO)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {formatPercent(cycle.cumulativeROR)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {formatPercent(cycle.annualizedReturn)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(totalPnL)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cycle.totalDays} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          cycle.status === 'CLOSED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {cycle.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
