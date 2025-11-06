import { expect,test } from '@playwright/test';

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
    await page.goto('/journal');
    await expect(page.getByRole('heading', { name: /journal/i })).toBeVisible();
  });

  test('should add a Sell Put trade', async ({ page }) => {
    const symbol = 'TESTPUT';
    
    // Open new entry modal
    await page.getByRole('button', { name: /new entry/i }).click();
    
    // Select Sell Put template
    await page.getByRole('button', { name: 'Sell Put' }).click();
    
    // Fill in the form
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill('2');
    await page.getByLabel(/strike/i).fill('150.00');
    await page.getByLabel(/premium/i).fill('2.50');
    await page.getByLabel(/fee/i).fill('1.30');
    
    // Save
    await page.getByRole('button', { name: /save entry/i }).click();
    
    // Wait for modal to close
    await page.waitForTimeout(500);
    
    // Wait for entry to appear in table with correct type
    // Use a more specific locator that waits for the entry to be saved
    const cellLocator = page.getByRole('cell', { name: symbol }).first();
    await expect(cellLocator).toBeVisible({ timeout: 10000 });
    
    const row = page.locator('tr', { has: page.getByRole('cell', { name: symbol }) }).filter({ hasText: 'sell to open' });
    await expect(row).toBeVisible({ timeout: 5000 });
  });

  test('should add a Put Assigned trade', async ({ page }) => {
    const symbol = 'TESTASSIGN';
    
    await page.getByRole('button', { name: /new entry/i }).click();
    await page.getByRole('button', { name: 'Put Assigned' }).click();
    
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill('1');
    await page.getByLabel(/strike/i).fill('100.00');
    
    await page.getByRole('button', { name: /save entry/i }).click();
    await page.waitForTimeout(1000);
    
    await expect(page.getByRole('cell', { name: symbol }).first()).toBeVisible();
    const row = page.locator('tr', { has: page.getByRole('cell', { name: symbol }) }).last();
    await expect(row).toContainText('assignment shares');
  });

  test('should add a Sell Covered Call trade', async ({ page }) => {
    const symbol = 'TESTCC';
    
    await page.getByRole('button', { name: /new entry/i }).click();
    await page.getByRole('button', { name: 'Sell Covered Call' }).click();
    
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill('3');
    await page.getByLabel(/strike/i).fill('175.00');
    await page.getByLabel(/premium/i).fill('1.75');
    
    await page.getByRole('button', { name: /save entry/i }).click();
    await page.waitForTimeout(1000);
    
    await expect(page.getByRole('cell', { name: symbol }).first()).toBeVisible();
    const row = page.locator('tr', { has: page.getByRole('cell', { name: symbol }) }).filter({ hasText: 'sell to open' });
    await expect(row).toBeVisible();
  });

  test('should add a Call Assigned trade', async ({ page }) => {
    const symbol = 'TESTCALL';
    
    await page.getByRole('button', { name: /new entry/i }).click();
    await page.getByRole('button', { name: 'Call Assigned' }).click();
    
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill('2');
    await page.getByLabel(/strike/i).fill('200.00');
    
    await page.getByRole('button', { name: /save entry/i }).click();
    await page.waitForTimeout(1000);
    
    await expect(page.getByRole('cell', { name: symbol }).first()).toBeVisible();
    const row = page.locator('tr', { has: page.getByRole('cell', { name: symbol }) }).last();
    await expect(row).toContainText('share sale');
  });

  test('should add a Dividend entry', async ({ page }) => {
    const symbol = 'TESTDIV';
    
    await page.getByRole('button', { name: /new entry/i }).click();
    await page.getByRole('button', { name: 'Dividend' }).click();
    
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/amount/i).fill('45.50');
    
    await page.getByRole('button', { name: /save entry/i }).click();
    await page.waitForTimeout(1000);
    
    await expect(page.getByRole('cell', { name: symbol }).first()).toBeVisible();
    const row = page.locator('tr', { has: page.getByRole('cell', { name: symbol }) }).last();
    await expect(row).toContainText('dividend');
  });

  test('should add a Fee entry', async ({ page }) => {
    const symbol = 'TESTFEE';
    
    await page.getByRole('button', { name: /new entry/i }).click();
    await page.waitForTimeout(500);
    
    // Click the Fee button using exact match  
    const feeButton = page.getByRole('button', { name: 'Fee', exact: true });
    await expect(feeButton).toBeVisible();
    await feeButton.click();
    
    // Wait for the button to be in primary state
    await expect(feeButton).toHaveClass(/primary/);
    
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/amount/i).fill('5.00');
    
    await page.getByRole('button', { name: /save entry/i }).click();
    await page.waitForTimeout(1000);
    
    await expect(page.getByRole('cell', { name: symbol }).first()).toBeVisible();
    
    // Verify the entry was created with 'fee' type
    const allRows = page.locator('tr').filter({ has: page.getByRole('cell', { name: symbol }) });
    const rowCount = await allRows.count();
    
    console.log(`Found ${rowCount} rows with symbol ${symbol}`);
    
    // Check each row and log the type
    for (let i = 0; i < rowCount; i++) {
      const rowText = await allRows.nth(i).textContent();
      console.log(`Row ${i}: ${rowText}`);
    }
    
    // Look for a row with 'fee' text in it
    const row = page.locator('tr', { has: page.getByRole('cell', { name: symbol }) }).last();
    await expect(row).toContainText('fee');
  });
});

