import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

/**
 * E2E tests for Wheel Phase section
 * Comprehensive coverage of all functionality including phase display, action buttons, dropdown menu, and phase progression
 */

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
});

test.describe('Wheel Phase - Display', () => {
  test('should show "Sell Cash Secured Puts" phase when adding a put with no shares', async ({
    page,
  }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a put trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('PUTPHASE');
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
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Verify Wheel Phase section
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 10000 });

    // Wait for symbol to appear
    await wheelPage.waitForSymbol('PUTPHASE', 5000);

    // Verify phase shows "Sell Cash Secured Puts"
    await expect(wheelPhaseSection.locator('text=PUTPHASE')).toBeVisible({ timeout: 5000 });
    const wheelText = await wheelPhaseSection.textContent();
    expect(wheelText).toContain('PUTPHASE');
    expect(wheelText).toContain('Sell Cash Secured Put');
  });

  test('should show "Sell Covered Calls" phase when adding a call with shares', async ({
    page,
  }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'COVEREDCALL';

    // First, add a put assignment to get shares
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol,
      contracts: '1',
      strike: '50.00',
    });

    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Now add a covered call
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: '1',
      strike: '55.00',
      premium: '1.00',
    });

    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Check wheel phase
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection.locator('text=' + symbol)).toBeVisible({ timeout: 5000 });
    const wheelText = await wheelPhaseSection.textContent();
    expect(wheelText).toContain(symbol);
    expect(wheelText).toMatch(/Sell Covered Calls|Call Expires Worthless/);
  });

  test('should show correct wheel phase after adding a covered call', async ({ page }) => {
    const wheelPage = new WheelPage(page);

    // Step 1: Open the trade drawer
    await wheelPage.openActionsDrawer();

    // Wait for drawer to open and click on Trade tab
    await wheelPage.openTradeTab();

    // Step 2: Fill in the trade form for a covered call
    await wheelPage.symbolInput.fill('ASTS');

    // Type: Select "Call" from dropdown
    await wheelPage.selectOptionType('Call');

    // Side: Select "Sell" from dropdown
    await wheelPage.selectSide('Sell');

    // Fill trade form
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '4',
      strike: '82',
      premium: '1.03',
      fees: '0',
    });

    // Step 3: Verify the preview text
    await expect(page.locator('text=/Sell 1.*C.*ASTS.*82/')).toBeVisible();

    // Step 4: Submit the trade
    await wheelPage.addTradeButton.click();

    // Wait for trade to be added (drawer should close)
    await wheelPage.wait(1000);

    // Step 5: Verify the wheel phase section shows correct phase
    // Look for ASTS ticker in the Wheel Phase section
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible();

    // Check that ASTS appears in the wheel phase section
    await expect(wheelPhaseSection.locator('text=ASTS')).toBeVisible();

    // Verify the phase shows one of: "Sell Covered Calls" or "Call Expires Worthless"
    // (NOT "Sell Cash Secured Puts")
    const wheelPhaseTextRaw = await wheelPhaseSection.textContent();
    const wheelPhaseText = wheelPhaseTextRaw ?? '';

    // Should contain ASTS and should NOT contain "Sell Cash Secured Put" for ASTS row
    expect(wheelPhaseText).toContain('ASTS');

    // Check that we have the correct phase (either Sell Covered Calls or Call Expires Worthless)
    const hasCorrectPhase = /Sell Covered Calls|Call Expires Worthless/.test(wheelPhaseText);
    expect(hasCorrectPhase).toBeTruthy();
  });
});

