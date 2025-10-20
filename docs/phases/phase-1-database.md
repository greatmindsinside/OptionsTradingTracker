# Phase 1: Database & Schema (SQLite-WASM) 🗄️

## Goals

- Implement SQLite-WASM engine for browser-side data processing
- Design normalized schema for trades, positions, lots, wheel cycles
- Create persistence layer with OPFS/IndexedDB fallback
- Build typed query helpers and migration system
- Implement robust data validation with schema enforcement

## Inputs

- Project scaffold from Phase 0
- Schema requirements from specification
- SQLite-WASM library choice (sql.js vs wa-sqlite)
- Data validation requirements and business rules

## Outputs

- Working SQLite-WASM implementation
- Complete database schema with indexes
- Migration system
- Type-safe query helpers
- Persistence to OPFS with IndexedDB fallback
- Comprehensive data validation layer

## Tasks Checklist

### Library Setup & Initialization

- [ ] Choose SQLite-WASM library (sql.js vs wa-sqlite)
- [ ] Create `/src/modules/db/sqlite.ts` with WASM initialization
- [ ] Implement OPFS persistence with IndexedDB fallback
- [ ] Add connection pooling/management for Web Workers
- [ ] Add error handling and connection retry logic

### Schema Design & Validation

- [ ] Implement data validation schemas with Zod or similar
- [ ] Design schema DDL for all tables (trades, positions, lots, etc.)
- [ ] Create database schema versioning and rollback capabilities
- [ ] Add data integrity constraints and foreign keys
- [ ] Create indexes for performance (underlying, dates, etc.)

### Migration System

- [ ] Build migration system for schema versioning
- [ ] Implement audit logs for data changes
- [ ] Add data compression for large datasets
- [ ] Create database utilities (backup, restore, reset)

### Query Interface

- [ ] Create typed query helpers and prepared statements
- [ ] Implement batch insert helpers for CSV import
- [ ] Build efficient query patterns for large datasets

## Database Schema

### Core Tables

```sql
-- Trade records from CSV imports
CREATE TABLE trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sourceFile TEXT NOT NULL,
    underlying TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('C', 'P')),
    side TEXT NOT NULL CHECK (side IN ('Buy', 'Sell')),
    qty INTEGER NOT NULL,
    strike REAL NOT NULL,
    expiration DATE NOT NULL,
    openTime DATETIME,
    closeTime DATETIME,
    price REAL NOT NULL,
    amount REAL NOT NULL,
    fees REAL DEFAULT 0,
    multiplier INTEGER DEFAULT 100,
    orderId TEXT,
    legId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Current position aggregates
CREATE TABLE positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    underlying TEXT NOT NULL UNIQUE,
    qty INTEGER NOT NULL,
    avgBasis REAL NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tax lot tracking
CREATE TABLE lots (
    lotId TEXT PRIMARY KEY,
    underlying TEXT NOT NULL,
    qty INTEGER NOT NULL,
    basis REAL NOT NULL,
    basisAdj REAL DEFAULT 0,
    acqDate DATE NOT NULL,
    holdStart DATE NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('FIFO', 'HIFO', 'LIFO')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lot lifecycle events
CREATE TABLE lot_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lotId TEXT NOT NULL,
    eventType TEXT NOT NULL CHECK (eventType IN ('open', 'close', 'split', 'dividend', 'wash_adj')),
    dt DATETIME NOT NULL,
    qty INTEGER NOT NULL,
    proceeds REAL,
    basisAdj REAL DEFAULT 0,
    realizedPL REAL,
    note TEXT,
    FOREIGN KEY (lotId) REFERENCES lots(lotId)
);

-- Wheel strategy lifecycle tracking
CREATE TABLE wheel (
    lifecycleId TEXT NOT NULL,
    stepIndex INTEGER NOT NULL,
    underlying TEXT NOT NULL,
    eventType TEXT NOT NULL CHECK (eventType IN ('csp_open', 'csp_assign', 'cc_open', 'cc_assign', 'cc_expire', 'shares_sold')),
    dt DATETIME NOT NULL,
    strike REAL,
    expiry DATE,
    qty INTEGER NOT NULL,
    netCredit REAL NOT NULL,
    runningBasis REAL NOT NULL,
    tradeId INTEGER,
    PRIMARY KEY (lifecycleId, stepIndex),
    FOREIGN KEY (tradeId) REFERENCES trades(id)
);

-- Price cache
CREATE TABLE prices (
    underlying TEXT NOT NULL,
    dt DATE NOT NULL,
    close REAL NOT NULL,
    source TEXT DEFAULT 'manual',
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (underlying, dt)
);

-- Application settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX trades_idx1 ON trades(underlying, expiration);
CREATE INDEX trades_idx2 ON trades(openTime);
CREATE INDEX trades_idx3 ON trades(sourceFile);
CREATE INDEX lots_idx1 ON lots(underlying, acqDate);
CREATE INDEX lot_events_idx1 ON lot_events(lotId, dt);
CREATE INDEX wheel_idx1 ON wheel(underlying, lifecycleId);
CREATE INDEX prices_idx1 ON prices(underlying, dt);
```

## Dependencies

- Phase 0 (project setup) must be complete

## Acceptance Tests

- [ ] SQLite-WASM loads and initializes in browser
- [ ] Can create all required tables and indexes
- [ ] OPFS persistence works (or IndexedDB fallback)
- [ ] Typed queries return correct TypeScript types
- [ ] Data validation catches invalid inputs before database insertion
- [ ] Schema migrations work forwards and backwards
- [ ] Batch inserts handle 1k+ rows efficiently
- [ ] Migration system can upgrade schema versions
- [ ] Database survives browser refresh/restart
- [ ] Memory usage stays reasonable with large datasets
- [ ] Audit logs track all data modifications
- [ ] Data integrity constraints prevent orphaned records

## Risks & Mitigations

- **Risk:** SQLite-WASM performance in browser
  - **Mitigation:** Use Web Workers, batch operations, proper indexing
- **Risk:** OPFS browser compatibility
  - **Mitigation:** Implement IndexedDB fallback, feature detection
- **Risk:** Memory limits with large CSV files
  - **Mitigation:** Streaming inserts, periodic cleanup, chunked processing
- **Risk:** Data corruption from invalid inputs
  - **Mitigation:** Comprehensive validation with Zod schemas, constraint checking
- **Risk:** Schema evolution breaking existing data
  - **Mitigation:** Robust migration system with rollback capabilities

## Demo Script

```typescript
// Initialize database with validation
const db = await initSQLite();
// Create schema with constraints
await db.migrate();
// Test validation
const tradeSchema = z.object({
  underlying: z.string().min(1).max(5),
  strike: z.number().positive(),
  expiration: z.date().min(new Date()),
});
// Test insert with validation
await db.insertTrade(tradeSchema.parse(tradeData));
// Test query
const trades = await db.getTradesByUnderlying('AAPL');
// Test persistence
await db.persist();
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Choose SQLite-WASM library and implement basic initialization

**Previous Phase:** [Phase 0 - Project Setup](./phase-0-setup.md)
**Next Phase:** [Phase 2 - CSV Import & Normalization](./phase-2-csv-import.md)
