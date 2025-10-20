# Phase 5: Tax Lots & Wash Sales 📋

## Goals

- Implement tax lot accounting (FIFO, HIFO, LIFO)
- Handle complex options tax rules and basis adjustments
- Detect and process wash sales with ±30 day windows
- Generate Schedule-D style tax reporting

## Inputs

- Trade data with proper classification
- Tax lot accounting rules and regulations
- Wash sale detection algorithms

## Outputs

- Tax lot management system
- Wash sale detection and adjustment
- Schedule-D export functionality
- Tax optimization suggestions

## Tasks Checklist

### Tax Lot System

- [ ] Create `/src/modules/tax/lots.ts` with lot accounting methods
- [ ] Implement FIFO, HIFO, LIFO lot selection algorithms
- [ ] Add holding period calculations (ST vs LT)
- [ ] Create year-end tax summary reports
- [ ] Add lot method selection UI

### Options Tax Rules

- [ ] Handle options-specific tax rules:
  - [ ] CC assignment → share sale at strike + premium
  - [ ] CC expiration → premium as short-term gain
  - [ ] CSP assignment → basis = strike - net premium + fees
  - [ ] Long call exercise → basis = strike + premium + fees

### Wash Sale Detection

- [ ] Build `/src/modules/tax/washSales.ts` detection engine
- [ ] Implement ±30 day wash sale window detection
- [ ] Build basis adjustment for replacement lots
- [ ] Handle carryforward wash sale adjustments

### Reporting

- [ ] Create `/src/modules/tax/scheduleD.ts` export functionality

## Tax Lot Accounting Methods

### FIFO (First In, First Out)

```typescript
class FIFOLotMethod implements LotMethod {
  selectLots(underlying: string, qtyToSell: number, saleDate: Date): LotSelection[] {
    // Select oldest lots first
    return availableLots
      .filter(lot => lot.underlying === underlying)
      .sort((a, b) => a.acqDate.getTime() - b.acqDate.getTime())
      .slice(0, qtyToSell);
  }
}
```

### HIFO (Highest In, First Out)

```typescript
class HIFOLotMethod implements LotMethod {
  selectLots(underlying: string, qtyToSell: number, saleDate: Date): LotSelection[] {
    // Select highest basis lots first (maximize losses/minimize gains)
    return availableLots
      .filter(lot => lot.underlying === underlying)
      .sort((a, b) => b.basis - a.basis)
      .slice(0, qtyToSell);
  }
}
```

### LIFO (Last In, First Out)

```typescript
class LIFOLotMethod implements LotMethod {
  selectLots(underlying: string, qtyToSell: number, saleDate: Date): LotSelection[] {
    // Select newest lots first
    return availableLots
      .filter(lot => lot.underlying === underlying)
      .sort((a, b) => b.acqDate.getTime() - a.acqDate.getTime())
      .slice(0, qtyToSell);
  }
}
```

## Options Tax Treatment

### Covered Call Assignment

```typescript
interface CCAssignmentTax {
  // Share sale at strike price
  saleProceeds: number; // strike * qty + call premium
  shareBasis: number; // original share basis
  gainLoss: number; // proceeds - basis
  holdingPeriod: 'ST' | 'LT'; // based on share holding period
}
```

### CSP Assignment

```typescript
interface CSPAssignmentTax {
  // Share acquisition
  shareBasis: number; // strike - net premium + fees
  acqDate: Date; // assignment date
  holdStart: Date; // day after assignment
}
```

### Long Call Exercise

```typescript
interface LongCallExerciseTax {
  shareBasis: number; // strike + premium + fees
  acqDate: Date; // exercise date
  holdStart: Date; // day after exercise
}
```

## Wash Sale Detection

### Detection Algorithm

```typescript
interface WashSaleDetector {
  // Check for substantially identical securities within ±30 days
  detectWashSales(saleTrade: Trade, allTrades: Trade[]): WashSale[];

  // Apply basis adjustments to replacement lots
  adjustReplacementBasis(washSale: WashSale, replacementLot: Lot): void;
}

interface WashSale {
  saleTradeId: number;
  purchaseTradeId: number;
  disallowedLoss: number;
  basisAdjustment: number;
  holdingPeriodAdjustment: number;
}
```

### Substantially Identical Test

```typescript
function isSubstantiallyIdentical(security1: SecurityInfo, security2: SecurityInfo): boolean {
  // Same underlying stock
  if (security1.underlying !== security2.underlying) return false;

  // For options: same type, strike within reasonable range, similar expiration
  if (security1.type === 'option' && security2.type === 'option') {
    const strikeDiff = Math.abs(security1.strike - security2.strike);
    const expDiff = Math.abs(security1.expiry.getTime() - security2.expiry.getTime());

    return (
      strikeDiff <= 0.05 * security1.strike && // Within 5% strike
      expDiff <= 30 * 24 * 60 * 60 * 1000
    ); // Within 30 days expiry
  }

  return false;
}
```

## Schedule-D Export

### Export Format

```typescript
interface ScheduleDEntry {
  description: string; // "100 AAPL shares"
  dateAcquired: string; // "01/15/2024"
  dateSold: string; // "02/16/2024"
  proceeds: number; // Sale proceeds
  basis: number; // Adjusted basis
  adjustment: number; // Wash sale adjustments
  gainLoss: number; // proceeds - basis - adjustments
  termType: 'ST' | 'LT'; // Short-term vs Long-term
}

interface ScheduleDExport {
  year: number;
  shortTermTransactions: ScheduleDEntry[];
  longTermTransactions: ScheduleDEntry[];
  shortTermTotal: number;
  longTermTotal: number;
}
```

## Dependencies

- Phase 2 (trade data) must be complete
- Database schema for lots and lot_events tables

## Acceptance Tests

- [ ] FIFO lot selection matches IRS requirements
- [ ] Wash sales detected accurately within ±30 days
- [ ] Options tax rules calculate correct basis adjustments
- [ ] Schedule-D export matches tax software format
- [ ] Holding periods distinguish short-term vs long-term
- [ ] Carryforward wash adjustments persist correctly
- [ ] Can switch between lot methods and recalculate
- [ ] Tax calculations match manual verification

## Risks & Mitigations

- **Risk:** Complex tax rules and edge cases
  - **Mitigation:** Reference IRS publications, professional review, disclaimers
- **Risk:** Wash sale detection accuracy
  - **Mitigation:** Conservative approach, manual override capability
- **Risk:** Performance with large transaction history
  - **Mitigation:** Efficient algorithms, periodic cleanup, indexed queries

## Demo Script

```typescript
// Set lot method to FIFO
await setLotMethod('FIFO');

// Process wash sales for tax year
const washSales = await detectWashSales(2024);
console.log(`Found ${washSales.length} wash sales`);

// Generate Schedule-D
const scheduleD = await generateScheduleD(2024);
console.log(`${scheduleD.shortTermTransactions.length} short-term transactions`);
console.log(`${scheduleD.longTermTransactions.length} long-term transactions`);
console.log(`Total gain/loss: $${scheduleD.shortTermTotal + scheduleD.longTermTotal}`);
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Implement basic lot accounting with FIFO method

**Previous Phase:** [Phase 4 - Wheel Ledger](./phase-4-wheel.md)
**Next Phase:** [Phase 6 - Tax-Harvest Helper](./phase-6-tax-harvest.md)
