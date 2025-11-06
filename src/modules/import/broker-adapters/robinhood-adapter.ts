/**
 * Robinhood CSV Adapter
 * Handles Robinhood options transaction export format
 */

import type {
  AdaptationResult,
  BrokerDetectionResult,
  NormalizedTradeData,
  RawTradeData,
} from './base-adapter';
import { BaseBrokerAdapter, BrokerType } from './base-adapter';

export class RobinhoodBrokerAdapter extends BaseBrokerAdapter {
  readonly brokerName: BrokerType = 'robinhood';

  // Robinhood CSV column names (actual export format)
  readonly requiredColumns = [
    'activity date', // or 'date'
    'instrument',
    'description',
    'trans code', // or 'side'
    'quantity',
    'price',
  ];

  readonly optionalColumns = ['amount', 'process date', 'settle date'];

  canHandle(headers: string[]): BrokerDetectionResult {
    console.log('🏦 Robinhood adapter checking headers:', headers);
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

    // Robinhood CSV export specific indicators
    const robinhoodIndicators = [
      'activity date',
      'process date',
      'settle date',
      'trans code',
      'description',
    ];

    const missingRequired = this.validateRequiredColumns(headers);
    const foundIndicators = robinhoodIndicators.filter(indicator =>
      normalizedHeaders.some(header => this.isColumnMatch(header, indicator))
    );

    let confidence = 0;
    let reason = '';

    if (missingRequired.length === 0) {
      confidence += 0.4;
      reason += 'Has all required columns. ';
    }

    if (foundIndicators.length >= 3) {
      confidence += 0.5 + foundIndicators.length * 0.1;
      reason += `Found Robinhood CSV indicators: ${foundIndicators.join(', ')}. `;
    }

    // Check for Robinhood-specific transaction codes pattern
    const hasTransCode = normalizedHeaders.some(
      header =>
        this.isColumnMatch(header, 'trans code') || this.isColumnMatch(header, 'transaction code')
    );

    if (hasTransCode) {
      confidence += 0.3;
      reason += 'Has Trans Code column typical of Robinhood exports. ';
    }

    const result = {
      broker: this.brokerName,
      confidence: Math.min(confidence, 1),
      reason: reason.trim(),
      requiredColumns: this.requiredColumns,
      foundColumns: headers.filter(h =>
        this.requiredColumns.some(req => this.isColumnMatch(h, req))
      ),
    };

    console.log('🏦 Robinhood detection result:', result);
    return result;
  }

