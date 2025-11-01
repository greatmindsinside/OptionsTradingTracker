import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useWheelDatabase } from '../hooks/useWheelDatabase';
import { useDataUpdates } from '../utils/data-events';

/**
 * WHEEL TRACKER PAGE
 *
 * This page provides a comprehensive dashboard for tracking options wheel strategies.
 * The wheel strategy involves selling cash-secured puts until assigned, then selling
 * covered calls on the assigned shares.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Trade side: Buy or Sell */
type Side = 'B' | 'S';

/** Option type: Call or Put */
type OptType = 'C' | 'P';

/**
 * Wheel strategy phases that a position can be in.
 * These represent the different stages of the wheel cycle.
 */
type WheelPhase =
  | 'Sell Cash Secured Puts' // Initial phase: selling puts to potentially acquire shares
  | 'Put Expires Worthless' // Put expired OTM, keep premium, restart
  | 'Buy At Strike' // Put assigned, shares acquired at strike price
  | 'Sell Covered Calls' // Shares owned, selling calls against them
  | 'Call Expires Worthless' // Call expired OTM, keep premium and shares
  | 'Call Exercised Sell Shares' // Call assigned, shares sold at strike price
  | 'Repeat'; // Cycle complete, ready to restart

/**
 * Represents an open options position (call or put).
 * Contains all relevant data for tracking and decision-making.
 */
type PositionRow = {
  id: string; // Unique position identifier
  ticker: string; // Stock symbol
  qty: number; // Number of contracts
  strike: number; // Strike price
  entry: number; // Entry price (premium received/paid)
  mark: number; // Current market price
  dte: number; // Days to expiration
  type: OptType; // Call or Put
  side: Side; // Buy or Sell
  m: number; // Moneyness percentage (ITM/OTM)
  linkedLotId?: string; // ID of share lot this option covers (for covered calls)
  opened: string; // Date position was opened
};

/**
 * Represents a lot of shares owned.
 * Used for tracking shares acquired through put assignment.
 */
type ShareLot = {
  id: string; // Unique lot identifier
  ticker: string; // Stock symbol
  qty: number; // Number of shares
  costPerShare: number; // Average cost basis per share
  opened: string; // Date shares were acquired
};

/**
 * Represents a news article relevant to tracked tickers.
 * Used to keep traders informed of market-moving events.
 */
type NewsItem = {
  id: string; // Unique news item identifier
  ticker: string; // Related stock symbol
  headline: string; // Article headline
  summary: string; // Brief summary
  timestamp: string; // When the news was published
  source: string; // News source
  sentiment: 'bullish' | 'bearish' | 'neutral'; // Market sentiment
  category: 'earnings' | 'analyst' | 'news' | 'technical'; // News category
};

// ============================================================================
// MOCK DATA (Fallback when database is not available)
// ============================================================================

/** Sample share lots for demonstration */
const shareLots: ShareLot[] = [
  { id: 'lot1', ticker: 'ASTS', qty: 100, costPerShare: 80, opened: '2025-10-24' },
  { id: 'lot2', ticker: 'OPEN', qty: 120, costPerShare: 8.69, opened: '2025-10-18' },
];

/** Sample open positions for demonstration */
const positions: PositionRow[] = [
  {
    id: 'p1',
    ticker: 'ASTS',
    qty: 1,
    strike: 85,
    entry: 2.1,
    mark: 1.0,
    dte: 3,
    type: 'C',
    side: 'S',
    m: -6.2,
    linkedLotId: 'lot1',
    opened: '2025-10-27',
  },
  {
    id: 'p2',
    ticker: 'ASTS',
    qty: 1,
    strike: 80,
    entry: 3.3,
    mark: 0.1,
    dte: 0,
    type: 'P',
    side: 'S',
    m: 8.5,
    opened: '2025-10-17',
  },
  {
    id: 'p3',
    ticker: 'OPEN',
    qty: 2,
    strike: 9,
    entry: 0.24,
    mark: 0.09,
    dte: 4,
    type: 'C',
    side: 'S',
    m: 3.1,
    linkedLotId: 'lot2',
    opened: '2025-10-26',
  },
  {
    id: 'p4',
    ticker: 'LUMN',
    qty: 5,
    strike: 1.5,
    entry: 0.05,
    mark: 0.03,
    dte: 11,
    type: 'P',
    side: 'S',
    m: 22.2,
    opened: '2025-10-25',
  },
];

/** Sample earnings calendar for risk management */
const earningsCalendar: Record<string, string> = {
  ASTS: '2025-11-06',
  OPEN: '2025-11-08',
  LUMN: '2025-11-05',
};

/** Sample news items for tracked tickers */
const newsItems: NewsItem[] = [
  {
    id: '1',
    ticker: 'ASTS',
    headline: 'AST SpaceMobile Reports Progress on Commercial Satellite Network',
    summary:
      'Company announces successful testing of direct-to-device connectivity, potentially boosting revenue projections for next quarter.',
    timestamp: '2025-10-30T14:30:00Z',
    source: 'SpaceNews',
    sentiment: 'bullish',
    category: 'news',
  },
  {
    id: '2',
    ticker: 'ASTS',
    headline: 'Analyst Upgrade: Price Target Raised to $95',
    summary:
      'Wells Fargo raises price target citing strong partnerships and regulatory approval progress for satellite constellation.',
    timestamp: '2025-10-30T11:15:00Z',
    source: 'Wells Fargo',
    sentiment: 'bullish',
    category: 'analyst',
  },
  {
    id: '3',
    ticker: 'OPEN',
    headline: 'Opendoor Q3 Earnings Preview: Market Share Focus',
    summary:
      'Analysts expect focus on market share gains and margin improvement in challenging real estate environment.',
    timestamp: '2025-10-30T09:45:00Z',
    source: 'MarketWatch',
    sentiment: 'neutral',
    category: 'earnings',
  },
  {
    id: '4',
    ticker: 'LUMN',
    headline: 'Lumen Technologies Faces Debt Refinancing Pressure',
    summary:
      "Credit rating agencies monitoring company's ability to refinance upcoming debt maturities amid competitive pressure.",
    timestamp: '2025-10-29T16:20:00Z',
    source: 'Reuters',
    sentiment: 'bearish',
    category: 'news',
  },
  {
    id: '5',
    ticker: 'ASTS',
    headline: 'Options Flow: Unusual Call Activity Detected',
    summary:
      'Large block of December calls purchased, suggesting institutional positioning ahead of earnings announcement.',
    timestamp: '2025-10-29T13:30:00Z',
    source: 'Options Insider',
    sentiment: 'bullish',
    category: 'technical',
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculates what percentage of maximum profit has been captured for a short call.
 * Used to determine if it's time to close or roll the position (typically at 50-80%).
 *
 * @param entry - Premium received when selling the call
 * @param mark - Current market price of the call
 * @returns Percentage of max profit captured (0-100)
 */
function pctOfMaxProfitShortCall(entry: number, mark: number): number {
  const max = entry;
  const taken = Math.max(0, entry - mark);
  return Math.min(100, +((taken / max) * 100).toFixed(1));
}

/**
 * Calculates return on collateral for cash-secured puts.
 * This shows the premium received as a percentage of the capital at risk.
 *
 * @param credit - Premium received per share
 * @param strike - Strike price of the put (collateral per share)
 * @returns ROC as a percentage
 */
function returnOnCollateral(credit: number, strike: number): number {
  return +(((credit * 100) / (strike * 100)) * 100).toFixed(2);
}

/**
 * Formats a number with specified decimal places and locale-aware separators.
 *
 * @param n - Number to format
 * @param d - Number of decimal places (default: 2)
 * @returns Formatted string
 */
function format(n: number, d = 2) {
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

/**
 * Calculates the average of an array of numbers.
 * Returns 0 for empty arrays.
 */
function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/**
 * Adds a specified number of days to a date string.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param days - Number of days to add
 * @returns New date string in YYYY-MM-DD format
 */
function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ============================================================================
// STYLES
// ============================================================================

/**
 * Inline styles object for all components.
 * Uses a dark theme with glassmorphism effects and gradient accents.
 */
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #0f172a, #000000)',
    color: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    borderBottom: '1px solid #1e293b',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(8px)',
  },
  headerContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(to right, #6ee7b7, #a7f3d0, #6ee7b7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(0 0 16px rgba(16, 185, 129, 0.45))',
  },
  input: {
    width: '320px',
    padding: '8px 12px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  button: {
    padding: '8px 12px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '24px 16px',
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  card: {
    borderRadius: '16px',
    border: '1px solid #1e293b',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: '16px',
    backdropFilter: 'blur(4px)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '12px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  metricCard: {
    borderRadius: '16px',
    border: '1px solid #1e293b',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: '16px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: '600',
    marginTop: '4px',
  },
  metricSub: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },
  tableHeader: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#cbd5e1',
  },
  tableCell: {
    padding: '8px 12px',
    borderBottom: '1px solid #1e293b',
    color: '#e2e8f0',
  },
  progressRing: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'conic-gradient(#3b82f6 0% 25%, rgba(100, 116, 139, 0.25) 25% 100%)',
    fontSize: '12px',
    fontWeight: '600',
  },
  progressRingInner: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '12px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#93c5fd',
    border: '1px solid rgba(59, 130, 246, 0.4)',
  },
  alert: {
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    backgroundColor: '#0f172a',
    marginBottom: '12px',
  },
  alertText: {
    fontSize: '14px',
    color: '#e2e8f0',
    marginBottom: '8px',
  },
  alertActions: {
    display: 'flex',
    gap: '8px',
  },
  alertButton: {
    padding: '4px 8px',
    fontSize: '12px',
    border: '1px solid #475569',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  newsItem: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #1e293b',
    backgroundColor: '#0f172a',
    marginBottom: '12px',
  },
  newsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  newsHeadline: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  newsSummary: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.4',
    marginBottom: '8px',
  },
  newsFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#94a3b8',
  },
  sentimentBull: {
    color: '#10b981',
    fontWeight: '600',
  },
  sentimentBear: {
    color: '#ef4444',
    fontWeight: '600',
  },
  sentimentNeutral: {
    color: '#6b7280',
    fontWeight: '600',
  },
  tickerTag: {
    padding: '2px 6px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
  },
  categoryTag: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '500',
  },
};

