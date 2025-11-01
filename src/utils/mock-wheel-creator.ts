/**
 * Mock Wheel Cycle Creator
 *
 * Creates sample wheel cycles when trades are imported
 * This is a temporary solution until the full wheel analysis service is implemented
 */

import type { SQLiteDatabase } from '@/modules/db/sqlite';
import { WheelDAO } from '@/modules/db/wheel-dao';
import { WheelState } from '@/modules/wheel/lifecycle';
import { TradeDAO } from '@/modules/db/trade-dao';
import { SymbolDAO } from '@/modules/db/symbol-dao';

export interface MockWheelResult {
  cyclesCreated: number;
  errors: string[];
}

/**
 * Create mock wheel cycles based on imported trades
 */
export async function createMockWheelCycles(db: SQLiteDatabase): Promise<MockWheelResult> {
  const result: MockWheelResult = {
    cyclesCreated: 0,
    errors: [],
  };

  try {
    const tradeDAO = new TradeDAO(db);
    const wheelDAO = new WheelDAO(db);
    const symbolDAO = new SymbolDAO(db);

    // Get all trades to analyze
    const tradesResult = await tradeDAO.findAll({});
    if (!tradesResult.success || !tradesResult.data || tradesResult.data.length === 0) {
      console.log('ℹ️ No trades found to create wheel cycles from');
      return result;
    }

    const trades = tradesResult.data;
    console.log(`🔍 Analyzing ${trades.length} trades for wheel cycle creation...`);

    // Get unique symbols from trades
    const symbols = new Set<string>();
    const symbolIds = new Map<string, number>();

    // First, get all symbols from the database
    const symbolsResult = await symbolDAO.findAll({});
    if (symbolsResult.success && symbolsResult.data) {
      for (const symbol of symbolsResult.data) {
        symbols.add(symbol.symbol);
        symbolIds.set(symbol.symbol, symbol.id!);
      }
    }

    console.log(`📊 Found ${symbols.size} unique symbols: ${Array.from(symbols).join(', ')}`);

    // Create mock wheel cycles for each symbol that has option trades
    const optionSymbols = Array.from(symbols).filter(symbol => {
      return trades.some(
        trade =>
          symbolIds.has(symbol) && trade.symbol_id === symbolIds.get(symbol) && trade.option_type
      );
    });

    console.log(`🎡 Creating wheel cycles for option symbols: ${optionSymbols.join(', ')}`);

    // Create wheel cycles for each option symbol
    for (const symbol of optionSymbols) {
      try {
        const symbolId = symbolIds.get(symbol)!;
        const symbolTrades = trades.filter(
          trade => trade.symbol_id === symbolId && trade.option_type
        );

        if (symbolTrades.length === 0) continue;

        // Generate a lifecycle ID
        const firstTradeDate = symbolTrades.sort(
          (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
        )[0].trade_date;

        const lifecycleId = `${symbol}_${firstTradeDate}_001`;

        // Create wheel cycle with realistic data based on trades
        const totalPremium = symbolTrades
          .filter(trade => trade.action === 'SELL_TO_OPEN')
          .reduce((sum, trade) => sum + trade.price * trade.quantity * 100, 0);

        const wheelCycle = {
          lifecycle_id: lifecycleId,
          portfolio_id: 1, // Default portfolio
          symbol_id: symbolId,
          underlying_symbol: symbol,
          status: WheelState.CSP_OPEN,
          total_net_credit: totalPremium,
          cost_basis: undefined,
          shares_owned: undefined,
          csp_trade_ids: JSON.stringify(
            symbolTrades
              .filter(trade => trade.option_type === 'PUT' && trade.action === 'SELL_TO_OPEN')
              .map(trade => trade.id!)
              .filter(id => id !== undefined)
          ),
          cc_trade_ids: JSON.stringify(
            symbolTrades
              .filter(trade => trade.option_type === 'CALL' && trade.action === 'SELL_TO_OPEN')
              .map(trade => trade.id!)
              .filter(id => id !== undefined)
          ),
          stock_trade_ids: JSON.stringify([]),
          total_premium_collected: Math.max(0, totalPremium),
          realized_pnl: undefined,
          unrealized_pnl: totalPremium * 0.1, // Mock 10% unrealized gain
          days_active: Math.floor(
            (Date.now() - new Date(firstTradeDate).getTime()) / (24 * 60 * 60 * 1000)
          ),
          annualized_return: totalPremium > 0 ? 0.15 + Math.random() * 0.1 : undefined, // Mock 15-25% return
        };

        const createResult = await wheelDAO.create(wheelCycle);
        if (createResult.success) {
          result.cyclesCreated++;
          console.log(`✅ Created wheel cycle for ${symbol}: ${lifecycleId}`);
        } else {
          result.errors.push(`Failed to create wheel cycle for ${symbol}: ${createResult.error}`);
          console.error(`❌ Failed to create wheel cycle for ${symbol}:`, createResult.error);
        }
      } catch (error) {
        const errorMsg = `Error creating wheel cycle for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    console.log(
      `🎡 Wheel cycle creation complete: ${result.cyclesCreated} cycles created, ${result.errors.length} errors`
    );
    return result;
  } catch (error) {
    const errorMsg = `Mock wheel cycle creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error('❌', errorMsg);
    return result;
  }
}
