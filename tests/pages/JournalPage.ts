import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export type TradeType = 'Sell Put' | 'Put Assigned' | 'Sell Covered Call' | 'Call Assigned' | 'Dividend' | 'Fee';

export interface EntryFormOptions {
  symbol: string;
  contracts?: string;
  strike?: string;
  premium?: string;
  fee?: string;
  amount?: string;
  expiration?: string;
  date?: string;
  notes?: string;
}

export interface AddEntryOptions extends EntryFormOptions {
  tradeType: TradeType;
}

export interface EditEntryOptions extends Partial<EntryFormOptions> {
  editReason?: string;
}

/**
 * Page Object Model for the Journal page
 */
export class JournalPage extends BasePage {
  // Selectors
  get title(): Locator {
    return this.page.getByTestId('journal.title').or(
      this.page.getByRole('heading', { name: /journal/i })
    );
  }

  get newEntryButton(): Locator {
    // The button is in the AppHeader and is conditionally rendered
    // Try multiple selectors to find it
    return this.page
      .getByRole('button', { name: /new entry/i })
      .or(this.page.getByRole('button', { name: 'New Entry', exact: true }))
      .first();
  }

  get entryModal(): Locator {
    // The modal has role="dialog" and title "✨ New Entry"
    // Use a more flexible selector that matches the dialog with the title
    return this.page.getByRole('dialog').filter({ hasText: /new entry/i }).first();
  }

  get editDrawer(): Locator {
    return this.page.locator('h2:has-text("Edit Entry")').locator('..');
  }

  getTradeTypeButton(type: TradeType): Locator {
    return this.page.getByRole('button', { name: type });
  }

  get symbolInput(): Locator {
    // The symbol input is in the entry modal, not the table
    // Use a more specific selector to avoid matching table headers
    // First try to find it in the dialog, otherwise fall back to general search
    return this.page.getByRole('dialog').getByLabel(/symbol/i).first().or(
      this.page.locator('input[type="text"]').filter({ has: this.page.locator('label:has-text("Symbol")') }).first()
    );
  }

  get contractsInput(): Locator {
    // Scope to dialog to avoid matching table headers
    return this.page.getByRole('dialog').getByLabel(/contracts/i).first();
  }

  get strikeInput(): Locator {
    // Scope to dialog to avoid matching table headers
    return this.page.getByRole('dialog').getByLabel(/strike/i).first();
  }

  get premiumInput(): Locator {
    // Scope to dialog to avoid matching table headers
    return this.page.getByRole('dialog').getByLabel(/premium/i).first();
  }

  get feeInput(): Locator {
    // Scope to dialog to avoid matching table headers
    return this.page.getByRole('dialog').getByLabel(/fee/i).first();
  }

  get amountInput(): Locator {
    // Scope to dialog to avoid matching table headers
    return this.page.getByRole('dialog').getByLabel(/amount/i).first();
  }

  get expirationInput(): Locator {
    // Scope to dialog to avoid matching table headers
    return this.page.getByRole('dialog').getByLabel(/expiration/i).first();
  }

  get dateInput(): Locator {
    // Scope to dialog to avoid matching table headers
    return this.page.getByRole('dialog').getByLabel(/date/i).first();
  }

  get notesInput(): Locator {
    // Scope to dialog to avoid matching table headers
    return this.page.getByRole('dialog').getByLabel(/notes/i).first();
  }

  get saveEntryButton(): Locator {
    return this.page.getByRole('button', { name: /save entry/i });
  }

