<!-- filepath: c:\Users\great\Desktop\Options Tracking Page\Plan.md -->

# Options Tracking Web App - Development Plan

## Project Overview

A local-only, browser-based options trading tracker for Robinhood CSV exports. Built with TypeScript + React + Vite, using SQLite-WASM for data processing and persisting everything client-side via IndexedDB/OPFS.

**Key Constraints:**

- 100% client-side (no backend, no cloud, no Python)
- Privacy-first (all processing in browser)
- Robinhood cash account focus
- Runnable in VSCode with `yarn install && yarn dev`

---

## Phase 0: Project Setup 🚀

### Goals

- Bootstrap Vite + React + TypeScript foundation
- Establish file structure and development workflow
- Configure essential tooling and dependencies
- Set up Git repository and GitHub integration
- Ensure proper version control from project start

### Inputs

- Requirements specification
- Technology stack decisions
- GitHub account for repository hosting

### Outputs

- Runnable development environment
- Project scaffold with proper structure
- Package.json with all dependencies
- Development and build scripts
- Git repository with GitHub remote
- Initial commit with project foundation

### Tasks Checklist

- [ ] Initialize Git repository (`git init`)
- [ ] Create `.gitignore` for Node.js/React projects
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install core dependencies (React, TypeScript, Vite)
- [ ] Install data processing deps (Papa Parse, sql.js/wa-sqlite)
- [ ] Install UI deps (Recharts/Chart.js, styling solution)
- [ ] Install state management (Zustand or Redux Toolkit)
- [ ] Install development dependencies (ESLint, Prettier, Vitest)
- [ ] **Install testing framework dependencies (Vitest, React Testing Library, Playwright, axe-core)**
- [ ] Configure ESLint with TypeScript and React rules
- [ ] Set up Prettier for consistent code formatting
- [ ] **Configure test pyramid: unit/component/e2e/accessibility testing**
- [ ] Configure VS Code settings and recommended extensions
- [ ] Create folder structure (/src/pages, /components, /modules, etc.)
- [ ] **Create testing folder structure (/tests/unit, /tests/e2e, /tests/fixtures)**
- [ ] Configure TypeScript (tsconfig.json, strict mode)
- [ ] Set up development scripts (dev, build, preview, test, lint, format)
- [ ] **Add comprehensive testing scripts (test:unit, test:e2e, test:a11y, test:all)**
- [ ] Create basic App.tsx with routing placeholder
- [ ] Set up React Router for navigation
- [ ] Configure path aliases (@/ for src/) in Vite and TypeScript
- [ ] Add environment variables setup (.env files)
- [ ] Create error boundary component for development
- [ ] Set up basic global styles and CSS architecture
- [ ] Add sample CSV files in /public/sample-csv
- [ ] **Set up Git workflow and branch protection**
- [ ] **Configure pre-commit hooks with Husky (lint, format, test:all)**
- [ ] **Create branch naming conventions and PR templates**
- [ ] Create GitHub repository (options-trading-tracker)
- [ ] **Push initial commit to main and protect main branch**
- [ ] **Configure GitHub branch protection rules**
- [ ] Set up README.md with Git workflow documentation
- [ ] **Set up GitHub Actions for CI/CD with comprehensive test pipeline**
- [ ] Create issue and PR templates for GitHub
- [ ] Configure Dependabot for dependency updates
- [ ] **Test complete Git workflow: branch → all tests → PR → merge**
- [ ] Add license file (MIT recommended for open source)
- [ ] Set up commit message conventions (Conventional Commits)

### Enhanced Dependencies

- Node.js 18+ and yarn package manager
- GitHub account for repository hosting
- VS Code for development environment
- Git CLI tools properly configured
- **Husky for Git hooks (automated)**
- **Playwright browsers for E2E testing**

### Test Pyramid Strategy

- **Unit Tests (Vitest):** Pure functions, calculations, utilities, database operations
- **Component Tests (Vitest + React Testing Library):** React components, user interactions, state management
- **End-to-End Tests (Playwright):** Complete user workflows, CSV import → analysis → export
- **Accessibility Tests (axe-core + Playwright):** WCAG compliance, screen reader compatibility
- **Integration Tests:** Database + UI workflows, multi-component interactions

### Git Workflow Requirements

- **Branch Strategy:** Feature branches from main, no direct main commits
- **Branch Naming:** `feat/feature-name`, `fix/bug-name`, `docs/update-name`, `test/test-name`
- **Pre-commit Checks:** ESLint, Prettier, TypeScript compilation, **full test suite**
- **PR Requirements:** All checks pass, **all tests pass**, code review (if team), squash merge
- **Main Branch Protection:** Require PR, require status checks, **require test passage**, no force push

### Additional Acceptance Tests

