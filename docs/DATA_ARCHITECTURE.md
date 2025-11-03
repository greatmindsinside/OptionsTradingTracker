# Options Tracking Application - Data Architecture Documentation

## Overview

This document explains how data flows between the **Journal Page**, **Wheel Page**, and **Trade Entry System** in the Options Tracking application.

---

## Database Architecture

### Single Source of Truth: The `journal` Table

Both the Journal page and Wheel page read from the **same SQLite database table** called `journal`. This ensures data consistency and eliminates synchronization issues.

```sql
-- Simplified journal table structure
CREATE TABLE journal (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,              -- ISO timestamp
  account_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,            -- e.g., 'sell_to_open', 'option_premium', 'buy_to_close'
  qty INTEGER,
  amount REAL,
  strike REAL,
  expiration TEXT,               -- ISO date string
  underlying_price REAL,
  notes TEXT,
  meta TEXT                      -- JSON for additional data
);
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER ADDS TRADE                         │
│              (via TradeTab in Wheel Page)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │   TradeTab Component    │
         │  handleAddTrade()       │
         └─────────┬───────────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
        ▼                      ▼
┌───────────────┐    ┌──────────────────┐
│  useJournal() │    │ useEntriesStore()│
│  (in-memory)  │    │  addEntry()      │
└───────────────┘    └────────┬─────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   journal TABLE     │
                    │   (SQLite DB)       │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
      ┌─────────────────┐          ┌──────────────────┐
      │  JOURNAL PAGE   │          │   WHEEL PAGE     │
      │  Reads journal  │          │  Reads journal   │
      │  Shows history  │          │  Shows positions │
      └─────────────────┘          └──────────────────┘
```

---

## Component Breakdown

### 1. TradeTab Component (`src/pages/wheel/components/drawers/TradeTab.tsx`)

**Purpose:** Trade entry form in the Wheel page's Actions drawer

**Key responsibilities:**

- Collects trade data (symbol, type, side, qty, strike, premium, DTE, fees)
- Validates input
- Persists trade to database
- Updates both pages

**Data flow in `handleAddTrade()`:**

```typescript
// Step 1: Validate form
submitTrade(); // Throws error if invalid

// Step 2: Update in-memory journal (legacy compatibility)
addJournal({
  kind: 'sell_put',
  symbol: 'AAPL',
  contracts: 10,
  // ... other fields
});

// Step 3: Persist to database using templates
await addEntry('tmplSellPut', {
  accountId: 'acct-1',
  symbol: 'AAPL',
  contracts: 10,
  premiumPerContract: 2.5,
  strike: 150,
  expiration: '2025-12-15',
  fee: 7.0,
});

// Step 4: Reload wheel data and close drawer
await reloadFn();
closeActions();
```

---

### 2. Journal Page (`/journal`)

**Purpose:** Complete transaction history and financial tracking

**Data source:**

- Reads directly from `journal` table via `useEntriesStore()`
- Uses SQL queries with filters (symbol, type, status, date range)

**Key features:**

```typescript
// From JournalPage.tsx
const { entries, loadEntries, addEntry } = useEntriesStore();

useEffect(() => {
  // Loads filtered entries from journal table
  loadEntries({
    symbol: filters.symbol,
    type: filters.type,
    from: filters.from,
    to: filters.to,
    status: filters.status,
  });
}, [filters.symbol, filters.type, filters.from, filters.to, filters.status]);
```

**Display:**

- Each row = one journal entry
- Shows: Date, Symbol, Action, Contracts, Strike, Premium, Fees, Status
- Calculates totals: Total Premium, Total Fees, Net P&L

---

### 3. Wheel Page (`/wheel`)

**Purpose:** Live dashboard for active wheel strategy positions

**Data source:**

- Reads from `journal` table via `useWheelDatabase()` hook
- Transforms journal entries into current positions

**Transformation logic:**

