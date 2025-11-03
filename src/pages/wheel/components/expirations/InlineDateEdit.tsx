import React, { useEffect, useState } from 'react';

export const InlineDateEdit: React.FC<{ date: string; onSave: (ymd: string) => void }> = ({
  date,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(date);
  useEffect(() => setVal(date), [date]);
  if (!editing)
    return (
      <button
        className="text-xs px-2 py-1 rounded border border-green-500/30 hover:border-green-400/50 transition-colors text-green-400"
        onClick={() => setEditing(true)}
      >
        📝 Edit
      </button>
    );
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        className="text-xs px-2 py-1 rounded bg-zinc-950/60 border border-green-500/30 text-green-400"
        value={val}
        onChange={e => setVal(e.target.value)}
      />
      <button
        className="text-xs px-2 py-1 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
        onClick={() => {
          onSave(val);
          setEditing(false);
        }}
      >
        Save
      </button>
      <button
        className="text-xs px-2 py-1 rounded border border-zinc-600 text-zinc-400 hover:border-zinc-500 transition-colors"
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
    </div>
  );
};