- [ ] ESLint catches common TypeScript/React issues
- [ ] Prettier formats code consistently on save
- [ ] VS Code provides proper IntelliSense and debugging
- [ ] Environment variables load correctly in development
- [ ] Path aliases resolve properly (@/components/...)
- [ ] Error boundaries catch and display development errors
- [ ] GitHub Actions CI passes on all PRs
- [ ] All yarn scripts work correctly (lint, format, test)
- [ ] **Unit tests achieve >90% coverage on critical modules**
- [ ] **Component tests cover user interactions and edge cases**
- [ ] **E2E tests verify complete user workflows**
- [ ] **Accessibility tests pass WCAG AA standards**
- [ ] **Pre-commit hooks block commits with failing tests**
- [ ] **Cannot push directly to main branch (protection enabled)**
- [ ] **PR creation triggers comprehensive test pipeline**
- [ ] **Merge requires all tests (unit/component/e2e/a11y) to pass**

### Additional Risks & Mitigations

- **Risk:** Inconsistent code formatting across team/time
  - **Mitigation:** Prettier + ESLint integration, pre-commit hooks
- **Risk:** VS Code configuration inconsistencies
  - **Mitigation:** Workspace settings, recommended extensions file
- **Risk:** Environment variable management complexity
  - **Mitigation:** Clear .env examples, documentation in README
- **Risk:** CI/CD pipeline failures
  - **Mitigation:** Start simple, test locally first, gradual complexity
- **Risk:** Developers bypassing Git workflow
  - **Mitigation:** Branch protection, pre-commit hooks, clear documentation
- **Risk:** Merge conflicts from parallel development
  - **Mitigation:** Small PRs, frequent rebasing, clear branching strategy
- **Risk:** Test suite becoming slow and blocking development
  - **Mitigation:** Fast unit tests, selective E2E runs, parallel execution
- **Risk:** Accessibility regressions going unnoticed
  - **Mitigation:** Automated axe-core testing, manual accessibility reviews

### Enhanced Demo Script

````bash
# Initialize Git and create project
git init
echo "node_modules/\ndist/\n.env.local\n*.log\ntest-results/\nplaywright-report/" > .gitignore

# Setup project with full tooling and testing
yarn create vite . --template react-ts
yarn install
yarn add zustand @tanstack/react-query react-router-dom
yarn add -D eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
yarn add -D eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
yarn add -D @vitejs/plugin-react vitest @testing-library/react @testing-library/jest-dom
yarn add -D @testing-library/user-event jsdom

### Enhanced Demo Script
```bash
# Initialize Git and create project
git init
echo "node_modules/\ndist/\n.env.local\n*.log\ntest-results/\nplaywright-report/\nstorybook-static/" > .gitignore

# Setup project with full tooling and testing
yarn create vite . --template react-ts
yarn install
yarn add zustand @tanstack/react-query react-router-dom zod
yarn add -D eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
yarn add -D eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
yarn add -D @vitejs/plugin-react vitest @testing-library/react @testing-library/jest-dom
yarn add -D @testing-library
# Merge after checks pass
gh pr merge --squash
git checkout main && git pull
git branch -d feat/test-workflow

# Strict Git Workflow Protocol
```bash
# FOR EVERY CHANGE - NO EXCEPTIONS

# 1. Start from updated main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feat/your-feature-name

# 3. Make changes and test locally
yarn lint    # Must pass
yarn format  # Must pass
yarn test    # Must pass
yarn build   # Must pass

# 4. Commit with conventional commits
git add .
git commit -m "feat: descriptive commit message"
# Pre-commit hooks automatically run lint/format/test

# 5. Push branch and create PR
git push -u origin feat/your-feature-name
gh pr create --title "Your Feature" --body "Description"

# 6. Wait for CI checks, merge when green
gh pr merge --squash

# 7. Clean up
git checkout main && git pull
git branch -d feat/your-feature-name
````

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Initialize Vite project and install dependencies

---

## Phase 1: Database & Schema (SQLite-WASM) 🗄️

### Goals

- Implement SQLite-WASM engine for browser-side data processing
- Design normalized schema for trades, positions, lots, wheel cycles
- Create persistence layer with OPFS/IndexedDB fallback
- Build typed query helpers and migration system

### Inputs

- Project scaffold from Phase 0
- Schema requirements from specification
- SQLite-WASM library choice (sql.js vs wa-sqlite)

### Outputs

- Working SQLite-WASM implementation
- Complete database schema with indexes
- Migration system
- Type-safe query helpers
- Persistence to OPFS with IndexedDB fallback

### Tasks Checklist

- [ ] Choose SQLite-WASM library (sql.js vs wa-sqlite)
- [ ] Create `/src/modules/db/sqlite.ts` with WASM initialization
- [ ] Implement OPFS persistence with IndexedDB fallback
- [ ] Design schema DDL for all tables (trades, positions, lots, etc.)
- [ ] Create indexes for performance (underlying, dates, etc.)
- [ ] Build migration system for schema versioning
- [ ] Create typed query helpers and prepared statements
- [ ] Add connection pooling/management for Web Workers
- [ ] Implement batch insert helpers for CSV import
- [ ] Create database utilities (backup, restore, reset)
- [ ] Add error handling and connection retry logic

### Dependencies

- Phase 0 (project setup) must be complete

### Acceptance Tests

