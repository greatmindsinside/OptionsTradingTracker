import React, { useRef, useState } from 'react';

import { type ImportResult,useCsvImport } from '@/pages/wheel/hooks/useCsvImport';
import { useWheelUIStore } from '@/stores/useWheelUIStore';

export const ImportTab: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { handleImport } = useCsvImport();
  const importing = useWheelUIStore(s => s.importing);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setImportResult(null); // Clear previous result
    
    try {
      const result = await handleImport(f);
      setImportResult(result);
      
      // Clear file input after successful import
      if (result.success && inputRef.current) {
        inputRef.current.value = '';
        setFileName('');
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        imported: 0,
        skipped: 0,
        errors: 1,
      });
    }
  };

  return (
    <div className="space-y-4" data-testid="drawer.import">
      <div className="text-sm text-zinc-400">Import trades from CSV to seed the Wheel data.</div>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          className="rounded border border-green-500 bg-green-500/15 px-3 py-2 text-green-400 transition-colors hover:bg-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => inputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importing…' : 'Choose CSV'}
        </button>
        <div className="max-w-60 truncate text-sm text-zinc-500">
          {fileName || 'No file selected'}
        </div>
      </div>

      {/* Import Result Display */}
      {importResult && (
        <div
          className={`rounded border p-3 text-sm ${
            importResult.success
              ? 'border-green-500/50 bg-green-500/10 text-green-400'
              : 'border-red-500/50 bg-red-500/10 text-red-400'
          }`}
        >
          <div className="font-medium">
            {importResult.success ? '✓ Import Successful' : '✗ Import Failed'}
          </div>
          <div className="mt-1 text-xs opacity-90">{importResult.message}</div>
          {importResult.imported > 0 && (
            <div className="mt-2 text-xs">
              <div>Imported: {importResult.imported} trade(s)</div>
              {importResult.skipped > 0 && <div>Skipped: {importResult.skipped} row(s)</div>}
              {importResult.errors > 0 && <div>Errors: {importResult.errors}</div>}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-zinc-500">
        Tip: Use the sample file in public/sample-csv/sample-options.csv to test the flow.
      </div>
    </div>
  );
};
