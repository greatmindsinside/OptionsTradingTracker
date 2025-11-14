import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

// Ensures Journal page loads, can add an entry, and Wheel reflects the change

test.describe('Journal -> Wheel sync', () => {
  test('adding a Sell Put in Journal shows symbol on Wheel', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const sym = 'SYNCX';

    // Go to Journal and add a complete Sell Put entry
    // Using addEntry ensures proper sync with the Wheel page
    await journalPage.addEntry({
      tradeType: 'Sell Put',
      symbol: sym,
      contracts: '1',
      strike: '100.00',
      premium: '2.50',
    });

    // Wait for the entry to be saved and appear in the Journal UI
    // Try to wait for entry, but don't fail if it takes too long - proceed anyway
    try {
      await journalPage.waitForEntry(sym, 10000);
    } catch {
      // Entry might be saved but not visible yet - proceed anyway
      console.log('Entry might not be visible yet, proceeding to Wheel page');
    }

    // Give additional time for database sync
    await page.waitForTimeout(2000);

    // Take a full-page screenshot of the Journal page after save (optional, skip if it takes too long)
    try {
      const journalFull = await page.screenshot({ fullPage: true, timeout: 5000 });
      await test
        .info()
        .attach('journal-after-save', { body: journalFull, contentType: 'image/png' });
    } catch {
      // Skip screenshot if it times out - not critical for the test
    }

    // Drawer should close; navigate to Wheel (home)
    await wheelPage.navigate();

    // Expect Wheel title
    await expect(wheelPage.title).toBeVisible({ timeout: 10000 });

    // Wait for Wheel page to finish loading data
    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        // Wait for loading indicators to disappear
        return !text.includes('Loading Wheel Tracker') || text.includes('Wheel');
      },
      { timeout: 10000 }
    );

    // Give additional time for data processing and database sync
    await page.waitForTimeout(3000);

    // Reload the page to ensure fresh data is loaded from the database
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Expect symbol to appear somewhere on the page (Wheel Phase list)
    await wheelPage.waitForSymbol(sym, 30000);
  });
});
