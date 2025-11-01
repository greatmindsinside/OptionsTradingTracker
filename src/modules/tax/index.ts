/**
 * Tax Module Exports
 *
 * Central export for all tax-related functionality including
 * tax lot management, wash sale detection, and optimization tools.
 */

export { TaxLotManager, TaxLotMethod, WashSaleStatus } from './tax-lots';
export type {
  TaxLot,
  TaxTransaction,
  TaxLotAllocation,
  WashSaleAnalysis,
  TaxOptimization,
} from './tax-lots';

export { default as TaxLotDashboard } from '../../components/TaxLotDashboard';