  adaptRow(rawData: RawTradeData): AdaptationResult {
    const errors: Array<{ field: string; value: unknown; message: string }> = [];
    const warnings: Array<{ field: string; value: unknown; message: string }> = [];

    try {
      // Skip non-options transactions
      const transCode = String(rawData['Trans Code'] || rawData['trans_code'] || '').toUpperCase();
      const optionsTransCodes = ['STO', 'BTO', 'STC', 'BTC', 'OEXP', 'OASGN'];

      if (!optionsTransCodes.includes(transCode)) {
        // Skip non-options rows
        return {
          success: false,
          data: undefined,
          errors: [
            {
              field: 'trans_code',
              value: transCode,
              message: `Skipping non-options transaction: ${transCode}`,
            },
          ],
          warnings: [],
        };
      }

      // Get symbol from instrument
      const symbol = this.normalizeSymbol(rawData.Instrument || rawData.instrument);
      if (!symbol) {
        errors.push({
          field: 'instrument',
          value: rawData.Instrument || rawData.instrument,
          message: 'Missing or invalid symbol',
        });
      }

      // Parse option details from description
      const description = String(rawData.Description || rawData.description || '');
      const optionDetails = this.parseDescriptionForOptionDetails(description);

      if (!optionDetails.optionType) {
        errors.push({
          field: 'description',
          value: description,
          message: 'Could not parse option type from description',
        });
      }

      if (!optionDetails.strikePrice) {
        errors.push({
          field: 'description',
          value: description,
          message: 'Could not parse strike price from description',
        });
      }

      if (!optionDetails.expirationDate) {
        errors.push({
          field: 'description',
          value: description,
          message: 'Could not parse expiration date from description',
        });
      }

      // Parse trade date
      const tradeDate = this.parseDate(
        rawData['Activity Date'] || rawData['activity_date'] || rawData.date
      );
      if (!tradeDate) {
        errors.push({
          field: 'activity_date',
          value: rawData['Activity Date'] || rawData.date,
          message: 'Invalid or missing trade date',
        });
      }

      // Parse quantity
      const quantity = this.parseNumber(rawData.Quantity || rawData.quantity);
      if (quantity === null || quantity === 0) {
        errors.push({
          field: 'quantity',
          value: rawData.Quantity || rawData.quantity,
          message: 'Invalid or missing quantity',
        });
      }

      // Parse price (premium per share)
      const price = this.parseNumber(rawData.Price || rawData.price);
      if (price === null) {
        errors.push({
          field: 'price',
          value: rawData.Price || rawData.price,
          message: 'Invalid or missing price',
        });
      }

      // Convert Trans Code to trade action
      const tradeAction = this.parseRobinhoodTransCode(transCode);
      if (!tradeAction) {
        errors.push({
          field: 'trans_code',
          value: transCode,
          message: 'Cannot determine trade action from transaction code',
        });
      }

      // Parse fees from Amount vs Price calculation
      const amount = this.parseNumber(rawData.Amount || rawData.amount) || 0;
      const totalPremium = Math.abs((price || 0) * (quantity || 0));
      const fees = Math.max(0, totalPremium - Math.abs(amount));

      // Return early if we have critical errors
      if (errors.length > 0) {
        return { success: false, data: undefined, errors, warnings };
      }

      const normalizedData: NormalizedTradeData = {
        symbol: symbol!,
        option_type: optionDetails.optionType!,
        strike_price: optionDetails.strikePrice!,
        expiration_date: optionDetails.expirationDate!,
        trade_action: tradeAction!,
        quantity: Math.abs(quantity!),
        premium: Math.abs(price!),
        commission: 0, // Robinhood is commission-free
        fees,
        trade_date: tradeDate!,
        notes: `Robinhood - ${description}`,
        symbol_info: {
          name: symbol!,
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
   * Parse Robinhood description to extract option details
   * Format: "ASTS 10/24/2025 Put $80.00"
   */
  private parseDescriptionForOptionDetails(description: string): {
    optionType: 'call' | 'put' | null;
    strikePrice: number | null;
    expirationDate: string | null;
  } {
    const result = {
      optionType: null as 'call' | 'put' | null,
      strikePrice: null as number | null,
      expirationDate: null as string | null,
    };

    if (!description) return result;

    // Extract option type (Call/Put)
    const optionTypeMatch = description.match(/\b(call|put)\b/i);
    if (optionTypeMatch) {
      result.optionType = optionTypeMatch[1].toLowerCase() as 'call' | 'put';
    }

    // Extract strike price ($80.00)
    const strikePriceMatch = description.match(/\$(\d+(?:\.\d{2})?)/);
    if (strikePriceMatch) {
      result.strikePrice = parseFloat(strikePriceMatch[1]);
    }

    // Extract expiration date (10/24/2025)
    const expirationMatch = description.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (expirationMatch) {
      const dateStr = expirationMatch[1];
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        // Format as YYYY-MM-DD
        result.expirationDate = date.toISOString().split('T')[0];
      }
    }

    return result;
  }

  /**
   * Parse Robinhood transaction code to trade action
   * Trans Codes: STO=Sell To Open, BTO=Buy To Open, STC=Sell To Close, BTC=Buy To Close
   */
  private parseRobinhoodTransCode(transCode: string): NormalizedTradeData['trade_action'] | null {
    const cleaned = transCode.toUpperCase().trim();

    const mappings: Record<string, NormalizedTradeData['trade_action']> = {
      STO: 'sell_to_open',
      BTO: 'buy_to_open',
      STC: 'sell_to_close',
      BTC: 'buy_to_close',
      SELL_TO_OPEN: 'sell_to_open',
      BUY_TO_OPEN: 'buy_to_open',
      SELL_TO_CLOSE: 'sell_to_close',
      BUY_TO_CLOSE: 'buy_to_close',
    };

    return mappings[cleaned] || null;
  }
}
