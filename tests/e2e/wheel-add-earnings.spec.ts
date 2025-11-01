/**
 * E2E tests for adding earnings dates to stocks on the wheel page
 */
import { test, expect } from '@playwright/test';

test.describe('Wheel Page - Add Earnings Date', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wheel');
    await page.waitForLoadState('networkidle');
  });

  test('should show add earnings button in header', async ({ page }) => {
    const addEarningsButton = page.getByTestId('add-earnings-button');
    await expect(addEarningsButton).toBeVisible();
    await expect(addEarningsButton).toHaveText(/📅 Add Earnings/);
  });

  test('should display earnings input form when add earnings button is clicked', async ({
    page,
  }) => {
    await page.getByTestId('add-earnings-button').click();

    // Form inputs should appear
    await expect(page.getByTestId('add-earnings-symbol-input')).toBeVisible();
    await expect(page.getByTestId('add-earnings-date-input')).toBeVisible();
    await expect(page.getByTestId('add-earnings-submit')).toBeVisible();
    await expect(page.getByTestId('add-earnings-cancel')).toBeVisible();

    // Add earnings button should be hidden
    await expect(page.getByTestId('add-earnings-button')).not.toBeVisible();
  });

  test('should add earnings date for existing stock', async ({ page }) => {
    // First add a test stock
    await page.getByTestId('add-stock-button').click();
    const timestamp = Date.now();
    const testSymbol = `TEST${timestamp}`;
    await page.getByTestId('add-stock-input').fill(testSymbol);
    await page.getByTestId('add-stock-submit').click();

    // Wait for success alert and dismiss it
    page.once('dialog', dialog => dialog.accept());
    await page.waitForTimeout(500);

    // Now add earnings date
    await page.getByTestId('add-earnings-button').click();
    await page.getByTestId('add-earnings-symbol-input').fill(testSymbol);

    // Set earnings date to 7 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const earningsDate = futureDate.toISOString().split('T')[0];
    await page.getByTestId('add-earnings-date-input').fill(earningsDate);

    // Submit
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain(`Successfully`);
      expect(dialog.message()).toContain(testSymbol);
      dialog.accept();
    });
    await page.getByTestId('add-earnings-submit').click();

    // Form should close
    await expect(page.getByTestId('add-earnings-symbol-input')).not.toBeVisible();
  });

  test('should show error for non-existent stock', async ({ page }) => {
    await page.getByTestId('add-earnings-button').click();

    // Try to add earnings for a non-existent symbol
    await page.getByTestId('add-earnings-symbol-input').fill('NONEXIST');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const earningsDate = futureDate.toISOString().split('T')[0];
    await page.getByTestId('add-earnings-date-input').fill(earningsDate);

    // Should show error dialog
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('not found');
      dialog.accept();
    });
    await page.getByTestId('add-earnings-submit').click();
  });

  test('should cancel earnings date entry', async ({ page }) => {
    await page.getByTestId('add-earnings-button').click();

    // Fill in some data
    await page.getByTestId('add-earnings-symbol-input').fill('AAPL');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.getByTestId('add-earnings-date-input').fill(futureDate.toISOString().split('T')[0]);

    // Click cancel
    await page.getByTestId('add-earnings-cancel').click();

    // Form should close
    await expect(page.getByTestId('add-earnings-symbol-input')).not.toBeVisible();
    await expect(page.getByTestId('add-earnings-button')).toBeVisible();
  });

  test('should submit earnings date with Enter key', async ({ page }) => {
    // First add a test stock
    await page.getByTestId('add-stock-button').click();
    const timestamp = Date.now();
    const testSymbol = `TEST${timestamp}`;
    await page.getByTestId('add-stock-input').fill(testSymbol);
    await page.getByTestId('add-stock-submit').click();

    // Wait for success alert and dismiss it
    page.once('dialog', dialog => dialog.accept());
    await page.waitForTimeout(500);

    // Add earnings with Enter key
    await page.getByTestId('add-earnings-button').click();
    await page.getByTestId('add-earnings-symbol-input').fill(testSymbol);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const earningsDate = futureDate.toISOString().split('T')[0];
    await page.getByTestId('add-earnings-date-input').fill(earningsDate);

    // Press Enter
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain(`Successfully`);
      dialog.accept();
    });
    await page.getByTestId('add-earnings-date-input').press('Enter');

    // Form should close
    await expect(page.getByTestId('add-earnings-symbol-input')).not.toBeVisible();
  });

  test('should update existing earnings date', async ({ page }) => {
    // First add a test stock
    await page.getByTestId('add-stock-button').click();
    const timestamp = Date.now();
    const testSymbol = `TEST${timestamp}`;
    await page.getByTestId('add-stock-input').fill(testSymbol);
    await page.getByTestId('add-stock-submit').click();
    page.once('dialog', dialog => dialog.accept());
    await page.waitForTimeout(500);

    // Add first earnings date
    await page.getByTestId('add-earnings-button').click();
    await page.getByTestId('add-earnings-symbol-input').fill(testSymbol);
    let futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.getByTestId('add-earnings-date-input').fill(futureDate.toISOString().split('T')[0]);
    page.once('dialog', dialog => dialog.accept());
    await page.getByTestId('add-earnings-submit').click();
    await page.waitForTimeout(500);

    // Update with a different date
    await page.getByTestId('add-earnings-button').click();
    await page.getByTestId('add-earnings-symbol-input').fill(testSymbol);
    futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    await page.getByTestId('add-earnings-date-input').fill(futureDate.toISOString().split('T')[0]);

    page.once('dialog', dialog => {
      expect(dialog.message()).toContain(`Successfully`);
      dialog.accept();
    });
    await page.getByTestId('add-earnings-submit').click();
  });
});