```typescript
// From useWheelDatabase.ts
function transformJournalToPositions(entries: Entry[]): Position[] {
  const positionMap = new Map<string, Partial<Position>>();

  // Group entries by position (symbol + strike + expiration)
  for (const entry of entries) {
    // Only process option-related entries
    if (
      entry.type !== 'sell_to_open' &&
      entry.type !== 'option_premium' &&
      entry.type !== 'buy_to_close'
    ) {
      continue;
    }

    if (!entry.strike || !entry.expiration) {
      continue; // Skip entries without strike/expiration
    }

    const key = `${entry.symbol}_${entry.strike}_${entry.expiration}`;

    if (!positionMap.has(key)) {
      positionMap.set(key, {
        id: key,
        ticker: entry.symbol,
        strike: entry.strike,
        qty: 0,
        entry: 0,
        mark: 0,
        dte: calculateDTE(entry.expiration),
        m: 0,
        type: 'P', // Will be updated based on entry data
        side: 'S',
      });
    }

    const position = positionMap.get(key)!;

    // Update quantity based on entry type
    if (entry.type === 'sell_to_open' || entry.type === 'option_premium') {
      const contracts = entry.qty || 1;
      position.qty = (position.qty || 0) + contracts;
      position.side = 'S'; // Selling

      // Update entry price (weighted average)
      const premium = Math.abs(entry.amount) / contracts / 100;
      if (position.entry === 0) {
        position.entry = premium;
      } else {
        const totalQty = position.qty || 1;
        const prevTotal = (position.entry || 0) * (totalQty - contracts);
        position.entry = (prevTotal + premium * contracts) / totalQty;
      }
    } else if (entry.type === 'buy_to_close') {
      const contracts = entry.qty || 1;
      position.qty = (position.qty || 0) - contracts;
    }
  }

  // Only return open positions (non-zero quantity)
  const positions: Position[] = [];
  positionMap.forEach(pos => {
    if (pos.qty && pos.qty > 0) {
      positions.push(pos as Position);
    }
  });

  return positions;
}
```

**Key features:**

- Metrics: Premium this week, Capital in puts, Shares for calls
- Wheel phase tracking per ticker
- Upcoming expirations with urgency badges
- Smart alerts (expiring soon, profit-taking opportunities, earnings)

---

## Database Interaction Methods

### Writing Data

**Method:** `useEntriesStore().addEntry(templateName, data)`

```typescript
// Example: Sell 10 AAPL $150 Puts
await addEntry('tmplSellPut', {
  accountId: 'acct-1',
  symbol: 'AAPL',
  date: '2025-11-02',
  contracts: 10,
  premiumPerContract: 2.5,
  strike: 150,
  expiration: '2025-12-15',
  fee: 7.0,
});
```

**Templates available:**

- `tmplSellPut` - Sell cash-secured put
- `tmplSellCoveredCall` - Sell covered call
- `tmplPutAssigned` - Put assignment (receive shares)
- `tmplCallAssigned` - Call assignment (shares called away)
- `tmplDividend` - Dividend payment
- `tmplFee` - Generic fee entry (used for buy-to-close)
- `tmplCorrection` - Manual correction entry

**What happens:**

1. Template expands into multiple journal entries
2. Entries inserted into `journal` table via SQL transaction
3. Database auto-assigns IDs and timestamps

---

### Reading Data

**Journal Page:**

```typescript
// Direct SQL queries with filters
const { entries } = useEntriesStore();
loadEntries({ symbol: 'AAPL', type: 'sell_to_open', status: 'open' });
```

**Wheel Page:**

```typescript
// Loads and transforms journal entries
const { data, loading, error, reload } = useWheelDatabase();

// data contains:
{
  positions: Position[],    // Open option positions
  shareLots: ShareLot[],    // Stock holdings
  alerts: Alert[],          // Smart alerts
  earningsCalendar: {},     // Earnings dates
  tickers: string[]         // Unique symbols
}
```

---

## State Management

### Three-Layer State Architecture

