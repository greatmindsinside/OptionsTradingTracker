import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import ChartContainer from '../ChartContainer';
import styles from './PortfolioChart.module.css';

interface PositionData {
  symbol: string;
  value: number;
  percentage: number;
  contracts: number;
  strategy: string;
  pnl: number;
  color?: string;
  [key: string]: string | number | undefined; // Add index signature for Recharts compatibility
}

interface PortfolioChartProps {
  data?: PositionData[];
  loading?: boolean;
  error?: string;
  view?: 'pie' | 'bar';
  onViewChange?: (view: 'pie' | 'bar') => void;
}

// Mock data for demonstration
const mockPortfolioData: PositionData[] = [
  {
    symbol: 'AAPL',
    value: 45000,
    percentage: 35.2,
    contracts: 15,
    strategy: 'Covered Call',
    pnl: 2500,
    color: '#1f77b4',
  },
  {
    symbol: 'MSFT',
    value: 32000,
    percentage: 25.0,
    contracts: 12,
    strategy: 'Cash-Secured Put',
    pnl: -800,
    color: '#ff7f0e',
  },
  {
    symbol: 'GOOGL',
    value: 20000,
    percentage: 15.6,
    contracts: 8,
    strategy: 'Long Call',
    pnl: 1200,
    color: '#2ca02c',
  },
  {
    symbol: 'TSLA',
    value: 18000,
    percentage: 14.1,
    contracts: 10,
    strategy: 'Iron Condor',
    pnl: -450,
    color: '#d62728',
  },
  {
    symbol: 'NVDA',
    value: 13000,
    percentage: 10.1,
    contracts: 6,
    strategy: 'Straddle',
    pnl: 750,
    color: '#9467bd',
  },
];

const formatCurrency = (value: number): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: PositionData;
  }>;
}

const PieTooltip: React.FC<PieTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipHeader}>
        <strong>{data.symbol}</strong>
        <span className={styles.strategyBadge}>{data.strategy}</span>
      </div>
      <div className={styles.tooltipContent}>
        <div className={styles.tooltipItem}>
          <span className={styles.tooltipLabel}>Value:</span>
          <span className={styles.tooltipValue}>{formatCurrency(data.value)}</span>
        </div>
        <div className={styles.tooltipItem}>
          <span className={styles.tooltipLabel}>Percentage:</span>
          <span className={styles.tooltipValue}>{formatPercentage(data.percentage)}</span>
        </div>
        <div className={styles.tooltipItem}>
          <span className={styles.tooltipLabel}>Contracts:</span>
          <span className={styles.tooltipValue}>{data.contracts}</span>
        </div>
        <div className={styles.tooltipItem}>
          <span className={styles.tooltipLabel}>P&L:</span>
          <span
            className={`${styles.tooltipValue} ${data.pnl >= 0 ? styles.positive : styles.negative}`}
          >
            {formatCurrency(data.pnl)}
          </span>
        </div>
      </div>
    </div>
  );
};

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
    payload: PositionData;
  }>;
  label?: string;
}

const BarTooltip: React.FC<BarTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipHeader}>
        <strong>{label}</strong>
        <span className={styles.strategyBadge}>{data.strategy}</span>
      </div>
      <div className={styles.tooltipContent}>
        <div className={styles.tooltipItem}>
          <div className={styles.tooltipDot} style={{ backgroundColor: payload[0].color }} />
          <span className={styles.tooltipLabel}>Value:</span>
          <span className={styles.tooltipValue}>{formatCurrency(payload[0].value)}</span>
        </div>
        <div className={styles.tooltipItem}>
          <span className={styles.tooltipLabel}>Contracts:</span>
          <span className={styles.tooltipValue}>{data.contracts}</span>
        </div>
        <div className={styles.tooltipItem}>
          <span className={styles.tooltipLabel}>P&L:</span>
          <span
            className={`${styles.tooltipValue} ${data.pnl >= 0 ? styles.positive : styles.negative}`}
          >
            {formatCurrency(data.pnl)}
          </span>
        </div>
      </div>
    </div>
  );
};

const PortfolioChart: React.FC<PortfolioChartProps> = ({
  data = mockPortfolioData,
  loading = false,
  error,
  view = 'pie',
  onViewChange,
}) => {
  const [showValues, setShowValues] = useState(true);

  // Debug logging
  console.log('PortfolioChart rendering with data:', data?.length, 'items, view:', view);
  console.log('Loading:', loading, 'Error:', error);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const totalPnL = data.reduce((sum, item) => sum + item.pnl, 0);

  const actions = (
    <div className={styles.controls}>
      <div className={styles.viewSelector}>
        <button
          className={`${styles.viewButton} ${view === 'pie' ? styles.active : ''}`}
          onClick={() => onViewChange?.('pie')}
        >
          🥧 Pie
        </button>
        <button
          className={`${styles.viewButton} ${view === 'bar' ? styles.active : ''}`}
          onClick={() => onViewChange?.('bar')}
        >
          📊 Bar
        </button>
      </div>
      <div className={styles.toggles}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showValues}
            onChange={e => setShowValues(e.target.checked)}
          />
          Show Values
        </label>
      </div>
    </div>
  );

  return (
    <ChartContainer
      title="Portfolio Composition"
      subtitle={`Total: ${formatCurrency(totalValue)} | P&L: ${formatCurrency(totalPnL)}`}
      loading={loading}
      error={error}
      height={400}
      actions={actions}
    >
      {view === 'pie' ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={showValues}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || `hsl(${index * 137.5}, 70%, 50%)`}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry) => <span style={{ color: entry.color }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="symbol"
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="value" name="Position Value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || `hsl(${index * 137.5}, 70%, 50%)`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
};

export default PortfolioChart;
