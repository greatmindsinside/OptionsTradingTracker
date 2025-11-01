/**
 * Import Module Index
 * Exports all import-related services and types
 */

// CSV Parser
export { CSVParser } from './csv-parser';
export type { CSVParseOptions, CSVParseResult, ImportError, ImportResult } from './csv-parser';

// Broker Adapters
export {
  BrokerAdapterRegistry,
  brokerRegistry,
  getBrokerAdapter,
  detectBrokerFromHeaders,
  getAllSupportedBrokers,
  TDAmeritradeBrokerAdapter,
  SchwabBrokerAdapter,
  RobinhoodBrokerAdapter,
  EtradeBrokerAdapter,
  InteractiveBrokersBrokerAdapter,
} from './broker-adapters';

export type {
  BaseBrokerAdapter,
  BrokerType,
  BrokerDetectionResult,
  RawTradeData,
  NormalizedTradeData,
  AdaptationResult,
} from './broker-adapters/base-adapter';

// Validation Service
export { ImportValidationService, DEFAULT_VALIDATION_OPTIONS } from './validation-service';

export type {
  ValidationError,
  ValidationWarning,
  TradeValidationResult,
  BatchValidationResult,
  ValidationOptions,
} from './validation-service';

// Symbol Service
export { SymbolNormalizationService, DEFAULT_NORMALIZATION_OPTIONS } from './symbol-service';

export type {
  SymbolLookupResult,
  SymbolCreationRequest,
  SymbolNormalizationResult,
  BatchSymbolResult,
  SymbolNormalizationOptions,
} from './symbol-service';

// Progress Tracking
export {
  ImportProgressTracker,
  ImportProgressFactory,
  ProgressFormatter,
} from './progress-tracker';

export type {
  ImportProgress,
  ImportError as ProgressImportError,
  ImportWarning,
  ImportSummary,
  ProgressCallback,
} from './progress-tracker';

// Note: Batch Import orchestrator available but needs integration with TradeDAO
// All individual components are fully functional and ready for use
