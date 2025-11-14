/**
 * Batch Import Orchestrator
 * Main service that orchestrates the complete CSV import workflow
 *
 * Note: This is a simplified interface for the batch import system.
 * The core components (CSV parser, broker adapters, validation, symbol service,
 * and progress tracking) are fully implemented in their respective modules.
 */

import { PortfolioDAO } from '../db/portfolio-dao';
import type { SQLiteDatabase } from '../db/sqlite';
import { SymbolDAO } from '../db/symbol-dao';
import { type DatabaseTrade, TradeDAO } from '../db/trade-dao';
import type { Portfolio } from '../db/validation';
import {
  type BrokerDetectionResult,
  type BrokerType,
  detectBrokerFromHeaders,
  getBrokerAdapter,
} from './broker-adapters';
import type {
  BaseBrokerAdapter,
  NormalizedTradeData,
  RawTradeData,
} from './broker-adapters/base-adapter';
import { CSVParser, type CSVParseResult } from './csv-parser';
import {
  ImportProgressFactory,
  ImportProgressTracker,
  type ProgressCallback,
} from './progress-tracker';
import {
  type BatchSymbolResult,
  type SymbolNormalizationOptions,
  SymbolNormalizationService,
} from './symbol-service';
import {
  type BatchValidationResult,
  ImportValidationService,
  type TradeValidationResult,
  type ValidationOptions,
} from './validation-service';

/**
 * Import configuration
 */
export interface ImportConfig {
  portfolioId: number;

  // Detection options
  autoDetectBroker: boolean;
  forceBrokerType?: BrokerType;

  // Processing options
  validation: Partial<ValidationOptions>;
  symbolNormalization: Partial<SymbolNormalizationOptions>;

  // Performance options
  batchSize: number; // Records to process in each batch
  maxConcurrency: number; // Maximum concurrent operations
  progressUpdateInterval: number; // Progress update frequency (ms)

  // Error handling
  stopOnError: boolean; // Stop import on first error
  maxErrors: number; // Maximum errors before stopping
  skipInvalidRecords: boolean; // Skip invalid records and continue
}

/**
 * Default import configuration
 */
export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  portfolioId: 0,
  autoDetectBroker: true,
  validation: {
    strictMode: false,
    allowPartialData: true,
    symbolValidation: {
      requireExisting: false,
      autoNormalize: true,
    },
  },
  symbolNormalization: {
    autoCreate: true,
    validateFormat: true,
    updateExisting: false,
    cacheResults: true,
    maxCacheSize: 1000,
  },
  batchSize: 100,
  maxConcurrency: 5,
  progressUpdateInterval: 1000,
  stopOnError: false,
  maxErrors: 100,
  skipInvalidRecords: true,
};

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  importId: string;

  // Processing summary
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;

  // Timing
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds

  // Detection results
  detectedBroker?: BrokerType;
  brokerConfidence?: number;

  // Validation results
  validationSummary: BatchValidationResult;

  // Symbol processing results
  symbolSummary: BatchSymbolResult;

  // Errors and warnings
  errors: Array<{
    recordIndex: number;
    error: string;
    code: string;
  }>;
  warnings: Array<{
    recordIndex: number;
    warning: string;
  }>;

  // Final status
  status: 'completed' | 'partial' | 'failed' | 'cancelled';
  message: string;
}

/**
 * Main batch import service
 */
export class BatchImportService {
  private portfolioDAO: PortfolioDAO;
  private tradeDAO: TradeDAO;
  private symbolDAO: SymbolDAO;
  private csvParser: CSVParser;
  private validationService: ImportValidationService;
  private symbolService: SymbolNormalizationService;

  constructor(database: SQLiteDatabase) {
    this.portfolioDAO = new PortfolioDAO(database);
    this.tradeDAO = new TradeDAO(database);
    this.symbolDAO = new SymbolDAO(database);
    this.csvParser = new CSVParser();
    this.validationService = new ImportValidationService();
    this.symbolService = new SymbolNormalizationService(database);
  }

