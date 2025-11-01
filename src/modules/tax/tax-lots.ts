/**
 * Tax Lot Management System
 *
 * Provides sophisticated tax lot tracking with multiple lot methods,
 * wash sale detection, and tax optimization strategies for options trading.
 */

import { z } from 'zod';

// Tax lot method options
export const TaxLotMethod = {
  FIFO: 'fifo', // First In, First Out
  LIFO: 'lifo', // Last In, First Out
  HIFO: 'hifo', // Highest Cost In, First Out
  LOFO: 'lofo', // Lowest Cost In, First Out
  SPECIFIC: 'specific', // Specific Identification
} as const;

export type TaxLotMethod = (typeof TaxLotMethod)[keyof typeof TaxLotMethod];

// Wash sale status
export const WashSaleStatus = {
  NONE: 'none',
  WASH_SALE: 'wash_sale',
  POTENTIAL: 'potential',
} as const;

export type WashSaleStatus = (typeof WashSaleStatus)[keyof typeof WashSaleStatus];

// Tax lot record schema
export const TaxLotSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  quantity: z.number(),
  costBasisPerShare: z.number(),
  totalCostBasis: z.number(),
  acquisitionDate: z.string(),
  disposalDate: z.string().optional(),
  isOpen: z.boolean(),
  washSaleStatus: z.enum(['none', 'wash_sale', 'potential']),
  washSaleAdjustment: z.number().default(0),
  portfolioId: z.string(),
  tradeId: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaxLot = z.infer<typeof TaxLotSchema>;

// Tax lot transaction record
export const TaxTransactionSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  transactionType: z.enum(['buy', 'sell', 'assignment', 'exercise', 'expiration']),
  quantity: z.number(),
  price: z.number(),
  fees: z.number().default(0),
  transactionDate: z.string(),
  settingDate: z.string(),
  portfolioId: z.string(),
  tradeId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaxTransaction = z.infer<typeof TaxTransactionSchema>;

// Tax lot allocation result
export interface TaxLotAllocation {
  lotId: string;
  symbol: string;
  quantityAllocated: number;
  costBasisPerShare: number;
  totalCostBasis: number;
  acquisitionDate: string;
  disposalDate: string;
  realizedGainLoss: number;
  washSaleAdjustment: number;
  isWashSale: boolean;
  holdingPeriod: number; // days
  isLongTerm: boolean; // >365 days
}

// Wash sale detection result
export interface WashSaleAnalysis {
  hasWashSale: boolean;
  washSaleAmount: number;
  affectedLots: string[];
  washSalePeriodStart: string;
  washSalePeriodEnd: string;
  disallowedLoss: number;
  adjustedCostBasis: number;
}

// Tax optimization recommendation
export interface TaxOptimization {
  strategy: 'tax_loss_harvest' | 'long_term_gains' | 'offset_gains' | 'defer_gains';
  description: string;
  potentialSavings: number;
  recommendedActions: string[];
  riskFactors: string[];
  deadline?: string;
}

export class TaxLotManager {
  private defaultMethod: TaxLotMethod;

  constructor(defaultMethod: TaxLotMethod = TaxLotMethod.FIFO) {
    this.defaultMethod = defaultMethod;
  }

  /**
   * Process a new transaction and update tax lots
   */
  async processTransaction(
    transaction: TaxTransaction,
    existingLots: TaxLot[],
    method?: TaxLotMethod
  ): Promise<{
    updatedLots: TaxLot[];
    newLots: TaxLot[];
    allocations: TaxLotAllocation[];
    washSaleAnalysis?: WashSaleAnalysis;
  }> {
    const lotMethod = method || this.defaultMethod;

    if (transaction.transactionType === 'buy' || transaction.transactionType === 'assignment') {
      return this.processAcquisition(transaction, existingLots);
    } else {
      return this.processDisposal(transaction, existingLots, lotMethod);
    }
  }

