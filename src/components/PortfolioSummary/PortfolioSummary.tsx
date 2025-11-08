/**
 * PortfolioSummary Component
 *
 * Purpose: Displays key portfolio metrics and performance indicators in a card-based layout.
 * This component provides a high-level overview of portfolio performance, including:
 * - Total portfolio value and daily changes
 * - Profit & Loss (P&L) metrics
 * - Active positions count
 * - Available cash/buying power
 *
 * Usage: Typically used on dashboard/home pages to give users a quick snapshot
 * of their portfolio status. Can be integrated with real portfolio data or
 * used with mock data for development/testing.
 */

import clsx from 'clsx';

import styles from './PortfolioSummary.module.css';

/**
 * PortfolioMetrics Interface
 *
 * Defines the structure of portfolio metric data that the component displays.
 * All values are required for a complete portfolio summary:
 *
 * - totalValue: Total current value of all portfolio positions (stocks + options + cash)
 * - dayChange: Dollar amount change for the current day (can be positive or negative)
 * - dayChangePercent: Percentage change for the current day
 * - totalPnL: Total profit or loss since portfolio inception
 * - totalPnLPercent: Percentage return on total investment
 * - activePositions: Number of currently open positions (options contracts, stocks, etc.)
 * - cashAvailable: Available cash/buying power for new positions
 */
interface PortfolioMetrics {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalPnL: number;
  totalPnLPercent: number;
  activePositions: number;
  cashAvailable: number;
}

/**
 * PortfolioSummaryProps Interface
 *
 * Component props for customizing behavior and appearance:
 *
 * - metrics: Optional portfolio metrics data. If not provided, uses mock data.
 * - isLoading: Boolean flag to show loading skeleton instead of content.
 * - className: Optional additional CSS classes for custom styling.
 * - onViewDetails: Callback when "View Details" button is clicked. Defaults to navigating to /portfolio.
 * - onAddPosition: Callback when "Add Position" button is clicked. Defaults to navigating to /analysis.
 * - onExportReport: Callback when "Export Report" button is clicked. Defaults to showing alert.
 */
interface PortfolioSummaryProps {
  metrics?: PortfolioMetrics;
  isLoading?: boolean;
  className?: string;
  onViewDetails?: () => void;
  onAddPosition?: () => void;
  onExportReport?: () => void;
}

/**
 * Mock Portfolio Metrics Data
 *
 * Default/fallback data used when no metrics prop is provided.
 * Useful for:
 * - Development and testing without real portfolio data
 * - UI/UX design and prototyping
 * - Demonstrating component functionality
 *
 * In production, this should be replaced with actual portfolio data
 * fetched from a backend API or state management store.
 */
const mockMetrics: PortfolioMetrics = {
  totalValue: 47650.0,
  dayChange: 325.5,
  dayChangePercent: 0.69,
  totalPnL: 2840.75,
  totalPnLPercent: 6.34,
  activePositions: 8,
  cashAvailable: 12450.0,
};

/**
 * PortfolioSummary Component
 *
 * Main component function that renders the portfolio summary card.
 *
 * @param metrics - Portfolio metrics data (defaults to mockMetrics if not provided)
 * @param isLoading - Shows loading skeleton when true
 * @param className - Additional CSS classes for custom styling
 * @param onViewDetails - Callback for "View Details" button click
 * @param onAddPosition - Callback for "Add Position" button click
 * @param onExportReport - Callback for "Export Report" button click
 *
 * @returns JSX element rendering portfolio summary card or loading skeleton
 */
