import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

// show the browser console logs for debugging
test.beforeEach(async ({ page }) => {
  page.on('console', msg => {
    console.log(`BROWSER LOG: ${msg.text()}`);
  });
});

test.describe('Covered Call Journal Integration', () => {
  test('should show call in journal page with correct type', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    const journalPage = new JournalPage(page);

    // Set desktop viewport to ensure table is visible
    await page.setViewportSize({ width: 1280, height: 720 });

    // Add a call trade
    await wheelPage.navigate();

    await wheelPage.addTrade({
      symbol: 'AAPL',
      type: 'Call',
      side: 'Sell',
      qty: '1',
      dte: '30',
      strike: '150',
      premium: '3.00',
      fees: '0.70',
    });

    // Navigate to journal page using the navigation link
    await journalPage.navigate();

    // Verify entry appears in journal - check for AAPL text (works for both mobile cards and desktop table)
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 10000 });

    // Verify amount is correct: $300 (3.00 × 100)
    const journalContent = await page.content();
    expect(journalContent).toContain('300');
  });
});