- [ ] SQLite-WASM loads and initializes in browser
- [ ] Can create all required tables and indexes
- [ ] OPFS persistence works (or IndexedDB fallback)
- [ ] Typed queries return correct TypeScript types
- [ ] Batch inserts handle 1k+ rows efficiently
- [ ] Migration system can upgrade schema versions
- [ ] Database survives browser refresh/restart
- [ ] Memory usage stays reasonable with large datasets

### Risks & Mitigations

- **Risk:** SQLite-WASM performance in browser
  - **Mitigation:** Use Web Workers, batch operations, proper indexing
- **Risk:** OPFS browser compatibility
  - **Mitigation:** Implement IndexedDB fallback, feature detection
- **Risk:** Memory limits with large CSV files
  - **Mitigation:** Streaming inserts, periodic cleanup, chunked processing

### Demo Script

```typescript
// Initialize database
const db = await initSQLite();
// Create schema
await db.migrate();
// Test insert
await db.insertTrade({ ...tradeData });
// Test query
const trades = await db.getTradesByUnderlying('AAPL');
// Test persistence
await db.persist();
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Choose SQLite-WASM library and implement basic initialization

---

## Phase 2: CSV Import & Normalization 📊

### Goals

- Build drag-and-drop CSV import interface
- Parse Robinhood CSV formats with Papa Parse streaming
- Normalize data into unified schema
- Handle errors and validation gracefully

### Inputs

- SQLite database from Phase 1
- Robinhood CSV export formats
- Sample CSV files for testing

### Outputs

- CSV import UI component
- Robinhood format mapping logic
- Data validation and error handling
- Normalized trade records in database

### Tasks Checklist

- [ ] Create `/src/components/UploadDropzone.tsx` with drag-and-drop
- [ ] Implement `/src/modules/csv/parse.ts` with Papa Parse streaming
- [ ] Create `/src/modules/robinhood/mapping.ts` for field mapping
- [ ] Define `/src/modules/robinhood/types.ts` for CSV row interfaces
- [ ] Build data validation (dates, numbers, required fields)
- [ ] Create normalization pipeline to unified schema
- [ ] Implement error quarantine table for bad rows
- [ ] Add progress indicators for large file processing
- [ ] Create preview mode before final import
- [ ] Build import history and duplicate detection
- [ ] Add CSV format auto-detection

### Dependencies

- Phase 1 (SQLite database) must be complete
- Sample Robinhood CSV files needed

### Acceptance Tests

- [ ] Can drag-and-drop CSV files onto import zone
- [ ] Large CSV files (10k+ rows) parse without blocking UI
- [ ] Invalid rows are quarantined with clear error messages
- [ ] Normalized data matches expected schema
- [ ] Progress indicator shows during long imports
- [ ] Duplicate imports are detected and handled
- [ ] Can preview data before committing import
- [ ] Memory usage stays bounded during large imports

### Risks & Mitigations

- **Risk:** Browser memory limits with large CSVs
  - **Mitigation:** Streaming parse, batch processing, Web Workers
- **Risk:** Robinhood format changes breaking imports
  - **Mitigation:** Flexible mapping system, format detection, error recovery
- **Risk:** UI blocking during large file processing
  - **Mitigation:** Web Workers for parsing, progress indicators

### Demo Script

```typescript
// Upload CSV file via drag-and-drop
// Show parsing progress
// Display preview with field mapping
// Show validation errors for bad rows
// Confirm import and show success metrics
const result = await importCSV(file);
console.log(`Imported ${result.success} trades, quarantined ${result.errors} rows`);
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Create upload dropzone component and basic CSV parsing

---

## Phase 3: Core Calculations 🧮

### Goals

- Implement options strategy calculations (Covered Calls, CSPs, Long Calls)
- Build P&L analysis with scenarios and Greeks approximations
- Create payoff charts and what-if tables
- Add risk flagging system

### Inputs

- Normalized trade data from Phase 2
- Options pricing models and formulas
- Risk management thresholds

### Outputs

- Strategy calculation modules
- Payoff chart components
- What-if analysis tables
- Risk alert system
- Performance metrics (ROO, ROR, etc.)

### Tasks Checklist

- [ ] Create `/src/modules/calc/common.ts` with shared utilities
- [ ] Implement `/src/modules/calc/coveredCall.ts` calculations
- [ ] Implement `/src/modules/calc/cashSecuredPut.ts` calculations
- [ ] Implement `/src/modules/calc/longCall.ts` calculations
- [ ] Build P&L scenarios (-20%, -10%, 0%, +10%, +20%)
- [ ] Create `/src/components/PayoffChart.tsx` with Recharts
- [ ] Build `/src/components/WhatIfTable.tsx` for scenario analysis
- [ ] Implement Greeks approximations (delta, theta, gamma)
- [ ] Create `/src/components/RiskFlags.tsx` for alerts
- [ ] Add annualized return calculations (ROO, ROR)
- [ ] Implement assignment vs hold P&L analysis
- [ ] Create breakeven calculations for each strategy

### Dependencies

- Phase 2 (CSV import) must provide trade data
- Price data (can use mock data initially)

