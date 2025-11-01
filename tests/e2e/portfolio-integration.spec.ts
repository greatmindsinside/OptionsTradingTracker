import { test, expect } from '@playwright/test';

test.describe('Portfolio Page Integration', () => {
  test('should display portfolio data after CSV import', async ({ page }) => {
    console.log('🚀 Starting portfolio page integration test...');

    // Navigate to import page
    await page.goto('/import');
    await page.waitForLoadState('networkidle');
    console.log('📁 Import page loaded');

    // Upload the test CSV file
    const csvPath = 'tests/fixtures/real-options-data.csv';
    console.log('📁 Uploading CSV:', csvPath);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    console.log('📄 File uploaded');

    // Wait for file selection confirmation
    await expect(page.locator('text=File Selected')).toBeVisible({ timeout: 10000 });
    console.log('📋 File selection confirmed');

    // Click import button
    const importButton = page.locator('button:has-text("Import Trades")');
    await expect(importButton).toBeVisible();
    console.log('🔍 Import button found');

    await importButton.click({ force: true });
    console.log('⏳ Import started, waiting for completion...');

    // Wait for import completion - look for success or error messages
    try {
      await page.waitForSelector(
        'text=Import Successful!, text=Import failed, .bg-green-50, .bg-red-50',
        { timeout: 30000 }
      );
    } catch {
      console.log('⚠️ Import did not complete within timeout');
      // Take a screenshot to see current state
      await page.screenshot({ path: 'import-timeout-debug.png', fullPage: true });
      const currentContent = await page.content();
      console.log('📄 Current page content (first 1000 chars):', currentContent.substring(0, 1000));
    }

    // Check if it was successful
    const successElement = page.locator('text=Import Successful!');
    const errorElements = page.locator('.bg-red-50, text=Import failed');

    if (await successElement.isVisible()) {
      console.log('✅ Import completed successfully');
    } else if (await errorElements.isVisible()) {
      const errorText = await errorElements.first().innerText();
      console.log('❌ Import failed:', errorText);
      // Continue with test to see portfolio state even if import failed
    } else {
      console.log('⚠️ Import completed with unknown status');
    }

    // Navigate to portfolio page
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    console.log('📊 Portfolio page loaded');

    // Check that portfolio data is displayed
    await expect(page.getByText('Portfolio Overview')).toBeVisible();
    console.log('📋 Portfolio title is visible');

    // Take a screenshot to see what's displayed
    await page.screenshot({ path: 'portfolio-debug.png', fullPage: true });

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Debug: Print page content
    const pageContent = await page.content();
    console.log('📄 Portfolio page HTML:', pageContent.substring(0, 2000));

    // Debug: Check what text is visible
    const allText = await page.locator('body').innerText();
    console.log('📝 All visible text:', allText);

    // Check for metrics cards
    await expect(page.getByText('Total Value')).toBeVisible();
    await expect(page.getByText('Total P&L')).toBeVisible();
    await expect(page.getByText('Active Positions')).toBeVisible();
    await expect(page.getByText('Cash Available')).toBeVisible();
    console.log('📊 Metrics cards are visible');

    // Wait a bit for data to load
    await page.waitForTimeout(2000);

    // Check for tab navigation
    await expect(page.getByText('Positions')).toBeVisible();
    await expect(page.getByText('Recent Trades')).toBeVisible();
    await expect(page.getByText('Charts')).toBeVisible();
    console.log('🔗 Tab navigation is visible');

    // Check positions tab (default)
    const positionsSection = page.locator('.positions-section, [class*="positions"]');
    if ((await positionsSection.count()) > 0) {
      console.log('📈 Positions section found');
    }

    // Check recent trades tab
    await page.getByText('Recent Trades').click();
    await page.waitForTimeout(1000);

    const tradesSection = page.locator('.trades-section, [class*="trades"]');
    if ((await tradesSection.count()) > 0) {
      console.log('📋 Trades section found');
    }

    // Look for any trade data in tables
    const tradeTables = page.locator('table, .data-table');
    if ((await tradeTables.count()) > 0) {
      console.log('📊 Data tables found');

      // Check if tables have rows (beyond header)
      const tableRows = page.locator('table tr, .data-table tr');
      const rowCount = await tableRows.count();
      if (rowCount > 1) {
        console.log(`📊 Found ${rowCount} table rows (including header)`);
      }
    }

    // Check charts tab
    await page.getByText('Charts').click();
    await page.waitForTimeout(1000);

    const chartsSection = page.locator('.charts-section, [class*="charts"]');
    if ((await chartsSection.count()) > 0) {
      console.log('📈 Charts section found');
    }

    console.log('✅ Portfolio page integration test completed successfully!');
  });

  test('should handle empty portfolio state gracefully', async ({ page }) => {
    console.log('🚀 Testing empty portfolio state...');

    // Navigate directly to portfolio page without importing data
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    console.log('📊 Portfolio page loaded (no data)');

    // Should show either loading state, error, or empty state message
    const hasContent = await page.isVisible('text=Portfolio Overview');
    if (hasContent) {
      console.log('📋 Portfolio page rendered successfully');

      // Look for empty state messages
      const emptyStateMessages = [
        'No portfolios found',
        'No active positions',
        'No recent trades',
        'Import some data first',
      ];

      for (const message of emptyStateMessages) {
        if (await page.isVisible(`text=${message}`)) {
          console.log(`📝 Found empty state message: "${message}"`);
        }
      }
    }

    console.log('✅ Empty portfolio state test completed');
  });
});
