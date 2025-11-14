/**
 * Data Access Objects Index
 * Exports all DAO classes and related types
 */

export { BaseDAO, type BatchResult, type DAOOptions } from './dao-base';
export { PortfolioDAO } from './portfolio-dao';
export { SymbolDAO } from './symbol-dao';
export { type SymbolEvent, SymbolEventDAO } from './symbol-event-dao';
export { type DatabaseTrade, TradeDAO } from './trade-dao';
export {
  type WheelCycleFilters,
  type WheelCycleSummary,
  WheelDAO,
  WheelEventDAO,
} from './wheel-dao';

/**
 * DAO Factory for creating DAO instances
 */
import { PortfolioDAO } from './portfolio-dao';
import type { SQLiteDatabase } from './sqlite';
import { SymbolDAO } from './symbol-dao';
import { SymbolEventDAO } from './symbol-event-dao';
import { TradeDAO } from './trade-dao';
import { WheelDAO, WheelEventDAO } from './wheel-dao';

export class DAOFactory {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  createPortfolioDAO(): PortfolioDAO {
    return new PortfolioDAO(this.db);
  }

  createSymbolDAO(): SymbolDAO {
    return new SymbolDAO(this.db);
  }

  createSymbolEventDAO(): SymbolEventDAO {
    return new SymbolEventDAO(this.db);
  }

  createWheelDAO(): WheelDAO {
    return new WheelDAO(this.db);
  }

  createWheelEventDAO(): WheelEventDAO {
    return new WheelEventDAO(this.db);
  }

  createTradeDAO(): TradeDAO {
    return new TradeDAO(this.db);
  }
}

/**
 * Helper function to create all DAOs at once
 */
export function createDAOs(db: SQLiteDatabase) {
  const factory = new DAOFactory(db);

  return {
    portfolio: factory.createPortfolioDAO(),
    symbol: factory.createSymbolDAO(),
    symbolEvent: factory.createSymbolEventDAO(),
    trade: factory.createTradeDAO(),
    wheel: factory.createWheelDAO(),
    wheelEvent: factory.createWheelEventDAO(),
  };
}
