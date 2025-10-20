# Phase 10: Testing & Fixtures 🧪

## Goals

- Implement comprehensive test pyramid (unit/component/e2e/accessibility)
- Achieve high test coverage with fast, reliable tests
- Automate accessibility testing with axe-core
- Sample data fixtures for development and testing
- Performance benchmarks for large datasets

## Inputs

- All implemented modules from previous phases
- Test pyramid framework setup (Vitest + RTL + Playwright + axe)
- Sample Robinhood CSV data

## Outputs

- Complete test pyramid with excellent coverage
- Automated accessibility testing pipeline
- Sample data fixtures and generators
- Performance benchmarks
- CI/CD integration with test gates

## Tasks Checklist

### Test Framework Setup

- [ ] Set up Vitest + React Testing Library for unit/component tests
- [ ] Configure Playwright for end-to-end testing
- [ ] Integrate axe-core for automated accessibility testing
- [ ] Create comprehensive test folder structure
- [ ] Set up test coverage reporting and thresholds
- [ ] Configure parallel test execution for performance

### Unit Testing

- [ ] Build unit tests for `/src/modules/calc/*` modules (>90% coverage)
- [ ] Test database operations and migrations
- [ ] Create in-memory SQLite for testing
- [ ] Test tax calculations against known scenarios
- [ ] Verify wheel lifecycle detection accuracy
- [ ] Test price adapter fallback chains

### Component Testing

- [ ] Build component tests for all React components with user interactions
- [ ] Test CSV import pipeline with various formats and error conditions
- [ ] Add integration tests combining database + UI workflows

### End-to-End Testing

- [ ] Create E2E test suites for complete user workflows:
  - [ ] CSV import → data processing → visualization flow
  - [ ] Wheel strategy lifecycle tracking
  - [ ] Tax lot management and wash sale detection
  - [ ] Price data management and calculations

### Accessibility Testing

- [ ] Build accessibility test suite covering:
  - [ ] Keyboard navigation for all components
  - [ ] Screen reader compatibility (ARIA labels)
  - [ ] Color contrast compliance
  - [ ] Focus management and visual indicators

### Test Data & Benchmarks

- [ ] Create sample CSV fixtures matching Robinhood formats
- [ ] Build test data generators for edge cases
- [ ] Benchmark performance with large datasets

## Test Pyramid Structure

### Folder Organization

```
/tests
  /unit                 # Fast, isolated unit tests (Vitest)
    /modules
      /calc             # Options calculation tests
        coveredCall.test.ts
        cashSecuredPut.test.ts
        longCall.test.ts
        common.test.ts
      /db               # Database operation tests
        sqlite.test.ts
        migrations.test.ts
      /csv              # CSV parsing tests
        parse.test.ts
        robinhood.test.ts
      /tax              # Tax calculation tests
        lots.test.ts
        washSales.test.ts
        scheduleD.test.ts
      /wheel            # Wheel lifecycle tests
        lifecycle.test.ts
      /price            # Price adapter tests
        adapters.test.ts
        manual.test.ts
    /utils              # Utility function tests
      dates.test.ts
      money.test.ts
      validators.test.ts
  /component            # Component behavior tests (Vitest + RTL)
    /pages              # Page component tests
      Dashboard.test.tsx
      Import.test.tsx
      Wheel.test.tsx
    /components         # Reusable component tests
      DataTable.test.tsx
      PayoffChart.test.tsx
      UploadDropzone.test.tsx
  /e2e                  # End-to-end workflow tests (Playwright)
    /workflows          # Complete user journeys
      csv-import.spec.ts
      wheel-tracking.spec.ts
      tax-lots.spec.ts
    /accessibility      # Accessibility compliance tests
      navigation.spec.ts
      screen-reader.spec.ts
  /fixtures             # Test data and mocks
    /csv                # Sample CSV files
      robinhood-options.csv
      robinhood-orders.csv
    /data               # Test data generators
      trades.ts
      positions.ts
      wheel.ts
    /mocks              # Mock implementations
      database.ts
      priceAdapter.ts
  /utils                # Test utilities and helpers
    testSetup.ts
    renderWithProviders.tsx
    mockData.ts
  setup.ts              # Global test setup
```

## Unit Test Examples

### Covered Call Calculation Tests

