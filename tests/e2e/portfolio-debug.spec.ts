/**
 * Simple Portfolio Debug Test
 * Check what's in the database after import
 */

import { test } from '@playwright/test';

test.describe('Portfolio Debug', () => {
  test('check database contents after manual import', async ({ page }) => {
    // Navigate to import page
    await page.goto('http://localhost:5174/import');
    await page.waitForLoadState('networkidle');

    console.log('📁 Import page loaded');

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

    // Add JavaScript to check database contents
    const dbContents = await page.evaluate(async () => {
      try {
        console.log('🔍 Checking database contents...');

        // Initialize database
        const { initDatabase } = await import('../../src/modules/db/sqlite');
        const db = await initDatabase();

        // Get raw data
        const portfolios = await db.query('SELECT * FROM portfolios');
        const trades = await db.query('SELECT * FROM trades LIMIT 5');
        const symbols = await db.query('SELECT * FROM symbols LIMIT 5');

        return {
          portfolios: portfolios,
          trades: trades,
          symbols: symbols,
          portfolioCount: portfolios.length,
          tradeCount: (await db.query('SELECT COUNT(*) as count FROM trades'))[0].count,
          symbolCount: (await db.query('SELECT COUNT(*) as count FROM symbols'))[0].count,
        };
      } catch (error) {
        return { error: (error as Error).message };
      }
    });

    console.log('📊 Database contents:', JSON.stringify(dbContents, null, 2));

    // Now check portfolio page
    await page.goto('http://localhost:5174/portfolio');
    await page.waitForTimeout(2000);

    const pageContent = await page.content();
    console.log('📄 Portfolio page content:', pageContent.substring(0, 1000));
  });
});