```
┌────────────────────────────────────────────────┐
│  Layer 1: SQLite Database (journal table)     │  ← Single source of truth
└────────────────┬───────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌─────────────────┐  ┌──────────────────────┐
│ Layer 2: Stores │  │ Layer 2: Stores      │
│ useEntriesStore │  │ useWheelStore        │
│ (Journal data)  │  │ (Wheel positions)    │
└────────┬────────┘  └──────────┬───────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐  ┌──────────────────────┐
│ Layer 3: UI      │  │ Layer 3: UI          │
│ Journal Page     │  │ Wheel Page           │
└──────────────────┘  └──────────────────────┘
```

**Why this architecture?**

1. **Single source of truth** - Database is always correct
2. **Performance** - Stores cache data to avoid repeated queries
3. **Reactivity** - Zustand stores trigger re-renders when data changes
4. **Offline-first** - SQLite runs in browser (IndexedDB persistence)

---

## Trade Entry Templates Explained

Templates are pre-defined patterns that expand into multiple journal entries. This ensures accounting accuracy.

### Example: Selling a Put

**Input:**

```typescript
addEntry('tmplSellPut', {
  accountId: 'acct-1',
  symbol: 'AAPL',
  date: '2025-11-02',
  contracts: 10,
  premiumPerContract: 2.5,
  strike: 150,
  expiration: '2025-12-15',
  fee: 7.0,
});
```

**Expands to journal entries:**

```javascript
// From src/models/templates.ts - tmplSellPut
[
  {
    id: crypto.randomUUID(),
    ts: '2025-11-02T...',
    account_id: 'acct-1',
    symbol: 'AAPL',
    type: 'sell_to_open',
    qty: 10,
    amount: 2500.0, // 10 contracts × $2.50 × 100
    strike: 150,
    expiration: '2025-12-15',
    underlying_price: null,
    notes: 'Sell 10 AAPL $150 Puts',
    meta: null,
  },
  {
    id: crypto.randomUUID(),
    ts: '2025-11-02T...',
    account_id: 'acct-1',
    symbol: 'AAPL',
    type: 'fee',
    qty: null,
    amount: -7.0,
    strike: null,
    expiration: null,
    underlying_price: null,
    notes: 'Trading fees',
    meta: null,
  },
];
```

**Why templates?**

- Ensures consistent data structure
- Automatically calculates derived fields (total premium = contracts × premium × 100)
- Handles multi-leg transactions (premium + fee as separate entries)
- Maintains double-entry accounting principles

---

## Synchronization Flow

### After Adding a Trade

```typescript
// 1. Save to database
await addEntry('tmplSellPut', data);

// 2. Reload wheel data (queries journal table again)
await reloadFn(); // Calls useWheelDatabase().reload()

// 3. UI updates automatically via Zustand reactivity
// - Wheel metrics recalculate
// - Position cards update
// - Expiration list refreshes
```

**Timeline:**

```
t=0ms   User clicks "+ Add Trade"
t=10ms  Form validation passes
t=20ms  addEntry() writes to journal table
t=50ms  Database transaction commits
t=60ms  reloadFn() queries journal table
t=80ms  transformJournalToPositions() runs
t=90ms  useWheelStore updates
t=100ms React re-renders Wheel page
t=110ms User sees new position ✓
```

---

## Key Design Decisions

### Why One Table for Both Pages?

**Alternative (rejected):** Separate `trades` and `journal` tables

**Problems with two tables:**

- Data duplication
- Sync issues (what if one updates but not the other?)
- Complex write logic (must update both)
- Inconsistent totals

**Benefits of single table:**

- ✅ Single source of truth
- ✅ Automatic sync (both pages read same data)
- ✅ Simpler writes (one insert operation)
- ✅ Guaranteed consistency

---

### Why Transform Journal → Positions?

**Question:** Why not store positions directly?

**Answer:** Positions are _derived state_ from journal entries.

**Example:**

```
Journal entries:
1. Sell 10 AAPL $150 Puts @ $2.50 (Oct 1)
2. Buy to close 5 AAPL $150 Puts @ $1.00 (Oct 15)

Derived position:
- 5 AAPL $150 Puts still open
- Net premium: (10 × $2.50) - (5 × $1.00) = $20.00
```

