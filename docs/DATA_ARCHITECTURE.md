# Options Tracking Application - Data Architecture Documentation

## Technology Stack

### Core Technologies

**Frontend Framework:**

- **React 19.1.1** - UI library with concurrent features and automatic batching
- **TypeScript 5.9.3** - Type-safe JavaScript with strict mode enabled
- **Vite 7.1.7** - Fast build tool and dev server with HMR

**Routing & Navigation:**

- **React Router 7.9.4** - Client-side routing with nested routes

**State Management:**

- **Zustand 5.0.8** - Lightweight state management with React hooks
  - Used for: Wheel store, Entries store, Filter store
  - Benefits: No boilerplate, TypeScript-first, middleware support

**Database & Storage:**

- **sql.js 1.13.0** - SQLite compiled to WebAssembly
  - Runs entirely in browser
  - Persistence via OPFS (Origin Private File System) or IndexedDB or localStorage
  - Supports full SQL queries with indexes
- **Zod 4.1.12** - Schema validation and type inference
  - Validates all database inputs
  - Generates TypeScript types from schemas

**Data Processing:**

- **papaparse 5.5.3** - Fast CSV parser with streaming support
  - Handles large CSV files efficiently
  - Auto-detects delimiters and headers
  - Error recovery for malformed data

**UI Components & Styling:**

- **Tailwind CSS 4.1.16** - Utility-first CSS framework
- **Lucide React 0.546.0** - Icon library with 1000+ consistent icons
- **clsx 2.1.1** - Utility for conditional CSS class names
- **recharts 3.3.0** - Composable charting library for React

**Testing:**

- **Vitest 3.2.4** - Fast unit test framework (Vite-native)
- **Playwright 1.56.1** - E2E testing across browsers (Chromium, Firefox, WebKit)
- **Testing Library** - React component testing with user-centric queries
- **Axe Core 4.11.0** - Accessibility testing

**Development Tools:**

- **ESLint 9.36.0** - Code linting with TypeScript rules
- **Prettier 3.6.2** - Code formatting
- **Husky 9.1.7** - Git hooks for pre-commit checks
- **lint-staged 16.2.4** - Run linters on staged files only

### Architecture Patterns

**Design Patterns Used:**

- **Repository Pattern** - DAOs (Data Access Objects) for database operations
- **Adapter Pattern** - Broker-specific CSV adapters for data normalization
- **Strategy Pattern** - Pluggable validation and transformation strategies
- **Observer Pattern** - Event emitters for data synchronization
- **Factory Pattern** - Progress tracker and import service factories

**Key Architectural Decisions:**

- **Browser-first** - No backend required, all data stored locally
- **SQL over NoSQL** - Relational data with complex queries and joins
- **TypeScript strict mode** - Maximum type safety and IDE support
- **Zustand over Redux** - Simpler API, less boilerplate, better DX
- **Vite over Webpack** - Faster dev server and builds
- **Playwright over Cypress** - Better cross-browser support and speed

---

## Overview

This document explains how data flows through the **Options Trading Tracker** application, including:

- **Import System** - CSV import with broker-specific adapters
- **Database Layer** - Multi-table normalized schema with SQLite
- **Journal Page** - Transaction history and filtering
- **Wheel Page** - Real-time position dashboard derived from trades
- **Trade Entry System** - Manual trade entry via UI

---

## Database Architecture

### Single Source of Truth: The `journal` Table

The application uses a **simple, flat journal table** as the single source of truth for all transactions. This design ensures data consistency and eliminates synchronization issues.

**Why Journal-First Architecture?**

- ✅ **Single source of truth** - No data duplication or sync issues
- ✅ **Event sourcing pattern** - Immutable transaction history
- ✅ **Flexibility** - Can represent any type of transaction (options, stocks, fees, dividends)
- ✅ **Simplicity** - No complex foreign keys or normalization to maintain
- ✅ **Performance** - Direct queries, no joins required for common operations
- ✅ **Derived state** - Positions and analytics calculated from journal entries

#### Journal Table Schema