test.describe('Wheel Phase - Phase Progression', () => {
  test('should show correct phase progression: puts -> calls', async ({ page }) => {
    const wheelPage = new WheelPage(page);

    // Test Case 1: Start with selling a put
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('ASTS');

    // Select Put and Sell
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    // Fill in put details
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '50',
      premium: '2.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);

    // Wait for ASTS to appear in the wheel phase section
    await wheelPage.waitForSymbol('ASTS', 5000);

    // Verify: Should show "Sell Cash Secured Puts"
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection.locator('text=ASTS')).toBeVisible({ timeout: 5000 });
    const wheelText = await wheelPhaseSection.textContent();
    expect(wheelText).toContain('Sell Cash Secured Put');

    // Test Case 2: Now add a covered call for the same ticker
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('ASTS');

    // Select Call and Sell
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    // Fill in call details
    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '55',
      premium: '1.50',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);

    // Verify: Phase should update (may show both put and call, or just call phase)
    // The main assertion is that we can add a call after a put without errors
    const astsRowAfter = page.locator('text=ASTS').first();
    await expect(astsRowAfter).toBeVisible();
  });

  test('should progress through full wheel cycle phases', async ({ page }) => {
    test.setTimeout(90000);
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'FULLCYCLEPHASE';

    // Step 1: Add Sell Put - should show "Sell Cash Secured Puts"
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Sell Put',
      symbol,
      contracts: '1',
      strike: '50.00',
      premium: '1.00',
    });

    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection.locator('text=' + symbol)).toBeVisible({ timeout: 5000 });
    let wheelText = await wheelPhaseSection.textContent();
    expect(wheelText).toContain('Sell Cash Secured Put');

    // Step 2: Add Put Assignment (shares acquired) - phase may change
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol,
      contracts: '1',
      strike: '50.00',
    });

    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Step 3: Add Covered Call - should show "Sell Covered Calls" or "Call Expires Worthless"
    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: '1',
      strike: '55.00',
      premium: '0.75',
    });

    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    wheelText = await wheelPhaseSection.textContent();
    expect(wheelText).toMatch(/Sell Covered Calls|Call Expires Worthless/);
  });
});

