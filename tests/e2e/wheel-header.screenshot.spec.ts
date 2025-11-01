import { test, expect } from '@playwright/test';

// Visual regression + geometry assertions for the Wheel header layout
// Baseline screenshot will be created on first run under this spec's __screenshots__ folder.
// We constrain to Chromium for consistent visuals.
test.describe('Wheel header layout (desktop)', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Run visual snapshot on Chromium only'
  );

  test('matches visual snapshot (header only)', async ({ page }) => {
    // Use a stable desktop viewport similar to the design screenshot
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to the Wheel page (WheelModern is routed at '/' and '/wheel')
    await page.goto('/');

    // Wait for header to be ready
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Small settle to allow fonts/paint; animations disabled during screenshot
    await page.waitForTimeout(150);

    // Visual snapshot of just the header for stable comparisons
    await expect(header).toHaveScreenshot('wheel-header-desktop.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02, // tiny tolerance for rendering differences
    });
  });
});
