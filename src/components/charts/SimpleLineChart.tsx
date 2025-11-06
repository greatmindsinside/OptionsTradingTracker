import React from 'react';

export interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
}

export interface SimpleLineChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showLabels?: boolean;
  title?: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  width = 400,
  height = 200,
  color = '#22c55e',
  showLabels = true,
  title,
}) => {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
        <p className="text-sm text-zinc-500">No data to display</p>
      </div>
    );
  }

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Normalize data
  const xValues = data.map(d => typeof d.x === 'number' ? d.x : 0);
  const yValues = data.map(d => d.y);
  
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues, 0);
  const maxY = Math.max(...yValues);
  
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;

  // Convert to SVG coordinates
  const points = data.map((d, i) => {
    const x = typeof d.x === 'number' 
      ? padding + ((d.x - minX) / xRange) * chartWidth
      : padding + (i / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((d.y - minY) / yRange) * chartHeight;
    return { x, y, label: d.label };
  });

  // Create path for line
  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  // Create area path
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">{title}</h3>
      )}
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {showLabels && (
          <>
            {[0, 0.25, 0.5, 0.75, 1].map(t => {
              const y = padding + chartHeight * (1 - t);
              return (
                <line
                  key={`grid-${t}`}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="rgba(113, 113, 122, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              );
            })}
          </>
        )}

        {/* Area fill */}
        <path
          d={areaPath}
          fill={color}
          fillOpacity="0.2"
        />

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill={color}
              stroke="rgba(0, 0, 0, 0.5)"
              strokeWidth="1"
            />
            {showLabels && point.label && (
              <text
                x={point.x}
                y={point.y - 8}
                fill={color}
                fontSize="10"
                textAnchor="middle"
                className="fill-zinc-400"
              >
                {point.label}
              </text>
            )}
          </g>
        ))}

        {/* Y-axis labels */}
        {showLabels && (
          <>
            {[0, 0.25, 0.5, 0.75, 1].map(t => {
              const y = padding + chartHeight * (1 - t);
              const value = minY + (maxY - minY) * t;
              return (
                <text
                  key={`y-label-${t}`}
                  x={padding - 10}
                  y={y + 4}
                  fill="rgba(161, 161, 170, 0.8)"
                  fontSize="10"
                  textAnchor="end"
                >
                  {value.toFixed(0)}
                </text>
              );
            })}
          </>
        )}

        {/* X-axis labels */}
        {showLabels && data.length > 0 && data.length <= 10 && (
          <>
            {points.map((point, i) => {
              const label = typeof data[i].x === 'string' ? data[i].x : String(data[i].x);
              return (
                <text
                  key={`x-label-${i}`}
                  x={point.x}
                  y={height - padding + 20}
                  fill="rgba(161, 161, 170, 0.8)"
                  fontSize="10"
                  textAnchor="middle"
                  transform={`rotate(-45 ${point.x} ${height - padding + 20})`}
                >
                  {label}
                </text>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
};

