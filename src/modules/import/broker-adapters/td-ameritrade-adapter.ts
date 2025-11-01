/**
 * TD Ameritrade CSV Adapter
 * Handles TD Ameritrade transaction export format
 */

import { BaseBrokerAdapter, BrokerType } from './base-adapter';
import type {
  RawTradeData,
  NormalizedTradeData,
  AdaptationResult,
  BrokerDetectionResult,
} from './base-adapter';

export class TDAmeritradeBrokerAdapter extends BaseBrokerAdapter {
  readonly brokerName: BrokerType = 'td_ameritrade';

  // TD Ameritrade common column names
  readonly requiredColumns = ['symbol', 'quantity', 'price', 'date', 'description'];

  readonly optionalColumns = ['commission', 'fees', 'net_amount', 'type', 'instruction'];

  canHandle(headers: string[]): BrokerDetectionResult {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

    // TD Ameritrade specific indicators
    const tdIndicators = [
      'net_amount', // TD specific column
      'reg_fee', // TD specific fee column
      'short_term_redemption_fee', // TD specific
      'fund_redemption_fee', // TD specific
    ];

    const missingRequired = this.validateRequiredColumns(headers);
    const foundIndicators = tdIndicators.filter(indicator =>
      normalizedHeaders.some(header => header.includes(indicator.toLowerCase()))
    );

    let confidence = 0;
    let reason = '';

    if (missingRequired.length === 0) {
      confidence += 0.4; // Has all required columns
      reason += 'Has all required columns. ';
    }

    if (foundIndicators.length > 0) {
      confidence += 0.4 + foundIndicators.length * 0.1; // TD specific columns
      reason += `Found TD Ameritrade indicators: ${foundIndicators.join(', ')}. `;
    }

    // Check for typical TD option description format
    if (normalizedHeaders.includes('description')) {
      confidence += 0.2;
      reason += 'Has description column for option parsing. ';
    }

    return {
      broker: this.brokerName,
      confidence: Math.min(confidence, 1),
      reason: reason.trim(),
      requiredColumns: this.requiredColumns,
      foundColumns: headers.filter(h =>
        this.requiredColumns.some(req => this.isColumnMatch(h, req))
      ),
    };
  }

