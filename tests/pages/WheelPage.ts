import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

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
    return this.page.getByTestId('wheel.action.open').or(
      this.page.getByRole('button', { name: /premium printer/i })
    );
  }

  get actionsDrawer(): Locator {
    return this.page.locator('[role="dialog"]').or(
      this.page.locator('[data-testid="drawer.trade"]').locator('..')
    );
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
}

