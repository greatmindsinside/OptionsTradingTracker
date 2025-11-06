import type { Page } from '@playwright/test';
import { expect,test } from '@playwright/test';

/**
 * E2E: Edit an upcoming expiration date, save, reload, and verify persistence.
 * Flow:
 *  1) Add a short call to create an upcoming expiration row.
 *  2) Edit the expiration date via the inline editor and Save.
 *  3) Verify the new date is displayed.
 *  4) Reload the page and verify the new date persists (DB saved).
 */

// Helper function to fill trade form fields safely
async function fillTradeForm(
  page: Page,
  options: {
    qty: string;
    dte?: string;
    expiration?: string;
    strike: string;
    premium: string;
    fees?: string;
  }
) {
  await page.getByLabel(/qty/i).fill(options.qty);

  // Handle DTE - may be date picker or number input
  const expirationInput = page.getByLabel(/expiration/i).first();
  const dteInput = page.getByLabel(/dte/i).first();
  const hasDatePicker = (await expirationInput.count()) > 0;

  if (hasDatePicker && options.expiration) {
    await expirationInput.fill(options.expiration);
  } else if (!hasDatePicker && options.dte) {
    await dteInput.fill(options.dte);
  }

  await page.getByLabel(/strike/i).fill(options.strike);

  // Premium field - find by label "Premium" text or by position
  const premiumLabel = page.locator('text=/premium.*per share/i').first();
  const premiumInput = premiumLabel.locator('..').locator('input[type="number"]').first();
  if (await premiumInput.count() > 0) {
    await premiumInput.fill(options.premium);
  } else {
    // Fallback: find by position (after strike input)
    const allNumberInputs = await page.locator('input[type="number"]').all();
    // Premium is typically after qty, dte, strike - so index 3 if we have 4+ inputs
    if (allNumberInputs.length >= 4) {
      await (allNumberInputs[3]!).fill(options.premium);
    }
  }

  // Fees field - find input near "Fees" text or use last number input
  if (options.fees !== undefined) {
    const feesSection = page.locator('text=/fees/i').locator('..');
    const feesInput = feesSection.locator('input[type="number"]').first();
    if (await feesInput.count() > 0) {
      await feesInput.fill(options.fees);
    } else {
      // Fallback: use last number input
      const allNumberInputs = await page.locator('input[type="number"]').all();
      if (allNumberInputs.length > 0) {
        await (allNumberInputs[allNumberInputs.length - 1]!).fill(options.fees);
      }
    }
  }
}

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
  await page.getByLabel(/symbol/i).fill('ASTS');
  await page.locator('select').first().selectOption({ label: 'Call' });
  await page.locator('select').nth(1).selectOption({ label: 'Sell' });

  await fillTradeForm(page, {
    qty: '1',
    dte: '5',
    strike: '80',
    premium: '1.00',
    fees: '0',
  });

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

  // Verify the new date appears in the row (with longer timeout for async save)
  await expect(astsRow).toContainText(ymd, { timeout: 10000 });

  // Give the async DB write a moment to persist
  await page.waitForTimeout(1000);

  // Reload and verify persistence
  await page.reload();
  await page.waitForLoadState('networkidle');

  const upcoming2 = page.getByText('Upcoming Expirations').locator('..');
  const astsRow2 = upcoming2.locator('text=ASTS').first().locator('..');
  await expect(astsRow2).toBeVisible({ timeout: 10000 });
  await expect(astsRow2).toContainText(ymd, { timeout: 10000 });
});
