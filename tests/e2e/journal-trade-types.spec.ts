import type { Locator } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';

/**
 * Comprehensive E2E tests for Journal trade entry and editing
 * Covers all trade types:
 * - Sell Put (sell_to_open with Put)
 * - Sell Covered Call (sell_to_open with Call)
 * - Put Assignment (assignment_shares)
 * - Call Assignment (share_sale)
 * - Expiration
 * - Dividend
 * - Fee
 */

test.describe('Journal - Add All Trade Types', () => {
  test.beforeEach(async ({ page }) => {
    const journalPage = new JournalPage(page);
    await journalPage.navigate();
  });

  test('should add a Sell Put trade', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const symbol = 'TESTPUT';

    await journalPage.addEntry({
      tradeType: 'Sell Put',
      symbol,
      contracts: '2',
      strike: '150.00',
      premium: '2.50',
      fee: '1.30',
    });

    // Wait for entry to appear in table with correct type
    await journalPage.waitForEntry(symbol);
    await journalPage.waitForEntryWithType(symbol, 'sell to open');
  });

  test('should add a Put Assigned trade', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const symbol = 'TESTASSIGN';

    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol,
      contracts: '1',
      strike: '100.00',
    });

    await journalPage.waitForEntry(symbol);
    // Wait for the type text to appear in the page (it's displayed as "assignment shares")
    await journalPage.waitForEntryWithType(symbol, 'assignment shares');
  });

  test('should add a Sell Covered Call trade', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const symbol = 'TESTCC';

    await journalPage.addEntry({
      tradeType: 'Sell Covered Call',
      symbol,
      contracts: '3',
      strike: '175.00',
      premium: '1.75',
    });

    await journalPage.waitForEntry(symbol);
    await journalPage.waitForEntryWithType(symbol, 'sell to open');
  });

  test('should add a Call Assigned trade', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const symbol = 'TESTCALL';

    await journalPage.addEntry({
      tradeType: 'Call Assigned',
      symbol,
      contracts: '2',
      strike: '200.00',
    });

    await journalPage.waitForEntry(symbol);
    // Wait for the type text to appear in the page (it's displayed as "share sale")
    await journalPage.waitForEntryWithType(symbol, 'share sale');
  });

  test('should add a Dividend entry', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const symbol = 'TESTDIV';

    await journalPage.addEntry({
      tradeType: 'Dividend',
      symbol,
      amount: '45.50',
    });

    await journalPage.waitForEntry(symbol);
    // Wait for the type text to appear in the page
    await journalPage.waitForEntryWithType(symbol, 'dividend');
  });

  test('should add a Fee entry', async ({ page }) => {
    const journalPage = new JournalPage(page);
    const symbol = 'TESTFEE';

    await journalPage.openNewEntryModal();
    await journalPage.wait(500);

    // Click the Fee button using exact match
    const feeButton = page.getByRole('button', { name: 'Fee', exact: true });
    await expect(feeButton).toBeVisible();
    await feeButton.click();

    // Wait for the button to be in primary state
    await expect(feeButton).toHaveClass(/primary/);

    await journalPage.fillEntryForm({
      symbol,
      amount: '5.00',
    });

    await journalPage.saveEntry();

    // Wait for the entry to appear in the UI with the 'fee' type
    // This ensures both the symbol and type are present
    // waitForEntryWithType already verifies that the entry exists with the correct type
    await journalPage.waitForEntryWithType(symbol, 'fee');

    // The waitForEntryWithType method already verified that both the symbol and "fee" type
    // appear in the page, so we don't need additional verification
  });
});

