/**
 * Broker Data Adapters
 * Normalize different broker CSV formats to our standard schema
 */

import { z } from 'zod';

/**
 * Supported broker types
 */
export const BrokerType = z.enum([
  'td_ameritrade',
  'schwab',
  'robinhood',
  'etrade',
  'interactive_brokers',
  'generic',
]);

export type BrokerType = z.infer<typeof BrokerType>;

/**
 * Raw trade data from CSV (before normalization)
 */
export interface RawTradeData {
  [key: string]: string | number | Date | null | undefined;
}

/**
 * Normalized trade data matching our database schema
 */
export interface NormalizedTradeData {
  // Core trade information
  symbol: string;
  option_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string; // YYYY-MM-DD
  trade_action: 'buy_to_open' | 'sell_to_open' | 'buy_to_close' | 'sell_to_close';
  quantity: number;
  premium: number;
  commission: number;
  fees: number;
  trade_date: string; // YYYY-MM-DD
  notes?: string;

  // Symbol information (for auto-creation)
  symbol_info?: {
    name?: string;
    asset_type?: 'stock' | 'etf' | 'index' | 'futures' | 'forex' | 'crypto';
    exchange?: string;
    sector?: string;
    industry?: string;
  };
}

/**
 * Broker detection result
 */
export interface BrokerDetectionResult {
  broker: BrokerType;
  confidence: number; // 0-1
  reason: string;
  requiredColumns: string[];
  foundColumns: string[];
}

/**
 * Adaptation result for a single row
 */
export interface AdaptationResult {
  success: boolean;
  data?: NormalizedTradeData;
  errors: Array<{
    field: string;
    value: unknown;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    value: unknown;
    message: string;
  }>;
}

/**
 * Base adapter interface that all broker adapters must implement
 */
export abstract class BaseBrokerAdapter {
  abstract readonly brokerName: BrokerType;
  abstract readonly requiredColumns: string[];
  abstract readonly optionalColumns: string[];

  /**
   * Detect if this adapter can handle the given CSV headers
   */
  abstract canHandle(headers: string[]): BrokerDetectionResult;

  /**
   * Normalize a single row of data
   */
  abstract adaptRow(rawData: RawTradeData): AdaptationResult;

  /**
   * Validate that required columns are present
   */
  protected validateRequiredColumns(headers: string[]): string[] {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const missingColumns: string[] = [];

    for (const required of this.requiredColumns) {
      if (!normalizedHeaders.some(header => this.isColumnMatch(header, required))) {
        missingColumns.push(required);
      }
    }

    return missingColumns;
  }

  /**
   * Check if a header matches a required column (with variations)
   */
  protected isColumnMatch(header: string, required: string): boolean {
    const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedRequired = required.toLowerCase().replace(/[^a-z0-9]/g, '');

    return (
      normalizedHeader === normalizedRequired ||
      normalizedHeader.includes(normalizedRequired) ||
      normalizedRequired.includes(normalizedHeader)
    );
  }

  /**
   * Find the best matching column for a required field
   */
  protected findColumn(headers: string[], targetColumn: string): string | null {
    const normalizedTarget = targetColumn.toLowerCase();

    // Direct match first
    for (const header of headers) {
      if (this.isColumnMatch(header, targetColumn)) {
        return header;
      }
    }

    // Partial matches with common variations
    const variations = this.getColumnVariations(normalizedTarget);
    for (const variation of variations) {
      for (const header of headers) {
        if (this.isColumnMatch(header, variation)) {
          return header;
        }
      }
    }

    return null;
  }

  /**
   * Get common variations of column names
   */
  protected getColumnVariations(column: string): string[] {
    const variations: Record<string, string[]> = {
      symbol: ['ticker', 'underlying', 'stock_symbol', 'instrument'],
      quantity: ['qty', 'size', 'shares', 'contracts'],
      price: ['premium', 'net_price', 'execution_price', 'fill_price'],
      commission: ['comm', 'commissions', 'fees_commission'],
      fees: ['regulatory_fees', 'other_fees', 'clearing_fees'],
      trade_date: ['date', 'execution_date', 'order_date', 'fill_date'],
      expiration_date: ['exp_date', 'expiry', 'expiration'],
      strike_price: ['strike', 'strike_px', 'exercise_price'],
      option_type: ['type', 'call_put', 'option', 'put_call'],
      trade_action: ['action', 'side', 'buy_sell', 'instruction'],
    };

    return variations[column] || [];
  }

  /**
   * Parse date string to YYYY-MM-DD format
   */
  protected parseDate(dateValue: unknown): string | null {
    if (!dateValue) return null;

    try {
      let date: Date;

      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        // Handle various date formats
        const dateStr = dateValue.trim();

        // MM/DD/YYYY or MM-DD-YYYY
        if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(dateStr)) {
          date = new Date(dateStr);
        }
        // YYYY/MM/DD or YYYY-MM-DD
        else if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(dateStr)) {
          date = new Date(dateStr);
        }
        // Other formats
        else {
          date = new Date(dateStr);
        }
      } else if (typeof dateValue === 'number') {
        // Excel date serial number
        date = new Date((dateValue - 25569) * 86400 * 1000);
      } else {
        return null;
      }

      // Validate the date
      if (isNaN(date.getTime())) {
        return null;
      }

      // Return in YYYY-MM-DD format
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  /**
   * Parse numeric value
   */
  protected parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // Remove common currency symbols and formatting
      const cleaned = value
        .replace(/[$,\s]/g, '')
        .replace(/[()]/g, '') // Remove parentheses (negative indicators)
        .trim();

      // Handle negative values in parentheses
      const isNegative = value.includes('(') && value.includes(')');

      const num = parseFloat(cleaned);
      if (isNaN(num)) {
        return null;
      }

      return isNegative ? -Math.abs(num) : num;
    }

    return null;
  }

  /**
   * Parse option type from string
   */
  protected parseOptionType(value: unknown): 'call' | 'put' | null {
    if (!value) return null;

    const str = String(value).toLowerCase().trim();

    if (str.includes('call') || str === 'c') {
      return 'call';
    }

    if (str.includes('put') || str === 'p') {
      return 'put';
    }

    return null;
  }

  /**
   * Parse trade action from string
   */
  protected parseTradeAction(value: unknown): NormalizedTradeData['trade_action'] | null {
    if (!value) return null;

    const str = String(value)
      .toLowerCase()
      .replace(/[^a-z]/g, '');

    // Common patterns
    const patterns: Record<string, NormalizedTradeData['trade_action']> = {
      buytoopen: 'buy_to_open',
      bto: 'buy_to_open',
      buy: 'buy_to_open', // Default buy to open for options
      selltoopen: 'sell_to_open',
      sto: 'sell_to_open',
      sell: 'sell_to_open', // Default sell to open for options
      buytoclose: 'buy_to_close',
      btc: 'buy_to_close',
      selltoclose: 'sell_to_close',
      stc: 'sell_to_close',
    };

    return patterns[str] || null;
  }

  /**
   * Clean and normalize symbol
   */
  protected normalizeSymbol(symbol: unknown): string | null {
    if (!symbol) return null;

    return String(symbol)
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, '');
  }
}
