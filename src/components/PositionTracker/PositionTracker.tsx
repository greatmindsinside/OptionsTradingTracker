/**
 * PositionTracker Component
 * Displays active options positions with live Greeks and P&L tracking
 */

import styles from './PositionTracker.module.css';

interface Position {
  id: string;
  symbol: string;
  strategy: 'Covered Call' | 'Cash-Secured Put' | 'Long Call' | 'Long Put';
  strike: number;
  expiration: string;
  quantity: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  delta: number;
  theta: number;
  daysToExpiration: number;
  status: 'ITM' | 'OTM' | 'ATM';
}

interface PositionTrackerProps {
  positions?: Position[];
  isLoading?: boolean;
  className?: string;
  onRefresh?: () => void;
  onViewAll?: () => void;
  onFilter?: () => void;
}

// Mock positions data for demonstration
const mockPositions: Position[] = [
  {
    id: '1',
    symbol: 'AAPL',
    strategy: 'Covered Call',
    strike: 185,
    expiration: '2025-01-17',
    quantity: -2,
    currentValue: 520.0,
    unrealizedPnL: 180.0,
    unrealizedPnLPercent: 52.94,
    delta: -0.35,
    theta: 8.5,
    daysToExpiration: 26,
    status: 'OTM',
  },
  {
    id: '2',
    symbol: 'TSLA',
    strategy: 'Cash-Secured Put',
    strike: 220,
    expiration: '2025-02-21',
    quantity: -1,
    currentValue: 890.0,
    unrealizedPnL: -125.0,
    unrealizedPnLPercent: -12.3,
    delta: 0.28,
    theta: -12.3,
    daysToExpiration: 61,
    status: 'ITM',
  },
  {
    id: '3',
    symbol: 'SPY',
    strategy: 'Long Call',
    strike: 480,
    expiration: '2025-01-31',
    quantity: 3,
    currentValue: 1350.0,
    unrealizedPnL: 405.0,
    unrealizedPnLPercent: 42.86,
    delta: 0.67,
    theta: -18.75,
    daysToExpiration: 40,
    status: 'ITM',
  },
];

export function PositionTracker({
  positions = mockPositions,
  isLoading = false,
  className = '',
  onRefresh,
  onViewAll,
  onFilter,
}: PositionTrackerProps) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      console.log('Refreshing positions...');
      // Default refresh behavior - could trigger a data refresh
      window.location.reload();
    }
  };

  const handleFilter = () => {
    if (onFilter) {
      onFilter();
    } else {
      console.log('Opening filter options...');
      // Default filter behavior - could open a filter modal
      alert('Filter functionality coming soon!');
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      console.log('Navigating to all positions...');
      // Default view all behavior - could navigate to positions page
      window.location.href = '/portfolio';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number): string => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'ITM':
        return styles.itm;
      case 'OTM':
        return styles.otm;
      case 'ATM':
        return styles.atm;
      default:
        return '';
    }
  };

  const getPnLClass = (value: number): string => {
    if (value > 0) return styles.positive;
    if (value < 0) return styles.negative;
    return styles.neutral;
  };

  const getStrategyIcon = (strategy: string): string => {
    switch (strategy) {
      case 'Covered Call':
        return '📈';
      case 'Cash-Secured Put':
        return '📉';
      case 'Long Call':
        return '🚀';
      case 'Long Put':
        return '📉';
      default:
        return '📊';
    }
  };

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Active Positions</h2>
        </div>
        <div className={styles.loading}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.skeleton}></div>
          ))}
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Active Positions</h2>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h3>No Active Positions</h3>
          <p>Start by analyzing strategies or importing trades.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Active Positions ({positions.length})</h2>
        <div className={styles.headerActions}>
          <button className={styles.filterButton} onClick={handleFilter}>
            Filter
          </button>
          <button className={styles.refreshButton} onClick={handleRefresh}>
            🔄
          </button>
        </div>
      </div>

      <div className={styles.positionsList}>
        {positions.map(position => (
          <div key={position.id} className={styles.positionCard}>
            <div className={styles.positionHeader}>
              <div className={styles.symbolSection}>
                <span className={styles.strategyIcon}>{getStrategyIcon(position.strategy)}</span>
                <div>
                  <div className={styles.symbol}>{position.symbol}</div>
                  <div className={styles.strategy}>{position.strategy}</div>
                </div>
              </div>
              <div className={`${styles.status} ${getStatusClass(position.status)}`}>
                {position.status}
              </div>
            </div>

            <div className={styles.positionDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Strike:</span>
                <span className={styles.detailValue}>${position.strike}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Expiration:</span>
                <span className={styles.detailValue}>{position.expiration}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Quantity:</span>
                <span className={styles.detailValue}>{position.quantity}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Current Value:</span>
                <span className={styles.detailValue}>{formatCurrency(position.currentValue)}</span>
              </div>
            </div>

            <div className={styles.pnlSection}>
              <div className={styles.pnlMain}>
                <span className={styles.pnlLabel}>Unrealized P&L:</span>
                <span className={`${styles.pnlValue} ${getPnLClass(position.unrealizedPnL)}`}>
                  {formatCurrency(position.unrealizedPnL)}(
                  {formatPercent(position.unrealizedPnLPercent)})
                </span>
              </div>
            </div>

            <div className={styles.greeksSection}>
              <div className={styles.greek}>
                <span className={styles.greekLabel}>Δ</span>
                <span className={styles.greekValue}>{position.delta.toFixed(2)}</span>
              </div>
              <div className={styles.greek}>
                <span className={styles.greekLabel}>Θ</span>
                <span className={styles.greekValue}>{position.theta.toFixed(2)}</span>
              </div>
              <div className={styles.greek}>
                <span className={styles.greekLabel}>DTE</span>
                <span className={styles.greekValue}>{position.daysToExpiration}d</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button className={styles.viewAllButton} onClick={handleViewAll}>
          View All Positions
        </button>
      </div>
    </div>
  );
}