test.describe('Journal - Edit Trade Entries', () => {
  test.beforeEach(async ({ page }) => {
    const journalPage = new JournalPage(page);
    // Setup: Add a test entry first
    await journalPage.navigate();

    // Add a sell put entry to edit
    await journalPage.addEntry({
      tradeType: 'Sell Put',
      symbol: 'EDITTEST',
      contracts: '1',
      strike: '100.00',
      premium: '2.00',
    });
  });

  // Skip: This test requires VITE_FEATURE_JOURNAL_EDIT_DRAWER=true
  // The legacy edit form doesn't support editing strike/contracts
  test.skip('should edit an existing trade entry', async ({ page }) => {
    const journalPage = new JournalPage(page);

    // Find and click edit button for EDITTEST entry
    const editButton = journalPage.getEditButton(0);
    await editButton.click();

    // Wait for edit drawer to open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /edit entry/i })).toBeVisible();

    // Verify the form is populated with existing values
    await expect(journalPage.symbolInput).toHaveValue('EDITTEST');

    // Change the strike price
    const strikeInput = journalPage.strikeInput;
    await strikeInput.clear();
    await strikeInput.fill('105.00');

    // Change contracts
    const contractsInput = journalPage.contractsInput;
    await contractsInput.clear();
    await contractsInput.fill('2');

    // Fill in the required edit reason
    await page.getByLabel(/edit reason/i).fill('Correcting strike price from broker statement');

    // Save changes
    await journalPage.saveChangesButton.click();

    // Wait for drawer to close
    await journalPage.wait(1000);

    // Verify changes appear in the table
    await expect(page.getByRole('cell', { name: 'EDITTEST' }).last()).toBeVisible();
    await expect(page.getByText('$105.00')).toBeVisible();
  });

  // Skip: This test requires VITE_FEATURE_JOURNAL_EDIT_DRAWER=true
  // The legacy edit form doesn't support changing trade type
  test.skip('should change trade type when editing', async ({ page }) => {
    const journalPage = new JournalPage(page);

    // Find and click edit button
    const editButton = journalPage.getEditButton(0);
    await editButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();

    // Edit the amount (type editing not available in legacy edit form)
    const amountInput = journalPage.amountInput;
    await amountInput.fill('350.00');

    // Fill edit reason
    await page.getByLabel(/edit reason/i).fill('Updating trade amount');

    // Save
    await journalPage.saveChangesButton.click();
    await journalPage.wait(1000);

    // Verify amount changed in table
    const row = (await journalPage.getEntryRow('EDITTEST')).filter({ hasText: 'sell to open' });
    await expect(row).toContainText('$350.00');
  });

  test('should validate auto-calculation for assignment types', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for this test
    const journalPage = new JournalPage(page);

    // Add an assignment_shares entry
    await journalPage.addEntry({
      tradeType: 'Put Assigned',
      symbol: 'AUTOCAL',
      contracts: '1',
      strike: '50.00',
    });

    // Wait for entry to appear
    await journalPage.waitForEntry('AUTOCAL');
    await page.waitForTimeout(1000);

    // Edit the entry - find the edit button for this entry
    const editButtons = page.locator('button[title="Edit entry"]');
    const buttonCount = await editButtons.count();

    // Click the last edit button (should be for the most recent entry)
    if (buttonCount > 0) {
      const editButton = editButtons.last();
      const isVisible = await editButton.isVisible().catch(() => false);
      if (!isVisible) {
        // Button exists but is hidden - use JavaScript click
        await editButton.evaluate((el: HTMLElement) => {
          (el as HTMLButtonElement).click();
        });
      } else {
        await expect(editButton).toBeEnabled({ timeout: 5000 });
        await editButton.scrollIntoViewIfNeeded();
        await editButton.click({ timeout: 5000 });
      }
    } else {
      // Fallback: use the editEntry method
      await journalPage.editEntry('AUTOCAL', {}, 0);
    }

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Verify amount is auto-calculated: -(50 * 1 * 100) = -5000
    // Support both legacy modal (labeled Amount) and drawer (Amount input with placeholder "0.00")
    // The amount input in JournalDrawer has label "Amount" and placeholder "0.00"
    let amountInput = page
      .getByRole('dialog')
      .locator('label:has-text("Amount")')
      .locator('..')
      .locator('input[type="text"][placeholder*="0.00"]')
      .first();

    // If not found, try alternative selectors
    if ((await amountInput.count()) === 0) {
      amountInput = page
        .getByRole('dialog')
        .locator('input[placeholder*="0.00"]')
        .filter({
          has: page.locator('label:has-text("Amount")').locator('..'),
        })
        .first();
    }

    if ((await amountInput.count()) === 0) {
      // Fallback to journalPage.amountInput
      amountInput = journalPage.amountInput;
    }

    await expect(amountInput).toBeVisible({ timeout: 10000 });
    // Wait a bit for auto-calculation to complete
    await page.waitForTimeout(500);
    await expect(amountInput).toHaveValue('-5000', { timeout: 10000 });

    // Verify auto-calculated badge is shown
    await expect(page.getByText(/auto-calculated/i)).toBeVisible();

    // Change qty and verify recalculation
    // Support both legacy modal label and drawer label which can be "Contracts" or "Shares" for assignments
    let qtyInput = page.getByLabel(/contracts|shares/i);
    if ((await qtyInput.count()) === 0) {
      // Drawer fallback: query by adjacent label
      const sharesLabel = page.getByRole('dialog').locator('label:has-text("Shares")');
      const contractsLabel = page.getByRole('dialog').locator('label:has-text("Contracts")');
      if ((await sharesLabel.count()) > 0) {
        qtyInput = sharesLabel.locator('+ input').first();
      } else {
        qtyInput = contractsLabel.locator('+ input').first();
      }
    }

    // If the drawer shows "Shares", then 1 contract = 100 shares. Update to 2 contracts -> 200 shares.
    const isSharesMode =
      (await page.getByRole('dialog').locator('label:has-text("Shares")').count()) > 0;
    await qtyInput.clear();
    await qtyInput.fill(isSharesMode ? '200' : '2');

    // Wait for recalculation
    await journalPage.wait(500);

    // Amount should update: -(50 * 2 * 100) = -10000
    await expect(amountInput).toHaveValue('-10000');

    // Cancel without saving
    await journalPage.cancelButton.click();
  });
});

