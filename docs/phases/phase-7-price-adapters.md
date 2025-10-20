# Phase 7: Price Adapters 💰

## Goals

- Provide flexible price data sources
- Support manual entry, CSV upload, and HTTP fetching
- Cache prices efficiently with staleness warnings
- Handle CORS limitations gracefully

## Inputs

- Price data requirements from calculations
- Various price data sources and formats
- Caching and performance requirements

## Outputs

- Unified price adapter interface
- Manual price entry system
- CSV bulk price import
- HTTP fetcher with CORS handling
- Price caching and staleness detection

## Tasks Checklist

### Core Interface

- [ ] Create `/src/modules/price/adapters.ts` interface
- [ ] Implement `getPrice(ticker, date?) → Promise<number|null>`
- [ ] Create fallback chain (manual → cached → HTTP)
- [ ] Add staleness warnings and refresh indicators

### Manual Price Management

- [ ] Build `/src/modules/price/manualTable.ts` for manual entry
- [ ] Create price data management UI
- [ ] Add price data export/import for backup

### CSV Bulk Import

- [ ] Add CSV bulk import for historical prices
- [ ] Implement price caching in SQLite prices table
- [ ] Handle market hours and holiday logic

### HTTP Fetching

- [ ] Create `/src/modules/price/httpFetcher.ts` with CORS handling
- [ ] Document CORS limitations and workarounds

## Price Adapter Interface

### Core Adapter Contract

```typescript
interface PriceAdapter {
  name: string;
  priority: number;

  // Get single price for specific date (or latest)
  getPrice(ticker: string, date?: Date): Promise<PriceResult | null>;

  // Get price history for date range
  getPriceHistory(ticker: string, startDate: Date, endDate: Date): Promise<PriceResult[]>;

  // Check if adapter can provide data for ticker
  supports(ticker: string): boolean;

  // Get adapter status and configuration
  getStatus(): AdapterStatus;
}

interface PriceResult {
  ticker: string;
  date: Date;
  price: number;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  staleness: number; // Hours since last update
}

interface AdapterStatus {
  available: boolean;
  lastError?: string;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}
```

### Adapter Chain Manager

```typescript
class PriceAdapterChain {
  private adapters: PriceAdapter[] = [];

  constructor() {
    // Register adapters in priority order
    this.register(new ManualPriceAdapter());
    this.register(new CachedPriceAdapter());
    this.register(new HTTPPriceAdapter());
  }

  async getPrice(ticker: string, date?: Date): Promise<PriceResult | null> {
    for (const adapter of this.adapters) {
      try {
        const result = await adapter.getPrice(ticker, date);
        if (result) {
          await this.cacheResult(result);
          return result;
        }
      } catch (error) {
        console.warn(`Adapter ${adapter.name} failed:`, error);
        continue;
      }
    }

    return null;
  }

  private async cacheResult(result: PriceResult): Promise<void> {
    // Cache successful results for future use
    await this.cachedAdapter.storePrice(result);
  }
}
```

## Manual Price Management

### Manual Price Adapter

```typescript
class ManualPriceAdapter implements PriceAdapter {
  name = 'Manual Entry';
  priority = 1;

  async getPrice(ticker: string, date?: Date): Promise<PriceResult | null> {
    const targetDate = date || new Date();

    const price = await db.query(
      `
      SELECT price, dt, updatedAt 
      FROM prices 
      WHERE underlying = ? AND dt <= ? 
      ORDER BY dt DESC 
      LIMIT 1
    `,
      [ticker, targetDate]
    );

    if (!price) return null;

    return {
      ticker,
      date: new Date(price.dt),
      price: price.price,
      source: 'manual',
      confidence: 'high',
      staleness: (Date.now() - new Date(price.updatedAt).getTime()) / (1000 * 60 * 60),
    };
  }

  supports(ticker: string): boolean {
    return true; // Manual entry supports any ticker
  }

  async setPrice(ticker: string, date: Date, price: number): Promise<void> {
    await db.query(
      `
      INSERT OR REPLACE INTO prices (underlying, dt, close, source) 
      VALUES (?, ?, ?, 'manual')
    `,
      [ticker, date, price]
    );
  }
}
```

### Price Management UI

```typescript
interface PriceManagementProps {
  tickers: string[];
  onPriceUpdate: (ticker: string, date: Date, price: number) => void;
}

interface PriceEntry {
  ticker: string;
  date: Date;
  price: number;
  source: string;
  staleness: number;
}
```

## CSV Bulk Import

### CSV Price Importer

```typescript
interface CSVPriceRow {
  Date: string; // "2024-01-15"
  Symbol: string; // "AAPL"
  Close: string; // "185.50"
  Volume?: string; // Optional
}

class CSVPriceImporter {
  async importFromCSV(file: File): Promise<ImportResult> {
    const results: ImportResult = {
      processed: 0,
      imported: 0,
      errors: [],
    };

    return new Promise(resolve => {
      Papa.parse(file, {
        header: true,
        streaming: true,
        step: async result => {
          results.processed++;

          try {
            const row = result.data as CSVPriceRow;
            await this.processPriceRow(row);
            results.imported++;
          } catch (error) {
            results.errors.push({
              row: results.processed,
              error: error.message,
              data: result.data,
            });
          }
        },
        complete: () => resolve(results),
      });
    });
  }

  private async processPriceRow(row: CSVPriceRow): Promise<void> {
    const date = new Date(row.Date);
    const price = parseFloat(row.Close);

    if (isNaN(price)) {
      throw new Error(`Invalid price: ${row.Close}`);
    }

    await db.query(
      `
      INSERT OR REPLACE INTO prices (underlying, dt, close, source) 
      VALUES (?, ?, ?, 'csv_import')
    `,
      [row.Symbol, date, price]
    );
  }
}
```

