import React from 'react';

import { fmt } from '@/utils/wheel-calculations';

import type { MinStrikeSnapshot } from './useHistoricalMinStrikes';

interface MinStrikeTableProps {
  data: MinStrikeSnapshot[];
}

export const MinStrikeTable: React.FC<MinStrikeTableProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-zinc-500">No historical data to display</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700/50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400">Date</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-400">Avg Cost</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-400">
              Premium Received
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-400">Min Strike</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-400">
              Shares Owned
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map(snapshot => (
            <tr
              key={snapshot.id}
              className="border-b border-zinc-800/30 transition-colors hover:bg-zinc-800/20"
            >
              <td className="px-3 py-2 text-zinc-300">{snapshot.date}</td>
              <td className="px-3 py-2 text-right text-zinc-300">${fmt(snapshot.avg_cost, 2)}</td>
              <td className="px-3 py-2 text-right text-zinc-300">
                ${fmt(snapshot.premium_received, 2)}
              </td>
              <td className="px-3 py-2 text-right font-medium text-[#F5B342]">
                ${fmt(snapshot.min_strike, 2)}
              </td>
              <td className="px-3 py-2 text-right text-zinc-300">
                {Math.round(snapshot.shares_owned)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
