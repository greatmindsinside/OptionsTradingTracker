import { Icon } from '@iconify/react';
import React, { useMemo,useState } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';

import { MinStrikeChart } from './MinStrikeChart';
import { MinStrikeTable } from './MinStrikeTable';
import { useHistoricalMinStrikes } from './useHistoricalMinStrikes';

export const HistoricalMinStrikesCard: React.FC = () => {
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const positions = useWheelStore(s => s.positions);
  const lots = useWheelStore(s => s.lots);

  // Get unique tickers that have shares or covered calls
  const availableTickers = useMemo(() => {
    const tickerSet = new Set<string>();
    lots.forEach(lot => tickerSet.add(lot.ticker));
    positions.filter(p => p.type === 'C' && p.side === 'S').forEach(p => tickerSet.add(p.ticker));
    return Array.from(tickerSet).sort();
  }, [lots, positions]);

  // Load historical data for selected ticker (or all if none selected)
  const { data, loading, error } = useHistoricalMinStrikes(selectedTicker || undefined);

  // Filter data by selected ticker if one is selected
  const filteredData = useMemo(() => {
    if (!selectedTicker) return data;
    return data.filter(snapshot => snapshot.ticker === selectedTicker);
  }, [data, selectedTicker]);

  return (
    <div className="glass-card-deep rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-100">
          <Icon
            icon="fluent:chart-line-24-filled"
            className="h-4 w-4"
            style={{ color: '#F5B342' }}
          />
          Historical Min Strikes
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('chart')}
            className={`rounded px-2 py-1 text-xs font-semibold transition-all ${
              viewMode === 'chart'
                ? 'border border-[#F5B342]/40 bg-[#F5B342]/20 text-[#F5B342]'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`rounded px-2 py-1 text-xs font-semibold transition-all ${
              viewMode === 'table'
                ? 'border border-[#F5B342]/40 bg-[#F5B342]/20 text-[#F5B342]'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {availableTickers.length > 0 && (
        <div className="mb-4">
          <select
            value={selectedTicker}
            onChange={e => setSelectedTicker(e.target.value)}
            className="rounded border border-zinc-700/50 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-200 focus:border-[#F5B342]/50 focus:ring-1 focus:ring-[#F5B342]/50 focus:outline-none"
          >
            <option value="">All Tickers</option>
            {availableTickers.map(ticker => (
              <option key={ticker} value={ticker}>
                {ticker}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="py-8 text-center text-sm text-zinc-500">Loading historical data...</div>
      )}

      {error && (
        <div className="py-4 text-center text-sm text-red-400">Error loading data: {error}</div>
      )}

      {!loading && !error && (
        <>
          {viewMode === 'chart' ? (
            <MinStrikeChart data={filteredData} showAvgCost={true} />
          ) : (
            <MinStrikeTable data={filteredData} />
          )}
        </>
      )}
    </div>
  );
};