### Acceptance Tests

- [ ] Covered call calculations match manual verification
- [ ] CSP calculations handle assignment scenarios correctly
- [ ] Payoff charts render accurately for all strategies
- [ ] What-if tables show correct P&L for price scenarios
- [ ] Risk flags trigger at appropriate thresholds
- [ ] ROO/ROR calculations are annualized correctly
- [ ] Greeks approximations are reasonable vs actual values
- [ ] Performance stays smooth with 100+ positions

### Risks & Mitigations

- **Risk:** Complex options math errors
  - **Mitigation:** Unit tests, manual verification, reference implementations
- **Risk:** Performance with many calculations
  - **Mitigation:** Memoization, Web Workers for heavy compute
- **Risk:** Greeks accuracy without real-time data
  - **Mitigation:** Document limitations, use approximations, allow manual overrides

### Demo Script

```typescript
// Load sample covered call position
const cc = new CoveredCall({ strike: 100, premium: 2.5, sharePrice: 98 });
// Calculate metrics
console.log(`Breakeven: $${cc.breakeven()}`);
console.log(`Max profit: $${cc.maxProfit()}`);
console.log(`ROO: ${cc.returnOnOutlay()}%`);
// Generate payoff chart
const chartData = cc.payoffChart(-20, 20);
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Implement basic covered call calculation module

---

## Phase 4: Wheel Ledger 🎡

### Goals

- Track complete wheel strategy lifecycles
- Chain CSP assignments → CC sales → outcomes
- Calculate cumulative metrics and basis adjustments
- Visualize wheel progression timeline

### Inputs

- Normalized trades from Phase 2
- Calculation modules from Phase 3
- Wheel strategy business rules

### Outputs

- Wheel lifecycle tracking system
- Timeline visualization component
- Cumulative P&L and metrics
- Wheel-specific database tables

### Tasks Checklist

- [ ] Design wheel lifecycle state machine
- [ ] Create `/src/modules/wheel/lifecycle.ts` for chain logic
- [ ] Implement lifecycle ID generation (underlying + timestamp + index)
- [ ] Build CSP → assignment → CC → outcome linking
- [ ] Create `/src/components/LifecycleTimeline.tsx` visualization
- [ ] Calculate cumulative net credit and basis adjustments
- [ ] Track realized vs unrealized P&L per wheel cycle
- [ ] Implement ROO/ROR calculations per leg and cumulative
- [ ] Add wheel performance analytics and filtering
- [ ] Create wheel-specific database queries
- [ ] Handle incomplete cycles and orphaned positions

### Dependencies

- Phase 2 (trade data) and Phase 3 (calculations) must be complete
- Database schema for wheel table

### Acceptance Tests

- [ ] Can identify and link related wheel trades
- [ ] Lifecycle states progress correctly (CSP → assign → CC → close)
- [ ] Cumulative metrics calculate accurately across legs
- [ ] Timeline shows clear progression of wheel stages
- [ ] Handles edge cases (early assignment, rolling, etc.)
- [ ] Performance analytics match manual calculations
- [ ] Can filter and sort wheel cycles by various metrics
- [ ] Database queries return correct wheel data

### Risks & Mitigations

- **Risk:** Complex state transitions and edge cases
  - **Mitigation:** Clear state machine design, comprehensive testing
- **Risk:** Linking trades across different CSV imports
  - **Mitigation:** Robust matching logic, manual override capability
- **Risk:** Performance with many wheel cycles
  - **Mitigation:** Efficient queries, pagination, lazy loading

### Demo Script

```typescript
// Import trades containing wheel sequences
// Auto-detect and link wheel cycles
const wheels = await getWheelCycles('AAPL');
// Show lifecycle progression
wheels.forEach(wheel => {
  console.log(`Cycle ${wheel.id}: ${wheel.netCredit} net credit, ${wheel.status}`);
});
// Display timeline visualization
```

### Status: ✅ COMPLETED

**Files Created:**

- `/src/modules/wheel/lifecycle.ts`
- `/src/modules/wheel/engine.ts`
- `/src/components/LifecycleTimeline.tsx`
- `/src/pages/Wheel.tsx`

**Next Step:** Move to Phase 5 (Tax Lots) or continue with Wheel Analytics

---

## Phase 5: Tax Lots & Wash Sales 📋

### Goals

- Implement tax lot accounting (FIFO, HIFO, LIFO)
- Handle complex options tax rules and basis adjustments
- Detect and process wash sales with ±30 day windows
- Generate Schedule-D style tax reporting

### Inputs

- Trade data with proper classification
- Tax lot accounting rules and regulations
- Wash sale detection algorithms

### Outputs

- Tax lot management system
- Wash sale detection and adjustment
- Schedule-D export functionality
- Tax optimization suggestions

### Tasks Checklist

- [ ] Create `/src/modules/tax/lots.ts` with lot accounting methods
- [ ] Implement FIFO, HIFO, LIFO lot selection algorithms
- [ ] Build `/src/modules/tax/washSales.ts` detection engine
- [ ] Handle options-specific tax rules:
  - [ ] CC assignment → share sale at strike + premium
  - [ ] CC expiration → premium as short-term gain
  - [ ] CSP assignment → basis = strike - net premium + fees
  - [ ] Long call exercise → basis = strike + premium + fees
- [ ] Create `/src/modules/tax/scheduleD.ts` export functionality
- [ ] Implement ±30 day wash sale window detection
- [ ] Build basis adjustment for replacement lots
- [ ] Add holding period calculations (ST vs LT)
- [ ] Create year-end tax summary reports
- [ ] Handle carryforward wash sale adjustments
- [ ] Add lot method selection UI

### Dependencies

- Phase 2 (trade data) must be complete
- Database schema for lots and lot_events tables

### Acceptance Tests

- [ ] FIFO lot selection matches IRS requirements
- [ ] Wash sales detected accurately within ±30 days
- [ ] Options tax rules calculate correct basis adjustments
- [ ] Schedule-D export matches tax software format
- [ ] Holding periods distinguish short-term vs long-term
- [ ] Carryforward wash adjustments persist correctly
- [ ] Can switch between lot methods and recalculate
- [ ] Tax calculations match manual verification

### Risks & Mitigations

- **Risk:** Complex tax rules and edge cases
  - **Mitigation:** Reference IRS publications, professional review, disclaimers
- **Risk:** Wash sale detection accuracy
  - **Mitigation:** Conservative approach, manual override capability
- **Risk:** Performance with large transaction history
  - **Mitigation:** Efficient algorithms, periodic cleanup, indexed queries

### Demo Script

```typescript
// Set lot method to FIFO
await setLotMethod('FIFO');
// Process wash sales for tax year
const washSales = await detectWashSales(2024);
// Generate Schedule-D
const scheduleD = await generateScheduleD(2024);
console.log(`Found ${washSales.length} wash sales, ${scheduleD.shortTerm.length} ST gains/losses`);
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Implement basic lot accounting with FIFO method