export function PortfolioSummary({
  metrics = mockMetrics,
  isLoading = false,
  className = '',
  onViewDetails,
  onAddPosition,
  onExportReport,
}: PortfolioSummaryProps) {
  /**
   * Handle View Details Button Click
   *
   * Called when user clicks "View Details" button.
   * If a custom callback is provided via props, uses that.
   * Otherwise, defaults to navigating to /portfolio page.
   *
   * Usage: Allows parent components to customize navigation behavior,
   * or uses default browser navigation as fallback.
   */
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails();
    } else {
      console.log('Navigating to portfolio details...');
      window.location.href = '/portfolio';
    }
  };

  /**
   * Handle Add Position Button Click
   *
   * Called when user clicks "Add Position" button.
   * If a custom callback is provided via props, uses that.
   * Otherwise, defaults to navigating to /analysis page.
   *
   * Usage: Typically opens a dialog/modal to add a new position,
   * or navigates to a position entry page.
   */
  const handleAddPosition = () => {
    if (onAddPosition) {
      onAddPosition();
    } else {
      console.log('Opening add position dialog...');
      window.location.href = '/analysis';
    }
  };

  /**
   * Handle Export Report Button Click
   *
   * Called when user clicks "Export Report" button.
   * If a custom callback is provided via props, uses that.
   * Otherwise, shows an alert indicating the feature is coming soon.
   *
   * Usage: Should trigger CSV/PDF export of portfolio data.
   * In production, this would typically call an API endpoint
   * or generate a downloadable file.
   */
  const handleExportReport = () => {
    if (onExportReport) {
      onExportReport();
    } else {
      console.log('Exporting portfolio report...');
      alert('Export functionality coming soon!');
    }
  };

  /**
   * Format Currency Value
   *
   * Converts a number to a formatted currency string (USD).
   * Uses Intl.NumberFormat for proper localization and formatting.
   *
   * @param amount - The numeric amount to format
   * @returns Formatted currency string (e.g., "$47,650.00")
   *
   * Usage: Used to display monetary values throughout the component
   * (totalValue, dayChange, totalPnL, cashAvailable)
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  /**
   * Format Percentage Value
   *
   * Converts a number to a formatted percentage string with sign.
   * Always includes a '+' prefix for positive values, '-' for negative.
   *
   * @param percent - The percentage value to format (e.g., 0.69 for 0.69%)
   * @returns Formatted percentage string (e.g., "+0.69%", "-2.50%")
   *
   * Usage: Used to display percentage changes and returns
   * (dayChangePercent, totalPnLPercent)
   */
  const formatPercent = (percent: number): string => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  /**
   * Get Change Indicator CSS Class
   *
   * Determines which CSS class to apply based on whether a value is
   * positive (green), negative (red), or zero/neutral (gray).
   *
   * @param value - The numeric value to evaluate
   * @returns CSS class name for positive/negative/neutral styling
   *
   * Usage: Applied to metric change indicators to provide visual feedback
   * about gains (green), losses (red), or no change (gray).
   *
   * Example: Used on dayChange to show if portfolio is up or down today.
   */
  const getChangeClass = (value: number): string | undefined => {
    if (value > 0) return styles.positive;
    if (value < 0) return styles.negative;
    return styles.neutral;
  };

  /**
   * Loading State Rendering
   *
   * Renders a skeleton loader when isLoading prop is true.
   * Shows the component structure with animated placeholders instead of data.
   *
   * Usage: Displayed while portfolio data is being fetched from API or database.
   * Provides visual feedback that content is loading and prevents layout shift.
   *
   * @returns JSX skeleton loader with animated shimmer effect
   */
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

  /**
   * Main Component Rendering
   *
   * Renders the complete portfolio summary card with:
   * - Header with title and last updated timestamp
   * - Grid of metric cards showing key portfolio data
   * - Quick action buttons for common operations
   *
   * Structure:
   * 1. Container: Main card wrapper with border, padding, shadow
   * 2. Header: Title and timestamp section
   * 3. Metrics Grid: Responsive grid of 4 metric cards
   * 4. Quick Actions: Horizontal button bar for user actions
   *
   * @returns JSX portfolio summary card with all metrics and actions
   */
  return (
    <div className={clsx(styles.container, className)}>
      {/* Header Section: Title and Last Updated Timestamp */}
      <div className={clsx(styles.header)}>
        <h2 className={clsx(styles.title)}>Portfolio Summary</h2>
        {/* Displays current time as "Last updated" timestamp */}
        {/* In production, this should show actual data refresh time */}
        <div className={clsx(styles.lastUpdated)}>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Metrics Grid: Responsive grid layout for metric cards */}
      {/* Automatically adjusts columns based on screen size (min 250px per card) */}
      <div className={clsx(styles.metricsGrid)}>
        {/* 
          Total Portfolio Value Card (Primary/Highlighted)
          
          Purpose: Main metric showing total portfolio value.
          Styled with primary class to emphasize importance.
          
          Displays:
          - Total portfolio value (stocks + options + cash)
          - Today's dollar change and percentage change
          - Color-coded based on whether day change is positive/negative
        */}
        <div className={clsx('card', styles.metricCard, styles.primary)}>
          <div className={clsx(styles.metricLabel)}>Total Portfolio Value</div>
          <div className={clsx(styles.metricValue)}>{formatCurrency(metrics.totalValue)}</div>
          <div className={clsx(styles.metricChange, getChangeClass(metrics.dayChange))}>
            {formatCurrency(metrics.dayChange)} ({formatPercent(metrics.dayChangePercent)}) today
          </div>
        </div>

        {/* 
          Total Profit & Loss (P&L) Card
          
          Purpose: Shows overall portfolio performance since inception.
          
          Displays:
          - Total P&L in dollars (formatted as currency)
          - Total P&L as percentage return
          - Both value and percentage are color-coded (green for profit, red for loss)
          
          Usage: Helps users understand if their portfolio is profitable overall.
        */}
        <div className={clsx('card', styles.metricCard)}>
          <div className={clsx(styles.metricLabel)}>Total P&L</div>
          <div className={clsx(styles.metricValue, getChangeClass(metrics.totalPnL))}>
            {formatCurrency(metrics.totalPnL)}
          </div>
          <div className={clsx(styles.metricSubtext, getChangeClass(metrics.totalPnL))}>
            {formatPercent(metrics.totalPnLPercent)} return
          </div>
        </div>

        {/* 
          Active Positions Card
          
          Purpose: Shows count of currently open positions.
          
          Displays:
          - Number of active positions (options contracts, stock holdings, etc.)
          - Descriptive text "positions open"
          
          Usage: Quick reference for how many positions are currently managed.
          Useful for options traders tracking multiple contracts.
        */}
        <div className={clsx('card', styles.metricCard)}>
          <div className={clsx(styles.metricLabel)}>Active Positions</div>
          <div className={clsx(styles.metricValue)}>{metrics.activePositions}</div>
          <div className={clsx(styles.metricSubtext)}>positions open</div>
        </div>

        {/* 
          Cash Available Card
          
          Purpose: Shows available buying power for new positions.
          
          Displays:
          - Available cash amount (formatted as currency)
          - Descriptive text "buying power"
          
          Usage: Helps users know how much capital is available for new trades.
          Important for options trading where buying power is required for margin.
        */}
        <div className={clsx('card', styles.metricCard)}>
          <div className={clsx(styles.metricLabel)}>Cash Available</div>
          <div className={clsx(styles.metricValue)}>{formatCurrency(metrics.cashAvailable)}</div>
          <div className={clsx(styles.metricSubtext)}>buying power</div>
        </div>
      </div>

      {/* 
        Quick Actions Bar
        Horizontal row of action buttons for common operations.
        Responsive: Stacks vertically on mobile devices.
        
        Buttons:
        1. View Details - Navigate to detailed portfolio view
        2. Add Position - Open dialog/page to add new position
        3. Export Report - Generate/download portfolio report
      */}
      <div className={clsx(styles.quickActions)}>
        {/* 
          View Details Button (Primary)
          Navigates to full portfolio details page or triggers custom callback.
          Typically shows expanded view with all positions, history, etc.
        */}
        <button
          className={clsx('btn btn-primary', styles.actionButton)}
          onClick={handleViewDetails}
        >
          📊 View Details
        </button>
        {/* 
          Add Position Button (Primary)
          Opens dialog/modal or navigates to page for adding new positions.
          Typically shows form to enter new trade/position details.
        */}
        <button
          className={clsx('btn btn-primary', styles.actionButton)}
          onClick={handleAddPosition}
        >
          📈 Add Position
        </button>
        {/* 
          Export Report Button (Secondary)
          Triggers export of portfolio data (CSV, PDF, etc.).
          Typically generates downloadable file with portfolio summary.
        */}
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
