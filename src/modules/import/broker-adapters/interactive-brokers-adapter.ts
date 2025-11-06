/**
 * Interactive Brokers CSV Adapter
 * Handles Interactive Brokers Flex Query and Activity Statement formats
 */

import type {
  AdaptationResult,
  BrokerDetectionResult,
  NormalizedTradeData,
  RawTradeData,
} from './base-adapter';
import { BaseBrokerAdapter, BrokerType } from './base-adapter';

export class InteractiveBrokersBrokerAdapter extends BaseBrokerAdapter {
  readonly brokerName: BrokerType = 'interactive_brokers';

  // Interactive Brokers common column names
  readonly requiredColumns = ['symbol', 'quantity', 'trade_price', 'date_time', 'buy_sell'];

  readonly optionalColumns = [
    'comm_ccy',
    'commission',
    'description',
    'asset_category',
    'multiplier',
    'strike',
    'expiry',
    'put_call',
  ];

  canHandle(headers: string[]): BrokerDetectionResult {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

    // Interactive Brokers specific indicators
    const ibIndicators = [
      'interactive',
      'flex',
      'asset_category',
      'multiplier',
      'put_call',
      'comm_ccy',
      'date_time',
    ];

    const missingRequired = this.validateRequiredColumns(headers);
    const foundIndicators = ibIndicators.filter(indicator =>
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
      reason += `Found Interactive Brokers indicators: ${foundIndicators.join(', ')}. `;
    }

    // IB typically has separate columns for option details
    const hasOptionColumns = ['strike', 'expiry', 'put_call', 'multiplier'].filter(col =>
      normalizedHeaders.some(header => this.isColumnMatch(header, col))
    );

    if (hasOptionColumns.length >= 2) {
      confidence += 0.2;
      reason += 'Has option detail columns. ';
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
      // Get symbol
      const symbol = this.normalizeSymbol(rawData.symbol);
      if (!symbol) {
        errors.push({
          field: 'symbol',
          value: rawData.symbol,
          message: 'Missing or invalid symbol',
        });
      }

      // Parse option type from put_call column
      const optionType = this.parseOptionType(rawData.put_call);
      if (!optionType) {
        errors.push({
          field: 'put_call',
          value: rawData.put_call,
          message: 'Missing or invalid option type',
        });
      }

      // Parse strike price
      const strikePrice = this.parseNumber(rawData.strike);
      if (strikePrice === null) {
        errors.push({
          field: 'strike',
          value: rawData.strike,
          message: 'Missing or invalid strike price',
        });
      }

      // Parse expiration date
      const expirationDate = this.parseDate(rawData.expiry);
      if (!expirationDate) {
        errors.push({
          field: 'expiry',
          value: rawData.expiry,
          message: 'Missing or invalid expiration date',
        });
      }

      // Parse trade date/time
      const tradeDate = this.parseDate(rawData.date_time);
      if (!tradeDate) {
        errors.push({
          field: 'date_time',
          value: rawData.date_time,
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
      const price = this.parseNumber(rawData.trade_price);
      if (price === null) {
        errors.push({
          field: 'trade_price',
          value: rawData.trade_price,
          message: 'Invalid or missing trade price',
        });
      }

      // Parse buy/sell to determine action
      const buySell = String(rawData.buy_sell || '');
      const tradeAction = this.parseIBBuySell(buySell);
      if (!tradeAction) {
        errors.push({
          field: 'buy_sell',
          value: buySell,
          message: 'Cannot determine trade action from buy/sell',
        });
      }

      // Parse commission and fees
      const commission = Math.abs(
        this.parseNumber(rawData.commission) || this.parseNumber(rawData.comm_ccy) || 0
      );
      const fees = 0; // IB typically includes fees in commission

      // Return early if we have critical errors
      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      const normalizedData: NormalizedTradeData = {
        symbol: symbol!,
        option_type: optionType!,
        strike_price: strikePrice!,
        expiration_date: expirationDate!,
        trade_action: tradeAction!,
        quantity: Math.abs(quantity!),
        premium: Math.abs(price!),
        commission,
        fees,
        trade_date: tradeDate!,
        notes: `Interactive Brokers - ${rawData.description || ''}`,
        symbol_info: {
          name: symbol!,
          asset_type: this.parseAssetType(rawData.asset_category),
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
   * Parse Interactive Brokers buy/sell to trade action
   * IB typically uses just "BUY"/"SELL" without open/close designation
   */
  private parseIBBuySell(buySell: string): NormalizedTradeData['trade_action'] | null {
    const cleaned = buySell.toLowerCase().trim();

    // For IB, we need to infer open/close from context
    // Default to opening positions for simplicity
    if (cleaned === 'buy' || cleaned === 'bot') {
      return 'buy_to_open';
    }

    if (cleaned === 'sell' || cleaned === 'sld') {
      return 'sell_to_open';
    }

    // Handle explicit open/close if present
    if (cleaned.includes('open')) {
      return cleaned.includes('buy') ? 'buy_to_open' : 'sell_to_open';
    }

    if (cleaned.includes('close')) {
      return cleaned.includes('buy') ? 'buy_to_close' : 'sell_to_close';
    }

    return null;
  }

  /**
   * Parse IB asset category to our asset type
   */
  private parseAssetType(
    assetCategory: unknown
  ): 'stock' | 'etf' | 'index' | 'futures' | 'forex' | 'crypto' {
    if (!assetCategory) return 'stock';

    const category = String(assetCategory).toLowerCase();

    if (category.includes('stk') || category.includes('stock')) return 'stock';
    if (category.includes('etf')) return 'etf';
    if (category.includes('ind') || category.includes('index')) return 'index';
    if (category.includes('fut') || category.includes('future')) return 'futures';
    if (category.includes('cash') || category.includes('forex')) return 'forex';
    if (category.includes('crypto')) return 'crypto';

    return 'stock'; // Default
  }
}