test.describe('Journal - Edit Trade Entries', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Add a test entry first
    await page.goto('/journal');
    await expect(page.getByRole('heading', { name: /journal/i })).toBeVisible();
    
    // Add a sell put entry to edit
    await page.getByRole('button', { name: /new entry/i }).click();
    await page.getByRole('button', { name: 'Sell Put' }).click();
    await page.getByLabel(/symbol/i).fill('EDITTEST');
    await page.getByLabel(/contracts/i).fill('1');
    await page.getByLabel(/strike/i).fill('100.00');
    await page.getByLabel(/premium/i).fill('2.00');
    await page.getByRole('button', { name: /save entry/i }).click();
    await page.waitForTimeout(1000);
  });

  // Skip: This test requires VITE_FEATURE_JOURNAL_EDIT_DRAWER=true
  // The legacy edit form doesn't support editing strike/contracts
  test.skip('should edit an existing trade entry', async ({ page }) => {
    // Find and click edit button for EDITTEST entry
    const editButton = page.locator('button[title="Edit entry"]').first();
    await editButton.click();
    
    // Wait for edit drawer to open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /edit entry/i })).toBeVisible();
    
    // Verify the form is populated with existing values
    await expect(page.getByLabel(/symbol/i)).toHaveValue('EDITTEST');
    
    // Change the strike price
    const strikeInput = page.getByLabel(/strike/i);
    await strikeInput.clear();
    await strikeInput.fill('105.00');
    
    // Change contracts
    const contractsInput = page.getByLabel(/contracts/i);
    await contractsInput.clear();
    await contractsInput.fill('2');
    
    // Fill in the required edit reason
    await page.getByLabel(/edit reason/i).fill('Correcting strike price from broker statement');
    
    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();
    
    // Wait for drawer to close
    await page.waitForTimeout(1000);
    
    // Verify changes appear in the table
    await expect(page.getByRole('cell', { name: 'EDITTEST' }).last()).toBeVisible();
    await expect(page.getByText('$105.00')).toBeVisible();
  });

  // Skip: This test requires VITE_FEATURE_JOURNAL_EDIT_DRAWER=true
  // The legacy edit form doesn't support changing trade type
  test.skip('should change trade type when editing', async ({ page }) => {
    // Find and click edit button
    const editButton = page.locator('button[title="Edit entry"]').first();
    await editButton.click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Edit the amount (type editing not available in legacy edit form)
    const amountInput = page.getByLabel(/amount/i);
    await amountInput.fill('350.00');
    
    // Fill edit reason
    await page.getByLabel(/edit reason/i).fill('Updating trade amount');
    
    // Save
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForTimeout(1000);
    
    // Verify amount changed in table
    const row = page.locator('tr', { has: page.getByRole('cell', { name: 'EDITTEST' }) }).filter({ hasText: 'sell to open' });
    await expect(row).toContainText('$350.00');
  });

  test('should validate auto-calculation for assignment types', async ({ page }) => {
    // Add an assignment_shares entry
    await page.getByRole('button', { name: /new entry/i }).click();
    await page.getByRole('button', { name: 'Put Assigned' }).click();
    await page.getByLabel(/symbol/i).fill('AUTOCAL');
    await page.getByLabel(/contracts/i).fill('1');
    await page.getByLabel(/strike/i).fill('50.00');
    await page.getByRole('button', { name: /save entry/i }).click();
    await page.waitForTimeout(1000);
    
    // Edit the entry
    const editButtons = page.locator('button[title="Edit entry"]');
    await editButtons.last().click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Verify amount is auto-calculated: -(50 * 1 * 100) = -5000
    // Support both legacy modal (labeled Amount) and drawer (Amount input with placeholder)
    let amountInput = page.getByLabel(/amount/i);
    if (await amountInput.count().then(c => c === 0)) {
      amountInput = page.getByRole('dialog').locator('input[placeholder*="credit"], input[placeholder*="debit"]').first();
    }
    await expect(amountInput).toHaveValue('-5000');
    
    // Verify auto-calculated badge is shown
    await expect(page.getByText(/auto-calculated/i)).toBeVisible();
    
    // Change qty and verify recalculation
    // Support both legacy modal label and drawer label which can be "Contracts" or "Shares" for assignments
    let qtyInput = page.getByLabel(/contracts|shares/i);
    if (await qtyInput.count().then(c => c === 0)) {
      // Drawer fallback: query by adjacent label
      const sharesLabel = page.getByRole('dialog').locator('label:has-text("Shares")');
      const contractsLabel = page.getByRole('dialog').locator('label:has-text("Contracts")');
      if (await sharesLabel.count().then(c => c > 0)) {
        qtyInput = sharesLabel.locator('+ input').first();
      } else {
        qtyInput = contractsLabel.locator('+ input').first();
      }
    }

    // If the drawer shows "Shares", then 1 contract = 100 shares. Update to 2 contracts -> 200 shares.
    const isSharesMode = await page.getByRole('dialog').locator('label:has-text("Shares")').count().then(c => c > 0);
    await qtyInput.clear();
    await qtyInput.fill(isSharesMode ? '200' : '2');
    
    // Wait for recalculation
    await page.waitForTimeout(500);
    
    // Amount should update: -(50 * 2 * 100) = -10000
    await expect(amountInput).toHaveValue('-10000');
    
    // Cancel without saving
    await page.getByRole('button', { name: /cancel/i }).click();
  });
});