```sql
-- Journal table - Single source of truth for all transactions
CREATE TABLE journal (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,                        -- ISO timestamp
  account_id TEXT NOT NULL,                -- Account/portfolio identifier
  symbol TEXT,                             -- Ticker symbol (nullable for fees/adjustments)
  type TEXT NOT NULL,                      -- Transaction type (see types below)
  qty REAL,                                -- Quantity (contracts for options, shares for stock)
  amount REAL NOT NULL,                    -- Cash flow: + cash in, - cash out
  strike REAL,                             -- Strike price for options
  expiration TEXT,                         -- ISO date string for options
  underlying_price REAL,                   -- Stock price at trade time
  notes TEXT,                              -- User notes or import metadata
  meta TEXT,                               -- JSON for additional data (broker, import_batch_id, etc.)

  -- Audit fields for edit tracking
  deleted_at TEXT DEFAULT NULL,            -- Soft delete timestamp
  edited_by TEXT DEFAULT NULL,             -- User who edited
  edit_reason TEXT DEFAULT NULL,           -- Reason for edit
  original_entry_id TEXT DEFAULT NULL,     -- Reference to original if edited
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(account_id) REFERENCES accounts(id)
);

-- Indexes for performance
CREATE INDEX idx_journal_ts ON journal(ts);
CREATE INDEX idx_journal_symbol ON journal(symbol);
CREATE INDEX idx_journal_type ON journal(type);
CREATE INDEX idx_journal_deleted_at ON journal(deleted_at);
CREATE INDEX idx_journal_account_id ON journal(account_id);

-- Accounts table (simple, no complex schema)
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
```

**Transaction Types:**

- `sell_to_open` - Opening option position (short)
- `buy_to_open` - Opening option position (long)
- `sell_to_close` - Closing option position (taking profit/loss)
- `buy_to_close` - Closing option position (buying back)
- `option_premium` - Premium collected/paid
- `assignment_shares` - Put assignment (bought shares)
- `share_sale` - Call assignment (shares called away)
- `dividend` - Dividend payment
- `fee` - Trading fees, commissions
- `expiration` - Option expired worthless
- `correction` - Manual adjustment entry

---

## Data Flow Diagram

### Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA INPUT SOURCES                         │
└─────────┬───────────────────────────────────────────────┬───────┘
          │                                                │
          ▼                                                ▼
┌──────────────────────┐                          ┌────────────────────┐
│   CSV IMPORT         │                          │  MANUAL ENTRY      │
│   (Import Page)      │                          │  (Trade Drawer)    │
└──────────┬───────────┘                          └─────────┬──────────┘
           │                                                 │
           │  1. Parse CSV                                   │  1. Form input
           │  2. Detect broker                               │  2. Validate
           │  3. Normalize data                              │  3. Select template
           │  4. Map to template                             │
           │  5. Generate journal entries                    │
           │                                                 │
           ▼                                                 ▼
    ┌──────────────────┐                          ┌──────────────────┐
    │ BatchImportService│                          │ useEntriesStore() │
    │ + Templates       │                          │ addEntry()        │
    └──────┬────────────┘                          └─────────┬─────────┘
           │                                                 │
           │         Both use same templates                 │
           │         Both write to journal table             │
           └──────────────────┬──────────────────────────────┘
                              │
                              ▼
                ┌──────────────────────────────┐
                │    SQLITE DATABASE           │
                │                              │
                │  ┌────────────────────────┐  │
                │  │   journal TABLE        │  │
                │  │  (SINGLE SOURCE OF     │  │
                │  │   TRUTH)               │  │
                │  └────────────────────────┘  │
                │  ┌────────────────────────┐  │
                │  │   accounts TABLE       │  │
                │  │  (Simple lookup)       │  │
                │  └────────────────────────┘  │
                └──────────────┬───────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
      ┌──────────────────┐          ┌──────────────────────┐
      │  JOURNAL PAGE    │          │    WHEEL PAGE        │
      │                  │          │                      │
      │  - Reads journal │          │  - Reads journal     │
      │  - SQL filters   │          │  - Derives positions │
      │  - Calculates    │          │  - Calculates P&L    │
      │    totals        │          │  - Shows metrics     │
      │  - Shows history │          │  - Live dashboard    │
      └──────────────────┘          └──────────────────────┘