---

## Phase 6: Tax-Harvest Helper 🌾

### Goals

- Identify tax-loss harvesting opportunities
- Rank losses by tax benefit potential
- Warn about wash sale conflicts
- Provide actionable recommendations

### Inputs

- Tax lots with unrealized P&L
- Current positions and recent trades
- User's tax rate and preferences

### Outputs

- Tax-loss harvesting opportunity finder
- Ranked recommendation list
- Wash sale conflict warnings
- Tax benefit calculations

### Tasks Checklist

- [ ] Create `/src/modules/harvest/harvestFinder.ts` engine
- [ ] Query lots with unrealized losses outside wash windows
- [ ] Rank opportunities by loss amount × tax rate
- [ ] Check for wash sale conflicts with recent/planned trades
- [ ] Calculate potential tax savings per opportunity
- [ ] Add filtering by holding period (ST vs LT preference)
- [ ] Create recommendation UI with action buttons
- [ ] Implement "what-if" scenarios for harvest decisions
- [ ] Add calendar integration for timing optimization
- [ ] Handle paired trades and complex positions
- [ ] Generate harvest execution checklists

### Dependencies

- Phase 5 (tax lots) must be complete
- Current price data for unrealized P&L calculations

### Acceptance Tests

- [ ] Identifies genuine harvest opportunities accurately
- [ ] Excludes positions with wash sale conflicts
- [ ] Rankings reflect actual tax benefit potential
- [ ] Warnings prevent accidental wash sales
- [ ] Tax savings calculations are reasonable
- [ ] UI makes recommendations actionable
- [ ] Performance good with large portfolios
- [ ] Handles complex multi-leg positions

### Risks & Mitigations

- **Risk:** Incorrect wash sale conflict detection
  - **Mitigation:** Conservative approach, clear warnings, manual review
- **Risk:** Tax advice liability
  - **Mitigation:** Clear disclaimers, "educational only" positioning
- **Risk:** Market timing and execution complexity
  - **Mitigation:** Focus on identification, not execution automation

### Demo Script

