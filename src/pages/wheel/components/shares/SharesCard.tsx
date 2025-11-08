import { Icon } from '@iconify/react';
import React from 'react';

import { SharesTable } from './SharesTable';

export const SharesCard: React.FC = () => (
  <div className="glass-card rounded-2xl p-4">
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2 font-semibold text-slate-100">
        <Icon
          icon="fluent:box-multiple-24-filled"
          className="h-4 w-4"
          style={{ color: '#F5B342' }}
        />
        Shares
      </div>
      <button className="text-xs text-emerald-400 underline hover:text-emerald-300">Show</button>
    </div>
    <SharesTable />
  </div>
);