```

---

## Component Breakdown

### 1. Import System (`src/pages/ImportPage.tsx` + `src/modules/import/*`)

**Purpose:** Import broker CSV files with automatic format detection and data normalization

**Architecture:**

- **Multi-layer validation** - CSV parsing → broker detection → trade validation → template mapping
- **Broker adapters** - Pluggable adapters for Robinhood, TD Ameritrade, Schwab, E\*TRADE
- **Template-based writes** - Uses same templates as manual entry for consistency
- **Batch processing** - Handles large files efficiently with progress tracking
- **Error handling** - Continues on errors, provides detailed feedback

**Import Flow:**

```typescript
// 1. User selects CSV file
<input type="file" accept=".csv" onChange={handleFileSelect} />

// 2. Click "Import Trades" button triggers import
async function handleImport() {
  // 3. Initialize import service
  const importService = new BatchImportService(db);

  // 4. Import with configuration
  const results = await importService.importFromFile(file, {
    accountId: 'acct-1',         // Target account
    autoDetectBroker: true,      // Auto-detect format
    stopOnError: false,          // Continue on errors
    skipInvalidRecords: true,    // Skip bad rows
  });

  // 5. Persist to database
  await db.persist();

  // 6. Show results
  console.log(`✅ Imported ${results.successfulRecords} trades`);
}
```

**Broker Detection:**

```typescript
// Automatic format detection based on CSV headers
const detection = detectBrokerFromHeaders(headers);

if (detection.broker === 'robinhood' && detection.confidence > 0.7) {
  const adapter = new RobinhoodBrokerAdapter();
  const normalized = adapter.adaptRow(rawData);
  // normalized = {
  //   symbol: 'AAPL',
  //   action: 'SELL_TO_OPEN',
  //   quantity: 10,
  //   strike: 150,
  //   expiration: '2025-12-15',
  //   premium: 250.00,
  //   fees: 7.00
  // }
}
```

**Broker Adapters Available:**

- `RobinhoodBrokerAdapter` - Handles Robinhood's export format
- `TDAmeritradeBrokerAdapter` - TD Ameritrade CSV format
- `SchwabBrokerAdapter` - Charles Schwab format
- `ETradeAdapter` - E\*TRADE format

**Template Mapping:**

```typescript
// Import maps normalized trades to templates (same as manual entry)
for (const normalizedTrade of validTrades) {
  const templateName = mapActionToTemplate(normalizedTrade.action);

  // Use existing template system
  await addEntry(templateName, {
    accountId: config.accountId,
    symbol: normalizedTrade.symbol,
    date: normalizedTrade.tradeDate,
    contracts: normalizedTrade.quantity,
    premiumPerContract: normalizedTrade.price,
    strike: normalizedTrade.strikePrice,
    expiration: normalizedTrade.expirationDate,
    fee: normalizedTrade.fees,
    // Add import metadata
    meta: {
      import_batch_id: importId,
      import_source: 'csv_file',
      broker: detectedBroker,
    },
  });
}

// mapActionToTemplate examples:
// SELL_TO_OPEN + PUT → 'tmplSellPut'
// SELL_TO_OPEN + CALL → 'tmplSellCoveredCall'
// BUY_TO_CLOSE → 'tmplFee' (with negative amount)
// ASSIGNMENT → 'tmplPutAssigned' or 'tmplCallAssigned'
```

### 2. TradeTab Component (`src/pages/wheel/components/drawers/TradeTab.tsx`)

**Purpose:** Manual trade entry form in the Wheel page's Actions drawer

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

### 3. Journal Page (`/journal`)

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

### 4. Wheel Page (`/wheel`)

**Purpose:** Live dashboard for active wheel strategy positions

**Data source:**

- Reads from `journal` table via `useWheelDatabase()` hook
- Transforms journal entries into current positions
- Calculates DTE (days to expiration) dynamically

**Transformation logic:**

```typescript
// From useWheelDatabase.ts - Simplified version
function transformJournalToPositions(entries: Entry[]): Position[] {
  const positionMap = new Map<string, Position>();

  for (const entry of entries) {
    // Filter: Only option-related entries
    if (!['sell_to_open', 'option_premium', 'buy_to_close'].includes(entry.type)) {
      continue;
    }

    // Require strike and expiration for options
    if (!entry.strike || !entry.expiration) continue;

    // Create unique position key
    const key = `${entry.symbol}_${entry.strike}_${entry.expiration}`;

    // Initialize position if new
    if (!positionMap.has(key)) {
      positionMap.set(key, {
        id: key,
        ticker: entry.symbol,
        strike: entry.strike,
        qty: 0,
        entry: 0,
        mark: 0, // Will be populated by market data
        dte: calculateDTE(entry.expiration),
        m: 0, // Moneyness
        type: entry.type.includes('call') ? 'C' : 'P',
        side: 'S',
      });
    }

    const position = positionMap.get(key)!;

    // Update position based on trade action
    if (entry.type === 'sell_to_open' || entry.type === 'option_premium') {
      // Opening trade - adds to position
      position.qty += entry.qty || 1;
      position.side = 'S';

      // Calculate weighted average entry price
      const premium = Math.abs(entry.amount) / (entry.qty || 1) / 100;
      position.entry =
        (position.entry * (position.qty - (entry.qty || 1)) + premium * (entry.qty || 1)) /
        position.qty;
    } else if (entry.type === 'buy_to_close') {
      // Closing trade - reduces position
      position.qty -= entry.qty || 1;
    }
  }

  // Filter to only open positions (qty > 0)
  return Array.from(positionMap.values()).filter(pos => pos.qty > 0);
}

// Share lots (stock holdings) are derived similarly
function transformJournalToShareLots(entries: Entry[]): ShareLot[] {
  const lotMap = new Map<string, { qty: number; totalCost: number }>();

  for (const entry of entries) {
    if (entry.type === 'assignment_shares') {
      // Put assignment - bought shares
      const lot = lotMap.get(entry.symbol) || { qty: 0, totalCost: 0 };
      lot.qty += entry.qty || 0;
      lot.totalCost += Math.abs(entry.amount);
      lotMap.set(entry.symbol, lot);
    } else if (entry.type === 'share_sale') {
      // Call assignment - sold shares
      const lot = lotMap.get(entry.symbol);
      if (lot) {
        lot.qty -= entry.qty || 0;
      }
    }
  }

  return Array.from(lotMap.entries())
    .filter(([_, lot]) => lot.qty > 0)
    .map(([ticker, lot]) => ({
      ticker,
      qty: lot.qty,
      costPerShare: lot.totalCost / lot.qty,
    }));
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

### After Manual Trade Entry

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

### After CSV Import

```typescript
// 1. User uploads CSV and clicks "Import Trades"
const results = await importService.importFromFile(file, config);

// 2. Import service processes data
//    - Parse CSV (50-100ms for small files)
//    - Detect broker (instant, header analysis)
//    - Normalize trades (broker adapter transforms data)
//    - Map to templates (same as manual entry)
//    - Generate journal entries via templates
//    - Insert into journal table (batch operation)

// 3. Persist to storage
await db.persist(); // Writes to OPFS/IndexedDB/localStorage

// 4. Reload pages to show new data
await reloadFn(); // Triggers Wheel/Journal refresh

// 5. UI shows success message
console.log(`✅ Imported ${results.successfulRecords} trades`);
```

**Import Timeline (for 100 trades):**

```
t=0ms     User clicks "Import Trades"
t=5ms     Read file into memory
t=50ms    Parse CSV (papaparse)
t=60ms    Detect broker (header analysis)
t=100ms   Normalize 100 trades via adapter
t=150ms   Validate trades (Zod schemas)
t=200ms   Map to templates (tmplSellPut, etc.)
t=300ms   Generate journal entries from templates
t=400ms   Batch insert into journal table
t=450ms   Persist database to OPFS
t=500ms   Reload Wheel/Journal pages
t=550ms   Show success message ✓
```

**Key Benefit:** Import uses the **same template system** as manual entry, ensuring consistency. Both CSV import and manual trade entry write to the same journal table using the same templates.

---

## Key Design Decisions

### Why Journal Table as Single Source of Truth?

**Design Choice:** Use one simple table instead of normalized relational schema

**Benefits:**

- ✅ **Simplicity** - No foreign keys, no joins, no sync issues
- ✅ **Event sourcing** - Immutable transaction history
- ✅ **Flexibility** - Can represent any transaction type
- ✅ **Performance** - Direct queries, indexed columns
- ✅ **Consistency** - All writes go to same table
- ✅ **Testability** - Easy to query and verify data
- ✅ **Template pattern** - High-level trade → multiple journal entries

**Trade-offs Considered:**

| Feature           | Journal Table           | Normalized Schema      |
| ----------------- | ----------------------- | ---------------------- |
| Data Integrity    | ⚠️ Application-level    | ✅ Database-level (FK) |
| Query Complexity  | ✅ Simple SELECT        | ⚠️ Requires JOINs      |
| Write Operations  | ✅ Single INSERT        | ⚠️ Multiple tables     |
| Portfolio Support | ✅ Via account_id       | ✅ Via foreign key     |
| Symbol Metadata   | ⚠️ Limited              | ✅ Full metadata       |
| Position Tracking | ✅ Derived from journal | ⚠️ Must be maintained  |
| Learning Curve    | ✅ Very simple          | ⚠️ Moderate            |

**When to Consider Migration:**

- When you need true multi-portfolio analytics with portfolio-level P&L
- When you need complex reporting with symbol metadata (sector, industry)
- When journal table grows to millions of rows and query performance degrades
- When you need foreign key constraints for data integrity
- **Not before the basic features work well!**

---

### Why Transform Journal → Positions?

**Question:** Why not store positions directly?

**Answer:** Positions are _derived state_ from journal entries (or trades).

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

- ✅ History is immutable (trades/journal never change)
- ✅ Positions auto-update from latest data
- ✅ Easy to recalculate if logic changes
- ✅ Can reconstruct positions at any point in time
- ✅ No sync issues between trades and positions

**Note:** The schema includes a `positions` table for future optimization, but it's not currently used. When implemented, it will be a materialized view that's regenerated from trades, not a primary data store.

### Why Broker Adapters?

**Problem:** Each broker exports CSVs in different formats

**Robinhood Example:**

```csv
"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"10/20/2025","10/20/2025","10/21/2025","ASTS","ASTS 10/24/2025 Put $80.00","STO","1","$1.50","$149.95"
```

**TD Ameritrade Example:**

```csv
"Date","Transaction ID","Description","Quantity","Symbol","Price","Amount","Type"
"10/20/2025","12345","SELL TO OPEN PUT ASTS 100 24 OCT 25 80","1","ASTS","1.50","149.95","OPTION"
```

**Solution:** Broker-specific adapters normalize data into common format, then map to templates

```typescript
// Step 1: Adapter normalizes broker format → standard format
interface NormalizedTradeData {
  symbol: string; // "ASTS"
  action: string; // "SELL_TO_OPEN"
  instrumentType: string; // "OPTION"
  quantity: number; // 1
  price: number; // 1.50
  optionType?: 'CALL' | 'PUT'; // "PUT"
  strikePrice?: number; // 80
  expirationDate?: string; // "2025-10-24"
  fees?: number; // 0.05
  tradeDate: string; // "2025-10-20"
}

// Step 2: Map to template (same system as manual entry)
const templateName = mapActionToTemplate(normalized);
// SELL_TO_OPEN + PUT → 'tmplSellPut'

// Step 3: Use template to generate journal entries
await addEntry('tmplSellPut', {
  accountId: 'acct-1',
  symbol: normalized.symbol,
  date: normalized.tradeDate,
  contracts: normalized.quantity,
  premiumPerContract: normalized.price,
  strike: normalized.strikePrice,
  expiration: normalized.expirationDate,
  fee: normalized.fees,
});
// This generates multiple journal entries (premium + fee)
```

**Benefits:**

- ✅ Supports multiple brokers with one codebase
- ✅ Easy to add new broker adapters
- ✅ Automatic format detection
- ✅ Import and manual entry use same templates
- ✅ Consistent data structure in journal table
- ✅ Handles broker-specific quirks (date formats, field names, etc.)

---

## Common Operations

### Importing Trades from CSV

```typescript
// 1. User selects file on Import page
<input type="file" accept=".csv" onChange={handleFileSelect} />

// 2. User clicks "Import Trades" button
async function handleImport() {
  const importService = new BatchImportService(db);

  const results = await importService.importFromFile(file, {
    portfolioId: 1,              // Which portfolio to import into
    autoDetectBroker: true,      // Auto-detect from headers
    forceBrokerType: 'robinhood',// Optional: force specific broker
    stopOnError: false,          // Continue on errors
    skipInvalidRecords: true,    // Skip bad rows
  });

  await db.persist(); // Save to storage

  // Show results
  if (results.success) {
    alert(`✅ Imported ${results.successfulRecords} trades`);
  } else {
    alert(`❌ Import failed: ${results.message}`);
  }
}

// 3. Results object contains details
{
  success: true,
  importId: 'import_1730000000_xyz',
  totalRecords: 100,
  successfulRecords: 95,
  failedRecords: 3,
  skippedRecords: 2,
  detectedBroker: 'robinhood',
  brokerConfidence: 0.95,
  errors: [
    { recordIndex: 45, error: 'Missing expiration date', code: 'MISSING_FIELD' },
    // ...
  ]
}
```

### Adding a Trade Manually

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
│   ├── sql.ts                    # Legacy SQLite wrapper (journal table)
│   ├── schema.sql                # Legacy journal table schema
│   └── queryBuilder.ts           # SQL WHERE clause builder for filters
│
├── modules/
│   ├── db/
│   │   ├── sqlite.ts             # New SQLite wrapper (async, typed)
│   │   ├── schema.ts             # New normalized schema definitions
│   │   ├── migrations.ts         # Database migrations
│   │   ├── validation.ts         # Zod schemas for data validation
│   │   ├── portfolio-dao.ts      # Portfolio CRUD operations
│   │   ├── trade-dao.ts          # Trade CRUD operations
│   │   └── symbol-dao.ts         # Symbol CRUD operations
│   │
│   └── import/
│       ├── batch-import.ts       # Main import orchestrator
│       ├── csv-parser.ts         # CSV parsing (papaparse wrapper)
│       ├── validation-service.ts # Trade validation
│       ├── symbol-service.ts     # Symbol normalization/resolution
│       ├── progress-tracker.ts   # Import progress tracking
│       └── broker-adapters/
│           ├── base-adapter.ts   # Base adapter interface
│           ├── index.ts          # Broker detection logic
│           ├── robinhood-adapter.ts
│           ├── td-ameritrade-adapter.ts
│           ├── schwab-adapter.ts
│           └── etrade-adapter.ts
│
├── stores/
│   ├── useEntriesStore.ts        # Journal data store (journal table)
│   └── useWheelStore.ts          # Wheel positions cache
│
├── hooks/
│   └── useWheelDatabase.ts       # Loads & transforms journal → wheel data
│
├── models/
│   └── templates.ts              # Trade templates (tmplSellPut, etc.)
│
├── pages/
│   ├── ImportPage.tsx            # CSV import page
│   ├── journal/
│   │   └── JournalPage.tsx       # Transaction history page
│   └── wheel/
│       ├── WheelPage.tsx         # Dashboard page
│       └── components/
│           └── drawers/
│               └── TradeTab.tsx  # Manual trade entry form
│
├── types/
│   ├── entry.ts                  # Journal entry types (legacy)
│   └── wheel.ts                  # Wheel-specific types (Position, Lot, etc.)
│
└── utils/
    └── data-events.ts            # Event emitter for data updates
```

---

## Future Enhancements

### Consider Normalized Database Later

**When journal table approach hits limits:**

- Application becomes slow with millions of journal entries
- Need complex relational queries (portfolios → trades → options)
- Want to enforce referential integrity at database level
- Need to perform analytics without parsing denormalized rows
- Multiple users need concurrent write access

**Potential Migration Path:**

```
journal table (single source) → Derive normalized tables from journal
                ↓
         Keep journal as source of truth
         Generate trades/options/portfolios views
```

**Current Journal-First Approach is Perfect For:**

- Hundreds of thousands of entries ✅
- Read-heavy operations (displaying positions) ✅
- Event sourcing pattern (append-only audit log) ✅
- Simple queries (filter by date/symbol/account) ✅
- Single-user desktop/PWA application ✅

### Short-Term Improvements

1. **Import System:**
   - Complete migration from TradeDAO to template-based imports
   - Add more broker adapters (Interactive Brokers, Fidelity, etc.)
   - Improve duplicate detection with fuzzy matching
   - Add import validation preview before commit

2. **Data Integrity:**
   - Checksum verification for imported CSVs
   - Trade reconciliation reports (compare imported vs manual entries)
   - Data export feature (journal → CSV for backup)

3. **Performance:**
   - Virtual scrolling for large portfolios
   - Web Worker for CSV parsing (already uses papaparse)
   - Indexed queries on frequently-filtered columns (date, symbol, account)
   - SQLite query optimization with EXPLAIN QUERY PLAN

4. **Advanced Features:**
   - Multi-currency support (forex conversion)
   - Corporate actions (splits, dividends, mergers)
   - Historical price data integration (fetch closing prices)
   - Tax reporting (1099-B generation, wash sale detection)

### Real-Time Market Data

```typescript
// Could enhance transformJournalToPositions
async function transformJournalToPositions(entries: Entry[]): Promise<Position[]> {
  const positions = /* ... transform logic ... */;

  // Fetch real-time prices from market data API
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

