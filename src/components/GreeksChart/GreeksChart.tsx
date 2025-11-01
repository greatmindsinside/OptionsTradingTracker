import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import ChartContainer from '../ChartContainer';
import styles from './GreeksChart.module.css';

interface GreeksDataPoint {
  symbol: string;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  position: 'long' | 'short';
  contracts: number;
}

interface GreeksChartProps {
  data?: GreeksDataPoint[];
  loading?: boolean;
  error?: string;
  selectedGreek?: 'delta' | 'gamma' | 'theta' | 'vega' | 'rho';
  onGreekChange?: (greek: 'delta' | 'gamma' | 'theta' | 'vega' | 'rho') => void;
}

// Mock data for demonstration
const mockGreeksData: GreeksDataPoint[] = [
  {
    symbol: 'AAPL',
    delta: 0.65,
    gamma: 0.12,
    theta: -0.25,
    vega: 0.18,
    rho: 0.08,
    position: 'long',
    contracts: 5,
  },
  {
    symbol: 'MSFT',
    delta: -0.45,
    gamma: 0.08,
    theta: -0.15,
    vega: 0.12,
    rho: -0.05,
    position: 'short',
    contracts: 3,
  },
  {
    symbol: 'GOOGL',
    delta: 0.35,
    gamma: 0.15,
    theta: -0.35,
    vega: 0.22,
    rho: 0.12,
    position: 'long',
    contracts: 2,
  },
  {
    symbol: 'TSLA',
    delta: -0.25,
    gamma: 0.2,
    theta: -0.45,
    vega: 0.3,
    rho: -0.08,
    position: 'short',
    contracts: 4,
  },
  {
    symbol: 'NVDA',
    delta: 0.55,
    gamma: 0.18,
    theta: -0.2,
    vega: 0.25,
    rho: 0.15,
    position: 'long',
    contracts: 6,
  },
];

const greekMetrics = [
  {
    key: 'delta' as const,
    label: 'Delta',
    description: 'Price sensitivity to underlying asset',
    color: 'var(--color-primary-500)',
    format: (value: number) => value.toFixed(3),
  },
  {
    key: 'gamma' as const,
    label: 'Gamma',
    description: 'Rate of change of delta',
    color: 'var(--color-success-500)',
    format: (value: number) => value.toFixed(3),
  },
  {
    key: 'theta' as const,
    label: 'Theta',
    description: 'Time decay sensitivity',
    color: 'var(--color-danger-500)',
    format: (value: number) => value.toFixed(3),
  },
  {
    key: 'vega' as const,
    label: 'Vega',
    description: 'Volatility sensitivity',
    color: 'var(--color-warning-500)',
    format: (value: number) => value.toFixed(3),
  },
  {
    key: 'rho' as const,
    label: 'Rho',
    description: 'Interest rate sensitivity',
    color: 'var(--color-info-500)',
    format: (value: number) => value.toFixed(3),
  },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
    payload: GreeksDataPoint;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const metric = greekMetrics.find(m => m.key === payload[0].name.toLowerCase());

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipHeader}>
        <strong>{label}</strong>
        <span className={`${styles.positionBadge} ${styles[data.position]}`}>
          {data.position.toUpperCase()} ({data.contracts} contracts)
        </span>
      </div>
      <div className={styles.tooltipContent}>
        <div className={styles.tooltipItem}>
          <div className={styles.tooltipDot} style={{ backgroundColor: payload[0].color }} />
          <span className={styles.tooltipLabel}>{payload[0].name}:</span>
          <span className={styles.tooltipValue}>
            {metric?.format(payload[0].value) || payload[0].value.toFixed(3)}
          </span>
        </div>
        {metric && <div className={styles.tooltipDescription}>{metric.description}</div>}
      </div>
    </div>
  );
};

const getBarColor = (value: number, baseColor: string) => {
  return value >= 0 ? baseColor : 'var(--color-danger-500)';
};

const GreeksChart: React.FC<GreeksChartProps> = ({
  data = mockGreeksData,
  loading = false,
  error,
  selectedGreek = 'delta',
  onGreekChange,
}) => {
  const [showNegativeAsRed] = useState(true);

  // Debug logging
  console.log(
    'GreeksChart rendering with data:',
    data?.length,
    'items, selectedGreek:',
    selectedGreek
  );
  console.log('Loading:', loading, 'Error:', error);

  const selectedMetric = greekMetrics.find(m => m.key === selectedGreek);

  const actions = (
    <div className={styles.controls}>
      <div className={styles.greekSelector}>
        {greekMetrics.map(metric => (
          <button
            key={metric.key}
            className={`${styles.greekButton} ${selectedGreek === metric.key ? styles.active : ''}`}
            style={{
              backgroundColor: selectedGreek === metric.key ? metric.color : 'transparent',
              borderColor: metric.color,
              color: selectedGreek === metric.key ? 'white' : metric.color,
            }}
            onClick={() => onGreekChange?.(metric.key)}
            title={metric.description}
          >
            {metric.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ChartContainer
      title="Greeks Analysis"
      subtitle={selectedMetric ? selectedMetric.description : 'Position Greeks breakdown'}
      loading={loading}
      error={error}
      height={350}
      actions={actions}
    >
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
            tickFormatter={value => selectedMetric?.format(value) || value.toFixed(3)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          <ReferenceLine y={0} stroke="var(--color-text-secondary)" strokeDasharray="2 2" />

          <Bar
            dataKey={selectedGreek}
            name={selectedMetric?.label || selectedGreek}
            radius={[2, 2, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  showNegativeAsRed
                    ? getBarColor(
                        entry[selectedGreek],
                        selectedMetric?.color || 'var(--color-primary-500)'
                      )
                    : selectedMetric?.color || 'var(--color-primary-500)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default GreeksChart;
