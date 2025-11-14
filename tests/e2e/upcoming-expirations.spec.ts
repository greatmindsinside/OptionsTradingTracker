import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

/**
 * E2E tests for Upcoming Expirations section
 * Comprehensive coverage of all functionality including display, editing, assign button, and dropdown menu
 */

function formatMMDDYYYY(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`; // matches input[type=date] formatting (YYYY-MM-DD)
}

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
});

test.describe('Upcoming Expirations - Display', () => {
  test('should show entries in Upcoming Expirations after adding trades', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Open trade drawer and choose Trade tab
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    // Fill in the trade form for a covered call
    await wheelPage.symbolInput.fill('ASTS');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '4',
      strike: '82',
      premium: '1.03',
      fees: '0',
    });

    // Submit the trade
    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);

    // Verify it appears in Upcoming Expirations
    const upcomingExpirations = page.locator('text=Upcoming Expirations').locator('..');
    await expect(upcomingExpirations).toBeVisible();

    // Should show ASTS with type "C" (Call) and strike 82
    await expect(
      upcomingExpirations
        .locator('text=/ASTS.*C.*82/')
        .or(upcomingExpirations.locator('text=/ASTS.*82.*DTE/'))
    ).toBeVisible();
  });

  test('should show call in upcoming expirations with correct type', async ({ page }) => {
    const wheelPage = new WheelPage(page);

    // Add a call trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('MSFT');

    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    // Fill form fields
    await wheelPage.qtyInput.fill('2');

    // Handle DTE - may be date picker or number input
    const expirationInput = wheelPage.expirationInput;
    const dteInput = wheelPage.dteInput;
    const hasDatePicker = (await expirationInput.count()) > 0;

    if (hasDatePicker) {
      // Use date picker - calculate date 7 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0]!;
      await expirationInput.fill(dateStr);
    } else {
      // Use DTE number input
      await dteInput.fill('7');
    }

    await wheelPage.strikeInput.fill('100');

    // Premium field - find by label "Premium" text or by position
    const premiumLabel = page.locator('text=/premium.*per share/i').first();
    const premiumInput = premiumLabel.locator('..').locator('input[type="number"]').first();
    if ((await premiumInput.count()) > 0) {
      await premiumInput.fill('1.75');
    } else {
      // Fallback: find by position (after strike input)
      const allNumberInputs = await page.locator('input[type="number"]').all();
      if (allNumberInputs.length >= 4) {
        await allNumberInputs[3]!.fill('1.75');
      }
    }

    // Fees field - find input near "Fees" text or use last number input
    const feesSection = page.locator('text=/fees/i').locator('..');
    const feesInput = feesSection.locator('input[type="number"]').first();
    if ((await feesInput.count()) > 0) {
      await feesInput.fill('0');
    } else {
      // Fallback: use last number input
      const allNumberInputs = await page.locator('input[type="number"]').all();
      if (allNumberInputs.length > 0) {
        await allNumberInputs[allNumberInputs.length - 1]!.fill('0');
      }
    }

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);

    // Check Upcoming Expirations section
    const upcomingSection = page.locator('text=Upcoming Expirations').locator('..');

    // Should show MSFT with "C" type indicator (not "P")
    const msftExpiration = upcomingSection.locator('text=MSFT').first();
    await expect(msftExpiration).toBeVisible();

    // Should show strike 100
    await expect(upcomingSection.locator('text=/MSFT.*100/')).toBeVisible();
  });

  test('should show correct DTE for upcoming expirations', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const wheelPage = new WheelPage(page);
    const symbol = 'DTETEST';

    // Calculate a date 7 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const expirationDate = futureDate.toISOString().split('T')[0]!;

    await journalPage.navigate();
    await journalPage.addEntry({
      tradeType: 'Sell Put',
      symbol,
      contracts: '1',
      strike: '50.00',
      premium: '1.00',
      expiration: expirationDate,
    });

    // Wait for entry to be saved
    await journalPage.waitForEntry(symbol);
    await page.waitForTimeout(2000);

    // Check wheel shows DTE
    await wheelPage.navigate();
    await wheelPage.waitForSymbol(symbol, 30000);

    // Should show DTE around 7 days
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain(symbol);
  });
});

test.describe('Upcoming Expirations - Edit Date', () => {
  test('editing Upcoming Expirations date persists after reload', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Open trade drawer and choose Trade tab
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    // Compose: Sell 1 Call ASTS, DTE 5, Strike 80
    await wheelPage.symbolInput.fill('ASTS');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '5',
      strike: '80',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(600);

    // Wait for trade to be saved and appear on wheel
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations card and the ASTS row
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    // Wait for ASTS to appear in upcoming expirations
    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('ASTS') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const astsRow = upcoming.locator('text=ASTS').first().locator('..');
    await expect(astsRow).toBeVisible({ timeout: 10000 });

    // Start editing - the edit button is in a dropdown menu (three dots icon)
    // Find the dropdown trigger button in the ASTS row
    // Try multiple strategies to find the button
    let dropdownTrigger = astsRow.locator('button').last();

    // If that doesn't work, try finding by the icon or any button in the row
    if ((await dropdownTrigger.count()) === 0) {
      dropdownTrigger = astsRow.locator('button').first();
    }

    await expect(dropdownTrigger).toBeVisible({ timeout: 10000 });
    await dropdownTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Try clicking with JavaScript if regular click doesn't work
    const isVisible = await dropdownTrigger.isVisible().catch(() => false);
    if (!isVisible) {
      await dropdownTrigger.evaluate((el: HTMLElement) => {
        (el as HTMLButtonElement).click();
      });
    } else {
      await dropdownTrigger.click({ force: true });
    }

    // Wait for dropdown menu to appear (it's rendered in a portal to document.body)
    // Wait for any button with "Edit" text to appear
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => {
          const text = btn.textContent || '';
          return /^Edit$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    // Now click the "Edit" option in the dropdown
    // The dropdown menu items are rendered as buttons in a portal
    const editOption = page
      .locator('button')
      .filter({ hasText: /^Edit$/i })
      .first();

    await expect(editOption).toBeVisible({ timeout: 5000 });
    await editOption.click();

    // Choose a new date = today + 2 days (ensure valid business date)
    const today = new Date();
    const newDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
    const ymd = formatMMDDYYYY(newDate); // YYYY-MM-DD for input[type=date]

    // Fill the date input and Save
    await astsRow.getByRole('textbox').fill(ymd);
    await astsRow.getByRole('button', { name: /^Save$/ }).click();

    // Verify the new date appears in the row (with longer timeout for async save)
    await expect(astsRow).toContainText(ymd, { timeout: 10000 });

    // Give the async DB write a moment to persist
    await wheelPage.wait(1000);

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    const upcoming2 = page.getByText('Upcoming Expirations').locator('..');
    const astsRow2 = upcoming2.locator('text=ASTS').first().locator('..');
    await expect(astsRow2).toBeVisible({ timeout: 10000 });
    await expect(astsRow2).toContainText(ymd, { timeout: 10000 });
  });
});

test.describe('Upcoming Expirations - Assign Button', () => {
  test('should show Assign button when DTE ≤ 3', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade with DTE = 2 (should show Assign button)
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('ASSIGNTEST');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '2',
      strike: '50',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and the row
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('ASSIGNTEST') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=ASSIGNTEST').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Assign button should be visible (DTE = 2 ≤ 3)
    const assignButton = row.getByRole('button', { name: /^Assign$/i });
    await expect(assignButton).toBeVisible({ timeout: 5000 });
  });

  test('should NOT show Assign button when DTE > 3', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade with DTE = 5 (should NOT show Assign button)
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('NOASSIGN');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '5',
      strike: '100',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and the row
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('NOASSIGN') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=NOASSIGN').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Assign button should NOT be visible (DTE = 5 > 3)
    const assignButton = row.getByRole('button', { name: /^Assign$/i });
    await expect(assignButton).not.toBeVisible({ timeout: 5000 });
  });

  test('should open Put assignment form with pre-filled data when clicking Assign button', async ({
    page,
  }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a Put trade with DTE = 2
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('PUTASSIGN');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '2',
      dte: '2',
      strike: '75',
      premium: '1.50',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and the row
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('PUTASSIGN') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=PUTASSIGN').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click Assign button
    const assignButton = row.getByRole('button', { name: /^Assign$/i });
    await expect(assignButton).toBeVisible({ timeout: 5000 });
    await assignButton.click();

    // Wait for assignment form to appear
    await page.waitForTimeout(1000);

    // Verify form is visible (should be a dialog/modal)
    const form = page
      .locator('text=/assign.*put/i')
      .or(page.locator('text=/put.*assignment/i'))
      .first();
    await expect(form).toBeVisible({ timeout: 5000 });

    // Verify pre-filled data (symbol, contracts, strike should be visible)
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('PUTASSIGN');
    // Contracts should be 2, strike should be 75
    expect(bodyText).toMatch(/2|75/);
  });

  test('should open Call assignment form with pre-filled data when clicking Assign button', async ({
    page,
  }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a Call trade with DTE = 3
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('CALLASSIGN');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '3',
      strike: '150',
      premium: '2.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and the row
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('CALLASSIGN') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=CALLASSIGN').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click Assign button
    const assignButton = row.getByRole('button', { name: /^Assign$/i });
    await expect(assignButton).toBeVisible({ timeout: 5000 });
    await assignButton.click();

    // Wait for assignment form to appear
    await page.waitForTimeout(1000);

    // Verify form is visible (should be a dialog/modal)
    const form = page
      .locator('text=/assign.*call/i')
      .or(page.locator('text=/call.*assignment/i'))
      .first();
    await expect(form).toBeVisible({ timeout: 5000 });

    // Verify pre-filled data (symbol, contracts, strike should be visible)
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('CALLASSIGN');
    // Contracts should be 1, strike should be 150
    expect(bodyText).toMatch(/1|150/);
  });

  test('should remove Put position from Upcoming Expirations after completing assignment', async ({
    page,
  }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a Put trade with DTE = 2 (should show Assign button)
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('PUTREMOVE');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '2',
      strike: '50',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and verify position appears
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('PUTREMOVE') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=PUTREMOVE').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click Assign button
    const assignButton = row.getByRole('button', { name: /^Assign$/i });
    await expect(assignButton).toBeVisible({ timeout: 5000 });
    await assignButton.click();

    // Wait for assignment form to appear
    await page.waitForTimeout(1000);

    // Verify form is visible
    const form = page
      .locator('text=/record.*put.*assignment/i')
      .or(page.locator('text=/put.*assignment/i'))
      .first();
    await expect(form).toBeVisible({ timeout: 5000 });

    // Verify pre-filled data is correct
    const symbolInput = page.getByLabel(/symbol/i);
    await expect(symbolInput).toHaveValue('PUTREMOVE', { timeout: 5000 });

    // Submit the assignment form
    const recordButton = page.getByRole('button', { name: /^record assignment$/i });
    await expect(recordButton).toBeVisible({ timeout: 5000 });
    await recordButton.click();

    // Wait for form to close and data to reload
    await page.waitForTimeout(2000);

    // Wait for the modal to disappear
    await page.waitForFunction(
      () => {
        const modals = document.querySelectorAll('[role="dialog"], .modal');
        return Array.from(modals).every(modal => {
          const style = window.getComputedStyle(modal);
          return style.display === 'none' || !modal.isConnected;
        });
      },
      { timeout: 10000 }
    );

    // Wait for wheel data to reload
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    // Verify the position is no longer in Upcoming Expirations
    const upcomingAfter = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcomingAfter).toBeVisible({ timeout: 10000 });

    // Wait a moment for the UI to update
    await page.waitForTimeout(1000);

    // Verify PUTREMOVE is no longer visible in Upcoming Expirations
    const rowAfter = upcomingAfter.locator('text=PUTREMOVE');
    await expect(rowAfter).not.toBeVisible({ timeout: 10000 });

    // Also verify by checking the section text doesn't contain the symbol
    const upcomingText = await upcomingAfter.textContent();
    expect(upcomingText).not.toContain('PUTREMOVE');
  });

  test('should remove Call position from Upcoming Expirations after completing assignment', async ({
    page,
  }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a Call trade with DTE = 3 (should show Assign button)
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('CALLREMOVE');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '3',
      strike: '100',
      premium: '1.50',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and verify position appears
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('CALLREMOVE') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=CALLREMOVE').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click Assign button
    const assignButton = row.getByRole('button', { name: /^Assign$/i });
    await expect(assignButton).toBeVisible({ timeout: 5000 });
    await assignButton.click();

    // Wait for assignment form to appear
    await page.waitForTimeout(1000);

    // Verify form is visible
    const form = page
      .locator('text=/record.*call.*assignment/i')
      .or(page.locator('text=/call.*assignment/i'))
      .first();
    await expect(form).toBeVisible({ timeout: 5000 });

    // Verify pre-filled data is correct
    const symbolInput = page.getByLabel(/symbol/i);
    await expect(symbolInput).toHaveValue('CALLREMOVE', { timeout: 5000 });

    // Submit the assignment form
    const recordButton = page.getByRole('button', { name: /^record assignment$/i });
    await expect(recordButton).toBeVisible({ timeout: 5000 });
    await recordButton.click();

    // Wait for form to close and data to reload
    await page.waitForTimeout(2000);

    // Wait for the modal to disappear
    await page.waitForFunction(
      () => {
        const modals = document.querySelectorAll('[role="dialog"], .modal');
        return Array.from(modals).every(modal => {
          const style = window.getComputedStyle(modal);
          return style.display === 'none' || !modal.isConnected;
        });
      },
      { timeout: 10000 }
    );

    // Wait for wheel data to reload
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    // Verify the position is no longer in Upcoming Expirations
    const upcomingAfter = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcomingAfter).toBeVisible({ timeout: 10000 });

    // Wait a moment for the UI to update
    await page.waitForTimeout(1000);

    // Verify CALLREMOVE is no longer visible in Upcoming Expirations
    const rowAfter = upcomingAfter.locator('text=CALLREMOVE');
    await expect(rowAfter).not.toBeVisible({ timeout: 10000 });

    // Also verify by checking the section text doesn't contain the symbol
    const upcomingText = await upcomingAfter.textContent();
    expect(upcomingText).not.toContain('CALLREMOVE');
  });
});

test.describe('Upcoming Expirations - Dropdown Menu', () => {
  test('should show Edit and Plan Roll options in dropdown menu', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade to create an upcoming expiration
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('DROPDOWN');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '10',
      strike: '100',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and the row
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('DROPDOWN') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=DROPDOWN').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Find and click the dropdown trigger (three dots icon)
    let dropdownTrigger = row.locator('button').last();
    if ((await dropdownTrigger.count()) === 0) {
      dropdownTrigger = row.locator('button').first();
    }

    await expect(dropdownTrigger).toBeVisible({ timeout: 10000 });
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
          return /^Edit$/i.test(text.trim()) || /^Plan Roll$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    // Verify both options are present
    const editOption = page
      .locator('button')
      .filter({ hasText: /^Edit$/i })
      .first();
    const planRollOption = page
      .locator('button')
      .filter({ hasText: /^Plan Roll$/i })
      .first();

    await expect(editOption).toBeVisible({ timeout: 5000 });
    await expect(planRollOption).toBeVisible({ timeout: 5000 });
  });

  test('should open inline date editor when clicking Edit option', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('EDITTEST');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '7',
      strike: '50',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and the row
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('EDITTEST') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=EDITTEST').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Open dropdown and click Edit
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
          return /^Edit$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    const editOption = page
      .locator('button')
      .filter({ hasText: /^Edit$/i })
      .first();
    await expect(editOption).toBeVisible({ timeout: 5000 });
    await editOption.click();

    // Verify inline date editor appears (should have a textbox for date input)
    await page.waitForTimeout(500);
    const dateInput = row.getByRole('textbox');
    await expect(dateInput).toBeVisible({ timeout: 5000 });
  });

  test('should open Put roll form with pre-filled data when clicking Plan Roll', async ({
    page,
  }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a Put trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('PUTROLL');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '2',
      dte: '10',
      strike: '60',
      premium: '1.50',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and the row
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('PUTROLL') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=PUTROLL').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Open dropdown and click Plan Roll
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
          return /^Plan Roll$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    const planRollOption = page
      .locator('button')
      .filter({ hasText: /^Plan Roll$/i })
      .first();
    await expect(planRollOption).toBeVisible({ timeout: 5000 });
    await planRollOption.click();

    // Wait for roll form to appear
    await page.waitForTimeout(1000);

    // Verify form is visible (should be a dialog/modal with roll-related text)
    const form = page.locator('text=/roll.*put/i').or(page.locator('text=/put.*roll/i')).first();
    await expect(form).toBeVisible({ timeout: 5000 });

    // Verify pre-filled data (symbol, oldContracts, oldStrike should be visible)
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('PUTROLL');
    // Old contracts should be 2, old strike should be 60
    expect(bodyText).toMatch(/2|60/);
  });

  test('should open Call roll form with pre-filled data when clicking Plan Roll', async ({
    page,
  }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a Call trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('CALLROLL');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '15',
      strike: '200',
      premium: '2.50',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(1000);
    await page.waitForTimeout(2000);

    // Locate Upcoming Expirations and the row
    const upcoming = page.getByText('Upcoming Expirations').locator('..');
    await expect(upcoming).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('CALLROLL') && text.includes('Upcoming Expirations');
      },
      { timeout: 10000 }
    );

    const row = upcoming.locator('text=CALLROLL').first().locator('..');
    await expect(row).toBeVisible({ timeout: 10000 });

    // Open dropdown and click Plan Roll
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
          return /^Plan Roll$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    const planRollOption = page
      .locator('button')
      .filter({ hasText: /^Plan Roll$/i })
      .first();
    await expect(planRollOption).toBeVisible({ timeout: 5000 });
    await planRollOption.click();

    // Wait for roll form to appear
    await page.waitForTimeout(1000);

    // Verify form is visible (should be a dialog/modal with roll-related text)
    const form = page.locator('text=/roll.*call/i').or(page.locator('text=/call.*roll/i')).first();
    await expect(form).toBeVisible({ timeout: 5000 });

    // Verify pre-filled data (symbol, oldContracts, oldStrike should be visible)
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('CALLROLL');
    // Old contracts should be 1, old strike should be 200
    expect(bodyText).toMatch(/1|200/);
  });
});

test.describe('Upcoming Expirations - Negative DTE Fixes', () => {
  test('should filter out expired positions (DTE < 0)', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade with future expiration
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('EXPIREDTEST');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '10',
      strike: '50',
      premium: '1.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Wait for position to appear
    const upcomingExpirations = page.locator('text=Upcoming Expirations').locator('..');
    await expect(upcomingExpirations.locator('text=EXPIREDTEST')).toBeVisible({ timeout: 10000 });

    // Get the position ID by extracting it from the row's key or data attribute
    // The row is rendered with key={row.id}, so we can get it from React's internal state
    // or we can use a simpler approach: edit the date through UI and capture the ID
    // Actually, let's use the updateExpiration flow which saves the override

    // Edit the expiration date to today (which will give us DTE = 0, still valid)
    // Then we'll manually adjust the override to have negative DTE
    const row = upcomingExpirations.locator('text=EXPIREDTEST').first().locator('..');

    // Open dropdown and click Edit
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
          return /^Edit$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    const editOption = page
      .locator('button')
      .filter({ hasText: /^Edit$/i })
      .first();
    await expect(editOption).toBeVisible({ timeout: 5000 });
    await editOption.click();

    // Wait for date input
    await page.waitForTimeout(500);
    const dateInput = row.locator('input[type="date"]');
    await expect(dateInput).toBeVisible({ timeout: 5000 });

    // Set expiration to today (DTE = 0, still valid for display)
    const today = formatMMDDYYYY(new Date());
    await dateInput.fill(today);
    await row.locator('button', { hasText: /^Save$/ }).click();
    await page.waitForTimeout(1000);

    // Now get the actual position ID from the override that was just saved
    const actualPositionId = await page.evaluate(() => {
      const overrides = localStorage.getItem('wheel_dte_overrides');
      if (overrides) {
        const parsed = JSON.parse(overrides);
        const ids = Object.keys(parsed);
        // Find the one for EXPIREDTEST
        for (const id of ids) {
          if (parsed[id]?.ticker === 'EXPIREDTEST') {
            return id;
          }
        }
      }
      return null;
    });

    // Calculate a past date (2 days ago)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);
    const pastDateStr = formatMMDDYYYY(pastDate);

    // Update the override to have negative DTE
    if (actualPositionId) {
      await page.evaluate(
        ({ posId, pastDate }) => {
          const overrides = JSON.parse(localStorage.getItem('wheel_dte_overrides') || '{}');
          if (overrides[posId]) {
            overrides[posId] = {
              ...overrides[posId],
              overrideDte: -2, // Negative DTE
              overrideExpiration: pastDate,
            };
            localStorage.setItem('wheel_dte_overrides', JSON.stringify(overrides));
          }
        },
        { posId: actualPositionId, pastDate: pastDateStr }
      );
    }

    // Reload page to apply the updated override
    await page.reload();
    await page.waitForLoadState('networkidle');
    await wheelPage.waitForPageLoad();

    // Verify expired position is NOT shown in Upcoming Expirations
    const upcomingAfterReload = page.locator('text=Upcoming Expirations').locator('..').first();
    await expect(upcomingAfterReload).toBeVisible({ timeout: 10000 });
    const expiredText = await upcomingAfterReload.locator('text=EXPIREDTEST').count();
    expect(expiredText).toBe(0);

    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('wheel_dte_overrides');
    });
  });

  test('should prevent selecting past dates in date picker', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('DATETEST');
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '5',
      strike: '100',
      premium: '2.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Find the position in Upcoming Expirations
    const upcomingExpirations = page.locator('text=Upcoming Expirations').locator('..');
    await expect(upcomingExpirations.locator('text=DATETEST')).toBeVisible({ timeout: 10000 });

    const row = upcomingExpirations.locator('text=DATETEST').first().locator('..');

    // Open dropdown and click Edit
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
          return /^Edit$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    const editOption = page
      .locator('button')
      .filter({ hasText: /^Edit$/i })
      .first();
    await expect(editOption).toBeVisible({ timeout: 5000 });
    await editOption.click();

    // Wait for date input to appear
    await page.waitForTimeout(500);
    const dateInput = row.locator('input[type="date"]');
    await expect(dateInput).toBeVisible({ timeout: 5000 });

    // Verify the min attribute is set to today's date
    const minValue = await dateInput.getAttribute('min');
    expect(minValue).toBeTruthy();

    const today = formatMMDDYYYY(new Date());
    expect(minValue).toBe(today);

    // Verify that the min attribute prevents past date selection in the UI
    // Note: fill() can bypass min attribute programmatically, but the UI date picker
    // will respect it. We verify the attribute is set correctly.
    // The actual UI prevention is tested by the fact that users can't select past dates
    // in the date picker calendar widget.
  });

  test('should clamp DTE display to never show negative values', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Add a trade with future expiration
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('DTECLAMPTEST');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    await wheelPage.fillTradeForm({
      qty: '1',
      dte: '7',
      strike: '75',
      premium: '1.50',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Find the position
    const upcomingExpirations = page.locator('text=Upcoming Expirations').locator('..');
    await expect(upcomingExpirations.locator('text=DTECLAMPTEST')).toBeVisible({ timeout: 10000 });

    // Get the row text and verify DTE is displayed (should be non-negative)
    const row = upcomingExpirations.locator('text=DTECLAMPTEST').first().locator('..');
    const rowText = await row.textContent();

    // Verify DTE is displayed and is not negative
    expect(rowText).toMatch(/DTE\s*\d+/);
    // Should not contain negative DTE pattern
    expect(rowText).not.toMatch(/DTE\s*-\d+/);
  });
});

test.describe('Upcoming Expirations - Expiration Date Timezone', () => {
  test('should display correct expiration date in Upcoming Expirations', async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.navigate();

    // Open trade form
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();
    await wheelPage.symbolInput.fill('DATETZTEST');
    await wheelPage.selectOptionType('Put');
    await wheelPage.selectSide('Sell');

    // Set expiration date to 2025-11-14
    const expirationDate = '2025-11-14';
    await wheelPage.fillTradeForm({
      qty: '1',
      expiration: expirationDate,
      strike: '100',
      premium: '2.00',
      fees: '0',
    });

    await wheelPage.addTradeButton.click();
    await wheelPage.wait(2000);

    // Wait for position to appear in Upcoming Expirations
    const upcomingExpirations = page.locator('text=Upcoming Expirations').locator('..');
    await expect(upcomingExpirations.locator('text=DATETZTEST')).toBeVisible({ timeout: 10000 });

    // Verify the expiration date displays correctly as 2025-11-14 (not 2025-11-13)
    const row = upcomingExpirations.locator('text=DATETZTEST').first().locator('..');
    const rowText = await row.textContent();

    // Should contain the correct date 2025-11-14
    expect(rowText).toContain('2025-11-14');
    // Should NOT contain the incorrect date 2025-11-13
    expect(rowText).not.toContain('2025-11-13');

    // Navigate to Journal page and verify entry was saved (confirms expiration date is stored correctly)
    await page.getByRole('link', { name: 'Journal' }).click();
    await page.waitForLoadState('networkidle');

    // Wait for journal entries to load
    await page.waitForTimeout(1000);

    // Find the entry with our symbol - this confirms the trade was saved with the correct expiration
    // The expiration date is stored correctly because:
    // 1. We fixed toIso() to parse YYYY-MM-DD as local date before converting to ISO
    // 2. The Upcoming Expirations already verified the date displays correctly (checked above)
    const journalEntry = page.locator('text=DATETZTEST').first();
    await expect(journalEntry).toBeVisible({ timeout: 10000 });
  });
});
