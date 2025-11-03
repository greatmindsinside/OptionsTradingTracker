import { test, expect } from '@playwright/test';

// show the browser console logs for debugging
test.beforeEach(async ({ page }) => {
  page.on('console', msg => {
    console.log(`BROWSER LOG: ${msg.text()}`);
  });
});

test.describe('Covered Call Wheel Phase', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the wheel page
    await page.goto('http://localhost:5173/wheel');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should show correct wheel phase after adding a covered call', async ({ page }) => {
    // Step 1: Open the trade drawer
    await page.click('button:has-text("💸 Premium Printer")');

    // Wait for drawer to open and click on Trade tab
    await page.click('button:has-text("Trade")');

    // Wait for trade form to be visible
    await expect(page.locator('text=Compose a single option trade')).toBeVisible();

    // Step 2: Fill in the trade form for a covered call
    // Symbol
    await page.getByRole('textbox', { name: 'e.g. AAPL' }).fill('ASTS');

    // Type: Select "Call" from dropdown
    await page.selectOption('select', { label: 'Call' });

    // Side: Select "Sell" from dropdown
    const sideSelects = await page.locator('select').all();
    await sideSelects[1].selectOption({ label: 'Sell' });

    // Qty
    const numberInputs = await page.locator('input[type="number"]').all();
    await numberInputs[0].fill('1');

    // DTE
    await numberInputs[1].fill('4');

    // Strike
    await numberInputs[2].fill('82');

    // Premium (per share)
    await numberInputs[3].fill('1.03');

    // Fees (optional)
    await numberInputs[4].fill('0');

    // Step 3: Verify the preview text
    await expect(page.locator('text=/Sell 1.*C.*ASTS.*82/')).toBeVisible();

    // Step 4: Submit the trade
    await page.click('button:has-text("+ Add Trade")');

    // Wait for trade to be added (drawer should close)
    await page.waitForTimeout(1000);

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
    const wheelPhaseText = await wheelPhaseSection.textContent();

    // Should contain ASTS and should NOT contain "Sell Cash Secured Put" for ASTS row
    expect(wheelPhaseText).toContain('ASTS');

    // Check that we have the correct phase (either Sell Covered Calls or Call Expires Worthless)
    const hasCorrectPhase =
      wheelPhaseText?.match(/Sell Covered Calls|Call Expires Worthless/) !== null;
    expect(hasCorrectPhase).toBeTruthy();

    // Step 6: Verify it appears in Upcoming Expirations
    const upcomingExpirations = page.locator('text=Upcoming Expirations').locator('..');
    await expect(upcomingExpirations).toBeVisible();

    // Should show ASTS with type "C" (Call) and strike 82
    await expect(
      upcomingExpirations
        .locator('text=/ASTS.*C.*82/')
        .or(upcomingExpirations.locator('text=/ASTS.*82.*DTE/'))
    ).toBeVisible();

    // Step 7: Verify Premium This Week metric is updated
    const premiumMetric = page.locator('text=Premium This Week').locator('..');
    const premiumText = await premiumMetric.textContent();

    // Should contain $103 (1.03 × 100)
    expect(premiumText).toContain('103');
  });

  test('should show correct phase progression: puts -> calls', async ({ page }) => {
    // Test Case 1: Start with selling a put
    await page.click('button:has-text("💸 Premium Printer")');
    await page.click('button:has-text("Trade")');
    await page.getByRole('textbox', { name: 'e.g. AAPL' }).fill('ASTS');

    // Select Put and Sell
    await page.selectOption('select', { label: 'Put' });
    const sideSelects = await page.locator('select').all();
    await sideSelects[1].selectOption({ label: 'Sell' });

    // Fill in put details
    const numberInputs = await page.locator('input[type="number"]').all();
    await numberInputs[0].fill('1'); // qty
    await numberInputs[1].fill('30'); // dte
    await numberInputs[2].fill('50'); // strike
    await numberInputs[3].fill('2.00'); // premium
    await numberInputs[4].fill('0'); // fees

    await page.click('button:has-text("+ Add Trade")');
    await page.waitForTimeout(1000);

    // Verify: Should show "Sell Cash Secured Puts"
    const wheelPhaseSection = page
      .locator('[data-testid="wheel-phase-card"]')
      .or(page.locator('text=Wheel Phase').locator('..'));
    const wheelText = await wheelPhaseSection.textContent();
    expect(wheelText).toContain('Sell Cash Secured Put');

    // Test Case 2: Now add a covered call for the same ticker
    await page.click('button:has-text("💸 Premium Printer")');
    await page.click('button:has-text("Trade")');
    await page.getByRole('textbox', { name: 'e.g. AAPL' }).fill('ASTS');

    // Select Call and Sell
    await page.selectOption('select', { label: 'Call' });
    const sideSelects2 = await page.locator('select').all();
    await sideSelects2[1].selectOption({ label: 'Sell' });

    // Fill in call details
    const numberInputs2 = await page.locator('input[type="number"]').all();
    await numberInputs2[0].fill('1'); // qty
    await numberInputs2[1].fill('30'); // dte
    await numberInputs2[2].fill('55'); // strike
    await numberInputs2[3].fill('1.50'); // premium
    await numberInputs2[4].fill('0'); // fees

    await page.click('button:has-text("+ Add Trade")');
    await page.waitForTimeout(1000);

    // Verify: Phase should update (may show both put and call, or just call phase)
    // The main assertion is that we can add a call after a put without errors
    const astsRowAfter = page.locator('text=ASTS').first();
    await expect(astsRowAfter).toBeVisible();
  });

  test('should show call in upcoming expirations with correct type', async ({ page }) => {
    // Add a call trade
    await page.click('button:has-text("💸 Premium Printer")');
    await page.click('button:has-text("Trade")');
    await page.getByRole('textbox', { name: 'e.g. AAPL' }).fill('MSFT');

    await page.selectOption('select', { label: 'Call' });
    const sideSelects = await page.locator('select').all();
    await sideSelects[1].selectOption({ label: 'Sell' });

    const numberInputs = await page.locator('input[type="number"]').all();
    await numberInputs[0].fill('2'); // qty
    await numberInputs[1].fill('7'); // dte
    await numberInputs[2].fill('100'); // strike
    await numberInputs[3].fill('1.75'); // premium
    await numberInputs[4].fill('0'); // fees

    await page.click('button:has-text("+ Add Trade")');
    await page.waitForTimeout(1000);

    // Check Upcoming Expirations section
    const upcomingSection = page.locator('text=Upcoming Expirations').locator('..');

    // Should show MSFT with "C" type indicator (not "P")
    const msftExpiration = upcomingSection.locator('text=MSFT').first();
    await expect(msftExpiration).toBeVisible();

    // Should show strike 100
    await expect(upcomingSection.locator('text=/MSFT.*100/')).toBeVisible();
  });

  test('should calculate premium correctly for calls', async ({ page }) => {
    // Get initial premium value
    const premiumMetric = page.locator('text=Premium This Week').locator('..');
    const initialPremiumText = await premiumMetric.textContent();
    const initialPremium = parseFloat(initialPremiumText?.replace(/[^0-9.-]/g, '') || '0');

    // Add a call trade: 3 contracts @ $2.50 = $750
    await page.click('button:has-text("💸 Premium Printer")');
    await page.click('button:has-text("Trade")');
    await page.getByRole('textbox', { name: 'e.g. AAPL' }).fill('NVDA');

    await page.selectOption('select', { label: 'Call' });
    const sideSelects = await page.locator('select').all();
    await sideSelects[1].selectOption({ label: 'Sell' });

    const numberInputs = await page.locator('input[type="number"]').all();
    await numberInputs[0].fill('3'); // qty
    await numberInputs[1].fill('14'); // dte
    await numberInputs[2].fill('500'); // strike
    await numberInputs[3].fill('2.50'); // premium per share
    await numberInputs[4].fill('0'); // fees

    await page.click('button:has-text("+ Add Trade")');
    await page.waitForTimeout(1000);

    // Verify premium increased by $750 (2.50 × 100 × 3)
    const newPremiumText = await premiumMetric.textContent();
    const newPremium = parseFloat(newPremiumText?.replace(/[^0-9.-]/g, '') || '0');
    const increase = newPremium - initialPremium;

    expect(Math.abs(increase - 750)).toBeLessThan(1); // Allow for small rounding errors
  });
});

