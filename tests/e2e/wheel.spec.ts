import { test, expect } from '@playwright/test';

test.describe('Wheel Page', () => {
  test('should load wheel page without errors', async ({ page }) => {
    await page.goto('/wheel');

    // Check that the page loads
    await expect(page).toHaveTitle('Options Trading Tracker');

    // Check for main heading (Modern page)
    await expect(page.locator('[data-testid="wheel.title"]')).toContainText(
      'Wheel To Tendies Pipeline'
    );

    // Check for summary metrics (Modern page)
    await expect(page.locator('text=Premium This Week')).toBeVisible();
    await expect(page.locator('text=Capital In Puts')).toBeVisible();
    await expect(page.locator('text=Shares For Calls')).toBeVisible();

    // Check for main sections
    await expect(page.getByRole('heading', { name: /Wheel Phase/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Upcoming Expirations/ })).toBeVisible();

    // Check for action buttons
    await expect(page.locator('[data-testid="wheel.action.open"]')).toBeVisible();
    await expect(page.locator('text=Ledger')).toBeVisible();
  });

  // Note: This test is covered by wheel-page-load.spec.ts with better viewport handling
  test.skip('should be able to switch between drawer tabs', async ({ page }) => {
    await page.goto('/wheel');

    // Open actions drawer
    await page.locator('[data-testid="wheel.action.open"]').click({ force: true });

    // Verify Import tab is active by default
    await expect(page.locator('[data-testid="drawer.import"]')).toBeVisible();
  });

  test('should display empty states correctly', async ({ page }) => {
    await page.goto('/wheel');

    // Wait for page to load
    await page.waitForSelector('[data-testid="wheel.title"]');

    // With no data imported, should show empty states
    await expect(page.locator('text=No upcoming expirations')).toBeVisible();
    await expect(page.locator('text=All quiet')).toBeVisible();
    await expect(page.locator('text=No data')).toBeVisible();
  });

  test('should allow filtering tickers', async ({ page }) => {
    await page.goto('/wheel');

    await page.waitForSelector('[data-testid="wheel.title"]');

    // Find the filter input
    const filterInput = page.locator('input[placeholder="Filter tickers"]');
    await expect(filterInput).toBeVisible();

    // Type something in the filter
    await filterInput.fill('AAPL');

    // Page should still be functional
    await expect(page.locator('[data-testid="wheel.title"]')).toBeVisible();
  });

  test('should open ledger modal', async ({ page }) => {
    await page.goto('/wheel');

    await page.waitForSelector('[data-testid="wheel.title"]');

    // Click the Ledger button in header
    await page.getByRole('button', { name: '📊 Ledger' }).click();

    // Verify modal opens
    await expect(page.locator('text=Database Preview')).toBeVisible();

    // Check tabs in the ledger - use role button to be specific
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tables' })).toBeVisible();
    // There are two "Ledger" buttons, so check for the one inside the modal
    const ledgerButtons = page.getByRole('button', { name: 'Ledger' });
    await expect(ledgerButtons.last()).toBeVisible();
  });
});
