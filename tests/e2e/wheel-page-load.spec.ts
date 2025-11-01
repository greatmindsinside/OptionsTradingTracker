/**
 * E2E Test: Wheel Modern Page Load
 *
 * Tests that the modern wheel page loads successfully on application start
 */

import { test, expect } from '@playwright/test';

test.describe('Wheel Modern Page Load', () => {
  test('should load the wheel page at root URL', async ({ page }) => {
    // Navigate to root URL
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that we're not stuck on a loading screen for too long
    // If database is working, it should load within 5 seconds
    await expect(page.locator('[data-testid="wheel.title"]')).toBeVisible({ timeout: 5000 });

    // Take a screenshot to verify the page loaded correctly and is not blank
    await page.screenshot({
      path: 'test-results/screenshots/wheel-page-loaded.png',
      fullPage: true,
    });

    // Verify the page title is correct
    await expect(page.locator('[data-testid="wheel.title"]')).toHaveText(
      'Wheel To Tendies Pipeline'
    );

    // Verify the page is not blank - check that content is actually visible
    // by ensuring multiple key elements are rendered
    await expect(page.locator('[data-testid="premium-this-week-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="capital-in-puts-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="shares-for-calls-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="wheel.action.open"]')).toBeVisible();
  });

  test('should display main UI elements', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be ready
    await page.waitForSelector('[data-testid="wheel.title"]', { state: 'visible', timeout: 5000 });

    // Take screenshot of the initial state
    await page.screenshot({
      path: 'test-results/screenshots/wheel-main-ui-elements.png',
      fullPage: true,
    });

    // Check that key UI elements are present
    await expect(page.locator('[data-testid="wheel.title"]')).toBeVisible();
    await expect(page.locator('[data-testid="wheel.action.open"]')).toBeVisible();

    // Check metrics are displayed (even if zero)
    await expect(page.locator('[data-testid="premium-this-week-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="capital-in-puts-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="shares-for-calls-value"]')).toBeVisible();
  });

  test('should not show database error on fresh load', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be ready
    await page.waitForSelector('[data-testid="wheel.title"]', { state: 'visible', timeout: 5000 });

    // Ensure no error message is displayed
    await expect(page.locator('text=Database Error')).not.toBeVisible();
  });

  test('should display Premium Printer button', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('[data-testid="wheel.title"]', { state: 'visible', timeout: 5000 });

    // Check the animated button is present and clickable
    const premiumButton = page.locator('[data-testid="wheel.action.open"]');
    await expect(premiumButton).toBeVisible();
    await expect(premiumButton).toContainText('Premium Printer');
    await expect(premiumButton).toBeEnabled();
  });

  test('should display filter input', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('[data-testid="wheel.title"]', { state: 'visible', timeout: 5000 });

    // Check filter input is present
    const filterInput = page.locator('input[placeholder="Filter tickers"]');
    await expect(filterInput).toBeVisible();
    await expect(filterInput).toBeEnabled();
  });

  test('should show empty state messages when no data', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('[data-testid="wheel.title"]', { state: 'visible', timeout: 5000 });

    // With no imported data, should show empty states
    await expect(page.locator('text=No upcoming expirations')).toBeVisible();
    await expect(page.locator('text=All quiet')).toBeVisible();
  });

  test('should be able to open actions drawer', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('[data-testid="wheel.title"]', { state: 'visible', timeout: 5000 });

    // Click the Premium Printer button to open actions drawer
    // Use force: true because the button has CSS animations that make it "unstable"
    await page.locator('[data-testid="wheel.action.open"]').click({ force: true });

    // Verify drawer opens
    await expect(page.locator('[data-testid="drawer.import"]')).toBeVisible();

    // Take screenshot of the open actions drawer
    await page.screenshot({
      path: 'test-results/screenshots/wheel-actions-drawer-open.png',
      fullPage: true,
    });

    // Check tab buttons are present (use role=button to be specific)
    await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Manual' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Phase' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Data' })).toBeVisible();
  });
});
