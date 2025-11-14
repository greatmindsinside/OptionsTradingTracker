/**
 * Import Module Index
 * Exports all import-related services and types
 */

// CSV Parser
export type { CSVParseOptions, CSVParseResult, ImportError, ImportResult } from './csv-parser';
export { CSVParser } from './csv-parser';

// Broker Adapters
export {
  BrokerAdapterRegistry,
  brokerRegistry,
  detectBrokerFromHeaders,
  EtradeBrokerAdapter,
  getAllSupportedBrokers,
  getBrokerAdapter,
  InteractiveBrokersBrokerAdapter,
  RobinhoodBrokerAdapter,
  SchwabBrokerAdapter,
  TDAmeritradeBrokerAdapter,
} from './broker-adapters';
export type {
  AdaptationResult,
  BaseBrokerAdapter,
  BrokerDetectionResult,
  BrokerType,
  NormalizedTradeData,
  RawTradeData,
} from './broker-adapters/base-adapter';

// Validation Service
export type {
  BatchValidationResult,
  TradeValidationResult,
  ValidationError,
  ValidationOptions,
  ValidationWarning,
} from './validation-service';
export { DEFAULT_VALIDATION_OPTIONS, ImportValidationService } from './validation-service';

// Symbol Service
export type {
  BatchSymbolResult,
  SymbolCreationRequest,
  SymbolLookupResult,
  SymbolNormalizationOptions,
  SymbolNormalizationResult,
} from './symbol-service';
export { DEFAULT_NORMALIZATION_OPTIONS, SymbolNormalizationService } from './symbol-service';

// Progress Tracking
export type {
  ImportProgress,
  ImportSummary,
  ImportWarning,
  ProgressCallback,
  ImportError as ProgressImportError,
} from './progress-tracker';
export {
  ImportProgressFactory,
  ImportProgressTracker,
  ProgressFormatter,
} from './progress-tracker';

// Note: Batch Import orchestrator available but needs integration with TradeDAO
// All individual components are fully functional and ready for use
