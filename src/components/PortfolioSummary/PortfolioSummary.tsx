/**
 * PortfolioSummary Component
 * Displays key portfolio metrics and performance indicators
 */

import styles from './PortfolioSummary.module.css';

interface PortfolioMetrics {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalPnL: number;
  totalPnLPercent: number;
  activePositions: number;
  cashAvailable: number;
}

interface PortfolioSummaryProps {
  metrics?: PortfolioMetrics;
  isLoading?: boolean;
  className?: string;
  onViewDetails?: () => void;
  onAddPosition?: () => void;
  onExportReport?: () => void;
}

// Mock data for demonstration
const mockMetrics: PortfolioMetrics = {
  totalValue: 47650.0,
  dayChange: 325.5,
  dayChangePercent: 0.69,
  totalPnL: 2840.75,
  totalPnLPercent: 6.34,
  activePositions: 8,
  cashAvailable: 12450.0,
};

export function PortfolioSummary({
  metrics = mockMetrics,
  isLoading = false,
  className = '',
  onViewDetails,
  onAddPosition,
  onExportReport,
}: PortfolioSummaryProps) {
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails();
    } else {
      console.log('Navigating to portfolio details...');
      window.location.href = '/portfolio';
    }
  };

  const handleAddPosition = () => {
    if (onAddPosition) {
      onAddPosition();
    } else {
      console.log('Opening add position dialog...');
      window.location.href = '/analysis';
    }
  };

  const handleExportReport = () => {
    if (onExportReport) {
      onExportReport();
    } else {
      console.log('Exporting portfolio report...');
      alert('Export functionality coming soon!');
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

  const getChangeClass = (value: number): string => {
    if (value > 0) return styles.positive;
    if (value < 0) return styles.negative;
    return styles.neutral;
  };

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Portfolio Summary</h2>
        </div>
        <div className={styles.loading}>
          <div className={styles.skeleton}></div>
          <div className={styles.skeleton}></div>
          <div className={styles.skeleton}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Portfolio Summary</h2>
        <div className={styles.lastUpdated}>Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      <div className={styles.metricsGrid}>
        {/* Total Portfolio Value */}
        <div className={`${styles.metricCard} ${styles.primary}`}>
          <div className={styles.metricLabel}>Total Portfolio Value</div>
          <div className={styles.metricValue}>{formatCurrency(metrics.totalValue)}</div>
          <div className={`${styles.metricChange} ${getChangeClass(metrics.dayChange)}`}>
            {formatCurrency(metrics.dayChange)} ({formatPercent(metrics.dayChangePercent)}) today
          </div>
        </div>

        {/* Total P&L */}
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total P&L</div>
          <div className={`${styles.metricValue} ${getChangeClass(metrics.totalPnL)}`}>
            {formatCurrency(metrics.totalPnL)}
          </div>
          <div className={`${styles.metricSubtext} ${getChangeClass(metrics.totalPnL)}`}>
            {formatPercent(metrics.totalPnLPercent)} return
          </div>
        </div>

        {/* Active Positions */}
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Positions</div>
          <div className={styles.metricValue}>{metrics.activePositions}</div>
          <div className={styles.metricSubtext}>positions open</div>
        </div>

        {/* Cash Available */}
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Cash Available</div>
          <div className={styles.metricValue}>{formatCurrency(metrics.cashAvailable)}</div>
          <div className={styles.metricSubtext}>buying power</div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <button className={styles.actionButton} onClick={handleViewDetails}>
          📊 View Details
        </button>
        <button className={styles.actionButton} onClick={handleAddPosition}>
          📈 Add Position
        </button>
        <button className={styles.actionButton} onClick={handleExportReport}>
          📋 Export Report
        </button>
      </div>
    </div>
  );
}
