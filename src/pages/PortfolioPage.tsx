/**
 * Portfolio Page Component
 *
 * Displays comprehensive portfolio overview including:
 * - Portfolio summary metrics
 * - Active positions
 * - Recent trades
 * - Performance charts
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, Activity, DollarSign, Target, PieChart } from 'lucide-react';
// import PortfolioChart from '@/components/PortfolioChart';
import styles from './PortfolioPage.module.css';

// Utility function for formatting currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Utility function for formatting percentage
const formatPercent = (percent: number): string => {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
};

interface PortfolioData {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  activePositions: number;
  totalTrades: number;
  cashAvailable: number;
}

interface Position {
  id: number;
  symbol: string;
  instrument_type: string;
  quantity: number;
  average_cost: number;
  current_value: number;
  unrealized_pnl: number;
  option_type?: string;
  strike_price?: number;
  expiration_date?: string;
  status: string;
}

interface RecentTrade {
  id: number;
  symbol: string;
  action: string;
  instrument_type: string;
  quantity: number;
  price: number;
  trade_date: string;
  option_type?: string;
  strike_price?: number;
  expiration_date?: string;
}

export function PortfolioPage() {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'trades' | 'charts'>('positions');

  const loadPortfolioData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading portfolio data...');

      // Initialize database
      const { initDatabase } = await import('../modules/db/sqlite');
      const db = await initDatabase();
      console.log('💾 Database initialized');

      const { PortfolioDAO, TradeDAO } = await import('../modules/db/dao-index');
      const portfolioDAO = new PortfolioDAO(db);
      const tradeDAO = new TradeDAO(db);

      // Debug: Check raw database contents
      console.log('🔍 Checking raw database contents...');
      const rawPortfoliosResult = await portfolioDAO.findAll();
      console.log('📊 Raw portfolios result:', rawPortfoliosResult);

      const rawTradesResult = await tradeDAO.findAll();
      console.log('📈 Raw trades result:', rawTradesResult);

      // Get all portfolios with trade counts
      const portfoliosWithCountsResult = await portfolioDAO.findAllWithTradeCounts();
      console.log('📁 Found portfolios with counts:', portfoliosWithCountsResult);
      console.log('📁 Portfolio count:', portfoliosWithCountsResult?.length || 0);

      if (!portfoliosWithCountsResult || portfoliosWithCountsResult.length === 0) {
        console.log('⚠️ No portfolios found in database');
        setError('No portfolios found. Please import some data first.');
        setPortfolioData(null);
        return;
      }

      // Use the first portfolio for now
      const portfolio = portfoliosWithCountsResult[0];
      console.log('📊 Using portfolio:', portfolio);

      if (!portfolio.id) {
        setError('Portfolio ID is missing');
        return;
      }

      // Get all trades for this portfolio with symbol information
      const tradesQuery = `
        SELECT 
          t.*,
          s.symbol
        FROM trades t
        JOIN symbols s ON t.symbol_id = s.id
        WHERE t.portfolio_id = ?
        ORDER BY t.trade_date DESC
      `;

      const tradesResult = await db.query(tradesQuery, [portfolio.id]);
      console.log('📈 Found trades:', tradesResult.length);

      // Get recent trades with symbol information
      const recentTradesQuery = `
        SELECT 
          t.id,
          s.symbol,
          t.action,
          t.instrument_type,
          t.quantity,
          t.price,
          t.trade_date,
          t.option_type,
          t.strike_price,
          t.expiration_date
        FROM trades t
        JOIN symbols s ON t.symbol_id = s.id
        WHERE t.portfolio_id = ?
        ORDER BY t.trade_date DESC, t.created_at DESC
        LIMIT 20
      `;

      const recentTradesResult = await db.query(recentTradesQuery, [portfolio.id]);
      const recentTradesData = recentTradesResult.map((trade: Record<string, unknown>) => ({
        id: Number(trade.id),
        symbol: String(trade.symbol),
        action: String(trade.action),
        instrument_type: String(trade.instrument_type),
        quantity: Number(trade.quantity),
        price: Number(trade.price),
        trade_date: String(trade.trade_date),
        option_type: trade.option_type ? String(trade.option_type) : undefined,
        strike_price: trade.strike_price ? Number(trade.strike_price) : undefined,
        expiration_date: trade.expiration_date ? String(trade.expiration_date) : undefined,
      }));

      // Calculate positions from trades
      const positionsMap = new Map<string, Position>();

      tradesResult.forEach((trade: Record<string, unknown>) => {
        const positionKey = `${trade.symbol}-${trade.instrument_type}-${trade.option_type || ''}-${trade.strike_price || ''}-${trade.expiration_date || ''}`;

        if (!positionsMap.has(positionKey)) {
          positionsMap.set(positionKey, {
            id: Number(trade.id) || 0,
            symbol: String(trade.symbol),
            instrument_type: String(trade.instrument_type),
            quantity: 0,
            average_cost: 0,
            current_value: 0,
            unrealized_pnl: 0,
            option_type: trade.option_type ? String(trade.option_type) : undefined,
            strike_price: trade.strike_price ? Number(trade.strike_price) : undefined,
            expiration_date: trade.expiration_date ? String(trade.expiration_date) : undefined,
            status: 'open',
          });
        }

        const position = positionsMap.get(positionKey)!;
        const quantity =
          trade.action === 'SELL_TO_OPEN' || trade.action === 'SELL_TO_CLOSE'
            ? -Number(trade.quantity)
            : Number(trade.quantity);

        // Update position quantity and average cost
        const prevQuantity = position.quantity;
        const prevAvgCost = position.average_cost;

        position.quantity += quantity;

        if (position.quantity !== 0) {
          // Calculate new average cost
          const totalCost = prevQuantity * prevAvgCost + quantity * Number(trade.price);
          position.average_cost = totalCost / position.quantity;
        }

        // For now, assume current value equals cost (no real-time pricing)
        position.current_value = position.quantity * position.average_cost;
        position.unrealized_pnl =
          position.current_value - position.quantity * position.average_cost;
      });

      // Filter out closed positions (quantity = 0)
      const openPositions = Array.from(positionsMap.values()).filter(pos => pos.quantity !== 0);

      // Calculate portfolio metrics
      const totalValue = openPositions.reduce((sum, pos) => sum + pos.current_value, 0);
      const totalCost = openPositions.reduce(
        (sum, pos) => sum + pos.quantity * pos.average_cost,
        0
      );
      const totalPnL = totalValue - totalCost;
      const totalPnLPercent = totalCost !== 0 ? (totalPnL / totalCost) * 100 : 0;

      const metrics: PortfolioData = {
        totalValue,
        totalPnL,
        totalPnLPercent,
        dayChange: 0, // Would need daily price data
        dayChangePercent: 0,
        activePositions: openPositions.length,
        totalTrades: tradesResult.length,
        cashAvailable: 50000, // Placeholder - would calculate from cash transactions
      };

      console.log('📊 Portfolio metrics:', metrics);
      console.log('📈 Positions:', openPositions);
      console.log('🔄 Recent trades:', recentTradesData);

      setPortfolioData(metrics);
      setPositions(openPositions);
      setRecentTrades(recentTradesData);
    } catch (err) {
      console.error('❌ Error loading portfolio data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load portfolio data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    loadPortfolioData();
  }, [loadPortfolioData]);

  useEffect(() => {
    loadPortfolioData();
  }, [loadPortfolioData]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Portfolio Overview</h1>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Portfolio Overview</h1>
        </div>
        <div className={styles.errorState}>
          <div className={styles.errorMessage}>
            <span>❌ {error}</span>
          </div>
          <button onClick={handleRetry} className={styles.retryButton}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Portfolio Overview</h1>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyMessage}>
            <span>📊 No portfolio data available</span>
          </div>
          <button onClick={handleRetry} className={styles.retryButton}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Portfolio Overview</h1>
        <button onClick={handleRetry} className={styles.refreshButton} disabled={loading}>
          <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      {/* Portfolio Metrics */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <DollarSign className={styles.metricIcon} />
            <span className={styles.metricLabel}>Total Value</span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(portfolioData.totalValue)}</div>
          <div className={styles.metricChange}>
            {formatCurrency(portfolioData.dayChange)} (
            {formatPercent(portfolioData.dayChangePercent)})
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <TrendingUp className={styles.metricIcon} />
            <span className={styles.metricLabel}>Total P&L</span>
          </div>
          <div
            className={`${styles.metricValue} ${portfolioData.totalPnL >= 0 ? styles.positive : styles.negative}`}
          >
            {formatCurrency(portfolioData.totalPnL)}
          </div>
          <div
            className={`${styles.metricChange} ${portfolioData.totalPnLPercent >= 0 ? styles.positive : styles.negative}`}
          >
            {formatPercent(portfolioData.totalPnLPercent)}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <Target className={styles.metricIcon} />
            <span className={styles.metricLabel}>Active Positions</span>
          </div>
          <div className={styles.metricValue}>{portfolioData.activePositions}</div>
          <div className={styles.metricChange}>{portfolioData.totalTrades} total trades</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <DollarSign className={styles.metricIcon} />
            <span className={styles.metricLabel}>Cash Available</span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(portfolioData.cashAvailable)}</div>
          <div className={styles.metricChange}>Available for trading</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabContainer}>
        <div className={styles.tabNavigation}>
          <button
            className={`${styles.tab} ${activeTab === 'positions' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('positions')}
          >
            <Target size={16} />
            Positions ({positions.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'trades' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('trades')}
          >
            <Activity size={16} />
            Recent Trades ({recentTrades.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'charts' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('charts')}
          >
            <PieChart size={16} />
            Charts
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'positions' && (
            <div className={styles.positionsTab}>
              {positions.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No active positions found</p>
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Avg Cost</th>
                        <th>Current Value</th>
                        <th>P&L</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position, index) => (
                        <tr key={index}>
                          <td className={styles.symbol}>{position.symbol}</td>
                          <td>{position.instrument_type}</td>
                          <td>{position.quantity}</td>
                          <td>{formatCurrency(position.average_cost)}</td>
                          <td>{formatCurrency(position.current_value)}</td>
                          <td
                            className={
                              position.unrealized_pnl >= 0 ? styles.positive : styles.negative
                            }
                          >
                            {formatCurrency(position.unrealized_pnl)}
                          </td>
                          <td>
                            {position.option_type && (
                              <span>
                                {position.option_type} ${position.strike_price}{' '}
                                {position.expiration_date}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trades' && (
            <div className={styles.tradesTab}>
              {recentTrades.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No recent trades found</p>
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Symbol</th>
                        <th>Action</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTrades.map((trade, index) => (
                        <tr key={index}>
                          <td>{new Date(trade.trade_date).toLocaleDateString()}</td>
                          <td className={styles.symbol}>{trade.symbol}</td>
                          <td>
                            <span
                              className={`${styles.action} ${styles[trade.action.replace('_', '')]}`}
                            >
                              {trade.action.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>{trade.instrument_type}</td>
                          <td>{trade.quantity}</td>
                          <td>{formatCurrency(trade.price)}</td>
                          <td>
                            {trade.option_type && (
                              <span>
                                {trade.option_type} ${trade.strike_price} {trade.expiration_date}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'charts' && (
            <div className={styles.chartsTab}>
              <div className={styles.chartGrid}>
                <div className={styles.chartSection}>
                  <h3>Portfolio Performance</h3>
                  <div className={styles.placeholder}>
                    <p>Portfolio performance chart coming soon...</p>
                  </div>
                </div>
                <div className={styles.chartSection}>
                  <h3>Asset Allocation</h3>
                  <div className={styles.placeholder}>
                    <p>Asset allocation chart coming soon...</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
