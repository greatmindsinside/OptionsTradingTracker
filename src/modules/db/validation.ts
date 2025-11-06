/**
 * Data validation schemas using Zod for type-safe runtime validation
 * Provides comprehensive validation for all database entities
 */

import type { ZodIssue } from 'zod';
import { z } from 'zod';

// Common validation patterns
const idSchema = z.number().int().positive();
const timestampSchema = z.string().datetime();
const moneySchema = z.number().finite();
const percentageSchema = z.number().min(-100).max(1000); // Allow up to 1000% gains
const positiveNumberSchema = z.number().positive();
const nonNegativeNumberSchema = z.number().min(0);

// Option types and strategies
export const OptionTypeSchema = z.enum(['call', 'put']);
export const TradeActionSchema = z.enum([
  'buy_to_open',
  'sell_to_open',
  'buy_to_close',
  'sell_to_close',
]);
export const OptionStyleSchema = z.enum(['american', 'european']);
export const AssetTypeSchema = z.enum(['stock', 'etf', 'index', 'futures', 'forex', 'crypto']);
export const PositionStatusSchema = z.enum(['open', 'closed', 'expired', 'assigned', 'exercised']);
export const ImportStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

// Portfolio validation schema
export const PortfolioSchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1).max(100).trim(),
  broker: z.string().min(1).max(50).trim(),
  account_number: z.string().max(50).trim().optional(),
  account_type: z.enum(['cash', 'margin', 'ira', 'roth_ira', '401k', 'other']),
  description: z.string().max(500).trim().optional(),
  is_active: z.boolean().default(true),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Portfolio = z.infer<typeof PortfolioSchema>;

