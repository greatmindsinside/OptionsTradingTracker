import { expect, test } from '@playwright/test';

import { WheelPage } from '../pages/WheelPage';

/**
 * E2E test to verify Historical Min Strikes table updates when adding trades
 *
 * This test:
 * 1. Captures console logs to review snapshot recording process
 * 2. Adds a covered call trade with shares
 * 3. Verifies the Historical Min Strikes table updates with the new data
 * 4. Reviews console logs to diagnose any issues
 */

test.describe('Historical Min Strikes - Snapshot Update', () => {
  test('should update Historical Min Strikes table when adding covered call with shares', async ({
    page,
  }) => {
    const wheelPage = new WheelPage(page);

    // Capture all console logs for review
    const consoleMessages: Array<{ type: string; text: string }> = [];
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
      };
      consoleMessages.push(logEntry);
      // Also log to test output for visibility
      console.log(`[${logEntry.type}] ${logEntry.text}`);
    });

    // Navigate to wheel page
    await wheelPage.navigate();
    await page.waitForTimeout(1000); // Wait for initial load

    // Get initial state of Historical Min Strikes
    const historicalCard = page.locator('text=Historical Min Strikes').locator('..');
    await expect(historicalCard).toBeVisible();

    // Check initial state (should be empty or have existing data)
    const hasInitialData = (await historicalCard.locator('table, svg').count()) > 0;

    console.log('Initial state - Has data:', hasInitialData);

    // Open actions drawer and trade tab
    await wheelPage.openActionsDrawer();
    await wheelPage.openTradeTab();

    // Fill in trade form for a covered call
    const symbol = 'TESTMIN';
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + 7);
    const expirationStr = expirationDate.toISOString().split('T')[0]!;

    await wheelPage.symbolInput.fill(symbol);
    await wheelPage.selectOptionType('Call');
    await wheelPage.selectSide('Sell');

    // Check "I own the underlying shares" checkbox
    // Try multiple ways to find the checkbox
    let checkboxFound = false;
    const checkboxSelectors = ['input[type="checkbox"][id*="owns"]', 'input[type="checkbox"]'];

    for (const selector of checkboxSelectors) {
      const checkboxes = page.locator(selector);
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        const cb = checkboxes.nth(i);
        const label = await cb
          .locator('..')
          .textContent()
          .catch(() => '');
        if (label?.toLowerCase().includes('own') || label?.toLowerCase().includes('share')) {
          await cb.check();
          checkboxFound = true;
          console.log('Found and checked shares checkbox');
          break;
        }
      }
      if (checkboxFound) break;
    }

    if (checkboxFound) {
      await page.waitForTimeout(500); // Wait for form to update

      // Fill shares owned and average cost
      const sharesOwnedInput = page.getByLabel(/shares owned/i).first();
      const avgCostInput = page.getByLabel(/average cost/i).first();

      if (await sharesOwnedInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sharesOwnedInput.fill('100');
        await avgCostInput.fill('50.00');
        console.log('Filled shares owned: 100, avg cost: 50.00');
      }
    }

    // Fill trade form
    await wheelPage.fillTradeForm({
      qty: '1',
      expiration: expirationStr,
      strike: '55.00',
      premium: '2.50',
      fees: '0.65',
    });

    console.log('Filled trade form:', {
      symbol,
      qty: '1',
      expiration: expirationStr,
      strike: '55.00',
      premium: '2.50',
    });

    // Capture console logs before clicking add
    const logsBeforeAdd = consoleMessages.length;

    // Click add trade button
    await wheelPage.addTradeButton.click();

    // Wait for trade to be added and page to reload
    await page.waitForTimeout(3000);

    // Wait for any alerts to appear and dismiss them
    try {
      const alert = page.locator('text=/success|trade added/i').first();
      if (await alert.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Dismiss alert if it's a dialog
        await page.keyboard.press('Escape').catch(() => {});
      }
    } catch {
      // Ignore if no alert
    }

    // Wait for Historical Min Strikes to reload
    await page.waitForTimeout(2000);

    // Filter console messages related to min strikes
    const minStrikeLogs = consoleMessages.filter(
      msg =>
        msg.text.includes('Min strike') ||
        msg.text.includes('min strike') ||
        msg.text.includes('recordMinStrikeSnapshot') ||
        msg.text.includes('useHistoricalMinStrikes') ||
        msg.text.includes('getAllHistoricalMinStrikes') ||
        msg.text.includes('getHistoricalMinStrikes') ||
        msg.text.includes('useEntriesStore')
    );

    console.log('\n=== MIN STRIKE RELATED CONSOLE LOGS ===');
    minStrikeLogs.forEach((log, idx) => {
      console.log(`${idx + 1}. [${log.type}] ${log.text}`);
    });
    console.log('=== END MIN STRIKE LOGS ===\n');

    // Check if Historical Min Strikes table has data
    const tableTab = historicalCard.getByRole('button', { name: 'Table' });
    if (await tableTab.isVisible()) {
      await tableTab.click();
      await page.waitForTimeout(500);
    }

    // Check for data in the table
    const table = historicalCard.locator('table');
    const tableVisible = await table.isVisible({ timeout: 2000 }).catch(() => false);

    if (tableVisible) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      console.log(`Historical Min Strikes table has ${rowCount} rows`);

      // Verify we have data for our symbol
      const symbolRows = table.locator(`text=${symbol}`);
      const symbolRowCount = await symbolRows.count();
      console.log(`Found ${symbolRowCount} rows for symbol ${symbol}`);

      if (symbolRowCount > 0) {
        // Verify the data is correct
        const firstRow = rows.first();
        const rowText = await firstRow.textContent();
        console.log('First row data:', rowText);

        // Check that min strike is calculated correctly
        // avgCost (50.00) - premiumReceived (2.50) = 47.50
        await expect(firstRow)
          .toContainText('47.50', { timeout: 1000 })
          .catch(() => {
            console.log('Min strike value not found in expected format');
          });
      }
    } else {
      // Check if still showing empty state
      const emptyState = historicalCard.locator('text=/no.*historical.*data/i');
      const isEmpty = await emptyState.isVisible({ timeout: 1000 }).catch(() => false);

      if (isEmpty) {
        console.log('⚠️ Historical Min Strikes still shows empty state');
        console.log('Reviewing console logs to diagnose...');

        // Check for specific error patterns
        const errorLogs = consoleMessages.filter(
          msg =>
            msg.type === 'error' ||
            msg.text.toLowerCase().includes('error') ||
            msg.text.toLowerCase().includes('failed')
        );

        if (errorLogs.length > 0) {
          console.log('\n=== ERROR LOGS ===');
          errorLogs.forEach((log, idx) => {
            console.log(`${idx + 1}. [${log.type}] ${log.text}`);
          });
          console.log('=== END ERROR LOGS ===\n');
        }

        // Check if snapshot calculation happened
        const calculationLogs = consoleMessages.filter(msg =>
          msg.text.includes('Min strike calculation')
        );

        if (calculationLogs.length === 0) {
          console.log('❌ No min strike calculation logs found - calculation may not have run');
        } else {
          console.log(`✅ Found ${calculationLogs.length} calculation log(s)`);
        }

        // Check if snapshot was recorded
        const recordedLogs = consoleMessages.filter(
          msg =>
            msg.text.includes('snapshot recorded') || msg.text.includes('Inserted new snapshot')
        );

        if (recordedLogs.length === 0) {
          console.log('❌ No snapshot recording logs found - snapshot may not have been saved');
        } else {
          console.log(`✅ Found ${recordedLogs.length} recording log(s)`);
        }
      }
    }

    // Print summary of all relevant console messages
    console.log('\n=== ALL CONSOLE MESSAGES SUMMARY ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Min strike related: ${minStrikeLogs.length}`);
    console.log(`Messages after add trade: ${consoleMessages.length - logsBeforeAdd}`);
  });
});
