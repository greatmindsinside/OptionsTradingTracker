# Project Cleanup & Dead Code Removal Tracker

**Created:** November 3, 2025  
**Last Updated:** November 3, 2025 - 6:30 PM  
**Purpose:** Track identification and removal of unused code, components, and files to streamline the codebase

---

## 📊 Summary Statistics

### Current State

- **Active Pages:** 3 (WheelPage, JournalPage, NotFoundPage)
- **Removed Pages:** 6 (HomePage, PortfolioPage, VisualizationPage, AnalysisPage, TaxPage, ImportPage)
- **Orphaned Components:** 0 remaining (15+ removed)
- **Orphaned CSS Modules:** 0 remaining (removed with components)
- **Unused Style Files:** 0 (cleaned)

### Impact

- **CSS Reduction:** 31.83 kB (from 121.72 kB to 89.89 kB) - 26.1% decrease
- **Build Status:** ✅ Passing (89.89 kB CSS, 15.09 kB gzipped)
- **TypeScript:** ✅ Clean compilation
- **Deleted Components:** 15+ (dashboard, chart, demo, legacy UI)
- **Cleaned Style Files:** 2 (accessibility.css, themes.css) – removed; high-contrast merged into index.css

---

## 🗑️ Identified Unused Components

### Priority 1: Completely Unused (No Imports)

#### Dashboard/Analytics Components

| Component                   | Path                                         | Status      | Notes                                                     |
| --------------------------- | -------------------------------------------- | ----------- | --------------------------------------------------------- |
| **OptionsCalculator**       | `src/components/OptionsCalculator/`          | ⚠️ ORPHANED | Calculator for options strategies - not imported anywhere |
| **PortfolioSummary**        | `src/components/PortfolioSummary/`           | ⚠️ ORPHANED | Portfolio summary card - was used in deleted HomePage     |
| **PositionTracker**         | `src/components/PositionTracker/`            | ⚠️ ORPHANED | Position tracking table - was used in deleted HomePage    |
| **RiskDashboard**           | `src/components/RiskDashboard/`              | ⚠️ ORPHANED | Risk metrics dashboard - was used in deleted HomePage     |
| **TaxLotDashboard**         | `src/components/TaxLotDashboard.tsx`         | ⚠️ ORPHANED | Tax lot management UI - was used in deleted TaxPage       |
| **WheelAnalyticsDashboard** | `src/components/WheelAnalyticsDashboard.tsx` | ⚠️ ORPHANED | Wheel strategy analytics - not referenced                 |

#### Chart Components

| Component          | Path                             | Status      | Notes                                                                |
| ------------------ | -------------------------------- | ----------- | -------------------------------------------------------------------- |
| **PnLChart**       | `src/components/PnLChart/`       | ⚠️ ORPHANED | P&L visualization chart - was used in deleted VisualizationPage      |
| **PortfolioChart** | `src/components/PortfolioChart/` | ⚠️ ORPHANED | Portfolio composition chart - was used in deleted VisualizationPage  |
| **GreeksChart**    | `src/components/GreeksChart/`    | ⚠️ ORPHANED | Options Greeks visualization - was used in deleted VisualizationPage |
| **ChartContainer** | `src/components/ChartContainer/` | ⚠️ ORPHANED | Wrapper for chart components - no imports found                      |

#### Demo/Timeline Components

| Component             | Path                                   | Status      | Notes                                                   |
| --------------------- | -------------------------------------- | ----------- | ------------------------------------------------------- |
| **Phase4Demo**        | `src/components/Phase4Demo.tsx`        | ⚠️ ORPHANED | Demo component for Phase 4 features                     |
| **WheelTimelineDemo** | `src/components/WheelTimelineDemo.tsx` | ⚠️ ORPHANED | Demo for lifecycle timeline                             |
| **LifecycleTimeline** | `src/components/LifecycleTimeline.tsx` | ⚠️ ORPHANED | Timeline visualization - only used by WheelTimelineDemo |

#### Other Components

| Component    | Path                       | Status      | Notes                       |
| ------------ | -------------------------- | ----------- | --------------------------- |
| **NewsCard** | `src/components/NewsCard/` | ⚠️ ORPHANED | News/updates card component |

### Priority 2: Used Only by Orphaned Components

These components are only imported by other unused components:

| Component            | Path                               | Used By           | Action             |
| -------------------- | ---------------------------------- | ----------------- | ------------------ |
| **CalculatorCard**   | `src/components/CalculatorCard/`   | OptionsCalculator | Remove with parent |
| **StrategySelector** | `src/components/StrategySelector/` | OptionsCalculator | Remove with parent |
| **ResultsDisplay**   | `src/components/ResultsDisplay/`   | OptionsCalculator | Remove with parent |
| **InputGroup**       | `src/components/InputGroup/`       | OptionsCalculator | Remove with parent |

