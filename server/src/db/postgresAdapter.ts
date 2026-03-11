// db/postgresAdapter.ts
// PostgreSQL adapter for production (Railway)

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

let pool: Pool | null = null;

// تهيئة PostgreSQL
export const initPostgres = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing PostgreSQL...');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // اختبار الاتصال
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');

    // إنشاء الجداول
    await createTables(client);

    client.release();
    console.log('✅ PostgreSQL initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL:', error);
    throw error;
  }
};

// إنشاء جميع الجداول
const createTables = async (client: PoolClient): Promise<void> => {
  console.log('🔄 Creating PostgreSQL tables...');

  try {
    await client.query('BEGIN');

    // جدول المستخدمين
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        coins INTEGER DEFAULT 0,
        subscription TEXT DEFAULT 'free',
        subscription_expiry TEXT,
        auto_analysis_enabled BOOLEAN DEFAULT FALSE,
        auto_analysis_enabled_at TIMESTAMP,
        push_token TEXT,
        push_token_updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إضافة حقول push_token إذا لم تكن موجودة (للتوافق مع الجداول القديمة)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='push_token') THEN
          ALTER TABLE users ADD COLUMN push_token TEXT;
          ALTER TABLE users ADD COLUMN push_token_updated_at TIMESTAMP;
        END IF;
      END $$;
    `);

    // إضافة حقول إشعارات انتهاء الاشتراك إذا لم تكن موجودة
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_expiry_notified') THEN
          ALTER TABLE users ADD COLUMN subscription_expiry_notified BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_expiring_notified') THEN
          ALTER TABLE users ADD COLUMN subscription_expiring_notified BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    // جدول تاريخ التحليلات (القديم - للتوافق)
    await client.query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        decision TEXT NOT NULL,
        score REAL,
        confidence REAL,
        sentiment TEXT,
        suggested_trade TEXT,
        reasoning TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول التحليلات المحسّن
    await client.query(`
      CREATE TABLE IF NOT EXISTS enhanced_analysis_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe_h1 TEXT,
        timeframe_m5 TEXT,
        current_price REAL NOT NULL,
        decision TEXT NOT NULL,
        score REAL,
        confidence REAL,
        sentiment TEXT,
        bias TEXT,
        reasoning TEXT,
        suggested_trade TEXT,
        trade_type TEXT,
        entry_price REAL,
        stop_loss REAL,
        take_profit REAL,
        risk_reward_ratio REAL,
        expiry_minutes INTEGER,
        liquidity_sweep_detected BOOLEAN DEFAULT FALSE,
        market_structure TEXT,
        key_levels TEXT,
        waiting_for TEXT,
        reasons TEXT,
        analysis_type TEXT DEFAULT 'manual',
        h1_image_path TEXT,
        m5_image_path TEXT,
        is_trade_executed BOOLEAN DEFAULT FALSE,
        trade_result TEXT,
        pnl REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // فهارس للتحليلات المحسّنة
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_user_date 
      ON enhanced_analysis_history(user_id, created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_decision 
      ON enhanced_analysis_history(decision)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_type 
      ON enhanced_analysis_history(analysis_type)
    `);

    // جدول الاشتراكات
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        package_id TEXT,
        plan_name TEXT,
        coins_added INTEGER,
        price REAL,
        analysis_limit INTEGER DEFAULT -1,
        auto_renew BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'active',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    // جدول التحليل التلقائي
    await client.query(`
      CREATE TABLE IF NOT EXISTS auto_analysis (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        current_price REAL,
        decision TEXT,
        score REAL,
        confidence REAL,
        suggested_trade TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول الجلسات
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        device_info TEXT,
        ip_address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
      ON sessions(user_id, is_active)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token 
      ON sessions(token)
    `);

    // جدول الصفقات الورقية - Paper Trading Positions
    await client.query(`
      CREATE TABLE IF NOT EXISTS paper_positions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        lot_size REAL NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        close_price REAL,
        realized_pnl REAL,
        status TEXT DEFAULT 'open',
        close_reason TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_user 
      ON paper_positions(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_status 
      ON paper_positions(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_user_status 
      ON paper_positions(user_id, status)
    `);

    // جدول الباقات VIP
    await client.query(`
      CREATE TABLE IF NOT EXISTS vip_packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        description TEXT,
        description_ar TEXT,
        duration_type TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        price REAL NOT NULL,
        coins_included INTEGER DEFAULT 0,
        analysis_limit INTEGER DEFAULT -1,
        features TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // جدول استخدام التحليلات
    await client.query(`
      CREATE TABLE IF NOT EXISTS analysis_usage (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        analysis_date DATE NOT NULL,
        analysis_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, analysis_date)
      )
    `);

    // جدول التحليلات الاقتصادية
    await client.query(`
      CREATE TABLE IF NOT EXISTS economic_analyses (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        event_date DATE NOT NULL,
        analysis TEXT NOT NULL,
        impact TEXT NOT NULL,
        market_expectation TEXT NOT NULL,
        trading_recommendation TEXT NOT NULL,
        analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL,
        UNIQUE(event_id, user_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_economic_analyses_user_date 
      ON economic_analyses(user_id, event_date DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_economic_analyses_event 
      ON economic_analyses(event_id)
    `);

    // ==========================================
    // جداول نظام Backtesting (جديد)
    // ==========================================

    // جدول نتائج الاختبار - مع معالجة خطأ النوع المكرر
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS backtest_results (
          id UUID PRIMARY KEY,
          user_id TEXT, -- يمكن ربطه بجدول users إذا أردنا
          symbol VARCHAR(20) NOT NULL,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          analysis_interval INTEGER,
          total_analyses INTEGER,
          trades_generated INTEGER,
          trades_executed INTEGER,
          win_rate DECIMAL(5,2),
          profit_factor DECIMAL(8,2),
          total_profit_pips DECIMAL(10,2),
          metrics JSONB, -- تخزين كامل الإحصائيات
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error: any) {
      // تجاهل خطأ النوع المكرر الذي قد يحدث أحياناً رغم existence check
      if (error.code === '23505' && error.constraint === 'pg_type_typname_nsp_index') {
        console.log('⚠️ Notice: backtest_results table likely exists (handled type conflict).');
      } else {
        throw error;
      }
    }

    // جدول صفقات الاختبار
    await client.query(`
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
        outcome VARCHAR(20),
        profit_pips DECIMAL(10,2),
        duration_hours DECIMAL(10,2),
        analysis_data JSONB
      )
    `);

    // الفهارس
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_results_created_at 
      ON backtest_results(created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_trades_backtest_id 
      ON backtest_trades(backtest_id)
    `);

    await client.query('COMMIT');
    console.log('✅ All PostgreSQL tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

// تنفيذ استعلام
export const query = async (text: string, params?: any[]): Promise<any> => {
  if (!pool) throw new Error('PostgreSQL not initialized');

  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('❌ PostgreSQL query error:', error);
    throw error;
  }
};

// الحصول على client للمعاملات
export const getClient = async (): Promise<PoolClient> => {
  if (!pool) throw new Error('PostgreSQL not initialized');
  return await pool.connect();
};

// إغلاق الاتصال
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    console.log('✅ PostgreSQL pool closed');
  }
};

// الحصول على pool (للاستخدام في الدوال الأخرى)
export const getPool = (): Pool | null => {
  return pool;
};

export default pool;
