/**
 * ImportTab Component
 *
 * PURPOSE:
 * Provides CSV file import functionality to bulk-load option trades into the journal.
 * Allows users to import historical trades from CSV files instead of entering them manually.
 *
 * HOW IT WORKS:
 * - Uses hidden file input to accept .csv files
 * - Delegates import logic to useCsvImport hook (handles parsing, validation, database insertion)
 * - Displays import results (success/failure, count of imported/skipped/errors)
 * - Shows loading state while import is in progress
 * - Clears file input after successful import
 *
 * INTERACTIONS:
 * - Parent: ActionsDrawer (rendered when actionsTab === 'Import')
 * - Import logic: useCsvImport hook (handles file parsing and database operations)
 * - Loading state: useWheelUIStore.importing (prevents multiple simultaneous imports)
 * - File format: Expects CSV with columns matching sample-options.csv format
 * - Database: useCsvImport persists entries via useEntriesStore
 *
 * DATA FLOW:
 * 1. User clicks "Choose CSV" → hidden file input triggered
 * 2. User selects file → handleFileChange() called
 * 3. useCsvImport.handleImport() processes file → parses CSV, validates rows, creates entries
 * 4. Import result displayed (success/failure, counts)
 * 5. If successful, file input cleared and importing flag reset
 * 6. Wheel data automatically refreshes (via useEntriesStore updates triggering reloads)
 *
 * FILE FORMAT:
 * - Sample file: public/sample-csv/sample-options.csv
 * - Expected columns: symbol, type, side, qty, strike, premium, expiration, fees, etc.
 * - Invalid rows are skipped with error messages
 */

import React, { useRef, useState } from 'react';

import { type ImportResult, useCsvImport } from '@/pages/wheel/hooks/useCsvImport';
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
      <div className="text-sm text-slate-400">Import trades from CSV to seed the Wheel data.</div>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          className="rounded border border-teal-500 bg-teal-500/15 px-3 py-2 text-teal-400 transition-colors hover:bg-teal-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => inputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importing…' : 'Choose CSV'}
        </button>
        <div className="max-w-60 truncate text-sm text-slate-400">
          {fileName || 'No file selected'}
        </div>
      </div>

      {/* Import Result Display */}
      {importResult && (
        <div
          className={`rounded border p-3 text-sm ${
            importResult.success
              ? 'border-teal-500/50 bg-teal-500/10 text-teal-400'
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

      <div className="text-xs text-slate-400">
        Tip: Use the sample file in public/sample-csv/sample-options.csv to test the flow.
      </div>
    </div>
  );
};
