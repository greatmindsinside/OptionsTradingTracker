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
        className="rounded border border-green-500/30 px-2 py-1 text-xs text-green-400 transition-colors hover:border-green-400/50"
        onClick={() => setEditing(true)}
      >
        📝 Edit
      </button>
    );
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        className="rounded border border-green-500/30 bg-zinc-950/60 px-2 py-1 text-xs text-green-400"
        value={val}
        onChange={e => setVal(e.target.value)}
      />
      <button
        className="rounded border border-green-500 bg-green-500/15 px-2 py-1 text-xs text-green-400 transition-colors hover:bg-green-500/25"
        onClick={() => {
          onSave(val);
          setEditing(false);
        }}
      >
        Save
      </button>
      <button
        className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500"
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
    </div>
  );
};