## HTTP Price Fetching

### HTTP Price Adapter

```typescript
class HTTPPriceAdapter implements PriceAdapter {
  name = 'HTTP API';
  priority = 3;

  private apiEndpoints = [
    'https://api.example.com/prices', // Example API
    'https://finance.yahoo.com', // Note: CORS issues
  ];

  async getPrice(ticker: string, date?: Date): Promise<PriceResult | null> {
    // Note: Many financial APIs have CORS restrictions
    // This is mainly for demonstration and future enhancement

    try {
      const response = await fetch(`${this.apiEndpoints[0]}/${ticker}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        ticker,
        date: new Date(data.date),
        price: data.price,
        source: 'http_api',
        confidence: 'medium',
        staleness: 0,
      };
    } catch (error) {
      // CORS or network error - fall back to cache or manual
      return null;
    }
  }

  supports(ticker: string): boolean {
    // Only support common tickers to avoid API abuse
    const supportedTickers = ['AAPL', 'SPY', 'QQQ', 'TSLA', 'MSFT'];
    return supportedTickers.includes(ticker.toUpperCase());
  }

  getStatus(): AdapterStatus {
    return {
      available: true,
      lastError: undefined,
      rateLimit: {
        remaining: 100, // Example rate limit
        resetTime: new Date(Date.now() + 60 * 60 * 1000),
      },
    };
  }
}
```

### CORS Handling Strategy

```typescript
// Document CORS limitations and workarounds
const CORSWorkarounds = {
  // Option 1: Use CORS proxy (not recommended for production)
  corsProxy: 'https://cors-anywhere.herokuapp.com/',

  // Option 2: Browser extension to disable CORS (development only)
  browserExtension: 'CORS Unblock',

  // Option 3: Local proxy server (advanced users)
  localProxy: 'http://localhost:8080/proxy/',

  // Recommended: Manual entry or CSV import for v1
  recommended: 'Use manual price entry or CSV bulk import for reliable operation',
};
```

## Price Staleness Management

### Staleness Detection

```typescript
interface StalenessConfig {
  warningThreshold: number; // Hours
  errorThreshold: number; // Hours
  maxAge: number; // Hours
}

const defaultStaleness: StalenessConfig = {
  warningThreshold: 24, // Warn if price > 1 day old
  errorThreshold: 168, // Error if price > 1 week old
  maxAge: 720, // Don't use prices > 1 month old
};

function assessStaleness(
  priceDate: Date,
  config: StalenessConfig = defaultStaleness
): 'fresh' | 'stale' | 'very_stale' | 'expired' {
  const hoursOld = (Date.now() - priceDate.getTime()) / (1000 * 60 * 60);

  if (hoursOld > config.maxAge) return 'expired';
  if (hoursOld > config.errorThreshold) return 'very_stale';
  if (hoursOld > config.warningThreshold) return 'stale';
  return 'fresh';
}
```

## Dependencies

- Phase 1 (SQLite database) for price storage
- HTTP fetching capabilities (with CORS limitations)

## Acceptance Tests

- [ ] Manual price entry persists correctly
- [ ] CSV bulk import handles large price datasets
- [ ] HTTP fetching works with public APIs (when CORS allows)
- [ ] Price cache reduces redundant API calls
- [ ] Staleness warnings appear for old data
- [ ] Fallback chain provides best available price
- [ ] Performance good with frequent price lookups
- [ ] UI makes price management intuitive

## Risks & Mitigations

- **Risk:** CORS limitations blocking HTTP price fetching
  - **Mitigation:** Document limitations, provide CSV alternatives, manual entry
- **Risk:** Price data accuracy and reliability
  - **Mitigation:** Multiple sources, manual verification, staleness warnings
- **Risk:** Rate limiting from price APIs
  - **Mitigation:** Caching, batch requests, user-controlled fetching

## Demo Script

```typescript
// Initialize price adapter chain
const priceChain = new PriceAdapterChain();

// Add manual price
await priceChain.adapters[0].setPrice('AAPL', new Date('2024-10-19'), 225.5);

// Bulk import from CSV
const csvImporter = new CSVPriceImporter();
const result = await csvImporter.importFromCSV(priceFile);
console.log(`Imported ${result.imported} prices, ${result.errors.length} errors`);

// Get current price with fallback chain
const price = await priceChain.getPrice('AAPL');
console.log(`AAPL: $${price?.price} (${price?.source}, ${price?.staleness.toFixed(1)} hours old)`);

// Check staleness
const staleness = assessStaleness(price?.date || new Date());
console.log(`Price staleness: ${staleness}`);
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Design price adapter interface and implement manual entry

**Previous Phase:** [Phase 6 - Tax-Harvest Helper](./phase-6-tax-harvest.md)
**Next Phase:** [Phase 8 - UI/UX](./phase-8-ui-ux.md)
