# Phase 6: Tax-Harvest Helper 🌾

## Goals

- Identify tax-loss harvesting opportunities
- Rank losses by tax benefit potential
- Warn about wash sale conflicts
- Provide actionable recommendations

## Inputs

- Tax lots with unrealized P&L
- Current positions and recent trades
- User's tax rate and preferences

## Outputs

- Tax-loss harvesting opportunity finder
- Ranked recommendation list
- Wash sale conflict warnings
- Tax benefit calculations

## Tasks Checklist

### Harvest Engine

- [ ] Create `/src/modules/harvest/harvestFinder.ts` engine
- [ ] Query lots with unrealized losses outside wash windows
- [ ] Rank opportunities by loss amount × tax rate
- [ ] Check for wash sale conflicts with recent/planned trades
- [ ] Calculate potential tax savings per opportunity

### Analysis & Filtering

- [ ] Add filtering by holding period (ST vs LT preference)
- [ ] Handle paired trades and complex positions
- [ ] Add calendar integration for timing optimization

### User Interface

- [ ] Create recommendation UI with action buttons
- [ ] Implement "what-if" scenarios for harvest decisions
- [ ] Generate harvest execution checklists

## Harvest Opportunity Detection

### Opportunity Finder

```typescript
interface HarvestOpportunity {
  lotId: string;
  underlying: string;
  qty: number;
  currentBasis: number;
  currentValue: number;
  unrealizedLoss: number;
  taxSavings: number;
  holdingPeriod: 'ST' | 'LT';
  daysHeld: number;
  acqDate: Date;
  washSaleRisk: 'none' | 'low' | 'medium' | 'high';
  conflictDates?: Date[];
}

interface HarvestFinderOptions {
  minLoss: number;
  preferLongTerm: boolean;
  taxRate: number;
  includeShortTerm: boolean;
  excludeWashSaleRisks: boolean;
}
```

### Ranking Algorithm

```typescript
function rankHarvestOpportunities(
  opportunities: HarvestOpportunity[],
  options: HarvestFinderOptions
): HarvestOpportunity[] {
  return opportunities
    .filter(opp => opp.unrealizedLoss >= options.minLoss)
    .filter(opp => options.includeShortTerm || opp.holdingPeriod === 'LT')
    .filter(opp => !options.excludeWashSaleRisks || opp.washSaleRisk === 'none')
    .sort((a, b) => {
      // Primary sort by tax savings
      if (b.taxSavings !== a.taxSavings) {
        return b.taxSavings - a.taxSavings;
      }

      // Secondary sort by holding period preference
      if (options.preferLongTerm) {
        if (a.holdingPeriod === 'LT' && b.holdingPeriod === 'ST') return -1;
        if (a.holdingPeriod === 'ST' && b.holdingPeriod === 'LT') return 1;
      }

      // Tertiary sort by wash sale risk
      const riskOrder = { none: 0, low: 1, medium: 2, high: 3 };
      return riskOrder[a.washSaleRisk] - riskOrder[b.washSaleRisk];
    });
}
```

## Wash Sale Conflict Detection

### Risk Assessment

```typescript
interface WashSaleRiskAnalyzer {
  // Check for recent purchases within 30 days before sale date
  checkRecentPurchases(underlying: string, saleDate: Date, trades: Trade[]): WashSaleRisk;

  // Check for potential future purchases within 30 days after sale date
  checkPlannedPurchases(
    underlying: string,
    saleDate: Date,
    plannedTrades: PlannedTrade[]
  ): WashSaleRisk;

  // Analyze similar securities (options with similar strikes/dates)
  analyzeSimilarSecurities(security: SecurityInfo, allHoldings: Position[]): WashSaleRisk;
}

type WashSaleRisk = 'none' | 'low' | 'medium' | 'high';
```

### Conflict Warning System

```typescript
interface WashSaleWarning {
  severity: WashSaleRisk;
  message: string;
  conflictType: 'recent_purchase' | 'planned_purchase' | 'similar_security' | 'options_conflict';
  details: {
    conflictDate: Date;
    conflictSecurity: string;
    recommendedAction: string;
  };
}
```

## Tax Benefit Calculations

### Tax Savings Calculator

