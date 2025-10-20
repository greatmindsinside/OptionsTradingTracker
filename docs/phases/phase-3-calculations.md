# Phase 3: Core Calculations 🧮

## Goals

- Implement options strategy calculations (Covered Calls, CSPs, Long Calls)
- Build P&L analysis with scenarios and Greeks approximations
- Create payoff charts and what-if tables
- Add risk flagging system

## Inputs

- Normalized trade data from Phase 2
- Options pricing models and formulas
- Risk management thresholds

## Outputs

- Strategy calculation modules
- Payoff chart components
- What-if analysis tables
- Risk alert system
- Performance metrics (ROO, ROR, etc.)

## Tasks Checklist

### Calculation Modules

- [ ] Create `/src/modules/calc/common.ts` with shared utilities
- [ ] Implement `/src/modules/calc/coveredCall.ts` calculations
- [ ] Implement `/src/modules/calc/cashSecuredPut.ts` calculations
- [ ] Implement `/src/modules/calc/longCall.ts` calculations
- [ ] Create breakeven calculations for each strategy

### P&L Analysis

- [ ] Build P&L scenarios (-20%, -10%, 0%, +10%, +20%)
- [ ] Implement Greeks approximations (delta, theta, gamma)
- [ ] Add annualized return calculations (ROO, ROR)
- [ ] Implement assignment vs hold P&L analysis

### Visualization Components

- [ ] Create `/src/components/PayoffChart.tsx` with Recharts
- [ ] Build `/src/components/WhatIfTable.tsx` for scenario analysis
- [ ] Create `/src/components/RiskFlags.tsx` for alerts

## Strategy Implementations

### Covered Call

```typescript
interface CoveredCallInputs {
  sharePrice: number;
  shareBasis: number;
  shareQty: number;
  strike: number;
  premium: number;
  expiration: Date;
  fees: number;
}

class CoveredCall {
  breakeven(): number;
  maxProfit(): number;
  maxLoss(): number;
  returnOnOutlay(): number;
  returnOnRisk(): number;
  assignmentPnL(): number;
  expirationPnL(sharePrice: number): number;
  payoffChart(priceRange: number[]): ChartData[];
}
```

### Cash-Secured Put

```typescript
interface CashSecuredPutInputs {
  strike: number;
  premium: number;
  expiration: Date;
  fees: number;
  cashSecured: number;
}

class CashSecuredPut {
  breakeven(): number;
  maxProfit(): number;
  maxLoss(): number;
  returnOnOutlay(): number;
  returnOnRisk(): number;
  assignmentPnL(): number;
  expirationPnL(sharePrice: number): number;
}
```

### Long Call

```typescript
interface LongCallInputs {
  strike: number;
  premium: number;
  expiration: Date;
  fees: number;
}

class LongCall {
  breakeven(): number;
  intrinsicValue(sharePrice: number): number;
  timeValue(sharePrice: number, currentPremium: number): number;
  profitLoss(sharePrice: number): number;
}
```

## Risk Thresholds

### Default Settings

- **ROO/ROR minimum:** 15% annualized
- **Max position size:** 5% of account value
- **Days to expiration warning:** 7 days
- **Below breakeven threshold:** 5%

### Risk Flags

```typescript
interface RiskFlag {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  category: 'return' | 'size' | 'time' | 'price' | 'assignment';
}
```

## Greeks Approximations

### Delta (Price Sensitivity)

```typescript
function approximateDelta(
  spot: number,
  strike: number,
  timeToExpiry: number,
  optionType: 'call' | 'put'
): number {
  // Black-Scholes approximation for educational purposes
  // Note: Simplified calculation, not for actual trading
}
```

### Theta (Time Decay)

```typescript
function approximateTheta(premium: number, daysToExpiry: number): number {
  // Linear approximation of time decay
  // More sophisticated models in production
}
```

## Dependencies

- Phase 2 (CSV import) must provide trade data
- Price data (can use mock data initially)

## Acceptance Tests

- [ ] Covered call calculations match manual verification
- [ ] CSP calculations handle assignment scenarios correctly
- [ ] Payoff charts render accurately for all strategies
- [ ] What-if tables show correct P&L for price scenarios
- [ ] Risk flags trigger at appropriate thresholds
- [ ] ROO/ROR calculations are annualized correctly
- [ ] Greeks approximations are reasonable vs actual values
- [ ] Performance stays smooth with 100+ positions

## Risks & Mitigations

- **Risk:** Complex options math errors
  - **Mitigation:** Unit tests, manual verification, reference implementations
- **Risk:** Performance with many calculations
  - **Mitigation:** Memoization, Web Workers for heavy compute
- **Risk:** Greeks accuracy without real-time data
  - **Mitigation:** Document limitations, use approximations, allow manual overrides

## Demo Script

```typescript
// Load sample covered call position
const cc = new CoveredCall({
  sharePrice: 98,
  shareBasis: 95,
  shareQty: 100,
  strike: 100,
  premium: 2.5,
  expiration: new Date('2024-02-16'),
  fees: 0.65,
});

// Calculate metrics
console.log(`Breakeven: $${cc.breakeven()}`);
console.log(`Max profit: $${cc.maxProfit()}`);
console.log(`ROO: ${cc.returnOnOutlay()}%`);

// Generate payoff chart data
const chartData = cc.payoffChart([-20, -10, 0, 10, 20]);
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Implement basic covered call calculation module

**Previous Phase:** [Phase 2 - CSV Import & Normalization](./phase-2-csv-import.md)
**Next Phase:** [Phase 4 - Wheel Ledger](./phase-4-wheel.md)
