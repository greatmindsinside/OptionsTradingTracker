# Changelog

All notable changes to the Options Trading Tracker project.

---

## [Unreleased]

### November 4, 2025 - Trade DTE Enhancement

**Added**

- Trade drawer date picker UI (feature-flagged with `VITE_FEATURE_TRADE_DTE`)
- DTE chip showing calculated days to expiration
- "Advanced" toggle for direct numeric DTE input
- Past-date warning with confirmation dialog
- Shared DTE utility in `src/utils/dates.ts` (`calcDTE`, `dateFromDTE`)
- Telemetry events: `trade_dte_toggle_advanced`, `trade_dte_date_change`, `trade_add_success`, `trade_add_error`, `trade_dte_past_date_warn`
- Unit tests for dates utility (`tests/unit/dates.test.ts`)
- Component tests for Trade UI (`tests/unit/trade-tab-dte.test.tsx`)
- Comprehensive feature documentation in `docs/FEATURES.md`

**Changed**

- Wheel DTE calculation refactored to use shared `calcDTE()` utility
- TradeTab expiration persistence now uses selected date when feature enabled
- Feature flag system extended in `src/utils/env.ts`
- Documentation consolidated into professional set (FEATURES.md, DEVELOPMENT.md)

**Files**

- `src/utils/dates.ts` (new)
- `src/utils/env.ts` (extended with tradeDTE flag)
- `src/utils/telemetry.ts` (new trade events)
- `src/hooks/useWheelDatabase.ts` (uses shared DTE utility)
- `src/pages/wheel/components/drawers/TradeTab.tsx` (enhanced UI)
- `tests/unit/dates.test.ts` (new)
- `tests/unit/trade-tab-dte.test.tsx` (new)
- `tests/e2e/smoke.spec.ts` (fixed test assertion)
- `docs/FEATURES.md` (new consolidated doc)
- `docs/DEVELOPMENT.md` (new consolidated doc)
- `docs/DATA_ARCHITECTURE.md` (updated)
- `docs/PROJECT_ORGANIZATION.md` (updated)

---

## November 3, 2025 - Project Cleanup & CSS Consolidation

### Cleanup Phase 1-7: Code Removal

**Removed**

- 6 deprecated pages: HomePage, PortfolioPage, VisualizationPage, AnalysisPage, TaxPage, ImportPage (+ CSS Modules)
- 15+ orphaned components:
  - Dashboard: OptionsCalculator, PortfolioSummary, PositionTracker, RiskDashboard, TaxLotDashboard, WheelAnalyticsDashboard
  - Charts: PnLChart, PortfolioChart, GreeksChart, ChartContainer
  - Demo: Phase4Demo, WheelTimelineDemo, LifecycleTimeline
  - Other: NewsCard
- 9+ CSS Modules for deleted components
- 2 orphaned style files: `accessibility.css`, `themes.css`
- Unused dependencies from deleted components

**Results**

- CSS bundle: 121.72 kB → 89.89 kB (-31.83 kB, -26.1% reduction)
- Gzipped: 20.43 kB → 15.09 kB (-5.34 kB)
- All builds passing
- TypeScript compilation clean
- No broken imports or references

### CSS Architecture Implementation

**Added**

- Global modal patterns in `@layer components`:
  - `.modal-overlay`, `.modal`, `.modal-header`, `.modal-title`, `.modal-content`, `.modal-close`
- Global table patterns in `@layer components`:
  - `.table-container`, `.table`, `thead`, `th`, `td`, `tr:hover`
- High-contrast mode support: `@media (prefers-contrast: high)`
- Consolidated all CSS into `src/index.css` (single source of truth)

**Migrated**

- Modal component to use global patterns
- JournalPage tables (2 instances) to global patterns
- PortfolioPage tables (2 instances) to global patterns
- ~80 lines of repetitive inline Tailwind classes removed

**Documentation**

- Created `docs/complete/PROJECT_CLEANUP_TRACKER.md` (archived)
- Created `docs/CLEANUP_COMPLETION_REPORT.md` (summary)
- Created `docs/reports/MODAL_TABLE_PATTERN_MIGRATION.md`
- Updated README.md with current project structure

---

## November 3, 2025 - Journal Edit Feature

**Added**

- Journal edit drawer with slide-in panel (feature-flagged)
- Full-field editing for all Journal entry fields
- Soft-delete pattern with audit trail (`deleted_at`, `edit_reason`)
- Auto-calculation for `assignment_shares` and `share_sale` types (Amount = Strike × Shares)
- Telemetry tracking: `journal_edit_open`, `journal_edit_close`, `journal_edit_save`, `journal_edit_error`
- Feature flags:
  - `VITE_FEATURE_JOURNAL_EDIT_DRAWER` - Enables edit drawer
  - `VITE_FEATURE_JOURNAL_EDIT_FLOW` - Enables advanced edit features
- Accessibility: ARIA dialog, keyboard navigation, focus management
- Documentation in `docs/JOURNAL_EDIT_FEATURE.md`

**Components**

- `src/pages/journal/components/drawers/JournalDrawer.tsx` (new)
- `src/stores/useJournalUIStore.ts` (new - drawer state)
- `src/stores/useEntriesStore.ts` (extended with editEntry method)

**UX**

- Entry point: Edit icon in Journal table Actions column
- Right-side slide drawer (max-width 24-28rem)
- Overlay with backdrop blur and 60% black background
- Focus trap with Escape key and overlay click to close
- Cancel and Save buttons (Save disabled while saving)
- Required "Edit Reason" field for audit trail

---

## October 2025 - Core Platform Launch

### Initial Release

**Features**

- Wheel strategy dashboard (`/`)
  - Position tracking (puts, covered calls)
  - Share lots management
  - Premium metrics and alerts
  - DTE tracking
  - Wheel phase indicators
- Journal transaction history (`/journal`)
  - Complete trade log
  - Advanced filtering (symbol, type, status, date)
  - Totals calculation
  - Soft-delete support
- Manual trade entry (Trade drawer)
  - Symbol, type, side, quantity
  - Strike, premium, DTE, fees
  - Template-based persistence
- CSV import system
  - Multi-broker support (Robinhood, TD Ameritrade, Schwab, E\*TRADE, Interactive Brokers)
  - Auto-detection and normalization
  - Batch processing with progress

**Technology Stack**

- React 19.1.1
- TypeScript 5.9.3
- Vite 7.1.7
- Tailwind CSS 4.1.16
- Zustand 5.0.8 (state management)
- sql.js 1.13.0 (SQLite in browser)
- Playwright 1.56.1 (E2E tests)
- Vitest 3.2.4 (unit tests)

**Database**

- Journal-first architecture (single source of truth)
- SQLite with OPFS persistence
- Audit columns: `deleted_at`, `edit_reason`, `edited_by`, `original_entry_id`
- Indexes for performance

**Testing**

- E2E test suite with Playwright
- Unit tests with Vitest + Testing Library
- Accessibility tests with Axe
- 95%+ code coverage

**Build & Deploy**

- Optimized production builds
- Code splitting and lazy loading
- Service worker for offline support
- PWA manifest

---

## Legend

- **Added** - New features or files
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features or files
- **Fixed** - Bug fixes
- **Security** - Security improvements
