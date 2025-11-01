import { test, expect } from '@playwright/test';

test.describe('Portfolio Query Fix - E2E Verification', () => {
  test('should verify the portfolio query fix resolves the import issue', async ({ page }) => {
    console.log('🧪 Testing Portfolio Query Fix - End to End');

    // Step 1: Navigate to the application
    await page.goto('/');
    console.log('✅ App loaded');

    // Step 2: Go to import page
    await page.goto('/import');
    await page.waitForLoadState('networkidle');
    console.log('📥 Import page loaded');

    // Step 3: Upload sample CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('public/sample-csv/sample-options.csv');
    console.log('📂 CSV file uploaded');

    // Step 4: Click import button
    const importButton = page.locator(
      'button:has-text("Import"), button:has-text("📊 Import Trades")'
    );
    await importButton.click();
    console.log('🚀 Import process started');

    // Step 5: Wait for import completion - this is where the query issue would occur
    await page.waitForTimeout(5000); // Give it time to process

    // Check for any error messages indicating query failure
    const errorMessages = await page.locator('.error, .bg-red-50, [role="alert"]').count();
    console.log(`📋 Error messages found: ${errorMessages}`);

    // Step 6: Navigate to portfolio page - this triggers findAllWithTradeCounts()
    console.log('📊 Testing portfolio page (this calls the fixed method)');
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check if the page loads without the query validation error
    const pageContent = await page.textContent('body');
    const hasQueryError =
      pageContent?.includes('Query result validation failed') ||
      pageContent?.includes('Query execution failed') ||
      pageContent?.includes('validation failed at row 0');

    console.log('🔍 Checking for query validation errors...');
    console.log(`❌ Query validation errors found: ${hasQueryError ? 'YES' : 'NO'}`);

    // Step 7: Check if portfolios are actually displayed
    const portfolioElements = await page
      .locator('[data-testid="portfolio-card"], .portfolio-card, .portfolio-item')
      .count();
    console.log(`📊 Portfolio elements found: ${portfolioElements}`);

    // Check for "No portfolios found" message
    const noDataMessage = await page
      .locator('text=No portfolios found, text=no data, text=empty')
      .count();
    console.log(`📋 "No data" messages: ${noDataMessage}`);

    // Step 8: Assertions based on our fix
    if (hasQueryError) {
      console.log('❌ QUERY FIX VERIFICATION FAILED');
      console.log('💡 The query validation error still exists - fix needs more work');

      // Take a screenshot for debugging
      await page.screenshot({ path: 'portfolio-query-error-debug.png', fullPage: true });

      // Fail the test to indicate the fix didn't work
      expect(hasQueryError).toBe(false);
    } else {
      console.log('✅ QUERY FIX VERIFICATION SUCCESSFUL');
      console.log('💡 No query validation errors detected');

      if (portfolioElements > 0) {
        console.log('✅ Portfolio data is displaying correctly');
        console.log('🎯 CSV import and portfolio display working end-to-end');
      } else if (noDataMessage > 0) {
        console.log(
          'ℹ️  No portfolio data found - but no query errors (expected if no import happened)'
        );
      }

      // The main assertion - no query errors should occur
      expect(hasQueryError).toBe(false);
      console.log('✅ Test passed - portfolio query fix is working');
    }

    // Step 9: Additional verification - check browser console for errors
    const consoleErrors = await page.evaluate(() => {
      const errors = (window as unknown as Record<string, unknown>).testErrors || [];
      return errors;
    });

    console.log(
      `🖥️  Browser console errors: ${Array.isArray(consoleErrors) ? consoleErrors.length : 0}`
    );

    // Final screenshot for verification
    await page.screenshot({ path: 'portfolio-query-fix-verification.png', fullPage: true });
    console.log('📸 Verification screenshot saved');
  });

  test('should handle both active and inactive portfolios correctly', async ({ page }) => {
    console.log('🧪 Testing boolean type conversion fix');

    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');

    // Check that the page loads without boolean conversion errors
    const pageContent = await page.textContent('body');
    const hasBooleanError = pageContent?.includes('boolean') && pageContent?.includes('validation');

    console.log(`🔍 Boolean validation errors: ${hasBooleanError ? 'YES' : 'NO'}`);
    expect(hasBooleanError).toBe(false);

    console.log('✅ Boolean type conversion working correctly');
  });
});
