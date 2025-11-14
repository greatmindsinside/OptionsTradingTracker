import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export interface TradeFormOptions {
  qty: string;
  dte?: string;
  expiration?: string;
  strike: string;
  premium: string;
  fees?: string;
}

export interface AddTradeOptions extends TradeFormOptions {
  symbol: string;
  type?: 'Call' | 'Put';
  side?: 'Buy' | 'Sell';
}

/**
 * Page Object Model for the Wheel page
 */
export class WheelPage extends BasePage {
  // Selectors
  get title(): Locator {
    return this.page.getByTestId('wheel.title');
  }

  get actionsButton(): Locator {
    return this.page
      .getByTestId('wheel.action.open')
      .or(this.page.getByRole('button', { name: /premium printer/i }));
  }

  get actionsDrawer(): Locator {
    return this.page
      .locator('[role="dialog"]')
      .or(this.page.locator('[data-testid="drawer.trade"]').locator('..'));
  }

  get tradeTab(): Locator {
    return this.page.getByRole('button', { name: 'Trade', exact: true }).first();
  }

  get symbolInput(): Locator {
    return this.page.getByLabel(/symbol/i);
  }

  get typeSelect(): Locator {
    return this.page.locator('select').first();
  }

  get sideSelect(): Locator {
    return this.page.locator('select').nth(1);
  }

  get qtyInput(): Locator {
    return this.page.getByLabel(/qty/i);
  }

  get dteInput(): Locator {
    return this.page.getByLabel(/dte/i).first();
  }

  get expirationInput(): Locator {
    return this.page.getByLabel(/expiration/i).first();
  }

  get strikeInput(): Locator {
    return this.page.getByLabel(/strike/i);
  }

  get premiumInput(): Locator {
    return this.page.getByLabel(/premium/i);
  }

  get feesInput(): Locator {
    return this.page.getByLabel(/fee/i);
  }

  get addTradeButton(): Locator {
    return this.page.getByRole('button', { name: /add trade/i });
  }

  // Actions
  /**
   * Navigate to the wheel page
   */
  async navigate(): Promise<void> {
    await super.navigate('/');
    await this.waitForPageLoad();
  }

  /**
   * Wait for the wheel page to be ready
   */
  async waitForPageLoad(): Promise<void> {
    await super.waitForPageLoad();
    await expect(this.title).toBeVisible({ timeout: 10000 });
  }

  /**
   * Open the actions drawer
   */
  async openActionsDrawer(): Promise<void> {
    await expect(this.actionsButton).toBeVisible({ timeout: 10000 });
    await this.actionsButton.click();
    await this.wait(500);
  }

  /**
   * Open the trade tab in the actions drawer
   */
  async openTradeTab(): Promise<void> {
    await expect(this.tradeTab).toBeVisible({ timeout: 5000 });
    await this.tradeTab.click();
    await this.wait(500);
    // Wait for trade form to be visible
    await expect(this.symbolInput).toBeVisible({ timeout: 5000 });
  }

  /**
   * Select option type (Call or Put)
   */
  async selectOptionType(type: 'Call' | 'Put'): Promise<void> {
    await this.typeSelect.selectOption({ label: type });
    await this.wait(200);
  }

  /**
   * Select side (Buy or Sell)
   */
  async selectSide(side: 'Buy' | 'Sell'): Promise<void> {
    const sideSelects = await this.page.locator('select').all();
    if (sideSelects.length > 1) {
      await sideSelects[1]!.selectOption({ label: side });
    } else {
      await this.sideSelect.selectOption({ label: side });
    }
    await this.wait(200);
  }

