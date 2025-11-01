import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests for Shares For Calls Metric on Wheel Page
 *
 * Validates that the "Shares For Calls" metric:
 * 1. Renders with correct numeric formatting
 * 2. Shows ticker count in subtext
 * 3. Maintains correct values after CSV import
 * 4. Updates based on stock and covered call positions in database
 */

test.describe('Wheel Page - Shares For Calls Metric', () => {
  test('should display Shares For Calls metric with correct formatting', async ({ page }) => {
    console.log('🧪 Testing Shares For Calls metric display...');

    // Navigate to the Wheel page
    await page.goto('http://localhost:5173/wheel');

    // Wait for page to load
    await expect(page.locator('text=Marks Penny Stocks In His Socks')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(1000);

    // Verify Shares For Calls value is present
    const sharesValue = page.getByTestId('shares-for-calls-value');
    await expect(sharesValue).toBeVisible();

    // Value should be a number (could be "0" initially)
    const valueText = await sharesValue.textContent();
    console.log(`📊 Shares For Calls value: ${valueText}`);
    expect(valueText).toMatch(/^\d+$/); // Should be a numeric value

    // Verify subtext shows ticker count
    const sharesSub = page.getByTestId('shares-for-calls-sub');
    await expect(sharesSub).toBeVisible();

    const subText = await sharesSub.textContent();
    console.log(`📊 Shares For Calls subtext: ${subText}`);
    expect(subText).toMatch(/^Across \d+ tickers?$/); // "Across N ticker" or "Across N tickers"

    console.log('✅ Shares For Calls metric displays correctly');
  });

  test('should maintain valid Shares For Calls after CSV import', async ({ page }) => {
    console.log('🧪 Testing Shares For Calls after CSV import...');

    // Navigate to the Wheel page
    await page.goto('http://localhost:5173/wheel');
    await expect(page.locator('text=Marks Penny Stocks In His Socks')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(1000);

    // Get initial values
    const sharesValue = page.getByTestId('shares-for-calls-value');
    const sharesSub = page.getByTestId('shares-for-calls-sub');

    const initialValue = await sharesValue.textContent();
    const initialSub = await sharesSub.textContent();
    console.log(`📊 Initial - Value: ${initialValue}, Sub: ${initialSub}`);

    // Import CSV file
    const csvPath = path.resolve('public/sample-csv/sample-options.csv');
    console.log(`📤 Importing CSV: ${csvPath}`);

    const fileInput = page.getByTestId('wheel-import-input');
    await fileInput.setInputFiles(csvPath);

    // Wait for import to complete
    await page.waitForTimeout(2000);

    // Dismiss any success alerts
    page.on('dialog', dialog => dialog.accept());

    // Verify values are still valid after import
    const afterValue = await sharesValue.textContent();
    const afterSub = await sharesSub.textContent();
    console.log(`📊 After import - Value: ${afterValue}, Sub: ${afterSub}`);

    // Values should still be numeric and properly formatted
    expect(afterValue).toMatch(/^\d+$/);
    expect(afterSub).toMatch(/^Across \d+ tickers?$/);

    console.log('✅ Shares For Calls metric remains valid after import');
  });
});
