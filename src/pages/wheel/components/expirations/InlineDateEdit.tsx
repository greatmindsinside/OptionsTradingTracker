import React, { useEffect, useState } from 'react';

import { todayYMD } from '@/utils/wheel-calculations';

interface InlineDateEditProps {
  date: string;
  onSave: (ymd: string) => void;
  isEditing?: boolean;
  onCancel?: () => void;
}

export const InlineDateEdit: React.FC<InlineDateEditProps> = ({
  date,
  onSave,
  isEditing: controlledEditing,
  onCancel,
}) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const [val, setVal] = useState(date);
  useEffect(() => setVal(date), [date]);

  // Use controlled editing if provided, otherwise use internal state
  const editing = controlledEditing !== undefined ? controlledEditing : internalEditing;

  const handleSave = () => {
    onSave(val);
    if (controlledEditing === undefined) {
      setInternalEditing(false);
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleCancel = () => {
    setVal(date); // Reset to original value
    if (controlledEditing === undefined) {
      setInternalEditing(false);
    } else if (onCancel) {
      onCancel();
    }
  };

  if (!editing)
    return (
      <button
        className="rounded border border-green-500/30 px-2 py-1 text-xs text-green-400 transition-colors hover:border-green-400/50"
        onClick={() => {
          if (controlledEditing === undefined) {
            setInternalEditing(true);
          }
        }}
        title="Edit expiration date"
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
        min={todayYMD()}
      />
      <button
        className="rounded border border-green-500 bg-green-500/15 px-2 py-1 text-xs text-green-400 transition-colors hover:bg-green-500/25"
        onClick={handleSave}
      >
        Save
      </button>
      <button
        className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500"
        onClick={handleCancel}
      >
        Cancel
      </button>
    </div>
  );
};