### Enhanced Import Features

```typescript
// Multi-file import
await importService.importFromFiles([file1, file2, file3], {
  portfolioId: 1,
  mergeDuplicates: true, // Skip duplicate order IDs
});

// Scheduled auto-import from broker API
await importService.importFromBrokerAPI({
  broker: 'robinhood',
  credentials: { token: '...' },
  since: '2025-10-01',
});

// Import validation preview before save
const preview = await importService.previewImport(csvContent);
// Show user what will be imported, allow editing
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

### Advanced Analytics

```typescript
// Portfolio performance tracking
const performance = await analyzePortfolio(portfolioId, {
  from: '2025-01-01',
  to: '2025-11-02',
  metrics: ['total_pnl', 'win_rate', 'sharpe_ratio'],
});

// Wheel strategy analysis
const wheelStats = await analyzeWheelStrategy({
  symbols: ['AAPL', 'TSLA'],
  includeAssignments: true,
  calculateAnnualizedReturn: true,
});
```

---

## Summary

**Key Takeaways:**

1. **Single Source of Truth** - Journal table is the only authoritative data store
2. **Template-Based Writes** - All writes (manual & import) use templates to generate journal entries
3. **CSV Import Pipeline** - Multi-stage import with broker detection, normalization, template mapping
4. **Broker Adapters** - Pluggable adapters handle different CSV formats from various brokers
5. **Derived Positions** - Wheel page transforms journal entries into current positions
6. **Zustand for Caching** - Stores cache data to minimize database queries
7. **Event-Driven Updates** - Data update events synchronize different parts of the application

**Complete Data Flow:**

```
┌──────────────────────────────────────────────────────────────────┐
│                      DATA INPUT SOURCES                          │
└─────────┬────────────────────────────────────────────────┬───────┘
          │                                                │
    CSV Import                                      Manual Entry
          │                                                │
          ▼                                                ▼
  BatchImportService                              useEntriesStore
  (broker adapters)                               (TradeTab form)
          │                                                │
          ▼                                                ▼
   Normalize trades                                 Get template
   Map to templates ──────────┬────────────────────► (tmplSellPut)
          │                   │                           │
          │                   │                           │
          └───────────────────┴───────────────────────────┘
                              │
                              ▼
                    Generate journal entries
                    (multiple per trade)
                              │
                              ▼
                       journal table
                    (single source of truth)
                              │
                              ▼
                   SQLite Database
                   (OPFS/IndexedDB)
                              │
          ┌───────────────────┴─────────────────┐
          ▼                                     ▼
    Journal Page                           Wheel Page
    (filters & totals)                     (positions & analytics)
