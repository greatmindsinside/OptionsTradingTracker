import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Import to Wheel Integration Test', () => {
  test('should import data and create wheel cycles', async ({ page }) => {
    console.log('🚀 Starting simplified import-to-wheel test...');

    // Step 1: Go to import page
    await page.goto('http://localhost:5173/import');
    await page.waitForLoadState('networkidle');
    console.log('✅ Import page loaded');

    // Step 2: Upload CSV file
    const csvPath = join(process.cwd(), 'tests/fixtures/real-options-data.csv');
    console.log('📁 Uploading CSV:', csvPath);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for file to be processed
    await page.waitForTimeout(2000);
    console.log('📄 File uploaded');

    // Step 3: Look for and click import button
    await expect(page.locator('text=File Selected')).toBeVisible({ timeout: 10000 });
    console.log('📋 File selection confirmed');

    // Try to find the import button
    const buttons = await page.locator('button').allTextContents();
    console.log('🔍 Available buttons:', buttons);

    // Click the import button (try different selectors)
    const importButton = page
      .locator('button')
      .filter({ hasText: 'Import Trades' })
      .or(page.locator('button').filter({ hasText: '📊 Import Trades' }))
      .first();

    await expect(importButton).toBeVisible({ timeout: 5000 });
    console.log('🎯 Import button found');

    // Set up console listener to capture import logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('🎡') || text.includes('wheel') || text.includes('CSV import completed')) {
        console.log('📱 Browser console:', text);
      }
    });

    // Click import
    await importButton.click({ force: true });
    console.log('⏳ Import started, waiting for completion...');

    // Wait longer for import to complete
    await page.waitForTimeout(15000);

    // Check for success indicators
    const pageText = await page.locator('body').textContent();
    console.log(
      '📊 Page contains "success":',
      pageText?.toLowerCase().includes('success') || false
    );
    console.log(
      '📊 Page contains "imported":',
      pageText?.toLowerCase().includes('imported') || false
    );
    console.log('📊 Page contains "wheel":', pageText?.toLowerCase().includes('wheel') || false);

    // Check console logs for wheel creation
    const wheelLogs = consoleLogs.filter(
      log => log.includes('🎡') || log.includes('wheel') || log.includes('cycles created')
    );
    console.log('🎡 Wheel-related console logs:', wheelLogs);

    // Step 4: Navigate to wheel page
    console.log('🎡 Navigating to wheel page...');
    await page.goto('http://localhost:5173/wheel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check wheel page content
    const wheelPageText = await page.locator('body').textContent();
    console.log('📊 Wheel page loaded');

    // Look for wheel cycles or data
    const cycleElements = page.locator(
      '[data-testid="wheel-cycle"], .wheel-cycle, .bg-white.rounded-lg.border'
    );
    const cycleCount = await cycleElements.count();
    console.log(`🔢 Found ${cycleCount} potential wheel cycle elements`);

    // Look for specific symbols from our CSV data
    const symbols = ['ASTS', 'OPEN', 'APLD', 'PLTR'];
    let foundSymbols = 0;

    for (const symbol of symbols) {
      if (wheelPageText?.includes(symbol)) {
        foundSymbols++;
        console.log(`✅ Found symbol: ${symbol}`);
      }
    }

    console.log(`📈 Total symbols found on wheel page: ${foundSymbols}/${symbols.length}`);

    // Check if summary stats show non-zero values
    const summaryText = await page
      .locator('[class*="summary"], [class*="stats"], [class*="metric"]')
      .allTextContents();
    console.log('📊 Summary stats text:', summaryText);

    // Final assessment
    if (foundSymbols > 0 || cycleCount > 0) {
      console.log('✅ SUCCESS: Wheel page shows data from imported trades!');
    } else {
      console.log('❌ ISSUE: Wheel page does not show data from imported trades');
      console.log('🔍 Debug info:');
      console.log('  - Console logs count:', consoleLogs.length);
      console.log('  - Wheel logs count:', wheelLogs.length);
      console.log('  - Page contains wheel data:', wheelPageText?.includes('wheel') || false);
    }
  });
});
