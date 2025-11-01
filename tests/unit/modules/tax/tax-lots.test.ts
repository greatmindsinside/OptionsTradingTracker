/**
 * Tax Lot Management System Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaxLotManager, TaxLotMethod, WashSaleStatus } from '../../../../src/modules/tax/tax-lots';
import type { TaxLot, TaxTransaction } from '../../../../src/modules/tax/tax-lots';

describe('Tax Lot Management System', () => {
  let taxLotManager: TaxLotManager;
  let sampleLots: TaxLot[];
  let portfolioId: string;

  // Helper function to create transactions with all required fields
  const createTransaction = (overrides: Partial<TaxTransaction>): TaxTransaction => ({
    id: 'tx_default',
    symbol: 'AAPL',
    transactionType: 'buy',
    quantity: 100,
    price: 150.0,
    fees: 0,
    transactionDate: '2023-12-01',
    settingDate: '2023-12-03',
    portfolioId,
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2023-12-01T10:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    taxLotManager = new TaxLotManager();
    portfolioId = 'portfolio_123';

    // Sample lots for testing
    sampleLots = [
      {
        id: 'lot_1',
        symbol: 'AAPL',
        quantity: 100,
        costBasisPerShare: 150.0,
        totalCostBasis: 15000.0,
        acquisitionDate: '2023-01-15',
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId,
        createdAt: '2023-01-15T10:00:00Z',
        updatedAt: '2023-01-15T10:00:00Z',
      },
      {
        id: 'lot_2',
        symbol: 'AAPL',
        quantity: 50,
        costBasisPerShare: 160.0,
        totalCostBasis: 8000.0,
        acquisitionDate: '2023-03-10',
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId,
        createdAt: '2023-03-10T10:00:00Z',
        updatedAt: '2023-03-10T10:00:00Z',
      },
      {
        id: 'lot_3',
        symbol: 'AAPL',
        quantity: 75,
        costBasisPerShare: 140.0,
        totalCostBasis: 10500.0,
        acquisitionDate: '2023-06-20',
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId,
        createdAt: '2023-06-20T10:00:00Z',
        updatedAt: '2023-06-20T10:00:00Z',
      },
    ];
  });

  describe('Transaction Processing', () => {
    describe('Acquisitions (Buy/Assignment)', () => {
      it('should create new tax lots for buy transactions', async () => {
        const buyTransaction: TaxTransaction = {
          id: 'tx_1',
          symbol: 'AAPL',
          transactionType: 'buy',
          quantity: 100,
          price: 155.0,
          fees: 10.0,
          transactionDate: '2023-12-01',
          settingDate: '2023-12-03',
          portfolioId,
          createdAt: '2023-12-01T10:00:00Z',
          updatedAt: '2023-12-01T10:00:00Z',
        };

        const result = await taxLotManager.processTransaction(buyTransaction, []);

        expect(result.newLots).toHaveLength(1);
        expect(result.newLots[0].symbol).toBe('AAPL');
        expect(result.newLots[0].quantity).toBe(100);
        expect(result.newLots[0].costBasisPerShare).toBe(155.1); // Price + fees per share
        expect(result.newLots[0].totalCostBasis).toBe(15510.0);
        expect(result.newLots[0].isOpen).toBe(true);
      });

      it('should handle assignment transactions', async () => {
        const assignmentTransaction = createTransaction({
          id: 'tx_2',
          transactionType: 'assignment',
          price: 150.0,
          fees: 5.0,
        });

        const result = await taxLotManager.processTransaction(assignmentTransaction, []);

        expect(result.newLots).toHaveLength(1);
        expect(result.newLots[0].costBasisPerShare).toBe(150.05); // Price + fees per share
      });
    });

    describe('Disposals (Sell/Exercise/Expiration)', () => {
      it('should process FIFO disposals correctly', async () => {
        const sellTransaction: TaxTransaction = {
          id: 'tx_3',
          symbol: 'AAPL',
          transactionType: 'sell',
          quantity: 75,
          price: 170.0,
          fees: 7.5,
          transactionDate: '2023-12-01',
          settingDate: '2023-12-03',
          portfolioId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const result = await taxLotManager.processTransaction(
          sellTransaction,
          sampleLots,
          TaxLotMethod.FIFO
        );

        expect(result.allocations).toHaveLength(1);
        expect(result.allocations[0].quantityAllocated).toBe(75);
        expect(result.allocations[0].costBasisPerShare).toBe(150.0);
        expect(result.allocations[0].realizedGainLoss).toBeCloseTo(1492.5); // (170 * 75) - (150 * 75) - 7.50

        // Check lot updates
        const updatedLot1 = result.updatedLots.find(lot => lot.id === 'lot_1');
        expect(updatedLot1?.quantity).toBe(25); // 100 - 75
        expect(updatedLot1?.isOpen).toBe(true);
      });

      it('should process LIFO disposals correctly', async () => {
        const sellTransaction = createTransaction({
          id: 'tx_4',
          transactionType: 'sell',
          quantity: 50,
          price: 165.0,
          fees: 5.0,
        });

        const result = await taxLotManager.processTransaction(
          sellTransaction,
          sampleLots,
          TaxLotMethod.LIFO
        );

        expect(result.allocations).toHaveLength(1);
        expect(result.allocations[0].costBasisPerShare).toBe(140.0); // Most recent lot (lot_3)
        expect(result.allocations[0].realizedGainLoss).toBeCloseTo(1245); // (165 * 50) - (140 * 50) - 5.00
      });

      it('should process HIFO disposals correctly', async () => {
        const sellTransaction = createTransaction({
          id: 'tx_5',
          transactionType: 'sell',
          quantity: 40,
          price: 155.0,
          fees: 4.0,
        });

        const result = await taxLotManager.processTransaction(
          sellTransaction,
          sampleLots,
          TaxLotMethod.HIFO
        );

        expect(result.allocations).toHaveLength(1);
        expect(result.allocations[0].costBasisPerShare).toBe(160.0); // Highest cost basis (lot_2)
        expect(result.allocations[0].realizedGainLoss).toBeCloseTo(-204); // (155 * 40) - (160 * 40) - 4.00
      });

      it('should handle partial lot disposals across multiple lots', async () => {
        const sellTransaction = createTransaction({
          id: 'tx_6',
          transactionType: 'sell',
          quantity: 125,
          price: 175.0,
          fees: 12.5,
        });

        const result = await taxLotManager.processTransaction(
          sellTransaction,
          sampleLots,
          TaxLotMethod.FIFO
        );

        expect(result.allocations).toHaveLength(2);

        // First allocation should be full lot_1
        expect(result.allocations[0].quantityAllocated).toBe(100);
        expect(result.allocations[0].costBasisPerShare).toBe(150.0);

        // Second allocation should be partial lot_2
        expect(result.allocations[1].quantityAllocated).toBe(25);
        expect(result.allocations[1].costBasisPerShare).toBe(160.0);
      });

      it('should throw error for insufficient lots', async () => {
        const sellTransaction = createTransaction({
          id: 'tx_7',
          transactionType: 'sell',
          quantity: 300, // More than available
          price: 170.0,
          fees: 15.0,
        });

        await expect(
          taxLotManager.processTransaction(sellTransaction, sampleLots, TaxLotMethod.FIFO)
        ).rejects.toThrow('Insufficient lots to cover disposal quantity');
      });
    });
  });

  describe('Wash Sale Detection', () => {
    it('should detect wash sales for losses within 30-day period', async () => {
      // Create a lot that will be sold at a loss
      const lossLot: TaxLot = {
        id: 'loss_lot',
        symbol: 'AAPL',
        quantity: 100,
        costBasisPerShare: 180.0,
        totalCostBasis: 18000.0,
        acquisitionDate: '2023-10-01',
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId,
        createdAt: '2023-10-01T10:00:00Z',
        updatedAt: '2023-10-01T10:00:00Z',
      };

      // Create a repurchase lot within wash sale period
      const repurchaseLot: TaxLot = {
        id: 'repurchase_lot',
        symbol: 'AAPL',
        quantity: 50,
        costBasisPerShare: 160.0,
        totalCostBasis: 8000.0,
        acquisitionDate: '2023-11-15', // Within 30 days of sale
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId,
        createdAt: '2023-11-15T10:00:00Z',
        updatedAt: '2023-11-15T10:00:00Z',
      };

      const sellTransaction = createTransaction({
        id: 'wash_tx',
        transactionType: 'sell',
        quantity: 100,
        price: 150.0, // Selling at a loss
        fees: 10.0,
        transactionDate: '2023-11-01',
        settingDate: '2023-11-03',
      });

      const allLots = [lossLot, repurchaseLot];
      const result = await taxLotManager.processTransaction(
        sellTransaction,
        allLots,
        TaxLotMethod.FIFO
      );

      expect(result.washSaleAnalysis?.hasWashSale).toBe(true);
      expect(result.washSaleAnalysis?.disallowedLoss).toBeCloseTo(3010); // Loss amount
      expect(result.allocations[0].isWashSale).toBe(true);
      expect(result.allocations[0].realizedGainLoss).toBe(0); // Loss disallowed
    });

    it('should not trigger wash sales for gains', async () => {
      const gainTransaction = createTransaction({
        id: 'gain_tx',
        transactionType: 'sell',
        quantity: 50,
        price: 180.0, // Selling at a gain
        fees: 5.0,
      });

      const result = await taxLotManager.processTransaction(
        gainTransaction,
        sampleLots,
        TaxLotMethod.FIFO
      );

      expect(result.washSaleAnalysis?.hasWashSale).toBe(false);
      expect(result.allocations[0].isWashSale).toBe(false);
    });

    it('should not trigger wash sales outside 61-day period', async () => {
      // Create a lot acquired outside wash sale period
      const outsidePeriodLot: TaxLot = {
        id: 'outside_lot',
        symbol: 'AAPL',
        quantity: 100,
        costBasisPerShare: 160.0,
        totalCostBasis: 16000.0,
        acquisitionDate: '2023-08-01', // More than 30 days before sale
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId,
        createdAt: '2023-08-01T10:00:00Z',
        updatedAt: '2023-08-01T10:00:00Z',
      };

      const sellTransaction = createTransaction({
        id: 'no_wash_tx',
        transactionType: 'sell',
        quantity: 100,
        price: 150.0, // Selling at a loss
        fees: 10.0,
        transactionDate: '2023-11-01',
        settingDate: '2023-11-03',
      });

      const result = await taxLotManager.processTransaction(
        sellTransaction,
        [outsidePeriodLot],
        TaxLotMethod.FIFO
      );

      expect(result.washSaleAnalysis?.hasWashSale).toBe(false);
      expect(result.allocations[0].isWashSale).toBe(false);
    });
  });

  describe('Cost Basis Calculations', () => {
    it('should calculate total cost basis correctly', () => {
      const totalBasis = taxLotManager.calculateTotalCostBasis(sampleLots, 'AAPL');
      expect(totalBasis).toBe(33500.0); // 15000 + 8000 + 10500
    });

    it('should calculate unrealized P&L correctly', () => {
      const currentPrice = 165.0;
      const unrealized = taxLotManager.calculateUnrealizedPnL(sampleLots, 'AAPL', currentPrice);

      expect(unrealized.totalUnrealized).toBeCloseTo(3625); // (165-150)*100 + (165-160)*50 + (165-140)*75
      expect(unrealized.lots).toHaveLength(3);
    });

    it('should differentiate short-term and long-term unrealized gains', () => {
      // Mock current date to be after some lots qualify for long-term
      const mockDate = new Date('2024-03-15'); // More than 1 year after lot_1
      vi.setSystemTime(mockDate);

      const currentPrice = 170.0;
      const unrealized = taxLotManager.calculateUnrealizedPnL(sampleLots, 'AAPL', currentPrice);

      // lot_1 should be long-term (acquired 2023-01-15, more than 365 days ago)
      const lot1Unrealized = unrealized.lots.find(
        lot => sampleLots.find(l => l.id === lot.lotId)?.acquisitionDate === '2023-01-15'
      );
      expect(lot1Unrealized?.isLongTerm).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('Holding Period Calculations', () => {
    it('should calculate holding periods correctly', () => {
      // Use the private method via bracket access for testing
      const manager = taxLotManager as unknown as Record<string, unknown>;
      const holdingPeriod = (
        manager['calculateHoldingPeriod'] as (start: string, end: string) => number
      )('2023-01-15', '2023-12-01');

      expect(holdingPeriod).toBeCloseTo(320, 5); // Approximately 320 days
    });

    it('should identify long-term vs short-term correctly', async () => {
      const sellTransaction = createTransaction({
        id: 'term_test',
        transactionType: 'sell',
        quantity: 50,
        price: 170.0,
        fees: 5.0,
        transactionDate: '2024-02-01', // More than 365 days after lot_1 acquisition
        settingDate: '2024-02-03',
      });

      const result = await taxLotManager.processTransaction(
        sellTransaction,
        sampleLots,
        TaxLotMethod.FIFO
      );

      expect(result.allocations[0].isLongTerm).toBe(true);
      expect(result.allocations[0].holdingPeriod).toBeGreaterThan(365);
    });
  });

  describe('Tax Optimization Recommendations', () => {
    it('should recommend tax loss harvesting for losing positions', () => {
      const currentPrice = 130.0; // Below all cost bases
      const recommendations = taxLotManager.generateTaxOptimizations(
        sampleLots,
        'AAPL',
        currentPrice
      );

      const lossHarvestRec = recommendations.find(rec => rec.strategy === 'tax_loss_harvest');
      expect(lossHarvestRec).toBeDefined();
      expect(lossHarvestRec?.potentialSavings).toBeGreaterThan(0);
      expect(lossHarvestRec?.recommendedActions).toContain(
        'Wait 31 days before repurchasing to avoid wash sale rules'
      );
    });

    it('should recommend long-term holding for near long-term positions', () => {
      // Mock current date to be exactly 11 months after acquisition
      const mockDate = new Date('2024-02-01'); // 11 months after 2023-03-01
      vi.setSystemTime(mockDate);

      // Create a lot that's close to long-term status
      const nearLongTermLot: TaxLot = {
        id: 'near_long_term',
        symbol: 'AAPL',
        quantity: 100,
        costBasisPerShare: 150.0,
        totalCostBasis: 15000.0,
        acquisitionDate: '2023-03-01', // About 11 months ago from mocked date
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId,
        createdAt: '2023-03-01T10:00:00Z',
        updatedAt: '2023-03-01T10:00:00Z',
      };

      const currentPrice = 180.0; // Profitable position
      const recommendations = taxLotManager.generateTaxOptimizations(
        [nearLongTermLot],
        'AAPL',
        currentPrice
      );

      const longTermRec = recommendations.find(rec => rec.strategy === 'long_term_gains');
      expect(longTermRec).toBeDefined();
      expect(longTermRec?.potentialSavings).toBeGreaterThan(0);

      // Reset the system time
      vi.useRealTimers();
      vi.useFakeTimers();
    });

    it('should provide appropriate risk factors in recommendations', () => {
      const currentPrice = 120.0; // Loss position
      const recommendations = taxLotManager.generateTaxOptimizations(
        sampleLots,
        'AAPL',
        currentPrice
      );

      const lossHarvestRec = recommendations.find(rec => rec.strategy === 'tax_loss_harvest');
      expect(lossHarvestRec?.riskFactors).toContain(
        'Missing potential recovery during wash sale period'
      );
      expect(lossHarvestRec?.riskFactors).toContain('Transaction costs may reduce benefits');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty lot arrays', () => {
      const totalBasis = taxLotManager.calculateTotalCostBasis([], 'AAPL');
      expect(totalBasis).toBe(0);

      const unrealized = taxLotManager.calculateUnrealizedPnL([], 'AAPL', 100);
      expect(unrealized.totalUnrealized).toBe(0);
      expect(unrealized.lots).toHaveLength(0);
    });

    it('should handle zero quantity transactions', async () => {
      const zeroTransaction = createTransaction({
        id: 'zero_tx',
        quantity: 0,
        price: 150.0,
        fees: 0,
      });

      const result = await taxLotManager.processTransaction(zeroTransaction, []);
      expect(result.newLots[0].quantity).toBe(0);
      expect(result.newLots[0].totalCostBasis).toBe(0);
    });

    it('should handle lots with zero cost basis', () => {
      const freeLot: TaxLot = {
        id: 'free_lot',
        symbol: 'FREE',
        quantity: 100,
        costBasisPerShare: 0,
        totalCostBasis: 0,
        acquisitionDate: '2023-01-15',
        isOpen: true,
        washSaleStatus: WashSaleStatus.NONE,
        washSaleAdjustment: 0,
        portfolioId,
        createdAt: '2023-01-15T10:00:00Z',
        updatedAt: '2023-01-15T10:00:00Z',
      };

      const unrealized = taxLotManager.calculateUnrealizedPnL([freeLot], 'FREE', 10);
      expect(unrealized.totalUnrealized).toBe(1000); // 100 shares * $10 gain
    });
  });
});