If we stored positions separately, we'd need complex update logic whenever a trade closes/rolls/adjusts.

**Benefits of deriving positions:**

- ✅ History is immutable (journal never changes past entries)
- ✅ Positions auto-update from latest data
- ✅ Easy to recalculate if logic changes
- ✅ Can reconstruct positions at any point in time

---

## Common Operations

### Adding a Trade

```typescript
// From Trade drawer
await addEntry('tmplSellPut', {
  accountId: 'acct-1',
  symbol: 'AAPL',
  date: '2025-11-02',
  contracts: 10,
  premiumPerContract: 2.5,
  strike: 150,
  expiration: '2025-12-15',
  fee: 7.0,
});

await reloadFn(); // Refresh Wheel page
```

### Filtering Journal

```typescript
// From Journal page
loadEntries({
  symbol: 'AAPL', // Show only AAPL trades
  type: 'sell_to_open', // Show only sell to open
  status: 'open', // Show only open positions
  from: '2025-10-01', // Date range start
  to: '2025-11-02', // Date range end
});
```

### Calculating Totals

```typescript
// Journal page totals (from useEntriesStore)
const { clause, params } = buildWhere(filters);
const totals = all<{ inc: number; out: number; net: number }>(
  `SELECT 
     SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS inc,
     SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS out,
     SUM(amount) AS net
   FROM journal ${clause}`,
  params
)[0];

// Result:
// inc = total premiums collected
// out = total fees paid
// net = inc - out
```

---

## Error Handling

### Database Write Failures

```typescript
try {
  await addEntry('tmplSellPut', data);
  await reloadFn();
  alert('✅ Trade added successfully');
} catch (err) {
  console.error('Failed to add trade:', err);
  alert('❌ Failed to save trade. Check console.');
  // Trade is NOT saved - database transaction rolled back
}
```

### Data Transformation Errors

```typescript
// useWheelDatabase.ts handles malformed data
function transformJournalToPositions(entries: Entry[]): Position[] {
  const positions: Position[] = [];

  for (const entry of entries) {
    // Skip entries with missing required fields
    if (!entry.symbol || !entry.strike || !entry.expiration) {
      console.warn('Skipping malformed entry:', entry.id);
      continue;
    }

    // Process valid entry...
  }

  return positions;
}
```

---

## Performance Considerations

### Query Optimization

```sql
-- Journal table indexes (defined in src/db/sql.ts)
CREATE INDEX IF NOT EXISTS idx_journal_symbol ON journal(symbol);
CREATE INDEX IF NOT EXISTS idx_journal_type ON journal(type);
CREATE INDEX IF NOT EXISTS idx_journal_ts ON journal(ts);

-- Fast queries:
SELECT * FROM journal WHERE symbol = 'AAPL';  -- Uses idx_journal_symbol
SELECT * FROM journal WHERE type = 'sell_to_open'; -- Uses idx_journal_type
SELECT * FROM journal WHERE ts BETWEEN '2025-10-01' AND '2025-11-01'; -- Uses idx_journal_ts
```

### Caching Strategy

```typescript
// useWheelStore caches transformed data
const positions = useWheelStore(s => s.positions); // Cached
const lots = useWheelStore(s => s.lots); // Cached

// Only recalculates when reload() is called
await reloadFn(); // Queries DB, transforms, updates cache
```

---

## File Structure Reference

```
src/
├── db/
│   ├── sql.ts                    # SQLite wrapper (initDb, all, insertJournalRows)
│   └── queryBuilder.ts           # SQL WHERE clause builder for filters
├── stores/
│   ├── useEntriesStore.ts        # Journal data store (loads from journal table)
│   └── useWheelStore.ts          # Wheel positions cache
├── hooks/
│   └── useWheelDatabase.ts       # Loads & transforms journal → wheel data
├── models/
│   └── templates.ts              # Trade templates (tmplSellPut, etc.)
├── pages/
│   ├── journal/
│   │   └── JournalPage.tsx       # Transaction history page
│   └── wheel/
│       ├── WheelPage.tsx         # Dashboard page
│       └── components/
│           └── drawers/
│               └── TradeTab.tsx  # Trade entry form
└── types/
    └── entry.ts                  # Entry type definitions
```

