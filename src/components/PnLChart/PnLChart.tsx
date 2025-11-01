import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import ChartContainer from '../ChartContainer';
import styles from './PnLChart.module.css';

interface PnLDataPoint {
  date: string;
  timestamp: number;
  totalPnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  portfolioValue: number;
}

interface PnLChartProps {
  data?: PnLDataPoint[];
  loading?: boolean;
  error?: string;
  timeRange?: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
  onTimeRangeChange?: (range: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL') => void;
}

// Mock data for demonstration - showing P&L progression over time
const mockPnLData: PnLDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const baseDate = new Date('2024-10-01');
  const date = new Date(baseDate);
  date.setDate(date.getDate() + i);

  // Create realistic P&L progression with some volatility
  const baseValue = 100000;
  const dayMultiplier = i * 0.01; // Small upward trend
  const volatility = Math.sin(i * 0.3) * 0.02 + (Math.random() - 0.5) * 0.015; // Some volatility

  const portfolioValue = baseValue * (1 + dayMultiplier + volatility);
  const totalPnL = portfolioValue - baseValue;
  const realizedPnL = totalPnL * (0.6 + Math.sin(i * 0.2) * 0.2); // Varying realized portion
  const unrealizedPnL = totalPnL - realizedPnL;

  return {
    date: date.toISOString().split('T')[0],
    timestamp: date.getTime(),
    totalPnL: Math.round(totalPnL * 100) / 100,
    realizedPnL: Math.round(realizedPnL * 100) / 100,
    unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
    portfolioValue: Math.round(portfolioValue * 100) / 100,
  };
});

const formatCurrency = (value: number): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
};

const formatTooltipCurrency = (value: number): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipHeader}>
        <strong>{new Date(label || '').toLocaleDateString()}</strong>
      </div>
      <div className={styles.tooltipContent}>
        {payload.map((entry, index: number) => (
          <div key={index} className={styles.tooltipItem}>
            <div className={styles.tooltipDot} style={{ backgroundColor: entry.color }} />
            <span className={styles.tooltipLabel}>{entry.name}:</span>
            <span
              className={`${styles.tooltipValue} ${
                entry.value >= 0 ? styles.positive : styles.negative
              }`}
            >
              {formatTooltipCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PnLChart: React.FC<PnLChartProps> = ({
  data = mockPnLData,
  loading = false,
  error,
  timeRange = '1M',
  onTimeRangeChange,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'total' | 'realized' | 'unrealized'>(
    'total'
  );

  // Debug logging
  console.log('PnLChart rendering with data:', data?.length, 'items');
  console.log('Loading:', loading, 'Error:', error);
  console.log('Sample data point:', data?.[0]);

  const timeRanges = [
    { key: '1D' as const, label: '1D' },
    { key: '1W' as const, label: '1W' },
    { key: '1M' as const, label: '1M' },
    { key: '3M' as const, label: '3M' },
    { key: '1Y' as const, label: '1Y' },
    { key: 'ALL' as const, label: 'ALL' },
  ];

  const metrics = [
    { key: 'total' as const, label: 'Total P&L', color: '#2563eb' },
    { key: 'realized' as const, label: 'Realized P&L', color: '#10b981' },
    { key: 'unrealized' as const, label: 'Unrealized P&L', color: '#f59e0b' },
  ];

  const actions = (
    <div className={styles.controls}>
      <div className={styles.timeRangeSelector}>
        {timeRanges.map(range => (
          <button
            key={range.key}
            className={`${styles.timeButton} ${timeRange === range.key ? styles.active : ''}`}
            onClick={() => onTimeRangeChange?.(range.key)}
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className={styles.metricSelector}>
        {metrics.map(metric => (
          <button
            key={metric.key}
            className={`${styles.metricButton} ${
              selectedMetric === metric.key ? styles.active : ''
            }`}
            style={{
              backgroundColor: selectedMetric === metric.key ? metric.color : 'transparent',
              borderColor: metric.color,
              color: selectedMetric === metric.key ? 'white' : metric.color,
            }}
            onClick={() => setSelectedMetric(metric.key)}
          >
            {metric.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ChartContainer
      title="Portfolio Performance"
      subtitle="Profit & Loss over time"
      loading={loading}
      error={error}
      height={400}
      actions={actions}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#666' }}
            axisLine={{ stroke: '#e0e0e0' }}
            tickLine={{ stroke: '#e0e0e0' }}
            tickFormatter={value =>
              new Date(value).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            }
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#666' }}
            axisLine={{ stroke: '#e0e0e0' }}
            tickLine={{ stroke: '#e0e0e0' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />

          <ReferenceLine y={0} stroke="#888" strokeDasharray="2 2" />

          {selectedMetric === 'total' && (
            <Line
              type="monotone"
              dataKey="totalPnL"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#2563eb' }}
              name="Total P&L"
            />
          )}

          {selectedMetric === 'realized' && (
            <Line
              type="monotone"
              dataKey="realizedPnL"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
              name="Realized P&L"
            />
          )}

          {selectedMetric === 'unrealized' && (
            <Line
              type="monotone"
              dataKey="unrealizedPnL"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b' }}
              name="Unrealized P&L"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default PnLChart;