  /**
   * Import trades from CSV string
   */
  async importFromString(
    csvContent: string,
    config: Partial<ImportConfig> = {},
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    const fullConfig = { ...DEFAULT_IMPORT_CONFIG, ...config };
    const importId = this.generateImportId();

    try {
      // Phase 1: Parse CSV
      const parseResult = await this.parseCSV(csvContent, importId);

      // Phase 2: Import the parsed data
      return await this.importParsedData(parseResult, fullConfig, importId, onProgress);
    } catch (error) {
      return this.createErrorResult(
        importId,
        `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Import trades from file
   */
  async importFromFile(
    file: File,
    config: Partial<ImportConfig> = {},
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    const fullConfig = { ...DEFAULT_IMPORT_CONFIG, ...config };
    const importId = this.generateImportId();

    try {
      // Phase 1: Parse CSV file
      const parseResult = await this.parseCSVFile(file, importId);

      // Phase 2: Import the parsed data
      return await this.importParsedData(parseResult, fullConfig, importId, onProgress);
    } catch (error) {
      console.error('❌ Import from file failed:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message, error.stack);
      }
      return this.createErrorResult(
        importId,
        `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Preview import without saving to database
   */
  async previewImport(
    csvContent: string,
    config: Partial<ImportConfig> = {}
  ): Promise<{
    preview: NormalizedTradeData[];
    detectedBroker?: BrokerType;
    brokerConfidence?: number;
    validationSummary: BatchValidationResult;
    errors: string[];
  }> {
    const fullConfig = { ...DEFAULT_IMPORT_CONFIG, ...config };

    try {
      // Parse CSV
      const parseResult = await this.csvParser.parseFromString(csvContent);

      if (parseResult.errors.length > 0 || parseResult.data.length === 0) {
        throw new Error(parseResult.errors.map(e => e.message).join('; ') || 'Failed to parse CSV');
      }

      // Detect broker
      const detection = await this.detectBroker(parseResult.meta.fields || [], fullConfig);

      if (!detection.adapter) {
        throw new Error('Could not detect broker format or unsupported format');
      }

      // Normalize data (limited preview)
      const previewData = parseResult.data.slice(0, 10) as Record<string, unknown>[]; // First 10 records for preview
      const normalizedData = await this.normalizeData(previewData, detection.adapter);

      // Validate data
      this.validationService.setOptions(fullConfig.validation);
      const validationSummary = this.validationService.validateBatch(normalizedData);

      return {
        preview: normalizedData,
        detectedBroker: detection.result?.broker,
        brokerConfidence: detection.result?.confidence,
        validationSummary,
        errors: [],
      };
    } catch (error) {
      return {
        preview: [],
        validationSummary: {
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          results: [],
          summary: {
            commonErrors: [],
            commonWarnings: [],
          },
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Parse CSV content
   */
  private async parseCSV(csvContent: string, importId: string): Promise<CSVParseResult> {
    const tracker = ImportProgressFactory.create(importId, 0);
    tracker.setPhase('Parsing CSV');
    tracker.setStatus('parsing');

    const result = await this.csvParser.parseFromString(csvContent);

    // Only fail on critical parsing errors, not warnings
    const criticalErrors = result.errors.filter(
      error => error.type === 'Quotes' || error.type === 'Delimiter'
      // Note: FieldMismatch errors are common in real CSV files and should be tolerated
    );

    if (criticalErrors.length > 0) {
      console.warn(
        '⚠️ CSV parsing warnings:',
        result.errors.filter(e => !criticalErrors.includes(e))
      );
      throw new Error(
        criticalErrors.map(e => e.message).join('; ') ||
          'Failed to parse CSV due to critical errors'
      );
    }

    if (result.errors.length > 0) {
      console.warn(
        '⚠️ CSV parsing warnings (non-critical):',
        result.errors.map(e => e.message)
      );
    }

    return result;
  }

  /**
   * Parse CSV file
   */
  private async parseCSVFile(file: File, importId: string): Promise<CSVParseResult> {
    const tracker = ImportProgressFactory.create(importId, 0);
    tracker.setPhase('Parsing CSV file');
    tracker.setStatus('parsing');

    const result = await this.csvParser.parseFromFile(file);

    // Only fail on critical parsing errors, not warnings
    console.log('📄 CSV parsing result:', {
      dataRows: result.data.length,
      errorCount: result.errors.length,
      errors: result.errors.map(e => ({
        type: e.type,
        code: e.code,
        message: e.message,
        row: e.row,
      })),
      meta: result.meta,
      headers: result.meta.fields,
      sampleData: result.data.slice(0, 3),
    });

    const criticalErrors = result.errors.filter(
      error => error.type === 'Quotes' || error.type === 'Delimiter'
      // Note: FieldMismatch errors are common in real CSV files and should be tolerated
    );

    if (criticalErrors.length > 0) {
      console.warn(
        '⚠️ CSV parsing warnings:',
        result.errors.filter(e => !criticalErrors.includes(e))
      );
      throw new Error(
        criticalErrors.map(e => e.message).join('; ') ||
          'Failed to parse CSV due to critical errors'
      );
    }

    if (result.errors.length > 0) {
      console.warn(
        '⚠️ CSV parsing warnings (non-critical):',
        result.errors.map(e => e.message)
      );
    }

    return result;
  }

  /**
   * Import parsed CSV data
   */
  private async importParsedData(
    parseResult: CSVParseResult,
    config: ImportConfig,
    importId: string,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    const startTime = new Date();
    const totalRecords = parseResult.data.length;

    // Create progress tracker
    const tracker = ImportProgressFactory.create(importId, totalRecords);
    if (onProgress) {
      tracker.onProgress(onProgress);
    }
    tracker.startPerformanceTracking(config.progressUpdateInterval);

    try {
      // Validate portfolio exists
      await this.validatePortfolio(config.portfolioId);

      // Phase 1: Detect broker
      tracker.setPhase('Detecting broker format');
      const headers = parseResult.meta.fields || [];
      console.log('🔍 CSV headers for broker detection:', headers);
      const detection = await this.detectBroker(headers, config);
      console.log('🏦 Broker detection result:', detection);

      if (!detection.adapter) {
        console.error('❌ No broker adapter found. Detection result:', detection);
        throw new Error('Could not detect broker format or unsupported format');
      }

      // Phase 2: Normalize data
      tracker.setPhase('Normalizing trade data');
      const normalizedData = await this.normalizeData(
        parseResult.data as Record<string, unknown>[],
        detection.adapter
      );

      // Phase 3: Validate data
      tracker.setPhase('Validating trade data');
      this.validationService.setOptions(config.validation);
      const validationResult = this.validationService.validateBatch(normalizedData);

      // Phase 4: Process symbols
      tracker.setPhase('Processing symbols');
      this.symbolService.setOptions(config.symbolNormalization);
      const symbolResult = await this.symbolService.normalizeBatchFromTrades(normalizedData);

      // Phase 5: Import valid trades
      tracker.setPhase('Importing trades to database');
      tracker.setStatus('importing');

      const importStats = await this.importValidTrades(
        validationResult.results,
        config,
        tracker,
        importId
      );

      // Complete
      const endTime = new Date();
      tracker.setStatus('completed');

      return {
        success: true,
        importId,
        totalRecords,
        processedRecords: importStats.processed,
        successfulRecords: importStats.successful,
        failedRecords: importStats.failed,
        skippedRecords: importStats.skipped,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        detectedBroker: detection.result?.broker,
        brokerConfidence: detection.result?.confidence,
        validationSummary: validationResult,
        symbolSummary: symbolResult,
        errors: importStats.errors,
        warnings: importStats.warnings,
        status: this.determineStatus(importStats),
        message: this.createStatusMessage(importStats),
      };
    } catch (error) {
      console.error('❌ Import parsed data failed:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message, error.stack);
      }
      tracker.setStatus('failed');
      throw error;
    }
  }

  /**
   * Detect broker from headers
   */
  private async detectBroker(
    headers: string[],
    config: ImportConfig
  ): Promise<{
    result: BrokerDetectionResult | null;
    adapter: BaseBrokerAdapter | null;
  }> {
    console.log('🔍 Detecting broker with config:', {
      forceBrokerType: config.forceBrokerType,
      autoDetectBroker: config.autoDetectBroker,
    });

    if (config.forceBrokerType) {
      console.log('🎯 Using forced broker type:', config.forceBrokerType);
      const adapter = getBrokerAdapter(config.forceBrokerType);
      console.log('🏦 Forced broker adapter found:', !!adapter);
      return {
        result: adapter
          ? {
              broker: config.forceBrokerType,
              confidence: 1.0,
              reason: 'Forced broker type',
              requiredColumns: adapter.requiredColumns,
              foundColumns: headers,
            }
          : null,
        adapter,
      };
    }

    if (config.autoDetectBroker) {
      console.log('🤖 Auto-detecting broker from headers:', headers);
      const detection = detectBrokerFromHeaders(headers);
      console.log('🔍 Auto-detection result:', detection);
      if (detection) {
        const adapter = getBrokerAdapter(detection.broker);
        console.log('🏦 Adapter found for detected broker:', !!adapter);
        return { result: detection, adapter };
      }
    }

    console.log('❌ No broker detected');
    return { result: null, adapter: null };
  }

  /**
   * Normalize raw data using broker adapter
   */
  private async normalizeData(
    rawData: Record<string, unknown>[],
    adapter: BaseBrokerAdapter
  ): Promise<NormalizedTradeData[]> {
    const normalizedData: NormalizedTradeData[] = [];

    for (const row of rawData) {
      // Convert to RawTradeData format expected by adapter
      const rawTradeData: RawTradeData = {};
      for (const [key, value] of Object.entries(row)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          value instanceof Date ||
          value === null ||
          value === undefined
        ) {
          rawTradeData[key] = value as string | number | Date | null | undefined;
        }
      }

      const result = adapter.adaptRow(rawTradeData);
      if (result.success && result.data) {
        normalizedData.push(result.data);
      }
    }

    return normalizedData;
  }

  /**
   * Convert normalized trade data to database trade format
   */
  private async convertToDbTrade(
    normalizedData: NormalizedTradeData,
    portfolioId: number,
    importBatchId: string
  ): Promise<Omit<DatabaseTrade, 'id' | 'created_at' | 'updated_at'>> {
    // Get or create symbol using the find-or-create method
    let symbolId: number;

    try {
      const symbol = await this.symbolDAO.findOrCreate({
        symbol: normalizedData.symbol,
        name: normalizedData.symbol_info?.name || normalizedData.symbol,
        asset_type: normalizedData.symbol_info?.asset_type || 'stock',
        exchange: normalizedData.symbol_info?.exchange || undefined,
        sector: normalizedData.symbol_info?.sector || undefined,
        industry: normalizedData.symbol_info?.industry || undefined,
      });

      if (!symbol || !symbol.id) {
        throw new Error(`Failed to find or create symbol ${normalizedData.symbol}: no ID returned`);
      }

      symbolId = symbol.id;
    } catch (error) {
      console.error(`❌ Symbol lookup/creation failed for ${normalizedData.symbol}:`, error);
      throw error;
    }

    // Map action strings
    const actionMap: Record<
      string,
      'BUY_TO_OPEN' | 'SELL_TO_OPEN' | 'BUY_TO_CLOSE' | 'SELL_TO_CLOSE'
    > = {
      buy_to_open: 'BUY_TO_OPEN',
      sell_to_open: 'SELL_TO_OPEN',
      buy_to_close: 'BUY_TO_CLOSE',
      sell_to_close: 'SELL_TO_CLOSE',
    };

    // Map option type strings
    const optionTypeMap: Record<string, 'CALL' | 'PUT'> = {
      call: 'CALL',
      put: 'PUT',
    };

    return {
      portfolio_id: portfolioId,
      symbol_id: symbolId,
      trade_date: normalizedData.trade_date,
      settlement_date: null, // Not provided in normalized data
      order_id: null,
      execution_id: null,
      action: actionMap[normalizedData.trade_action] || 'BUY_TO_OPEN',
      instrument_type: 'OPTION', // Assuming options for now
      quantity: normalizedData.quantity,
      price: normalizedData.premium,
      fees: normalizedData.fees,
      commissions: normalizedData.commission,
      option_type: optionTypeMap[normalizedData.option_type] || 'CALL',
      strike_price: normalizedData.strike_price,
      expiration_date: normalizedData.expiration_date,
      multiplier: 100,
      strategy_id: null,
      notes: normalizedData.notes || null,
      tags: null,
      import_source: 'csv_file',
      import_batch_id: importBatchId,
    };
  }

  /**
   * Import valid trades to database
   */
  private async importValidTrades(
    validationResults: TradeValidationResult[],
    config: ImportConfig,
    tracker: ImportProgressTracker,
    importId: string
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: Array<{ recordIndex: number; error: string; code: string }>;
    warnings: Array<{ recordIndex: number; warning: string }>;
  }> {
    const stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ recordIndex: number; error: string; code: string }>,
      warnings: [] as Array<{ recordIndex: number; warning: string }>,
    };

    const validTrades = validationResults.filter(r => r.isValid);

    console.log(
      `🔍 Validation results: Total=${validationResults.length}, Valid=${validTrades.length}`
    );
    if (validTrades.length === 0 && validationResults.length > 0) {
      console.log('❌ No valid trades found! First few validation errors:');
      validationResults.slice(0, 3).forEach((r, i) => {
        console.log(`Trade ${i} details:`);
        console.log('  isValid:', r.isValid);
        console.log('  errors:', JSON.stringify(r.errors, null, 2));
        console.log('  warnings:', JSON.stringify(r.warnings, null, 2));
        console.log('  hasData:', !!r.data);
      });
    }

    // Process in batches
    for (let i = 0; i < validTrades.length; i += config.batchSize) {
      const batch = validTrades.slice(i, i + config.batchSize);

      for (const validationResult of batch) {
        try {
          if (!validationResult.data) {
            throw new Error('No trade data in validation result');
          }

          console.log(
            `🔄 Processing trade ${stats.processed + 1}: ${validationResult.data.symbol}`
          );

          // Convert normalized data to database format
          let dbTrade;
          try {
            dbTrade = await this.convertToDbTrade(
              validationResult.data,
              config.portfolioId,
              importId
            );
            console.log(
              `✅ Converted to DB format: ${JSON.stringify({ symbol_id: dbTrade.symbol_id, action: dbTrade.action })}`
            );
          } catch (error) {
            console.error(
              `❌ convertToDbTrade failed for ${validationResult.data.symbol}:`,
              error instanceof Error ? error.message : error
            );
            throw error;
          }

          // Insert trade into database
          const createResult = await this.tradeDAO.create(dbTrade);

          if (!createResult.success) {
            console.error(`❌ Trade insertion failed:`, createResult.error);
            console.error(`Trade data:`, JSON.stringify(dbTrade, null, 2));
            throw new Error(`Failed to create trade: ${createResult.error}`);
          }

          stats.successful++;
          tracker.recordSuccess(stats.processed);
        } catch (error) {
          stats.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          stats.errors.push({
            recordIndex: stats.processed,
            error: errorMsg,
            code: 'import_error',
          });
          tracker.recordFailure(stats.processed, {
            message: errorMsg,
            code: 'import_error',
            severity: 'error',
          });
        }

        stats.processed++;

        // Check error limits
        if (config.stopOnError && stats.failed > 0) {
          break;
        }

        if (stats.failed >= config.maxErrors) {
          break;
        }
      }
    }

    return stats;
  }

  /**
   * Validate portfolio exists
   */
  private async validatePortfolio(portfolioId: number): Promise<Portfolio> {
    const result = await this.portfolioDAO.findById(portfolioId);
    if (!result.success || !result.data) {
      throw new Error(`Portfolio with ID ${portfolioId} not found`);
    }
    return result.data;
  }

  /**
   * Generate unique import ID
   */
  private generateImportId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create error result
   */
  private createErrorResult(importId: string, error: string): ImportResult {
    const now = new Date();
    return {
      success: false,
      importId,
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      skippedRecords: 0,
      startTime: now,
      endTime: now,
      duration: 0,
      validationSummary: {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        results: [],
        summary: { commonErrors: [], commonWarnings: [] },
      },
      symbolSummary: {
        totalSymbols: 0,
        existingSymbols: 0,
        createdSymbols: 0,
        failures: 0,
        results: new Map(),
        errors: [],
      },
      errors: [{ recordIndex: -1, error, code: 'import_error' }],
      warnings: [],
      status: 'failed',
      message: error,
    };
  }

  /**
   * Determine final import status
   */
  private determineStatus(stats: {
    successful: number;
    failed: number;
    processed: number;
  }): 'completed' | 'partial' | 'failed' {
    // In simulation mode (no actual database persistence), consider it completed if no failures
    if (stats.failed === 0) return 'completed';
    if (stats.successful === 0) return 'failed';
    return 'partial';
  }

  /**
   * Create status message
   */
  private createStatusMessage(stats: {
    successful: number;
    failed: number;
    processed: number;
  }): string {
    if (stats.successful === stats.processed) {
      return `Successfully imported ${stats.successful} trades`;
    }

    if (stats.successful === 0) {
      return `Failed to import any trades (${stats.failed} errors)`;
    }

    return `Partially completed: ${stats.successful} successful, ${stats.failed} failed`;
  }
}