```typescript
// Find harvest opportunities
const opportunities = await findHarvestOpportunities({
  minLoss: 500,
  preferLongTerm: true,
  taxRate: 0.24,
});
// Show ranked list
opportunities.forEach(opp => {
  console.log(`${opp.symbol}: $${opp.loss} loss, $${opp.taxSavings} savings`);
});
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Build basic loss identification query system

---

## Phase 7: Price Adapters 💰

### Goals

- Provide flexible price data sources
- Support manual entry, CSV upload, and HTTP fetching
- Cache prices efficiently with staleness warnings
- Handle CORS limitations gracefully

### Inputs

- Price data requirements from calculations
- Various price data sources and formats
- Caching and performance requirements

### Outputs

- Unified price adapter interface
- Manual price entry system
- CSV bulk price import
- HTTP fetcher with CORS handling
- Price caching and staleness detection

### Tasks Checklist

- [ ] Create `/src/modules/price/adapters.ts` interface
- [ ] Implement `getPrice(ticker, date?) → Promise<number|null>`
- [ ] Build `/src/modules/price/manualTable.ts` for manual entry
- [ ] Create `/src/modules/price/httpFetcher.ts` with CORS handling
- [ ] Add CSV bulk import for historical prices
- [ ] Implement price caching in SQLite prices table
- [ ] Add staleness warnings and refresh indicators
- [ ] Create fallback chain (manual → cached → HTTP)
- [ ] Build price data management UI
- [ ] Handle market hours and holiday logic
- [ ] Add price data export/import for backup

### Dependencies

- Phase 1 (SQLite database) for price storage
- HTTP fetching capabilities (with CORS limitations)

### Acceptance Tests

- [ ] Manual price entry persists correctly
- [ ] CSV bulk import handles large price datasets
- [ ] HTTP fetching works with public APIs (when CORS allows)
- [ ] Price cache reduces redundant API calls
- [ ] Staleness warnings appear for old data
- [ ] Fallback chain provides best available price
- [ ] Performance good with frequent price lookups
- [ ] UI makes price management intuitive

### Risks & Mitigations

- **Risk:** CORS limitations blocking HTTP price fetching
  - **Mitigation:** Document limitations, provide CSV alternatives, manual entry
- **Risk:** Price data accuracy and reliability
  - **Mitigation:** Multiple sources, manual verification, staleness warnings
- **Risk:** Rate limiting from price APIs
  - **Mitigation:** Caching, batch requests, user-controlled fetching

### Demo Script

```typescript
// Add manual price
await setPrice('AAPL', '2024-10-19', 225.5);
// Bulk import from CSV
await importPricesFromCSV(priceFile);
// Get current price with fallback
const price = await getPrice('AAPL'); // Uses cache, then HTTP, then manual
console.log(`AAPL: $${price} (${price.source}, ${price.age} hours old)`);
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Design price adapter interface and implement manual entry

---

## Phase 8: UI/UX 🎨

### Goals

- Create responsive, accessible user interface
- Implement dark mode and proper ARIA support
- Build efficient data tables with virtualization
- Design intuitive navigation and workflows

### Inputs

- All functional modules from previous phases
- UI/UX best practices and accessibility standards
- Performance requirements for large datasets

### Outputs

- Complete page components (Dashboard, Import, etc.)
- Responsive design system
- Accessibility compliance
- Dark mode support
- Virtualized data tables

### Tasks Checklist

- [ ] Create `/src/pages/Dashboard.tsx` with overview metrics
- [ ] Build `/src/pages/Import.tsx` with CSV upload flow
- [ ] Implement `/src/pages/Wheel.tsx` for lifecycle tracking
- [ ] Create `/src/pages/Lots.tsx` for tax lot management
- [ ] Build `/src/pages/Harvest.tsx` for tax-loss harvesting
- [ ] Implement `/src/pages/Settings.tsx` for configuration
- [ ] Create `/src/components/DataTable.tsx` with virtualization
- [ ] Build `/src/components/MetricCards.tsx` for key metrics
- [ ] Add responsive breakpoints and mobile support
- [ ] Implement dark/light mode toggle with persistence
- [ ] Add ARIA labels and keyboard navigation
- [ ] Create loading states and error boundaries
- [ ] Build toast notification system
- [ ] Add progress indicators for long operations

### Dependencies

- All functional phases (1-7) must be substantially complete
- Design system and component library choices

### Acceptance Tests

- [ ] All pages render correctly on desktop and mobile
- [ ] Dark mode works without visual artifacts
- [ ] Screen readers can navigate effectively
- [ ] Data tables perform well with 10k+ rows
- [ ] Keyboard navigation works for all interactions
- [ ] Loading states provide clear feedback
- [ ] Error messages are helpful and actionable
- [ ] Mobile experience is fully functional

### Risks & Mitigations

- **Risk:** Poor performance with large datasets
  - **Mitigation:** Virtual scrolling, pagination, lazy loading
- **Risk:** Accessibility compliance gaps
  - **Mitigation:** ARIA testing, screen reader verification, accessibility audit
- **Risk:** Mobile usability issues
  - **Mitigation:** Mobile-first design, touch-friendly interactions

### Demo Script

