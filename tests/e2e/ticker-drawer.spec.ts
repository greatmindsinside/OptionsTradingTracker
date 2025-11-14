import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

/**
 * E2E tests for TickerDrawer component
 * Tests opening from various sources, displaying positions/shares/earnings, and closing
 */

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
});

test.describe('TickerDrawer - Opening', () => {
  test('should open TickerDrawer when clicking ticker in Wheel Phase', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    const symbol = 'TICKERDRAW1';

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

    // Find ticker in Wheel Phase and click it
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 5000 });

    const tickerLink = wheelPhaseSection.locator(`text=${symbol.toUpperCase()}`).first();
    await expect(tickerLink).toBeVisible({ timeout: 5000 });
    await tickerLink.click();
    await page.waitForTimeout(1000);

    // Verify TickerDrawer is open
    const isOpen = await wheelPage.isTickerDrawerOpen();
    expect(isOpen).toBe(true);

    // Verify correct symbol in drawer
    const drawerSymbol = await wheelPage.getTickerDrawerSymbol();
    expect(drawerSymbol?.toUpperCase()).toBe(symbol.toUpperCase());
  });

  test('should open TickerDrawer when clicking View option in Wheel Phase dropdown', async ({
    page,
  }) => {
    const wheelPage = new WheelPage(page);
    const symbol = 'TICKERDRAW2';

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

    // Find the row in Wheel Phase
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 5000 });

    const row = wheelPhaseSection.locator(`text=${symbol.toUpperCase()}`).first().locator('..');
    await expect(row).toBeVisible({ timeout: 5000 });

    // Find and click dropdown menu
    const dropdownTrigger = row.locator('button').last();
    await dropdownTrigger.click({ force: true });
    await page.waitForTimeout(500);

    // Wait for dropdown menu
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => {
          const text = btn.textContent || '';
          return /^View$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    // Click View option
    const viewOption = page
      .locator('button')
      .filter({ hasText: /^View$/i })
      .first();
    await expect(viewOption).toBeVisible({ timeout: 5000 });
    await viewOption.click();
    await page.waitForTimeout(1000);

    // Verify TickerDrawer is open
    const isOpen = await wheelPage.isTickerDrawerOpen();
    expect(isOpen).toBe(true);

    // Verify correct symbol in drawer
    const drawerSymbol = await wheelPage.getTickerDrawerSymbol();
    expect(drawerSymbol?.toUpperCase()).toBe(symbol.toUpperCase());
  });

  test('should open TickerDrawer when clicking ticker in Shares table', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'TICKERDRAW3';

    // Add shares
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

test.describe('TickerDrawer - Display', () => {
  test('should display positions for selected ticker', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'TICKERDRAW4';

    // Add a trade
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

    // Open TickerDrawer
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    const tickerLink = wheelPhaseSection.locator(`text=${symbol.toUpperCase()}`).first();
    await tickerLink.click();
    await page.waitForTimeout(1000);

    // Verify drawer shows positions
    const drawer = page.locator('[aria-modal]').last();
    await expect(drawer).toBeVisible({ timeout: 5000 });
    const drawerText = await drawer.textContent();
    expect(drawerText).toContain(symbol.toUpperCase());
    // Should show position information
    expect(drawerText).toMatch(/position|strike|expiration|premium/i);
  });

  test('should display share lots for selected ticker', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'TICKERDRAW5';

    // Add shares
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

    // Open TickerDrawer from shares table
    await wheelPage.clickTickerInSharesTable(symbol);
    await page.waitForTimeout(1000);

    // Verify drawer shows share lots
    const drawer = page.locator('[aria-modal]').last();
    await expect(drawer).toBeVisible({ timeout: 5000 });
    const drawerText = await drawer.textContent();
    expect(drawerText).toContain(symbol.toUpperCase());
    // Should show share information
    expect(drawerText).toMatch(/share|lot|cost/i);
  });
});

test.describe('TickerDrawer - Closing', () => {
  test('should close TickerDrawer when clicking close button', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    const symbol = 'TICKERDRAW6';

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

    // Open TickerDrawer
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    const tickerLink = wheelPhaseSection.locator(`text=${symbol.toUpperCase()}`).first();
    await tickerLink.click();
    await page.waitForTimeout(1000);

    // Verify drawer is open
    let isOpen = await wheelPage.isTickerDrawerOpen();
    expect(isOpen).toBe(true);

    // Close drawer
    await wheelPage.closeTickerDrawer();
    await page.waitForTimeout(1000);

    // Verify drawer is closed
    isOpen = await wheelPage.isTickerDrawerOpen();
    expect(isOpen).toBe(false);
  });

  test('should close TickerDrawer when clicking backdrop', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    const symbol = 'TICKERDRAW7';

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

    // Open TickerDrawer
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    const tickerLink = wheelPhaseSection.locator(`text=${symbol.toUpperCase()}`).first();
    await tickerLink.click();
    await page.waitForTimeout(1000);

    // Verify drawer is open
    let isOpen = await wheelPage.isTickerDrawerOpen();
    expect(isOpen).toBe(true);

    // Click backdrop (the overlay behind the drawer)
    const backdrop = page.locator('[aria-modal]').last().locator('..').locator('div').first();
    await backdrop.click({ force: true });
    await page.waitForTimeout(1000);

    // Verify drawer is closed
    isOpen = await wheelPage.isTickerDrawerOpen();
    expect(isOpen).toBe(false);
  });
});