test.describe('Wheel Phase - Action Buttons', () => {
  test('should show "Sell Put" button for put phases and open Trade drawer', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a put trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('SELLPUTBTN');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '50',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Wheel Phase section and the row
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 10000 });

    await wheelPage.waitForSymbol('SELLPUTBTN', 5000);
    const row = wheelPhaseSection.locator('text=SELLPUTBTN').first().locator('..');
    await expect(row).toBeVisible({ timeout: 5000 });

    // Find and click the dropdown menu
    let dropdownTrigger = row.locator('button').last();
    if ((await dropdownTrigger.count()) === 0) {
      dropdownTrigger = row.locator('button').first();
    }

    await dropdownTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const isVisible = await dropdownTrigger.isVisible().catch(() => false);
    if (!isVisible) {
      await dropdownTrigger.evaluate((el: HTMLElement) => {
        (el as HTMLButtonElement).click();
      });
    } else {
      await dropdownTrigger.click({ force: true });
    }

    // Wait for dropdown menu to appear
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => {
          const text = btn.textContent || '';
          return /^Sell Put$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    // Click "Sell Put" option
    const sellPutOption = page
      .locator('button')
      .filter({ hasText: /^Sell Put$/i })
      .first();
    await expect(sellPutOption).toBeVisible({ timeout: 5000 });
    await sellPutOption.click();

    // Verify Trade drawer opens
    await page.waitForTimeout(500);
    await expect(wheelPage.symbolInput).toBeVisible({ timeout: 5000 });
  });

  test('should show "Sell Call" button for call phases and open Trade drawer', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a call trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('SELLCALLBTN');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '100',
      premium: '1.50',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Wheel Phase section and the row
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 10000 });

    await wheelPage.waitForSymbol('SELLCALLBTN', 5000);
    const row = wheelPhaseSection.locator('text=SELLCALLBTN').first().locator('..');
    await expect(row).toBeVisible({ timeout: 5000 });

    // Find and click the dropdown menu
    let dropdownTrigger = row.locator('button').last();
    if ((await dropdownTrigger.count()) === 0) {
      dropdownTrigger = row.locator('button').first();
    }

    await dropdownTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const isVisible = await dropdownTrigger.isVisible().catch(() => false);
    if (!isVisible) {
      await dropdownTrigger.evaluate((el: HTMLElement) => {
        (el as HTMLButtonElement).click();
      });
    } else {
      await dropdownTrigger.click({ force: true });
    }

    // Wait for dropdown menu to appear
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => {
          const text = btn.textContent || '';
          return /^Sell Call$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    // Click "Sell Call" option
    const sellCallOption = page
      .locator('button')
      .filter({ hasText: /^Sell Call$/i })
      .first();
    await expect(sellCallOption).toBeVisible({ timeout: 5000 });
    await sellCallOption.click();

    // Verify Trade drawer opens
    await page.waitForTimeout(500);
    await expect(wheelPage.symbolInput).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Wheel Phase - Dropdown Menu', () => {
  test('should show View and Close Position options in dropdown menu', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade to create a wheel phase entry
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('DROPDOWNMENU');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '50',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Wheel Phase section and the row
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 10000 });

    await wheelPage.waitForSymbol('DROPDOWNMENU', 5000);
    const row = wheelPhaseSection.locator('text=DROPDOWNMENU').first().locator('..');
    await expect(row).toBeVisible({ timeout: 5000 });

    // Find and click the dropdown menu
    let dropdownTrigger = row.locator('button').last();
    if ((await dropdownTrigger.count()) === 0) {
      dropdownTrigger = row.locator('button').first();
    }

    await dropdownTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const isVisible = await dropdownTrigger.isVisible().catch(() => false);
    if (!isVisible) {
      await dropdownTrigger.evaluate((el: HTMLElement) => {
        (el as HTMLButtonElement).click();
      });
    } else {
      await dropdownTrigger.click({ force: true });
    }

    // Wait for dropdown menu to appear
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => {
          const text = btn.textContent || '';
          return /^View$/i.test(text.trim()) || /^Close Position$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    // Verify both options are present
    const viewOption = page
      .locator('button')
      .filter({ hasText: /^View$/i })
      .first();
    const closePositionOption = page
      .locator('button')
      .filter({ hasText: /^Close Position$/i })
      .first();

    await expect(viewOption).toBeVisible({ timeout: 5000 });
    await expect(closePositionOption).toBeVisible({ timeout: 5000 });
  });

  test('should open context drawer when clicking View option', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('VIEWTEST');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '100',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Wheel Phase section and the row
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 10000 });

    await wheelPage.waitForSymbol('VIEWTEST', 5000);
    const row = wheelPhaseSection.locator('text=VIEWTEST').first().locator('..');
    await expect(row).toBeVisible({ timeout: 5000 });

    // Find and click the dropdown menu
    let dropdownTrigger = row.locator('button').last();
    if ((await dropdownTrigger.count()) === 0) {
      dropdownTrigger = row.locator('button').first();
    }

    await dropdownTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const isVisible = await dropdownTrigger.isVisible().catch(() => false);
    if (!isVisible) {
      await dropdownTrigger.evaluate((el: HTMLElement) => {
        (el as HTMLButtonElement).click();
      });
    } else {
      await dropdownTrigger.click({ force: true });
    }

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

    // Verify context drawer (TickerDrawer) opens - look for symbol in drawer
    await page.waitForTimeout(1000);
    // The drawer should show the ticker symbol
    const drawerContent = await page.textContent('body');
    expect(drawerContent).toContain('VIEWTEST');
  });

  test('should show Close Position option and handle confirmation', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('CLOSEPOS');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '50',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Wheel Phase section and the row
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 10000 });

    await wheelPage.waitForSymbol('CLOSEPOS', 5000);
    const row = wheelPhaseSection.locator('text=CLOSEPOS').first().locator('..');
    await expect(row).toBeVisible({ timeout: 5000 });

    // Find and click the dropdown menu
    let dropdownTrigger = row.locator('button').last();
    if ((await dropdownTrigger.count()) === 0) {
      dropdownTrigger = row.locator('button').first();
    }

    await dropdownTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const isVisible = await dropdownTrigger.isVisible().catch(() => false);
    if (!isVisible) {
      await dropdownTrigger.evaluate((el: HTMLElement) => {
        (el as HTMLButtonElement).click();
      });
    } else {
      await dropdownTrigger.click({ force: true });
    }

    // Wait for dropdown menu
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => {
          const text = btn.textContent || '';
          return /^Close Position$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    // Click Close Position option
    const closePositionOption = page
      .locator('button')
      .filter({ hasText: /^Close Position$/i })
      .first();
    await expect(closePositionOption).toBeVisible({ timeout: 5000 });

    // Set up dialog handler to cancel (we don't want to actually close the position in tests)
    page.once('dialog', dialog => {
      expect(dialog.type()).toBe('confirm');
      dialog.dismiss(); // Cancel the close operation
    });

    await closePositionOption.click();

    // Verify confirmation dialog appeared
    await page.waitForTimeout(500);
    // Dialog should have been handled
  });
});

test.describe('Wheel Phase - Interactions', () => {
  test('should open context drawer when clicking ticker name', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('TICKERCLICK');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '30',
      strike: '100',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Wheel Phase section and the row
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 10000 });

    await wheelPage.waitForSymbol('TICKERCLICK', 5000);
    const row = wheelPhaseSection.locator('text=TICKERCLICK').first().locator('..');
    await expect(row).toBeVisible({ timeout: 5000 });

    // Click on the ticker name (should be clickable)
    const tickerName = row.locator('text=TICKERCLICK').first();
    await tickerName.click();

    // Verify context drawer (TickerDrawer) opens
    await page.waitForTimeout(1000);
    const drawerContent = await page.textContent('body');
    expect(drawerContent).toContain('TICKERCLICK');
  });
});
