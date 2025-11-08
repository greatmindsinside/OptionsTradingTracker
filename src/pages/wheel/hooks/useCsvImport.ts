import { detectBrokerFromHeaders, getBrokerAdapter } from '@/modules/import/broker-adapters';
import type {
  BaseBrokerAdapter,
  NormalizedTradeData,
} from '@/modules/import/broker-adapters/base-adapter';
import { CSVParser } from '@/modules/import/csv-parser';
import { useEntriesStore } from '@/stores/useEntriesStore';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelUIStore } from '@/stores/useWheelUIStore';
import type { TemplateKind, TemplatePayloads } from '@/types/templates';

// Extended adapter interface for optional methods that may be exposed
interface AdapterWithOptionalMethods extends BaseBrokerAdapter {
  parseDescriptionForOptionDetails?: (description: string) => {
    optionType: 'call' | 'put' | null;
    strikePrice: number | null;
    expirationDate: string | null;
  };
  parseDate?: (dateValue: unknown) => string | null;
  parseNumber?: (value: unknown) => number | null;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: number;
}

export function useCsvImport() {
  const setImporting = useWheelUIStore(s => s.setImporting);
  const addLedgerEvent = useWheelStore(s => s.addLedgerEvent);
  const reloadFn = useWheelStore(s => s.reloadFn);
  const { addEntry } = useEntriesStore();

  const handleImport = async (file: File): Promise<ImportResult> => {
    setImporting(true);
    const result: ImportResult = {
      success: false,
      message: '',
      imported: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      // Parse CSV file
      const csvParser = new CSVParser();
      const parseResult = await csvParser.parseFromFile(file);

      if (parseResult.errors.length > 0) {
        result.message = `CSV parsing errors: ${parseResult.errors.length} errors found`;
        result.errors = parseResult.errors.length;
        return result;
      }

      if (parseResult.data.length === 0) {
        result.message = 'CSV file is empty';
        return result;
      }

      // Detect broker from headers
      const headers = parseResult.meta.fields || [];
      if (headers.length === 0) {
        result.message = 'CSV file has no headers';
        return result;
      }

      const brokerDetection = detectBrokerFromHeaders(headers);
      if (!brokerDetection) {
        result.message = 'Could not detect broker format. Please ensure CSV has required columns.';
        return result;
      }

      const adapter = getBrokerAdapter(brokerDetection.broker);
      if (!adapter) {
        result.message = `Broker adapter not found for ${brokerDetection.broker}`;
        return result;
      }

      // Normalize each row
      const normalizedTrades: NormalizedTradeData[] = [];
      const errors: string[] = [];

      for (let i = 0; i < parseResult.data.length; i++) {
        const row = parseResult.data[i] as Record<string, unknown>;
        const transCode = String(row['Trans Code'] || row['trans_code'] || '').toUpperCase();

        // Skip expiration entries - they're handled by templates
        if (transCode === 'OEXP') {
          result.skipped++;
          continue;
        }

        // Handle assignments separately - they need special processing
        if (transCode === 'OASGN') {
          // Try to parse assignment from OASGN row
          const assignment = parseAssignmentFromOasgnRow(row, adapter);
          if (assignment) {
            normalizedTrades.push(assignment);
          } else {
            result.skipped++;
          }
          continue;
        }

        // Skip non-options transactions (Buy/Sell of shares, etc.)
        if (!['STO', 'BTO', 'STC', 'BTC'].includes(transCode)) {
          result.skipped++;
          continue;
        }

        // Normalize the row
        const adaptation = adapter.adaptRow(row);

        if (adaptation.success && adaptation.data) {
          normalizedTrades.push(adaptation.data);
        } else {
          // For other errors, log them but continue
          if (adaptation.errors.length > 0) {
            errors.push(`Row ${i + 1}: ${adaptation.errors.map(e => e.message).join(', ')}`);
            result.errors++;
          }
        }
      }

      // Map normalized trades to journal entry templates
      for (const trade of normalizedTrades) {
        try {
          await mapNormalizedTradeToJournal(trade, addEntry);
          result.imported++;
        } catch (error) {
          errors.push(
            `Failed to import trade for ${trade.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          result.errors++;
        }
      }

      // Reload wheel data after import
      if (reloadFn) {
        await reloadFn();
      }

      // Add ledger event
      addLedgerEvent({
        id: crypto.randomUUID(),
        kind: 'trade_imported',
        when: new Date().toISOString(),
        meta: {
          file: file.name,
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors,
        },
      });

      // Build result message
      if (result.imported > 0) {
        result.success = true;
        result.message = `Successfully imported ${result.imported} trade(s)`;
        if (result.skipped > 0) {
          result.message += `, skipped ${result.skipped} row(s)`;
        }
        if (result.errors > 0) {
          result.message += `, ${result.errors} error(s)`;
        }
      } else {
        result.message = `No trades imported. ${result.skipped} row(s) skipped, ${result.errors} error(s)`;
      }

      if (errors.length > 0 && errors.length <= 10) {
        result.message += `\nErrors: ${errors.join('; ')}`;
      } else if (errors.length > 10) {
        result.message += `\nFirst 10 errors: ${errors.slice(0, 10).join('; ')}`;
      }

      return result;
    } catch (error) {
      result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors++;
      return result;
    } finally {
      setImporting(false);
    }
  };

  return { handleImport };
}

/**
 * Map normalized trade data to journal entry template
 */
async function mapNormalizedTradeToJournal(
  trade: NormalizedTradeData,
  addEntry: <K extends TemplateKind>(kind: K, payload: TemplatePayloads[K]) => Promise<void>
): Promise<void> {
  const accountId = 'default'; // Use default account
  const tradeDate = trade.trade_date || new Date().toISOString().split('T')[0];
  const expirationDate = trade.expiration_date;
  const contracts = trade.quantity;
  const strike = trade.strike_price;
  const premiumPerContract = trade.premium;
  const fees = (trade.fees || 0) + (trade.commission || 0);

  // Determine template kind based on trade action and option type
  if (trade.trade_action === 'sell_to_open') {
    if (trade.option_type === 'put') {
      await addEntry('tmplSellPut', {
        accountId,
        symbol: trade.symbol,
        date: tradeDate,
        contracts,
        premiumPerContract,
        strike,
        expiration: expirationDate,
        fee: fees > 0 ? fees : undefined,
      });
    } else if (trade.option_type === 'call') {
      await addEntry('tmplSellCoveredCall', {
        accountId,
        symbol: trade.symbol,
        date: tradeDate,
        contracts,
        premiumPerContract,
        strike,
        expiration: expirationDate,
        fee: fees > 0 ? fees : undefined,
      });
    }
  } else if (trade.trade_action === 'assignment') {
    // Handle assignments - check option type
    if (trade.option_type === 'put') {
      await addEntry('tmplPutAssigned', {
        accountId,
        symbol: trade.symbol,
        date: tradeDate,
        contracts,
        strike,
        expiration: expirationDate,
        fee: fees > 0 ? fees : undefined,
      });
    } else if (trade.option_type === 'call') {
      await addEntry('tmplCallAssigned', {
        accountId,
        symbol: trade.symbol,
        date: tradeDate,
        contracts,
        strike,
        expiration: expirationDate,
        fee: fees > 0 ? fees : undefined,
      });
    } else {
      throw new Error(`Unknown option type for assignment: ${trade.option_type}`);
    }
  } else if (
    trade.trade_action === 'buy_to_open' ||
    trade.trade_action === 'buy_to_close' ||
    trade.trade_action === 'sell_to_close'
  ) {
    // Skip buy-to-open, buy-to-close, and sell-to-close for now
    // These are typically closing trades or long positions we don't track
    throw new Error(`Trade action ${trade.trade_action} not supported for import`);
  } else {
    throw new Error(`Unknown trade action: ${trade.trade_action}`);
  }
}

/**
 * Parse assignment from OASGN row
 */
function parseAssignmentFromOasgnRow(
  oasgnRow: Record<string, unknown>,
  adapter: AdapterWithOptionalMethods
): NormalizedTradeData | null {
  try {
    // Try to extract option details from OASGN description
    const description = String(oasgnRow.Description || oasgnRow.description || '');

    // Use the adapter's parseDescriptionForOptionDetails method if available
    // Otherwise, parse manually
    let optionDetails: {
      optionType: 'call' | 'put' | null;
      strikePrice: number | null;
      expirationDate: string | null;
    };

    if (adapter.parseDescriptionForOptionDetails) {
      optionDetails = adapter.parseDescriptionForOptionDetails(description);
    } else {
      // Manual parsing
      optionDetails = {
        optionType: null,
        strikePrice: null,
        expirationDate: null,
      };

      // Extract option type (Call/Put)
      const optionTypeMatch = description.match(/\b(call|put)\b/i);
      if (optionTypeMatch) {
        optionDetails.optionType = optionTypeMatch[1].toLowerCase() as 'call' | 'put';
      }

      // Extract strike price ($80.00)
      const strikePriceMatch = description.match(/\$(\d+(?:\.\d{2})?)/);
      if (strikePriceMatch) {
        optionDetails.strikePrice = parseFloat(strikePriceMatch[1]);
      }

      // Extract expiration date (10/24/2025)
      const expirationMatch = description.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (expirationMatch) {
        const dateStr = expirationMatch[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          optionDetails.expirationDate = date.toISOString().split('T')[0];
        }
      }
    }

    if (!optionDetails.optionType || !optionDetails.strikePrice || !optionDetails.expirationDate) {
      return null;
    }

    // Get trade date using adapter's parseDate method
    let tradeDate: string | null = null;
    if (adapter.parseDate) {
      tradeDate = adapter.parseDate(
        oasgnRow['Activity Date'] || oasgnRow['activity_date'] || oasgnRow.date
      );
    } else {
      // Manual date parsing
      const dateValue = oasgnRow['Activity Date'] || oasgnRow['activity_date'] || oasgnRow.date;
      if (dateValue) {
        const date = new Date(String(dateValue));
        if (!isNaN(date.getTime())) {
          tradeDate = date.toISOString().split('T')[0];
        }
      }
    }

    if (!tradeDate) {
      return null;
    }

    // Get quantity from OASGN row
    let quantity: number | null = null;
    if (adapter.parseNumber) {
      quantity = adapter.parseNumber(oasgnRow.Quantity || oasgnRow.quantity);
    } else {
      // Manual number parsing
      const qtyValue = oasgnRow.Quantity || oasgnRow.quantity;
      if (qtyValue) {
        const num = parseFloat(String(qtyValue).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) {
          quantity = num;
        }
      }
    }

    if (!quantity || quantity === 0) {
      return null;
    }

    // Get symbol
    const symbol = String(oasgnRow.Instrument || oasgnRow.instrument || '')
      .toUpperCase()
      .trim();
    if (!symbol) {
      return null;
    }

    return {
      symbol,
      option_type: optionDetails.optionType,
      strike_price: optionDetails.strikePrice,
      expiration_date: optionDetails.expirationDate,
      trade_action: 'assignment' as unknown as NormalizedTradeData['trade_action'], // Special marker for assignments
      quantity: Math.abs(quantity),
      premium: 0,
      commission: 0,
      fees: 0,
      trade_date: tradeDate,
      notes: `Assignment: ${description}`,
    };
  } catch (error) {
    console.error('Error parsing assignment:', error);
    return null;
  }
}