```

**Result:** A simple, consistent system where all data flows through templates into the journal table, ensuring data consistency across all pages.

---

## Troubleshooting

### Trade doesn't appear on Wheel page after import

**Root Cause:** Import currently writes to `trades` table, but Wheel page reads from `journal` table.

**Temporary Workaround:**

- Use manual entry via Trade drawer (uses templates → writes to journal)

**Proper Fix (TODO):**

1. Update `BatchImportService` to use templates instead of `TradeDAO`
2. Map normalized trades → appropriate templates (`tmplSellPut`, `tmplBuyToClose`, etc.)
3. Generate journal entries via templates
4. Remove `trades` table writes from import flow

**Debug Steps:**

1. Does it appear in Journal page? (If no, database write failed)
2. Console logs show "✅ Wheel data loaded successfully"?
3. Is the entry type recognized? (must be `sell_to_open`, `option_premium`, or `buy_to_close`)
4. Does the entry have `strike` and `expiration` fields?

**Debug Commands:**

```typescript
// In browser console
const entries = await useEntriesStore.getState().loadEntries({});
console.log(entries); // Check if trade exists in journal

const wheelData = await useWheelDatabase().reload();
console.log(wheelData); // Check if position was created

// Check if import wrote to wrong table
const db = await initSQLite(); // From src/modules/db/sqlite.ts
const trades = await db.query('SELECT * FROM trades');
console.log(trades); // If data is here, it's in wrong table
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