```typescript
// tests/unit/modules/calc/coveredCall.test.ts
import { describe, it, expect } from 'vitest';
import { CoveredCall } from '@/modules/calc/coveredCall';

describe('CoveredCall', () => {
  const baseInputs = {
    sharePrice: 100,
    shareBasis: 95,
    shareQty: 100,
    strike: 105,
    premium: 3.5,
    expiration: new Date('2024-02-16'),
    fees: 0.65,
  };

  describe('breakeven calculation', () => {
    it('should calculate breakeven correctly', () => {
      const cc = new CoveredCall(baseInputs);

      // Breakeven = shareBasis - premium + fees/shares
      // 95 - 3.50 + 0.65/100 = 91.51
      expect(cc.breakeven()).toBeCloseTo(91.51, 2);
    });

    it('should handle zero premium', () => {
      const cc = new CoveredCall({ ...baseInputs, premium: 0 });
      expect(cc.breakeven()).toBe(95.0065); // shareBasis + fees/shares
    });
  });

  describe('max profit calculation', () => {
    it('should calculate max profit correctly', () => {
      const cc = new CoveredCall(baseInputs);

      // Max profit = (strike - shareBasis + premium) * qty - fees
      // (105 - 95 + 3.50) * 100 - 0.65 = 1349.35
      expect(cc.maxProfit()).toBeCloseTo(1349.35, 2);
    });
  });

  describe('return on outlay', () => {
    it('should calculate annualized ROO correctly', () => {
      const cc = new CoveredCall(baseInputs);

      const roo = cc.returnOnOutlay();
      expect(roo).toBeGreaterThan(0);
      expect(roo).toBeLessThan(100); // Sanity check
    });
  });

  describe('assignment scenarios', () => {
    it('should calculate assignment P&L correctly', () => {
      const cc = new CoveredCall(baseInputs);

      // Assignment profit = max profit (shares called away at strike)
      expect(cc.assignmentPnL()).toBeCloseTo(cc.maxProfit(), 2);
    });
  });

  describe('payoff chart data', () => {
    it('should generate correct payoff data points', () => {
      const cc = new CoveredCall(baseInputs);

      const priceRange = [90, 95, 100, 105, 110];
      const payoff = cc.payoffChart(priceRange);

      expect(payoff).toHaveLength(5);
      expect(payoff[0]).toMatchObject({
        stockPrice: 90,
        profit: expect.any(Number),
      });

      // At strike price, should be max profit
      const strikeIndex = priceRange.indexOf(105);
      expect(payoff[strikeIndex].profit).toBeCloseTo(cc.maxProfit(), 2);
    });
  });
});
```

### Database Migration Tests

```typescript
// tests/unit/modules/db/migrations.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInMemoryDB } from '@/tests/utils/testDatabase';
import { MigrationManager } from '@/modules/db/migrations';

describe('Database Migrations', () => {
  let db: SQLiteDB;
  let migrationManager: MigrationManager;

  beforeEach(async () => {
    db = await createInMemoryDB();
    migrationManager = new MigrationManager(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('initial migration', () => {
    it('should create all required tables', async () => {
      await migrationManager.migrate();

      const tables = await db.getTables();
      expect(tables).toContain('trades');
      expect(tables).toContain('positions');
      expect(tables).toContain('lots');
      expect(tables).toContain('wheel');
      expect(tables).toContain('prices');
      expect(tables).toContain('settings');
    });

    it('should create required indexes', async () => {
      await migrationManager.migrate();

      const indexes = await db.getIndexes();
      expect(indexes).toContain('trades_idx1');
      expect(indexes).toContain('lots_idx1');
      expect(indexes).toContain('wheel_idx1');
    });
  });

  describe('schema versioning', () => {
    it('should track migration version', async () => {
      await migrationManager.migrate();

      const version = await migrationManager.getCurrentVersion();
      expect(version).toBe(1);
    });

    it('should not re-run completed migrations', async () => {
      await migrationManager.migrate();
      const firstRun = await db.getTables();

      await migrationManager.migrate();
      const secondRun = await db.getTables();

      expect(firstRun).toEqual(secondRun);
    });
  });

  describe('rollback functionality', () => {
    it('should rollback to previous version', async () => {
      await migrationManager.migrate();
      await migrationManager.rollback();

      const version = await migrationManager.getCurrentVersion();
      expect(version).toBe(0);
    });
  });
});
```

## Component Test Examples

### Upload Dropzone Tests

