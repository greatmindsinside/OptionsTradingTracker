/**
 * Import Validation Pipeline
 * Validates normalized trade data using existing Zod schemas
 */

import { TradeSchema } from '../db/validation';
import type { NormalizedTradeData } from './broker-adapters/base-adapter';

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  field: string;
  value: unknown;
  message: string;
  code: string;
}

/**
 * Validation warning for a field
 */
export interface ValidationWarning {
  field: string;
  value: unknown;
  message: string;
  suggestion?: string;
}

/**
 * Result of validating a single trade record
 */
export interface TradeValidationResult {
  isValid: boolean;
  data?: NormalizedTradeData;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  results: TradeValidationResult[];
  summary: {
    commonErrors: Array<{ error: string; count: number }>;
    commonWarnings: Array<{ warning: string; count: number }>;
  };
}

/**
 * Validation options
 */
export interface ValidationOptions {
  strictMode: boolean; // Fail on any warnings
  allowPartialData: boolean; // Allow records with some missing optional fields
  dateRange?: {
    // Validate dates within range
    earliest: Date;
    latest: Date;
  };
  symbolValidation: {
    // Symbol validation rules
    requireExisting: boolean; // Require symbols to exist in database
    autoNormalize: boolean; // Auto-normalize symbol names
  };
}

/**
 * Default validation options
 */
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  strictMode: false,
  allowPartialData: true,
  symbolValidation: {
    requireExisting: false,
    autoNormalize: true,
  },
};

/**
 * Main validation service
 */
