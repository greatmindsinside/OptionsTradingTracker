import React from 'react';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 60,
  height = 20,
  color = '#22c55e',
  strokeWidth = 1.5,
}) => {
  if (data.length === 0) {
    return <div className="text-xs text-zinc-500">—</div>;
  }

  if (data.length === 1) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <circle cx={width / 2} cy={height / 2} r={2} fill={color} />
      </svg>
    );
  }

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minY = Math.min(...data);
  const maxY = Math.max(...data);
  const yRange = maxY - minY || 1;

  // Convert to SVG coordinates
  const points = data.map((y, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
    const yCoord = padding + chartHeight - ((y - minY) / yRange) * chartHeight;
    return { x, y: yCoord };
  });

  // Create path for line
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={1.5}
          fill={color}
        />
      )}
    </svg>
  );
};