```typescript
// Navigate through all pages
// Test responsive behavior
// Toggle dark/light mode
// Test large data table performance
// Verify keyboard navigation
// Check mobile layout on various screen sizes
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Create basic page structure and routing

---

## Phase 9: Storage & Export 💾

### Goals

- Implement data backup and restore functionality
- Provide portable export formats
- Enable demo data reset capability
- Separate domain data from user preferences

### Inputs

- SQLite database with all user data
- User preferences and settings
- Export format requirements

### Outputs

- Database backup/restore system
- JSON export/import functionality
- Demo data management
- Data portability features

### Tasks Checklist

- [ ] Create `/src/modules/storage/idb.ts` for preferences
- [ ] Implement database backup to downloadable file
- [ ] Build database restore from uploaded file
- [ ] Create JSON export for all user data
- [ ] Implement JSON import with merge/replace options
- [ ] Add "Reset to demo data" functionality
- [ ] Build settings backup/restore separately from data
- [ ] Create export scheduling and automation
- [ ] Add data integrity verification
- [ ] Implement selective export (date ranges, symbols)
- [ ] Build import/export progress indicators

### Dependencies

- Phase 1 (SQLite database) must be complete
- All data modules for complete export coverage

### Acceptance Tests

- [ ] Database backup creates valid SQLite file
- [ ] Restore recovers all data without corruption
- [ ] JSON export includes all user data
- [ ] JSON import handles conflicts gracefully
- [ ] Demo reset provides clean starting state
- [ ] Settings backup preserves user preferences
- [ ] Large exports complete without errors
- [ ] Data integrity checks pass after import/export

### Risks & Mitigations

- **Risk:** Data corruption during export/import
  - **Mitigation:** Integrity checks, backup verification, atomic operations
- **Risk:** Large file size limits in browser
  - **Mitigation:** Compression, streaming exports, chunked processing
- **Risk:** Version compatibility between exports
  - **Mitigation:** Version tagging, migration support, format documentation

### Demo Script

```typescript
// Export all data
const backup = await exportDatabase();
// Reset to demo state
await resetToDemoData();
// Import previous backup
await importDatabase(backup);
// Verify data integrity
const isValid = await verifyDataIntegrity();
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Implement basic database backup functionality

---

## Phase 10: Testing & Fixtures 🧪

### Goals

- Comprehensive unit tests for calculation modules
- Integration tests for database operations
- Sample data fixtures for development and testing
- Performance benchmarks for large datasets

### Inputs

- All implemented modules from previous phases
- Testing framework setup (Vitest)
- Sample Robinhood CSV data

### Outputs

- Complete test suite with good coverage
- Sample data fixtures and generators
- Performance benchmarks
- Continuous testing setup

### Tasks Checklist

- [ ] Set up Vitest testing framework
- [ ] Create in-memory SQLite for testing
- [ ] Build unit tests for `/src/modules/calc/*` modules
- [ ] Test database operations and migrations
- [ ] Create sample CSV fixtures matching Robinhood formats
- [ ] Build test data generators for edge cases
- [ ] Test CSV import pipeline with various formats
- [ ] Benchmark performance with large datasets
- [ ] Test tax calculations against known scenarios
- [ ] Verify wheel lifecycle detection accuracy
- [ ] Test price adapter fallback chains
- [ ] Add integration tests for complete workflows

### Dependencies

- All functional phases should be complete for thorough testing
- Testing framework and sample data setup

### Acceptance Tests

- [ ] All calculation modules have >90% test coverage
- [ ] Database tests run reliably in isolation
- [ ] Sample fixtures cover common and edge cases
- [ ] Performance tests identify bottlenecks
- [ ] Tax calculations match reference implementations
- [ ] Integration tests catch regressions
- [ ] Tests run quickly in development workflow
- [ ] CI/CD pipeline runs tests automatically

### Risks & Mitigations

- **Risk:** Test complexity matching business logic complexity
  - **Mitigation:** Focus on critical paths, use property-based testing
- **Risk:** Maintaining test data as features evolve
  - **Mitigation:** Data generators, automated fixture updates
- **Risk:** Performance test reliability
  - **Mitigation:** Consistent test environment, statistical analysis

### Demo Script