  /**
   * Process acquisition (buy/assignment) - creates new tax lots
   */
  private async processAcquisition(
    transaction: TaxTransaction,
    existingLots: TaxLot[]
  ): Promise<{
    updatedLots: TaxLot[];
    newLots: TaxLot[];
    allocations: TaxLotAllocation[];
  }> {
    const costBasisPerShare =
      transaction.quantity === 0
        ? 0
        : transaction.price + transaction.fees / Math.abs(transaction.quantity);

    const newLot: TaxLot = {
      id: `lot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: transaction.symbol,
      quantity: Math.abs(transaction.quantity),
      costBasisPerShare,
      totalCostBasis: Math.abs(transaction.quantity) * costBasisPerShare,
      acquisitionDate: transaction.settingDate,
      isOpen: true,
      washSaleStatus: WashSaleStatus.NONE,
      washSaleAdjustment: 0,
      portfolioId: transaction.portfolioId,
      tradeId: transaction.tradeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      updatedLots: existingLots,
      newLots: [newLot],
      allocations: [],
    };
  }

  /**
   * Process disposal (sell/exercise/expiration) - allocates against existing lots
   */
  private async processDisposal(
    transaction: TaxTransaction,
    existingLots: TaxLot[],
    method: TaxLotMethod
  ): Promise<{
    updatedLots: TaxLot[];
    newLots: TaxLot[];
    allocations: TaxLotAllocation[];
    washSaleAnalysis?: WashSaleAnalysis;
  }> {
    const openLots = existingLots.filter(
      lot => lot.symbol === transaction.symbol && lot.isOpen && lot.quantity > 0
    );

    if (openLots.length === 0) {
      throw new Error(`No open lots available for disposal of ${transaction.symbol}`);
    }

    // Sort lots based on method
    const sortedLots = this.sortLotsByMethod(openLots, method);

    let remainingQuantity = Math.abs(transaction.quantity);
    const allocations: TaxLotAllocation[] = [];
    const updatedLots = [...existingLots];

    // Allocate against sorted lots
    for (const lot of sortedLots) {
      if (remainingQuantity <= 0) break;

      const quantityToAllocate = Math.min(remainingQuantity, lot.quantity);
      const holdingPeriod = this.calculateHoldingPeriod(
        lot.acquisitionDate,
        transaction.settingDate
      );
      const realizedGainLoss =
        transaction.price * quantityToAllocate -
        lot.costBasisPerShare * quantityToAllocate -
        transaction.fees * (quantityToAllocate / Math.abs(transaction.quantity));

      const allocation: TaxLotAllocation = {
        lotId: lot.id,
        symbol: lot.symbol,
        quantityAllocated: quantityToAllocate,
        costBasisPerShare: lot.costBasisPerShare,
        totalCostBasis: lot.costBasisPerShare * quantityToAllocate,
        acquisitionDate: lot.acquisitionDate,
        disposalDate: transaction.settingDate,
        realizedGainLoss,
        washSaleAdjustment: 0,
        isWashSale: false,
        holdingPeriod,
        isLongTerm: holdingPeriod > 365,
      };

      allocations.push(allocation);

      // Update lot quantity
      const lotIndex = updatedLots.findIndex(l => l.id === lot.id);
      if (lotIndex !== -1) {
        updatedLots[lotIndex] = {
          ...updatedLots[lotIndex],
          quantity: lot.quantity - quantityToAllocate,
          isOpen: lot.quantity - quantityToAllocate > 0,
          updatedAt: new Date().toISOString(),
        };
      }

      remainingQuantity -= quantityToAllocate;
    }

    if (remainingQuantity > 0) {
      throw new Error(
        `Insufficient lots to cover disposal quantity. Missing: ${remainingQuantity} shares`
      );
    }

    // Check for wash sales
    const washSaleAnalysis = await this.analyzeWashSales(transaction, allocations, existingLots);

    // Apply wash sale adjustments
    if (washSaleAnalysis.hasWashSale) {
      this.applyWashSaleAdjustments(allocations, washSaleAnalysis, updatedLots);
    }

    return {
      updatedLots,
      newLots: [],
      allocations,
      washSaleAnalysis,
    };
  }

  /**
   * Sort lots based on the specified method
   */
  private sortLotsByMethod(lots: TaxLot[], method: TaxLotMethod): TaxLot[] {
    switch (method) {
      case TaxLotMethod.FIFO:
        return [...lots].sort(
          (a, b) => new Date(a.acquisitionDate).getTime() - new Date(b.acquisitionDate).getTime()
        );

      case TaxLotMethod.LIFO:
        return [...lots].sort(
          (a, b) => new Date(b.acquisitionDate).getTime() - new Date(a.acquisitionDate).getTime()
        );

      case TaxLotMethod.HIFO:
        return [...lots].sort((a, b) => b.costBasisPerShare - a.costBasisPerShare);

      case TaxLotMethod.LOFO:
        return [...lots].sort((a, b) => a.costBasisPerShare - b.costBasisPerShare);

      case TaxLotMethod.SPECIFIC:
        // For specific identification, lots should be pre-selected
        return lots;

      default:
        return lots;
    }
  }

  /**
   * Calculate holding period between acquisition and disposal dates
   */
  private calculateHoldingPeriod(acquisitionDate: string, disposalDate: string): number {
    const acquire = new Date(acquisitionDate);
    const dispose = new Date(disposalDate);
    return Math.floor((dispose.getTime() - acquire.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Analyze potential wash sales for a disposal transaction
   */
  private async analyzeWashSales(
    transaction: TaxTransaction,
    allocations: TaxLotAllocation[],
    allLots: TaxLot[]
  ): Promise<WashSaleAnalysis> {
    // Only analyze for loss transactions
    const hasLosses = allocations.some(alloc => alloc.realizedGainLoss < 0);
    if (!hasLosses) {
      return {
        hasWashSale: false,
        washSaleAmount: 0,
        affectedLots: [],
        washSalePeriodStart: transaction.transactionDate,
        washSalePeriodEnd: transaction.transactionDate,
        disallowedLoss: 0,
        adjustedCostBasis: 0,
      };
    }

    const disposalDate = new Date(transaction.transactionDate);
    const washPeriodStart = new Date(disposalDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const washPeriodEnd = new Date(disposalDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Find lots acquired within wash sale period
    const potentialWashLots = allLots.filter(lot => {
      const acqDate = new Date(lot.acquisitionDate);
      return (
        lot.symbol === transaction.symbol &&
        acqDate >= washPeriodStart &&
        acqDate <= washPeriodEnd &&
        lot.id !== allocations[0]?.lotId
      ); // Exclude the lot being sold
    });

    const hasWashSale = potentialWashLots.length > 0;
    const totalLoss = allocations.reduce(
      (sum, alloc) => sum + Math.min(0, alloc.realizedGainLoss),
      0
    );

    return {
      hasWashSale,
      washSaleAmount: hasWashSale ? Math.abs(totalLoss) : 0,
      affectedLots: potentialWashLots.map(lot => lot.id),
      washSalePeriodStart: washPeriodStart.toISOString().split('T')[0],
      washSalePeriodEnd: washPeriodEnd.toISOString().split('T')[0],
      disallowedLoss: hasWashSale ? Math.abs(totalLoss) : 0,
      adjustedCostBasis: 0, // Will be calculated when applying adjustments
    };
  }

  /**
   * Apply wash sale adjustments to allocations and lots
   */
  private applyWashSaleAdjustments(
    allocations: TaxLotAllocation[],
    washSaleAnalysis: WashSaleAnalysis,
    lots: TaxLot[]
  ): void {
    if (!washSaleAnalysis.hasWashSale) return;

    // Mark allocations as wash sales and disallow losses
    allocations.forEach(allocation => {
      if (allocation.realizedGainLoss < 0) {
        allocation.isWashSale = true;
        allocation.washSaleAdjustment = Math.abs(allocation.realizedGainLoss);
        allocation.realizedGainLoss = 0; // Disallow the loss
      }
    });

    // Adjust cost basis of affected lots
    const adjustmentPerLot = washSaleAnalysis.disallowedLoss / washSaleAnalysis.affectedLots.length;

    washSaleAnalysis.affectedLots.forEach(lotId => {
      const lotIndex = lots.findIndex(lot => lot.id === lotId);
      if (lotIndex !== -1) {
        const lot = lots[lotIndex];
        const newCostBasisPerShare = lot.costBasisPerShare + adjustmentPerLot / lot.quantity;

        lots[lotIndex] = {
          ...lot,
          costBasisPerShare: newCostBasisPerShare,
          totalCostBasis: newCostBasisPerShare * lot.quantity,
          washSaleStatus: WashSaleStatus.WASH_SALE,
          washSaleAdjustment: adjustmentPerLot,
          updatedAt: new Date().toISOString(),
        };
      }
    });
  }

  /**
   * Calculate total cost basis for a position
   */
  calculateTotalCostBasis(lots: TaxLot[], symbol: string): number {
    return lots
      .filter(lot => lot.symbol === symbol && lot.isOpen)
      .reduce((total, lot) => total + lot.totalCostBasis, 0);
  }

  /**
   * Calculate unrealized gains/losses for open lots
   */
  calculateUnrealizedPnL(
    lots: TaxLot[],
    symbol: string,
    currentPrice: number
  ): {
    totalUnrealized: number;
    shortTermUnrealized: number;
    longTermUnrealized: number;
    lots: Array<{ lotId: string; unrealizedPnL: number; isLongTerm: boolean }>;
  } {
    const openLots = lots.filter(lot => lot.symbol === symbol && lot.isOpen);
    const currentDate = new Date().toISOString().split('T')[0];

    const lotPnLs = openLots.map(lot => {
      const holdingPeriod = this.calculateHoldingPeriod(lot.acquisitionDate, currentDate);
      const unrealizedPnL = (currentPrice - lot.costBasisPerShare) * lot.quantity;

      return {
        lotId: lot.id,
        unrealizedPnL,
        isLongTerm: holdingPeriod > 365,
      };
    });

    const shortTermUnrealized = lotPnLs
      .filter(item => !item.isLongTerm)
      .reduce((sum, item) => sum + item.unrealizedPnL, 0);

    const longTermUnrealized = lotPnLs
      .filter(item => item.isLongTerm)
      .reduce((sum, item) => sum + item.unrealizedPnL, 0);

    return {
      totalUnrealized: shortTermUnrealized + longTermUnrealized,
      shortTermUnrealized,
      longTermUnrealized,
      lots: lotPnLs,
    };
  }

  /**
   * Generate tax optimization recommendations
   */
  generateTaxOptimizations(
    lots: TaxLot[],
    symbol: string,
    currentPrice: number,
    targetDate?: string
  ): TaxOptimization[] {
    const recommendations: TaxOptimization[] = [];
    const unrealizedPnL = this.calculateUnrealizedPnL(lots, symbol, currentPrice);
    const yearEnd = targetDate || `${new Date().getFullYear()}-12-31`;

    // Tax loss harvesting opportunity
    if (unrealizedPnL.totalUnrealized < 0) {
      recommendations.push({
        strategy: 'tax_loss_harvest',
        description: 'Harvest tax losses to offset capital gains',
        potentialSavings: Math.abs(unrealizedPnL.totalUnrealized) * 0.2, // Assume 20% tax rate
        recommendedActions: [
          `Sell ${symbol} position to realize ${unrealizedPnL.totalUnrealized.toFixed(2)} loss`,
          'Wait 31 days before repurchasing to avoid wash sale rules',
          'Consider similar securities as temporary replacement',
        ],
        riskFactors: [
          'Missing potential recovery during wash sale period',
          'Transaction costs may reduce benefits',
          'Alternative investments may have different risk profiles',
        ],
        deadline: yearEnd,
      });
    }

    // Long-term vs short-term timing
    const shortTermGains = unrealizedPnL.shortTermUnrealized;
    if (shortTermGains > 0) {
      const shortTermLots = lots.filter(lot => {
        const holdingPeriod = this.calculateHoldingPeriod(
          lot.acquisitionDate,
          new Date().toISOString().split('T')[0]
        );
        return lot.symbol === symbol && lot.isOpen && holdingPeriod <= 365;
      });

      if (shortTermLots.length > 0) {
        const nearLongTerm = shortTermLots.filter(lot => {
          const holdingPeriod = this.calculateHoldingPeriod(
            lot.acquisitionDate,
            new Date().toISOString().split('T')[0]
          );
          return holdingPeriod > 300; // Within 65 days of long-term
        });

        if (nearLongTerm.length > 0) {
          recommendations.push({
            strategy: 'long_term_gains',
            description: 'Defer sale to qualify for long-term capital gains treatment',
            potentialSavings: shortTermGains * 0.15, // Difference between short-term and long-term rates
            recommendedActions: [
              `Hold ${symbol} position for ${365 - this.calculateHoldingPeriod(nearLongTerm[0].acquisitionDate, new Date().toISOString().split('T')[0])} more days`,
              'Monitor position for significant price changes',
              'Consider protective strategies if needed',
            ],
            riskFactors: [
              'Market risk during holding period',
              'Opportunity cost of capital',
              'Potential for losses while waiting',
            ],
          });
        }
      }
    }

    return recommendations;
  }
}

export default TaxLotManager;