// Symbol validation schema
export const SymbolSchema = z.object({
  id: idSchema.optional(),
  symbol: z.string().min(1).max(20).trim().toUpperCase(),
  name: z.string().max(200).trim().nullish(),
  exchange: z.string().max(20).trim().nullish(),
  asset_type: AssetTypeSchema,
  sector: z.string().max(100).trim().nullish(),
  industry: z.string().max(100).trim().nullish(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Symbol = z.infer<typeof SymbolSchema>;

// Strategy validation schema
export const StrategySchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(1000).trim().optional(),
  category: z.string().max(50).trim().optional(),
  risk_level: z.enum(['low', 'medium', 'high']).optional(),
  max_loss: moneySchema.optional(),
  max_profit: moneySchema.optional(),
  created_at: timestampSchema.optional(),
});

export type Strategy = z.infer<typeof StrategySchema>;

// Trade validation schema
export const TradeSchema = z.object({
  id: idSchema.optional(),
  portfolio_id: idSchema,
  symbol_id: idSchema,
  strategy_id: idSchema.optional(),
  option_type: OptionTypeSchema,
  strike_price: moneySchema,
  expiration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  trade_action: TradeActionSchema,
  quantity: positiveNumberSchema,
  premium: moneySchema,
  commission: nonNegativeNumberSchema.default(0),
  fees: nonNegativeNumberSchema.default(0),
  trade_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).trim().optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Trade = z.infer<typeof TradeSchema>;

// Position validation schema
export const PositionSchema = z.object({
  id: idSchema.optional(),
  portfolio_id: idSchema,
  symbol_id: idSchema,
  strategy_id: idSchema.optional(),
  option_type: OptionTypeSchema,
  strike_price: moneySchema,
  expiration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int(), // Can be negative for short positions
  average_cost: moneySchema,
  current_value: moneySchema.optional(),
  unrealized_pnl: moneySchema.optional(),
  realized_pnl: moneySchema.default(0),
  status: PositionStatusSchema,
  opened_at: timestampSchema.optional(),
  closed_at: timestampSchema.optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Position = z.infer<typeof PositionSchema>;

// Market data validation schema
export const MarketDataSchema = z.object({
  id: idSchema.optional(),
  symbol_id: idSchema,
  data_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  open_price: moneySchema.optional(),
  high_price: moneySchema.optional(),
  low_price: moneySchema.optional(),
  close_price: moneySchema,
  volume: nonNegativeNumberSchema.optional(),
  implied_volatility: percentageSchema.optional(),
  delta: z.number().min(-1).max(1).optional(),
  gamma: z.number().min(0).optional(),
  theta: z.number().optional(),
  vega: z.number().min(0).optional(),
  rho: z.number().optional(),
  created_at: timestampSchema.optional(),
});

export type MarketData = z.infer<typeof MarketDataSchema>;

// Performance metrics validation schema
export const PerformanceMetricsSchema = z.object({
  id: idSchema.optional(),
  portfolio_id: idSchema,
  calculation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_value: moneySchema,
  total_pnl: moneySchema,
  total_pnl_percentage: percentageSchema,
  daily_pnl: moneySchema.optional(),
  daily_pnl_percentage: percentageSchema.optional(),
  win_rate: z.number().min(0).max(100).optional(),
  profit_factor: positiveNumberSchema.optional(),
  sharpe_ratio: z.number().optional(),
  max_drawdown: z.number().min(0).optional(),
  max_drawdown_percentage: z.number().min(0).max(100).optional(),
  total_trades: nonNegativeNumberSchema.default(0),
  winning_trades: nonNegativeNumberSchema.default(0),
  losing_trades: nonNegativeNumberSchema.default(0),
  created_at: timestampSchema.optional(),
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// Import batch validation schema
export const ImportBatchSchema = z.object({
  id: idSchema.optional(),
  portfolio_id: idSchema,
  filename: z.string().min(1).max(255).trim(),
  broker: z.string().max(50).trim(),
  total_records: nonNegativeNumberSchema,
  processed_records: nonNegativeNumberSchema.default(0),
  failed_records: nonNegativeNumberSchema.default(0),
  status: ImportStatusSchema,
  error_message: z.string().max(1000).trim().optional(),
  imported_at: timestampSchema.optional(),
  created_at: timestampSchema.optional(),
});

export type ImportBatch = z.infer<typeof ImportBatchSchema>;

// Trade leg validation schema
export const TradeLegSchema = z.object({
  id: idSchema.optional(),
  trade_id: idSchema,
  leg_number: positiveNumberSchema,
  option_type: OptionTypeSchema,
  strike_price: moneySchema,
  expiration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trade_action: TradeActionSchema,
  quantity: positiveNumberSchema,
  premium: moneySchema,
  created_at: timestampSchema.optional(),
});

export type TradeLeg = z.infer<typeof TradeLegSchema>;

// User settings validation schema
export const UserSettingsSchema = z.object({
  id: idSchema.optional(),
  setting_key: z.string().min(1).max(100).trim(),
  setting_value: z.string().max(1000).trim(),
  setting_type: z.enum(['string', 'number', 'boolean', 'json']),
  description: z.string().max(500).trim().optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Wheel cycles validation schema
export const WheelCycleSchema = z.object({
  id: idSchema.optional(),
  lifecycle_id: z.string().min(1).max(50).trim(),
  portfolio_id: idSchema,
  symbol_id: idSchema,
  underlying_symbol: z.string().min(1).max(20).trim().toUpperCase(),
  status: z.enum(['CSP_OPEN', 'CSP_ASSIGNED', 'CC_OPEN', 'CC_CLOSED', 'CC_ASSIGNED', 'CLOSED']),
  total_net_credit: moneySchema.default(0),
  cost_basis: moneySchema.optional(),
  shares_owned: z.number().int().positive().optional(),
  csp_trade_ids: z.string().default('[]'), // JSON array of trade IDs
  cc_trade_ids: z.string().default('[]'), // JSON array of trade IDs
  stock_trade_ids: z.string().default('[]'), // JSON array of trade IDs
  total_premium_collected: moneySchema.default(0),
  realized_pnl: moneySchema.optional(),
  unrealized_pnl: moneySchema.optional(),
  days_active: nonNegativeNumberSchema.default(0),
  annualized_return: percentageSchema.optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type WheelCycle = z.infer<typeof WheelCycleSchema>;

// Wheel events validation schema
export const WheelEventSchema = z.object({
  id: idSchema.optional(),
  lifecycle_id: z.string().min(1).max(50).trim(),
  event_type: z.enum([
    'CSP_SOLD',
    'CSP_ASSIGNED',
    'CSP_EXPIRED',
    'CC_SOLD',
    'CC_CLOSED',
    'CC_ASSIGNED',
    'CC_EXPIRED',
    'POSITION_CLOSED',
  ]),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  trade_id: idSchema.optional(),
  description: z.string().min(1).max(500).trim(),
  amount: moneySchema.optional(),
  strike_price: moneySchema.optional(),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  created_at: timestampSchema.optional(),
});

export type WheelEvent_Record = z.infer<typeof WheelEventSchema>;

// Input sanitization helpers
export const sanitizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return String(value || '');
  }
  return value.trim();
};

export const sanitizeNumber = (value: unknown): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export const sanitizeBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return Boolean(value);
};

// Validation result type
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// Generic validation function
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> => {
  try {
    // Convert SQLite data types to JavaScript types
    const convertedData = convertSqliteTypes(data);
    const result = schema.safeParse(convertedData);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: result.error.issues.map((err: ZodIssue) => `${err.path.join('.')}: ${err.message}`),
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

/**
 * Convert SQLite data types to proper JavaScript types
 * SQLite stores booleans as 0/1, this converts them back
 * Also converts NULL to undefined for optional fields
 */
const convertSqliteTypes = (data: unknown): unknown => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'object' && data !== null) {
    const converted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Convert NULL to undefined for optional fields
      if (value === null) {
        converted[key] = undefined;
        continue;
      }

      // Convert boolean fields that are stored as 0/1 in SQLite
      if (key.includes('is_') || key.includes('_active') || key.includes('enabled')) {
        if (value === 0) {
          converted[key] = false;
        } else if (value === 1) {
          converted[key] = true;
        } else {
          converted[key] = value;
        }
      } else {
        converted[key] = value;
      }
    }

    return converted;
  }

  return data;
};

// Batch validation for arrays
export const validateArray = <T>(
  schema: z.ZodSchema<T>,
  dataArray: unknown[]
): ValidationResult<T[]> => {
  const validItems: T[] = [];
  const errors: string[] = [];

  dataArray.forEach((item, index) => {
    const result = validateData(schema, item);
    if (result.success && result.data) {
      validItems.push(result.data);
    } else {
      errors.push(`Item ${index}: ${result.errors?.join(', ') || 'Unknown error'}`);
    }
  });

  if (errors.length === 0) {
    return {
      success: true,
      data: validItems,
    };
  } else {
    return {
      success: false,
      errors,
    };
  }
};

// Export all schemas as a collection for easy access
export const ValidationSchemas = {
  Portfolio: PortfolioSchema,
  Symbol: SymbolSchema,
  Strategy: StrategySchema,
  Trade: TradeSchema,
  Position: PositionSchema,
  MarketData: MarketDataSchema,
  PerformanceMetrics: PerformanceMetricsSchema,
  ImportBatch: ImportBatchSchema,
  TradeLeg: TradeLegSchema,
  UserSettings: UserSettingsSchema,
  WheelCycle: WheelCycleSchema,
  WheelEvent: WheelEventSchema,
} as const;
