import React from 'react';

export const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-green-500/20 bg-zinc-950/40 p-3">
    <div className="text-xs text-zinc-500">{label}</div>
    <div className="text-lg font-semibold text-green-400">{value}</div>
  </div>
);
