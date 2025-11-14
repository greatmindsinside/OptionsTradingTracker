import { test } from '@playwright/test';

import { WheelPage } from '../pages/WheelPage';

/**
 * E2E tests for Historical Min Strikes section
 * Tests the UI components, chart display, table display, and data filtering
 */

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
});

test.describe('Historical Min Strikes - Display', () => {
  test('should show empty state when no data', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Look for Historical Min Strikes card
    // const historicalCard = page.locator('text=Historical Min Strikes').locator('..');

    // TODO: Uncomment after implementing HistoricalMinStrikesCard
    // await expect(historicalCard).toBeVisible();
    //
    // // Should show empty state message
    // const emptyState = historicalCard.locator('text=/no.*data|no.*historical/i');
    // await expect(emptyState).toBeVisible();
  });

  test('should show chart when data exists', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Setup: Add shares and covered calls to generate historical data
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    // Add shares first
    // Note: This might require using Share Transaction form instead
    // For now, we'll add a covered call which should trigger share creation if checkbox is checked
    await wheelPage.symbolInput.fill('AAPL');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    // Check "I own the underlying shares" checkbox if it exists
    const ownsSharesCheckbox = page.locator('input[type="checkbox"][id="ownsShares"]');
    if (await ownsSharesCheckbox.isVisible().catch(() => false)) {
      await ownsSharesCheckbox.check();
      await wheelPage.wait(200);

      // Fill shares owned and average cost
      const sharesOwnedInput = page.getByLabel(/shares owned/i);
      const avgCostInput = page.getByLabel(/average cost/i);
      if (await sharesOwnedInput.isVisible().catch(() => false)) {
        await sharesOwnedInput.fill('100');
        await avgCostInput.fill('150.00');
      }
    }

    // Fill trade form
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0]!;

    await wheelPage.fillTradeForm({
      qty: '1',
      expiration: dateStr,
      strike: '160',
      premium: '2.50',
      fees: '0',
    });

    // Submit the trade
    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Look for Historical Min Strikes card
    // const historicalCard = page.locator('text=Historical Min Strikes').locator('..');

    // TODO: Uncomment after implementing HistoricalMinStrikesCard
    // await expect(historicalCard).toBeVisible();
    //
    // // Should show chart
    // const chart = historicalCard.locator('svg').or(historicalCard.locator('[data-testid="min-strike-chart"]'));
    // await expect(chart).toBeVisible({ timeout: 5000 });
  });

  test('should show table when data exists', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Setup: Add shares and covered calls (same as previous test)
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    await wheelPage.symbolInput.fill('MSFT');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    // Check "I own the underlying shares" checkbox if it exists
    const ownsSharesCheckbox = page.locator('input[type="checkbox"][id="ownsShares"]');
    if (await ownsSharesCheckbox.isVisible().catch(() => false)) {
      await ownsSharesCheckbox.check();
      await wheelPage.wait(200);

      const sharesOwnedInput = page.getByLabel(/shares owned/i);
      const avgCostInput = page.getByLabel(/average cost/i);
      if (await sharesOwnedInput.isVisible().catch(() => false)) {
        await sharesOwnedInput.fill('200');
        await avgCostInput.fill('300.00');
      }
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateStr = futureDate.toISOString().split('T')[0]!;

    await wheelPage.fillTradeForm({
      qty: '2',
      expiration: dateStr,
      strike: '320',
      premium: '3.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Look for Historical Min Strikes card
    // const historicalCard = page.locator('text=Historical Min Strikes').locator('..');

    // TODO: Uncomment after implementing HistoricalMinStrikesCard
    // await expect(historicalCard).toBeVisible();
    //
    // // Should show table
    // const table = historicalCard.locator('table').or(historicalCard.locator('[data-testid="min-strike-table"]'));
    // await expect(table).toBeVisible({ timeout: 5000 });
    //
    // // Table should have columns: Date, Avg Cost, Premium Received, Min Strike, Shares Owned
    // await expect(table.locator('text=Date')).toBeVisible();
    // await expect(table.locator('text=Avg Cost')).toBeVisible();
    // await expect(table.locator('text=Premium Received')).toBeVisible();
    // await expect(table.locator('text=Min Strike')).toBeVisible();
    // await expect(table.locator('text=Shares Owned')).toBeVisible();
  });

  test('should filter by ticker correctly', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Setup: Add data for multiple tickers
    // Add AAPL shares and call
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    await wheelPage.symbolInput.fill('AAPL');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    const ownsSharesCheckbox = page.locator('input[type="checkbox"][id="ownsShares"]');
    if (await ownsSharesCheckbox.isVisible().catch(() => false)) {
      await ownsSharesCheckbox.check();
      await wheelPage.wait(200);

      const sharesOwnedInput = page.getByLabel(/shares owned/i);
      const avgCostInput = page.getByLabel(/average cost/i);
      if (await sharesOwnedInput.isVisible().catch(() => false)) {
        await sharesOwnedInput.fill('100');
        await avgCostInput.fill('150.00');
      }
    }

    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 7);
    const dateStr1 = futureDate1.toISOString().split('T')[0]!;

    await wheelPage.fillTradeForm({
      qty: '1',
      expiration: dateStr1,
      strike: '160',
      premium: '2.50',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Add MSFT shares and call
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    await wheelPage.symbolInput.fill('MSFT');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    if (await ownsSharesCheckbox.isVisible().catch(() => false)) {
      await ownsSharesCheckbox.check();
      await wheelPage.wait(200);

      const sharesOwnedInput = page.getByLabel(/shares owned/i);
      const avgCostInput = page.getByLabel(/average cost/i);
      if (await sharesOwnedInput.isVisible().catch(() => false)) {
        await sharesOwnedInput.fill('200');
        await avgCostInput.fill('300.00');
      }
    }

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 14);
    const dateStr2 = futureDate2.toISOString().split('T')[0]!;

    await wheelPage.fillTradeForm({
      qty: '2',
      expiration: dateStr2,
      strike: '320',
      premium: '3.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Look for Historical Min Strikes card
    // const historicalCard = page.locator('text=Historical Min Strikes').locator('..');

    // TODO: Uncomment after implementing HistoricalMinStrikesCard with ticker filter
    // await expect(historicalCard).toBeVisible();
    //
    // // Should have ticker filter dropdown or selector
    // const tickerFilter = historicalCard.locator('select').or(historicalCard.locator('[data-testid="ticker-filter"]'));
    // await expect(tickerFilter).toBeVisible();
    //
    // // Select AAPL
    // await tickerFilter.selectOption('AAPL');
    // await wheelPage.wait(1000);
    //
    // // Table/chart should only show AAPL data
    // const table = historicalCard.locator('table').or(historicalCard.locator('[data-testid="min-strike-table"]'));
    // const rows = table.locator('tbody tr');
    // const rowCount = await rows.count();
    //
    // // All rows should contain AAPL data (or be filtered to AAPL)
    // for (let i = 0; i < rowCount; i++) {
    //   const row = rows.nth(i);
    //   const rowText = await row.textContent();
    //   // Verify row is for AAPL (might need to check specific column)
    //   expect(rowText).toContain('AAPL');
    // }
  });
});

test.describe('Historical Min Strikes - Chart', () => {
  test('should display min_strike line correctly', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Setup: Add shares and multiple covered calls to generate data points
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    await wheelPage.symbolInput.fill('TSLA');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    const ownsSharesCheckbox = page.locator('input[type="checkbox"][id="ownsShares"]');
    if (await ownsSharesCheckbox.isVisible().catch(() => false)) {
      await ownsSharesCheckbox.check();
      await wheelPage.wait(200);

      const sharesOwnedInput = page.getByLabel(/shares owned/i);
      const avgCostInput = page.getByLabel(/average cost/i);
      if (await sharesOwnedInput.isVisible().catch(() => false)) {
        await sharesOwnedInput.fill('100');
        await avgCostInput.fill('200.00');
      }
    }

    // Add first call
    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 7);
    const dateStr1 = futureDate1.toISOString().split('T')[0]!;

    await wheelPage.fillTradeForm({
      qty: '1',
      expiration: dateStr1,
      strike: '220',
      premium: '5.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Add second call (different date)
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    await wheelPage.symbolInput.fill('TSLA');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    if (await ownsSharesCheckbox.isVisible().catch(() => false)) {
      await ownsSharesCheckbox.check();
      await wheelPage.wait(200);
    }

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 14);
    const dateStr2 = futureDate2.toISOString().split('T')[0]!;

    await wheelPage.fillTradeForm({
      qty: '1',
      expiration: dateStr2,
      strike: '230',
      premium: '6.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Look for Historical Min Strikes card and chart
    // const historicalCard = page.locator('text=Historical Min Strikes').locator('..');

    // TODO: Uncomment after implementing MinStrikeChart
    // await expect(historicalCard).toBeVisible();
    //
    // const chart = historicalCard.locator('svg').or(historicalCard.locator('[data-testid="min-strike-chart"]'));
    // await expect(chart).toBeVisible({ timeout: 5000 });
    //
    // // Chart should have a line showing min_strike over time
    // // Verify chart has data points (lines or paths in SVG)
    // const chartLines = chart.locator('path, line, polyline');
    // const lineCount = await chartLines.count();
    // expect(lineCount).toBeGreaterThan(0);
  });

  test('should handle date range correctly', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Setup: Add data spanning multiple weeks
    // This test verifies the chart can display data across a date range

    // TODO: Implement after chart is created
    // The chart should properly scale X-axis for date range
    // and Y-axis for price range
  });
});

test.describe('Historical Min Strikes - Table', () => {
  test('should display all columns correctly', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Setup: Add shares and covered call
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    await wheelPage.symbolInput.fill('GOOGL');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    const ownsSharesCheckbox = page.locator('input[type="checkbox"][id="ownsShares"]');
    if (await ownsSharesCheckbox.isVisible().catch(() => false)) {
      await ownsSharesCheckbox.check();
      await wheelPage.wait(200);

      const sharesOwnedInput = page.getByLabel(/shares owned/i);
      const avgCostInput = page.getByLabel(/average cost/i);
      if (await sharesOwnedInput.isVisible().catch(() => false)) {
        await sharesOwnedInput.fill('100');
        await avgCostInput.fill('140.00');
      }
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0]!;

    await wheelPage.fillTradeForm({
      qty: '1',
      expiration: dateStr,
      strike: '150',
      premium: '2.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Look for Historical Min Strikes card and table
    // const historicalCard = page.locator('text=Historical Min Strikes').locator('..');

    // TODO: Uncomment after implementing MinStrikeTable
    // await expect(historicalCard).toBeVisible();
    //
    // const table = historicalCard.locator('table').or(historicalCard.locator('[data-testid="min-strike-table"]'));
    // await expect(table).toBeVisible({ timeout: 5000 });
    //
    // // Verify all columns are present
    // const headers = table.locator('th');
    // await expect(headers.filter({ hasText: 'Date' })).toBeVisible();
    // await expect(headers.filter({ hasText: 'Avg Cost' })).toBeVisible();
    // await expect(headers.filter({ hasText: 'Premium Received' })).toBeVisible();
    // await expect(headers.filter({ hasText: 'Min Strike' })).toBeVisible();
    // await expect(headers.filter({ hasText: 'Shares Owned' })).toBeVisible();
    //
    // // Verify data row exists
    // const rows = table.locator('tbody tr');
    // await expect(rows.first()).toBeVisible();
    //
    // // Verify data in row
    // const firstRow = rows.first();
    // const rowText = await firstRow.textContent();
    // expect(rowText).toContain('2025-'); // Date
    // expect(rowText).toContain('140'); // Avg Cost
    // expect(rowText).toContain('2'); // Premium (or 2.00)
    // expect(rowText).toContain('138'); // Min Strike (140 - 2)
    // expect(rowText).toContain('100'); // Shares Owned
  });

  test('should sort by date correctly', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Setup: Add multiple entries on different dates
    // This test verifies table sorting

    // TODO: Implement after table is created
    // Add multiple snapshots with different dates
    // Verify table is sorted by date (ascending or descending)
  });

  test('should handle multiple tickers', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Setup: Add data for multiple tickers
    // This test verifies table can display or filter by ticker

    // TODO: Implement after table is created
    // Add snapshots for AAPL and MSFT
    // Verify table shows both or can filter by ticker
  });
});