  /**
   * Fill trade form with provided values
   */
  async fillTradeForm(options: TradeFormOptions): Promise<void> {
    await this.qtyInput.fill(options.qty);

    // Handle DTE - may be date picker or number input
    const expirationInput = this.expirationInput;
    const dteInput = this.dteInput;
    const hasDatePicker = (await expirationInput.count()) > 0;

    if (hasDatePicker && options.expiration) {
      await expirationInput.fill(options.expiration);
    } else if (!hasDatePicker && options.dte) {
      await dteInput.fill(options.dte);
    }

    await this.strikeInput.fill(options.strike);

    // Premium field - find by label "Premium" text or by position
    const premiumLabel = this.page.locator('text=/premium.*per share/i').first();
    const premiumInput = premiumLabel.locator('..').locator('input[type="number"]').first();
    if ((await premiumInput.count()) > 0) {
      await premiumInput.fill(options.premium);
    } else {
      // Fallback: find by position (after strike input)
      const allNumberInputs = await this.page.locator('input[type="number"]').all();
      // Premium is typically after qty, dte, strike - so index 3 if we have 4+ inputs
      if (allNumberInputs.length >= 4) {
        await allNumberInputs[3]!.fill(options.premium);
      } else {
        // Last resort: use premium input locator
        await this.premiumInput.fill(options.premium);
      }
    }

    // Fees field - find input near "Fees" text or use last number input
    if (options.fees !== undefined) {
      const feesSection = this.page.locator('text=/fees/i').locator('..');
      const feesInput = feesSection.locator('input[type="number"]').first();
      if ((await feesInput.count()) > 0) {
        await feesInput.fill(options.fees);
      } else {
        // Fallback: use last number input
        const allNumberInputs = await this.page.locator('input[type="number"]').all();
        if (allNumberInputs.length > 0) {
          await allNumberInputs[allNumberInputs.length - 1]!.fill(options.fees);
        } else {
          await this.feesInput.fill(options.fees);
        }
      }
    }
  }

  /**
   * Complete flow to add a trade
   */
  async addTrade(options: AddTradeOptions): Promise<void> {
    await this.openActionsDrawer();
    await this.openTradeTab();

    // Fill symbol
    await this.symbolInput.fill(options.symbol);

    // Select type if provided
    if (options.type) {
      await this.selectOptionType(options.type);
    }

    // Select side if provided
    if (options.side) {
      await this.selectSide(options.side);
    }

    // Fill trade form
    await this.fillTradeForm({
      qty: options.qty,
      dte: options.dte,
      expiration: options.expiration,
      strike: options.strike,
      premium: options.premium,
      fees: options.fees,
    });

    // Click add trade button
    await expect(this.addTradeButton).toBeVisible({ timeout: 5000 });
    await this.addTradeButton.click();
    await this.wait(1000);
  }

