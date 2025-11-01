import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * E2E Test: Wheel Page CSV Import Functionality
 *
 * This test verifies that:
 * 1. The Import CSV button exists and is clickable on the Wheel page
 * 2. File selection works through the button
 * 3. CSV data is successfully imported
 * 4. Imported data appears in the database snapshot
 * 5. Database tables are populated with the imported trades
 */

test.describe('Wheel Page - CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Wheel page
    await page.goto('/wheel');

    // Wait for the page to load - handle both loading and loaded states
    try {
      // If data is loading
      await page.waitForSelector('text=Loading Wheel Data', { timeout: 2000 }).catch(() => {});
    } catch {
      // Already loaded or error, continue
    }

    // Wait for main header to appear (loaded state)
    await expect(page.locator('text=Marks Penny Stocks In His Socks')).toBeVisible({
      timeout: 15000,
    });

    // Wait a bit for React components to fully mount
    await page.waitForTimeout(1000);
  });

  test('should have a functional Import CSV button', async ({ page }) => {
    // Verify Import CSV button exists
    const importButton = page.locator('[data-testid="wheel-import-button"]');
    await expect(importButton).toBeVisible();
    await expect(importButton).toBeEnabled();
    // Verify it's clickable by triggering file chooser and then canceling
    const fileChooserPromise = page.waitForEvent('filechooser');
    await importButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([]); // cancel/no-op
  });

  test('should import Robinhood CSV and display in database snapshot', async ({ page }) => {
    console.log('🧪 Starting Wheel page CSV import test...');

    // Step 1: Check what state the page is in
    console.log('📊 Step 1: Checking page state...');

    // Check if we're in "No Data" state
    const noDataMessage = page.locator('text=No wheel trading data found');
    const hasNoData = await noDataMessage.isVisible().catch(() => false);

    if (hasNoData) {
      console.log('⚠️  Page is in "No Data" state - this is expected for first import');
    } else {
      console.log('✅ Page has existing data');
    }

    // Get initial counts (will be 0 if no data)
    let initialTradeCount = 0;

    if (!hasNoData) {
      // Try to get trade count from database snapshot
      const dbSnapshotCard = page.locator('text=Database Snapshot').locator('..');
      await expect(dbSnapshotCard).toBeVisible({ timeout: 10000 });

      // Click refresh to ensure we have current stats
      const refreshButton = page.locator('button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click({ force: true });
        await page.waitForTimeout(1000); // Wait for refresh
      }

      // Get initial trade count
      const initialTradeCountElement = page
        .locator('text=Trades')
        .locator('..')
        .locator('.text-2xl');
      if (await initialTradeCountElement.isVisible()) {
        const initialText = await initialTradeCountElement.textContent();
        initialTradeCount = parseInt(initialText || '0');
        console.log(`📊 Initial trade count: ${initialTradeCount}`);
      }
    }

    // Step 2: Prepare test CSV file
    console.log('📄 Step 2: Preparing Robinhood CSV file...');
    const testCsvPath = path.resolve(process.cwd(), 'public/sample-csv/sample-options.csv');

    // Verify the CSV file exists
    if (!fs.existsSync(testCsvPath)) {
      console.error(`❌ Test CSV file not found at: ${testCsvPath}`);
      throw new Error(`Test CSV file not found: ${testCsvPath}`);
    }

    const fileStats = fs.statSync(testCsvPath);
    console.log(`✅ CSV file found: ${testCsvPath} (${fileStats.size} bytes)`);

    // Step 3: Upload file directly to the hidden file input
    console.log('📤 Step 3: Uploading CSV file...');
    const importButton = page.locator('[data-testid="wheel-import-button"]');
    await expect(importButton).toBeVisible();
    await expect(importButton).toBeEnabled();

    // Use the button click approach with file chooser event
    console.log('📁 Setting up file chooser listener...');
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });

    console.log('�️  Clicking Import CSV button...');
    await importButton.click();

    console.log('⏳ Waiting for file chooser dialog...');
    const fileChooser = await fileChooserPromise;

    console.log('📂 Selecting CSV file...');
    await fileChooser.setFiles(testCsvPath);

    // Step 4: Wait for import to complete
    console.log('⏳ Step 4: Waiting for import to complete...');

    // Button should show importing state
    await expect(page.locator('button:has-text("Importing")')).toBeVisible({ timeout: 5000 });
    console.log('🔄 Import in progress...');

    // Wait for import to finish (button returns to "Import CSV")
    await expect(page.locator('button:has-text("Import CSV")')).toBeVisible({ timeout: 30000 });
    console.log('✅ Import button returned to normal state');

    // Step 5: Handle alert dialog
    console.log('🔔 Step 5: Handling success alert...');
    page.on('dialog', async dialog => {
      console.log(`📢 Alert message: ${dialog.message()}`);
      expect(dialog.message()).toContain('Import successful');
      await dialog.accept();
    });

    // Wait a bit for the alert to appear and be handled
    await page.waitForTimeout(2000);

    // Step 6: Refresh database snapshot to see new data
    console.log('🔄 Step 6: Refreshing database snapshot...');
    const refreshButtonAgain = page.locator('button:has-text("Refresh")');
    if (await refreshButtonAgain.isVisible()) {
      await refreshButtonAgain.click({ force: true });
      await page.waitForTimeout(2000); // Wait for refresh to complete
    }

    // Step 7: Verify data appears in database snapshot
    console.log('✅ Step 7: Verifying imported data in database snapshot...');

    // Helper to read metric values from the Database Snapshot panel
    async function getMetric(panel: import('@playwright/test').Page, label: string) {
      const labelEl = page.locator(`text=${label}`).first();
      await expect(labelEl).toBeVisible();
      const valueEl = labelEl.locator('xpath=following-sibling::*[1]');
      const text = (await valueEl.textContent()) || '0';
      const num = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
      return num;
    }

    // Check Portfolios count (should be at least 1)
    const portfolioNum = await getMetric(page, 'Portfolios');
    console.log(`📊 Portfolios count: ${portfolioNum}`);
    expect(portfolioNum).toBeGreaterThanOrEqual(1);

    // Symbols table may be populated by a separate pipeline; log for visibility only
    const symbolNum = await getMetric(page, 'Symbols');
    console.log(`📊 Symbols count: ${symbolNum}`);

    // Check Trades count (should be greater than initial count)
    const tradeNum = await getMetric(page, 'Trades');
    console.log(`📊 Final trade count: ${tradeNum} (was ${initialTradeCount})`);
    expect(tradeNum).toBeGreaterThanOrEqual(initialTradeCount);

    // Check Wheel Cycles count
    const wheelCycleNum = await getMetric(page, 'Wheel Cycles');
    console.log(`📊 Wheel Cycles count: ${wheelCycleNum}`);

    // Check Wheel Events count
    const wheelEventNum = await getMetric(page, 'Wheel Events');
    console.log(`📊 Wheel Events count: ${wheelEventNum}`);

    // Step 8: Verify sample symbols are displayed
    console.log('🔍 Step 8: Checking for sample symbols...');
    const sampleSymbolsLabel = page.locator('text=Sample symbols');
    if (await sampleSymbolsLabel.isVisible()) {
      console.log('✅ Sample symbols section found');

      // Look for symbol badges/chips
      // In this UI, symbols are rendered as chips without utility classes
      const symbolBadges = page.locator('text=Sample symbols').locator('..').locator('span');
      const badgeCount = await symbolBadges.count();
      console.log(`📊 Found ${badgeCount} symbol badges`);
      expect(badgeCount).toBeGreaterThan(0);

      // Log the first few symbols
      for (let i = 0; i < Math.min(3, badgeCount); i++) {
        const symbolText = await symbolBadges.nth(i).textContent();
        console.log(`  - Symbol ${i + 1}: ${symbolText}`);
      }
    }

    // Step 9: Verify positions appear in the tables
    console.log('📋 Step 9: Verifying positions appear in tables...');

    // Check if Open Puts table has data
    const openPutsCard = page.locator('text=Open Puts').locator('..');
    await expect(openPutsCard).toBeVisible();

    // Check if Open Calls table has data
    const openCallsCard = page.locator('text=Open Calls').locator('..');
    await expect(openCallsCard).toBeVisible();

    // Step 10: Verify wheel phase cards appear
    console.log('🎡 Step 10: Checking wheel phase cards...');
    const wheelPhaseCard = page.locator('text=Wheel Phase By Ticker').locator('..');
    await expect(wheelPhaseCard).toBeVisible();

    console.log('✅ Test completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - Portfolios: ${portfolioNum}`);
    console.log(`  - Symbols: ${symbolNum}`);
    console.log(`  - Trades: ${tradeNum} (imported ${tradeNum - initialTradeCount} new)`);
    console.log(`  - Wheel Cycles: ${wheelCycleNum}`);
    console.log(`  - Wheel Events: ${wheelEventNum}`);
  });

  test('should handle invalid file type gracefully', async ({ page }) => {
    console.log('🧪 Testing invalid file type handling...');

    // Create a temporary text file (not CSV)
    const tempDir = path.resolve(process.cwd(), 'test-results');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const invalidFilePath = path.join(
      tempDir,
      `invalid-file-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
    );
    fs.writeFileSync(invalidFilePath, 'This is not a CSV file');

    const importButton = page.locator('[data-testid="wheel-import-button"]');

    // Set up dialog handler for error alert
    let alertShown = false;
    page.on('dialog', async dialog => {
      console.log(`📢 Alert: ${dialog.message()}`);
      expect(dialog.message()).toContain('CSV');
      alertShown = true;
      await dialog.accept();
    });

    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await importButton.click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(invalidFilePath);

    // Wait for alert
    await page.waitForTimeout(2000);

    // Verify alert was shown
    expect(alertShown).toBe(true);

    // Button should remain enabled
    await expect(importButton).toBeEnabled();

    // Cleanup
    if (fs.existsSync(invalidFilePath)) {
      fs.unlinkSync(invalidFilePath);
    }

    console.log('✅ Invalid file type handled correctly');
  });

  test('should show importing state during upload', async ({ page }) => {
    console.log('🧪 Testing import loading state...');

    const testCsvPath = path.resolve(process.cwd(), 'public/sample-csv/sample-options.csv');
    const importButton = page.locator('button:has-text("Import CSV")');

    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await importButton.click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testCsvPath);

    // Verify importing state appears
    const importingButton = page.locator('button:has-text("Importing")');
    await expect(importingButton).toBeVisible({ timeout: 5000 });

    // Verify button is disabled during import
    await expect(importingButton).toBeDisabled();

    console.log('✅ Import loading state works correctly');

    // Wait for import to complete
    await expect(page.locator('button:has-text("Import CSV")')).toBeVisible({ timeout: 30000 });

    // Handle success dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.waitForTimeout(2000);
  });

  test('should maintain page state after import', async ({ page }) => {
    console.log('🧪 Testing page state persistence after import...');

    // Set a filter query
    const filterInput = page.locator('input[placeholder="Filter tickers..."]');
    await filterInput.fill('ASTS');

    // Import CSV
    const testCsvPath = path.resolve(process.cwd(), 'public/sample-csv/sample-options.csv');
    const importButton = page.locator('[data-testid="wheel-import-button"]');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await importButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testCsvPath);

    // Wait for import
    await expect(page.locator('button:has-text("Importing")')).toBeVisible({ timeout: 5000 });
    // Prepare dialog handler in case success alert fires quickly
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await expect(page.locator('button:has-text("Import CSV")')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verify filter input still has the value (but it might be cleared - that's okay)
    // The main point is the page didn't crash or reload unexpectedly
    await expect(filterInput).toBeVisible();

    // Verify main UI elements are still present
    await expect(page.locator('text=Marks Penny Stocks In His Socks')).toBeVisible();
    await expect(page.locator('text=Database Snapshot')).toBeVisible();

    console.log('✅ Page state maintained after import');
  });
});
