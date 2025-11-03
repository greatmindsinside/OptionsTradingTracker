import React from 'react';
import { SharesTable } from './SharesTable';

export const SharesCard: React.FC = () => (
  <div className="rounded-2xl border border-green-500/20 bg-linear-to-br from-black/80 to-zinc-950/90 backdrop-blur-xl p-4 shadow-lg shadow-green-500/10">
    <div className="flex items-center justify-between mb-2">
      <div className="text-green-400 font-semibold">📦 Shares</div>
      <button className="text-xs underline">Show</button>
    </div>
    <SharesTable />
  </div>
);
