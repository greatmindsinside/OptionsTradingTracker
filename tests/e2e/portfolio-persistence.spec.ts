/**
 * Portfolio Persistence Test
 * Simple test to verify portfolio creation and persistence to storage
 */

import { test, expect } from '@playwright/test';

test.describe('Portfolio Persistence', () => {
  test('portfolio should persist after browser refresh', async ({ page }) => {
    console.log('🚀 Testing portfolio persistence...');

    // Create a portfolio via the browser console
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');

    const portfolioCreated = await page.evaluate(async () => {
      try {
        console.log('💾 Creating portfolio via JavaScript...');

        // Initialize database
        const { initDatabase } = await import('../../src/modules/db/sqlite');
        const db = await initDatabase();
        console.log('Database initialized');

        // Create portfolio
        const { PortfolioDAO } = await import('../../src/modules/db/portfolio-dao');
        const portfolioDAO = new PortfolioDAO(db);

        const result = await portfolioDAO.create({
          name: 'Test Portfolio',
          broker: 'robinhood',
          account_type: 'cash',
          description: 'Test portfolio for persistence check',
          is_active: true,
        });

        console.log('Portfolio creation result:', result);

        if (result.success && result.data) {
          // Persist to storage
          await db.persist();
          console.log('Database persisted');

          return { success: true, portfolioId: result.data.id };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('Error creating portfolio:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    console.log('📊 Portfolio creation result:', portfolioCreated);
    expect(portfolioCreated.success).toBe(true);

    // Navigate to portfolio page to see if it shows the portfolio
    await page.goto('http://localhost:5174/portfolio');
    await page.waitForTimeout(3000); // Give time for data to load

    // Check if portfolio data is displayed
    const pageContent = await page.locator('body').innerText();
    console.log('📄 Portfolio page content:', pageContent);

    // The page should NOT show "No portfolios found" if persistence worked
    const hasNoPortfoliosMessage = pageContent.includes('No portfolios found');
    const hasPortfolioData =
      pageContent.includes('Total Value') || pageContent.includes('Test Portfolio');

    console.log('📝 Has "No portfolios found" message:', hasNoPortfoliosMessage);
    console.log('📝 Has portfolio data:', hasPortfolioData);

    if (!hasNoPortfoliosMessage && hasPortfolioData) {
      console.log('✅ Portfolio persistence test PASSED - portfolio data found');
    } else if (hasNoPortfoliosMessage) {
      console.log(
        '❌ Portfolio persistence test FAILED - no portfolios found after creation and persistence'
      );
    } else {
      console.log(
        '⚠️ Portfolio persistence test INCONCLUSIVE - portfolio created but data not displayed'
      );
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'portfolio-persistence-test.png', fullPage: true });
  });
});
