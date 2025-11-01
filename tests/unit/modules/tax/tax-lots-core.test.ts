/**
 * Tax Lot Management System Tests - Core Functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaxLotManager, TaxLotMethod, WashSaleStatus } from '../../../../src/modules/tax/tax-lots';
import type { TaxLot, TaxTransaction } from '../../../../src/modules/tax/tax-lots';

describe('Tax Lot Management System', () => {
  let taxLotManager: TaxLotManager;
  let portfolioId: string;

  // Helper function to create complete transactions
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

  // Helper to create tax lots
  const createLot = (overrides: Partial<TaxLot>): TaxLot => ({
    id: 'lot_default',
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
    ...overrides,
  });

  beforeEach(() => {
    taxLotManager = new TaxLotManager();
    portfolioId = 'portfolio_123';
  });

  describe('Acquisition Processing', () => {
    it('should create new tax lots for buy transactions', async () => {
      const buyTransaction = createTransaction({
        id: 'buy_tx',
        transactionType: 'buy',
        quantity: 100,
        price: 155.0,
        fees: 10.0,
      });

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
        id: 'assign_tx',
        transactionType: 'assignment',
        quantity: 100,
        price: 150.0,
        fees: 5.0,
      });

      const result = await taxLotManager.processTransaction(assignmentTransaction, []);

      expect(result.newLots).toHaveLength(1);
      expect(result.newLots[0].costBasisPerShare).toBe(150.05);
    });
  });

  describe('Disposal Processing - FIFO Method', () => {
    it('should process FIFO disposals correctly', async () => {
      const existingLots = [
        createLot({
          id: 'lot_1',
          quantity: 100,
          costBasisPerShare: 150.0,
          acquisitionDate: '2023-01-15',
        }),
        createLot({
          id: 'lot_2',
          quantity: 50,
          costBasisPerShare: 160.0,
          acquisitionDate: '2023-03-10',
        }),
      ];

      const sellTransaction = createTransaction({
        id: 'sell_tx',
        transactionType: 'sell',
        quantity: 75,
        price: 170.0,
        fees: 7.5,
      });

      const result = await taxLotManager.processTransaction(
        sellTransaction,
        existingLots,
        TaxLotMethod.FIFO
      );

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].quantityAllocated).toBe(75);
      expect(result.allocations[0].costBasisPerShare).toBe(150.0); // First lot (FIFO)
      expect(result.allocations[0].realizedGainLoss).toBeCloseTo(1492.5); // (170 * 75) - (150 * 75) - 7.50

      // Check lot was updated
      const updatedLot = result.updatedLots.find(lot => lot.id === 'lot_1');
      expect(updatedLot?.quantity).toBe(25); // 100 - 75
      expect(updatedLot?.isOpen).toBe(true);
    });

    it('should handle partial disposals across multiple lots', async () => {
      const existingLots = [
        createLot({
          id: 'lot_1',
          quantity: 100,
          costBasisPerShare: 150.0,
          acquisitionDate: '2023-01-15',
        }),
        createLot({
          id: 'lot_2',
          quantity: 50,
          costBasisPerShare: 160.0,
          acquisitionDate: '2023-03-10',
        }),
      ];

      const sellTransaction = createTransaction({
        id: 'sell_big',
        transactionType: 'sell',
        quantity: 125, // More than first lot
        price: 175.0,
        fees: 12.5,
      });

      const result = await taxLotManager.processTransaction(
        sellTransaction,
        existingLots,
        TaxLotMethod.FIFO
      );

      expect(result.allocations).toHaveLength(2);

      // First allocation - full lot_1
      expect(result.allocations[0].quantityAllocated).toBe(100);
      expect(result.allocations[0].costBasisPerShare).toBe(150.0);

      // Second allocation - partial lot_2
      expect(result.allocations[1].quantityAllocated).toBe(25);
      expect(result.allocations[1].costBasisPerShare).toBe(160.0);
    });
  });

  describe('Tax Lot Methods', () => {
    it('should process LIFO disposals correctly', async () => {
      const existingLots = [
        createLot({
          id: 'lot_1',
          quantity: 100,
          costBasisPerShare: 150.0,
          acquisitionDate: '2023-01-15',
        }),
        createLot({
          id: 'lot_2',
          quantity: 75,
          costBasisPerShare: 140.0,
          acquisitionDate: '2023-06-20', // Most recent
        }),
      ];

      const sellTransaction = createTransaction({
        id: 'sell_lifo',
        transactionType: 'sell',
        quantity: 50,
        price: 165.0,
        fees: 5.0,
      });

      const result = await taxLotManager.processTransaction(
        sellTransaction,
        existingLots,
        TaxLotMethod.LIFO
      );

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].costBasisPerShare).toBe(140.0); // Most recent lot (LIFO)
    });

    it('should process HIFO disposals correctly', async () => {
      const existingLots = [
        createLot({
          id: 'lot_1',
          quantity: 100,
          costBasisPerShare: 150.0,
          acquisitionDate: '2023-01-15',
        }),
        createLot({
          id: 'lot_2',
          quantity: 50,
          costBasisPerShare: 160.0, // Highest cost
          acquisitionDate: '2023-03-10',
        }),
      ];

      const sellTransaction = createTransaction({
        id: 'sell_hifo',
        transactionType: 'sell',
        quantity: 40,
        price: 155.0,
        fees: 4.0,
      });

      const result = await taxLotManager.processTransaction(
        sellTransaction,
        existingLots,
        TaxLotMethod.HIFO
      );

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].costBasisPerShare).toBe(160.0); // Highest cost lot
    });
  });

  describe('Cost Basis Calculations', () => {
    it('should calculate total cost basis correctly', () => {
      const lots = [
        createLot({
          id: 'lot_1',
          totalCostBasis: 15000.0,
        }),
        createLot({
          id: 'lot_2',
          totalCostBasis: 8000.0,
        }),
        createLot({
          id: 'lot_3',
          totalCostBasis: 10500.0,
        }),
      ];

      const totalBasis = taxLotManager.calculateTotalCostBasis(lots, 'AAPL');
      expect(totalBasis).toBe(33500.0);
    });

    it('should calculate unrealized P&L correctly', () => {
      const lots = [
        createLot({
          id: 'lot_1',
          quantity: 100,
          costBasisPerShare: 150.0,
        }),
        createLot({
          id: 'lot_2',
          quantity: 50,
          costBasisPerShare: 160.0,
        }),
      ];

      const currentPrice = 165.0;
      const unrealized = taxLotManager.calculateUnrealizedPnL(lots, 'AAPL', currentPrice);

      // (165-150)*100 + (165-160)*50 = 1500 + 250 = 1750
      expect(unrealized.totalUnrealized).toBeCloseTo(1750);
      expect(unrealized.lots).toHaveLength(2);
    });
  });

  describe('Wash Sale Detection', () => {
    it('should detect wash sales for losses within 30-day period', async () => {
      const lossLot = createLot({
        id: 'loss_lot',
        quantity: 100,
        costBasisPerShare: 180.0,
        acquisitionDate: '2023-10-01',
      });

      const repurchaseLot = createLot({
        id: 'repurchase_lot',
        quantity: 50,
        costBasisPerShare: 160.0,
        acquisitionDate: '2023-11-15', // Within 30 days of sale
      });

      const sellTransaction = createTransaction({
        id: 'wash_sale_tx',
        transactionType: 'sell',
        quantity: 100,
        price: 150.0, // Loss transaction
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
      const gainLot = createLot({
        id: 'gain_lot',
        quantity: 50,
        costBasisPerShare: 150.0,
        acquisitionDate: '2023-10-01',
      });

      const gainTransaction = createTransaction({
        id: 'gain_tx',
        transactionType: 'sell',
        quantity: 50,
        price: 180.0, // Gain transaction
        fees: 5.0,
      });

      const result = await taxLotManager.processTransaction(
        gainTransaction,
        [gainLot],
        TaxLotMethod.FIFO
      );

      expect(result.washSaleAnalysis?.hasWashSale).toBe(false);
      expect(result.allocations[0].isWashSale).toBe(false);
    });
  });

  describe('Tax Optimization Recommendations', () => {
    it('should recommend tax loss harvesting for losing positions', () => {
      const losingLots = [
        createLot({
          id: 'loss_lot_1',
          quantity: 100,
          costBasisPerShare: 180.0,
        }),
        createLot({
          id: 'loss_lot_2',
          quantity: 50,
          costBasisPerShare: 170.0,
        }),
      ];

      const currentPrice = 130.0; // Below all cost bases
      const recommendations = taxLotManager.generateTaxOptimizations(
        losingLots,
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

    it('should provide risk factors in recommendations', () => {
      const lots = [
        createLot({
          quantity: 100,
          costBasisPerShare: 160.0,
        }),
      ];

      const currentPrice = 120.0; // Loss position
      const recommendations = taxLotManager.generateTaxOptimizations(lots, 'AAPL', currentPrice);

      const lossHarvestRec = recommendations.find(rec => rec.strategy === 'tax_loss_harvest');
      expect(lossHarvestRec?.riskFactors).toContain(
        'Missing potential recovery during wash sale period'
      );
      expect(lossHarvestRec?.riskFactors).toContain('Transaction costs may reduce benefits');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for insufficient lots', async () => {
      const smallLots = [
        createLot({
          quantity: 50,
          costBasisPerShare: 150.0,
        }),
      ];

      const bigSellTransaction = createTransaction({
        id: 'big_sell',
        transactionType: 'sell',
        quantity: 100, // More than available
        price: 170.0,
      });

      await expect(
        taxLotManager.processTransaction(bigSellTransaction, smallLots, TaxLotMethod.FIFO)
      ).rejects.toThrow('Insufficient lots to cover disposal quantity');
    });

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
  });

  describe('Holding Period Calculations', () => {
    it('should calculate holding periods correctly', async () => {
      const lot = createLot({
        acquisitionDate: '2023-01-15',
      });

      const sellTransaction = createTransaction({
        transactionType: 'sell',
        quantity: 50,
        transactionDate: '2023-12-01',
        settingDate: '2023-12-03',
      });

      const result = await taxLotManager.processTransaction(
        sellTransaction,
        [lot],
        TaxLotMethod.FIFO
      );

      expect(result.allocations[0].holdingPeriod).toBeGreaterThan(300);
      expect(result.allocations[0].holdingPeriod).toBeLessThan(400);
    });

    it('should identify long-term vs short-term correctly', async () => {
      const oldLot = createLot({
        acquisitionDate: '2022-01-15', // More than 365 days ago
      });

      const sellTransaction = createTransaction({
        transactionType: 'sell',
        quantity: 50,
        transactionDate: '2024-01-01', // More than 1 year later
        settingDate: '2024-01-03',
      });

      const result = await taxLotManager.processTransaction(
        sellTransaction,
        [oldLot],
        TaxLotMethod.FIFO
      );

      expect(result.allocations[0].isLongTerm).toBe(true);
      expect(result.allocations[0].holdingPeriod).toBeGreaterThan(365);
    });
  });
});
