-- Create tables for backtesting results

-- Table to store the overall result of a backtest run
CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id), -- Optional, if we want to link to a user
  symbol VARCHAR(20) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  analysis_interval INTEGER,
  total_analyses INTEGER,
  trades_generated INTEGER,
  trades_executed INTEGER,
  win_rate DECIMAL(5,2),
  profit_factor DECIMAL(8,2), -- Can be very large or null if no losses
  total_profit_pips DECIMAL(10,2),
  metrics JSONB, -- Store full performance metrics as JSON
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table to store individual trades generated during a backtest
CREATE TABLE IF NOT EXISTS backtest_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_id UUID REFERENCES backtest_results(id) ON DELETE CASCADE,
  entry_time TIMESTAMP,
  trade_type VARCHAR(20),
  entry_price DECIMAL(10,2),
  sl DECIMAL(10,2),
  tp1 DECIMAL(10,2),
  tp2 DECIMAL(10,2),
  tp3 DECIMAL(10,2),
  outcome VARCHAR(20), -- 'TP1', 'TP2', 'TP3', 'SL', 'EXPIRED'
  profit_pips DECIMAL(10,2),
  duration_hours DECIMAL(10,2),
  analysis_data JSONB -- Store the specific analysis snapshot if needed
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_backtest_results_created_at ON backtest_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_trades_backtest_id ON backtest_trades(backtest_id);
