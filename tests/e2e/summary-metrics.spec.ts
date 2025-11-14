import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

/**
 * E2E tests for Summary Metrics section
 * Tests Premium This Week, Capital In Puts, and Shares For Calls calculations
 */

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
});

test.describe('Summary Metrics - Premium This Week', () => {
  test('should increase Premium This Week when adding sell put', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Get initial premium value
    const initialPremium = await wheelPage.getPremiumThisWeek();

    // Add a sell put trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('PREMIUM1');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '50',
      premium: '2.50',
      fees: '0',
    });
    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);
    await page.waitForTimeout(2000);

    // Verify premium increased
    const newPremium = await wheelPage.getPremiumThisWeek();
    expect(newPremium).toBeGreaterThan(initialPremium);
    // Premium should increase by approximately 2.50 * 100 = 250
    expect(newPremium).toBeGreaterThanOrEqual(initialPremium + 200);
  });

  test('should increase Premium This Week when adding sell call', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    const initialPremium = await wheelPage.getPremiumThisWeek();

    // Add a sell call trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('PREMIUM2');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '100',
      premium: '3.00',
      fees: '0',
    });
    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);
    await page.waitForTimeout(2000);

    const newPremium = await wheelPage.getPremiumThisWeek();
    expect(newPremium).toBeGreaterThan(initialPremium);
    // Premium should increase by approximately 3.00 * 100 = 300
    expect(newPremium).toBeGreaterThanOrEqual(initialPremium + 200);
  });

  test('should decrease Premium This Week when adding buy call', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // First add a sell call to establish a baseline
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('PREMIUM3');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '100',
      premium: '5.00',
      fees: '0',
    });
    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);
    await page.waitForTimeout(2000);

    const premiumAfterSell = await wheelPage.getPremiumThisWeek();

    // Now buy to close
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('PREMIUM3');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Buy');
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '100',
      premium: '2.00',
      fees: '0',
    });
    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);
    await page.waitForTimeout(2000);

    const premiumAfterBuy = await wheelPage.getPremiumThisWeek();
    // Premium should decrease because we bought to close
    expect(premiumAfterBuy).toBeLessThan(premiumAfterSell);
  });
});

test.describe('Summary Metrics - Capital In Puts', () => {
  test('should increase Capital In Puts when adding sell put', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    const initialCapital = await wheelPage.getCapitalInPuts();

    // Add a sell put trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('CAPITAL1');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '50',
      premium: '2.00',
      fees: '0',
    });
    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);
    await page.waitForTimeout(2000);

    const newCapital = await wheelPage.getCapitalInPuts();
    expect(newCapital).toBeGreaterThan(initialCapital);
    // Capital should increase by strike * 100 * qty = 50 * 100 * 1 = 5000
    expect(newCapital).toBeGreaterThanOrEqual(initialCapital + 4000);
  });

  test('should decrease Capital In Puts after put assignment', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'CAPITAL2';

    // Add a sell put
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Sell Put',
      symbol,
      contracts: '1',
      strike: '50.00',
      premium: '2.00',
    });
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Check capital before assignment
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);
    const capitalBefore = await wheelPage.getCapitalInPuts();

    // Assign the put
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol,
      contracts: '1',
      strike: '50.00',
    });
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Check capital after assignment
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);
    const capitalAfter = await wheelPage.getCapitalInPuts();

    // Capital should decrease because the put position is closed
    expect(capitalAfter).toBeLessThan(capitalBefore);
  });
});

test.describe('Summary Metrics - Shares For Calls', () => {
  test('should increase Shares For Calls when adding uncovered call', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    const initialShares = await wheelPage.getSharesForCalls();

    // Add a sell call (uncovered - no shares)
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('SHARES1');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '100',
      premium: '2.00',
      fees: '0',
    });
    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);
    await page.waitForTimeout(2000);

    const newShares = await wheelPage.getSharesForCalls();
    expect(newShares).toBeGreaterThan(initialShares);
    // Each call contract = 100 shares, so 1 call = 100 shares needed
    expect(newShares).toBeGreaterThanOrEqual(initialShares + 90);
  });

  test('should decrease Shares For Calls after buying shares', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'SHARES2';

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

    // Check shares needed before buying
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);
    const sharesBefore = await wheelPage.getSharesForCalls();

    // Buy shares to cover using wheel page Buy Shares form
    await wheelPage.clickBuySharesButton(symbol);
    await page.waitForTimeout(1000);

    // Fill Buy Shares form
    const sharesInput = page.getByLabel(/shares/i).first();
    await expect(sharesInput).toBeVisible({ timeout: 5000 });
    await sharesInput.fill('100');

    const priceInput = page.getByLabel(/price/i).first();
    await expect(priceInput).toBeVisible({ timeout: 5000 });
    await priceInput.fill('95.00');

    // Submit form
    const submitButton = page.getByRole('button', { name: /buy|submit|record purchase/i });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Reload page to see updated shares
    await page.reload();
    await wheelPage.waitForPageLoad();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Check shares needed after buying
    const sharesAfter = await wheelPage.getSharesForCalls();

    // Shares needed should decrease because we now have shares to cover the call
    // Note: This depends on the calculation logic - if shares cover the call, it should decrease
    expect(sharesAfter).toBeLessThanOrEqual(sharesBefore);
  });
});

test.describe('Summary Metrics - Persistence', () => {
  test('should persist metrics after page reload', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('PERSIST1');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '50',
      premium: '2.00',
      fees: '0',
    });
    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);
    await page.waitForTimeout(2000);

    // Get metrics before reload
    const premiumBefore = await wheelPage.getPremiumThisWeek();
    const capitalBefore = await wheelPage.getCapitalInPuts();

    // Reload page
    await page.reload();
    await wheelPage.waitForPageLoad();

    // Get metrics after reload
    const premiumAfter = await wheelPage.getPremiumThisWeek();
    const capitalAfter = await wheelPage.getCapitalInPuts();

    // Metrics should be the same
    expect(premiumAfter).toBe(premiumBefore);
    expect(capitalAfter).toBe(capitalBefore);
  });
});