## Import System Deep Dive

### Import Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: FILE INPUT (ImportPage.tsx)                       │
│  - File upload handling                                     │
│  - User feedback & progress display                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Layer 2: ORCHESTRATION (BatchImportService)                │
│  - Coordinates entire import pipeline                       │
│  - Manages transactions & rollback                          │
│  - Progress tracking & error aggregation                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│ CSVParser    │  │ BrokerAdapters   │  │ Validation   │
│ (papaparse)  │  │ (normalize data) │  │ (Zod schemas)│
└──────────────┘  └──────────────────┘  └──────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│ SymbolService    │                  │ TradeDAO         │
│ (resolve/create) │                  │ (batch insert)   │
└──────────────────┘                  └──────────────────┘
```

### Import Process Step-by-Step

#### Step 1: File Upload & Parsing

```typescript
// User selects CSV file
const file = event.target.files[0];

// Parse CSV using papaparse
const parseResult = await csvParser.parseFromFile(file);
// Returns: { data: [...], meta: { fields: [...] }, errors: [...] }
```

#### Step 2: Broker Detection

```typescript
// Analyze CSV headers to detect broker
const headers = parseResult.meta.fields;
const detection = detectBrokerFromHeaders(headers);

// Example result:
{
  broker: 'robinhood',
  confidence: 0.95,
  reason: 'Found indicators: Activity Date, Trans Code, Settle Date',
  requiredColumns: ['Activity Date', 'Instrument', 'Trans Code'],
  foundColumns: ['Activity Date', 'Process Date', 'Settle Date', ...]
}
```

#### Step 3: Data Normalization

```typescript
// Get broker-specific adapter
const adapter = getBrokerAdapter('robinhood');

