import React from 'react';

export interface HeatmapCell {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
}

export interface HeatmapProps {
  data: HeatmapCell[];
  xLabels: (string | number)[];
  yLabels: (string | number)[];
  colorScale?: (value: number, min: number, max: number) => string;
  cellSize?: number;
  onCellClick?: (cell: HeatmapCell) => void;
}

const defaultColorScale = (value: number, min: number, max: number): string => {
  const range = max - min || 1;
  const normalized = (value - min) / range;

  if (normalized < 0.33) {
    // Red scale for negative
    const intensity = normalized / 0.33;
    return `rgb(${255}, ${255 * (1 - intensity)}, ${255 * (1 - intensity)})`;
  } else if (normalized < 0.66) {
    // Yellow/neutral
    return `rgb(255, 255, 200)`;
  } else {
    // Green scale for positive
    const intensity = (normalized - 0.66) / 0.34;
    return `rgb(${255 * (1 - intensity)}, 255, ${255 * (1 - intensity)})`;
  }
};

export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  xLabels,
  yLabels,
  colorScale = defaultColorScale,
  cellSize = 40,
  onCellClick,
}) => {
  if (data.length === 0 || xLabels.length === 0 || yLabels.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
        <p className="text-sm text-zinc-500">No data to display</p>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const cellMap = new Map<string, HeatmapCell>();
  data.forEach(cell => {
    const key = `${cell.x}-${cell.y}`;
    cellMap.set(key, cell);
  });

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* X-axis labels */}
          <div className="flex">
            <div className="w-24" /> {/* Spacer for y-axis */}
            {xLabels.map((label, i) => (
              <div
                key={i}
                className="flex items-center justify-center text-xs text-zinc-400"
                style={{ width: cellSize }}
              >
                {String(label)}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div>
            {yLabels.map((yLabel, yIndex) => (
              <div key={yIndex} className="flex items-center">
                {/* Y-axis label */}
                <div className="w-24 pr-2 text-right text-xs text-zinc-400">{String(yLabel)}</div>
                {/* Cells */}
                {xLabels.map((xLabel, xIndex) => {
                  const key = `${xLabel}-${yLabel}`;
                  const cell = cellMap.get(key);
                  const value = cell?.value ?? 0;
                  const color = colorScale(value, minValue, maxValue);

                  return (
                    <div
                      key={xIndex}
                      onClick={() => cell && onCellClick?.(cell)}
                      className={`flex items-center justify-center text-xs font-semibold transition-all ${
                        cell && onCellClick ? 'cursor-pointer hover:scale-110 hover:shadow-lg' : ''
                      }`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: color,
                        color: Math.abs(value) > (maxValue - minValue) / 2 ? '#000' : '#fff',
                      }}
                      title={cell?.label || `Value: ${value.toFixed(2)}`}
                    >
                      {value !== 0 && value.toFixed(0)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-red-500" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-yellow-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-green-500" />
          <span>High</span>
        </div>
      </div>
    </div>
  );
};
