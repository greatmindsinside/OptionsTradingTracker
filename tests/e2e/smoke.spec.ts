import { test, expect } from '@playwright/test';

// Basic smoke test to ensure the app boots at the root route
// Assumes playwright.config.ts starts the Vite dev server and sets baseURL to http://localhost:5173

test('home page loads and renders header', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(`[pageerror] ${err.message}`);
  });

  const response = await page.goto('/');
  // Got an HTTP response (not file://) and it is OK
  expect(response, 'Expected an HTTP response from page.goto("/")').toBeTruthy();
  expect(
    response?.ok(),
    `Non-OK HTTP status: ${response?.status()} ${response?.statusText()}`
  ).toBeTruthy();

  await expect(page).toHaveTitle(/Options Trading Tracker/i);

  // React root should render at least one child when the app mounts
  // Give React a moment to mount
  await page.waitForTimeout(250);
  const childCount = await page.locator('#root >> xpath=./*').count();
  if (childCount === 0) {
    throw new Error(
      `App root did not mount any children. Console errors:\n${errors.join('\n') || '(none captured)'}`
    );
  }

  if (errors.length) {
    testInfo.attach('console-errors', {
      body: Buffer.from(errors.join('\n')),
      contentType: 'text/plain',
    });
  }
  expect(errors, 'No console/page errors expected during initial load').toEqual([]);
});

// Optional: sanity check for Actions menu toggle and Import tab presence
// This only runs if the UI renders the Actions button
// You can remove this test if it becomes brittle.
test('actions drawer can open (if present)', async ({ page }) => {
  await page.goto('/');
  const actionsBtn = page.getByTestId('wheel.action.open');
  if (await actionsBtn.count()) {
    if (await actionsBtn.first().isVisible()) {
      await actionsBtn.first().click();
      // Trade tab should be the default after refactor
      await expect(page.getByTestId('drawer.trade')).toBeVisible();
    }
  }
});

test('journal page loads and shows entries', async ({ page }) => {
  await page.goto('/journal');
  await expect(page.getByTestId('journal.title')).toBeVisible();
  await expect(page.getByTestId('journal.entry')).toBeVisible();
});
