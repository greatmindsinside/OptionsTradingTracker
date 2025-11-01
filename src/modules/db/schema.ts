/**
 * Database Schema Definition
 *
 * Defines the complete database schema for the Options Trading Tracker
 * Including all tables, indexes, and relationships
 */

export interface DatabaseSchema {
  version: number;
  tables: TableDefinition[];
  indexes: IndexDefinition[];
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  constraints?: string[];
}

export interface ColumnDefinition {
  name: string;
  type: 'INTEGER' | 'REAL' | 'TEXT' | 'BLOB' | 'NULL';
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  defaultValue?: string | number | null;
  foreignKey?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  };
}

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
}

/**
 * Complete database schema for Options Trading Tracker v1.0
 */
export const SCHEMA_V1: DatabaseSchema = {
  version: 1,
  tables: [
    // Portfolios - Top-level containers for trading accounts
    {
      name: 'portfolios',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        { name: 'name', type: 'TEXT', nullable: false },
        { name: 'broker', type: 'TEXT', nullable: false }, // td_ameritrade, schwab, robinhood, etc.
        { name: 'account_number', type: 'TEXT', nullable: true },
        { name: 'account_type', type: 'TEXT', nullable: false }, // cash, margin, ira, roth_ira, etc.
        { name: 'description', type: 'TEXT', nullable: true },
        { name: 'created_at', type: 'TEXT', nullable: false },
        { name: 'updated_at', type: 'TEXT', nullable: false },
        { name: 'is_active', type: 'INTEGER', nullable: false, defaultValue: 1 }, // boolean
      ],
      constraints: ['UNIQUE(broker, account_number)'],
    },

    // Symbols - Stock/ETF/Index symbols and their metadata
    {
      name: 'symbols',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        { name: 'symbol', type: 'TEXT', nullable: false, unique: true },
        { name: 'name', type: 'TEXT', nullable: true },
        { name: 'exchange', type: 'TEXT', nullable: true },
        { name: 'asset_type', type: 'TEXT', nullable: false }, // stock, etf, index, etc.
        { name: 'sector', type: 'TEXT', nullable: true },
        { name: 'industry', type: 'TEXT', nullable: true },
        { name: 'created_at', type: 'TEXT', nullable: false },
        { name: 'updated_at', type: 'TEXT', nullable: false },
      ],
    },

    // Trades - Individual trade transactions
    {
      name: 'trades',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        {
          name: 'portfolio_id',
          type: 'INTEGER',
          nullable: false,
          foreignKey: { table: 'portfolios', column: 'id', onDelete: 'CASCADE' },
        },
        {
          name: 'symbol_id',
          type: 'INTEGER',
          nullable: false,
          foreignKey: { table: 'symbols', column: 'id' },
        },
        { name: 'trade_date', type: 'TEXT', nullable: false }, // ISO date string
        { name: 'settlement_date', type: 'TEXT', nullable: true }, // ISO date string

        // Trade identification
        { name: 'order_id', type: 'TEXT', nullable: true }, // Broker order ID
        { name: 'execution_id', type: 'TEXT', nullable: true }, // Broker execution ID

        // Trade details
        { name: 'action', type: 'TEXT', nullable: false }, // BUY_TO_OPEN, SELL_TO_CLOSE, etc.
        { name: 'instrument_type', type: 'TEXT', nullable: false }, // OPTION, STOCK, ETF
        { name: 'quantity', type: 'INTEGER', nullable: false },
        { name: 'price', type: 'REAL', nullable: false },
        { name: 'fees', type: 'REAL', nullable: false, defaultValue: 0 },
        { name: 'commissions', type: 'REAL', nullable: false, defaultValue: 0 },

        // Options-specific fields
        { name: 'option_type', type: 'TEXT', nullable: true }, // CALL, PUT
        { name: 'strike_price', type: 'REAL', nullable: true },
        { name: 'expiration_date', type: 'TEXT', nullable: true }, // ISO date string
        { name: 'multiplier', type: 'INTEGER', nullable: true, defaultValue: 100 },

        // Trade context
        {
          name: 'strategy_id',
          type: 'INTEGER',
          nullable: true,
          foreignKey: { table: 'strategies', column: 'id' },
        },
        { name: 'notes', type: 'TEXT', nullable: true },
        { name: 'tags', type: 'TEXT', nullable: true }, // JSON array of tags

        // Metadata
        { name: 'import_source', type: 'TEXT', nullable: true }, // csv_file, manual_entry, api
        { name: 'import_batch_id', type: 'TEXT', nullable: true },
        { name: 'created_at', type: 'TEXT', nullable: false },
        { name: 'updated_at', type: 'TEXT', nullable: false },
      ],
    },

    // Strategies - Trading strategy definitions
    {
      name: 'strategies',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        { name: 'name', type: 'TEXT', nullable: false },
        { name: 'description', type: 'TEXT', nullable: true },
        { name: 'category', type: 'TEXT', nullable: false }, // bullish, bearish, neutral, volatility
        { name: 'max_profit', type: 'TEXT', nullable: true }, // unlimited, limited, description
        { name: 'max_loss', type: 'TEXT', nullable: true }, // unlimited, limited, description
        { name: 'break_even_formula', type: 'TEXT', nullable: true },
        { name: 'is_predefined', type: 'INTEGER', nullable: false, defaultValue: 0 }, // boolean
        { name: 'created_at', type: 'TEXT', nullable: false },
        { name: 'updated_at', type: 'TEXT', nullable: false },
      ],
    },

    // Positions - Current open positions (aggregated view of trades)
    {
      name: 'positions',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        {
          name: 'portfolio_id',
          type: 'INTEGER',
          nullable: false,
          foreignKey: { table: 'portfolios', column: 'id', onDelete: 'CASCADE' },
        },
        {
          name: 'symbol_id',
          type: 'INTEGER',
          nullable: false,
          foreignKey: { table: 'symbols', column: 'id' },
        },
        {
          name: 'strategy_id',
          type: 'INTEGER',
          nullable: true,
          foreignKey: { table: 'strategies', column: 'id' },
        },

        // Position identification
        { name: 'position_key', type: 'TEXT', nullable: false, unique: true }, // Composite key for uniqueness

        // Position details
        { name: 'instrument_type', type: 'TEXT', nullable: false }, // OPTION, STOCK
        { name: 'quantity', type: 'INTEGER', nullable: false },
        { name: 'average_cost', type: 'REAL', nullable: false },
        { name: 'market_value', type: 'REAL', nullable: true },
        { name: 'unrealized_pnl', type: 'REAL', nullable: true },

        // Options-specific fields
        { name: 'option_type', type: 'TEXT', nullable: true }, // CALL, PUT
        { name: 'strike_price', type: 'REAL', nullable: true },
        { name: 'expiration_date', type: 'TEXT', nullable: true },
        { name: 'multiplier', type: 'INTEGER', nullable: true, defaultValue: 100 },

        // Status
        { name: 'status', type: 'TEXT', nullable: false, defaultValue: 'OPEN' }, // OPEN, CLOSED, EXPIRED
        { name: 'opened_at', type: 'TEXT', nullable: false },
        { name: 'closed_at', type: 'TEXT', nullable: true },
        { name: 'last_updated', type: 'TEXT', nullable: false },
      ],
    },

    // Trade_Legs - For multi-leg strategies, links trades together
    {
      name: 'trade_legs',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        { name: 'strategy_execution_id', type: 'TEXT', nullable: false }, // Groups legs together
        {
          name: 'trade_id',
          type: 'INTEGER',
          nullable: false,
          foreignKey: { table: 'trades', column: 'id', onDelete: 'CASCADE' },
        },
        { name: 'leg_number', type: 'INTEGER', nullable: false }, // Order within strategy
        { name: 'leg_type', type: 'TEXT', nullable: false }, // LONG, SHORT
        { name: 'created_at', type: 'TEXT', nullable: false },
      ],
      constraints: ['UNIQUE(strategy_execution_id, leg_number)'],
    },

    // Market_Data - Historical price data for analysis
    {
      name: 'market_data',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        {
          name: 'symbol_id',
          type: 'INTEGER',
          nullable: false,
          foreignKey: { table: 'symbols', column: 'id', onDelete: 'CASCADE' },
        },
        { name: 'date', type: 'TEXT', nullable: false }, // ISO date string
        { name: 'open', type: 'REAL', nullable: true },
        { name: 'high', type: 'REAL', nullable: true },
        { name: 'low', type: 'REAL', nullable: true },
        { name: 'close', type: 'REAL', nullable: false },
        { name: 'volume', type: 'INTEGER', nullable: true },
        { name: 'adjusted_close', type: 'REAL', nullable: true },
        { name: 'dividend_amount', type: 'REAL', nullable: true },
        { name: 'split_ratio', type: 'REAL', nullable: true },
        { name: 'data_source', type: 'TEXT', nullable: true }, // yahoo, alpha_vantage, etc.
        { name: 'created_at', type: 'TEXT', nullable: false },
      ],
      constraints: ['UNIQUE(symbol_id, date)'],
    },

    // Performance_Metrics - Calculated performance metrics
    {
      name: 'performance_metrics',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        {
          name: 'portfolio_id',
          type: 'INTEGER',
          nullable: false,
          foreignKey: { table: 'portfolios', column: 'id', onDelete: 'CASCADE' },
        },
        { name: 'period_start', type: 'TEXT', nullable: false },
        { name: 'period_end', type: 'TEXT', nullable: false },
        { name: 'period_type', type: 'TEXT', nullable: false }, // daily, weekly, monthly, quarterly, yearly

        // Core metrics
        { name: 'total_return', type: 'REAL', nullable: true },
        { name: 'total_return_pct', type: 'REAL', nullable: true },
        { name: 'realized_pnl', type: 'REAL', nullable: true },
        { name: 'unrealized_pnl', type: 'REAL', nullable: true },
        { name: 'fees_paid', type: 'REAL', nullable: true },
        { name: 'commissions_paid', type: 'REAL', nullable: true },

        // Trade statistics
        { name: 'total_trades', type: 'INTEGER', nullable: true },
        { name: 'winning_trades', type: 'INTEGER', nullable: true },
        { name: 'losing_trades', type: 'INTEGER', nullable: true },
        { name: 'win_rate', type: 'REAL', nullable: true },
        { name: 'average_win', type: 'REAL', nullable: true },
        { name: 'average_loss', type: 'REAL', nullable: true },
        { name: 'profit_factor', type: 'REAL', nullable: true },
        { name: 'max_drawdown', type: 'REAL', nullable: true },
        { name: 'sharpe_ratio', type: 'REAL', nullable: true },

        { name: 'calculated_at', type: 'TEXT', nullable: false },
      ],
      constraints: ['UNIQUE(portfolio_id, period_start, period_end, period_type)'],
    },

    // Import_Batches - Track CSV import batches
    {
      name: 'import_batches',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        { name: 'batch_id', type: 'TEXT', nullable: false, unique: true },
        {
          name: 'portfolio_id',
          type: 'INTEGER',
          nullable: false,
          foreignKey: { table: 'portfolios', column: 'id', onDelete: 'CASCADE' },
        },
        { name: 'filename', type: 'TEXT', nullable: false },
        { name: 'file_size', type: 'INTEGER', nullable: false },
        { name: 'file_hash', type: 'TEXT', nullable: false },
        { name: 'broker', type: 'TEXT', nullable: false },
        { name: 'total_records', type: 'INTEGER', nullable: false },
        { name: 'imported_records', type: 'INTEGER', nullable: false },
        { name: 'failed_records', type: 'INTEGER', nullable: false },
        { name: 'status', type: 'TEXT', nullable: false }, // pending, processing, completed, failed
        { name: 'error_log', type: 'TEXT', nullable: true }, // JSON array of errors
        { name: 'started_at', type: 'TEXT', nullable: false },
        { name: 'completed_at', type: 'TEXT', nullable: true },
      ],
    },

    // User_Settings - Application settings and preferences
    {
      name: 'user_settings',
      columns: [
        { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
        { name: 'key', type: 'TEXT', nullable: false, unique: true },
        { name: 'value', type: 'TEXT', nullable: false }, // JSON string
        { name: 'type', type: 'TEXT', nullable: false }, // string, number, boolean, object, array
        { name: 'description', type: 'TEXT', nullable: true },
        { name: 'created_at', type: 'TEXT', nullable: false },
        { name: 'updated_at', type: 'TEXT', nullable: false },
      ],
    },
  ],

  indexes: [
    // Portfolios
    { name: 'idx_portfolios_broker', table: 'portfolios', columns: ['broker'] },
    { name: 'idx_portfolios_active', table: 'portfolios', columns: ['is_active'] },

    // Symbols
    { name: 'idx_symbols_symbol', table: 'symbols', columns: ['symbol'] },
    { name: 'idx_symbols_asset_type', table: 'symbols', columns: ['asset_type'] },

    // Trades
    { name: 'idx_trades_portfolio_date', table: 'trades', columns: ['portfolio_id', 'trade_date'] },
    { name: 'idx_trades_symbol_date', table: 'trades', columns: ['symbol_id', 'trade_date'] },
    { name: 'idx_trades_action', table: 'trades', columns: ['action'] },
    { name: 'idx_trades_instrument_type', table: 'trades', columns: ['instrument_type'] },
    { name: 'idx_trades_expiration', table: 'trades', columns: ['expiration_date'] },
    { name: 'idx_trades_strategy', table: 'trades', columns: ['strategy_id'] },
    { name: 'idx_trades_import_batch', table: 'trades', columns: ['import_batch_id'] },

    // Strategies
    { name: 'idx_strategies_category', table: 'strategies', columns: ['category'] },
    { name: 'idx_strategies_predefined', table: 'strategies', columns: ['is_predefined'] },

    // Positions
    { name: 'idx_positions_portfolio', table: 'positions', columns: ['portfolio_id'] },
    { name: 'idx_positions_symbol', table: 'positions', columns: ['symbol_id'] },
    { name: 'idx_positions_status', table: 'positions', columns: ['status'] },
    { name: 'idx_positions_expiration', table: 'positions', columns: ['expiration_date'] },

    // Trade Legs
    { name: 'idx_trade_legs_execution', table: 'trade_legs', columns: ['strategy_execution_id'] },
    { name: 'idx_trade_legs_trade', table: 'trade_legs', columns: ['trade_id'] },

    // Market Data
    { name: 'idx_market_data_symbol_date', table: 'market_data', columns: ['symbol_id', 'date'] },
    { name: 'idx_market_data_date', table: 'market_data', columns: ['date'] },

    // Performance Metrics
    {
      name: 'idx_performance_portfolio_period',
      table: 'performance_metrics',
      columns: ['portfolio_id', 'period_start', 'period_end'],
    },
    { name: 'idx_performance_period_type', table: 'performance_metrics', columns: ['period_type'] },

    // Import Batches
    { name: 'idx_import_batches_portfolio', table: 'import_batches', columns: ['portfolio_id'] },
    { name: 'idx_import_batches_status', table: 'import_batches', columns: ['status'] },
    { name: 'idx_import_batches_date', table: 'import_batches', columns: ['started_at'] },

    // User Settings
    { name: 'idx_user_settings_key', table: 'user_settings', columns: ['key'] },
  ],
};

