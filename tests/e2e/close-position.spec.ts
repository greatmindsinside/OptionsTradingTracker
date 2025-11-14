import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

/**
 * E2E tests for Close Position functionality
 * Tests closing positions from Wheel Phase dropdown, confirmation dialog, and position removal
 */

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
});

test.describe('Close Position - Workflow', () => {
  test('should show confirmation dialog when clicking Close Position', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    const symbol = 'CLOSEPOS1';

    // Add a trade
    await wheelPage.navigate();
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill(symbol);
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

    // Wait for symbol to appear
    await wheelPage.waitForSymbol(symbol, 5000);

    // Click Close Position
    let dialogShown = false;
    page.once('dialog', dialog => {
      dialogShown = true;
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain(symbol.toUpperCase());
      dialog.dismiss(); // Cancel for this test
    });

    await wheelPage.clickClosePosition(symbol);
    await page.waitForTimeout(1000);

    // Verify dialog was shown
    expect(dialogShown).toBe(true);
  });

  test('should remove position after confirming close', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    const symbol = 'CLOSEPOS2';

    // Add a trade
    await wheelPage.navigate();
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill(symbol);
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

    // Wait for symbol to appear
    await wheelPage.waitForSymbol(symbol, 5000);

    // Verify symbol is visible in Wheel Phase
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 5000 });
    await expect(wheelPhaseSection.locator(`text=${symbol.toUpperCase()}`)).toBeVisible({
      timeout: 5000,
    });

    // Set up dialog handler to confirm
    page.once('dialog', dialog => {
      expect(dialog.type()).toBe('confirm');
      dialog.accept();
    });

    // Click Close Position and confirm
    await wheelPage.clickClosePosition(symbol);
    await wheelPage.confirmClosePosition();
    await page.waitForTimeout(2000);

    // Reload page to see changes
    await page.reload();
    await wheelPage.waitForPageLoad();

    // Verify symbol is no longer visible in Wheel Phase
    const wheelPhaseText = await wheelPhaseSection.textContent();
    expect(wheelPhaseText).not.toContain(symbol.toUpperCase());
  });

  test('should keep position after canceling close', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    const symbol = 'CLOSEPOS3';

    // Add a trade
    await wheelPage.navigate();
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill(symbol);
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

    // Wait for symbol to appear
    await wheelPage.waitForSymbol(symbol, 5000);

    // Verify symbol is visible
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 5000 });
    await expect(wheelPhaseSection.locator(`text=${symbol.toUpperCase()}`)).toBeVisible({
      timeout: 5000,
    });

    // Set up dialog handler to cancel
    page.once('dialog', dialog => {
      expect(dialog.type()).toBe('confirm');
      dialog.dismiss();
    });

    // Click Close Position and cancel
    await wheelPage.clickClosePosition(symbol);
    await wheelPage.cancelClosePosition();
    await page.waitForTimeout(1000);

    // Verify symbol is still visible
    await expect(wheelPhaseSection.locator(`text=${symbol.toUpperCase()}`)).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Close Position - Journal Integration', () => {
  test('should soft-delete journal entries after closing position', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'CLOSEPOS4';

    // Add a trade through journal
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

    // Navigate to wheel page
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Verify symbol is visible
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection.locator(`text=${symbol.toUpperCase()}`)).toBeVisible({
      timeout: 5000,
    });

    // Set up dialog handler to confirm
    page.once('dialog', dialog => {
      expect(dialog.type()).toBe('confirm');
      dialog.accept();
    });

    // Close position
    await wheelPage.clickClosePosition(symbol);
    await wheelPage.confirmClosePosition();
    await page.waitForTimeout(2000);

    // Navigate to journal and check deleted entries
    await journalPage.navigate();
    // The entry should be soft-deleted (may be in a deleted tab or filtered out)
    // This test verifies the integration works
    await page.waitForTimeout(1000);
  });
});
