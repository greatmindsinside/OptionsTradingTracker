import React, { useMemo } from 'react';

import { type ChartDataPoint,SimpleLineChart } from '@/components/charts/SimpleLineChart';

import type { MinStrikeSnapshot } from './useHistoricalMinStrikes';

interface MinStrikeChartProps {
  data: MinStrikeSnapshot[];
  showAvgCost?: boolean;
}

export const MinStrikeChart: React.FC<MinStrikeChartProps> = ({ data, showAvgCost = false }) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    // Convert snapshots to chart data points
    // X-axis: date (as string for now, could be converted to timestamp)
    // Y-axis: min_strike (and optionally avg_cost)
    const points: ChartDataPoint[] = data.map(snapshot => ({
      x: snapshot.date,
      y: snapshot.min_strike,
      label: `Min Strike: $${snapshot.min_strike.toFixed(2)}`,
    }));

    return points;
  }, [data]);

  const avgCostData = useMemo(() => {
    if (!showAvgCost || data.length === 0) return [];

    return data.map(snapshot => ({
      x: snapshot.date,
      y: snapshot.avg_cost,
      label: `Avg Cost: $${snapshot.avg_cost.toFixed(2)}`,
    }));
  }, [data, showAvgCost]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-900/30 p-4">
        <p className="text-sm text-zinc-500">No historical data to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SimpleLineChart
        data={chartData}
        width={600}
        height={250}
        color="#F5B342"
        showLabels={true}
        title="Minimum Strike Over Time"
      />
      {showAvgCost && avgCostData.length > 0 && (
        <SimpleLineChart
          data={avgCostData}
          width={600}
          height={250}
          color="#22c55e"
          showLabels={true}
          title="Average Cost Over Time"
        />
      )}
    </div>
  );
};
