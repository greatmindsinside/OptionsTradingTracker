-- Schema for journal-first options tracker

-- accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- symbols table (optional convenience)
CREATE TABLE IF NOT EXISTS symbols (
  symbol TEXT PRIMARY KEY
);

-- journal table: one row per action
CREATE TABLE IF NOT EXISTS journal (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  account_id TEXT NOT NULL,
  symbol TEXT,
  type TEXT NOT NULL,
  qty REAL,
  amount REAL NOT NULL, -- + cash in, - cash out
  strike REAL,
  expiration TEXT,
  underlying_price REAL, -- Stock price at entry (for wheel analysis)
  notes TEXT, -- Trade notes, tags, or commentary
  meta TEXT,
  -- Audit fields for edit/delete tracking
  deleted_at TEXT DEFAULT NULL,
  edited_by TEXT DEFAULT NULL,
  edit_reason TEXT DEFAULT NULL,
  original_entry_id TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_journal_ts ON journal(ts);
CREATE INDEX IF NOT EXISTS idx_journal_symbol ON journal(symbol);
CREATE INDEX IF NOT EXISTS idx_journal_type ON journal(type);
CREATE INDEX IF NOT EXISTS idx_journal_deleted_at ON journal(deleted_at);

-- Weekly premium view: sum of option cashflows by ISO week
CREATE VIEW IF NOT EXISTS v_weekly_premium AS
SELECT
  strftime('%Y-%W', ts) AS week,
  symbol,
  SUM(CASE WHEN type IN ('sell_to_open','buy_to_close','expiration','option_premium') THEN amount ELSE 0 END) AS premium
FROM journal
GROUP BY week, symbol;

-- Cost basis view: net shares and average cost from assignments and sales
CREATE VIEW IF NOT EXISTS v_cost_basis AS
WITH share_flows AS (
  SELECT
    symbol,
    SUM(CASE WHEN type='assignment_shares' THEN qty ELSE 0 END) -
    SUM(CASE WHEN type='share_sale' THEN qty ELSE 0 END) AS shares,
    SUM(CASE WHEN type IN ('assignment_shares','share_sale') THEN amount ELSE 0 END) AS net_cash
  FROM journal
  GROUP BY symbol
)
SELECT
  symbol,
  shares,
  net_cash,
  CASE WHEN shares != 0 THEN (-net_cash) / shares ELSE NULL END AS avg_cost
FROM share_flows;