// ============================================================================
// NEWS HELPER FUNCTIONS
// ============================================================================

/**
 * Converts a timestamp to a human-readable "time ago" format.
 * Examples: "2h ago", "3d ago", "Just now"
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const newsDate = new Date(timestamp);
  const diffMs = now.getTime() - newsDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffHours > 24) {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Returns the appropriate color style for news sentiment.
 * Bullish = green, Bearish = red, Neutral = gray
 */
function getSentimentStyle(sentiment: string) {
  switch (sentiment) {
    case 'bullish':
      return styles.sentimentBull;
    case 'bearish':
      return styles.sentimentBear;
    default:
      return styles.sentimentNeutral;
  }
}

/**
 * Returns color styling for different news categories.
 * Each category gets a unique color theme for easy visual identification.
 */
function getCategoryColor(category: string) {
  switch (category) {
    case 'earnings':
      return { backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' };
    case 'analyst':
      return { backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' };
    case 'technical':
      return { backgroundColor: 'rgba(249, 115, 22, 0.2)', color: '#fb923c' };
    default:
      return { backgroundColor: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' };
  }
}

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

/**
 * MetricCard Component
 *
 * Displays a single metric with a label, large value, and optional subtitle.
 * Used in the summary grid to show key statistics at a glance.
 *
 * @param label - Description of the metric
 * @param value - Main value to display (formatted string)
 * @param sub - Optional subtitle/additional info
 */
const MetricCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  testIdValue?: string;
  testIdSub?: string;
}> = ({ label, value, sub, testIdValue, testIdSub }) => (
  <div style={styles.metricCard}>
    <div style={styles.metricLabel}>{label}</div>
    <div style={styles.metricValue} data-testid={testIdValue}>
      {value}
    </div>
    {sub && (
      <div style={styles.metricSub} data-testid={testIdSub}>
        {sub}
      </div>
    )}
  </div>
);

/**
 * ProgressRing Component
 *
 * Circular progress indicator showing a percentage as a filled ring.
 * Used to visualize DTE (days to expiration) and profit capture progress.
 *
 * @param percent - Percentage to display (0-100)
 */
const ProgressRing: React.FC<{ percent: number }> = ({ percent }) => {
  const ringStyle = {
    ...styles.progressRing,
    background: `conic-gradient(#3b82f6 0% ${percent}%, rgba(100, 116, 139, 0.25) ${percent}% 100%)`,
  };

  return (
    <div style={ringStyle}>
      <div style={styles.progressRingInner}>{percent}%</div>
    </div>
  );
};

/**
 * PhaseCard Component
 *
 * Displays the current wheel strategy phase for a specific ticker.
 * Shows a progress ring based on average DTE, the current phase badge,
 * and key dates like earnings. Includes a "Suggest Roll" button for action items.
 *
 * @param ticker - Stock symbol
 * @param phase - Current wheel phase for this ticker
 */
const PhaseCard: React.FC<{ ticker: string; phase: WheelPhase }> = ({ ticker, phase }) => {
  const dteAvg = Math.max(
    0,
    Math.round(avg(positions.filter(p => p.ticker === ticker).map(p => p.dte)))
  );
  const ring = Math.max(0, Math.min(100, Math.round(100 - dteAvg * 5)));

  return (
    <div
      style={{
        ...styles.card,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '12px',
      }}
    >
      <ProgressRing percent={ring} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>{ticker}</div>
        <div style={styles.badge}>{phase}</div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
          Avg DTE {dteAvg} • Earnings {earningsCalendar[ticker] || 'TBD'}
        </div>
      </div>
      <button
        style={{
          ...styles.button,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
        }}
      >
        Suggest Roll
      </button>
    </div>
  );
};

/**
 * Table Component
 *
 * Generic table component for displaying tabular data with alternating row colors.
 * Supports any type of cell content including text, numbers, and React components.
 *
 * @param columns - Array of column header labels
 * @param rows - 2D array of cell content (rows × columns)
 */
const Table: React.FC<{ columns: string[]; rows: (string | number | React.ReactNode)[][] }> = ({
  columns,
  rows,
}) => (
  <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #1e293b' }}>
    <table style={styles.table}>
      <thead style={styles.tableHeader}>
        <tr>
          {columns.map((col, i) => (
            <th key={i} style={{ ...styles.tableCell, fontWeight: '500' }}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ backgroundColor: i % 2 ? '#0f172a' : 'rgba(15, 23, 42, 0.4)' }}>
            {row.map((cell, j) => (
              <td key={j} style={styles.tableCell}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * RowAction Component
 *
 * An interactive button for table rows that changes state when clicked.
 * Used for action items like "Plan Roll", "Close At Target", etc.
 * Changes to "Queued" when clicked to indicate the action has been noted.
 *
 * @param text - Initial button text/action label
 */
const RowAction: React.FC<{ text: string }> = ({ text }) => {
  const [state, setState] = useState(text);
  return (
    <button onClick={() => setState('Queued')} style={styles.alertButton}>
      {state}
    </button>
  );
};

/**
 * NewsCard Component
 *
 * Displays recent news articles filtered by the tickers in the user's portfolio.
 * Shows sentiment, category, source, and time ago for each news item.
 * Supports expanding to show all news beyond the initial 3 items.
 *
 * @param tickers - Array of stock symbols to filter news for
 */
const NewsCard: React.FC<{ tickers: string[] }> = ({ tickers }) => {
  // Filter news items for relevant tickers
  const relevantNews = newsItems.filter(item => tickers.includes(item.ticker));
  const [expanded, setExpanded] = useState(false);
  const displayedNews = expanded ? relevantNews : relevantNews.slice(0, 3);

  if (relevantNews.length === 0) {
    return (
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Market News</h3>
        <div style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
          No recent news for your wheel positions
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3 style={styles.cardTitle}>Market News</h3>
        {relevantNews.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              ...styles.alertButton,
              fontSize: '11px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: '#3b82f6',
            }}
          >
            {expanded ? 'Show Less' : `Show All (${relevantNews.length})`}
          </button>
        )}
      </div>

      {displayedNews.map(item => (
        <div key={item.id} style={styles.newsItem}>
          <div style={styles.newsHeader}>
            <div style={styles.tickerTag}>{item.ticker}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ ...styles.categoryTag, ...getCategoryColor(item.category) }}>
                {item.category}
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {formatTimeAgo(item.timestamp)}
              </span>
            </div>
          </div>

          <div style={styles.newsHeadline}>{item.headline}</div>
          <div style={styles.newsSummary}>{item.summary}</div>

          <div style={styles.newsFooter}>
            <span style={getSentimentStyle(item.sentiment)}>{item.sentiment.toUpperCase()}</span>
            <span>{item.source}</span>
          </div>
        </div>
      ))}

      {expanded && relevantNews.length > 3 && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '12px',
            padding: '8px',
            fontSize: '11px',
            color: '#64748b',
            borderTop: '1px solid #1e293b',
          }}
        >
          Showing all {relevantNews.length} news items for your wheel positions
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * WheelTrackerMock Component
 *
 * Main page component for the Options Wheel Strategy tracker.
 *
 * Features:
 * - Dashboard overview with key metrics (premium, capital deployed, shares)
 * - Phase tracking for each ticker in the wheel strategy
 * - Open positions tables for puts and calls with actionable insights
 * - Share lot tracking with coverage percentages
 * - Alert system for time-sensitive decisions (expiration, earnings, profit targets)
 * - Market news feed filtered to portfolio tickers
 * - Database snapshot and table preview for debugging/verification
 * - Profit target visualization with progress rings
 * - Recent events timeline
 *
 * The component integrates with a SQLite database via useWheelDatabase hook,
 * falling back to mock data when the database is unavailable.
 */
export default function WheelTrackerMock() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /** Search/filter query for tickers */
  const [query, setQuery] = useState('');

  /** Controls visibility of the right sidebar (alerts, news, etc.) */
  const [rightOpen, setRightOpen] = useState(true);

  /** Import state and file input ref for CSV uploads */
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // DATABASE INTEGRATION
  // ============================================================================

  /** Load data from SQLite database via custom hook */
  const { data: wheelData, db } = useWheelDatabase();

  /**
   * Use live database data when available, otherwise fall back to mock data.
   * This allows the page to work during development and with empty databases.
   */
  const currentPositions = useMemo(
    () => (wheelData?.positions as unknown as PositionRow[]) ?? positions,
    [wheelData]
  );
  const currentShareLots = useMemo(() => wheelData?.shareLots ?? shareLots, [wheelData]);

  // ============================================================================
  // EARNINGS CALENDAR (from DB)
  // ============================================================================

  /** Earnings dates loaded from database */
  const [dbEarnings, setDbEarnings] = useState<Record<string, string>>({});

  /** Combined earnings (DB + mock fallback) */
  const currentEarnings = useMemo(() => {
    // If we have DB data, use it; otherwise use mock data
    return Object.keys(dbEarnings).length > 0
      ? dbEarnings
      : (wheelData?.earningsCalendar ?? earningsCalendar);
  }, [dbEarnings, wheelData]);

  /** Load earnings dates from database */
  const loadEarningsFromDB = useCallback(async () => {
    if (!db) return;

    try {
      const { DAOFactory } = await import('../modules/db/dao-index');
      const daoFactory = new DAOFactory(db);
      const symbolEventDAO = daoFactory.createSymbolEventDAO();

      // Get upcoming earnings events
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90); // Next 90 days
      const endDate = futureDate.toISOString().split('T')[0];

      const events = await symbolEventDAO.findUpcoming(today, endDate, 'earnings');

      // Build earnings calendar
      const calendar: Record<string, string> = {};
      for (const event of events) {
        calendar[event.symbol] = event.event_date;
      }

      setDbEarnings(calendar);
    } catch (e) {
      console.error('Failed to load earnings from DB:', e);
    }
  }, [db]);

  useEffect(() => {
    if (db) loadEarningsFromDB();
  }, [db, loadEarningsFromDB]);

  // Reload earnings when new symbols or trades are added
  useDataUpdates('trades_imported', () => {
    loadEarningsFromDB();
  });

  // ============================================================================
  // METRICS: PREMIUM THIS WEEK (from DB)
  // ============================================================================

  /** Premium collected (net) for the current calendar week and number of legs */
  const [premiumThisWeek, setPremiumThisWeek] = useState<{ amount: number; legs: number }>({
    amount: 0,
    legs: 0,
  });

  /** Format YYYY-MM-DD in local time */
  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  /** Start (Mon) and end (Sun) of current week in local time */
  const getCurrentWeekRange = useCallback(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun...6=Sat
    const diffToMonday = (day + 6) % 7; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: toYMD(monday), end: toYMD(sunday) };
  }, []);

  /** Compute net options premium for the current week from DB */
  const computePremiumThisWeek = useCallback(() => {
    if (!db) return;
    try {
      const { start, end } = getCurrentWeekRange();
      const rows = db.query(
        `SELECT action as act, quantity as qty, price as px, multiplier as mult
         FROM trades
         WHERE instrument_type = 'OPTION'
           AND trade_date >= ? AND trade_date <= ?`,
        [start, end]
      ) as Array<{ act: string; qty: number; px: number; mult: number | null }>;

      const signMap: Record<string, number> = {
        SELL_TO_OPEN: +1,
        SELL_TO_CLOSE: +1,
        BUY_TO_OPEN: -1,
        BUY_TO_CLOSE: -1,
      };

      let total = 0;
      let legs = 0;
      for (const r of rows) {
        const qty = Number(r.qty) || 0;
        const price = Number(r.px) || 0;
        const mult = Number(r.mult ?? 100) || 100;
        const s = signMap[(r.act || '').toUpperCase()] ?? 0;
        if (s !== 0) {
          total += s * price * qty * mult;
          legs += 1;
        }
      }
      setPremiumThisWeek({ amount: total, legs });
    } catch (e) {
      console.error('Failed to compute premium this week:', e);
      setPremiumThisWeek({ amount: 0, legs: 0 });
    }
  }, [db, getCurrentWeekRange]);

  useEffect(() => {
    if (db) computePremiumThisWeek();
  }, [db, computePremiumThisWeek]);

  // Recompute when new trades are imported
  useDataUpdates('trades_imported', () => {
    computePremiumThisWeek();
  });

  // ============================================================================
  // METRICS: CAPITAL IN PUTS (from DB)
  // ============================================================================

  /** Total collateral required for open short puts */
  const [capitalInPuts, setCapitalInPuts] = useState<{ amount: number; contracts: number }>({
    amount: 0,
    contracts: 0,
  });

  /** Compute cash-secured put collateral from net open short puts */
  const computeCapitalInPuts = useCallback(() => {
    if (!db) return;
    try {
      // Get all put trades, group by symbol/strike/expiration to compute net position
      const rows = db.query(
        `SELECT symbol_id, strike_price, expiration_date, option_type, action, quantity, multiplier
         FROM trades
         WHERE instrument_type = 'OPTION'
           AND option_type = 'PUT'
         ORDER BY trade_date ASC`
      ) as Array<{
        symbol_id: number;
        strike_price: number;
        expiration_date: string;
        option_type: string;
        action: string;
        quantity: number;
        multiplier: number | null;
      }>;

      // Group by key: symbol_id|strike|expiration
      const positionMap = new Map<string, { strike: number; netQty: number; mult: number }>();

      for (const r of rows) {
        const key = `${r.symbol_id}|${r.strike_price}|${r.expiration_date}`;
        if (!positionMap.has(key)) {
          positionMap.set(key, {
            strike: r.strike_price,
            netQty: 0,
            mult: Number(r.multiplier ?? 100),
          });
        }
        const pos = positionMap.get(key)!;
        const qty = Number(r.quantity) || 0;
        const act = (r.action || '').toUpperCase();

        // Sign: SELL = +, BUY = -
        if (act === 'SELL_TO_OPEN') pos.netQty += qty;
        else if (act === 'BUY_TO_CLOSE') pos.netQty -= qty;
        else if (act === 'SELL_TO_CLOSE') pos.netQty -= qty;
        else if (act === 'BUY_TO_OPEN') pos.netQty -= qty;
      }

      // Sum collateral for net short positions (netQty > 0 = short)
      let totalCollateral = 0;
      let totalContracts = 0;
      for (const pos of positionMap.values()) {
        if (pos.netQty > 0) {
          // Short puts require strike * qty * mult as collateral
          totalCollateral += pos.strike * pos.netQty * pos.mult;
          totalContracts += pos.netQty;
        }
      }

      setCapitalInPuts({ amount: totalCollateral, contracts: totalContracts });
    } catch (e) {
      console.error('Failed to compute capital in puts:', e);
      setCapitalInPuts({ amount: 0, contracts: 0 });
    }
  }, [db]);

  useEffect(() => {
    if (db) computeCapitalInPuts();
  }, [db, computeCapitalInPuts]);

  // Recompute when new trades are imported
  useDataUpdates('trades_imported', () => {
    computeCapitalInPuts();
  });

  // ============================================================================
  // MANUAL ADD STOCK FUNCTIONALITY
  // ============================================================================

  /** State for manual add stock input */
  const [addStockSymbol, setAddStockSymbol] = useState('');
  const [addingStock, setAddingStock] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);

  /** Add a stock symbol manually to the database */
  const handleAddStock = async () => {
    if (!db || !addStockSymbol.trim()) return;

    const symbol = addStockSymbol.trim().toUpperCase();
    setAddingStock(true);

    try {
      // Import DAO factory
      const { DAOFactory } = await import('../modules/db/dao-index');
      const daoFactory = new DAOFactory(db);
      const symbolDAO = daoFactory.createSymbolDAO();

      // Check if symbol already exists
      const existing = await symbolDAO.findBySymbol(symbol);
      if (existing) {
        alert(`Symbol "${symbol}" is already in the database.`);
        setAddStockSymbol('');
        setAddingStock(false);
        return;
      }

      // Create new symbol
      await symbolDAO.create({
        symbol,
        name: null,
        exchange: null,
        asset_type: 'stock',
        sector: null,
        industry: null,
      });

      // Persist to database
      await db.persist();

      // Refresh database stats
      fetchDbStats();

      alert(`Successfully added "${symbol}" to tracking!`);
      setAddStockSymbol('');
      setShowAddStock(false);
    } catch (e) {
      console.error('Failed to add symbol:', e);
      alert(`Failed to add symbol: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setAddingStock(false);
    }
  };

  // ============================================================================
  // MANUAL ADD EARNINGS DATE FUNCTIONALITY
  // ============================================================================

  /** State for manual add earnings date */
  const [earningsSymbol, setEarningsSymbol] = useState('');
  const [earningsDate, setEarningsDate] = useState('');
  const [addingEarnings, setAddingEarnings] = useState(false);
  const [showAddEarnings, setShowAddEarnings] = useState(false);

  /** Add or update earnings date for a symbol */
  const handleAddEarnings = async () => {
    if (!db || !earningsSymbol.trim() || !earningsDate.trim()) return;

    const symbol = earningsSymbol.trim().toUpperCase();
    const date = earningsDate.trim();

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert('Invalid date format. Please use YYYY-MM-DD (e.g., 2025-12-31)');
      return;
    }

    setAddingEarnings(true);

    try {
      const { DAOFactory } = await import('../modules/db/dao-index');
      const daoFactory = new DAOFactory(db);
      const symbolDAO = daoFactory.createSymbolDAO();
      const symbolEventDAO = daoFactory.createSymbolEventDAO();

      // Check if symbol exists
      const existingSymbol = await symbolDAO.findBySymbol(symbol);
      if (!existingSymbol) {
        alert(`Symbol "${symbol}" not found. Please add the symbol first.`);
        setEarningsSymbol('');
        setEarningsDate('');
        setAddingEarnings(false);
        return;
      }

      // Upsert earnings event
      await symbolEventDAO.upsertEvent({
        symbol_id: existingSymbol.id!,
        event_type: 'earnings',
        event_date: date,
        confirmed: 1, // Mark as confirmed since manually entered
        source: 'manual',
      });

      // Persist to database
      await db.persist();

      // Reload earnings
      await loadEarningsFromDB();

      alert(`Successfully ${existingSymbol ? 'updated' : 'added'} earnings date for "${symbol}"!`);
      setEarningsSymbol('');
      setEarningsDate('');
      setShowAddEarnings(false);
    } catch (e) {
      console.error('Failed to add earnings:', e);
      alert(`Failed to add earnings: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setAddingEarnings(false);
    }
  };

  // ============================================================================
  // OPTION EXPIRATION TRACKING
  // ============================================================================

  /** Upcoming option expirations */
  const [upcomingExpirations, setUpcomingExpirations] = useState<
    Array<{
      trade_id: number;
      symbol: string;
      option_type: string;
      strike_price: number;
      expiration_date: string;
      quantity: number;
      action: string;
      net_position?: number;
    }>
  >([]);

  /** State for manual expiration update */
  const [editingExpirationTradeId, setEditingExpirationTradeId] = useState<number | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [updatingExpiration, setUpdatingExpiration] = useState(false);

  /** Load upcoming option expirations from database */
  const loadUpcomingExpirations = useCallback(async () => {
    if (!db) return;

    try {
      const { DAOFactory } = await import('../modules/db/dao-index');
      const daoFactory = new DAOFactory(db);
      const tradeDAO = daoFactory.createTradeDAO();

      // Get expirations for next 90 days
      const expirations = await tradeDAO.getUpcomingExpirations();

      // Calculate net positions per symbol/strike/expiration
      const positionMap = new Map<string, number>();
      for (const exp of expirations) {
        const key = `${exp.symbol}|${exp.option_type}|${exp.strike_price}|${exp.expiration_date}`;
        const current = positionMap.get(key) || 0;

        // Calculate net position: SELL = -, BUY = +
        let delta = 0;
        if (exp.action === 'SELL_TO_OPEN') delta = -exp.quantity;
        else if (exp.action === 'BUY_TO_OPEN') delta = exp.quantity;
        else if (exp.action === 'SELL_TO_CLOSE') delta = exp.quantity;
        else if (exp.action === 'BUY_TO_CLOSE') delta = -exp.quantity;

        positionMap.set(key, current + delta);
      }

      // Add net position to each expiration
      const expirationsWithPositions = expirations.map(exp => {
        const key = `${exp.symbol}|${exp.option_type}|${exp.strike_price}|${exp.expiration_date}`;
        return {
          ...exp,
          net_position: positionMap.get(key) || 0,
        };
      });

      setUpcomingExpirations(expirationsWithPositions);
    } catch (e) {
      console.error('Failed to load expirations:', e);
    }
  }, [db]);

  useEffect(() => {
    if (db) loadUpcomingExpirations();
  }, [db, loadUpcomingExpirations]);

  // Reload expirations when trades imported
  useDataUpdates('trades_imported', () => {
    loadUpcomingExpirations();
  });

  /** Group expirations by date */
  const expirationsByDate = useMemo(() => {
    const grouped = new Map<string, typeof upcomingExpirations>();

    for (const exp of upcomingExpirations) {
      const date = exp.expiration_date;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(exp);
    }

    // Sort by date
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, exps]) => ({ date, expirations: exps }));
  }, [upcomingExpirations]);

  /** Calculate days until expiration */
  const getDaysToExpiration = (expirationDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expirationDate + 'T00:00:00');
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /** Update expiration date for a trade */
  const handleUpdateExpiration = async () => {
    if (!db || !editingExpirationTradeId || !newExpirationDate) return;

    setUpdatingExpiration(true);

    try {
      const { DAOFactory } = await import('../modules/db/dao-index');
      const daoFactory = new DAOFactory(db);
      const tradeDAO = daoFactory.createTradeDAO();

      const success = await tradeDAO.updateExpirationDate(
        editingExpirationTradeId,
        newExpirationDate
      );

      if (success) {
        // Persist to database
        await db.persist();

        // Reload expirations
        await loadUpcomingExpirations();

        alert(`Successfully updated expiration date!`);
        setEditingExpirationTradeId(null);
        setNewExpirationDate('');
      } else {
        alert('Failed to update expiration date');
      }
    } catch (e) {
      console.error('Failed to update expiration:', e);
      alert(`Failed to update expiration: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setUpdatingExpiration(false);
    }
  };

  // ============================================================================
  // METRICS: SHARES FOR CALLS (from DB)
  // ============================================================================

  /** Total shares owned that have covered calls */
  const [sharesForCalls, setSharesForCalls] = useState<{ shares: number; tickers: number }>({
    shares: 0,
    tickers: 0,
  });

  /** Compute shares owned and covered call contracts from DB */
  const computeSharesForCalls = useCallback(() => {
    if (!db) return;
    try {
      // Step 1: Compute net share positions per symbol
      // Include stock trades (BUY/SELL) and option assignments
      const stockRows = db.query(
        `SELECT symbol_id, action, quantity
         FROM trades
         WHERE instrument_type = 'STOCK'
         ORDER BY trade_date ASC`
      ) as Array<{ symbol_id: number; action: string; quantity: number }>;

      const sharePositions = new Map<number, number>(); // symbol_id -> net shares

      for (const r of stockRows) {
        const qty = Number(r.quantity) || 0;
        const act = (r.action || '').toUpperCase();
        const current = sharePositions.get(r.symbol_id) || 0;

        if (act === 'BUY' || act === 'BUY_TO_OPEN') {
          sharePositions.set(r.symbol_id, current + qty);
        } else if (act === 'SELL' || act === 'SELL_TO_CLOSE') {
          sharePositions.set(r.symbol_id, current - qty);
        }
      }

      // Step 2: Find symbols with net short call positions (covered calls)
      const callRows = db.query(
        `SELECT symbol_id, action, quantity, multiplier
         FROM trades
         WHERE instrument_type = 'OPTION'
           AND option_type = 'CALL'
         ORDER BY trade_date ASC`
      ) as Array<{
        symbol_id: number;
        action: string;
        quantity: number;
        multiplier: number | null;
      }>;

      const callPositions = new Map<number, number>(); // symbol_id -> net call qty

      for (const r of callRows) {
        const qty = Number(r.quantity) || 0;
        const act = (r.action || '').toUpperCase();
        const current = callPositions.get(r.symbol_id) || 0;

        if (act === 'SELL_TO_OPEN') callPositions.set(r.symbol_id, current + qty);
        else if (act === 'BUY_TO_CLOSE') callPositions.set(r.symbol_id, current - qty);
        else if (act === 'SELL_TO_CLOSE') callPositions.set(r.symbol_id, current - qty);
        else if (act === 'BUY_TO_OPEN') callPositions.set(r.symbol_id, current - qty);
      }

      // Step 3: For symbols with both shares and short calls, count covered shares
      let totalShares = 0;
      const tickersWithCalls = new Set<number>();

      for (const [symbolId, shareQty] of sharePositions.entries()) {
        const callQty = callPositions.get(symbolId) || 0;
        if (shareQty > 0 && callQty > 0) {
          // We have shares and short calls on this ticker
          // Each call covers 100 shares (or multiplier)
          const mult = 100; // Standard multiplier
          const coveredShares = Math.min(shareQty, callQty * mult);
          totalShares += coveredShares;
          tickersWithCalls.add(symbolId);
        }
      }

      setSharesForCalls({ shares: totalShares, tickers: tickersWithCalls.size });
    } catch (e) {
      console.error('Failed to compute shares for calls:', e);
      setSharesForCalls({ shares: 0, tickers: 0 });
    }
  }, [db]);

  useEffect(() => {
    if (db) computeSharesForCalls();
  }, [db, computeSharesForCalls]);

  // Recompute when new trades are imported
  useDataUpdates('trades_imported', () => {
    computeSharesForCalls();
  });

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  /** All unique tickers from positions and share lots, sorted alphabetically */
  const tickers = useMemo(
    () =>
      Array.from(
        new Set([...currentPositions.map(p => p.ticker), ...currentShareLots.map(s => s.ticker)])
      ).sort(),
    [currentPositions, currentShareLots]
  );

  /** Tickers filtered by the search query */
  const filteredTickers = useMemo(
    () => tickers.filter(t => t.toLowerCase().includes(query.toLowerCase())),
    [tickers, query]
  );

  /** Today's date in YYYY-MM-DD format */
  const today = new Date().toISOString().slice(0, 10);

  // ============================================================================
  // CSV IMPORT HANDLERS
  // ============================================================================

  /** Opens the hidden file chooser */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /** Handles CSV file selection and performs import */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate CSV
    if (
      !selectedFile.name.toLowerCase().endsWith('.csv') &&
      selectedFile.type !== 'text/csv' &&
      selectedFile.type !== 'application/vnd.ms-excel'
    ) {
      alert('Please select a valid CSV file.');
      return;
    }

    setImporting(true);
    try {
      const { BatchImportService } = await import('../modules/import/batch-import');
      const { initDatabase } = await import('../modules/db/sqlite');
      const { PortfolioDAO } = await import('../modules/db/portfolio-dao');
      // Prefer existing DB instance from hook to ensure immediate visibility in UI
      const importDb = db ?? (await initDatabase());
      const portfolioDAO = new PortfolioDAO(importDb);

      // Ensure default portfolio exists
      let portfolioId = 1;
      const existing = await portfolioDAO.findById(portfolioId);
      if (!existing.success) {
        const created = await portfolioDAO.create({
          name: 'Default Portfolio',
          broker: 'robinhood',
          account_type: 'cash',
          description: 'Auto-created portfolio for CSV imports',
          is_active: true,
        });
        if (created.success && created.data?.id) {
          portfolioId = created.data.id;
          await importDb.persist();
        } else {
          throw new Error('Failed to create default portfolio');
        }
      }

      // Perform import
      const importService = new BatchImportService(importDb);
      const results = await importService.importFromFile(selectedFile, {
        portfolioId,
        autoDetectBroker: true,
        forceBrokerType: 'robinhood',
        stopOnError: false,
        skipInvalidRecords: true,
      });

      await importDb.persist();

      if (results.success) {
        const { dataUpdateEmitter } = await import('../utils/data-events');
        dataUpdateEmitter.emit('trades_imported', results);
        alert(`Import successful! Imported ${results.successfulRecords} trades.`);
        // Refresh snapshot immediately if DB is available
        fetchDbStats();
      } else {
        alert('Import failed. See console for details.');
      }
    } catch (e) {
      console.error('Import error:', e);
      alert(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Generate alerts based on position data.
   * Alerts are created for:
   * - Short calls at or above profit target (60%+)
   * - Positions expiring soon (2 DTE or less)
   * - Upcoming earnings dates (within 7 days)
   */
  const alerts = useMemo(() => {
    const rows: { id: string; text: string; ticker: string }[] = [];
    currentPositions.forEach(p => {
      if (p.type === 'C' && p.side === 'S') {
        const pct = pctOfMaxProfitShortCall(p.entry, p.mark);
        if (pct >= 60)
          rows.push({
            id: `target-${p.id}`,
            ticker: p.ticker,
            text: `${p.ticker} call ${p.strike} is at ${pct}% of max profit. Consider close or roll.`,
          });
      }
      if (p.dte <= 2)
        rows.push({
          id: `dte-${p.id}`,
          ticker: p.ticker,
          text: `${p.ticker} ${p.type} ${p.strike} expires in ${p.dte} day${p.dte === 1 ? '' : 's'}. Plan action.`,
        });
    });
    for (const [t, date] of Object.entries(currentEarnings)) {
      if (date <= addDays(today, 7))
        rows.push({
          id: `earn-${t}`,
          ticker: t,
          text: `${t} earnings ${date}. Mind assignment risk.`,
        });
    }
    return rows;
  }, [today, currentPositions, currentEarnings]);

  /**
   * Determines the next wheel phase for a given ticker based on current holdings.
   * Logic:
   * - No shares, no options → Start by selling cash-secured puts
   * - Has short puts, no shares → Currently selling puts (waiting for assignment or expiry)
   * - Has shares, no short calls → Sell covered calls
   * - Has shares and short calls → Wait for call to expire or be assigned
   *
   * @param ticker - Stock symbol to check
   * @returns The next appropriate wheel phase
   */
  const nextPhaseForLocal = (ticker: string): WheelPhase => {
    const hasShares = currentShareLots.some(l => l.ticker === ticker && l.qty > 0);
    const hasShortPuts = currentPositions.some(
      p => p.ticker === ticker && p.type === 'P' && p.side === 'S'
    );
    const hasShortCalls = currentPositions.some(
      p => p.ticker === ticker && p.type === 'C' && p.side === 'S'
    );
    if (!hasShares && !hasShortPuts && !hasShortCalls) return 'Sell Cash Secured Puts';
    if (!hasShares && hasShortPuts) return 'Sell Cash Secured Puts';
    if (hasShares && !hasShortCalls) return 'Sell Covered Calls';
    if (hasShares && hasShortCalls) return 'Call Expires Worthless';
    return 'Repeat';
  };

  // ============================================================================
  // DATABASE SNAPSHOT FUNCTIONALITY
  // ============================================================================

  /** Type definitions for SQLite query results */
  type CountRow = { c: number };
  type SymbolRow = { symbol: string };

  /** State for database statistics display */
  const [dbStats, setDbStats] = useState<{
    portfolios: number;
    symbols: number;
    trades: number;
    wheel_cycles: number;
    wheel_events: number;
    sampleSymbols: string[];
  } | null>(null);

  /** Error message if database stats fetch fails */
  const [dbStatsError, setDbStatsError] = useState<string | null>(null);

  /** Controls visibility of the database snapshot section (inline view disabled in favor of full preview) */
  const [snapshotOpen] = useState(false);

  /** State for table preview functionality */
  type TableName = 'portfolios' | 'symbols' | 'trades' | 'wheel_cycles' | 'wheel_events';
  type TableInfoRow = {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: unknown;
    pk: number;
  };

  /** Currently selected table for preview */
  const [selectedTable, setSelectedTable] = useState<TableName>('trades');

  /** Column names for the selected table */
  const [tableCols, setTableCols] = useState<string[]>([]);

  /** Row data for the selected table (limited to 25 rows) */
  const [tableRows, setTableRows] = useState<Array<Record<string, unknown>>>([]);

  /** Error message if table preview fails */
  const [tableError, setTableError] = useState<string | null>(null);

  /** Controls full-screen table preview modal */
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);

  /**
   * Fetches database statistics including row counts and sample symbols.
   * Queries all major tables to provide a snapshot of database state.
   */
  const fetchDbStats = () => {
    if (!db) return;
    try {
      const getCount = (table: string) => {
        const rows = db.query(`SELECT COUNT(*) as c FROM ${table}`) as CountRow[];
        return Number(rows?.[0]?.c ?? 0);
      };
      const portfolios = getCount('portfolios');
      const symbols = getCount('symbols');
      const trades = getCount('trades');
      const wheel_cycles = getCount('wheel_cycles');
      const wheel_events = getCount('wheel_events');
      const sampleRows = db.query(
        'SELECT symbol FROM symbols ORDER BY symbol LIMIT 8'
      ) as SymbolRow[];
      const sampleSymbols = Array.isArray(sampleRows)
        ? sampleRows.map(r => r.symbol).filter(Boolean)
        : [];
      setDbStats({ portfolios, symbols, trades, wheel_cycles, wheel_events, sampleSymbols });
      setDbStatsError(null);
    } catch (e) {
      setDbStats(null);
      setDbStatsError(e instanceof Error ? e.message : 'Unknown DB error');
    }
  };

  useEffect(() => {
    if (db) fetchDbStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  /**
   * Fetches preview data for a specific database table.
   * Retrieves column metadata and up to 25 rows of data.
   *
   * @param table - Name of the table to preview
   */
  const fetchTablePreview = (table: TableName) => {
    if (!db) return;
    try {
      const infoRows = db.query(`PRAGMA table_info(${table})`) as TableInfoRow[];
      const cols = infoRows.map(r => r.name);
      const data = db.query(`SELECT * FROM ${table} LIMIT 25`) as Array<Record<string, unknown>>;
      setTableCols(cols);
      setTableRows(Array.isArray(data) ? data : []);
      setTableError(null);
    } catch (e) {
      setTableCols([]);
      setTableRows([]);
      setTableError(e instanceof Error ? e.message : 'Unknown table preview error');
    }
  };

  useEffect(() => {
    if (db) fetchTablePreview(selectedTable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, selectedTable]);

  /**
   * Aggregates share lots by ticker, calculating totals and coverage statistics.
   *
   * For each ticker:
   * - Sums total shares across all lots
   * - Calculates average cost basis
   * - Determines coverage percentage (how many shares have covered calls)
   * - Identifies uncovered shares that could have calls sold against them
   *
   * @param lots - Array of individual share lots
   * @returns Array of aggregated ticker statistics
   */
  function aggregateLots(lots: { ticker: string; qty: number; costPerShare: number }[]) {
    const byTicker: Record<
      string,
      {
        ticker: string;
        qty: number;
        sum: number;
        lots: number;
        covered: number;
        uncovered: number;
        avgCost: number;
      }
    > = {};
    lots.forEach(l => {
      if (!byTicker[l.ticker])
        byTicker[l.ticker] = {
          ticker: l.ticker,
          qty: 0,
          sum: 0,
          lots: 0,
          covered: 0,
          uncovered: 0,
          avgCost: 0,
        };
      byTicker[l.ticker].qty += l.qty;
      byTicker[l.ticker].sum += l.qty * l.costPerShare;
      byTicker[l.ticker].lots += 1;
    });
    Object.values(byTicker).forEach(row => {
      const shortCalls = currentPositions
        .filter(p => p.ticker === row.ticker && p.type === 'C' && p.side === 'S')
        .reduce((n, p) => n + p.qty * 100, 0);
      row.covered = Math.round(Math.min(100, (shortCalls / row.qty) * 100));
      row.uncovered = Math.max(0, row.qty - shortCalls);
      row.avgCost = row.sum / row.qty;
    });
    return Object.values(byTicker);
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={styles.container}>
      {/* ========== HEADER ========== */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.title}>
            Marks Penny Stocks In His Socks
            <span
              style={{
                marginLeft: '8px',
                display: 'inline-block',
                width: '2px',
                height: '1em',
                backgroundColor: '#6ee7b7',
                animation: 'pulse 1s infinite',
              }}
            />
          </div>
          <div style={{ flex: 1 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter tickers..."
            style={styles.input}
          />
          {/* Hidden file input for CSV uploads */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            data-testid="wheel-import-input"
          />
          <button
            style={styles.button}
            onClick={handleImportClick}
            disabled={importing}
            data-testid="wheel-import-button"
          >
            {importing ? 'Importing…' : 'Import CSV'}
          </button>

          {/* Add Stock Button */}
          {!showAddStock && !showAddEarnings && (
            <button
              style={{
                ...styles.button,
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                borderColor: '#22c55e',
              }}
              onClick={() => setShowAddStock(true)}
              data-testid="add-stock-button"
            >
              + Add Stock
            </button>
          )}

          {/* Add Stock Input Form */}
          {showAddStock && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                value={addStockSymbol}
                onChange={e => setAddStockSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddStock();
                  if (e.key === 'Escape') {
                    setShowAddStock(false);
                    setAddStockSymbol('');
                  }
                }}
                placeholder="Enter ticker (e.g., AAPL)"
                style={{ ...styles.input, width: '180px' }}
                disabled={addingStock}
                autoFocus
                data-testid="add-stock-input"
              />
              <button
                style={{
                  ...styles.button,
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  borderColor: '#22c55e',
                }}
                onClick={handleAddStock}
                disabled={addingStock || !addStockSymbol.trim()}
                data-testid="add-stock-submit"
              >
                {addingStock ? 'Adding...' : 'Add'}
              </button>
              <button
                style={styles.button}
                onClick={() => {
                  setShowAddStock(false);
                  setAddStockSymbol('');
                }}
                disabled={addingStock}
                data-testid="add-stock-cancel"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Add Earnings Date Button */}
          {!showAddStock && !showAddEarnings && (
            <button
              style={{
                ...styles.button,
                backgroundColor: 'rgba(236, 72, 153, 0.2)',
                borderColor: '#ec4899',
              }}
              onClick={() => setShowAddEarnings(true)}
              data-testid="add-earnings-button"
            >
              📅 Add Earnings
            </button>
          )}

          {/* Add Earnings Date Input Form */}
          {showAddEarnings && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                value={earningsSymbol}
                onChange={e => setEarningsSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter' && earningsSymbol.trim() && earningsDate.trim())
                    handleAddEarnings();
                  if (e.key === 'Escape') {
                    setShowAddEarnings(false);
                    setEarningsSymbol('');
                    setEarningsDate('');
                  }
                }}
                placeholder="Symbol"
                style={{ ...styles.input, width: '100px' }}
                disabled={addingEarnings}
                autoFocus
                data-testid="add-earnings-symbol-input"
              />
              <input
                value={earningsDate}
                onChange={e => setEarningsDate(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && earningsSymbol.trim() && earningsDate.trim())
                    handleAddEarnings();
                  if (e.key === 'Escape') {
                    setShowAddEarnings(false);
                    setEarningsSymbol('');
                    setEarningsDate('');
                  }
                }}
                placeholder="YYYY-MM-DD"
                type="date"
                style={{ ...styles.input, width: '150px' }}
                disabled={addingEarnings}
                data-testid="add-earnings-date-input"
              />
              <button
                style={{
                  ...styles.button,
                  backgroundColor: 'rgba(236, 72, 153, 0.2)',
                  borderColor: '#ec4899',
                }}
                onClick={handleAddEarnings}
                disabled={addingEarnings || !earningsSymbol.trim() || !earningsDate.trim()}
                data-testid="add-earnings-submit"
              >
                {addingEarnings ? 'Adding...' : 'Add'}
              </button>
              <button
                style={styles.button}
                onClick={() => {
                  setShowAddEarnings(false);
                  setEarningsSymbol('');
                  setEarningsDate('');
                }}
                disabled={addingEarnings}
                data-testid="add-earnings-cancel"
              >
                Cancel
              </button>
            </div>
          )}

          <button style={styles.button} onClick={() => setRightOpen(s => !s)}>
            {rightOpen ? 'Hide' : 'Show'} Alerts
          </button>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main style={styles.main}>
        {/* ========== LEFT COLUMN ========== */}
        <div style={styles.leftColumn}>
          {/* Summary Cards: High-level portfolio metrics */}
          <div style={styles.summaryGrid}>
            <MetricCard
              label="Premium This Week"
              value={`$${format(Math.abs(premiumThisWeek.amount), 2)}`}
              sub={`Across ${premiumThisWeek.legs} legs${premiumThisWeek.amount < 0 ? ' (net debit)' : ''}`}
              testIdValue="premium-this-week-value"
              testIdSub="premium-this-week-sub"
            />
            <MetricCard
              label="Capital In Puts"
              value={`$${format(capitalInPuts.amount, 0)}`}
              sub={`${capitalInPuts.contracts} open CSP${capitalInPuts.contracts !== 1 ? 's' : ''}`}
              testIdValue="capital-in-puts-value"
              testIdSub="capital-in-puts-sub"
            />
            <MetricCard
              label="Shares For Calls"
              value={sharesForCalls.shares.toString()}
              sub={`Across ${sharesForCalls.tickers} ticker${sharesForCalls.tickers !== 1 ? 's' : ''}`}
              testIdValue="shares-for-calls-value"
              testIdSub="shares-for-calls-sub"
            />
          </div>

          {/* Option Expiration Tracker: Shows upcoming option expirations */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📆 Upcoming Option Expirations</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Track option contracts expiring in the next 90 days
            </p>

            {expirationsByDate.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                No upcoming option expirations found
              </div>
            )}

            {expirationsByDate.map(({ date, expirations }) => {
              const dte = getDaysToExpiration(date);
              const isExpiringSoon = dte <= 7;
              const isExpiringToday = dte === 0;

              return (
                <div
                  key={date}
                  style={{
                    marginBottom: '16px',
                    border: `1px solid ${isExpiringToday ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#334155'}`,
                    borderRadius: '8px',
                    backgroundColor: isExpiringToday
                      ? 'rgba(239, 68, 68, 0.1)'
                      : isExpiringSoon
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(15, 23, 42, 0.4)',
                    padding: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      {date}
                      {isExpiringToday && (
                        <span style={{ marginLeft: '8px', color: '#ef4444' }}>
                          ⚠️ EXPIRES TODAY
                        </span>
                      )}
                      {isExpiringSoon && !isExpiringToday && (
                        <span style={{ marginLeft: '8px', color: '#f59e0b' }}>
                          ⏰ Expires in {dte} days
                        </span>
                      )}
                      {!isExpiringSoon && (
                        <span style={{ marginLeft: '8px', color: '#64748b' }}>{dte} days</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {expirations.length} contract{expirations.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {expirations.map((exp, idx) => (
                      <div
                        key={`${exp.trade_id}-${idx}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px',
                          backgroundColor: 'rgba(15, 23, 42, 0.6)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: exp.option_type === 'CALL' ? '#22c55e' : '#ef4444',
                            }}
                          >
                            {exp.symbol}
                          </span>
                          <span style={{ marginLeft: '8px', color: '#94a3b8' }}>
                            ${exp.strike_price} {exp.option_type}
                          </span>
                          <span style={{ marginLeft: '8px', color: '#64748b' }}>
                            Qty: {exp.quantity}
                          </span>
                          <span style={{ marginLeft: '8px', color: '#64748b' }}>
                            ({exp.action.replace(/_/g, ' ')})
                          </span>
                        </div>

                        {editingExpirationTradeId === exp.trade_id ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="date"
                              value={newExpirationDate}
                              onChange={e => setNewExpirationDate(e.target.value)}
                              style={{
                                ...styles.input,
                                width: '150px',
                                padding: '4px 8px',
                                fontSize: '12px',
                              }}
                              disabled={updatingExpiration}
                              data-testid={`update-expiration-date-${exp.trade_id}`}
                            />
                            <button
                              onClick={handleUpdateExpiration}
                              disabled={updatingExpiration || !newExpirationDate}
                              style={{
                                ...styles.button,
                                padding: '4px 12px',
                                fontSize: '12px',
                                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                borderColor: '#22c55e',
                              }}
                              data-testid={`update-expiration-submit-${exp.trade_id}`}
                            >
                              {updatingExpiration ? '...' : '✓'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingExpirationTradeId(null);
                                setNewExpirationDate('');
                              }}
                              disabled={updatingExpiration}
                              style={{
                                ...styles.button,
                                padding: '4px 12px',
                                fontSize: '12px',
                              }}
                              data-testid={`update-expiration-cancel-${exp.trade_id}`}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingExpirationTradeId(exp.trade_id);
                              setNewExpirationDate(exp.expiration_date);
                            }}
                            style={{
                              ...styles.button,
                              padding: '4px 12px',
                              fontSize: '12px',
                              backgroundColor: 'rgba(59, 130, 246, 0.2)',
                              borderColor: '#3b82f6',
                            }}
                            data-testid={`edit-expiration-${exp.trade_id}`}
                          >
                            📝 Edit
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Wheel Phase Tracker: Shows current strategy phase for each ticker */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Wheel Phase By Ticker</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Click a chip to filter tables
            </p>
            {filteredTickers.map(t => (
              <PhaseCard key={t} ticker={t} phase={nextPhaseForLocal(t)} />
            ))}
          </div>

          {/* Open Puts Table: Shows all cash-secured puts with key metrics */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Open Puts</h3>
            <Table
              columns={[
                'Ticker',
                'Qty',
                'Strike',
                'Entry',
                'Mark',
                'DTE',
                'ROC',
                'Moneyness',
                'Next',
              ]}
              rows={currentPositions
                .filter(p => p.type === 'P' && p.side === 'S')
                .map(p => [
                  p.ticker,
                  p.qty * 100,
                  `$${p.strike}`,
                  `$${format(p.entry)}`,
                  `$${format(p.mark)}`,
                  p.dte,
                  `${format(returnOnCollateral(p.entry, p.strike))}%`,
                  `${p.m > 0 ? '+' : ''}${format(p.m, 1)}%`,
                  <RowAction key={p.id} text="Plan Roll" />,
                ])}
            />
          </div>

          {/* Open Calls Table: Shows all covered calls with profit capture tracking */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Open Calls</h3>
            <Table
              columns={[
                'Ticker',
                'Qty',
                'Strike',
                'Entry',
                'Mark',
                'DTE',
                'Pct Max',
                'Linked Lot',
                'Next',
              ]}
              rows={currentPositions
                .filter(p => p.type === 'C' && p.side === 'S')
                .map(p => [
                  p.ticker,
                  p.qty * 100,
                  `$${p.strike}`,
                  `$${format(p.entry)}`,
                  `$${format(p.mark)}`,
                  p.dte,
                  `${pctOfMaxProfitShortCall(p.entry, p.mark)}%`,
                  p.linkedLotId || 'none',
                  <RowAction
                    key={p.id}
                    text={
                      pctOfMaxProfitShortCall(p.entry, p.mark) >= 60 ? 'Close At Target' : 'Monitor'
                    }
                  />,
                ])}
            />
          </div>

          {/* Shares Table: Shows owned shares with coverage analysis */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Shares</h3>
            <Table
              columns={['Ticker', 'Lots', 'Qty', 'Cost/Share', 'Covered', 'Uncovered', 'Next']}
              rows={aggregateLots(currentShareLots).map(r => [
                r.ticker,
                r.lots,
                r.qty,
                `$${format(r.avgCost)}`,
                `${r.covered}%`,
                r.uncovered,
                <RowAction key={r.ticker} text={r.uncovered > 0 ? 'Sell Calls' : 'All Covered'} />,
              ])}
            />
          </div>

          {/* Recent Events Timeline: Shows chronological list of recent trades */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Recent Events</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                '2025-10-27 Sold CC ASTS 85 @ 2.10',
                '2025-10-26 Sold CC OPEN 9 @ 0.24',
                '2025-10-25 Sold CSP LUMN 1.5 @ 0.05',
                '2025-10-24 ASTS Put Assigned @ 80',
              ].map((event, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                    }}
                  />
                  <span>{event}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ========== RIGHT COLUMN (Alerts & News) ========== */}
        {rightOpen && (
          <div style={styles.rightColumn}>
            {/* Alerts Panel: Time-sensitive notifications and action items */}
            <div style={styles.card}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <h3 style={styles.cardTitle}>Alerts Today</h3>
                <div style={styles.badge}>{alerts.length}</div>
              </div>
              {alerts.length === 0 && (
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                  No alerts. Enjoy your coffee.
                </div>
              )}
              {alerts.map(a => (
                <div key={a.id} style={styles.alert}>
                  <div style={styles.alertText}>{a.text}</div>
                  <div style={styles.alertActions}>
                    <button style={styles.alertButton}>Open {a.ticker}</button>
                    <button
                      style={{
                        ...styles.alertButton,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      }}
                    >
                      Suggest Action
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Market News Feed: Filtered news for portfolio tickers */}
            <NewsCard tickers={tickers} />

            {/* Database Snapshot: Developer tool for inspecting database state */}
            <div style={styles.card}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <h3 style={styles.cardTitle}>Database Snapshot</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button style={styles.button} onClick={() => setFullPreviewOpen(true)}>
                    Show
                  </button>
                  <button style={styles.button} onClick={fetchDbStats}>
                    Refresh
                  </button>
                </div>
              </div>
              {!db && (
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                  Database not initialized yet.
                </div>
              )}
              {db && dbStatsError && (
                <div style={{ fontSize: '14px', color: '#ef4444' }}>{dbStatsError}</div>
              )}
              {db && dbStats && (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginBottom: snapshotOpen ? '12px' : 0,
                    }}
                  >
                    <MetricCard label="Portfolios" value={`${dbStats.portfolios}`} />
                    <MetricCard label="Symbols" value={`${dbStats.symbols}`} />
                    <MetricCard label="Trades" value={`${dbStats.trades}`} />
                    <MetricCard label="Wheel Cycles" value={`${dbStats.wheel_cycles}`} />
                    <MetricCard label="Wheel Events" value={`${dbStats.wheel_events}`} />
                  </div>
                  {dbStats.sampleSymbols.length > 0 && snapshotOpen && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                        Sample symbols
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {dbStats.sampleSymbols.map(sym => (
                          <span
                            key={sym}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid #475569',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(15,23,42,0.7)',
                              fontSize: '12px',
                            }}
                          >
                            {sym}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Table Preview Selector: Choose which table to inspect */}
                  {snapshotOpen && (
                    <div
                      style={{
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Preview table:</div>
                      <select
                        value={selectedTable}
                        onChange={e => setSelectedTable(e.target.value as TableName)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'rgba(15,23,42,0.7)',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '13px',
                          width: '220px',
                        }}
                      >
                        <option value="trades">trades</option>
                        <option value="symbols">symbols</option>
                        <option value="portfolios">portfolios</option>
                        <option value="wheel_cycles">wheel_cycles</option>
                        <option value="wheel_events">wheel_events</option>
                      </select>
                    </div>
                  )}

                  {/* Table Preview Display: Shows rows from selected table */}
                  {snapshotOpen && (
                    <>
                      {tableError && (
                        <div style={{ fontSize: '13px', color: '#ef4444', marginTop: '8px' }}>
                          {tableError}
                        </div>
                      )}
                      {!tableError && (
                        <div
                          style={{
                            marginTop: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            overflowX: 'auto',
                            border: '1px solid #1e293b',
                            borderRadius: '12px',
                            width: '100%',
                          }}
                        >
                          <table
                            style={{
                              ...styles.table,
                              width: '100%',
                              minWidth: '800px',
                              tableLayout: 'auto',
                            }}
                          >
                            <thead style={styles.tableHeader}>
                              <tr>
                                {tableCols.map(c => (
                                  <th
                                    key={c}
                                    style={{
                                      ...styles.tableCell,
                                      position: 'sticky',
                                      top: 0,
                                      backgroundColor: 'rgba(15,23,42,0.8)',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableRows.map((row, i) => (
                                <tr
                                  key={i}
                                  style={{
                                    backgroundColor: i % 2 ? '#0f172a' : 'rgba(15, 23, 42, 0.4)',
                                  }}
                                >
                                  {tableCols.map(c => {
                                    const v = row[c];
                                    const text = v === null || v === undefined ? '' : String(v);
                                    return (
                                      <td
                                        key={c}
                                        style={{
                                          ...styles.tableCell,
                                          whiteSpace: 'nowrap',
                                          maxWidth: '200px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          fontSize: '12px',
                                        }}
                                      >
                                        {text}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                              {tableRows.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={tableCols.length}
                                    style={{
                                      ...styles.tableCell,
                                      color: '#94a3b8',
                                      textAlign: 'center',
                                    }}
                                  >
                                    No rows to display
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Full-Screen Table Preview Modal: Larger view for detailed inspection */}
            {fullPreviewOpen && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 'min(95vw, 1100px)',
                    height: '80vh',
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0' }}>
                      Table Preview: {selectedTable}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={selectedTable}
                        onChange={e => setSelectedTable(e.target.value as TableName)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'rgba(15,23,42,0.7)',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '13px',
                        }}
                      >
                        <option value="trades">trades</option>
                        <option value="symbols">symbols</option>
                        <option value="portfolios">portfolios</option>
                        <option value="wheel_cycles">wheel_cycles</option>
                        <option value="wheel_events">wheel_events</option>
                      </select>
                      <button style={styles.button} onClick={() => setFullPreviewOpen(false)}>
                        Close
                      </button>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    {tableError ? (
                      <div style={{ padding: '12px', color: '#ef4444' }}>{tableError}</div>
                    ) : (
                      <div style={{ padding: '12px' }}>
                        <div
                          style={{
                            border: '1px solid #1e293b',
                            borderRadius: '12px',
                            overflow: 'auto',
                          }}
                        >
                          <table style={{ ...styles.table, width: '100%', tableLayout: 'auto' }}>
                            <thead style={styles.tableHeader}>
                              <tr>
                                {tableCols.map(c => (
                                  <th
                                    key={c}
                                    style={{
                                      ...styles.tableCell,
                                      position: 'sticky',
                                      top: 0,
                                      backgroundColor: 'rgba(15,23,42,0.9)',
                                    }}
                                  >
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableRows.map((row, i) => (
                                <tr
                                  key={i}
                                  style={{
                                    backgroundColor: i % 2 ? '#0f172a' : 'rgba(15, 23, 42, 0.4)',
                                  }}
                                >
                                  {tableCols.map(c => {
                                    const v = row[c];
                                    const text = v === null || v === undefined ? '' : String(v);
                                    return (
                                      <td key={c} style={{ ...styles.tableCell }}>
                                        {text}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                              {tableRows.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={tableCols.length}
                                    style={{
                                      ...styles.tableCell,
                                      color: '#94a3b8',
                                      textAlign: 'center',
                                    }}
                                  >
                                    No rows to display
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Profit Targets: Visual display of profit capture progress for each call */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Profit Targets</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {currentPositions
                  .filter(p => p.type === 'C' && p.side === 'S')
                  .map(p => {
                    const pct = pctOfMaxProfitShortCall(p.entry, p.mark);
                    return (
                      <div
                        key={p.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                      >
                        <ProgressRing percent={pct} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>
                            {p.ticker} {p.type} {p.strike}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Target 60% • DTE {p.dte}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