```bash
# Run full test suite
yarn test
# Run specific module tests
yarn test calc
# Run performance benchmarks
yarn test:perf
# Check test coverage
yarn test:coverage
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Set up Vitest and create first calculation module tests

---

## Phase 11: Documentation & PWA 📚

### Goals

- Comprehensive documentation for users and developers
- Optional PWA installation capability
- Performance optimization and final polish
- Production readiness checklist

### Inputs

- Complete application from all previous phases
- User feedback and testing results
- PWA requirements and best practices

### Outputs

- Complete README with quickstart guide
- Technical documentation and API reference
- PWA manifest and service worker
- Production build optimization

### Tasks Checklist

- [ ] Write comprehensive README.md
- [ ] Document database schema and migrations
- [ ] Create user guide for each major feature
- [ ] Document data flow and architecture
- [ ] Add troubleshooting and FAQ section
- [ ] Create PWA manifest.json
- [ ] Implement service worker for offline functionality
- [ ] Add app icons and splash screens
- [ ] Optimize bundle size and loading performance
- [ ] Add error tracking and analytics (privacy-respecting)
- [ ] Create deployment guide for various platforms
- [ ] Document backup and recovery procedures

### Dependencies

- All functional phases must be complete
- User testing feedback incorporated

### Acceptance Tests

- [ ] README provides clear quickstart instructions
- [ ] Documentation covers all major features
- [ ] PWA installs correctly on supported browsers
- [ ] Offline functionality works as expected
- [ ] Bundle size is optimized for fast loading
- [ ] Error handling provides helpful feedback
- [ ] App works reliably across different browsers
- [ ] Performance meets acceptable standards

### Risks & Mitigations

- **Risk:** Documentation becoming outdated
  - **Mitigation:** Automated documentation generation, review process
- **Risk:** PWA compatibility issues
  - **Mitigation:** Progressive enhancement, fallback for unsupported browsers
- **Risk:** Performance regressions in production
  - **Mitigation:** Performance monitoring, optimization checklist

### Demo Script

```bash
# Build for production
yarn build
# Test PWA installation
# Verify offline functionality
# Check performance metrics
# Test on different browsers and devices
```

### Status: ⏳ Not Started

**Files Created:** _None yet_
**Next Step:** Create comprehensive README and user documentation

---

## Configuration Decisions Needed ⚙️

### SQLite-WASM Library Choice

**Options:** sql.js vs wa-sqlite

- **Recommendation:** sql.js (more mature, better TypeScript support)
- **Rationale:** Easier setup, better documentation, sufficient performance for use case

### Default Lot Method

**Options:** FIFO, HIFO, LIFO

- **Recommendation:** FIFO (most common, IRS default)
- **Rationale:** Simplest to understand, matches most brokers, can be changed later

### Risk Thresholds

- **ROO/ROR minimum:** 15% annualized
- **Max position size:** 5% of account value
- **Rationale:** Conservative defaults, user-configurable

### PWA Installation

- **Recommendation:** Yes, enable PWA
- **Rationale:** Better user experience, offline capability, minimal overhead

### Price Adapters (v1)

- **Recommendation:** Manual + CSV upload only
- **Rationale:** Avoids CORS complexity, keeps initial scope manageable
- **Future:** Add HTTP fetcher in v2 with proper CORS documentation

### Sample Tickers

- **Recommendation:** AAPL, SPY, TSLA, QQQ
- **Rationale:** High-volume, commonly traded options with good liquidity

---

## Success Metrics 📊

### Technical Metrics

- [ ] Handles 10k+ trade records without performance degradation
- [ ] SQLite database operations complete in <100ms for typical queries
- [ ] CSV import processes 1k rows in <5 seconds
- [ ] Bundle size <2MB compressed
- [ ] Works offline after initial load

### Functional Metrics

- [ ] Accurately calculates options P&L vs manual verification
- [ ] Tax lot accounting matches professional tax software
- [ ] Wheel lifecycle detection >95% accuracy
- [ ] Wash sale detection identifies all regulatory violations
- [ ] Risk flags catch positions requiring attention

### User Experience Metrics

- [ ] <3 clicks to import and view basic metrics
- [ ] Mobile interface fully functional
- [ ] Dark mode seamless switching
- [ ] Error recovery graceful and informative
- [ ] Data backup/restore works reliably

---

## Current Status Summary

**Overall Progress:** ~75% Complete (Major Features Implemented)  
**Last Updated:** October 25, 2025

### ✅ **Completed Phases:**

- **✅ Phase 0**: Project Setup & Foundation
  - Vite + React + TypeScript project initialized
  - SQLite-WASM integration with sql.js-httpvfs
  - Complete folder structure and dependencies
- **✅ Phase 1**: Database & Schema
  - Complete normalized schema with migrations
  - Type-safe database operations with validation
  - Portfolio, trades, positions, tax lots, and wheel tables

- **✅ Phase 3**: Core Calculations
  - Comprehensive options calculations engine
  - Covered calls, cash-secured puts, long calls
  - P&L calculations, Greeks, and risk metrics

- **✅ Phase 4**: Wheel Strategy System
  - Complete lifecycle state machine (CSP → CC → Close)
  - Automated cycle detection and trade linking
  - Interactive timeline visualization component
  - Full management interface with analytics dashboard

- **✅ Phase 5**: Tax Lot Management
  - FIFO/HIFO/LIFO/LOFO lot allocation methods
  - Automated wash sale detection and adjustment
  - Tax-loss harvesting recommendations
  - Comprehensive tax management dashboard

### 🚧 **In Progress:**

- **🔄 Phase 7**: Price Data Integration (70% complete)
  - Multi-source price adapter framework
  - Historical price tracking and storage
  - Manual price entry system
  - _Remaining:_ Real-time data feeds integration

### 📋 **Next Phases:**

- **Phase 6**: Options Chain Integration
- **Phase 8**: Portfolio Risk Analytics
- **Phase 9**: Advanced UI/UX Polish
- **Phase 10**: Testing & Quality Assurance
- **Phase 11**: Documentation & PWA

**Key Achievements:**

- 🎡 **Complete Wheel Strategy Tracking**: End-to-end lifecycle management
- 📊 **Advanced Analytics**: ROO/ROR calculations, performance metrics
- 💰 **Tax Optimization**: Sophisticated lot management with wash sale detection
- 🎨 **Production-Ready UI**: Professional interface with responsive design
- 🧪 **Test Coverage**: Comprehensive test suites for all major modules

**Architecture Decisions Made:**

- ✅ SQLite-WASM: sql.js-httpvfs for browser-based database
- ✅ Styling: Tailwind CSS with custom component system
- ✅ State Management: React Context + local state (no external library needed)
- ✅ Icons: Lucide React for consistent iconography
- ✅ Testing: Vitest + React Testing Library + Playwright

---

_This plan will be updated as phases complete. Each phase should link to implemented files and mark completion status._