  adaptRow(rawData: RawTradeData): AdaptationResult {
    const errors: Array<{ field: string; value: unknown; message: string }> = [];
    const warnings: Array<{ field: string; value: unknown; message: string }> = [];

    try {
      // Parse description to extract option details
      const description = String(rawData.description || '');
      const optionInfo = this.parseOptionDescription(description);

      if (!optionInfo) {
        errors.push({
          field: 'description',
          value: description,
          message: 'Cannot parse option information from description',
        });
        return { success: false, errors, warnings };
      }

      // Parse trade date
      const tradeDate = this.parseDate(rawData.date);
      if (!tradeDate) {
        errors.push({
          field: 'date',
          value: rawData.date,
          message: 'Invalid or missing trade date',
        });
      }

      // Parse quantity
      const quantity = this.parseNumber(rawData.quantity);
      if (quantity === null || quantity === 0) {
        errors.push({
          field: 'quantity',
          value: rawData.quantity,
          message: 'Invalid or missing quantity',
        });
      }

      // Parse price (premium)
      const price = this.parseNumber(rawData.price);
      if (price === null) {
        errors.push({
          field: 'price',
          value: rawData.price,
          message: 'Invalid or missing price',
        });
      }

      // Parse commission and fees
      const commission = Math.abs(this.parseNumber(rawData.commission) || 0);
      const regFee = Math.abs(this.parseNumber(rawData.reg_fee) || 0);
      const otherFees = Math.abs(this.parseNumber(rawData.other_fees) || 0);
      const totalFees = regFee + otherFees;

      // Determine trade action from description and net amount
      const netAmount = this.parseNumber(rawData.net_amount) || 0;
      const tradeAction = this.determineTradeAction(description, netAmount, quantity || 0);

      if (!tradeAction) {
        errors.push({
          field: 'instruction',
          value: description,
          message: 'Cannot determine trade action from description',
        });
      }

      // Return early if we have critical errors
      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      const normalizedData: NormalizedTradeData = {
        symbol: optionInfo.symbol,
        option_type: optionInfo.optionType,
        strike_price: optionInfo.strikePrice,
        expiration_date: optionInfo.expirationDate,
        trade_action: tradeAction!,
        quantity: Math.abs(quantity!),
        premium: Math.abs(price!),
        commission,
        fees: totalFees,
        trade_date: tradeDate!,
        notes: `TD Ameritrade - ${description}`,
        symbol_info: {
          name: optionInfo.symbol,
          asset_type: 'stock', // Default for options on stocks
        },
      };

      return {
        success: true,
        data: normalizedData,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        field: 'general',
        value: rawData,
        message: `Adaptation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      return { success: false, errors, warnings };
    }
  }

  /**
   * Parse TD Ameritrade option description
   * Format examples:
   * "BOUGHT +1 AAPL 100 16 DEC 22 150 CALL @1.50"
   * "SOLD -2 SPY 100 20 JAN 23 400 PUT @2.25"
   */
  private parseOptionDescription(description: string): {
    symbol: string;
    optionType: 'call' | 'put';
    strikePrice: number;
    expirationDate: string;
  } | null {
    // Clean up description
    const cleaned = description.toUpperCase().trim();

    // Pattern for TD Ameritrade option format
    // Matches: [ACTION] [+/-][QTY] [SYMBOL] [MULTIPLIER] [DAY] [MONTH] [YEAR] [STRIKE] [CALL/PUT] @[PRICE]
    const patterns = [
      // Standard format: BOUGHT +1 AAPL 100 16 DEC 22 150 CALL @1.50
      /(?:BOUGHT|SOLD)\s+[+-]?\d+\s+([A-Z]+)\s+\d+\s+(\d{1,2})\s+([A-Z]{3})\s+(\d{2})\s+([\d.]+)\s+(CALL|PUT)/,
      // Alternative format: AAPL 100 16 DEC 22 150 CALL
      /([A-Z]+)\s+\d+\s+(\d{1,2})\s+([A-Z]{3})\s+(\d{2})\s+([\d.]+)\s+(CALL|PUT)/,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const [, symbol, day, monthStr, year, strike, optionType] = match;

        // Convert month abbreviation to number
        const months: Record<string, number> = {
          JAN: 1,
          FEB: 2,
          MAR: 3,
          APR: 4,
          MAY: 5,
          JUN: 6,
          JUL: 7,
          AUG: 8,
          SEP: 9,
          OCT: 10,
          NOV: 11,
          DEC: 12,
        };

        const month = months[monthStr];
        if (!month) continue;

        // Build date (assume 20xx for 2-digit years)
        const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
        const expirationDate = `${fullYear}-${month.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;

        return {
          symbol: symbol.trim(),
          optionType: optionType.toLowerCase() as 'call' | 'put',
          strikePrice: parseFloat(strike),
          expirationDate,
        };
      }
    }

    return null;
  }

  /**
   * Determine trade action from description and net amount
   */
  private determineTradeAction(
    description: string,
    netAmount: number,
    quantity: number
  ): NormalizedTradeData['trade_action'] | null {
    const cleaned = description.toUpperCase();
    const isPositiveNet = netAmount > 0;
    const isNegativeQuantity = quantity < 0;

    // Direct indicators from description
    if (cleaned.includes('BOUGHT') || cleaned.includes('BUY TO OPEN')) {
      return 'buy_to_open';
    }

    if (cleaned.includes('SOLD TO OPEN') || cleaned.includes('SELL TO OPEN')) {
      return 'sell_to_open';
    }

    if (cleaned.includes('BUY TO CLOSE') || cleaned.includes('BOUGHT TO CLOSE')) {
      return 'buy_to_close';
    }

    if (cleaned.includes('SOLD TO CLOSE') || cleaned.includes('SELL TO CLOSE')) {
      return 'sell_to_close';
    }

    // Infer from description and net amount
    if (cleaned.includes('BOUGHT') || cleaned.includes('+')) {
      // Buying - money goes out (negative net) for opening, positive for closing
      return isPositiveNet ? 'buy_to_close' : 'buy_to_open';
    }

    if (cleaned.includes('SOLD') || cleaned.includes('-')) {
      // Selling - money comes in (positive net) for opening, negative for closing
      return isPositiveNet ? 'sell_to_open' : 'sell_to_close';
    }

    // Fallback based on net amount and quantity signs
    if (isNegativeQuantity) {
      return isPositiveNet ? 'sell_to_open' : 'sell_to_close';
    } else {
      return isPositiveNet ? 'buy_to_close' : 'buy_to_open';
    }
  }
}
