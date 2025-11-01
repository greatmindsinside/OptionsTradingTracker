/**
 * E*TRADE CSV Adapter
 * Handles E*TRADE transaction export format
 */

import { BaseBrokerAdapter, BrokerType } from './base-adapter';
import type {
  RawTradeData,
  NormalizedTradeData,
  AdaptationResult,
  BrokerDetectionResult,
} from './base-adapter';

export class EtradeBrokerAdapter extends BaseBrokerAdapter {
  readonly brokerName: BrokerType = 'etrade';

  // E*TRADE common column names
  readonly requiredColumns = [
    'symbol',
    'quantity',
    'price',
    'transaction_date',
    'transaction_type',
  ];

  readonly optionalColumns = ['commission', 'fees', 'description', 'security_type'];

  canHandle(headers: string[]): BrokerDetectionResult {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

    // E*TRADE specific indicators
    const etradeIndicators = [
      'etrade',
      'transaction_type',
      'transaction_date',
      'security_type',
      'regulatory_fee',
    ];

    const missingRequired = this.validateRequiredColumns(headers);
    const foundIndicators = etradeIndicators.filter(indicator =>
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
      reason += `Found E*TRADE indicators: ${foundIndicators.join(', ')}. `;
    }

    // E*TRADE typically uses "Transaction Type" column
    if (normalizedHeaders.some(h => h.includes('transaction') && h.includes('type'))) {
      confidence += 0.2;
      reason += 'Has transaction type column. ';
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
      const description = String(rawData.description || '');
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
      const tradeDate = this.parseDate(rawData.transaction_date);
      if (!tradeDate) {
        errors.push({
          field: 'transaction_date',
          value: rawData.transaction_date,
          message: 'Invalid or missing transaction date',
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
      const regulatoryFee = Math.abs(this.parseNumber(rawData.regulatory_fee) || 0);
      const otherFees = Math.abs(this.parseNumber(rawData.fees) || 0);
      const totalFees = regulatoryFee + otherFees;

      // Parse transaction type
      const transactionType = String(rawData.transaction_type || '');
      const tradeAction = this.parseEtradeTransactionType(transactionType);

      if (!tradeAction) {
        errors.push({
          field: 'transaction_type',
          value: transactionType,
          message: 'Cannot determine trade action from transaction type',
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
        notes: `E*TRADE - ${description || symbol}`,
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
   * Parse E*TRADE option symbol format
   * Format examples: AAPL231215C150 (Symbol + YYMMDD + C/P + Strike)
   */
  private parseOptionSymbol(symbol: string): {
    symbol: string;
    optionType: 'call' | 'put';
    strikePrice: number;
    expirationDate: string;
  } | null {
    if (!symbol) return null;

    const cleaned = symbol.trim().toUpperCase();

    // Pattern for E*TRADE option format: SYMBOLYYMMDDCSTRIKE
    const pattern = /^([A-Z]+)(\d{6})([CP])([\d.]+)$/;
    const match = cleaned.match(pattern);

    if (match) {
      const [, underlyingSymbol, dateStr, optionTypeChar, strikeStr] = match;

      // Parse date YYMMDD
      const year = 2000 + parseInt(dateStr.substring(0, 2));
      const month = parseInt(dateStr.substring(2, 4));
      const day = parseInt(dateStr.substring(4, 6));
      const expirationDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      return {
        symbol: underlyingSymbol,
        optionType: optionTypeChar === 'C' ? 'call' : 'put',
        strikePrice: parseFloat(strikeStr),
        expirationDate,
      };
    }

    return null;
  }

  /**
   * Parse E*TRADE option description
   * Format examples:
   * "AAPL DEC 15 2023 150 CALL"
   * "SPY JAN 20 2024 400 PUT"
   */
  private parseOptionDescription(description: string): {
    symbol: string;
    optionType: 'call' | 'put';
    strikePrice: number;
    expirationDate: string;
  } | null {
    if (!description) return null;

    // Pattern for description format
    const pattern = /([A-Z]+)\s+([A-Z]{3})\s+(\d{1,2})\s+(\d{4})\s+([\d.]+)\s+(CALL|PUT)/i;
    const match = description.match(pattern);

    if (match) {
      const [, symbol, monthStr, day, year, strike, optionType] = match;

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

      const month = months[monthStr.toUpperCase()];
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

  /**
   * Parse E*TRADE transaction type to trade action
   */
  private parseEtradeTransactionType(
    transactionType: string
  ): NormalizedTradeData['trade_action'] | null {
    const cleaned = transactionType.toLowerCase().replace(/[^a-z]/g, '');

    // E*TRADE transaction type mappings
    const mappings: Record<string, NormalizedTradeData['trade_action']> = {
      bought: 'buy_to_open',
      buytoopen: 'buy_to_open',
      bto: 'buy_to_open',
      sold: 'sell_to_open',
      selltoopen: 'sell_to_open',
      sto: 'sell_to_open',
      buytoclose: 'buy_to_close',
      btc: 'buy_to_close',
      selltoclose: 'sell_to_close',
      stc: 'sell_to_close',
      optionbought: 'buy_to_open',
      optionsold: 'sell_to_open',
    };

    return mappings[cleaned] || null;
  }
}
