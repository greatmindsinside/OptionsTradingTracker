/**
 * Symbol Normalization Service
 * Handles symbol lookup, validation, and auto-creation with SymbolDAO integration
 */

import type { SQLiteDatabase } from '../db/sqlite';
import { SymbolDAO } from '../db/symbol-dao';
import type { Symbol as SymbolType } from '../db/validation';
import type { NormalizedTradeData } from './broker-adapters/base-adapter';

/**
 * Symbol lookup result
 */
export interface SymbolLookupResult {
  found: boolean;
  symbol?: SymbolType;
  needsCreation: boolean;
  normalizedSymbol: string;
}

/**
 * Symbol creation request
 */
export interface SymbolCreationRequest {
  symbol: string;
  name?: string;
  asset_type?: 'stock' | 'etf' | 'index' | 'futures' | 'forex' | 'crypto';
  exchange?: string;
  sector?: string;
  industry?: string;
}

/**
 * Symbol normalization result
 */
export interface SymbolNormalizationResult {
  success: boolean;
  originalSymbol: string;
  normalizedSymbol: string;
  existingSymbol?: SymbolType;
  createdSymbol?: SymbolType;
  errors: string[];
  warnings: string[];
}

/**
 * Batch normalization result
 */
export interface BatchSymbolResult {
  totalSymbols: number;
  existingSymbols: number;
  createdSymbols: number;
  failures: number;
  results: Map<string, SymbolNormalizationResult>;
  errors: Array<{
    symbol: string;
    error: string;
  }>;
}

/**
 * Symbol normalization options
 */
export interface SymbolNormalizationOptions {
  autoCreate: boolean; // Auto-create missing symbols
  validateFormat: boolean; // Validate symbol format
  updateExisting: boolean; // Update existing symbol info if provided
  cacheResults: boolean; // Cache lookup results
  maxCacheSize: number; // Maximum cache entries
}

/**
 * Default normalization options
 */
export const DEFAULT_NORMALIZATION_OPTIONS: SymbolNormalizationOptions = {
  autoCreate: true,
  validateFormat: true,
  updateExisting: false,
  cacheResults: true,
  maxCacheSize: 1000,
};

/**
 * Main symbol normalization service
 */
export class SymbolNormalizationService {
  private symbolDAO: SymbolDAO;
  private options: SymbolNormalizationOptions;
  private lookupCache = new Map<string, SymbolLookupResult>();
  private creationQueue = new Set<string>();

  constructor(database: SQLiteDatabase, options: Partial<SymbolNormalizationOptions> = {}) {
    this.symbolDAO = new SymbolDAO(database);
    this.options = { ...DEFAULT_NORMALIZATION_OPTIONS, ...options };
  }

  /**
   * Normalize a single symbol
   */
  async normalizeSymbol(
    symbol: string,
    symbolInfo?: Omit<SymbolCreationRequest, 'symbol'>
  ): Promise<SymbolNormalizationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const originalSymbol = symbol;

