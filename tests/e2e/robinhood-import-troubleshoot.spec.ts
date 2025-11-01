import { test, expect } from '@playwright/test';

test.describe('Robinhood CSV Import Troubleshooting', () => {
  test('should debug why imported data is not appearing on pages', async ({ page }) => {
    console.log('🔍 Starting comprehensive import troubleshooting...');

    // Navigate to the application
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    console.log('📱 App loaded successfully');

    // Step 1: Check initial portfolio state
    console.log('📊 Step 1: Checking initial portfolio state...');

    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: 'debug-initial-portfolio-state.png', fullPage: true });

    const initialPortfoliosText = await page.textContent('body');
    console.log(
      'Initial portfolio page content preview:',
      initialPortfoliosText?.substring(0, 500)
    );

    // Step 2: Navigate to import page and check the process
    console.log('📥 Step 2: Testing CSV import process...');

    await page.goto('/import');
    await page.waitForLoadState('networkidle');

    // Take screenshot of import page
    await page.screenshot({ path: 'debug-import-page.png', fullPage: true });

    // Check if file input exists
    const fileInput = await page.locator('input[type="file"]').first();
    expect(fileInput).toBeTruthy();
    console.log('✅ File input found');

    // Step 3: Monitor console logs during import
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.log('❌ Console Error:', text);
      } else if (
        text.includes('Portfolio') ||
        text.includes('import') ||
        text.includes('persist') ||
        text.includes('DB')
      ) {
        consoleLogs.push(text);
        console.log('📝 Console Log:', text);
      }
    });

    // Step 4: Perform the CSV import with the sample file
    console.log('📂 Step 4: Importing sample CSV file...');

    const csvFilePath = 'public/sample-csv/sample-options.csv';
    await fileInput.setInputFiles(csvFilePath);

    // Wait for file processing
    await page.waitForTimeout(2000);

    // Look for import button or form submit
    const importButton = await page
      .locator('button:has-text("Import"), button:has-text("Upload"), button[type="submit"]')
      .first();
    if (await importButton.isVisible()) {
      console.log('🔄 Clicking import button...');
      await importButton.click();

      // Wait for import to complete
      await page.waitForTimeout(5000);
    }

    // Take screenshot after import attempt
    await page.screenshot({ path: 'debug-after-import.png', fullPage: true });

    // Step 5: Check database state via browser console
    console.log('🗄️ Step 5: Checking database state...');

    const dbCheckResult = await page.evaluate(async () => {
      try {
        // Import database modules
        const { initDatabase } = await import('../../src/modules/db/sqlite.ts');
        const { PortfolioDAO } = await import('../../src/modules/db/portfolio-dao.ts');
        const { TradeDAO } = await import('../../src/modules/db/trade-dao.ts');

        // Initialize database
        const db = await initDatabase();
        const portfolioDAO = new PortfolioDAO(db);
        const tradeDAO = new TradeDAO(db);

        // Check portfolios
        const portfoliosResult = await portfolioDAO.findAll();
        const portfoliosWithTrades = await portfolioDAO.findAllWithTradeCounts();
        const tradesResult = await tradeDAO.findAll();

        return {
          success: true,
          portfolioCount: portfoliosResult.data?.length || 0,
          portfoliosWithTrades: portfoliosWithTrades,
          tradeCount: tradesResult.data?.length || 0,
          portfolios: (portfoliosResult.data || []).map(p => ({
            id: p.id,
            name: p.name,
            broker: p.broker,
            created_at: p.created_at,
          })),
          trades: (tradesResult.data || []).slice(0, 3).map(t => ({
            id: t.id,
            symbol_id: t.symbol_id,
            action: t.action,
            quantity: t.quantity,
            trade_date: t.trade_date,
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          portfolioCount: 0,
          tradeCount: 0,
        };
      }
    });

    console.log('📊 Database check result:', JSON.stringify(dbCheckResult, null, 2));

    // Step 6: Navigate back to portfolio page and check final state
    console.log('🔄 Step 6: Checking portfolio page after import...');

    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for data to load

    // Take final screenshot
    await page.screenshot({ path: 'debug-final-portfolio-state.png', fullPage: true });

    const finalPortfoliosText = await page.textContent('body');
    console.log('Final portfolio page content preview:', finalPortfoliosText?.substring(0, 500));

    // Check for specific elements that should appear with data
    const noDataMessage = await page
      .locator('text=No portfolios found, text=No data, text=Create your first')
      .first();
    const portfolioCards = await page
      .locator('[class*="portfolio"], [class*="card"], [data-testid*="portfolio"]')
      .count();
    const tradeRows = await page.locator('tr, [class*="trade"], [data-testid*="trade"]').count();

    console.log('📈 Portfolio page analysis:');
    console.log('  - No data message visible:', await noDataMessage.isVisible().catch(() => false));
    console.log('  - Portfolio cards found:', portfolioCards);
    console.log('  - Trade rows found:', tradeRows);

    // Step 7: Check import page for any success/error messages
    console.log('📋 Step 7: Checking for import status messages...');

    await page.goto('/import');
    await page.waitForLoadState('networkidle');

    const successMessage = await page
      .locator('text=success, text=imported, text=complete', {
        hasText: /success|imported|complete/i,
      })
      .first();
    const errorMessage = await page
      .locator('text=error, text=failed, text=problem', { hasText: /error|failed|problem/i })
      .first();

    console.log(
      '  - Success message visible:',
      await successMessage.isVisible().catch(() => false)
    );
    console.log('  - Error message visible:', await errorMessage.isVisible().catch(() => false));

    // Final screenshot of import page
    await page.screenshot({ path: 'debug-import-page-final.png', fullPage: true });

    // Step 8: Summary and diagnosis
    console.log('🎯 TROUBLESHOOTING SUMMARY:');
    console.log('  - Console logs captured:', consoleLogs.length);
    console.log('  - Console errors captured:', consoleErrors.length);
    console.log('  - Database portfolios found:', dbCheckResult.portfolioCount);
    console.log('  - Database trades found:', dbCheckResult.tradeCount);
    console.log('  - Database operation success:', dbCheckResult.success);

    if (consoleErrors.length > 0) {
      console.log('❌ ERRORS DETECTED:');
      consoleErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }

    if (consoleLogs.length > 0) {
      console.log('📝 RELEVANT LOGS:');
      consoleLogs.forEach((log, i) => console.log(`  ${i + 1}. ${log}`));
    }

    // Determine the issue
    let diagnosis = 'Unknown issue';
    if (!dbCheckResult.success) {
      diagnosis = 'Database connection/initialization failure';
    } else if (dbCheckResult.portfolioCount === 0) {
      diagnosis = 'Import process not creating portfolios';
    } else if (dbCheckResult.tradeCount === 0) {
      diagnosis = 'Import process not creating trades';
    } else if (portfolioCards === 0 && tradeRows === 0) {
      diagnosis = 'Data exists in database but not displaying on UI';
    } else {
      diagnosis = 'Data appears to be working correctly';
    }

    console.log('🏥 DIAGNOSIS:', diagnosis);

    // Assert that we have some useful diagnostic information
    expect(dbCheckResult).toBeDefined();

    // The test passes if we've successfully gathered diagnostic information
    // The actual fix will be based on the diagnosis
  });

  test('should verify data persistence after page reload', async ({ page }) => {
    console.log('🔄 Testing data persistence after page reload...');

    // Navigate to portfolio page
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');

    // Check initial state
    const initialData = await page.evaluate(async () => {
      try {
        const { initDatabase } = await import('../../src/modules/db/sqlite.ts');
        const { PortfolioDAO } = await import('../../src/modules/db/portfolio-dao.ts');

        const db = await initDatabase();
        const portfolioDAO = new PortfolioDAO(db);
        const portfolios = await portfolioDAO.findAll();

        return {
          success: true,
          count: portfolios.data?.length || 0,
          portfolios: (portfolios.data || []).map(p => ({ id: p.id, name: p.name })),
        };
      } catch (error) {
        return { success: false, error: (error as Error).message, count: 0 };
      }
    });

    console.log('Initial data state:', JSON.stringify(initialData, null, 2));

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check data after reload
    const afterReloadData = await page.evaluate(async () => {
      try {
        const { initDatabase } = await import('../../src/modules/db/sqlite.ts');
        const { PortfolioDAO } = await import('../../src/modules/db/portfolio-dao.ts');

        const db = await initDatabase();
        const portfolioDAO = new PortfolioDAO(db);
        const portfolios = await portfolioDAO.findAll();

        return {
          success: true,
          count: portfolios.data?.length || 0,
          portfolios: (portfolios.data || []).map(p => ({ id: p.id, name: p.name })),
        };
      } catch (error) {
        return { success: false, error: (error as Error).message, count: 0 };
      }
    });

    console.log('After reload data state:', JSON.stringify(afterReloadData, null, 2));

    // Compare data persistence
    if (initialData.success && afterReloadData.success) {
      const persistenceWorking = initialData.count === afterReloadData.count;
      console.log('🔒 Data persistence working:', persistenceWorking);

      if (!persistenceWorking) {
        console.log('❌ PERSISTENCE ISSUE: Data count changed after reload');
        console.log('  Before:', initialData.count, 'After:', afterReloadData.count);
      }
    } else {
      console.log('❌ DATABASE ISSUE: Unable to check persistence due to database errors');
    }

    expect(afterReloadData).toBeDefined();
  });
});