### Priority 3: Currently In Use (Keep)

| Component         | Path                               | Used By                                     | Status           |
| ----------------- | ---------------------------------- | ------------------------------------------- | ---------------- |
| **EditEntryForm** | `src/components/EditEntryForm.tsx` | JournalPage                                 | ✅ KEEP          |
| **Input**         | `src/components/ui/Input.tsx`      | JournalPage, EditEntryForm, DateRangeFilter | ✅ KEEP          |
| **Modal**         | `src/components/ui/Modal.tsx`      | JournalPage                                 | ✅ KEEP          |
| **Select**        | `src/components/ui/Select.tsx`     | TradeTypeFilter, StatusFilter               | ✅ KEEP          |
| **Button**        | `src/components/Button/`           | Multiple (new CVA version)                  | ✅ KEEP          |
| **ErrorBoundary** | `src/components/ErrorBoundary.tsx` | App.tsx                                     | ✅ KEEP          |
| **ThemeToggle**   | `src/components/ThemeToggle/`      | Likely used in layout                       | ✅ KEEP (verify) |

---

## 🎨 Orphaned CSS Modules

### Components with Unused CSS Modules

| CSS Module                     | Component         | Status     | Notes                               |
| ------------------------------ | ----------------- | ---------- | ----------------------------------- |
| `Button.module.css`            | Button (old)      | ✅ DELETED | Replaced by CVA and global patterns |
| `OptionsCalculator.module.css` | OptionsCalculator | ✅ DELETED | Removed with component folder       |
| `PortfolioSummary.module.css`  | PortfolioSummary  | ✅ DELETED | Removed with component folder       |
| `PositionTracker.module.css`   | PositionTracker   | ✅ DELETED | Removed with component folder       |
| `RiskDashboard.module.css`     | RiskDashboard     | ✅ DELETED | Removed with component folder       |
| `PnLChart.module.css`          | PnLChart          | ✅ DELETED | Removed with component folder       |
| `PortfolioChart.module.css`    | PortfolioChart    | ✅ DELETED | Removed with component folder       |
| `GreeksChart.module.css`       | GreeksChart       | ✅ DELETED | Removed with component folder       |
| `ChartContainer.module.css`    | ChartContainer    | ✅ DELETED | Removed with component folder       |
| `CalculatorCard.module.css`    | CalculatorCard    | ✅ DELETED | Removed with component folder       |
| `StrategySelector.module.css`  | StrategySelector  | ✅ DELETED | Removed with component folder       |
| `ResultsDisplay.module.css`    | ResultsDisplay    | ✅ DELETED | Removed with component folder       |
| `InputGroup.module.css`        | InputGroup        | ✅ DELETED | Removed with component folder       |

---

## 📁 Orphaned Style Files

### Unused Global Styles

| File                  | Path                           | Status     | Notes                                             |
| --------------------- | ------------------------------ | ---------- | ------------------------------------------------- |
| **accessibility.css** | `src/styles/accessibility.css` | ✅ DELETED | High-contrast rules merged into `index.css`       |
| **themes.css**        | `src/styles/themes.css`        | ✅ DELETED | Replaced by Tailwind v4 RGB tokens in `index.css` |
| **wheel-header.css**  | `src/styles/wheel-header.css`  | ✅ KEEP    | Imported in `index.css` - complex animations      |

### Recommendation

- **accessibility.css**: Consider merging useful focus states into index.css @layer base
- **themes.css**: Review if any theme utilities are needed, otherwise delete

---

## 🚫 Orphaned UI Components

### Legacy Button Component

| File                           | Status    | Notes                                                                                    |
| ------------------------------ | --------- | ---------------------------------------------------------------------------------------- |
| `src/components/ui/Button.tsx` | ⚠️ DELETE | Old Button implementation, replaced by CVA version at `src/components/Button/Button.tsx` |

---

## 📋 Cleanup Action Plan

### Phase 1: Verify & Document ✅ COMPLETE

- [x] Identify all orphaned components
- [x] Check import/export references
- [x] Document dependencies
- [x] Create this tracking document

### Phase 2: Remove Orphaned Dashboard Components (High Priority)

**Estimated CSS Savings:** ~15-20 kB

- [x] Delete `src/components/OptionsCalculator/` (includes OptionsCalculator.tsx, .module.css, folder)
  - [x] Delete dependent: `src/components/CalculatorCard/`
  - [x] Delete dependent: `src/components/StrategySelector/`
  - [x] Delete dependent: `src/components/ResultsDisplay/`
  - [x] Delete dependent: `src/components/InputGroup/`
