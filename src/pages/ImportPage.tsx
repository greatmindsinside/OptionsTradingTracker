import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface ImportResults {
  totalRows: number;
  imported: number;
  skipped: number;
  errors: number;
}

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    console.log('File selection event:', selectedFile);
    console.log('File type:', selectedFile?.type);
    console.log('File name:', selectedFile?.name);

    if (selectedFile) {
      // Accept any CSV file, regardless of MIME type
      if (
        selectedFile.name.toLowerCase().endsWith('.csv') ||
        selectedFile.type === 'text/csv' ||
        selectedFile.type === 'application/vnd.ms-excel'
      ) {
        setFile(selectedFile);
        setImportStatus('idle');
        console.log('✅ File selected successfully:', selectedFile.name, selectedFile.size);
        console.log(
          '📊 Component state - file:',
          !!selectedFile,
          'importing:',
          false,
          'status:',
          'idle'
        );
        console.log('📊 File object:', selectedFile);
      } else {
        console.log('❌ Invalid file type:', selectedFile.type, 'for file:', selectedFile.name);
        alert('Please select a valid CSV file.');
      }
    } else {
      console.log('❌ No file selected');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportStatus('idle');

    try {
      // Import the actual CSV processing modules
      const { BatchImportService } = await import('../modules/import/batch-import');

      console.log('🚀 Starting real CSV import process...');

      // Initialize the actual database
      const { initDatabase } = await import('../modules/db/sqlite');
      const db = await initDatabase();
      console.log('💾 Database initialized');

      console.log('📄 Starting file import for:', file.name, 'size:', file.size, 'bytes');

      // Ensure we have a default portfolio for imports
      const { PortfolioDAO } = await import('../modules/db/portfolio-dao');
      const portfolioDAO = new PortfolioDAO(db);

      // Try to find existing portfolio or create a default one
      let portfolioId = 1;
      console.log('🔍 Looking for existing portfolio with ID:', portfolioId);
      const existingPortfolio = await portfolioDAO.findById(portfolioId);
      console.log('📊 Existing portfolio check result:', existingPortfolio);

      if (!existingPortfolio.success) {
        console.log('📝 No existing portfolio found, creating default portfolio...');
        const createResult = await portfolioDAO.create({
          name: 'Default Portfolio',
          broker: 'robinhood',
          account_type: 'cash',
          description: 'Auto-created portfolio for CSV imports',
          is_active: true,
        });

        console.log('📊 Portfolio creation result:', createResult);

        if (createResult.success && createResult.data) {
          portfolioId = createResult.data.id!;
          console.log('✅ Created default portfolio with ID:', portfolioId);

          // Persist the portfolio to storage immediately
          console.log('💾 Persisting portfolio to storage...');
          await db.persist();
          console.log('✅ Portfolio persisted to storage');

          // Verify the portfolio was actually created
          const verifyResult = await portfolioDAO.findById(portfolioId);
          console.log('🔍 Verification check:', verifyResult);
        } else {
          console.error('❌ Failed to create default portfolio:', createResult.error);
          throw new Error('Failed to create default portfolio');
        }
      } else {
        console.log('✅ Using existing portfolio with ID:', portfolioId);
        console.log('📊 Existing portfolio data:', existingPortfolio.data);
      }

      // Import the data using batch import service
      const importService = new BatchImportService(db);
      const results = await importService.importFromFile(file, {
        portfolioId: portfolioId,
        autoDetectBroker: true,
        forceBrokerType: 'robinhood', // Will be auto-detected by the service
        stopOnError: false,
        skipInvalidRecords: true,
      });

      console.log('✅ Import completed:', results);

      // Persist all imported data to storage
      console.log('💾 Persisting imported data to storage...');
      await db.persist();
      console.log('✅ Data persisted to storage');

      // Debug: Check if portfolio still exists after import
      console.log('🔍 Checking portfolio persistence after import...');
      const postImportPortfolioCheck = await portfolioDAO.findById(portfolioId);
      console.log('📊 Post-import portfolio check:', postImportPortfolioCheck);

      // Debug: Check all portfolios
      const allPortfolios = await portfolioDAO.findAllWithTradeCounts();
      console.log('📋 All portfolios after import:', allPortfolios);

      // Set real import results
      setImportResults({
        totalRows: results.totalRecords,
        imported: results.successfulRecords,
        skipped: results.skippedRecords,
        errors: results.failedRecords,
      });

      setImportStatus(results.success ? 'success' : 'error');

      // Emit data update event to notify other components
      if (results.success) {
        const { dataUpdateEmitter } = await import('../utils/data-events');
        dataUpdateEmitter.emit('trades_imported', results);
        console.log('📡 Emitted trades_imported event');

        // Analyze imported trades for wheel patterns and create wheel cycles
        try {
          console.log('🎡 Starting wheel cycle analysis after import...');
          const { createMockWheelCycles } = await import('../utils/mock-wheel-creator');
          const wheelResults = await createMockWheelCycles(db);
          console.log(
            '✅ Created',
            wheelResults.cyclesCreated,
            'wheel cycles from imported trades'
          );
        } catch (error) {
          console.warn('⚠️ Wheel cycle analysis failed:', error);
        }
      }

      // Log success for debugging
      console.log('🎉 CSV import completed!', {
        totalRows: results.totalRecords,
        imported: results.successfulRecords,
        skipped: results.skippedRecords,
        errors: results.failedRecords,
        status: results.status,
        message: results.message,
      });
    } catch (error) {
      console.error('❌ Import failed:', error);
      setImportStatus('error');

      // For development, show more detailed error
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImporting(false);
    setImportStatus('idle');
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadSampleFile = () => {
    const sampleData = `date,instrument,description,trans_code,quantity,price,total_amount,settlement_date
2024-01-15,AAPL Call $185.00 01/26/24,AAPL 185.00 Call 01/26/24,BUY_TO_OPEN,1,5.50,-550.00,2024-01-17
2024-01-26,AAPL Call $185.00 01/26/24,AAPL 185.00 Call 01/26/24,SELL_TO_CLOSE,1,2.30,230.00,2024-01-30`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-options.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Import Trades</h1>
        <p className="text-lg text-gray-600">
          Upload your broker CSV files to import options trades into your portfolio.
        </p>
      </div>

      {/* Sample File Download */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Need a sample file?</h3>
            <p className="text-sm text-blue-700 mb-3">
              Download our sample CSV file to see the expected format for your broker data.
            </p>
            <button
              onClick={downloadSampleFile}
              className="inline-flex items-center px-4 py-3 border-2 border-blue-500 shadow-lg text-base font-semibold rounded-lg text-blue-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
            >
              <Download className="w-5 h-5 mr-2" />
              📥 Download Sample CSV
            </button>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center mb-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv"
          className="hidden"
        />

        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />

        {!file ? (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h3>
            <p className="text-gray-600 mb-4">
              Select your Robinhood, TD Ameritrade, or other broker CSV file
            </p>
            <button
              onClick={handleUploadClick}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </button>
            <p className="text-xs text-gray-400 mt-4">DEBUG: No file selected</p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">File Selected</h3>
              <p className="text-gray-600 mb-4">
                <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </p>
              <p className="text-xs text-gray-500 mb-4">
                DEBUG: Status: {importStatus} | Importing: {importing ? 'Yes' : 'No'} | File exists:{' '}
                {!!file}
              </p>
              <p className="text-xs text-red-500 mb-4">DEBUG: About to render buttons section</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 mb-4 border-2 border-red-500 p-4 bg-yellow-100">
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full sm:w-auto px-8 py-4 bg-green-600 text-white font-semibold text-lg rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg border-2 border-green-800"
              >
                {importing ? '⏳ Importing...' : '📊 Import Trades'}
              </button>

              <button
                onClick={handleReset}
                disabled={importing}
                className="w-full sm:w-auto px-8 py-4 bg-gray-500 text-white font-semibold text-lg rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg border-2 border-gray-700"
              >
                🔄 Reset
              </button>
            </div>

            <p className="text-center text-sm text-gray-700 mt-4">
              File: {file?.name} | Ready to import
            </p>
          </div>
        )}
      </div>

      {/* Import Results */}
      {importStatus === 'success' && importResults && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-900 mb-1">Import Successful!</h3>
              <div className="text-sm text-green-700">
                <p>Total rows processed: {importResults.totalRows}</p>
                <p>Successfully imported: {importResults.imported}</p>
                <p>Skipped: {importResults.skipped}</p>
                <p>Errors: {importResults.errors}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {importStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900 mb-1">Import Failed</h3>
              <p className="text-sm text-red-700">
                There was an error processing your file. Please check the format and try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supported Brokers */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Supported Brokers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">Robinhood</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">TD Ameritrade</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">Charles Schwab</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-700">E*TRADE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
