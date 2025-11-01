/**
 * Simple Portfolio Creation Test
 * Just tests if we can create and retrieve a portfolio
 */

console.log('🚀 Testing basic portfolio operations...');

async function testPortfolioCreation() {
  try {
    // Initialize database
    const { initDatabase } = await import('./src/modules/db/sqlite.js');
    const db = await initDatabase();
    console.log('💾 Database initialized');

    // Create DAO
    const { PortfolioDAO } = await import('./src/modules/db/portfolio-dao.js');
    const portfolioDAO = new PortfolioDAO(db);

    // Test 1: Check initial state
    console.log('📊 Checking initial portfolios...');
    const initialPortfolios = await portfolioDAO.findAllWithTradeCounts();
    console.log('Initial portfolios:', initialPortfolios);

    // Test 2: Create a portfolio
    console.log('📝 Creating test portfolio...');
    const createResult = await portfolioDAO.create({
      name: 'Test Portfolio',
      broker: 'robinhood',
      account_type: 'cash',
      description: 'Test portfolio for debugging',
      is_active: true,
    });
    console.log('Create result:', createResult);

    if (createResult.success && createResult.data) {
      const portfolioId = createResult.data.id;
      console.log('✅ Created portfolio with ID:', portfolioId);

      // Test 3: Verify it exists immediately
      const verifyResult = await portfolioDAO.findById(portfolioId);
      console.log('Immediate verification:', verifyResult);

      // Test 4: Check all portfolios again
      const afterCreationPortfolios = await portfolioDAO.findAllWithTradeCounts();
      console.log('Portfolios after creation:', afterCreationPortfolios);

      console.log('✅ Basic portfolio operations test completed successfully');
    } else {
      console.error('❌ Failed to create portfolio:', createResult.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPortfolioCreation();