- [x] Delete `src/components/PortfolioSummary/` (includes .tsx, .module.css)
- [x] Delete `src/components/PositionTracker/` (includes .tsx, .module.css)
- [x] Delete `src/components/RiskDashboard/` (includes .tsx, .module.css)
- [x] Delete `src/components/TaxLotDashboard.tsx`
- [x] Delete `src/components/WheelAnalyticsDashboard.tsx`
- [x] Run build to verify no breakage
- [x] Update this document

### Phase 3: Remove Chart Components (Medium Priority)

**Estimated CSS Savings:** ~10-15 kB

- [x] Delete `src/components/PnLChart/` (includes .tsx, .module.css)
- [x] Delete `src/components/PortfolioChart/` (includes .tsx, .module.css)
- [x] Delete `src/components/GreeksChart/` (includes .tsx, .module.css)
- [x] Delete `src/components/ChartContainer/` (includes .tsx, .module.css)
- [x] Run build to verify
- [x] Update this document

### Phase 4: Remove Demo/Timeline Components (Low Priority)

**Estimated CSS Savings:** ~2-5 kB

- [x] Delete `src/components/Phase4Demo.tsx`
- [x] Delete `src/components/WheelTimelineDemo.tsx`
- [x] Delete `src/components/LifecycleTimeline.tsx`
- [x] Delete `src/components/NewsCard/` if exists (not present)
- [x] Run build to verify
- [x] Update this document

### Phase 5: Clean Up Legacy UI Components

**Estimated CSS Savings:** ~1-2 kB

- [x] Delete `src/components/ui/Button.tsx` (old implementation)
- [x] Delete `src/components/Button/Button.module.css` (replaced by global patterns)
- [x] Verify no imports reference old Button
- [x] Run build to verify
- [x] Update this document

### Phase 6: Review and Clean Orphaned Styles

**Estimated CSS Savings:** ~5-10 kB

- [x] Review `src/styles/accessibility.css` - merge useful rules into index.css
- [x] Review `src/styles/themes.css` - extract needed utilities or delete
- [x] Delete files after migration
- [x] Run build and check CSS bundle size
- [x] Update this document

### Phase 7: Documentation Cleanup (Final)

- [x] Update README.md to reflect current component structure
- [x] Remove references to deleted pages/components from docs
- [x] Update component inventory sections
- [x] Clean outdated features and user guide sections

---

## 🎯 Expected Outcomes

### CSS Bundle Size Reduction

- **Final:** 89.89 kB (15.09 kB gzipped)
- **Start:** 121.72 kB (20.43 kB gzipped)
- **Total Savings:** 31.83 kB (gzipped: 5.34 kB)

### Code Maintainability

- Fewer components to maintain
- Clearer codebase structure
- Easier onboarding for new developers
- Reduced cognitive load

### Build Performance

- Faster TypeScript compilation
- Smaller bundle sizes
- Reduced tree-shaking work for bundler

---

## ⚠️ Safety Checks Before Deletion

Before deleting any component, verify:

1. ✅ **No imports in codebase** - Run grep search for component name
2. ✅ **No dynamic imports** - Check for `import()` or `React.lazy()`
3. ✅ **Not referenced in tests** - Check test files
4. ✅ **Not used in stories** - Check Storybook files (if exists)
5. ✅ **Not referenced in docs** - Check documentation
6. ✅ **Build passes** - Run `yarn build` after deletion
7. ✅ **TypeScript passes** - Run `yarn typecheck`

---

## 📝 Deletion Log

### November 3, 2025

#### 5:15 PM - Removed Pages (Initial Cleanup - Phase 1)

- ✅ Deleted: `HomePage.tsx`, `HomePage.module.css`
- ✅ Deleted: `PortfolioPage.tsx`, `PortfolioPage.module.css`
- ✅ Deleted: `VisualizationPage.tsx`, `VisualizationPage.module.css`
- ✅ Deleted: `AnalysisPage.tsx`
- ✅ Deleted: `Tax.tsx`
- ✅ Deleted: `TaxPage.tsx`
- ✅ Deleted: `ImportPage.tsx` (redundant with WheelPage import functionality)
- ✅ Updated: `App.tsx` routes
- ✅ Result: CSS reduced from 121.72 kB to 101.93 kB (-19.79 kB)

#### 5:45 PM - Removed Orphaned Components (Phases 2-5)

**Phase 2 - Dashboard Components:**

