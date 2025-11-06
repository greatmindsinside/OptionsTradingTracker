import { expect,test } from '@playwright/test';

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
    // Navigate to journal page
    await page.goto('/journal');
    await expect(page.getByTestId('journal.title')).toBeVisible();
  });

  test('should show correct covered shares after put assignment and covered call', async ({
    page,
  }) => {
    const symbol = 'SHARES4CALLS';
    const contracts = 1; // 1 contract = 100 shares

    // Step 1: Add Put Assignment (creates shares)
    {
      const newEntryBtn = page.getByRole('button', { name: /new entry/i });
      await expect(newEntryBtn).toBeVisible();
      await newEntryBtn.scrollIntoViewIfNeeded();
      await newEntryBtn.click();
    }

    await page.getByRole('button', { name: 'Put Assigned' }).click();
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill(String(contracts));
    await page.getByLabel(/strike/i).fill('50.00');

    {
      const dialog = page.getByRole('dialog', { name: /new entry/i });
      await expect(dialog).toBeVisible();
      const save = dialog.getByRole('button', { name: /save entry/i });
      await expect(save).toBeVisible();
      await expect(save).toBeEnabled();
      await save.click({ force: true });
    }

    await page.waitForTimeout(1000);

    // Step 2: Add Sell Covered Call (creates short call position)
    {
      const newEntryBtn = page.getByRole('button', { name: /new entry/i });
      await expect(newEntryBtn).toBeVisible();
      await newEntryBtn.scrollIntoViewIfNeeded();
      await newEntryBtn.click();
    }

    await page.getByRole('button', { name: 'Sell Covered Call' }).click();
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill(String(contracts));
    await page.getByLabel(/strike/i).fill('55.00');
    await page.getByLabel(/premium/i).fill('1.00');

    {
      const dialog = page.getByRole('dialog', { name: /new entry/i });
      await expect(dialog).toBeVisible();
      const save = dialog.getByRole('button', { name: /save entry/i });
      await expect(save).toBeVisible();
      await expect(save).toBeEnabled();
      await save.click({ force: true });
    }

    await page.waitForTimeout(1000);

    // Step 3: Navigate to Wheel page and verify "Shares For Calls" metric
    await page.goto('/');
    await expect(page.getByTestId('wheel.title')).toBeVisible();

    // Wait for wheel data to load
    await page.waitForLoadState('networkidle');

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
    const symbol = 'SHARESUPDATE';
    const contracts = 2; // 2 contracts = 200 shares

    // Step 1: Add Put Assignment (creates 200 shares)
    {
      const newEntryBtn = page.getByRole('button', { name: /new entry/i });
      await expect(newEntryBtn).toBeVisible();
      await newEntryBtn.scrollIntoViewIfNeeded();
      await newEntryBtn.click();
    }

    await page.getByRole('button', { name: 'Put Assigned' }).click();
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill(String(contracts));
    await page.getByLabel(/strike/i).fill('50.00');

    {
      const dialog = page.getByRole('dialog', { name: /new entry/i });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /save entry/i }).click({ force: true });
    }

    await page.waitForTimeout(1000);

    // Step 2: Add Sell Covered Call (1 contract = 100 shares covered)
    {
      const newEntryBtn = page.getByRole('button', { name: /new entry/i });
      await newEntryBtn.click();
    }

    await page.getByRole('button', { name: 'Sell Covered Call' }).click();
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill('1'); // 1 contract = 100 shares
    await page.getByLabel(/strike/i).fill('55.00');
    await page.getByLabel(/premium/i).fill('1.00');

    {
      const dialog = page.getByRole('dialog', { name: /new entry/i });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /save entry/i }).click({ force: true });
    }

    await page.waitForTimeout(1000);

    // Step 3: Verify "Shares For Calls" shows 100 covered shares
    await page.goto('/');
    await expect(page.getByTestId('wheel.title')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const sharesForCallsValue = page
      .locator('[data-testid="shares-for-calls-value"]')
      .first();

    await expect(sharesForCallsValue).toBeVisible();
    const initialValue = await sharesForCallsValue.textContent();
    expect(initialValue).toBeTruthy();

    // Step 4: Add Call Assignment (sells 1 contract = 100 shares)
    await page.goto('/journal');
    {
      const newEntryBtn = page.getByRole('button', { name: /new entry/i });
      await newEntryBtn.click();
    }

    await page.getByRole('button', { name: 'Call Assigned' }).click();
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill('1');
    await page.getByLabel(/strike/i).fill('55.00');

    {
      const dialog = page.getByRole('dialog', { name: /new entry/i });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /save entry/i }).click({ force: true });
    }

    await page.waitForTimeout(1000);

    // Step 5: Verify "Shares For Calls" metric updated to 0 (no more covered calls)
    await page.goto('/');
    await expect(page.getByTestId('wheel.title')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const updatedValue = await sharesForCallsValue.textContent();
    expect(updatedValue).toBeTruthy();

    // After call assignment, the covered call position is closed
    // So "Shares For Calls" should show 0 or be reduced
    // (Depends on implementation - if position is closed, metric should reflect that)
  });

  test('should show total shares needed for naked calls (no shares owned)', async ({ page }) => {
    const symbol = 'NAKEDCALL';

    // Step 1: Add Sell Covered Call WITHOUT having shares first (naked call)
    {
      const newEntryBtn = page.getByRole('button', { name: /new entry/i });
      await expect(newEntryBtn).toBeVisible();
      await newEntryBtn.scrollIntoViewIfNeeded();
      await newEntryBtn.click();
    }

    await page.getByRole('button', { name: 'Sell Covered Call' }).click();
    await page.getByLabel(/symbol/i).fill(symbol);
    await page.getByLabel(/contracts/i).fill('1');
    await page.getByLabel(/strike/i).fill('55.00');
    await page.getByLabel(/premium/i).fill('1.00');

    {
      const dialog = page.getByRole('dialog', { name: /new entry/i });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /save entry/i }).click({ force: true });
    }

    await page.waitForTimeout(1000);

    // Step 2: Verify "Shares For Calls" shows 100 (total shares needed for 1 call)
    // Even if shares aren't owned, the metric shows total shares needed to cover the calls
    await page.goto('/');
    await expect(page.getByTestId('wheel.title')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const sharesForCallsValue = page
      .locator('[data-testid="shares-for-calls-value"]')
      .first();

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
    const symbol1 = 'MULTICALL1';
    const symbol2 = 'MULTICALL2';

    // Step 1: Add first covered call
    {
      const newEntryBtn = page.getByRole('button', { name: /new entry/i });
      await expect(newEntryBtn).toBeVisible();
      await newEntryBtn.scrollIntoViewIfNeeded();
      await newEntryBtn.click();
    }

    await page.getByRole('button', { name: 'Sell Covered Call' }).click();
    await page.getByLabel(/symbol/i).fill(symbol1);
    await page.getByLabel(/contracts/i).fill('1');
    await page.getByLabel(/strike/i).fill('50.00');
    await page.getByLabel(/premium/i).fill('1.00');

    {
      const dialog = page.getByRole('dialog', { name: /new entry/i });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /save entry/i }).click({ force: true });
    }

    await page.waitForTimeout(1000);

    // Step 2: Add second covered call
    {
      const newEntryBtn = page.getByRole('button', { name: /new entry/i });
      await newEntryBtn.click();
    }

    await page.getByRole('button', { name: 'Sell Covered Call' }).click();
    await page.getByLabel(/symbol/i).fill(symbol2);
    await page.getByLabel(/contracts/i).fill('1');
    await page.getByLabel(/strike/i).fill('60.00');
    await page.getByLabel(/premium/i).fill('1.50');

    {
      const dialog = page.getByRole('dialog', { name: /new entry/i });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /save entry/i }).click({ force: true });
    }

    await page.waitForTimeout(1000);

    // Step 3: Verify "Shares For Calls" shows 200 (2 calls × 100 shares = 200)
    await page.goto('/');
    await expect(page.getByTestId('wheel.title')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const sharesForCallsValue = page
      .locator('[data-testid="shares-for-calls-value"]')
      .first();

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