---

## Future Enhancements

### Real-Time Market Data

```typescript
// Could enhance transformJournalToPositions
async function transformJournalToPositions(entries: Entry[]): Promise<Position[]> {
  const positions = /* ... transform logic ... */;

  // Fetch real-time prices
  for (const position of positions) {
    const price = await fetchOptionPrice(
      position.ticker,
      position.strike,
      position.expiration,
      position.type
    );
    position.mark = price;
    position.m = calculateMoneyness(price, position.strike);
  }

  return positions;
}
```

### Position Adjustments (Rolls)

```typescript
// Future template for rolling positions
await addEntry('tmplRollPut', {
  accountId: 'acct-1',
  symbol: 'AAPL',
  date: '2025-11-02',

  // Close existing position
  closeContracts: 10,
  closeStrike: 150,
  closeExpiration: '2025-12-15',
  closePremium: 1.0,

  // Open new position
  openContracts: 10,
  openStrike: 145,
  openExpiration: '2026-01-15',
  openPremium: 2.5,

  fee: 14.0, // Two trades worth of fees
});

// Would generate:
// 1. Buy to close entry for old position
// 2. Sell to open entry for new position
// 3. Fee entry
// 4. Net credit/debit summary
```

### Historical Position Reconstruction

```typescript
// Query positions at any point in time
async function getPositionsAtDate(date: string): Promise<Position[]> {
  const entries = all<Entry>(
    `SELECT * FROM journal WHERE datetime(ts) <= datetime(?) ORDER BY ts ASC`,
    [date]
  );

  return transformJournalToPositions(entries);
}

// Usage:
const positionsLastMonth = await getPositionsAtDate('2025-10-02');
// See what positions you had 30 days ago
```

---

## Summary

**Key Takeaways:**

1. **Single Database Table** - Both pages read from `journal` table
2. **Template-Based Writes** - TradeTab uses templates to ensure data consistency
3. **Derived Positions** - Wheel page transforms journal entries into current positions
4. **Zustand for Caching** - Stores cache data to minimize database queries
5. **Automatic Sync** - Both pages always show the same data since they read from the same source

**Data Flow:**

```
User Input → TradeTab → addEntry() → journal table → reload() → Transform → UI Update
                           ↓                            ↓          ↓
                      useEntriesStore            useWheelDatabase
                           ↓                            ↓
                     Journal Page                  Wheel Page
```

**Result:** Consistent, synchronized data across the entire application with a single source of truth.

---

## Troubleshooting

### Trade doesn't appear on Wheel page

**Check:**

1. Does it appear in Journal page? (If no, database write failed)
2. Console logs show "✅ Wheel data loaded successfully"?
3. Is the entry type recognized? (must be `sell_to_open`, `option_premium`, or `buy_to_close`)
4. Does the entry have `strike` and `expiration` fields?

**Debug:**

```typescript
// In browser console
const entries = await useEntriesStore.getState().loadEntries({});
console.log(entries); // Check if trade exists

const wheelData = await useWheelDatabase().reload();
console.log(wheelData); // Check if position was created
```

### Totals don't match

**Likely cause:** Filters applied on Journal page

**Solution:**

```typescript
// Clear all filters to see all entries
loadEntries({
  symbol: '',
  type: '',
  status: 'all',
  from: '',
  to: '',
});
```

### Position shows wrong quantity

**Likely cause:** Buy-to-close entry not recorded or miscalculated

**Fix:**

1. Check Journal page for all entries related to that position
2. Verify each entry has correct `qty` and `type`
3. Add correction entry if needed:
   ```typescript
   await addEntry('tmplCorrection', {
     accountId: 'acct-1',
     symbol: 'AAPL',
     date: '2025-11-02',
     amount: 0, // Adjust as needed
   });
   ```

---

_Last updated: November 2, 2025_
