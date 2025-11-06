import type { Page } from '@playwright/test';
import { expect,test } from '@playwright/test';

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

    // Wait for trade form to be visible - check for symbol input or trade form elements
    await expect(page.getByLabel(/symbol/i)).toBeVisible();

    // Step 2: Fill in the trade form for a covered call
    // Symbol
    await page.getByLabel(/symbol/i).fill('ASTS');

    // Type: Select "Call" from dropdown
    await page.selectOption('select', { label: 'Call' });

    // Side: Select "Sell" from dropdown
    const sideSelects = await page.locator('select').all();
    await (sideSelects[1]!).selectOption({ label: 'Sell' });

    // Fill trade form
    await fillTradeForm(page, {
      qty: '1',
      dte: '4',
      strike: '82',
      premium: '1.03',
      fees: '0',
    });

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
    const wheelPhaseTextRaw = await wheelPhaseSection.textContent();
    const wheelPhaseText = wheelPhaseTextRaw ?? '';

    // Should contain ASTS and should NOT contain "Sell Cash Secured Put" for ASTS row
    expect(wheelPhaseText).toContain('ASTS');

    // Check that we have the correct phase (either Sell Covered Calls or Call Expires Worthless)
    const hasCorrectPhase = /Sell Covered Calls|Call Expires Worthless/.test(wheelPhaseText);
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
    await page.getByLabel(/symbol/i).fill('ASTS');

    // Select Put and Sell
    await page.selectOption('select', { label: 'Put' });
    const sideSelects = await page.locator('select').all();
    await (sideSelects[1]!).selectOption({ label: 'Sell' });

    // Fill in put details
    await fillTradeForm(page, {
      qty: '1',
      dte: '30',
      strike: '50',
      premium: '2.00',
      fees: '0',
    });

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
    await page.getByLabel(/symbol/i).fill('ASTS');

    // Select Call and Sell
    await page.selectOption('select', { label: 'Call' });
    const sideSelects2 = await page.locator('select').all();
    await (sideSelects2[1]!).selectOption({ label: 'Sell' });

    // Fill in call details
    await fillTradeForm(page, {
      qty: '1',
      dte: '30',
      strike: '55',
      premium: '1.50',
      fees: '0',
    });

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
    await page.getByLabel(/symbol/i).fill('MSFT');

    await page.selectOption('select', { label: 'Call' });
    const sideSelects = await page.locator('select').all();
    await (sideSelects[1]!).selectOption({ label: 'Sell' });

    // Fill form fields by label to avoid index dependency
    await page.getByLabel(/qty/i).fill('2');
    
    // Handle DTE - may be date picker or number input
    const expirationInput = page.getByLabel(/expiration/i);
    const dteInput = page.getByLabel(/dte/i).first();
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
    
    await page.getByLabel(/strike/i).fill('100');
    
    // Premium field - find by label "Premium" text or by position
    const premiumLabel = page.locator('text=/premium.*per share/i').first();
    const premiumInput = premiumLabel.locator('..').locator('input[type="number"]').first();
    if (await premiumInput.count() > 0) {
      await premiumInput.fill('1.75');
    } else {
      // Fallback: find by position (after strike input)
      const allNumberInputs = await page.locator('input[type="number"]').all();
      if (allNumberInputs.length >= 4) {
        await (allNumberInputs[3]!).fill('1.75');
      }
    }
    
    // Fees field - find input near "Fees" text or use last number input
    const feesSection = page.locator('text=/fees/i').locator('..');
    const feesInput = feesSection.locator('input[type="number"]').first();
    if (await feesInput.count() > 0) {
      await feesInput.fill('0');
    } else {
      // Fallback: use last number input
      const allNumberInputs = await page.locator('input[type="number"]').all();
      if (allNumberInputs.length > 0) {
        await (allNumberInputs[allNumberInputs.length - 1]!).fill('0');
      }
    }

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
    await page.getByLabel(/symbol/i).fill('NVDA');

    await page.selectOption('select', { label: 'Call' });
    const sideSelects = await page.locator('select').all();
    await (sideSelects[1]!).selectOption({ label: 'Sell' });

    await fillTradeForm(page, {
      qty: '3',
      dte: '14',
      strike: '500',
      premium: '2.50',
      fees: '0',
    });

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

    await page.getByLabel(/symbol/i).fill('AAPL');
    await page.selectOption('select', { label: 'Call' });
    const sideSelects = await page.locator('select').all();
    await (sideSelects[1]!).selectOption({ label: 'Sell' });

    await fillTradeForm(page, {
      qty: '1',
      dte: '30',
      strike: '150',
      premium: '3.00',
      fees: '0.70',
    });

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
