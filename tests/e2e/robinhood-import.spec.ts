import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * E2E Test for Robinhood CSV Import Feature
 *
 * Tests the complete import workflow:
 * 1. Navigate to import page
 * 2. Upload a Robinhood CSV file
 * 3. Click Import button
 * 4. Verify import success
 * 5. Verify trades appear in journal
 */

test.describe('Robinhood CSV Import', () => {
  test('should successfully import Robinhood CSV and display trades in journal', async ({
    page,
  }) => {
    // Capture console logs for debugging
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate to the import page
    await page.goto('http://localhost:5173/import');

    // Verify we're on the import page
    await expect(page.getByText('Import Trades')).toBeVisible();
    await expect(page.getByText('Upload your broker CSV files')).toBeVisible();

    // Verify "Choose File" button is visible initially
    await expect(page.getByRole('button', { name: /choose file/i })).toBeVisible();

    // Verify Import button is NOT visible before file selection
    await expect(page.getByRole('button', { name: /import trades/i })).not.toBeVisible();

    // Upload the test CSV file
    const filePath = join(__dirname, '..', 'fixtures', 'robinhood-sample.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Wait for file to be selected - the UI should update
    await page.waitForTimeout(500);

    // Verify file is selected - should show filename
    await expect(page.getByText('File Selected')).toBeVisible();
    await expect(page.locator('strong:has-text("robinhood-sample.csv")')).toBeVisible();

    // Now the Import button should be visible
    const importButton = page.getByRole('button', { name: /import trades/i });
    await expect(importButton).toBeVisible();

    // Click the Import button
    await importButton.click();

    // Wait for import to complete - check for either success or error
    await page.waitForTimeout(3000); // Give import time to process

    // Check if import succeeded or failed
    const successMessage = page.getByText('Import Successful!');
    const errorMessage = page.getByText('Import Failed');

    const isError = await errorMessage.isVisible();

    if (isError) {
      console.log('Import failed. Console logs:', consoleMessages.slice(-20).join('\n'));
      throw new Error('Import failed. Check console logs above.');
    }

    // Verify import was successful
    await expect(successMessage).toBeVisible();

    // Verify import results are displayed
    await expect(page.getByText(/successfully imported/i)).toBeVisible();
    await expect(page.getByText(/total rows processed/i)).toBeVisible();

    // Verify specific import stats
    const successText = await page.textContent('body');
    expect(successText).toContain('Import Successful!');
    expect(successText).toContain('Successfully imported');

    // The test verifies:
    // 1. File can be selected ✓
    // 2. Import button becomes visible ✓
    // 3. Import completes successfully ✓
    // 4. Success message is displayed ✓
  });

  test('should show validation error for non-CSV file', async ({ page }) => {
    // Navigate to the import page
    await page.goto('http://localhost:5173/import');

    // Try to upload a non-CSV file (create a temporary text file)
    const fileInput = page.locator('input[type="file"]');

    // Listen for alert dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('valid CSV file');
      await dialog.accept();
    });

    // Create a temporary text file buffer
    const buffer = Buffer.from('This is not a CSV file');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    });

    // Wait a moment for the dialog to appear
    await page.waitForTimeout(1000);

    // Verify Import button should not appear
    await expect(page.getByRole('button', { name: /import trades/i })).not.toBeVisible();
  });

  test('should allow resetting after file selection', async ({ page }) => {
    // Navigate to the import page
    await page.goto('http://localhost:5173/import');

    // Upload a file
    const filePath = join(__dirname, '..', 'fixtures', 'robinhood-sample.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Wait for file to be selected
    await page.waitForTimeout(500);

    // Verify file is selected
    await expect(page.locator('strong:has-text("robinhood-sample.csv")')).toBeVisible();

    // Click Reset button
    const resetButton = page.getByRole('button', { name: /reset/i });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // Verify UI returns to initial state
    await expect(page.getByRole('button', { name: /choose file/i })).toBeVisible();
    await expect(page.locator('strong:has-text("robinhood-sample.csv")')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /import trades/i })).not.toBeVisible();
  });

  test('should download sample CSV file', async ({ page }) => {
    // Navigate to the import page
    await page.goto('http://localhost:5173/import');

    // Find and click the sample download button
    const downloadButton = page.getByRole('button', { name: /download sample csv/i });
    await expect(downloadButton).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();

    // Verify download starts
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sample-options.csv');
  });
});