    try {
      // Step 1: Normalize symbol format
      const normalizedSymbol = this.formatSymbol(symbol);

      if (!normalizedSymbol) {
        errors.push('Symbol is empty or invalid after normalization');
        return {
          success: false,
          originalSymbol,
          normalizedSymbol: '',
          errors,
          warnings,
        };
      }

      // Step 2: Validate format if enabled
      if (this.options.validateFormat) {
        const formatErrors = this.validateSymbolFormat(normalizedSymbol);
        errors.push(...formatErrors);

        if (formatErrors.length > 0) {
          return {
            success: false,
            originalSymbol,
            normalizedSymbol,
            errors,
            warnings,
          };
        }
      }

      // Step 3: Check cache first
      let lookupResult = this.getCachedLookup(normalizedSymbol);

      if (!lookupResult) {
        // Step 4: Lookup in database
        lookupResult = await this.lookupSymbol(normalizedSymbol);

        // Cache the result
        if (this.options.cacheResults) {
          this.cacheLookupResult(normalizedSymbol, lookupResult);
        }
      }

      // Step 5: Handle existing symbol
      if (lookupResult.found && lookupResult.symbol) {
        let updatedSymbol = lookupResult.symbol;

        // Update existing symbol if requested and new info provided
        if (this.options.updateExisting && symbolInfo) {
          updatedSymbol = await this.updateSymbolInfo(lookupResult.symbol, symbolInfo);
          warnings.push('Updated existing symbol with new information');
        }

        return {
          success: true,
          originalSymbol,
          normalizedSymbol,
          existingSymbol: updatedSymbol,
          errors,
          warnings,
        };
      }

      // Step 6: Create new symbol if needed and allowed
      if (lookupResult.needsCreation && this.options.autoCreate) {
        const creationRequest: SymbolCreationRequest = {
          symbol: normalizedSymbol,
          name: symbolInfo?.name || normalizedSymbol,
          asset_type: symbolInfo?.asset_type || 'stock',
          exchange: symbolInfo?.exchange,
          sector: symbolInfo?.sector,
          industry: symbolInfo?.industry,
        };

        const createdSymbol = await this.createSymbol(creationRequest);

        // Update cache with new symbol
        if (this.options.cacheResults) {
          this.cacheLookupResult(normalizedSymbol, {
            found: true,
            symbol: createdSymbol,
            needsCreation: false,
            normalizedSymbol,
          });
        }

        warnings.push('Created new symbol entry');

        return {
          success: true,
          originalSymbol,
          normalizedSymbol,
          createdSymbol,
          errors,
          warnings,
        };
      }

      // Step 7: Symbol needed but creation not allowed
      if (lookupResult.needsCreation && !this.options.autoCreate) {
        errors.push('Symbol not found and auto-creation is disabled');
        return {
          success: false,
          originalSymbol,
          normalizedSymbol,
          errors,
          warnings,
        };
      }

      // Should not reach here
      errors.push('Unknown symbol normalization state');
      return {
        success: false,
        originalSymbol,
        normalizedSymbol,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Symbol normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      return {
        success: false,
        originalSymbol,
        normalizedSymbol: this.formatSymbol(symbol),
        errors,
        warnings,
      };
    }
  }

  /**
   * Normalize symbols from trade data batch
   */
  async normalizeBatchFromTrades(trades: NormalizedTradeData[]): Promise<BatchSymbolResult> {
    const symbolMap = new Map<string, Omit<SymbolCreationRequest, 'symbol'>>();

    // Extract unique symbols and their info from trades
    for (const trade of trades) {
      const symbol = trade.symbol;

      if (!symbolMap.has(symbol)) {
        symbolMap.set(symbol, {
          name: trade.symbol_info?.name,
          asset_type: trade.symbol_info?.asset_type,
          exchange: trade.symbol_info?.exchange,
          sector: trade.symbol_info?.sector,
          industry: trade.symbol_info?.industry,
        });
      } else {
        // Merge symbol info (prefer non-empty values)
        const existing = symbolMap.get(symbol)!;
        const newInfo = trade.symbol_info;

        if (newInfo) {
          symbolMap.set(symbol, {
            name: existing.name || newInfo.name,
            asset_type: existing.asset_type || newInfo.asset_type,
            exchange: existing.exchange || newInfo.exchange,
            sector: existing.sector || newInfo.sector,
            industry: existing.industry || newInfo.industry,
          });
        }
      }
    }

    return this.normalizeBatch(symbolMap);
  }

  /**
   * Normalize a batch of symbols
   */
  async normalizeBatch(
    symbolsMap: Map<string, Omit<SymbolCreationRequest, 'symbol'>>
  ): Promise<BatchSymbolResult> {
    const results = new Map<string, SymbolNormalizationResult>();
    const errors: Array<{ symbol: string; error: string }> = [];

    let existingSymbols = 0;
    let createdSymbols = 0;
    let failures = 0;

    // Process symbols in batches to avoid overwhelming the database
    const batchSize = 50;
    const symbolEntries = Array.from(symbolsMap.entries());

    for (let i = 0; i < symbolEntries.length; i += batchSize) {
      const batch = symbolEntries.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map(async ([symbol, symbolInfo]) => {
        try {
          const result = await this.normalizeSymbol(symbol, symbolInfo);
          results.set(symbol, result);

          if (result.success) {
            if (result.existingSymbol) existingSymbols++;
            if (result.createdSymbol) createdSymbols++;
          } else {
            failures++;
            errors.push({
              symbol,
              error: result.errors.join('; '),
            });
          }
        } catch (error) {
          failures++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ symbol, error: errorMessage });

          results.set(symbol, {
            success: false,
            originalSymbol: symbol,
            normalizedSymbol: this.formatSymbol(symbol),
            errors: [errorMessage],
            warnings: [],
          });
        }
      });

