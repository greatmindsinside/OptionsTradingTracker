import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/');

  // Check that the page title is correct
  await expect(page).toHaveTitle(/Options Trading Tracker/);

  // Check that the main Vite React content is visible
  await expect(page.locator('#root')).toBeVisible();
});
