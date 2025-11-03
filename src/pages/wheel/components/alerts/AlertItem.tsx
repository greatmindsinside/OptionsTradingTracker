import React from 'react';

export const AlertItem: React.FC<{ text: string; onOpen: () => void }> = ({ text, onOpen }) => (
  <div className="text-sm p-2 rounded border border-slate-700 bg-slate-900/40 flex items-center justify-between">
    <span>{text}</span>
    <button className="text-xs underline" onClick={onOpen}>
      Open
    </button>
  </div>
);
