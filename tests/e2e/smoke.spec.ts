import { expect, test } from '@playwright/test';

import { JournalPage } from '../pages/JournalPage';
import { WheelPage } from '../pages/WheelPage';

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
  // Ignore known benign network errors from the test environment (e.g., blocked devtools/resources)
  const benignPatterns = [
    'net::ERR_NETWORK_ACCESS_DENIED',
    'Failed to load resource: Could not connect to server',
    'Cross-Origin Request Blocked', // CORS errors from iconify API in test environment
    'CORS request did not succeed',
  ];
  const filtered = errors.filter(e => !benignPatterns.some(pattern => e.includes(pattern)));
  expect(filtered, 'No significant console/page errors expected during initial load').toEqual([]);
});

// Optional: sanity check for Actions menu toggle and Trade tab presence
// This only runs if the UI renders the Actions button
// You can remove this test if it becomes brittle.
test('actions drawer can open (if present)', async ({ page }) => {
  const wheelPage = new WheelPage(page);
  await wheelPage.navigate();

  const actionsBtn = wheelPage.actionsButton;
  if (await actionsBtn.count()) {
    if (await actionsBtn.first().isVisible()) {
      await actionsBtn.first().click();
      // Trade tab is the default
      await expect(page.getByTestId('drawer.trade')).toBeVisible();
    }
  }
});

test('journal page loads and shows entries', async ({ page }) => {
  const journalPage = new JournalPage(page);
  await journalPage.navigate();
  await expect(journalPage.title).toBeVisible();

  // Wait for entries to load - the database might need time to initialize
  // The seed entry should exist, so at least one should be visible
  // Entries can be in table (desktop) or cards (mobile), both have the testid
  const entryLocator = page.getByTestId('journal.entry');

  // Wait for at least one entry to be visible
  // Check if any entry is visible (either in table or cards)
  await page.waitForFunction(
    () => {
      const entries = document.querySelectorAll('[data-testid="journal.entry"]');
      return Array.from(entries).some(entry => {
        const rect = entry.getBoundingClientRect();
        const style = window.getComputedStyle(entry);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      });
    },
    { timeout: 10000 }
  );

  // Verify at least one entry is visible using Playwright's visibility check
  await expect(entryLocator.first()).toBeVisible({ timeout: 5000 });
});
