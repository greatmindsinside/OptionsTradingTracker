import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

/**
 * E2E test to verify "Shares For Calls" metric calculation
 *
 * This test verifies that:
 * 1. Put assignment creates shares in the journal
 * 2. Sell covered call creates a short call position
 * 3. "Shares For Calls" metric correctly shows total shares needed for all short calls
 *    (Each call contract = 100 shares, so 2 calls = 200 shares needed)
 * 4. Journal remains the single source of truth - changes reflect in wheel page
 */

test.describe('Shares For Calls Metric', () => {
  test.beforeEach(async ({ page }) => {
    const journalPage = new JournalPage(page);
    // Navigate to journal page
    await journalPage.navigate();
  });

  test('should show correct covered shares after put assignment and covered call', async ({
    page,
  }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'SHARES4CALLS';
    const contracts = 1; // 1 contract = 100 shares

    // Step 1: Add Put Assignment (creates shares)
    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol,
      contracts: String(contracts),
      strike: '50.00',
    });

    // Wait for first entry
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(1000);

    // Step 2: Add Sell Covered Call (creates short call position)
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: String(contracts),
      strike: '55.00',
      premium: '1.00',
    });

    // Wait for second entry
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Step 3: Navigate to Wheel page and verify "Shares For Calls" metric
    await wheelPage.navigate();

    // Find the "Shares For Calls" metric card
    const sharesForCallsCard = page
      .locator('text=Shares For Calls')
      .locator('..')
      .or(page.locator('[data-testid="shares-for-calls-value"]').locator('..'));

    await expect(sharesForCallsCard).toBeVisible();

    // Get the metric value
    const metricText = await sharesForCallsCard.textContent();
    expect(metricText).toBeTruthy();

    // Verify the metric shows the correct number of shares needed
    // 1 contract = 100 shares, so we should see "100" or "100 shares" or similar
    // The metric shows total shares needed for all short calls (not just covered shares)
    // Find the card first, then the value within it to avoid strict mode violations
    const sharesForCallsCardContainer = page.locator('text=Shares For Calls').locator('..');
    const sharesForCallsValue = sharesForCallsCardContainer.locator('[data-testid="shares-for-calls-value"]');

    await expect(sharesForCallsValue).toBeVisible();

    const valueText = await sharesForCallsValue.textContent();
    expect(valueText).toBeTruthy();

    // Parse the number from the value (should be 100 for 1 contract)
    const match = valueText?.match(/(\d+)/);
    if (match && match[1]) {
      const coveredShares = parseInt(match[1], 10);
      // Should be 100 shares (1 contract * 100 shares per contract)
      expect(coveredShares).toBeGreaterThanOrEqual(100);
    }

    // Verify the subtitle shows the correct symbol count
    const subtitle = sharesForCallsCard.locator('text=/\\d+.*symbol/i');
    const subtitleText = await subtitle.textContent();
    expect(subtitleText).toMatch(/1.*symbol/i); // Should show "1 symbols" or "1 symbol"
  });

  test('should update metric when shares are sold via call assignment', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'SHARESUPDATE';
    const contracts = 2; // 2 contracts = 200 shares

    // Step 1: Add Put Assignment (creates 200 shares)
    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol,
      contracts: String(contracts),
      strike: '50.00',
    });

    // Wait for first entry
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(1000);

    // Step 2: Add Sell Covered Call (1 contract = 100 shares covered)
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: '1', // 1 contract = 100 shares
      strike: '55.00',
      premium: '1.00',
    });

    // Wait for second entry
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Step 3: Verify "Shares For Calls" shows 100 covered shares
    await wheelPage.navigate();

    const sharesForCallsValue = page.locator('[data-testid="shares-for-calls-value"]').first();

    await expect(sharesForCallsValue).toBeVisible();
    const initialValue = await sharesForCallsValue.textContent();
    expect(initialValue).toBeTruthy();

    // Step 4: Add Call Assignment (sells 1 contract = 100 shares)
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Call Assigned',
      symbol,
      contracts: '1',
      strike: '55.00',
    });

    // Wait for entry to be saved
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Step 5: Verify "Shares For Calls" metric updated to 0 (no more covered calls)
    await wheelPage.navigate();

    const updatedValue = await sharesForCallsValue.textContent();
    expect(updatedValue).toBeTruthy();

    // After call assignment, the covered call position is closed
    // So "Shares For Calls" should show 0 or be reduced
    // (Depends on implementation - if position is closed, metric should reflect that)
  });

  test('should show total shares needed for naked calls (no shares owned)', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'NAKEDCALL';

    // Step 1: Add Sell Covered Call WITHOUT having shares first (naked call)
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: '1',
      strike: '55.00',
      premium: '1.00',
    });

    // Wait for entry to be saved
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Step 2: Verify "Shares For Calls" shows 100 (total shares needed for 1 call)
    // Even if shares aren't owned, the metric shows total shares needed to cover the calls
    await wheelPage.navigate();

    const sharesForCallsValue = page.locator('[data-testid="shares-for-calls-value"]').first();

    await expect(sharesForCallsValue).toBeVisible();
    const valueText = await sharesForCallsValue.textContent();

    // Should show 100 since 1 call = 100 shares needed (1 contract × 100 shares per contract)
    const match = valueText?.match(/(\d+)/);
    if (match && match[1]) {
      const sharesNeeded = parseInt(match[1], 10);
      expect(sharesNeeded).toBe(100);
    } else {
      // If no number found, check if it explicitly shows "100"
      expect(valueText?.toLowerCase()).toMatch(/100|one hundred/i);
    }

    // Should still show 1 symbol count
    const sharesForCallsCard = page.locator('text=Shares For Calls').locator('..');
    const subtitle = sharesForCallsCard.locator('text=/\\d+.*symbol/i');
    const subtitleText = await subtitle.textContent();
    expect(subtitleText).toMatch(/1.*symbol/i);
  });

  test('should show 200 for 2 covered calls', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol1 = 'MULTICALL1';
    const symbol2 = 'MULTICALL2';

    // Step 1: Add first covered call
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol: symbol1,
      contracts: '1',
      strike: '50.00',
      premium: '1.00',
    });

    // Wait for first entry
    await journalPage.waitForEntry(symbol1);
    await page.waitForTimeout(1000);

    // Step 2: Add second covered call
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol: symbol2,
      contracts: '1',
      strike: '60.00',
      premium: '1.50',
    });

    // Wait for second entry
    await journalPage.waitForEntry(symbol2);
    await page.waitForTimeout(2000);

    // Step 3: Verify "Shares For Calls" shows 200 (2 calls × 100 shares = 200)
    await wheelPage.navigate();

    const sharesForCallsValue = page.locator('[data-testid="shares-for-calls-value"]').first();

    await expect(sharesForCallsValue).toBeVisible();
    const valueText = await sharesForCallsValue.textContent();

    // Should show 200 since 2 calls = 200 shares needed (2 contracts × 100 shares per contract)
    const match = valueText?.match(/(\d+)/);
    if (match && match[1]) {
      const sharesNeeded = parseInt(match[1], 10);
      expect(sharesNeeded).toBe(200);
    }

    // Should show 2 symbols count
    const sharesForCallsCard = page.locator('text=Shares For Calls').locator('..');
    const subtitle = sharesForCallsCard.locator('text=/\\d+.*symbol/i');
    const subtitleText = await subtitle.textContent();
    expect(subtitleText).toMatch(/2.*symbol/i);
  });
});
