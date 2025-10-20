# Phase 2: CSV Import & Normalization 📊

## Goals

- Build drag-and-drop CSV import interface
- Parse Robinhood CSV formats with Papa Parse streaming
- Normalize data into unified schema
- Handle errors and validation gracefully

## Inputs

- SQLite database from Phase 1
- Robinhood CSV export formats
- Sample CSV files for testing

## Outputs

- CSV import UI component
- Robinhood format mapping logic
- Data validation and error handling
- Normalized trade records in database

## Tasks Checklist

### UI Components

- [ ] Create `/src/components/UploadDropzone.tsx` with drag-and-drop
- [ ] Add progress indicators for large file processing
- [ ] Create preview mode before final import
- [ ] Build import history and duplicate detection

### CSV Processing

- [ ] Implement `/src/modules/csv/parse.ts` with Papa Parse streaming
- [ ] Create `/src/modules/robinhood/mapping.ts` for field mapping
- [ ] Define `/src/modules/robinhood/types.ts` for CSV row interfaces
- [ ] Add CSV format auto-detection

### Data Pipeline

- [ ] Build data validation (dates, numbers, required fields)
- [ ] Create normalization pipeline to unified schema
- [ ] Implement error quarantine table for bad rows

## Robinhood CSV Formats

### Options History Format

```typescript
interface RobinhoodOptionsRow {
  Instrument: string; // "AAPL 240119C00185000"
  'Order Type': string; // "Buy to Open", "Sell to Close"
  Side: string; // "Buy", "Sell"
  Quantity: string; // "1"
  Price: string; // "2.50"
  'Executed At': string; // "2024-01-15T10:30:00Z"
  'Order Created At': string; // "2024-01-15T10:29:45Z"
  State: string; // "filled"
  'Chain Symbol': string; // "AAPL"
  'Strike Price': string; // "185.00"
  'Expiration Date': string; // "2024-01-19"
  'Option Type': string; // "call", "put"
}
```

### Orders Format

```typescript
interface RobinhoodOrderRow {
  'Created At': string;
  Direction: string; // "debit", "credit"
  Instrument: string;
  Price: string;
  Quantity: string;
  Side: string;
  State: string;
  'Updated At': string;
}
```

## Data Normalization

### Unified Trade Schema

```typescript
interface NormalizedTrade {
  sourceFile: string;
  underlying: string; // "AAPL"
  type: 'C' | 'P'; // Call or Put
  side: 'Buy' | 'Sell';
  qty: number;
  strike: number;
  expiration: Date;
  openTime?: Date;
  closeTime?: Date;
  price: number; // Per contract
  amount: number; // Total amount (price * qty * multiplier)
  fees: number;
  multiplier: number; // Usually 100
  orderId?: string;
  legId?: string;
}
```

## Error Handling

### Quarantine System

```sql
CREATE TABLE import_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sourceFile TEXT NOT NULL,
    rowIndex INTEGER NOT NULL,
    rawData TEXT NOT NULL,
    errorType TEXT NOT NULL,
    errorMessage TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Dependencies

- Phase 1 (SQLite database) must be complete
- Sample Robinhood CSV files needed

## Acceptance Tests

- [ ] Can drag-and-drop CSV files onto import zone
- [ ] Large CSV files (10k+ rows) parse without blocking UI
- [ ] Invalid rows are quarantined with clear error messages
- [ ] Normalized data matches expected schema
- [ ] Progress indicator shows during long imports
- [ ] Duplicate imports are detected and handled
- [ ] Can preview data before committing import
- [ ] Memory usage stays bounded during large imports

## Risks & Mitigations

- **Risk:** Browser memory limits with large CSVs
  - **Mitigation:** Streaming parse, batch processing, Web Workers
- **Risk:** Robinhood format changes breaking imports
  - **Mitigation:** Flexible mapping system, format detection, error recovery
- **Risk:** UI blocking during large file processing
  - **Mitigation:** Web Workers for parsing, progress indicators

## Demo Script

```typescript
// Upload CSV file via drag-and-drop
// Show parsing progress
// Display preview with field mapping
// Show validation errors for bad rows
// Confirm import and show success metrics
const result = await importCSV(file);
console.log(`Imported ${result.success} trades, quarantined ${result.errors} rows`);
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Create upload dropzone component and basic CSV parsing

**Previous Phase:** [Phase 1 - Database & Schema](./phase-1-database.md)
**Next Phase:** [Phase 3 - Core Calculations](./phase-3-calculations.md)
