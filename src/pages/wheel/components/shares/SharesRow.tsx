import React from 'react';

export const SharesRow: React.FC<{
  t: string;
  shares: number;
  covered: number;
  uncovered: number;
  avg: number;
  onOpen: () => void;
}> = ({ t, shares, covered, uncovered, avg, onOpen }) => (
  <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr] items-center gap-6 rounded px-2 py-1 text-zinc-300 hover:bg-zinc-950/60">
    <button
      className="text-left text-green-400 underline transition-colors hover:text-green-300"
      onClick={onOpen}
    >
      {t}
    </button>
    <div className="text-right tabular-nums">{shares}</div>
    <div className="text-right tabular-nums">{covered}</div>
    <div className="text-right tabular-nums">{uncovered}</div>
    <div className="text-right tabular-nums">${avg.toFixed(2)}</div>
  </div>
);