// Transform each row to normalized format
const normalized = parseResult.data.map(rawRow => {
  return adapter.adaptRow(rawRow);
  // Converts Robinhood format → standard format
  // Input:  { "Activity Date": "10/20/2025", "Trans Code": "STO", ... }
  // Output: { tradeDate: "2025-10-20", action: "SELL_TO_OPEN", ... }
});
```

#### Step 4: Validation

```typescript
// Validate each normalized trade
const validationResults = validationService.validateBatch(normalized);

// Example result:
{
  totalRecords: 100,
  validRecords: 95,
  invalidRecords: 5,
  results: [
    { valid: true, data: {...}, errors: [], warnings: [] },
    { valid: false, errors: ['Missing expiration date'], warnings: [] },
    // ...
  ]
}
```

#### Step 5: Symbol Resolution

```typescript
// Ensure all symbols exist in database
const symbolResults = await symbolService.processBatch(validTrades);

// Creates missing symbols:
// - Extracts unique symbols from trades
// - Checks which exist in database
// - Creates new symbol records for missing ones
// - Returns mapping: symbol string → symbol ID
```

#### Step 6: Database Insert

```typescript
// Batch insert trades with transaction
const tradeRecords = validTrades.map(trade => ({
  portfolio_id: config.portfolioId,
  symbol_id: symbolMap[trade.symbol],
  trade_date: trade.tradeDate,
  action: trade.action,
  quantity: trade.quantity,
  price: trade.price,
  fees: trade.fees,
  option_type: trade.optionType,
  strike_price: trade.strikePrice,
  expiration_date: trade.expirationDate,
  import_source: 'csv_file',
  import_batch_id: importId,
}));