```typescript
function calculateTaxSavings(
  unrealizedLoss: number,
  holdingPeriod: 'ST' | 'LT',
  taxRates: TaxRateSchedule
): number {
  // Short-term losses offset ordinary income first
  if (holdingPeriod === 'ST') {
    return unrealizedLoss * taxRates.ordinary;
  }

  // Long-term losses offset long-term gains first, then ordinary income
  // Simplified calculation - actual tax benefit depends on other gains/losses
  return unrealizedLoss * Math.min(taxRates.longTerm, taxRates.ordinary);
}

interface TaxRateSchedule {
  ordinary: number; // Ordinary income tax rate
  longTerm: number; // Long-term capital gains rate
  stateRate?: number; // State tax rate (optional)
}
```

### What-If Scenarios

```typescript
interface HarvestScenario {
  name: string;
  selectedOpportunities: HarvestOpportunity[];
  totalLossHarvested: number;
  totalTaxSavings: number;
  washSaleRisks: WashSaleWarning[];
  carryForwardLoss?: number;
  executionComplexity: 'simple' | 'moderate' | 'complex';
}

function generateHarvestScenarios(opportunities: HarvestOpportunity[]): HarvestScenario[] {
  return [
    // Conservative: Only no-risk, long-term losses
    generateConservativeScenario(opportunities),

    // Aggressive: Maximum tax benefit, accept some wash sale risk
    generateAggressiveScenario(opportunities),

    // Balanced: Good tax benefit with moderate risk
    generateBalancedScenario(opportunities),
  ];
}
```

## User Interface Components

### Recommendation Dashboard

```typescript
interface HarvestRecommendationProps {
  opportunities: HarvestOpportunity[];
  scenarios: HarvestScenario[];
  userPreferences: HarvestFinderOptions;
  onExecuteHarvest: (opportunities: HarvestOpportunity[]) => void;
  onUpdatePreferences: (options: HarvestFinderOptions) => void;
}
```

### Execution Checklist

```typescript
interface HarvestExecutionStep {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  dependencies: string[];
  completed: boolean;
}

const executionSteps: HarvestExecutionStep[] = [
  {
    id: 'review_opportunities',
    description: 'Review and confirm harvest opportunities',
    priority: 'high',
    estimatedTime: '5-10 minutes',
    dependencies: [],
    completed: false,
  },
  {
    id: 'check_wash_sales',
    description: 'Verify no wash sale conflicts exist',
    priority: 'high',
    estimatedTime: '2-3 minutes',
    dependencies: ['review_opportunities'],
    completed: false,
  },
  {
    id: 'execute_trades',
    description: 'Execute sell orders in brokerage account',
    priority: 'high',
    estimatedTime: '10-15 minutes',
    dependencies: ['check_wash_sales'],
    completed: false,
  },
];
```

## Dependencies

- Phase 5 (tax lots) must be complete
- Current price data for unrealized P&L calculations

## Acceptance Tests

- [ ] Identifies genuine harvest opportunities accurately
- [ ] Excludes positions with wash sale conflicts
- [ ] Rankings reflect actual tax benefit potential
- [ ] Warnings prevent accidental wash sales
- [ ] Tax savings calculations are reasonable
- [ ] UI makes recommendations actionable
- [ ] Performance good with large portfolios
- [ ] Handles complex multi-leg positions

## Risks & Mitigations

- **Risk:** Incorrect wash sale conflict detection
  - **Mitigation:** Conservative approach, clear warnings, manual review
- **Risk:** Tax advice liability
  - **Mitigation:** Clear disclaimers, "educational only" positioning
- **Risk:** Market timing and execution complexity
  - **Mitigation:** Focus on identification, not execution automation

## Demo Script

```typescript
// Configure harvest preferences
const options: HarvestFinderOptions = {
  minLoss: 500,
  preferLongTerm: true,
  taxRate: 0.24,
  includeShortTerm: false,
  excludeWashSaleRisks: true,
};

// Find harvest opportunities
const opportunities = await findHarvestOpportunities(options);
console.log(`Found ${opportunities.length} harvest opportunities`);

// Show ranked list with tax savings
opportunities.forEach(opp => {
  console.log(`${opp.underlying}: $${opp.unrealizedLoss} loss, $${opp.taxSavings} tax savings`);
  console.log(`  Risk: ${opp.washSaleRisk}, Holding: ${opp.holdingPeriod}`);
});

// Generate scenarios
const scenarios = generateHarvestScenarios(opportunities);
scenarios.forEach(scenario => {
  console.log(
    `${scenario.name}: $${scenario.totalTaxSavings} savings, ${scenario.washSaleRisks.length} risks`
  );
});
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Build basic loss identification query system

**Previous Phase:** [Phase 5 - Tax Lots & Wash Sales](./phase-5-tax-lots.md)
**Next Phase:** [Phase 7 - Price Adapters](./phase-7-price-adapters.md)
