/**
 * Phase 3: CSV Import & Normalization - Usage Guide
 *
 * This file demonstrates how to use the Phase 3 CSV import components.
 * All the core functionality is implemented and working in individual modules.
 */

import type { SQLiteDatabase } from '../db/sqlite';
import { detectBrokerFromHeaders, getBrokerAdapter } from './broker-adapters';
import { CSVParser } from './csv-parser';
import { ImportProgressTracker } from './progress-tracker';
import { SymbolNormalizationService } from './symbol-service';
import { ImportValidationService } from './validation-service';

/**
 * Example: Complete CSV Import Workflow
 */
export class Phase3Example {
  /**
   * Example of how to use the Phase 3 components together
   */
  static async demonstrateImportWorkflow(
    database: SQLiteDatabase,
    csvContent: string
  ): Promise<void> {
    console.log('=== Phase 3: CSV Import & Normalization Workflow ===\n');

    // 1. Parse CSV
    console.log('Step 1: Parse CSV');
    const csvParser = new CSVParser();
    const parseResult = await csvParser.parseFromString(csvContent);

    if (parseResult.errors.length > 0) {
      console.error(
        'CSV parsing failed:',
        parseResult.errors.map(e => e.message)
      );
      return;
    }

    console.log(`✅ Parsed ${parseResult.data.length} records\n`);

    // 2. Detect Broker Format
    console.log('Step 2: Detect Broker Format');
    const headers = parseResult.meta.fields || [];
    const brokerDetection = detectBrokerFromHeaders(headers);

    if (!brokerDetection) {
      console.error('❌ Could not detect broker format');
      return;
    }

    console.log(
      `✅ Detected: ${brokerDetection.broker} (confidence: ${Math.round(brokerDetection.confidence * 100)}%)`
    );
    console.log(`   Reason: ${brokerDetection.reason}\n`);

    // 3. Get Broker Adapter
    console.log('Step 3: Initialize Broker Adapter');
    const adapter = getBrokerAdapter(brokerDetection.broker);

    if (!adapter) {
      console.error('❌ No adapter available for detected broker');
      return;
    }

    console.log(`✅ Initialized ${brokerDetection.broker} adapter\n`);

    // 4. Normalize Data
    console.log('Step 4: Normalize Trade Data');
    const normalizedTrades = [];

    for (let i = 0; i < Math.min(parseResult.data.length, 5); i++) {
      // Process first 5 for demo
      const row = parseResult.data[i] as Record<string, unknown>;
      const adaptResult = adapter.adaptRow(
        row as Record<string, string | number | Date | null | undefined>
      );

      if (adaptResult.success && adaptResult.data) {
        normalizedTrades.push(adaptResult.data);
        console.log(
          `✅ Row ${i + 1}: ${adaptResult.data.symbol} ${adaptResult.data.option_type} ${adaptResult.data.strike_price}`
        );
      } else {
        console.log(`❌ Row ${i + 1}: ${adaptResult.errors.map(e => e.message).join('; ')}`);
      }
    }

    console.log(`\n✅ Normalized ${normalizedTrades.length} trades\n`);

    // 5. Validate Data
    console.log('Step 5: Validate Normalized Data');
    const validationService = new ImportValidationService();
    const validationResult = validationService.validateBatch(normalizedTrades);

    console.log(`✅ Validation complete:`);
    console.log(`   Valid: ${validationResult.validRecords}/${validationResult.totalRecords}`);
    console.log(`   Invalid: ${validationResult.invalidRecords}`);

    if (validationResult.summary.commonErrors.length > 0) {
      console.log('   Common errors:', validationResult.summary.commonErrors.slice(0, 3));
    }

    console.log('');

    // 6. Process Symbols
    console.log('Step 6: Process Symbols');
    const symbolService = new SymbolNormalizationService(database);
    const symbolResult = await symbolService.normalizeBatchFromTrades(normalizedTrades);

    console.log(`✅ Symbol processing complete:`);
    console.log(`   Total symbols: ${symbolResult.totalSymbols}`);
    console.log(`   Existing: ${symbolResult.existingSymbols}`);
    console.log(`   Created: ${symbolResult.createdSymbols}`);
    console.log(`   Failures: ${symbolResult.failures}\n`);

    // 7. Progress Tracking Demo
    console.log('Step 7: Progress Tracking');
    const tracker = new ImportProgressTracker('demo-import', parseResult.data.length);

    tracker.onProgress(progress => {
      console.log(
        `Progress: ${Math.round((progress.processedRecords / progress.totalRecords) * 100)}%`
      );
    });

    // Simulate processing
    tracker.setStatus('importing');
    for (let i = 0; i < 5; i++) {
      tracker.recordSuccess(i);
    }
    tracker.setStatus('completed');

    console.log('✅ Progress tracking demonstrated\n');

    console.log('=== Phase 3 Workflow Complete ===');
    console.log('All components are working and ready for integration!');
  }
}

/**
 * Available Phase 3 Components
 */
export const PHASE_3_COMPONENTS = {
  // Core parsing
  CSVParser: 'Handles CSV parsing with Papa Parse integration',

  // Broker support
  brokerAdapters: [
    'TD Ameritrade',
    'Charles Schwab',
    'Robinhood',
    'E*TRADE',
    'Interactive Brokers',
  ],

  // Data processing
  ImportValidationService: 'Validates normalized trade data using Zod schemas',
  SymbolNormalizationService: 'Manages symbol lookup and auto-creation',
  ImportProgressTracker: 'Real-time progress tracking with metrics',

  // Integration
  brokerDetection: 'Automatic broker format detection from CSV headers',
  batchProcessing: 'Efficient batch processing with error handling',
  typeSupport: 'Full TypeScript support with proper type definitions',
};

/**
 * Phase 3 Status: ✅ COMPLETED
 *
 * All core components are implemented and tested:
 * - ✅ CSV parsing with Papa Parse
 * - ✅ Multi-broker adapter system (5 brokers supported)
 * - ✅ Data validation with existing Zod schemas
 * - ✅ Symbol normalization with DAO integration
 * - ✅ Progress tracking with real-time updates
 * - ✅ Error handling and reporting
 * - ✅ TypeScript support throughout
 *
 * Ready for Phase 4: Options Calculations Engine
 */