await tradeDAO.createBatch(tradeRecords);
```

#### Step 7: Persistence & Cleanup

```typescript
// Persist database to storage (OPFS/IndexedDB)
await db.persist();

// Return import results
return {
  success: true,
  importId: 'import_1730000000_xyz',
  totalRecords: 100,
  successfulRecords: 95,
  failedRecords: 5,
  duration: 542, // ms
  detectedBroker: 'robinhood',
  // ... more details
};
```

### Error Handling Strategy

**Three-Tier Error Handling:**

1. **Record-Level Errors** - Skip individual bad records, continue with others

   ```typescript
   skipInvalidRecords: true; // Continue even if some records fail
   ```

2. **Batch-Level Errors** - Stop after too many errors

   ```typescript
   maxErrors: 100; // Stop if more than 100 records fail
   ```

3. **Fatal Errors** - Rollback entire import on critical failures
   ```typescript
   // Database transaction ensures atomicity
   // If any critical error occurs, all changes are rolled back
   ```

### Portfolio Management

**Automatic Portfolio Creation:**

```typescript
// Import checks if portfolio exists
const portfolio = await portfolioDAO.findById(config.portfolioId);

if (!portfolio) {
  // Auto-create default portfolio
  const newPortfolio = await portfolioDAO.create({
    name: 'Default Portfolio',
    broker: detectedBroker,
    account_type: 'cash',
    description: 'Auto-created for CSV import',
  });

  config.portfolioId = newPortfolio.id;
}
```

**Multi-Portfolio Support:**

```typescript
// Import to specific portfolio
await importService.importFromFile(file, {
  portfolioId: 2, // Robinhood account
});

await importService.importFromFile(file2, {
  portfolioId: 3, // TD Ameritrade account
});

// Each portfolio tracks its own trades
// Trades are never mixed between portfolios
```

---

_Last updated: November 3, 2025_
