# Features & Capabilities

**Last Updated:** November 4, 2025

This document describes the major features and capabilities of the Options Trading Tracker application.

---

## Table of Contents

- [Core Features](#core-features)
- [Feature Flags](#feature-flags)
- [Journal Edit Flow](#journal-edit-flow)
- [Trade DTE Enhancement](#trade-dte-enhancement)

---

## Core Features

### 1. Wheel Strategy Dashboard

The Wheel page (`/`) provides a real-time dashboard for tracking the wheel options strategy:

**Capabilities:**

- **Position tracking** - Live view of open puts and covered calls
- **Share lots** - Track assignment and covered stock positions
- **Premium metrics** - This week's premium, capital at risk, shares available
- **Wheel phase** - Visual indicator of where each symbol is in the wheel cycle
- **DTE tracking** - Days to expiration calculated dynamically
- **Alerts** - Automated alerts for expirations and earnings

**Data Flow:**

- Reads from `journal` table via `useWheelDatabase()` hook
- Transforms journal entries into current positions
- Uses shared DTE calculation utility (`src/utils/dates.ts`)

### 2. Journal Transaction History

The Journal page (`/journal`) provides complete transaction history and financial tracking:

**Capabilities:**

- **Transaction log** - Complete history of all trades and transactions
- **Advanced filtering** - Filter by symbol, type, status, date range
- **Totals calculation** - Automatic sum of premiums, fees, net P&L
- **Soft-delete support** - Maintains audit trail with deleted entries view
- **Edit functionality** - Full-field editing with audit trail (feature-flagged)

**Transaction Types:**

- `sell_to_open` - Opening option positions (short)
- `buy_to_close` - Closing option positions
- `expiration` - Options expired worthless
- `assignment_shares` - Put assignments (bought shares)
- `share_sale` - Call assignments (shares called away)
- `dividend` - Dividend payments
- `fee` - Trading fees and commissions
- `transfer` - Cash/security transfers
- `correction` - Manual adjustment entries

### 3. Manual Trade Entry

The Trade drawer (accessible from Wheel page) enables quick manual trade entry:

**Capabilities:**

- **Trade composition** - Symbol, type (Put/Call), side (Sell/Buy)
- **Contract details** - Quantity, strike, premium per share
- **Expiration entry** - DTE or date picker (feature-flagged)
- **Fee tracking** - Optional fee entry with broker guidance
- **Template-based persistence** - Writes to journal via templates
- **Auto-refresh** - Updates both Wheel and Journal pages

### 4. CSV Import

**Capabilities:**

- **Multi-broker support** - Robinhood, TD Ameritrade, Schwab, E\*TRADE, Interactive Brokers
- **Auto-detection** - Automatic broker format detection
- **Normalization** - Standardizes diverse CSV formats to common schema
- **Batch processing** - Handles large files with progress tracking
- **Error handling** - Continues on errors, provides detailed feedback

**Current Implementation:**

- Writes normalized trades via DAO to database
- Future: Template-based journal writes for full integration

---

## Feature Flags

Feature flags enable progressive rollout and A/B testing. Configured via environment variables in `.env.local` or `.env.production`.

### Available Flags

#### `VITE_FEATURE_JOURNAL_EDIT_DRAWER`

**Default:** `false`  
**Purpose:** Enables slide-in edit drawer for Journal entries

When enabled:

- Edit icon appears in Journal table Actions column
- Opens slide-in drawer with full-field editing
- Soft-deletes original and creates corrected entry
- Maintains audit trail with edit reason

#### `VITE_FEATURE_JOURNAL_EDIT_FLOW`

**Default:** `false`  
**Purpose:** Enables advanced edit flow features

When enabled with `JOURNAL_EDIT_DRAWER`:

- Advanced validation and error messages
- Auto-calculation for assignment types
- Enhanced keyboard navigation

#### `VITE_FEATURE_TRADE_DTE`

**Default:** `false`  
**Purpose:** Enhanced Trade drawer with date picker UI

When enabled:

- Expiration date picker instead of numeric DTE input
- DTE chip showing calculated days to expiration
- "Advanced" toggle for direct numeric DTE entry
- Past-date warning with confirmation
- Telemetry tracking for user interactions

### Configuration

Add to `.env.local` or `.env.production`:

```env
# Journal editing features
VITE_FEATURE_JOURNAL_EDIT_DRAWER=true
VITE_FEATURE_JOURNAL_EDIT_FLOW=true

# Trade DTE enhancement
VITE_FEATURE_TRADE_DTE=true
```

Restart the dev server after changing environment variables.

---

## Journal Edit Flow

**Status:** ✅ Complete  
**Feature Flag:** `VITE_FEATURE_JOURNAL_EDIT_DRAWER`

### Overview

Enables full-field editing for Journal entries with a slide-in drawer that matches the Trade drawer's layout and behavior.

### User Experience

**Entry Point:** Edit icon in Journal table Actions column

**Drawer Behavior:**

- Right-side slide drawer (max-width 24-28rem)
- Overlay with 60% black background and backdrop blur
- Focus moves to first form control on open
- Escape key or overlay click closes drawer
- Focus returns to Edit button on close

**Editable Fields:**

- Date (ts) - Date input
- Account (account_id) - Text input
- Symbol - Text input (uppercase enforced)
- Type - Select dropdown
- Qty - Number input (nullable)
- Amount - Number input
- Strike - Number input (nullable)
- Expiration - Date input (nullable)
- Underlying Price - Number input (nullable)
- Notes - Textarea
- **Edit Reason** - Textarea (required for audit trail)

**Auto-Calculation:**

- For `assignment_shares` and `share_sale` types:
  - Amount = Strike × Shares
  - Qty represents shares, not contracts

### Technical Implementation

**Components:**

- `src/pages/journal/components/drawers/JournalDrawer.tsx` - Main drawer component
- `src/stores/useJournalUIStore.ts` - Drawer state management
- `src/stores/useEntriesStore.ts` - Edit persistence

**Data Flow:**

1. User clicks Edit icon → `openEdit(entry)` called
2. Drawer opens with entry data pre-filled
3. User modifies fields and provides edit reason
4. On save: `editEntry(entryId, updates, reason)` called
5. Original entry soft-deleted (sets `deleted_at`, `edit_reason`)
6. New corrected entry inserted
7. Both pages refresh from store

**Telemetry Events:**

- `journal_edit_open` - Drawer opened
- `journal_edit_close` - Drawer closed (cancel or after save)
- `journal_edit_save` - Entry saved successfully
- `journal_edit_error` - Save failed

### Accessibility

- ARIA dialog role with proper labeling
- Keyboard navigation (Tab, Shift+Tab, Escape)
- Focus management (trap and restore)
- Screen reader announcements for errors and state changes

---

## Trade DTE Enhancement

**Status:** ✅ Complete  
**Feature Flag:** `VITE_FEATURE_TRADE_DTE`

### Overview

Enhances the Trade drawer with an intuitive date picker for expiration dates while maintaining the option for direct DTE numeric entry through an "Advanced" toggle.

### User Experience

**When Flag Enabled:**

1. **Expiration Date Picker**
   - HTML5 date input for selecting expiration
   - Default: 30 days from today
   - User can select any future (or past) date

2. **DTE Chip**
   - Shows calculated days to expiration: "DTE: 29"
   - Updates automatically as date changes
   - Visual warning for past dates: "Past date selected"

3. **Advanced Toggle**
   - Button: "Advanced" / "Hide Advanced"
   - When toggled: Shows numeric DTE input field
   - Changes sync bi-directionally:
     - Typing DTE → Updates expiration date
     - Changing date → Updates DTE

4. **Past Date Warning**
   - Inline warning: Red text "Past date selected"
   - On save: Confirmation dialog required
   - Telemetry event: `trade_dte_past_date_warn`

**When Flag Disabled:**

- Original numeric DTE input field
- Expiration calculated from DTE (today + n days)

### Technical Implementation

**Shared DTE Utility** (`src/utils/dates.ts`):

```typescript
// Calculate DTE from ISO date string
calcDTE(expISO: string, now?: Date): number

// Calculate date from DTE
dateFromDTE(n: number, now?: Date): string

// Helper functions
toYmdLocal(date: Date): string
isValidYmd(dateStr: string): boolean
```

**Key Characteristics:**

- Uses local calendar days (start of day)
- Today to today = 0 DTE
- Today to tomorrow = 1 DTE
- Handles leap years and month boundaries correctly

**Components:**

- `src/pages/wheel/components/drawers/TradeTab.tsx` - Trade entry form
- `src/hooks/useWheelDatabase.ts` - Position DTE calculation
- Both use shared `calcDTE()` for consistency

**Telemetry Events:**

- `trade_dte_toggle_advanced` - Advanced input toggled
- `trade_dte_date_change` - Expiration date changed
- `trade_add_success` - Trade saved successfully (includes DTE data)
- `trade_add_error` - Trade save failed
- `trade_dte_past_date_warn` - Past date warning shown

### Testing

**Unit Tests** (`tests/unit/dates.test.ts`):

- Same-day expiration (DTE = 0)
- Next-day expiration (DTE = 1)
- Past dates (negative DTE)
- Leap years and month boundaries
- Round-trip conversion (date ↔ DTE)

**Component Tests** (`tests/unit/trade-tab-dte.test.tsx`):

- Date picker visibility with flag on/off
- DTE chip updates on date change
- Advanced toggle shows/hides numeric input
- Past date warning display
- Bi-directional sync (date ↔ DTE)

**E2E Coverage:**

- All existing Playwright tests passing
- Feature has no impact when flag disabled

### Migration Notes

**Wheel Page:**

- Previously had local `calculateDTE()` function
- Now uses shared `calcDTE()` from `src/utils/dates.ts`
- Results are identical, but calculation is centralized

**Trade Drawer:**

- Previously: Only numeric DTE input
- Now (when enabled): Date picker + DTE chip + Advanced toggle
- Persistence: Stores expiration date in journal (same as before)
- No schema changes required

---

## Roadmap

### Planned Features

1. **Import System Migration**
   - Migrate from DAO writes to template-based journal writes
   - Consolidate import and manual entry logic
   - Single data flow: CSV → Templates → Journal

2. **Price Data Integration**
   - Real-time price feeds for positions
   - Historical price tracking
   - Mark-to-market calculations

3. **Advanced Analytics**
   - Portfolio-level metrics (Sharpe ratio, max drawdown)
   - Strategy performance comparison
   - Risk management dashboards

4. **Bulk Operations**
   - Multi-row selection in Journal
   - Bulk edit and delete
   - Batch tag/category assignment

5. **Export & Reporting**
   - CSV/Excel export with custom columns
   - Tax reporting (Schedule D, wash sales)
   - Performance reports (PDF generation)

### Under Consideration

- Mobile app (React Native)
- Multi-portfolio support
- Collaborative features (shared portfolios)
- Broker integration (direct trade import)
- Notification system (email/push for expirations)

---

## Support & Documentation

- **Technical Architecture:** See `DATA_ARCHITECTURE.md`
- **Development Guide:** See `DEVELOPMENT.md`
- **File Structure:** See `PROJECT_ORGANIZATION.md`
- **Issue Tracking:** GitHub Issues
- **Questions:** GitHub Discussions
