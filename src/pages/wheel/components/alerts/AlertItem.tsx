import React from 'react';

export const AlertItem: React.FC<{ text: string; onOpen: () => void }> = ({ text, onOpen }) => (
  <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/40 p-2 text-sm">
    <span>{text}</span>
    <button className="text-xs underline" onClick={onOpen}>
      Open
    </button>
  </div>
);