      await Promise.all(batchPromises);
    }

    return {
      totalSymbols: symbolsMap.size,
      existingSymbols,
      createdSymbols,
      failures,
      results,
      errors,
    };
  }

  /**
   * Format symbol to standard format
   */
  private formatSymbol(symbol: string): string {
    if (!symbol) return '';

    return symbol
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, '') // Remove non-alphanumeric characters
      .substring(0, 10); // Limit length
  }

  /**
   * Validate symbol format
   */
  private validateSymbolFormat(symbol: string): string[] {
    const errors: string[] = [];

    if (!symbol) {
      errors.push('Symbol cannot be empty');
      return errors;
    }

    if (symbol.length < 1) {
      errors.push('Symbol must be at least 1 character');
    }

    if (symbol.length > 10) {
      errors.push('Symbol cannot be longer than 10 characters');
    }

    if (!/^[A-Z0-9]+$/.test(symbol)) {
      errors.push('Symbol must contain only uppercase letters and numbers');
    }

    return errors;
  }

  /**
   * Lookup symbol in database
   */
  private async lookupSymbol(symbol: string): Promise<SymbolLookupResult> {
    try {
      const existingSymbol = await this.symbolDAO.findBySymbol(symbol);

      if (existingSymbol) {
        return {
          found: true,
          symbol: existingSymbol,
          needsCreation: false,
          normalizedSymbol: symbol,
        };
      }

      return {
        found: false,
        needsCreation: true,
        normalizedSymbol: symbol,
      };
    } catch {
      // If lookup fails, assume symbol needs creation
      return {
        found: false,
        needsCreation: true,
        normalizedSymbol: symbol,
      };
    }
  }

  /**
   * Create new symbol
   */
  private async createSymbol(request: SymbolCreationRequest): Promise<SymbolType> {
    // Prevent duplicate creation attempts
    if (this.creationQueue.has(request.symbol)) {
      throw new Error(`Symbol ${request.symbol} is already being created`);
    }

    this.creationQueue.add(request.symbol);

    try {
      const symbolData = {
        symbol: request.symbol,
        name: request.name || request.symbol,
        asset_type: request.asset_type || ('stock' as const),
        exchange: request.exchange,
        sector: request.sector,
        industry: request.industry,
      };

      const result = await this.symbolDAO.create(symbolData);
      if (!result.success || !result.data) {
        throw new Error(`Failed to create symbol: ${result.error || 'Unknown error'}`);
      }
      return result.data;
    } finally {
      this.creationQueue.delete(request.symbol);
    }
  }

  /**
   * Update existing symbol with new information
   */
  private async updateSymbolInfo(
    existingSymbol: SymbolType,
    newInfo: Omit<SymbolCreationRequest, 'symbol'>
  ): Promise<SymbolType> {
    const updates: Partial<SymbolType> = {};
    let hasUpdates = false;

    // Only update if new info is provided and different
    if (newInfo.name && newInfo.name !== existingSymbol.name) {
      updates.name = newInfo.name;
      hasUpdates = true;
    }

    if (newInfo.asset_type && newInfo.asset_type !== existingSymbol.asset_type) {
      updates.asset_type = newInfo.asset_type;
      hasUpdates = true;
    }

    if (newInfo.exchange && newInfo.exchange !== existingSymbol.exchange) {
      updates.exchange = newInfo.exchange;
      hasUpdates = true;
    }

    if (newInfo.sector && newInfo.sector !== existingSymbol.sector) {
      updates.sector = newInfo.sector;
      hasUpdates = true;
    }

    if (newInfo.industry && newInfo.industry !== existingSymbol.industry) {
      updates.industry = newInfo.industry;
      hasUpdates = true;
    }

    if (hasUpdates && existingSymbol.id) {
      const result = await this.symbolDAO.update(existingSymbol.id, updates);
      if (!result.success || !result.data) {
        throw new Error(`Failed to update symbol: ${result.error || 'Unknown error'}`);
      }
      return result.data;
    }

    return existingSymbol;
  }

  /**
   * Cache management
   */
  private getCachedLookup(symbol: string): SymbolLookupResult | null {
    return this.lookupCache.get(symbol) || null;
  }

  private cacheLookupResult(symbol: string, result: SymbolLookupResult): void {
    if (this.lookupCache.size >= this.options.maxCacheSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.lookupCache.keys().next().value;
      if (firstKey) {
        this.lookupCache.delete(firstKey);
      }
    }

    this.lookupCache.set(symbol, result);
  }

  /**
   * Clear lookup cache
   */
  clearCache(): void {
    this.lookupCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.lookupCache.size,
      maxSize: this.options.maxCacheSize,
    };
  }

  /**
   * Update service options
   */
  setOptions(options: Partial<SymbolNormalizationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): SymbolNormalizationOptions {
    return { ...this.options };
  }
}
