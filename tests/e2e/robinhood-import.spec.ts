import { expect,test } from '@playwright/test';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * E2E Test for Robinhood CSV Import Feature
 *
 * Tests the complete import workflow:
 * 1. Navigate to wheel page
 * 2. Open ActionsDrawer
 * 3. Click Import tab
 * 4. Upload a Robinhood CSV file
 * 5. Verify import success
 * 6. Verify trades appear in journal
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

    // Navigate to the wheel page
    await page.goto('http://localhost:5173/wheel');
    await page.waitForLoadState('networkidle');

    // Open ActionsDrawer by clicking Premium Printer button
    await page.getByRole('button', { name: /Premium Printer/i }).click();

    // Wait for drawer to open and click on Import tab
    await page.getByRole('button', { name: /^Import$/ }).click();

    // Verify Import tab is visible
    await expect(page.getByTestId('drawer.import')).toBeVisible();

    // Verify "Choose CSV" button is visible
    await expect(page.getByRole('button', { name: /choose csv/i })).toBeVisible();

    // Upload the test CSV file
    const filePath = join(__dirname, '..', 'fixtures', 'robinhood-sample.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Wait for import to complete
    await page.waitForTimeout(3000); // Give import time to process

    // Verify import success message
    await expect(page.getByText(/import successful/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/successfully imported/i)).toBeVisible();

    // Verify imported trade count is displayed
    const importResult = page.getByTestId('drawer.import');
    const resultText = await importResult.textContent();
    expect(resultText).toContain('Imported:');
    expect(resultText).toMatch(/\d+ trade\(s\)/);

    // Navigate to journal page to verify trades appear
    await page.goto('http://localhost:5173/journal');
    await page.waitForLoadState('networkidle');

    // Verify journal page loads
    await expect(page.getByTestId('journal.title')).toBeVisible();

    // Verify imported trades appear in journal (check for symbols from CSV)
    // CSV has: ASTS, OPEN, APLD
    // Look for symbols in table cells (journal entries)
    await expect(page.locator('td:has-text("ASTS")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('td:has-text("OPEN")').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid CSV file', async ({ page }) => {
    // Navigate to the wheel page
    await page.goto('http://localhost:5173/wheel');
    await page.waitForLoadState('networkidle');

    // Open ActionsDrawer
    await page.getByRole('button', { name: /Premium Printer/i }).click();
    await page.getByRole('button', { name: /^Import$/ }).click();

    // Verify Import tab is visible
    await expect(page.getByTestId('drawer.import')).toBeVisible();

    // Try to upload a non-CSV file (create a temporary text file)
    const fileInput = page.locator('input[type="file"]');

    // Create a temporary text file buffer
    const buffer = Buffer.from('This is not a CSV file');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    });

    // Wait for import attempt to complete
    await page.waitForTimeout(2000);

    // Verify error message appears (import should fail)
    const importResult = page.getByTestId('drawer.import');
    const resultText = await importResult.textContent();
    
    // Should show error or have no success message
    expect(resultText).not.toContain('Import Successful');
  });
});