/**
 * Complete database schema for Options Trading Tracker v2.0
 * Includes wheel strategy tracking functionality
 */
export const SCHEMA_V2: DatabaseSchema = {
  version: 2,
  tables: SCHEMA_V1.tables, // Include all v1 tables plus new ones
  indexes: SCHEMA_V1.indexes, // Include all v1 indexes plus new ones
};

// Update the latest schema reference
export const LATEST_SCHEMA = SCHEMA_V2;

/**
 * Generate SQL DDL for creating a table
 */
export function generateCreateTableSQL(table: TableDefinition): string {
  const columns = table.columns.map(col => {
    let sql = `  ${col.name} ${col.type}`;

    if (col.primaryKey) {
      sql += ' PRIMARY KEY';
      if (col.autoIncrement) sql += ' AUTOINCREMENT';
    } else {
      if (!col.nullable) sql += ' NOT NULL';
      if (col.unique) sql += ' UNIQUE';
    }

    if (col.defaultValue !== undefined) {
      if (typeof col.defaultValue === 'string' && !col.defaultValue.startsWith('datetime(')) {
        sql += ` DEFAULT '${col.defaultValue}'`;
      } else {
        sql += ` DEFAULT ${col.defaultValue}`;
      }
    }

    return sql;
  });

  let sql = `CREATE TABLE ${table.name} (\n${columns.join(',\n')}`;

  // Add foreign key constraints
  const foreignKeys = table.columns
    .filter(col => col.foreignKey)
    .map(col => {
      const fk = col.foreignKey!;
      let constraint = `  FOREIGN KEY (${col.name}) REFERENCES ${fk.table}(${fk.column})`;
      if (fk.onDelete) constraint += ` ON DELETE ${fk.onDelete}`;
      if (fk.onUpdate) constraint += ` ON UPDATE ${fk.onUpdate}`;
      return constraint;
    });

  if (foreignKeys.length > 0) {
    sql += ',\n' + foreignKeys.join(',\n');
  }

  // Add table constraints
  if (table.constraints && table.constraints.length > 0) {
    const constraints = table.constraints.map(constraint => `  ${constraint}`);
    sql += ',\n' + constraints.join(',\n');
  }

  sql += '\n)';
  return sql;
}

/**
 * Generate SQL DDL for creating an index
 */
export function generateCreateIndexSQL(index: IndexDefinition): string {
  const uniqueKeyword = index.unique ? 'UNIQUE ' : '';
  const columns = index.columns.join(', ');
  return `CREATE ${uniqueKeyword}INDEX ${index.name} ON ${index.table} (${columns})`;
}

/**
 * Generate complete schema SQL for a given schema version
 */
export function generateSchemaSQL(schema: DatabaseSchema): string[] {
  const statements: string[] = [];

  // Create tables
  for (const table of schema.tables) {
    statements.push(generateCreateTableSQL(table));
  }

  // Create indexes
  for (const index of schema.indexes) {
    statements.push(generateCreateIndexSQL(index));
  }

  return statements;
}