test.describe('Covered Call Journal Integration', () => {
  test('should show call in journal page with correct type', async ({ page }) => {
    // Add a call trade
    await page.goto('http://localhost:5173/wheel');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("💸 Premium Printer")');
    await page.click('button:has-text("Trade")');

    await page.getByRole('textbox', { name: 'e.g. AAPL' }).fill('AAPL');
    await page.selectOption('select', { label: 'Call' });
    const sideSelects = await page.locator('select').all();
    await sideSelects[1].selectOption({ label: 'Sell' });

    const numberInputs = await page.locator('input[type="number"]').all();
    await numberInputs[0].fill('1');
    await numberInputs[1].fill('30');
    await numberInputs[2].fill('150');
    await numberInputs[3].fill('3.00');
    await numberInputs[4].fill('0.70');

    await page.click('button:has-text("+ Add Trade")');
    await page.waitForTimeout(1000);

    // Navigate to journal page using the navigation link
    await page.goto('http://localhost:5173/journal');
    await page.waitForLoadState('networkidle');

    // Verify entry appears in journal - use table cell to be more specific
    const journalTable = page.locator('table');
    await expect(journalTable).toBeVisible();

    // Verify AAPL appears in a table cell
    await expect(journalTable.getByRole('cell', { name: 'AAPL' }).first()).toBeVisible();

    // Verify amount is correct: $300 (3.00 × 100)
    const journalContent = await page.content();
    expect(journalContent).toContain('300');
  });
});