```typescript
// tests/component/components/UploadDropzone.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadDropzone } from '@/components/UploadDropzone';

describe('UploadDropzone', () => {
  const mockOnUpload = vi.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
  });

  describe('drag and drop', () => {
    it('should handle file drop', async () => {
      render(<UploadDropzone onUpload={mockOnUpload} />);

      const dropzone = screen.getByTestId('upload-dropzone');
      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      });

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith([file]);
      });
    });

    it('should show drag over state', () => {
      render(<UploadDropzone onUpload={mockOnUpload} />);

      const dropzone = screen.getByTestId('upload-dropzone');

      fireEvent.dragOver(dropzone);
      expect(dropzone).toHaveClass('dropzone--drag-over');

      fireEvent.dragLeave(dropzone);
      expect(dropzone).not.toHaveClass('dropzone--drag-over');
    });
  });

  describe('file selection', () => {
    it('should handle file input selection', async () => {
      const user = userEvent.setup();
      render(<UploadDropzone onUpload={mockOnUpload} />);

      const fileInput = screen.getByLabelText(/select files/i);
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });

      await user.upload(fileInput, file);

      expect(mockOnUpload).toHaveBeenCalledWith([file]);
    });

    it('should accept only specified file types', () => {
      render(<UploadDropzone onUpload={mockOnUpload} accept=".csv" />);

      const fileInput = screen.getByLabelText(/select files/i);
      expect(fileInput).toHaveAttribute('accept', '.csv');
    });
  });

  describe('validation', () => {
    it('should reject invalid file types', async () => {
      render(<UploadDropzone onUpload={mockOnUpload} accept=".csv" />);

      const dropzone = screen.getByTestId('upload-dropzone');
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [invalidFile] }
      });

      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      expect(mockOnUpload).not.toHaveBeenCalled();
    });

    it('should reject files exceeding size limit', () => {
      render(<UploadDropzone onUpload={mockOnUpload} maxSize={1024} />);

      // Create large file mock
      const largeFile = new File(['x'.repeat(2048)], 'large.csv', { type: 'text/csv' });
      Object.defineProperty(largeFile, 'size', { value: 2048 });

      const dropzone = screen.getByTestId('upload-dropzone');
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [largeFile] }
      });

      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });
});
```

## End-to-End Test Examples

### CSV Import Workflow

```typescript
// tests/e2e/workflows/csv-import.spec.ts
import { test, expect } from '@playwright/test';

test.describe('CSV Import Workflow', () => {
  test('should import Robinhood options CSV successfully', async ({ page }) => {
    await page.goto('/');

    // Navigate to import page
    await page.click('[data-testid="nav-import"]');
    await expect(page).toHaveURL('/import');

    // Upload CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/csv/robinhood-options.csv');

    // Wait for file processing
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeHidden();

    // Verify preview shows correct data
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible();
    const rows = page.locator('[data-testid="preview-row"]');
    await expect(rows).toHaveCount.greaterThan(0);

    // Confirm import
    await page.click('[data-testid="confirm-import"]');

    // Wait for import completion
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible();

    // Verify data appears in dashboard
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page.locator('[data-testid="portfolio-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-positions"]')).toBeVisible();
  });

  test('should handle CSV parsing errors gracefully', async ({ page }) => {
    await page.goto('/import');

    // Upload invalid CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/csv/invalid-format.csv');

    // Should show error quarantine
    await expect(page.locator('[data-testid="error-summary"]')).toBeVisible();
    const errorCount = await page.locator('[data-testid="error-count"]').textContent();
    expect(parseInt(errorCount || '0')).toBeGreaterThan(0);

    // Should show quarantined rows
    await page.click('[data-testid="view-errors"]');
    await expect(page.locator('[data-testid="quarantine-table"]')).toBeVisible();
  });
});
```

### Accessibility Tests

```typescript
// tests/e2e/accessibility/navigation.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should have no accessibility violations on dashboard', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through navigation
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).toBe('nav-dashboard');

    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).toBe('nav-import');

    // Enter should activate navigation
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/import');
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check main navigation has proper labels
    const nav = page.locator('nav[role="navigation"]');
    await expect(nav).toHaveAttribute('aria-label');

    // Check data table has proper structure
    await page.goto('/dashboard');
    const table = page.locator('table[role="table"]');
    if ((await table.count()) > 0) {
      await expect(table).toHaveAttribute('aria-label');

      const headers = table.locator('th[role="columnheader"]');
      expect(await headers.count()).toBeGreaterThan(0);
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/import');

    // Upload file and check for status announcements
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/csv/robinhood-options.csv');

    // Should have live region for status updates
    const statusRegion = page.locator('[aria-live="polite"]');
    await expect(statusRegion).toBeVisible();
  });
});
```

## Test Data Fixtures

### Sample CSV Generator

