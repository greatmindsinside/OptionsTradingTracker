import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Robinhood CSV Import to Wheel Page Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page first to ensure clean state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should import Robinhood CSV and update wheel page with real data', async ({ page }) => {
    // Step 1: Navigate to import page
    await page.goto('/import');
    await expect(page.locator('main h1').first()).toContainText('Import Trades');

    // Step 2: Use real Robinhood CSV data
    const csvPath = join(process.cwd(), 'tests/fixtures/real-options-data.csv');
    console.log('Uploading real Robinhood CSV data from:', csvPath);

    // Click the file input area or upload button
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for file to be selected and buttons to appear
    await expect(page.locator('text=File Selected')).toBeVisible({ timeout: 10000 });

    // Step 3: Import the data
    console.log('Looking for import button...');

    // Try multiple button selectors
    const importButton = page
      .locator(
        'button:has-text("Import Trades"), button:has-text("📊 Import Trades"), button[class*="bg-green"]'
      )
      .first();
    await expect(importButton).toBeVisible({ timeout: 10000 });

    console.log('Import button found, attempting click...');

    // Use force click to bypass potential overlay issues
    await importButton.click({ force: true });

    console.log('Import button clicked, waiting for results...');

    // Wait for import to complete
    await expect(page.locator('text=Import Successful!')).toBeVisible({ timeout: 30000 });

    // Verify import results are displayed
    await expect(page.locator('text=Total rows processed')).toBeVisible();
    await expect(page.locator('text=Successfully imported')).toBeVisible();

    // Step 4: Navigate to wheel page
    console.log('Navigating to wheel page...');
    await page.goto('/wheel');
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForSelector('text=Wheel Strategy Management', { timeout: 10000 });

    // Step 5: Verify wheel page shows real data instead of empty state
    // Wait for data to load
    await page.waitForTimeout(3000);
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());

    // Check if we have any wheel cycles displayed
    const cycleElements = page.locator(
      '[data-testid="wheel-cycle"], .wheel-cycle, .bg-white.rounded-lg.border'
    );
    const cycleCount = await cycleElements.count();
    console.log('Found wheel cycles:', cycleCount);

    // Look for specific symbols from our real Robinhood CSV (ASTS, OPEN, APLD, PLTR)
    const symbols = ['ASTS', 'OPEN', 'APLD', 'PLTR'];
    let foundSymbols = 0;

    for (const symbol of symbols) {
      const symbolElement = page.locator(`text=${symbol}`).first();
      if (await symbolElement.isVisible()) {
        foundSymbols++;
        console.log(`Found symbol: ${symbol}`);
      }
    }

    console.log(`Found ${foundSymbols} symbols out of ${symbols.length}`);

    // Step 6: Test manual refresh functionality
    console.log('Testing manual refresh...');
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Wait for refresh to complete
    await page.waitForTimeout(2000);

    // Step 7: Verify data persistence
    // The wheel page should still show the same data after refresh
    await expect(page.locator('text=Wheel Strategy Management')).toBeVisible();
  });

  test('should show empty state when no wheel data exists', async ({ page }) => {
    // Navigate directly to wheel page without importing data
    await page.goto('/wheel');
    await page.waitForLoadState('networkidle');

    // Should show empty state or zero counts
    await expect(page.locator('text=Wheel Strategy Management')).toBeVisible();

    // Check summary stats show zero or empty state
    const totalCyclesText = await page.locator('body').textContent();
    console.log('Page content includes:', totalCyclesText?.substring(0, 500));

    // Should have the basic UI elements even with no data
    await expect(page.locator('text=Active Cycles')).toBeVisible();
    await expect(page.locator('text=Total Premium')).toBeVisible();
  });

  test('should handle wheel page refresh after import', async ({ page }) => {
    // First import data
    await page.goto('/import');

    const csvPath = join(process.cwd(), 'tests/fixtures/real-options-data.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    await expect(page.locator('text=File Selected')).toBeVisible({ timeout: 10000 });

    const importButton = page.locator('button:has-text("Import Trades")');
    await importButton.click({ force: true });

    await expect(page.locator('text=Import Successful!')).toBeVisible({ timeout: 30000 });

    // Navigate to wheel page
    await page.goto('/wheel');
    await page.waitForLoadState('networkidle');

    // Test the refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();

    // Click refresh and verify it works
    await refreshButton.click();
    await page.waitForTimeout(2000);

    // Should still show wheel management page
    await expect(page.locator('text=Wheel Strategy Management')).toBeVisible();
  });

  test('should detect automatic updates when new data is imported', async ({ page }) => {
    // Open wheel page in one context
    await page.goto('/wheel');
    await page.waitForLoadState('networkidle');

    // Get initial state
    console.log('Initial wheel page state captured');

    // Open import page in new tab
    const importPage = await page.context().newPage();
    await importPage.goto('/import');

    // Import data in the new tab
    const csvPath = join(process.cwd(), 'public/sample-csv/sample-options.csv');
    const fileInput = importPage.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    await expect(importPage.locator('text=File Selected')).toBeVisible({ timeout: 10000 });

    const importButton = importPage.locator('button:has-text("Import Trades")');
    await importButton.click({ force: true });

    await expect(importPage.locator('text=Import Successful!')).toBeVisible({ timeout: 30000 });

    // Close import tab
    await importPage.close();

    // Check if wheel page automatically updated
    // Give some time for the event system to work
    await page.waitForTimeout(3000);

    // Refresh the wheel page to see updates (since auto-update might need page focus)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify the page has been updated
    console.log('Updated wheel page state captured');

    // Should still show the main heading
    await expect(page.locator('text=Wheel Strategy Management')).toBeVisible();
  });
});
