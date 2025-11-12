import { expect, test } from '@playwright/test';

import { WheelPage } from '../pages/WheelPage';

/**
 * E2E: Edit an upcoming expiration date, save, reload, and verify persistence.
 * Flow:
 *  1) Add a short call to create an upcoming expiration row.
 *  2) Edit the expiration date via the inline editor and Save.
 *  3) Verify the new date is displayed.
 *  4) Reload the page and verify the new date persists (DB saved).
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
  // First, find and click the dropdown trigger (three dots icon)
  const dropdownTrigger = astsRow.locator('button').filter({ 
    has: page.locator('svg, [class*="icon"]')
  }).or(
    astsRow.locator('[class*="dropdown"] button')
  ).or(
    astsRow.locator('button').last()
  ).first();
  
  await expect(dropdownTrigger).toBeVisible({ timeout: 10000 });
  await dropdownTrigger.scrollIntoViewIfNeeded();
  await dropdownTrigger.click({ force: true });
  
  // Wait for dropdown menu to appear
  await page.waitForTimeout(500);
  
  // Now click the "Edit" option in the dropdown
  const editOption = page.getByRole('menuitem', { name: /Edit/i }).or(
    page.locator('text=/Edit/i').filter({ hasText: /Edit/i })
  ).first();
  
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