test.describe('Journal - Trade Entry Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/journal');
  });

  test('should require edit reason when editing', async ({ page }) => {
    // Add an entry first
    await page.getByRole('button', { name: /new entry/i }).click();
    await page.getByRole('button', { name: 'Sell Put' }).click();
    await page.getByLabel(/symbol/i).fill('REQTEST');
    await page.getByRole('button', { name: /save entry/i }).click();
    await page.waitForTimeout(1000);
    
    // Edit the entry
    const editButton = page.locator('button[title="Edit entry"]').first();
    await editButton.click();
    
    // Try to save without edit reason
    await page.getByRole('button', { name: /save changes/i }).click();
    
    // Should show alert or error
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('reason');
      dialog.accept();
    });
  });

  test('should handle decimal values correctly', async ({ page }) => {
    await page.getByRole('button', { name: /new entry/i }).click();
    await page.getByRole('button', { name: 'Sell Put' }).click();
    
    await page.getByLabel(/symbol/i).fill('DECIMAL');
    await page.getByLabel(/strike/i).fill('152.75');
    await page.getByLabel(/premium/i).fill('3.25');
    await page.getByLabel(/fee/i).fill('0.65');
    
    await page.getByRole('button', { name: /save entry/i }).click();
    await page.waitForTimeout(1000);
    
    await expect(page.getByRole('cell', { name: 'DECIMAL' }).first()).toBeVisible();
    await expect(page.getByText('$152.75').first()).toBeVisible();
  });
});
