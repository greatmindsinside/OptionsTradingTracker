/**
 * Portfolio Import Test
 * Tests the portfolio creation and persistence during import process
 */

import { describe, it, beforeEach, expect } from 'vitest';
import { initDatabase } from '../../src/modules/db/sqlite';
import { PortfolioDAO } from '../../src/modules/db/portfolio-dao';

describe('Portfolio Import Integration', () => {
  let db: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let portfolioDAO: PortfolioDAO;

  beforeEach(async () => {
    // Initialize fresh database for each test
    db = await initDatabase();
    portfolioDAO = new PortfolioDAO(db);
  });

  it('should create and persist portfolio during import simulation', async () => {
    console.log('🚀 Testing portfolio creation and persistence');

    // Step 1: Check initial state - should be no portfolios
    const initialPortfolios = await portfolioDAO.findAllWithTradeCounts();
    console.log('📊 Initial portfolios:', initialPortfolios);
    expect(initialPortfolios.length).toBe(0);

    // Step 2: Simulate the import process portfolio creation
    let portfolioId = 1;
    const existingPortfolio = await portfolioDAO.findById(portfolioId);
    console.log('🔍 Checking for existing portfolio ID 1:', existingPortfolio);

    if (!existingPortfolio.success) {
      console.log('📝 Creating default portfolio...');
      const createResult = await portfolioDAO.create({
        name: 'Default Portfolio',
        broker: 'robinhood',
        account_type: 'cash',
        description: 'Auto-created portfolio for CSV imports',
        is_active: true,
      });

      console.log('📊 Portfolio creation result:', createResult);
      expect(createResult.success).toBe(true);
      expect(createResult.data).toBeDefined();

      if (createResult.success && createResult.data) {
        portfolioId = createResult.data.id!;
        console.log('✅ Created portfolio with ID:', portfolioId);

        // Verify portfolio was created
        const verifyResult = await portfolioDAO.findById(portfolioId);
        console.log('🔍 Verification result:', verifyResult);
        expect(verifyResult.success).toBe(true);
        expect(verifyResult.data).toBeDefined();
      }
    }

    // Step 3: Check that portfolio exists after creation
    const afterCreationPortfolios = await portfolioDAO.findAllWithTradeCounts();
    console.log('📋 Portfolios after creation:', afterCreationPortfolios);
    expect(afterCreationPortfolios.length).toBe(1);
    expect(afterCreationPortfolios[0].name).toBe('Default Portfolio');

    // Step 4: Simulate what happens after import - check persistence
    console.log('🔍 Checking portfolio persistence...');
    const persistenceCheck = await portfolioDAO.findById(portfolioId);
    console.log('📊 Persistence check result:', persistenceCheck);
    expect(persistenceCheck.success).toBe(true);
    expect(persistenceCheck.data).toBeDefined();

    // Step 5: Check final state
    const finalPortfolios = await portfolioDAO.findAllWithTradeCounts();
    console.log('📋 Final portfolios:', finalPortfolios);
    expect(finalPortfolios.length).toBe(1);

    console.log('✅ Portfolio creation and persistence test completed successfully');
  });

  it('should handle existing portfolio correctly', async () => {
    console.log('🚀 Testing existing portfolio handling');

    // Step 1: Create a portfolio first
    const createResult = await portfolioDAO.create({
      name: 'Existing Portfolio',
      broker: 'robinhood',
      account_type: 'cash',
      description: 'Pre-existing portfolio',
      is_active: true,
    });

    expect(createResult.success).toBe(true);
    const createdPortfolioId = createResult.data!.id!;
    console.log('📝 Created portfolio with ID:', createdPortfolioId);

    // Step 2: Simulate import process looking for portfolio ID 1
    const portfolioId = createdPortfolioId; // Use the actual created ID
    const existingPortfolio = await portfolioDAO.findById(portfolioId);
    console.log('🔍 Checking for existing portfolio:', existingPortfolio);

    expect(existingPortfolio.success).toBe(true);
    expect(existingPortfolio.data).toBeDefined();
    expect(existingPortfolio.data!.name).toBe('Existing Portfolio');

    // Step 3: Verify portfolio count remains 1
    const finalPortfolios = await portfolioDAO.findAllWithTradeCounts();
    console.log('📋 Final portfolios:', finalPortfolios);
    expect(finalPortfolios.length).toBe(1);

    console.log('✅ Existing portfolio handling test completed successfully');
  });
});