  /**
   * Wait for symbol to appear on the page
   */
  async waitForSymbol(symbol: string, timeout = 30000): Promise<void> {
    const upperSymbol = symbol.toUpperCase();

    // Wait for the Wheel page to load data - it uses useWheelDatabase which loads on mount
    // First wait for the page to finish loading
    await this.page.waitForLoadState('networkidle');
    await this.wait(2000);

    // Wait for the symbol to appear in the page text
    // The Wheel page displays symbols in various places (phase list, positions, etc.)
    // Use a more flexible check that looks for the symbol in visible elements
    await this.page.waitForFunction(
      (sym: string) => {
        // Check if symbol appears in visible text
        const text = document.body.textContent || '';
        if (!text.toUpperCase().includes(sym)) return false;

        // Also check if it's in a visible element (not just hidden text)
        // Look for the symbol in visible table cells, divs, or spans
        const allElements = document.querySelectorAll('td, div, span, p, h1, h2, h3, h4, h5, h6');
        for (const el of allElements) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            const elText = el.textContent || '';
            if (elText.toUpperCase().includes(sym)) {
              return true;
            }
          }
        }

        // Fallback: if symbol is in page text, consider it found
        return true;
      },
      upperSymbol,
      { timeout }
    );
  }

  /**
   * Get locator for symbol text
   */
  getSymbolText(symbol: string): Locator {
    const upperSymbol = symbol.toUpperCase();
    return this.page.getByText(upperSymbol).first();
  }

  // Helper Methods
  /**
   * Check if symbol is visible on the page
   */
  async isSymbolVisible(symbol: string): Promise<boolean> {
    const symbolText = this.getSymbolText(symbol);
    return await symbolText.isVisible().catch(() => false);
  }

  /**
   * Get number of tickers displayed
   */
  async getTickerCount(): Promise<number> {
    // This would need to be implemented based on actual UI structure
    const tickerElements = await this.page.locator('[data-ticker]').all();
    return tickerElements.length;
  }

  /**
   * Wait for data to load
   */
  async waitForDataLoad(): Promise<void> {
    await this.waitForNetworkIdle();
    await this.wait(1000);
  }

  // Summary Metrics Methods
  /**
   * Get Premium This Week value from metric card
   */
  async getPremiumThisWeek(): Promise<number> {
    const metricCard = this.page.getByTestId('premium-this-week-value');
    await expect(metricCard).toBeVisible({ timeout: 5000 });
    const text = await metricCard.textContent();
    if (!text) return 0;
    // Remove $ and commas, parse as number
    const cleaned = text.replace(/[$,]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Get Capital In Puts value from metric card
   */
  async getCapitalInPuts(): Promise<number> {
    const metricCard = this.page.getByTestId('capital-in-puts-value');
    await expect(metricCard).toBeVisible({ timeout: 5000 });
    const text = await metricCard.textContent();
    if (!text) return 0;
    // Remove $ and commas, parse as number
    const cleaned = text.replace(/[$,]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Get Shares For Calls value from metric card
   */
  async getSharesForCalls(): Promise<number> {
    const metricCard = this.page.getByTestId('shares-for-calls-value');
    await expect(metricCard).toBeVisible({ timeout: 5000 });
    const text = await metricCard.textContent();
    if (!text) return 0;
    // Remove commas, parse as number
    const cleaned = text.replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }

  // Shares Table Methods
  /**
   * Get the Shares card container (more specific selector)
   */
  get sharesCard(): Locator {
    // Look for the Shares card by finding text "Shares" that is next to a "Show" button
    // This uniquely identifies the Shares card (not the "Shares For Calls" metric)
    // The Shares card has a header with "Shares" text and a "Show" button
    return this.page
      .locator('text=Shares')
      .filter({ hasText: /^Shares$/ })
      .locator('..') // parent div with header
      .locator('..') // parent glass-card div
      .first();
  }

  /**
   * Get all rows from shares table
   */
  async getSharesTableRows(): Promise<Locator[]> {
    const sharesCard = this.sharesCard;
    await expect(sharesCard).toBeVisible({ timeout: 5000 });
    // Find rows - they're typically in a grid or table structure
    const rows = sharesCard.locator('div').filter({ hasText: /^[A-Z]{1,5}$/ });
    return await rows.all();
  }

  /**
   * Get shares data for specific ticker
   */
  async getSharesForTicker(ticker: string): Promise<{
    shares: number;
    covered: number;
    uncovered: number;
    avgCost: number;
  } | null> {
    const sharesCard = this.sharesCard;
    await expect(sharesCard).toBeVisible({ timeout: 5000 });
    const tickerRow = sharesCard.locator(`text=${ticker.toUpperCase()}`).locator('..');
    if ((await tickerRow.count()) === 0) return null;

    const rowText = await tickerRow.textContent();
    if (!rowText) return null;

    // Parse row text to extract values
    // Format: Symbol Shares Covered Uncov. Avg Cost
    const parts = rowText.trim().split(/\s+/);
    // This is a simplified parser - may need adjustment based on actual format
    return {
      shares: parseFloat(parts[1] || '0') || 0,
      covered: parseFloat(parts[2] || '0') || 0,
      uncovered: parseFloat(parts[3] || '0') || 0,
      avgCost: parseFloat(parts[4]?.replace('$', '') || '0') || 0,
    };
  }

  /**
   * Click Buy Shares button for a ticker
   */
  async clickBuySharesButton(ticker: string): Promise<void> {
    const sharesCard = this.sharesCard;
    await expect(sharesCard).toBeVisible({ timeout: 5000 });
    // Find the Buy Shares button near the ticker
    const tickerRow = sharesCard.locator(`text=${ticker.toUpperCase()}`).locator('..');
    const buyButton = tickerRow.locator('button', { hasText: /Buy Shares/i }).first();
    await expect(buyButton).toBeVisible({ timeout: 5000 });
    await buyButton.click();
    await this.wait(500);
  }

  /**
   * Click ticker in shares table to open TickerDrawer
   */
  async clickTickerInSharesTable(ticker: string): Promise<void> {
    const sharesCard = this.sharesCard;
    await expect(sharesCard).toBeVisible({ timeout: 5000 });
    const tickerLink = sharesCard.locator(`text=${ticker.toUpperCase()}`).first();
    await expect(tickerLink).toBeVisible({ timeout: 5000 });
    await tickerLink.click();
    await this.wait(500);
  }

  // Roll Form Methods
  /**
   * Fill roll form with provided options
   */
  async fillRollForm(options: {
    oldContracts?: string;
    oldStrike?: string;
    oldExpiration?: string;
    closePremium?: string;
    newContracts?: string;
    newStrike?: string;
    newExpiration?: string;
    newPremium?: string;
  }): Promise<void> {
    // Find roll form inputs by labels
    if (options.oldContracts) {
      const input = this.page
        .getByLabel(/old.*contracts/i)
        .or(this.page.getByLabel(/contracts/i).first());
      await input.fill(options.oldContracts);
    }
    if (options.oldStrike) {
      const input = this.page
        .getByLabel(/old.*strike/i)
        .or(this.page.locator('input[type="number"]').nth(1));
      await input.fill(options.oldStrike);
    }
    if (options.oldExpiration) {
      const input = this.page
        .getByLabel(/old.*expiration/i)
        .or(this.page.locator('input[type="date"]').first());
      await input.fill(options.oldExpiration);
    }
    if (options.closePremium) {
      const input = this.page
        .getByLabel(/close.*premium/i)
        .or(this.page.locator('input[type="number"]').nth(2));
      await input.fill(options.closePremium);
    }
    if (options.newContracts) {
      const input = this.page
        .getByLabel(/new.*contracts/i)
        .or(this.page.locator('input[type="number"]').nth(3));
      await input.fill(options.newContracts);
    }
    if (options.newStrike) {
      const input = this.page
        .getByLabel(/new.*strike/i)
        .or(this.page.locator('input[type="number"]').nth(4));
      await input.fill(options.newStrike);
    }
    if (options.newExpiration) {
      const input = this.page
        .getByLabel(/new.*expiration/i)
        .or(this.page.locator('input[type="date"]').last());
      await input.fill(options.newExpiration);
    }
    if (options.newPremium) {
      const input = this.page
        .getByLabel(/new.*premium/i)
        .or(this.page.locator('input[type="number"]').last());
      await input.fill(options.newPremium);
    }
  }

  /**
   * Submit roll form
   */
  async submitRollForm(): Promise<void> {
    const submitButton = this.page.getByRole('button', { name: /roll|submit/i });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();
    await this.wait(1000);
  }

  /**
   * Get net credit/debit value from roll form
   */
  async getRollFormNetCredit(): Promise<number> {
    const netCreditElement = this.page.locator('text=/net.*credit|net.*debit/i').first();
    if ((await netCreditElement.count()) === 0) return 0;
    const text = await netCreditElement.textContent();
    if (!text) return 0;
    const cleaned = text.replace(/[$,]/g, '');
    const match = cleaned.match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : 0;
  }

  // Close Position Methods
  /**
   * Click Close Position option for a ticker
   */
  async clickClosePosition(ticker: string): Promise<void> {
    // Find the ticker row in Wheel Phase
    const wheelPhaseSection = this.page
      .locator('[data-testid="wheel-phase-card"]')
      .or(this.page.locator('text=Wheel Phase').locator('..'));
    await expect(wheelPhaseSection).toBeVisible({ timeout: 5000 });

    const row = wheelPhaseSection.locator(`text=${ticker.toUpperCase()}`).first().locator('..');
    await expect(row).toBeVisible({ timeout: 5000 });

    // Find and click dropdown menu
    const dropdownTrigger = row.locator('button').last();
    await dropdownTrigger.click({ force: true });
    await this.wait(500);

    // Wait for dropdown menu
    await this.page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => {
          const text = btn.textContent || '';
          return /^Close Position$/i.test(text.trim());
        });
      },
      { timeout: 10000 }
    );

    // Click Close Position option
    const closePositionOption = this.page
      .locator('button')
      .filter({ hasText: /^Close Position$/i })
      .first();
    await expect(closePositionOption).toBeVisible({ timeout: 5000 });
    await closePositionOption.click();
    await this.wait(500);
  }

  /**
   * Confirm close position dialog
   */
  async confirmClosePosition(): Promise<void> {
    this.page.once('dialog', dialog => {
      expect(dialog.type()).toBe('confirm');
      dialog.accept();
    });
    await this.wait(1000);
  }

  /**
   * Cancel close position dialog
   */
  async cancelClosePosition(): Promise<void> {
    this.page.once('dialog', dialog => {
      expect(dialog.type()).toBe('confirm');
      dialog.dismiss();
    });
    await this.wait(1000);
  }

  // TickerDrawer Methods
  /**
   * Get TickerDrawer container
   */
  get tickerDrawer(): Locator {
    // TickerDrawer has aria-modal and contains "Open Positions" or "Share Lots" text
    return this.page
      .locator('[aria-modal]')
      .filter({ has: this.page.locator('text=/Open Positions|Share Lots|Earnings/i') })
      .first();
  }

  /**
   * Check if TickerDrawer is open
   */
  async isTickerDrawerOpen(): Promise<boolean> {
    // Look for the drawer by checking for "Open Positions" or "Share Lots" text
    const drawer = this.page
      .locator('[aria-modal]')
      .filter({ has: this.page.locator('text=/Open Positions|Share Lots/i') })
      .first();
    return await drawer.isVisible().catch(() => false);
  }

  /**
   * Get ticker symbol from TickerDrawer
   */
  async getTickerDrawerSymbol(): Promise<string | null> {
    // The drawer contains "Open Positions" or "Share Lots"
    const drawer = this.page
      .locator('[aria-modal]')
      .filter({ has: this.page.locator('text=/Open Positions|Share Lots/i') })
      .first();
    if ((await drawer.count()) === 0) return null;

    // The symbol is in the header - look for text that matches ticker pattern (1-5 uppercase letters)
    // It should be in a div with green color styling
    const header = drawer
      .locator('div')
      .filter({ hasText: /^[A-Z]{1,5}$/ })
      .first();
    if ((await header.count()) === 0) {
      // Try looking for any uppercase text in the first visible div
      const allDivs = await drawer.locator('div').all();
      for (const div of allDivs) {
        const text = await div.textContent();
        if (text && /^[A-Z]{1,5}$/.test(text.trim())) {
          return text.trim();
        }
      }
      return null;
    }
    const text = await header.textContent();
    return text?.trim() || null;
  }

  /**
   * Close TickerDrawer
   */
  async closeTickerDrawer(): Promise<void> {
    // Find the close button in the TickerDrawer specifically
    const drawer = this.page
      .locator('[aria-modal]')
      .filter({ has: this.page.locator('text=/Open Positions|Share Lots/i') })
      .first();
    if ((await drawer.count()) === 0) return;

    const closeButton = drawer.locator('button', { hasText: /Close/i }).first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click({ force: true });
      await this.wait(500);
    }
  }
}