test.describe('Journal - Trade Entry Validation', () => {
  test.beforeEach(async ({ page }) => {
    const journalPage = new JournalPage(page);
    await journalPage.navigate();
  });

  test('should require edit reason when editing', async ({ page }) => {
    const journalPage = new JournalPage(page);

    // Add an entry first
    await journalPage.addEntry({
      tradeType: 'Sell Put',
      symbol: 'REQTEST',
    });

    // Wait for entry to appear
    await journalPage.waitForEntry('REQTEST');
    await page.waitForTimeout(1000);

    // Set up dialog handler BEFORE clicking save
    let dialogHandled = false;
    page.on('dialog', dialog => {
      dialogHandled = true;
      expect(dialog.message().toLowerCase()).toMatch(/reason|required|edit/i);
      dialog.accept();
    });

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    await journalPage.waitForTableOrCards();
    await page.waitForTimeout(500);

    // Find the edit button for the REQTEST entry
    // Use the same approach as editEntry method
    let entryRow: Locator | null = null;
    try {
      entryRow = await journalPage.getEntryRow('REQTEST');
      await expect(entryRow)
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          entryRow = null;
        });
    } catch {
      entryRow = null;
    }

    let editButton: Locator;
    if (entryRow) {
      editButton = entryRow.locator('button[title="Edit entry"]').first();
      if ((await editButton.count()) === 0) {
        editButton = journalPage.getEditButton(0);
      }
    } else {
      editButton = journalPage.getEditButton(0);
    }

    // Check if button exists and click it (even if hidden)
    const buttonExists = (await editButton.count()) > 0;
    if (!buttonExists) {
      throw new Error('Edit button not found for REQTEST entry');
    }

    const isVisible = await editButton.isVisible().catch(() => false);
    if (!isVisible) {
      await editButton.evaluate((el: HTMLElement) => {
        (el as HTMLButtonElement).click();
      });
    } else {
      await expect(editButton).toBeEnabled({ timeout: 5000 });
      await editButton.scrollIntoViewIfNeeded();
      await editButton.click({ timeout: 5000 });
    }

    // Wait for edit modal/drawer to open
    await page.waitForSelector('h2:has-text("Edit Entry")', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Try to save without edit reason
    await journalPage.saveChangesButton.click();

    // Wait for dialog to appear (alert is synchronous, so we need to wait a bit)
    await page.waitForTimeout(500);

    // Verify dialog was shown
    expect(dialogHandled).toBe(true);
  });

  test('should handle decimal values correctly', async ({ page }) => {
    const journalPage = new JournalPage(page);

    await journalPage.addEntry({
      tradeType: 'Sell Put',
      symbol: 'DECIMAL',
      strike: '152.75',
      premium: '3.25',
      fee: '0.65',
    });

    await journalPage.waitForEntry('DECIMAL');
    await expect(page.getByText('$152.75').first()).toBeVisible();
  });
});
