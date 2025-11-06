/**
 * Tax Module Exports
 *
 * Central export for all tax-related functionality including
 * tax lot management, wash sale detection, and optimization tools.
 */

export type {
  TaxLot,
  TaxLotAllocation,
  TaxOptimization,
  TaxTransaction,
  WashSaleAnalysis,
} from './tax-lots';
export { TaxLotManager, TaxLotMethod, WashSaleStatus } from './tax-lots';

// TaxLotDashboard component removed - was only used in deleted TaxPage