- ✅ Deleted: `OptionsCalculator/` (+ .module.css)
- ✅ Deleted: `CalculatorCard/` (+ .module.css)
- ✅ Deleted: `StrategySelector/` (+ .module.css)
- ✅ Deleted: `ResultsDisplay/` (+ .module.css)
- ✅ Deleted: `InputGroup/` (+ .module.css)
- ✅ Deleted: `PortfolioSummary/` (+ .module.css)
- ✅ Deleted: `PositionTracker/` (+ .module.css)
- ✅ Deleted: `RiskDashboard/` (+ .module.css)
- ✅ Deleted: `TaxLotDashboard.tsx`
- ✅ Deleted: `WheelAnalyticsDashboard.tsx`
- ✅ Fixed: `src/modules/tax/index.ts` export reference
- ✅ Result: CSS reduced from 101.93 kB to 94.82 kB (-7.11 kB)

**Phase 3 - Chart Components:**

- ✅ Deleted: `PnLChart/` (+ .module.css)
- ✅ Deleted: `PortfolioChart/` (+ .module.css)
- ✅ Deleted: `GreeksChart/` (+ .module.css)
- ✅ Deleted: `ChartContainer/` (+ .module.css)

**Phase 4 - Demo Components:**

- ✅ Deleted: `Phase4Demo.tsx`
- ✅ Deleted: `WheelTimelineDemo.tsx`
- ✅ Deleted: `LifecycleTimeline.tsx`

**Phase 5 - Legacy UI Components:**

- ✅ Deleted: `ui/Button.tsx` (old implementation)
- ✅ Deleted: `Button/Button.module.css` (replaced by CVA)
- ✅ Result: Final CSS size 88.39 kB (14.88 kB gzipped)

**Total Reduction:** 33.33 kB uncompressed (from 121.72 kB to 88.39 kB)  
**Gzipped Reduction:** 5.55 kB (from 20.43 kB to 14.88 kB)  
**Percentage Reduction:** 27.4% smaller CSS bundle

#### 6:00 PM - Removed Orphaned Styles (Phase 6)

**Analysis:**

- ✅ Reviewed `accessibility.css` (~141 lines): Found only high-contrast mode support missing from index.css
- ✅ Reviewed `themes.css` (~299 lines): Old CSS variable format, replaced by Tailwind v4 RGB tokens
- ✅ Migrated: Added `@media (prefers-contrast: high)` support to index.css
- ✅ Deleted: `src/styles/accessibility.css` (already removed)
- ✅ Deleted: `src/styles/themes.css` (already removed)
- ✅ Fixed: Chart component folders (GreeksChart, PnLChart, PortfolioChart) still existed from Phase 3 - now deleted
- ✅ Result: CSS size 89.89 kB (15.09 kB gzipped) - 31.83 kB reduction from start (26.1%)

**Note:** Minimal CSS size increase (+1.5 kB) from adding high-contrast mode support is justified for accessibility.

#### 6:15 PM - Documentation Cleanup (Phase 7) ✅

**Updates:**

- ✅ Updated README.md project structure to reflect current codebase
- ✅ Removed references to 15+ deleted components from structure tree
- ✅ Updated features section: removed calculator and tax lot references
- ✅ Updated user guide: removed 4 deprecated pages, added Journal page section
- ✅ Updated tech stack: Tailwind v4 with CVA + Global CSS Patterns
- ✅ Cleaned duplicate and outdated structure sections

**All 7 Phases Complete** - Project cleanup successful! 🎉

---

## 🔍 Future Investigation

### Components to Review Later

1. **ThemeToggle** - Verify if this is being used in a layout component
2. **Wheel components** - Audit all Wheel-related components for unused code
3. **Journal components** - Check if all filter components are actively used

---

## 📊 Progress Meter

**Phase 1:** ████████████████████ 100% Complete  
**Phase 2:** ████████████████████ 100% Complete  
**Phase 3:** ████████████████████ 100% Complete  
**Phase 4:** ████████████████████ 100% Complete  
**Phase 5:** ████████████████████ 100% Complete  
**Phase 6:** ████████████████████ 100% Complete  
**Phase 7:** ████████████████████ 100% Complete

**Overall Progress:** 100% (7/7 phases complete) ✅

---

## 🚀 Quick Commands

### Verify Component Usage

```bash
# Search for component imports
grep -r "from '@/components/ComponentName'" src/

# Search for any reference to component
grep -r "ComponentName" src/ --include="*.tsx" --include="*.ts"
```

### Check CSS Module Usage

```bash
# Find CSS module imports
grep -r "\.module\.css" src/

# Check if specific module is imported
grep -r "ComponentName.module.css" src/
```

### Build & Verify

```bash
yarn typecheck  # TypeScript compilation check
yarn build      # Production build
yarn test       # Run tests if they exist
```

---

## 📌 Notes

- All deletions should be committed separately for easy rollback if needed
- Keep a backup branch before major cleanup phases
- Test the application manually after each phase
- Update this document after each cleanup action
- CSS savings are estimates - actual results may vary

**Remember:** When in doubt, don't delete it. Move it to an `_archive` folder first!
