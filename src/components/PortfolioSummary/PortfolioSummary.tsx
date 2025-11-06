/**
 * PortfolioSummary Component
 * Displays key portfolio metrics and performance indicators
 */

import clsx from 'clsx';

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

  const getChangeClass = (value: number): string | undefined => {
    if (value > 0) return styles.positive;
    if (value < 0) return styles.negative;
    return styles.neutral;
  };

  if (isLoading) {
    return (
      <div className={clsx(styles.container, className)}>
        <div className={clsx(styles.header)}>
          <h2 className={clsx(styles.title)}>Portfolio Summary</h2>
        </div>
        <div className={clsx(styles.loading)}>
          <div className={clsx(styles.skeleton)}></div>
          <div className={clsx(styles.skeleton)}></div>
          <div className={clsx(styles.skeleton)}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(styles.container, className)}>
      <div className={clsx(styles.header)}>
        <h2 className={clsx(styles.title)}>Portfolio Summary</h2>
        <div className={clsx(styles.lastUpdated)}>Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      <div className={clsx(styles.metricsGrid)}>
        {/* Total Portfolio Value */}
        <div className={clsx('card', styles.metricCard, styles.primary)}>
          <div className={clsx(styles.metricLabel)}>Total Portfolio Value</div>
          <div className={clsx(styles.metricValue)}>{formatCurrency(metrics.totalValue)}</div>
          <div className={clsx(styles.metricChange, getChangeClass(metrics.dayChange))}>
            {formatCurrency(metrics.dayChange)} ({formatPercent(metrics.dayChangePercent)}) today
          </div>
        </div>

        {/* Total P&L */}
        <div className={clsx('card', styles.metricCard)}>
          <div className={clsx(styles.metricLabel)}>Total P&L</div>
          <div className={clsx(styles.metricValue, getChangeClass(metrics.totalPnL))}>
            {formatCurrency(metrics.totalPnL)}
          </div>
          <div className={clsx(styles.metricSubtext, getChangeClass(metrics.totalPnL))}>
            {formatPercent(metrics.totalPnLPercent)} return
          </div>
        </div>

        {/* Active Positions */}
        <div className={clsx('card', styles.metricCard)}>
          <div className={clsx(styles.metricLabel)}>Active Positions</div>
          <div className={clsx(styles.metricValue)}>{metrics.activePositions}</div>
          <div className={clsx(styles.metricSubtext)}>positions open</div>
        </div>

        {/* Cash Available */}
        <div className={clsx('card', styles.metricCard)}>
          <div className={clsx(styles.metricLabel)}>Cash Available</div>
          <div className={clsx(styles.metricValue)}>{formatCurrency(metrics.cashAvailable)}</div>
          <div className={clsx(styles.metricSubtext)}>buying power</div>
        </div>
      </div>

      <div className={clsx(styles.quickActions)}>
        <button
          className={clsx('btn btn-primary', styles.actionButton)}
          onClick={handleViewDetails}
        >
          📊 View Details
        </button>
        <button
          className={clsx('btn btn-primary', styles.actionButton)}
          onClick={handleAddPosition}
        >
          📈 Add Position
        </button>
        <button
          className={clsx('btn btn-secondary', styles.actionButton)}
          onClick={handleExportReport}
        >
          📋 Export Report
        </button>
      </div>
    </div>
  );
}
