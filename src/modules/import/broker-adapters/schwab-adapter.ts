/**
 * Charles Schwab CSV Adapter
 * Handles Schwab transaction export format
 */

import type {
  AdaptationResult,
  BrokerDetectionResult,
  NormalizedTradeData,
  RawTradeData,
} from './base-adapter';
import { BaseBrokerAdapter, BrokerType } from './base-adapter';

export class SchwabBrokerAdapter extends BaseBrokerAdapter {
  readonly brokerName: BrokerType = 'schwab';

  // Schwab common column names
  readonly requiredColumns = ['symbol', 'quantity', 'price', 'date', 'action'];

  readonly optionalColumns = ['fees', 'commission', 'description'];

  canHandle(headers: string[]): BrokerDetectionResult {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

    // Schwab specific indicators
    const schwabIndicators = ['fees & comm', 'schwab', 'transaction_type', 'security_description'];

    const missingRequired = this.validateRequiredColumns(headers);
    const foundIndicators = schwabIndicators.filter(indicator =>
      normalizedHeaders.some(header => header.includes(indicator.toLowerCase()))
    );

    let confidence = 0;
    let reason = '';

    if (missingRequired.length === 0) {
      confidence += 0.4;
      reason += 'Has all required columns. ';
    }

    if (foundIndicators.length > 0) {
      confidence += 0.5 + foundIndicators.length * 0.1;
      reason += `Found Schwab indicators: ${foundIndicators.join(', ')}. `;
    }

    // Check for Schwab option format in symbol
    if (
      normalizedHeaders.includes('symbol') ||
      normalizedHeaders.includes('security_description')
    ) {
      confidence += 0.1;
      reason += 'Has symbol/description column for option parsing. ';
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
      // Parse symbol/description to extract option details
      const symbol = String(rawData.symbol || '');
      const description = String(rawData.security_description || rawData.description || '');
      const optionInfo = this.parseOptionSymbol(symbol) || this.parseOptionDescription(description);

      if (!optionInfo) {
        errors.push({
          field: 'symbol',
          value: symbol || description,
          message: 'Cannot parse option information from symbol or description',
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
      const feesComm = this.parseNumber(rawData['fees & comm']) || 0;
      const commission = Math.abs(this.parseNumber(rawData.commission) || feesComm);
      const fees = Math.abs(this.parseNumber(rawData.fees) || 0);

      // Parse trade action
      const action = String(rawData.action || '');
      const tradeAction = this.parseTradeAction(action);

      if (!tradeAction) {
        errors.push({
          field: 'action',
          value: action,
          message: 'Cannot determine trade action',
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
        fees,
        trade_date: tradeDate!,
        notes: `Schwab - ${description || symbol}`,
        symbol_info: {
          name: optionInfo.symbol,
          asset_type: 'stock',
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
   * Parse Schwab option symbol format
   * Format: AAPL  231215C00150000 (Symbol + YYMMDD + C/P + Strike with padding)
   */
  private parseOptionSymbol(symbol: string): {
    symbol: string;
    optionType: 'call' | 'put';
    strikePrice: number;
    expirationDate: string;
  } | null {
    if (!symbol) return null;

    // Clean symbol
    const cleaned = symbol.trim().replace(/\s+/g, ' ');

    // Pattern for Schwab option format: SYMBOL YYMMDDCPPPPPPPPP
    // Example: AAPL  231215C00150000
    const pattern = /^([A-Z]+)\s+(\d{6})([CP])(\d{8})$/;
    const match = cleaned.match(pattern);

    if (match) {
      const [, underlyingSymbol, dateStr, optionTypeChar, strikeStr] = match;

      // Parse date YYMMDD
      const year = 2000 + parseInt(dateStr.substring(0, 2));
      const month = parseInt(dateStr.substring(2, 4));
      const day = parseInt(dateStr.substring(4, 6));
      const expirationDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      // Parse strike (divide by 1000 to get actual price)
      const strikePrice = parseInt(strikeStr) / 1000;

      return {
        symbol: underlyingSymbol,
        optionType: optionTypeChar === 'C' ? 'call' : 'put',
        strikePrice,
        expirationDate,
      };
    }

    return null;
  }

  /**
   * Parse Schwab option description
   * Format examples:
   * "AAPL Dec 15 2023 $150.00 Call"
   * "SPY Jan 20 2024 $400.00 Put"
   */
  private parseOptionDescription(description: string): {
    symbol: string;
    optionType: 'call' | 'put';
    strikePrice: number;
    expirationDate: string;
  } | null {
    if (!description) return null;

    // Pattern for description format: SYMBOL Month Day Year $Strike Call/Put
    const pattern = /([A-Z]+)\s+([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})\s+\$?([\d.]+)\s+(Call|Put)/i;
    const match = description.match(pattern);

    if (match) {
      const [, symbol, monthName, day, year, strike, optionType] = match;

      // Convert month name to number
      const months: Record<string, number> = {
        Jan: 1,
        Feb: 2,
        Mar: 3,
        Apr: 4,
        May: 5,
        Jun: 6,
        Jul: 7,
        Aug: 8,
        Sep: 9,
        Oct: 10,
        Nov: 11,
        Dec: 12,
        January: 1,
        February: 2,
        March: 3,
        April: 4,
        June: 6,
        July: 7,
        August: 8,
        September: 9,
        October: 10,
        November: 11,
        December: 12,
      };

      const month = months[monthName];
      if (!month) return null;

      const expirationDate = `${year}-${month.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;

      return {
        symbol: symbol.toUpperCase(),
        optionType: optionType.toLowerCase() as 'call' | 'put',
        strikePrice: parseFloat(strike),
        expirationDate,
      };
    }

    return null;
  }
}
