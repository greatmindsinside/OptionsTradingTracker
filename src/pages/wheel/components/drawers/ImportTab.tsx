import React, { useRef, useState } from 'react';
import { useCsvImport } from '@/pages/wheel/hooks/useCsvImport';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export const ImportTab: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const { handleImport } = useCsvImport();
  const importing = useWheelUIStore(s => s.importing);

  return (
    <div className="space-y-4" data-testid="drawer.import">
      <div className="text-sm text-zinc-400">Import trades from CSV to seed the Wheel data.</div>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async e => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            await handleImport(f);
          }}
        />
        <button
          className="px-3 py-2 rounded border border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
          onClick={() => inputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importing…' : 'Choose CSV'}
        </button>
        <div className="text-sm text-zinc-500 truncate max-w-60">
          {fileName || 'No file selected'}
        </div>
      </div>
      <div className="text-xs text-zinc-500">
        Tip: Use the sample file in public/sample-csv/sample-options.csv to test the flow.
      </div>
    </div>
  );
};
