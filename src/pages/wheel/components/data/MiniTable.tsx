import React from 'react';

export const MiniTable: React.FC<{
  title: string;
  cols: string[];
  rows: (string | number)[][];
}> = ({ title, cols, rows }) => (
  <div className="rounded-xl border border-green-500/20 bg-zinc-950/40 p-3">
    <div className="font-semibold mb-2 text-green-400">{title}</div>
    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols.length},minmax(0,1fr))` }}>
      {cols.map(c => (
        <div key={c} className="text-xs text-zinc-500 pb-1">
          {c}
        </div>
      ))}
      {rows.map((r, i) =>
        r.map((cell, j) => (
          <div key={`${i}-${j}`} className="text-sm py-1 border-t border-zinc-800 text-zinc-300">
            {cell}
          </div>
        ))
      )}
      {rows.length === 0 && <div className="col-span-full text-sm text-zinc-600 py-2">No rows</div>}
    </div>
  </div>
);