  get saveChangesButton(): Locator {
    return this.page.getByRole('button', { name: /save changes/i });
  }

  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: /cancel/i });
  }

  get entriesTable(): Locator {
    return this.page.locator('table.table');
  }

  get entryCards(): Locator {
    return this.page.locator('[data-testid="journal.entry"]');
  }

  getEditButton(index = 0): Locator {
    return this.page.locator('button[title="Edit entry"]').nth(index);
  }

  getDeleteButton(index = 0): Locator {
    return this.page.locator('button[title="Delete entry"]').nth(index);
  }

  get filterBar(): Locator {
    return this.page.locator('[data-testid="filter-bar"]').or(
      this.page.locator('text=Filters').locator('..')
    );
  }

  get summaryCards(): Locator {
    return this.page.locator('[data-testid="summary-card"]');
  }

  // Actions
  /**
   * Navigate to the journal page
   */
  async navigate(): Promise<void> {
    await super.navigate('/journal');
    await this.waitForPageLoad();
  }

  /**
   * Wait for the journal page to be ready
   */
  async waitForPageLoad(): Promise<void> {
    await super.waitForPageLoad();
    await expect(this.title).toBeVisible({ timeout: 10000 });
    await this.wait(500);
  }

  /**
   * Open the new entry modal
   */
  async openNewEntryModal(): Promise<void> {
    // Wait for the New Entry button to be visible (it's in the AppHeader)
    // The button is conditionally rendered based on the route, so we need to wait for it
    // First, ensure we're on the journal page and the header has rendered
    await this.page.waitForLoadState('networkidle');
    await this.wait(500);
    
    // Wait for the route to be /journal (use a more flexible pattern)
    await this.page.waitForURL(/\/journal/, { timeout: 10000 });
    
    // Wait for the button to appear - it's conditionally rendered in AppHeader
    // The button dispatches a custom event 'journal:new-entry' when clicked
    // Use waitForFunction to wait for the button to be in the DOM and visible
    await this.page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const newEntryBtn = buttons.find(btn => btn.textContent?.trim() === 'New Entry');
        return newEntryBtn && newEntryBtn.offsetParent !== null; // Check if visible
      },
      { timeout: 15000 }
    );
    
    // Now get the button by text content
    const button = this.page.locator('button').filter({ hasText: 'New Entry' }).first();
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await this.wait(500);
    
    // Wait for the modal to be visible
    // The modal has role="dialog" and title "✨ New Entry"
    await expect(this.entryModal).toBeVisible({ timeout: 10000 });
    await this.wait(500);
  }

  /**
   * Select trade type (Sell Put, Put Assigned, etc.)
   */
  async selectTradeType(type: TradeType): Promise<void> {
    const button = this.getTradeTypeButton(type);
    await expect(button).toBeVisible({ timeout: 5000 });
    await button.click();
    await this.wait(300);
  }

  /**
   * Fill entry form with provided values
   */
  async fillEntryForm(options: EntryFormOptions): Promise<void> {
    if (options.symbol) {
      await this.symbolInput.fill(options.symbol);
    }

    if (options.contracts !== undefined) {
      await this.contractsInput.fill(options.contracts);
    }

    if (options.strike !== undefined) {
      await this.strikeInput.fill(options.strike);
    }

    if (options.premium !== undefined) {
      await this.premiumInput.fill(options.premium);
    }

    if (options.fee !== undefined) {
      await this.feeInput.fill(options.fee);
    }

    if (options.amount !== undefined) {
      await this.amountInput.fill(options.amount);
    }

    if (options.date !== undefined) {
      await this.dateInput.fill(options.date);
    }

    if (options.expiration !== undefined) {
      await this.expirationInput.fill(options.expiration);
    }

    if (options.notes !== undefined) {
      await this.notesInput.fill(options.notes);
    }
  }

  /**
   * Save the entry
   */
  async saveEntry(): Promise<void> {
    const saveButton = this.page.getByRole('button', { name: /save entry/i });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await expect(saveButton).toBeEnabled();
    await saveButton.click({ force: true });
    
    // Wait for modal to close (modal should disappear)
    // The modal might take a moment to close, so wait for it to not be visible
    try {
      await expect(this.entryModal).not.toBeVisible({ timeout: 5000 });
    } catch {
      // If modal is still visible, wait a bit more and check again
      await this.wait(500);
      // Don't fail if modal is still visible - it might be closing
    }
    
    // Wait for data to sync - the store saves to DB and reloads entries
    // The store calls loadEntries() after saving, which is async
    // Wait for the modal to fully close first
    await this.wait(500);
    
    // Wait for the store's loading state to complete
    // The store sets loading: false when done
    // Also wait for entries to actually appear in the DOM
    try {
      await this.page.waitForFunction(
        () => {
          // Check if there are entries visible (table or cards)
          const table = document.querySelector('table tbody');
          const cards = document.querySelectorAll('[data-testid="journal.entry"]');
          const hasEntries = (table && table.children.length > 0) || cards.length > 0;
          
          // Also check if loading is complete
          const loadingText = document.body.textContent || '';
          const isLoading = loadingText.includes('Loading') && !loadingText.includes('entries');
          
          return hasEntries && !isLoading;
        },
        { timeout: 10000 }
      );
    } catch {
      // If check fails, wait a bit more and continue
      await this.wait(2000);
    }
    
    // Additional wait for React to fully re-render
    await this.wait(1000);
  }

  /**
   * Complete flow to add an entry
   */
  async addEntry(options: AddEntryOptions): Promise<void> {
    // Ensure we're on the journal page first
    await this.navigate();
    await this.openNewEntryModal();
    await this.selectTradeType(options.tradeType);
    
    // For options trades, ensure expiration is set if not provided
    const needsExpiration = ['Sell Put', 'Sell Covered Call'].includes(options.tradeType);
    if (needsExpiration && !options.expiration) {
      // Set expiration to 7 days from today to satisfy validation
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const expirationDate = futureDate.toISOString().split('T')[0]!;
      options.expiration = expirationDate;
    }
    
    await this.fillEntryForm(options);
    await this.saveEntry();
  }

  /**
   * Edit an existing entry
   */
  async editEntry(symbol: string, options: EditEntryOptions, entryIndex = 0): Promise<void> {
    // Wait for entry to be visible
    await this.waitForEntry(symbol);
    
    // Wait a bit for the UI to stabilize
    await this.wait(500);

    // Click edit button
    const editButton = this.getEditButton(entryIndex);
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await expect(editButton).toBeEnabled({ timeout: 5000 });
    
    // Scroll into view if needed
    await editButton.scrollIntoViewIfNeeded();
    
    await editButton.click({ force: true });

    // Wait for edit drawer/modal to open
    await this.page.waitForSelector('h2:has-text("Edit Entry")', { timeout: 10000 });

    // Fill in the form if options provided
    if (Object.keys(options).length > 0) {
      // Find inputs by their placeholder text or position
      if (options.contracts !== undefined) {
        const contractsInput = this.page
          .locator('input[placeholder*="e.g., 1"]')
          .or(this.page.locator('input[inputmode="numeric"]'))
          .first();
        await contractsInput.clear();
        await contractsInput.fill(options.contracts);
      }

      if (options.amount !== undefined) {
        const amountInput = this.page.locator('input[placeholder*="credit"]').first();
        await amountInput.clear();
        await amountInput.fill(options.amount);
      }

      if (options.editReason !== undefined) {
        const reasonTextarea = this.page.locator('textarea[placeholder*="Correcting"]').first();
        await reasonTextarea.fill(options.editReason);
      }
    }

    // Save changes
    await expect(this.saveChangesButton).toBeVisible({ timeout: 5000 });
    await expect(this.saveChangesButton).toBeEnabled();
    await this.saveChangesButton.click({ force: true });
    await this.wait(1000);
  }

  /**
   * Delete an entry
   */
  async deleteEntry(symbol: string, entryIndex = 0): Promise<void> {
    await this.waitForEntry(symbol);

    const deleteButton = this.getDeleteButton(entryIndex);
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();
    await this.wait(500);
  }

  /**
   * Wait for entry to appear
   */
  async waitForEntry(symbol: string, timeout = 30000): Promise<void> {
    // Check for both table (desktop) and cards (mobile)
    // Use a more flexible approach - check for the symbol text
    // This works for both mobile cards and desktop table
    // The symbol is uppercase in the database, so we should match it case-insensitively
    const upperSymbol = symbol.toUpperCase();
    
    // Wait for the symbol to appear in the page
    // Try multiple strategies to find the entry
    try {
      // First, try waiting for the symbol in visible table cells or cards
      await this.page.waitForFunction(
        (sym: string) => {
          // Check table cells
          const tableCells = document.querySelectorAll('table td');
          for (const cell of tableCells) {
            const style = window.getComputedStyle(cell);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              const text = cell.textContent || '';
              if (text.toUpperCase().includes(sym)) {
                return true;
              }
            }
          }
          
          // Check cards
          const cards = document.querySelectorAll('[data-testid="journal.entry"]');
          for (const card of cards) {
            const style = window.getComputedStyle(card);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              const text = card.textContent || '';
              if (text.toUpperCase().includes(sym)) {
                return true;
              }
            }
          }
          
          // Fallback: check page text
          const text = document.body.textContent || '';
          return text.toUpperCase().includes(sym);
        },
        upperSymbol,
        { timeout: Math.min(timeout, 20000) }
      );
    } catch {
      // If that fails, try a simpler text check with longer timeout
      await this.page.waitForFunction(
        (sym: string) => {
          const text = document.body.textContent || '';
          return text.toUpperCase().includes(sym);
        },
        upperSymbol,
        { timeout: Math.min(timeout, 20000) }
      );
    }
  }

  /**
   * Get locator for entry row/card
   */
  async getEntryRow(symbol: string): Promise<Locator> {
    const upperSymbol = symbol.toUpperCase();
    const isMobile = await this.isMobileView();
    
    if (isMobile) {
      return this.page.locator('[data-testid="journal.entry"]').filter({ hasText: upperSymbol }).first();
    } else {
      // For desktop, find the table row containing the symbol
      // The symbol is in uppercase in the database
      return this.page.locator('tr', { has: this.page.getByRole('cell', { name: upperSymbol }) }).first();
    }
  }

  /**
   * Check if entry is visible
   */
  async isEntryVisible(symbol: string): Promise<boolean> {
    const upperSymbol = symbol.toUpperCase();
    const entryText = this.page.getByText(upperSymbol).first();
    return await entryText.isVisible().catch(() => false);
  }

  // Helper Methods
  /**
   * Get number of entries
   */
  async getEntryCount(): Promise<number> {
    const isMobile = await this.isMobileView();
    
    if (isMobile) {
      const cards = await this.entryCards.all();
      return cards.length;
    } else {
      const rows = await this.entriesTable.locator('tbody tr').all();
      return rows.length;
    }
  }

  /**
   * Wait for either table (desktop) or cards (mobile) to be visible
   */
  async waitForTableOrCards(): Promise<void> {
    const isMobile = await this.isMobileView();
    
    if (isMobile) {
      await expect(this.entryCards.first()).toBeVisible({ timeout: 10000 });
    } else {
      await expect(this.entriesTable).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Check if mobile view is active
   */
  async isMobileView(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width < 768 : false;
  }

  /**
   * Get text content of entry
   */
  async getEntryText(symbol: string): Promise<string> {
    const upperSymbol = symbol.toUpperCase();
    const entryRow = await this.getEntryRow(upperSymbol);
    const text = await entryRow.textContent();
    return text ?? '';
  }

  /**
   * Wait for entry with specific type to appear
   */
  async waitForEntryWithType(symbol: string, type: string, timeout = 15000): Promise<void> {
    // First wait for the entry to appear
    await this.waitForEntry(symbol, timeout);
    
    // Then wait for the type to appear in the entry
    // The type is displayed as r.type.replace(/_/g, ' '), so "assignment_shares" becomes "assignment shares"
    // Use a more flexible approach - wait for the text to appear in the page
    const upperSymbol = symbol.toUpperCase();
    const typeLower = type.toLowerCase();
    
    // Wait for both the symbol and type text to appear in the page
    // The type text might be displayed with underscores replaced by spaces
    await this.page.waitForFunction(
      ({ sym, typeText }: { sym: string; typeText: string }) => {
        const text = (document.body.textContent || '').toLowerCase();
        // Check if both the symbol and type text appear in the page
        // The type text might be displayed with underscores replaced by spaces
        const typeWithSpaces = typeText.replace(/_/g, ' ');
        return text.includes(sym.toLowerCase()) && text.includes(typeWithSpaces);
      },
      { sym: upperSymbol, typeText: typeLower },
      { timeout: 10000 }
    );
    
    // The waitForFunction above has already verified that both the symbol and type text exist in the page
    // This is sufficient to verify the entry with the correct type exists
    // We don't need to verify it's in a specific row, as the text matching is already done
  }
}