```typescript
// tests/fixtures/data/trades.ts
export function generateSampleTrades(count: number = 10): Trade[] {
  const tickers = ['AAPL', 'SPY', 'QQQ', 'TSLA'];
  const trades: Trade[] = [];

  for (let i = 0; i < count; i++) {
    trades.push({
      id: i + 1,
      underlying: tickers[i % tickers.length],
      type: Math.random() > 0.5 ? 'C' : 'P',
      side: Math.random() > 0.5 ? 'Buy' : 'Sell',
      qty: Math.floor(Math.random() * 10) + 1,
      strike: 100 + Math.random() * 100,
      expiration: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
      price: Math.random() * 10,
      amount: 0, // Calculated
      fees: Math.random() * 2,
      multiplier: 100,
      sourceFile: 'test-data',
      createdAt: new Date(),
    });
  }

  return trades;
}

export function generateWheelCycle(underlying: string): WheelStep[] {
  const baseDate = new Date('2024-01-15');

  return [
    {
      lifecycleId: `${underlying}_2024-01-15_001`,
      stepIndex: 0,
      underlying,
      eventType: 'csp_open',
      dt: baseDate,
      strike: 95,
      expiry: new Date('2024-02-16'),
      qty: 100,
      netCredit: 250,
      runningBasis: 9250,
    },
    {
      lifecycleId: `${underlying}_2024-01-15_001`,
      stepIndex: 1,
      underlying,
      eventType: 'csp_assign',
      dt: new Date('2024-02-16'),
      qty: 100,
      netCredit: 0,
      runningBasis: 9250,
    },
    // Continue wheel cycle...
  ];
}
```

## Performance Benchmarks

### Database Performance Tests

```typescript
// tests/unit/modules/db/performance.test.ts
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('Database Performance', () => {
  it('should insert 1000 trades in under 1 second', async () => {
    const trades = generateSampleTrades(1000);

    const start = performance.now();
    await db.insertTradesBatch(trades);
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(1000); // Less than 1 second
  });

  it('should query large datasets efficiently', async () => {
    // Insert 10,000 trades
    const largeBatch = generateSampleTrades(10000);
    await db.insertTradesBatch(largeBatch);

    const start = performance.now();
    const results = await db.getTradesByUnderlying('AAPL');
    const end = performance.now();

    expect(end - start).toBeLessThan(100); // Less than 100ms
    expect(results.length).toBeGreaterThan(0);
  });
});
```

## Dependencies

- All functional phases should be complete for thorough testing
- Testing framework and sample data setup

## Acceptance Tests

- [ ] All calculation modules have >90% test coverage
- [ ] Component tests cover all user interactions and error states
- [ ] E2E tests verify complete workflows end-to-end
- [ ] Accessibility tests pass WCAG AA compliance
- [ ] Database tests run reliably in isolation
- [ ] Sample fixtures cover common and edge cases
- [ ] Performance tests identify bottlenecks
- [ ] Tax calculations match reference implementations
- [ ] Integration tests catch regressions
- [ ] Tests run quickly in development workflow (<30s for unit/component)
- [ ] E2E tests run efficiently in CI (<10min total)
- [ ] All tests pass before code can be merged to main

## Risks & Mitigations

- **Risk:** Test suite becoming slow and blocking development
  - **Mitigation:** Fast unit tests, selective E2E runs, parallel execution, test categorization
- **Risk:** Accessibility regressions going unnoticed
  - **Mitigation:** Automated axe testing, manual reviews, clear ARIA standards
- **Risk:** E2E tests being flaky or unreliable
  - **Mitigation:** Proper wait strategies, data-testid selectors, retry mechanisms
- **Risk:** Test complexity matching business logic complexity
  - **Mitigation:** Focus on critical paths, use property-based testing
- **Risk:** Maintaining test data as features evolve
  - **Mitigation:** Data generators, automated fixture updates

## Demo Script

```bash
# Run different test levels
yarn test:unit              # Fast unit tests (~5-10s)
yarn test:component         # Component interaction tests (~10-15s)
yarn test:e2e              # Complete workflow tests (~2-4min)
yarn test:a11y             # Accessibility compliance tests (~1-2min)
yarn test:all              # Complete test pyramid (~5-7min)

# Development workflow
yarn test:watch            # Continuous unit testing during dev
yarn test:coverage         # Generate coverage reports

# CI/CD testing
yarn test:ci               # Optimized for CI environment

# Performance benchmarks
yarn test:perf             # Run performance benchmark suite
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Set up comprehensive test pyramid framework and first unit tests

**Previous Phase:** [Phase 9 - Storage & Export](./phase-9-storage.md)
**Next Phase:** [Phase 11 - Documentation & PWA](./phase-11-docs-pwa.md)