export class ImportValidationService {
  private options: ValidationOptions;

  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  }

  /**
   * Validate a single trade record
   */
  validateTrade(data: NormalizedTradeData): TradeValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Create a trade object for validation (without ID and timestamps)
      const tradeData = {
        portfolio_id: 0, // Placeholder - will be set during import
        symbol: data.symbol,
        option_type: data.option_type,
        strike_price: data.strike_price,
        expiration_date: data.expiration_date,
        trade_action: data.trade_action,
        quantity: data.quantity,
        premium: data.premium,
        commission: data.commission,
        fees: data.fees,
        trade_date: data.trade_date,
        notes: data.notes || null,
      };

      // Validate against TradeSchema (excluding fields that are resolved during import)
      const tradeResult = TradeSchema.omit({
        id: true,
        portfolio_id: true,
        symbol_id: true, // Resolved during import from symbol string
        created_at: true,
        updated_at: true,
      }).safeParse(tradeData);

      if (!tradeResult.success) {
        for (const issue of tradeResult.error.issues) {
          errors.push({
            field: issue.path.join('.'),
            value: this.getNestedValue(tradeData, issue.path as (string | number)[]),
            message: issue.message,
            code: issue.code,
          });
        }
      }

      // Additional business rule validations
      this.validateBusinessRules(data, errors, warnings);

      // Symbol validation
      this.validateSymbol(data, errors, warnings);

      // Date validations
      this.validateDates(data, errors, warnings);

      // Numeric validations
      this.validateNumericFields(data, errors, warnings);

      // Check strict mode
      if (this.options.strictMode && warnings.length > 0) {
        // Convert warnings to errors in strict mode
        for (const warning of warnings) {
          errors.push({
            field: warning.field,
            value: warning.value,
            message: `Strict mode: ${warning.message}`,
            code: 'strict_validation',
          });
        }
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        data: isValid ? data : undefined,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        field: 'general',
        value: data,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'validation_error',
      });

      return {
        isValid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Validate multiple trade records
   */
  validateBatch(trades: NormalizedTradeData[]): BatchValidationResult {
    const results: TradeValidationResult[] = [];
    const errorCounts: Map<string, number> = new Map();
    const warningCounts: Map<string, number> = new Map();

    // Validate each trade
    for (const trade of trades) {
      const result = this.validateTrade(trade);
      results.push(result);

      // Count errors and warnings
      for (const error of result.errors) {
        const key = `${error.field}: ${error.message}`;
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      }

      for (const warning of result.warnings) {
        const key = `${warning.field}: ${warning.message}`;
        warningCounts.set(key, (warningCounts.get(key) || 0) + 1);
      }
    }

    const validRecords = results.filter(r => r.isValid).length;
    const invalidRecords = results.length - validRecords;

    // Create summary
    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 errors

    const commonWarnings = Array.from(warningCounts.entries())
      .map(([warning, count]) => ({ warning, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 warnings

    return {
      totalRecords: trades.length,
      validRecords,
      invalidRecords,
      results,
      summary: {
        commonErrors,
        commonWarnings,
      },
    };
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    data: NormalizedTradeData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Option expiration should be in the future relative to trade date
    const tradeDate = new Date(data.trade_date);
    const expirationDate = new Date(data.expiration_date);

    if (expirationDate <= tradeDate) {
      warnings.push({
        field: 'expiration_date',
        value: data.expiration_date,
        message: 'Option expiration date is not after trade date',
        suggestion: 'Verify that the expiration date is correct',
      });
    }

    // Strike price should be positive
    if (data.strike_price <= 0) {
      errors.push({
        field: 'strike_price',
        value: data.strike_price,
        message: 'Strike price must be positive',
        code: 'invalid_strike_price',
      });
    }

    // Premium should be non-negative
    if (data.premium < 0) {
      errors.push({
        field: 'premium',
        value: data.premium,
        message: 'Premium cannot be negative',
        code: 'invalid_premium',
      });
    }

    // Quantity should be positive
    if (data.quantity <= 0) {
      errors.push({
        field: 'quantity',
        value: data.quantity,
        message: 'Quantity must be positive',
        code: 'invalid_quantity',
      });
    }

    // Commission and fees should be non-negative
    if (data.commission < 0) {
      warnings.push({
        field: 'commission',
        value: data.commission,
        message: 'Commission should not be negative',
        suggestion: 'Use absolute value for commission',
      });
    }

    if (data.fees < 0) {
      warnings.push({
        field: 'fees',
        value: data.fees,
        message: 'Fees should not be negative',
        suggestion: 'Use absolute value for fees',
      });
    }

    // Very high premium (> $100) might be unusual
    if (data.premium > 100) {
      warnings.push({
        field: 'premium',
        value: data.premium,
        message: 'Premium is unusually high (>$100)',
        suggestion: 'Verify premium amount is correct',
      });
    }

    // Very high commission (> 10% of premium) might be unusual
    const totalCosts = data.commission + data.fees;
    if (totalCosts > 0 && data.premium > 0) {
      const costRatio = totalCosts / (data.premium * data.quantity);
      if (costRatio > 0.1) {
        warnings.push({
          field: 'commission',
          value: totalCosts,
          message: 'Commission and fees are high relative to premium (>10%)',
          suggestion: 'Verify commission and fees are correct',
        });
      }
    }
  }

  /**
   * Validate symbol format
   */
  private validateSymbol(
    data: NormalizedTradeData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Symbol should be uppercase letters/numbers only
    if (!/^[A-Z0-9]+$/.test(data.symbol)) {
      if (this.options.symbolValidation.autoNormalize) {
        warnings.push({
          field: 'symbol',
          value: data.symbol,
          message: 'Symbol contains lowercase or special characters',
          suggestion: 'Will be normalized to uppercase letters/numbers only',
        });
      } else {
        errors.push({
          field: 'symbol',
          value: data.symbol,
          message: 'Symbol must contain only uppercase letters and numbers',
          code: 'invalid_symbol_format',
        });
      }
    }

    // Symbol length check (typically 1-5 characters for US stocks)
    if (data.symbol.length > 5) {
      warnings.push({
        field: 'symbol',
        value: data.symbol,
        message: 'Symbol is unusually long (>5 characters)',
        suggestion: 'Verify symbol is correct',
      });
    }

    if (data.symbol.length < 1) {
      errors.push({
        field: 'symbol',
        value: data.symbol,
        message: 'Symbol cannot be empty',
        code: 'empty_symbol',
      });
    }
  }

  /**
   * Validate date fields
   */
  private validateDates(
    data: NormalizedTradeData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Trade date validation
    const tradeDate = new Date(data.trade_date);
    if (isNaN(tradeDate.getTime())) {
      errors.push({
        field: 'trade_date',
        value: data.trade_date,
        message: 'Invalid trade date format',
        code: 'invalid_date',
      });
      return; // Skip other date validations if trade date is invalid
    }

    // Expiration date validation
    const expirationDate = new Date(data.expiration_date);
    if (isNaN(expirationDate.getTime())) {
      errors.push({
        field: 'expiration_date',
        value: data.expiration_date,
        message: 'Invalid expiration date format',
        code: 'invalid_date',
      });
      return;
    }

    // Date range validation (if configured)
    if (this.options.dateRange) {
      if (tradeDate < this.options.dateRange.earliest) {
        errors.push({
          field: 'trade_date',
          value: data.trade_date,
          message: `Trade date is before allowed range (${this.options.dateRange.earliest.toISOString().split('T')[0]})`,
          code: 'date_out_of_range',
        });
      }

      if (tradeDate > this.options.dateRange.latest) {
        errors.push({
          field: 'trade_date',
          value: data.trade_date,
          message: `Trade date is after allowed range (${this.options.dateRange.latest.toISOString().split('T')[0]})`,
          code: 'date_out_of_range',
        });
      }
    }

    // Future trade dates are unusual
    if (tradeDate > today) {
      warnings.push({
        field: 'trade_date',
        value: data.trade_date,
        message: 'Trade date is in the future',
        suggestion: 'Verify trade date is correct',
      });
    }

    // Very old trade dates (>5 years) might be unusual
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (tradeDate < fiveYearsAgo) {
      warnings.push({
        field: 'trade_date',
        value: data.trade_date,
        message: 'Trade date is more than 5 years old',
        suggestion: 'Verify this is historical data you want to import',
      });
    }
  }

  /**
   * Get nested value from object using path array
   */
  private getNestedValue(obj: Record<string, unknown>, path: (string | number)[]): unknown {
    return path.reduce((current: unknown, key: string | number) => {
      return current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key as string]
        : undefined;
    }, obj);
  }

  /**
   * Validate numeric fields for reasonable ranges
   */
  private validateNumericFields(
    data: NormalizedTradeData,
    _errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Strike price reasonable range ($0.01 - $10,000)
    if (data.strike_price > 10000) {
      warnings.push({
        field: 'strike_price',
        value: data.strike_price,
        message: 'Strike price is very high (>$10,000)',
        suggestion: 'Verify strike price is correct',
      });
    }

    if (data.strike_price < 0.01) {
      warnings.push({
        field: 'strike_price',
        value: data.strike_price,
        message: 'Strike price is very low (<$0.01)',
        suggestion: 'Verify strike price is correct',
      });
    }

    // Quantity reasonable range (1 - 10,000 contracts)
    if (data.quantity > 10000) {
      warnings.push({
        field: 'quantity',
        value: data.quantity,
        message: 'Quantity is very high (>10,000 contracts)',
        suggestion: 'Verify quantity is correct',
      });
    }

    // Premium per contract reasonable range ($0 - $1,000)
    if (data.premium > 1000) {
      warnings.push({
        field: 'premium',
        value: data.premium,
        message: 'Premium per contract is very high (>$1,000)',
        suggestion: 'Verify premium is per contract, not total',
      });
    }
  }

  /**
   * Update validation options
   */
  setOptions(options: Partial<ValidationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current validation options
   */
  getOptions(): ValidationOptions {
    return { ...this.options };
  }
}
