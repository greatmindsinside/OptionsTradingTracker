/**
 * Debug Portfolio Creation During Import
 *
 * This test specifically checks if portfolios are being created and persisted during CSV import
 */

import { test } from '@playwright/test';

test.describe('Portfolio Creation Debug', () => {
  test('debug portfolio creation during import', async ({ page }) => {
    console.log('🚀 Starting portfolio creation debug test');

    // Navigate to import page
    await page.goto('http://localhost:5174/import');
    await page.waitForLoadState('networkidle');
    console.log('📁 Import page loaded');

    // Add console logging to capture what happens during import
    await page.addInitScript(() => {
      // Override console.log to capture debug messages
      const originalLog = console.log;
      (window as unknown as Record<string, unknown>).importLogs = [];
      console.log = (...args: string[]) => {
        const logs = (window as unknown as Record<string, unknown>).importLogs as string[];
        (window as unknown as Record<string, unknown>).importLogs = [...logs, args.join(' ')];
        originalLog(...args);
      };
    });

    // Upload CSV file
    const csvPath = 'tests/fixtures/real-options-data.csv';
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    console.log('📄 File uploaded');

    // Wait for upload confirmation
    await page.waitForTimeout(1000);

    // Click import button
    const importButton = page.locator('button:has-text("Import")');
    await importButton.click();
    console.log('🔄 Import started');

    // Wait for import completion
    await page.waitForSelector('.success, .error', { timeout: 30000 });
    console.log('✅ Import completed');

    // Get all console logs from the import process
    const importLogs = (await page.evaluate(
      () => (window as unknown as Record<string, unknown>).importLogs || []
    )) as string[];
    console.log('📝 Import process logs:');
    importLogs.forEach((log: string) => console.log('  ', log));

    // Now manually check database contents
    const dbCheck = await page.evaluate(async () => {
      try {
        console.log('🔍 Checking database after import...');

        // Initialize database
        const { initDatabase } = await import('../../src/modules/db/sqlite');
        const db = await initDatabase();

        // Check portfolios table
        const portfoliosQuery = 'SELECT * FROM portfolios';
        const portfolios = await db.query(portfoliosQuery);
        console.log('📊 Portfolios in database:', portfolios);

        // Check trades table
        const tradesQuery = 'SELECT COUNT(*) as count FROM trades';
        const tradeCount = await db.query(tradesQuery);
        console.log('📈 Trade count:', tradeCount);

        // Check symbols table
        const symbolsQuery = 'SELECT COUNT(*) as count FROM symbols';
        const symbolCount = await db.query(symbolsQuery);
        console.log('🏷️ Symbol count:', symbolCount);

        return {
          portfolios: portfolios,
          tradeCount: tradeCount[0]?.count || 0,
          symbolCount: symbolCount[0]?.count || 0,
          success: true,
        };
      } catch (error) {
        console.error('❌ Database check failed:', error);
        return {
          error: (error as Error).message,
          success: false,
        };
      }
    });

    console.log('📊 Database check result:', JSON.stringify(dbCheck, null, 2));

    // Navigate to portfolio page to see what it shows
    await page.goto('http://localhost:5174/portfolio');
    await page.waitForTimeout(2000);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-portfolio-after-import.png', fullPage: true });

    const portfolioPageText = await page.locator('body').innerText();
    console.log('📄 Portfolio page content:', portfolioPageText);
  });
});
