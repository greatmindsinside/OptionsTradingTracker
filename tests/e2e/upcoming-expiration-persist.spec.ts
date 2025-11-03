import { test, expect } from '@playwright/test';

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
  await page.goto('http://localhost:5173/wheel');
  await page.waitForLoadState('networkidle');

  // Open trade drawer and choose Trade tab
  await page.getByRole('button', { name: /Premium Printer/i }).click();
  await page.getByRole('button', { name: /^Trade$/ }).click();

  // Compose: Sell 1 Call ASTS, DTE 5, Strike 80
  await page.getByRole('textbox', { name: 'e.g. AAPL' }).fill('ASTS');
  await page.locator('select').first().selectOption({ label: 'Call' });
  await page.locator('select').nth(1).selectOption({ label: 'Sell' });

  const nums = page.locator('input[type="number"]');
  await nums.nth(0).fill('1'); // qty
  await nums.nth(1).fill('5'); // dte
  await nums.nth(2).fill('80'); // strike
  await nums.nth(3).fill('1.00'); // premium
  await nums.nth(4).fill('0'); // fees

  await page.getByRole('button', { name: /\+ Add Trade/ }).click();
  await page.waitForTimeout(600);

  // Locate Upcoming Expirations card and the ASTS row
  const upcoming = page.getByText('Upcoming Expirations').locator('..');
  await expect(upcoming).toBeVisible();
  const astsRow = upcoming.locator('text=ASTS').first().locator('..');
  await expect(astsRow).toBeVisible();

  // Start editing
  await astsRow.getByRole('button', { name: /Edit/ }).click();

  // Choose a new date = today + 2 days (ensure valid business date)
  const today = new Date();
  const newDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
  const ymd = formatMMDDYYYY(newDate); // YYYY-MM-DD for input[type=date]

  // Fill the date input and Save
  await astsRow.getByRole('textbox').fill(ymd);
  await astsRow.getByRole('button', { name: /^Save$/ }).click();

  // Verify the new date appears in the row
  await expect(astsRow).toContainText(ymd);

  // Give the async DB write a moment to persist
  await page.waitForTimeout(300);

  // Reload and verify persistence
  await page.reload();
  await page.waitForLoadState('networkidle');

  const upcoming2 = page.getByText('Upcoming Expirations').locator('..');
  const astsRow2 = upcoming2.locator('text=ASTS').first().locator('..');
  await expect(astsRow2).toBeVisible();
  await expect(astsRow2).toContainText(ymd);
});
