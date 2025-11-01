import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * E2E: Premium This Week metric
 * - Renders with dollar formatting
 * - Subtext shows legs count and remains stable after import
 */

test.describe('Wheel Page - Premium This Week', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wheel');
    await expect(page.locator('text=Marks Penny Stocks In His Socks')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(500);
  });

  test('renders and remains consistent after import', async ({ page }) => {
    const value = page.getByTestId('premium-this-week-value');
    const sub = page.getByTestId('premium-this-week-sub');

    // Initial render
    await expect(value).toBeVisible();
    const initialValue = (await value.textContent()) || '';
    expect(initialValue.trim()).toMatch(/^\$[0-9,]+(\.[0-9]{2})$/);
    await expect(sub).toContainText('Across');

    // Perform CSV import
    const testCsvPath = path.resolve(process.cwd(), 'public/sample-csv/sample-options.csv');
    expect(fs.existsSync(testCsvPath)).toBe(true);

    const importButton = page.getByTestId('wheel-import-button');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await importButton.click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(testCsvPath);

    // Wait for importing state and completion
    await expect(page.locator('button:has-text("Importing")')).toBeVisible({ timeout: 5000 });
    page.once('dialog', async d => d.accept());
    await expect(page.locator('button:has-text("Import CSV")')).toBeVisible({ timeout: 30000 });

    // Give the page a moment to recompute premium after data event
    await page.waitForTimeout(1000);

    // Re-check formatting and presence
    await expect(value).toBeVisible();
    const afterValue = (await value.textContent()) || '';
    expect(afterValue.trim()).toMatch(/^\$[0-9,]+(\.[0-9]{2})$/);
    await expect(sub).toContainText('Across');
  });
});
