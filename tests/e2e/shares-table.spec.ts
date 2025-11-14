import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

/**
 * E2E tests for Shares Card/Table section
 * Tests display, Buy/Sell Shares buttons, form submissions, and ticker interactions
 */

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
});

test.describe('Shares Table - Display', () => {
  test('should display shares table with correct data', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'SHARESTEST1';

    // Add a put assignment to create shares
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol,
      contracts: '1',
      strike: '50.00',
    });
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Navigate to wheel page
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Verify shares table is visible
    const sharesCard = wheelPage.sharesCard;
    await expect(sharesCard).toBeVisible({ timeout: 5000 });

    // Verify symbol appears in shares table
    const symbolInTable = sharesCard.locator(`text=${symbol.toUpperCase()}`);
    await expect(symbolInTable).toBeVisible({ timeout: 5000 });
  });

  test('should show "Buy Shares" button for tickers with uncovered calls', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'SHARESTEST2';

    // Add a sell call (uncovered - no shares)
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: '1',
      strike: '100.00',
      premium: '2.00',
    });
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Navigate to wheel page
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Verify "Buy Shares" button appears
    const sharesCard = wheelPage.sharesCard;
    await expect(sharesCard).toBeVisible({ timeout: 5000 });

    const buyButton = sharesCard.locator('button', { hasText: /Buy Shares/i });
    await expect(buyButton).toBeVisible({ timeout: 5000 });
  });

  test('should NOT show "Buy Shares" button for fully covered tickers', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'SHARESTEST3';

    // Add shares first (via put assignment)
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol,
      contracts: '1',
      strike: '50.00',
    });
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Add a covered call (covered - has shares)
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: '1',
      strike: '55.00',
      premium: '2.00',
    });
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Navigate to wheel page
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Verify "Buy Shares" button does NOT appear
    const sharesCard = page.locator('text=Shares').locator('..');
    await expect(sharesCard).toBeVisible({ timeout: 5000 });

    const buyButton = sharesCard.locator('button', { hasText: /Buy Shares/i });
    const isVisible = await buyButton.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });
});

test.describe('Shares Table - Buy Shares', () => {
  test('should open Buy Shares form with pre-filled symbol when clicking Buy Shares button', async ({
    page,
  }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'SHARESTEST4';

    // Add a sell call (uncovered)
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: '1',
      strike: '100.00',
      premium: '2.00',
    });
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Navigate to wheel page
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Click Buy Shares button
    await wheelPage.clickBuySharesButton(symbol);
    await page.waitForTimeout(1000);

    // Verify form is open with pre-filled symbol
    const symbolInput = page.getByLabel(/symbol/i);
    await expect(symbolInput).toBeVisible({ timeout: 5000 });
    const symbolValue = await symbolInput.inputValue();
    expect(symbolValue.toUpperCase()).toBe(symbol.toUpperCase());
  });

  test('should update shares table after submitting Buy Shares form', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'SHARESTEST5';

    // Add a sell call (uncovered)
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: '1',
      strike: '100.00',
      premium: '2.00',
    });
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Navigate to wheel page
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Get initial shares (should be 0)
    const sharesBefore = await wheelPage.getSharesForTicker(symbol);
    expect(sharesBefore?.shares || 0).toBe(0);

    // Click Buy Shares button and fill form
    await wheelPage.clickBuySharesButton(symbol);
    await page.waitForTimeout(1000);

    // Fill Buy Shares form
    const sharesInput = page.getByLabel(/shares/i).first();
    await expect(sharesInput).toBeVisible({ timeout: 5000 });
    await sharesInput.fill('100');

    const priceInput = page.getByLabel(/price/i).first();
    await expect(priceInput).toBeVisible({ timeout: 5000 });
    await priceInput.fill('50.00');

    // Submit form
    const submitButton = page.getByRole('button', { name: /buy|submit/i });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Reload page to see updated shares
    await page.reload();
    await wheelPage.waitForPageLoad();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Verify shares updated
    const sharesAfter = await wheelPage.getSharesForTicker(symbol);
    expect(sharesAfter?.shares || 0).toBeGreaterThan(0);
  });
});

test.describe('Shares Table - Ticker Interaction', () => {
  test('should open TickerDrawer when clicking ticker in shares table', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'SHARESTEST6';

    // Add shares (via put assignment)
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol,
      contracts: '1',
      strike: '50.00',
    });
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Navigate to wheel page
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Click ticker in shares table
    await wheelPage.clickTickerInSharesTable(symbol);
    await page.waitForTimeout(1000);

    // Verify TickerDrawer is open
    const isOpen = await wheelPage.isTickerDrawerOpen();
    expect(isOpen).toBe(true);

    // Verify correct symbol in drawer
    const drawerSymbol = await wheelPage.getTickerDrawerSymbol();
    expect(drawerSymbol?.toUpperCase()).toBe(symbol.toUpperCase());
  });
});
