import type { Page } from '@playwright/test';

/**
 * Base Page Object Model class
 * Provides common functionality for all page objects
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad(): Promise<void> {
    // Use domcontentloaded first for faster initial load, then try networkidle with timeout
    await this.page.waitForLoadState('domcontentloaded');
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch {
      // If networkidle times out (e.g., due to continuous failed requests), continue anyway
      // The page is likely loaded enough for testing
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific path
   */
  async navigate(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.waitForPageLoad();
  }

  /**
   * Wait for a specific timeout
   */
  async wait(timeout: number): Promise<void> {
    await this.page.waitForTimeout(timeout);
  }

  /**
   * Get the current page instance
   */
  getPage(): Page {
    return this.page;
  }
}
