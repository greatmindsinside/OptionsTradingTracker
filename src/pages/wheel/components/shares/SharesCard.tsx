import React from 'react';

import { SharesTable } from './SharesTable';

export const SharesCard: React.FC = () => (
  <div className="rounded-2xl border border-green-500/20 bg-linear-to-br from-black/80 to-zinc-950/90 p-4 shadow-lg shadow-green-500/10 backdrop-blur-xl">
    <div className="mb-2 flex items-center justify-between">
      <div className="font-semibold text-green-400">📦 Shares</div>
      <button className="text-xs underline">Show</button>
    </div>
    <SharesTable />
  </div>
);
