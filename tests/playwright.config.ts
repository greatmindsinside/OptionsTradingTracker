import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['list'], // Always show verbose output
    //['html', { outputFolder: './playwright-report' }],  // Always generate HTML report
    ['json', { outputFile: './playwright-report/results.json' }], // JSON report for CI integration
    ...(process.env.CI ? [['github'] as const] : []), // GitHub annotations in CI
  ],
  outputDir: './test-results',
  maxFailures: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    /* Accessibility tests */
    {
      name: 'accessibility',
      testMatch: '**/*.a11y.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // Force Vite to use a fixed, strict port so baseURL stays consistent
    command: 'yarn dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
