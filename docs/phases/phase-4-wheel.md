# Phase 4: Wheel Ledger 🎡

## Goals

- Track complete wheel strategy lifecycles
- Chain CSP assignments → CC sales → outcomes
- Calculate cumulative metrics and basis adjustments
- Visualize wheel progression timeline

## Inputs

- Normalized trades from Phase 2
- Calculation modules from Phase 3
- Wheel strategy business rules

## Outputs

- Wheel lifecycle tracking system
- Timeline visualization component
- Cumulative P&L and metrics
- Wheel-specific database tables

## Tasks Checklist

### Lifecycle Management

- [ ] Design wheel lifecycle state machine
- [ ] Create `/src/modules/wheel/lifecycle.ts` for chain logic
- [ ] Implement lifecycle ID generation (underlying + timestamp + index)
- [ ] Build CSP → assignment → CC → outcome linking
- [ ] Handle incomplete cycles and orphaned positions

### Visualization & Analytics

- [ ] Create `/src/components/LifecycleTimeline.tsx` visualization
- [ ] Calculate cumulative net credit and basis adjustments
- [ ] Track realized vs unrealized P&L per wheel cycle
- [ ] Implement ROO/ROR calculations per leg and cumulative
- [ ] Add wheel performance analytics and filtering

### Database Integration

- [ ] Create wheel-specific database queries
- [ ] Implement efficient pagination for large datasets

## Wheel State Machine

### States & Transitions

```typescript
type WheelState =
  | 'csp_open' // Cash-secured put opened
  | 'csp_assign' // Put assigned, shares acquired
  | 'cc_open' // Covered call opened on shares
  | 'cc_assign' // Call assigned, shares sold
  | 'cc_expire' // Call expired, keeping shares
  | 'shares_sold' // Shares sold manually
  | 'complete'; // Cycle complete

interface WheelStep {
  lifecycleId: string;
  stepIndex: number;
  underlying: string;
  eventType: WheelState;
  dt: Date;
  strike?: number;
  expiry?: Date;
  qty: number;
  netCredit: number;
  runningBasis: number;
  tradeId?: number;
}
```

### Lifecycle ID Generation

```typescript
function generateLifecycleId(underlying: string, firstCspDate: Date, cycleIndex: number): string {
  const dateStr = firstCspDate.toISOString().slice(0, 10);
  return `${underlying}_${dateStr}_${cycleIndex.toString().padStart(3, '0')}`;
}
```

## Linking Algorithm

### Trade Matching Logic

```typescript
interface WheelMatcher {
  // Link CSP assignment to share acquisition
  linkCspAssignment(cspTrade: Trade, shareTrades: Trade[]): boolean;

  // Link shares to covered call
  linkCoveredCall(shares: Position, ccTrade: Trade): boolean;

  // Handle edge cases (early assignment, rolling, etc.)
  handleSpecialCases(trades: Trade[]): WheelStep[];
}
```

## Performance Metrics

### Per-Leg Calculations

```typescript
interface WheelLegMetrics {
  legType: 'csp' | 'cc' | 'shares';
  premium: number;
  fees: number;
  netCredit: number;
  daysHeld: number;
  annualizedReturn: number;
}
```

### Cumulative Calculations

```typescript
interface WheelCycleMetrics {
  lifecycleId: string;
  underlying: string;
  totalNetCredit: number;
  totalDays: number;
  realizedPL: number;
  unrealizedPL: number;
  cumulativeROO: number;
  cumulativeROR: number;
  basisAdjustment: number;
  status: WheelState;
}
```

## Timeline Visualization

### Component Structure

```typescript
interface TimelineEvent {
  date: Date;
  type: WheelState;
  description: string;
  amount: number;
  strike?: number;
  expiry?: Date;
}

interface LifecycleTimelineProps {
  lifecycleId: string;
  events: TimelineEvent[];
  currentPrice?: number;
}
```

## Dependencies

- Phase 2 (trade data) and Phase 3 (calculations) must be complete
- Database schema for wheel table

## Acceptance Tests

- [ ] Can identify and link related wheel trades
- [ ] Lifecycle states progress correctly (CSP → assign → CC → close)
- [ ] Cumulative metrics calculate accurately across legs
- [ ] Timeline shows clear progression of wheel stages
- [ ] Handles edge cases (early assignment, rolling, etc.)
- [ ] Performance analytics match manual calculations
- [ ] Can filter and sort wheel cycles by various metrics
- [ ] Database queries return correct wheel data

## Risks & Mitigations

- **Risk:** Complex state transitions and edge cases
  - **Mitigation:** Clear state machine design, comprehensive testing
- **Risk:** Linking trades across different CSV imports
  - **Mitigation:** Robust matching logic, manual override capability
- **Risk:** Performance with many wheel cycles
  - **Mitigation:** Efficient queries, pagination, lazy loading

## Demo Script

```typescript
// Import trades containing wheel sequences
await importCSV(wheelTradesFile);

// Auto-detect and link wheel cycles
const wheels = await getWheelCycles('AAPL');

// Show lifecycle progression
wheels.forEach(wheel => {
  console.log(`Cycle ${wheel.lifecycleId}:`);
  console.log(`  Net Credit: $${wheel.totalNetCredit}`);
  console.log(`  Status: ${wheel.status}`);
  console.log(`  ROO: ${wheel.cumulativeROO}%`);
});

// Display timeline visualization
const timeline = await getWheelTimeline('AAPL_2024-01-15_001');
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Design wheel lifecycle state machine and linking logic

**Previous Phase:** [Phase 3 - Core Calculations](./phase-3-calculations.md)
**Next Phase:** [Phase 5 - Tax Lots & Wash Sales](./phase-5-tax-lots.md)
