// db/database.ts
// قاعدة البيانات باستخدام sql.js (بدون native compilation)

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

let db: SqlJsDatabase | null = null;
const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'ict_trader.db');

console.log('📂 Database path:', dbPath);
console.log('📂 Data directory:', dataDir);
console.log('📂 Current working directory:', process.cwd());

// تحديث هيكل قاعدة البيانات للنسخة الجديدة
const updateDatabaseSchema = async (): Promise<void> => {
  if (!db) return;

  console.log('🔄 Checking and updating database schema...');

  try {
    // التحقق من وجود حقل auto_analysis_enabled في جدول users
    const usersColumns = db.exec("PRAGMA table_info(users)");
    const userColumnNames = usersColumns[0]?.values.map(row => row[1]) || [];

    if (!userColumnNames.includes('auto_analysis_enabled')) {
      console.log('🔧 Adding auto_analysis_enabled column to users table...');
      db.run('ALTER TABLE users ADD COLUMN auto_analysis_enabled BOOLEAN DEFAULT 0');
      db.run('ALTER TABLE users ADD COLUMN auto_analysis_enabled_at TEXT');
    }

    // التحقق من وجود جدول vip_packages
    const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='vip_packages'");

    if (tablesResult.length === 0 || tablesResult[0].values.length === 0) {
      console.log('📦 Creating vip_packages table...');

      // إنشاء جدول الباقات
      db.run(`
        CREATE TABLE vip_packages (
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
          is_active BOOLEAN DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // التحقق من وجود الأعمدة الجديدة في جدول subscriptions
    const subscriptionsColumns = db.exec("PRAGMA table_info(subscriptions)");
    const columnNames = subscriptionsColumns[0]?.values.map(row => row[1]) || [];

    if (!columnNames.includes('package_id')) {
      console.log('🔧 Adding new columns to subscriptions table...');

      // إضافة الأعمدة الجديدة
      db.run('ALTER TABLE subscriptions ADD COLUMN package_id TEXT');
      db.run('ALTER TABLE subscriptions ADD COLUMN plan_name TEXT');
      db.run('ALTER TABLE subscriptions ADD COLUMN analysis_limit INTEGER DEFAULT -1');
      db.run('ALTER TABLE subscriptions ADD COLUMN auto_renew BOOLEAN DEFAULT 0');

      // تحديث البيانات الموجودة
      db.run(`UPDATE subscriptions SET 
        plan_name = plan,
        package_id = 'legacy-' || plan,
        analysis_limit = CASE 
          WHEN plan = 'premium' THEN -1 
          ELSE 10 
        END
        WHERE plan_name IS NULL`);
    }

    // التحقق من وجود جدول analysis_usage
    const analysisUsageResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='analysis_usage'");

    if (analysisUsageResult.length === 0 || analysisUsageResult[0].values.length === 0) {
      console.log('📊 Creating analysis_usage table...');

      db.run(`
        CREATE TABLE analysis_usage (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          analysis_date TEXT NOT NULL,
          analysis_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, analysis_date)
        )
      `);
    }

    // إنشاء جدول تحليلات محسن مع تفاصيل كاملة
    const enhancedAnalysisResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='enhanced_analysis_history'");

    if (enhancedAnalysisResult.length === 0 || enhancedAnalysisResult[0].values.length === 0) {
      console.log('📊 Creating enhanced_analysis_history table...');

      db.run(`
        CREATE TABLE enhanced_analysis_history (
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
          liquidity_sweep_detected BOOLEAN DEFAULT 0,
          market_structure TEXT,
          key_levels TEXT,
          waiting_for TEXT,
          reasons TEXT,
          analysis_type TEXT DEFAULT 'manual',
          h1_image_path TEXT,
          m5_image_path TEXT,
          is_trade_executed BOOLEAN DEFAULT 0,
          trade_result TEXT,
          pnl REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // إنشاء فهارس للبحث السريع
      db.run(`CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_user_date ON enhanced_analysis_history(user_id, created_at DESC)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_decision ON enhanced_analysis_history(decision)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_type ON enhanced_analysis_history(analysis_type)`);
    }

    saveDatabase();
    console.log('✅ Database schema updated successfully');

  } catch (error) {
    console.error('❌ Error updating database schema:', error);
  }
};
// تهيئة قاعدة البيانات
export const initDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database...');
    console.log('📂 Data directory:', dataDir);
    console.log('📂 Database path:', dbPath);

    // إنشاء مجلد البيانات
    if (!fs.existsSync(dataDir)) {
      console.log('📁 Creating data directory...');
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('✅ Data directory created');
    } else {
      console.log('✅ Data directory exists');
    }

    const SQL = await initSqlJs();
    console.log('✅ SQL.js initialized');

    // تحميل قاعدة البيانات الموجودة أو إنشاء جديدة
    if (fs.existsSync(dbPath)) {
      console.log('📖 Loading existing database...');
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      console.log('✅ Database loaded');
    } else {
      console.log('🆕 Creating new database...');
      db = new SQL.Database();
      console.log('✅ New database created');
    }

    // إنشاء الجداول الأساسية (النسخة القديمة للتوافق)
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      coins INTEGER DEFAULT 100,
      subscription TEXT DEFAULT 'free',
      subscription_expiry TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan TEXT NOT NULL,
      coins_added INTEGER,
      price REAL,
      status TEXT DEFAULT 'active',
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS auto_analysis (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      current_price REAL,
      decision TEXT,
      score REAL,
      confidence REAL,
      suggested_trade TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // جدول الجلسات - للسماح بجلسة واحدة نشطة فقط
    db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      device_info TEXT,
      ip_address TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    )
  `);

    // فهرس للبحث السريع عن الجلسات النشطة
    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);

    // تحديث هيكل قاعدة البيانات للنسخة الجديدة
    await updateDatabaseSchema();

    saveDatabase();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

// حفظ قاعدة البيانات
const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

// ===================== User Operations =====================
export const createUser = (id: string, email: string, hashedPassword: string) => {
  if (!db) throw new Error('Database not initialized');
  db.run(
    'INSERT INTO users (id, email, password, coins, subscription) VALUES (?, ?, ?, 100, ?)',
    [id, email, hashedPassword, 'free']
  );
  saveDatabase();
};

export const getUserByEmail = (email: string): any => {
  if (!db) return null;
  const result = db.exec('SELECT * FROM users WHERE email = ?', [email]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToObject(result[0].columns, result[0].values[0]);
};

export const getUserById = (id: string): any => {
  if (!db) return null;
  const result = db.exec('SELECT * FROM users WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToObject(result[0].columns, result[0].values[0]);
};

export const getAllUsers = (): any[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM users');
  if (result.length === 0 || result[0].values.length === 0) return [];
  return result[0].values.map(row => rowToObject(result[0].columns, row));
};

export const updateUserCoins = (userId: string, coins: number) => {
  if (!db) return;
  db.run('UPDATE users SET coins = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [coins, userId]);
  saveDatabase();
};

export const deductCoins = (userId: string, amount: number): boolean => {
  const user = getUserById(userId);
  if (!user || user.coins < amount) return false;
  updateUserCoins(userId, user.coins - amount);
  return true;
};

export const addCoins = (userId: string, amount: number): boolean => {
  const user = getUserById(userId);
  if (!user) return false;
  updateUserCoins(userId, user.coins + amount);
  return true;
};

// تفعيل/إيقاف التحليل التلقائي للمستخدم
export const setUserAutoAnalysis = (userId: string, enabled: boolean): boolean => {
  console.log(`🔧 [SQLite] setUserAutoAnalysis called - userId: ${userId}, enabled: ${enabled}, db exists: ${!!db}`);
  if (!db) {
    console.error('❌ [SQLite] Database not initialized!');
    return false;
  }
  try {
    const timestamp = enabled ? new Date().toISOString() : null;
    db.run(
      'UPDATE users SET auto_analysis_enabled = ?, auto_analysis_enabled_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [enabled ? 1 : 0, timestamp, userId]
    );
    saveDatabase();
    console.log(`✅ [SQLite] User ${userId} auto analysis ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  } catch (error) {
    console.error('❌ [SQLite] Error setting user auto analysis:', error);
    return false;
  }
};

// الحصول على جميع المستخدمين الذين لديهم التحليل التلقائي مفعل واشتراك نشط
export const getUsersWithAutoAnalysisEnabled = (): any[] => {
  if (!db) return [];
  try {
    // جلب المستخدمين الذين لديهم auto_analysis مفعل واشتراك نشط
    const result = db.exec(`
      SELECT u.* 
      FROM users u
      WHERE u.auto_analysis_enabled = 1
        AND (
          u.subscription = 'vip' 
          OR u.subscription = 'premium'
          OR EXISTS (
            SELECT 1 FROM subscriptions s 
            WHERE s.user_id = u.id 
              AND s.status = 'active' 
              AND datetime(s.expires_at) > datetime('now')
          )
        )
    `);
    if (result.length === 0 || result[0].values.length === 0) {
      console.log('👥 No users with active subscriptions and auto analysis enabled');
      return [];
    }
    const users = result[0].values.map(row => rowToObject(result[0].columns, row));
    console.log(`👥 Found ${users.length} users with active subscriptions and auto analysis enabled`);
    return users;
  } catch (error) {
    console.error('Error getting users with auto analysis:', error);
    return [];
  }
};

// ===================== Push Token Operations =====================
export const setUserPushToken = (userId: string, pushToken: string): boolean => {
  if (!db) return false;
  try {
    db.run(
      'UPDATE users SET push_token = ?, push_token_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [pushToken, userId]
    );
    saveDatabase();
    console.log(`✅ Push token updated for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error setting push token:', error);
    return false;
  }
};

export const getUserPushToken = (userId: string): string | null => {
  if (!db) return null;
  try {
    const result = db.exec('SELECT push_token FROM users WHERE id = ?', [userId]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return result[0].values[0][0] as string || null;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

export const getUsersWithPushTokens = (): any[] => {
  if (!db) return [];
  try {
    // جلب المستخدمين الذين لديهم push token و auto_analysis مفعل واشتراك نشط
    const result = db.exec(`
      SELECT u.id, u.email, u.push_token, u.subscription 
      FROM users u
      WHERE u.push_token IS NOT NULL 
        AND u.push_token != '' 
        AND u.auto_analysis_enabled = 1
        AND (
          u.subscription = 'vip' 
          OR u.subscription = 'premium'
          OR EXISTS (
            SELECT 1 FROM subscriptions s 
            WHERE s.user_id = u.id 
              AND s.status = 'active' 
              AND datetime(s.expires_at) > datetime('now')
          )
        )
    `);
    if (result.length === 0 || result[0].values.length === 0) {
      console.log('📱 No users with active subscriptions and push tokens found');
      return [];
    }
    const users = result[0].values.map(row => rowToObject(result[0].columns, row));
    console.log(`📱 Found ${users.length} users with active subscriptions and push tokens`);
    return users;
  } catch (error) {
    console.error('Error getting users with push tokens:', error);
    return [];
  }
};

export const removeUserPushToken = (userId: string): boolean => {
  if (!db) return false;
  try {
    db.run(
      'UPDATE users SET push_token = NULL, push_token_updated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
    saveDatabase();
    console.log(`✅ Push token removed for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error removing push token:', error);
    return false;
  }
};

export const removePushTokenByValue = (token: string): boolean => {
  if (!db) return false;
  try {
    const result = db.exec("SELECT id FROM users WHERE push_token = ?", [token]);
    if (result.length === 0 || result[0].values.length === 0) return false;

    const userId = result[0].values[0][0] as string;

    db.run(
      'UPDATE users SET push_token = NULL, push_token_updated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE push_token = ?',
      [token]
    );
    saveDatabase();
    console.log(`✅ Invalid push token removed for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error removing push token by value:', error);
    return false;
  }
};

// ===================== Analysis Operations =====================
export const saveAnalysis = (
  id: string,
  userId: string,
  symbol: string,
  decision: string,
  score: number,
  confidence: number,
  sentiment: string,
  suggestedTrade: string | null,
  reasoning: string
) => {
  if (!db) return;
  db.run(
    `INSERT INTO analysis_history (id, user_id, symbol, decision, score, confidence, sentiment, suggested_trade, reasoning)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, symbol, decision, score, confidence, sentiment, suggestedTrade, reasoning]
  );
  saveDatabase();
};

export const getAnalysisHistory = (userId: string, limit: number = 50): any[] => {
  if (!db) return [];
  const result = db.exec(
    `SELECT * FROM analysis_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, limit]
  );
  if (result.length === 0) return [];
  return result[0].values.map((row: any) => rowToObject(result[0].columns, row));
};

// ===================== Enhanced Analysis Operations =====================
export const saveEnhancedAnalysis = (
  id: string,
  userId: string,
  symbol: string,
  currentPrice: number,
  analysis: any,
  analysisType: 'manual' | 'auto' = 'manual',
  h1ImagePath?: string,
  m5ImagePath?: string
) => {
  if (!db) return;

  const suggestedTrade = analysis.suggestedTrade;

  db.run(
    `INSERT INTO enhanced_analysis_history (
      id, user_id, symbol, current_price, decision, score, confidence, 
      sentiment, bias, reasoning, suggested_trade, trade_type, entry_price, 
      stop_loss, take_profit, risk_reward_ratio, expiry_minutes, 
      liquidity_sweep_detected, market_structure, key_levels, waiting_for, 
      reasons, analysis_type, h1_image_path, m5_image_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      symbol,
      currentPrice,
      analysis.decision,
      analysis.score || 0,
      analysis.confidence || 0,
      analysis.sentiment || '',
      analysis.bias || '',
      analysis.reasoning || '',
      suggestedTrade ? JSON.stringify(suggestedTrade) : null,
      suggestedTrade?.type || null,
      suggestedTrade?.entry || null,
      suggestedTrade?.sl || null,
      suggestedTrade?.tp || null,
      suggestedTrade?.rrRatio || null,
      suggestedTrade?.expiryMinutes || null,
      analysis.liquiditySweepDetected ? 1 : 0,
      analysis.marketStructure || '',
      analysis.keyLevels ? JSON.stringify(analysis.keyLevels) : null,
      analysis.waitingFor ? JSON.stringify(analysis.waitingFor) : null,
      analysis.reasons ? JSON.stringify(analysis.reasons) : null,
      analysisType,
      h1ImagePath || null,
      m5ImagePath || null
    ]
  );
  saveDatabase();
};

export const getEnhancedAnalysisHistory = (userId: string, limit: number = 50): any[] => {
  if (!db) return [];

  try {
    const result = db.exec(
      `SELECT * FROM enhanced_analysis_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: any) => {
      const analysis = rowToObject(result[0].columns, row);

      // تحويل JSON strings إلى objects
      if (analysis.suggested_trade) {
        try {
          analysis.suggested_trade = JSON.parse(analysis.suggested_trade);
        } catch (e) {
          analysis.suggested_trade = null;
        }
      }

      if (analysis.key_levels) {
        try {
          analysis.key_levels = JSON.parse(analysis.key_levels);
        } catch (e) {
          analysis.key_levels = [];
        }
      }

      if (analysis.waiting_for) {
        try {
          analysis.waiting_for = JSON.parse(analysis.waiting_for);
        } catch (e) {
          analysis.waiting_for = null;
        }
      }

      if (analysis.reasons) {
        try {
          analysis.reasons = JSON.parse(analysis.reasons);
        } catch (e) {
          analysis.reasons = [];
        }
      }

      return analysis;
    });
  } catch (error) {
    console.error('Error getting enhanced analysis history:', error);
    return [];
  }
};

export const getTradeHistory = (userId: string, limit: number = 20): any[] => {
  if (!db) return [];

  try {
    const result = db.exec(
      `SELECT * FROM enhanced_analysis_history 
       WHERE user_id = ? AND decision = 'PLACE_PENDING' AND suggested_trade IS NOT NULL
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: any) => {
      const trade = rowToObject(result[0].columns, row);

      if (trade.suggested_trade) {
        try {
          trade.suggested_trade = JSON.parse(trade.suggested_trade);
        } catch (e) {
          trade.suggested_trade = null;
        }
      }

      return trade;
    });
  } catch (error) {
    console.error('Error getting trade history:', error);
    return [];
  }
};

export const getNoTradeAnalysis = (userId: string, limit: number = 20): any[] => {
  if (!db) return [];

  try {
    const result = db.exec(
      `SELECT * FROM enhanced_analysis_history 
       WHERE user_id = ? AND decision = 'NO_TRADE'
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: any) => {
      const analysis = rowToObject(result[0].columns, row);

      if (analysis.reasons) {
        try {
          analysis.reasons = JSON.parse(analysis.reasons);
        } catch (e) {
          analysis.reasons = [];
        }
      }

      if (analysis.waiting_for) {
        try {
          analysis.waiting_for = JSON.parse(analysis.waiting_for);
        } catch (e) {
          analysis.waiting_for = null;
        }
      }

      return analysis;
    });
  } catch (error) {
    console.error('Error getting no-trade analysis:', error);
    return [];
  }
};

export const updateTradeResult = (analysisId: string, result: string, pnl?: number) => {
  if (!db) return;

  db.run(
    `UPDATE enhanced_analysis_history 
     SET is_trade_executed = 1, trade_result = ?, pnl = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [result, pnl || 0, analysisId]
  );
  saveDatabase();
};

// ===================== Auto Analysis Operations =====================
export const saveAutoAnalysis = (
  id: string,
  symbol: string,
  h1Image: string,
  m5Image: string,
  currentPrice: number,
  decision: string,
  score: number,
  confidence: number,
  suggestedTrade: string | null
) => {
  if (!db) return;
  db.run(
    `INSERT INTO auto_analysis (id, symbol, current_price, decision, score, confidence, suggested_trade)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, symbol, currentPrice, decision, score, confidence, suggestedTrade]
  );
  saveDatabase();
};

export const getLatestAutoAnalysis = (symbol: string): any => {
  if (!db) return null;
  const result = db.exec(
    `SELECT * FROM auto_analysis WHERE symbol = ? ORDER BY created_at DESC LIMIT 1`,
    [symbol]
  );
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToObject(result[0].columns, result[0].values[0]);
};

// ===================== VIP Packages Operations =====================
export const createVipPackage = (
  id: string,
  name: string,
  nameAr: string,
  description: string,
  descriptionAr: string,
  durationType: 'weekly' | 'monthly' | 'yearly',
  durationDays: number,
  price: number,
  coinsIncluded: number = 0,
  analysisLimit: number = -1,
  features: string[] = []
) => {
  if (!db) throw new Error('Database not initialized');
  db.run(
    `INSERT INTO vip_packages (id, name, name_ar, description, description_ar, duration_type, duration_days, price, coins_included, analysis_limit, features)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, nameAr, description, descriptionAr, durationType, durationDays, price, coinsIncluded, analysisLimit, JSON.stringify(features)]
  );
  saveDatabase();
};

export const getAllVipPackages = (): any[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM vip_packages WHERE is_active = 1 ORDER BY price ASC');
  if (result.length === 0) return [];
  return result[0].values.map((row: any) => {
    const pkg = rowToObject(result[0].columns, row);
    pkg.features = pkg.features ? JSON.parse(pkg.features) : [];
    return pkg;
  });
};

export const getVipPackageById = (id: string): any => {
  if (!db) return null;
  const result = db.exec('SELECT * FROM vip_packages WHERE id = ? AND is_active = 1', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const pkg = rowToObject(result[0].columns, result[0].values[0]);
  pkg.features = pkg.features ? JSON.parse(pkg.features) : [];
  return pkg;
};

// ===================== Enhanced Subscription Operations =====================
export const createUserSubscription = (
  id: string,
  userId: string,
  packageId: string,
  planName: string,
  coinsAdded: number,
  price: number,
  analysisLimit: number,
  expiresAt: string,
  autoRenew: boolean = false
) => {
  if (!db) return;

  // Check what columns exist in the subscriptions table
  let hasNewColumns = false;
  try {
    const columnsResult = db.exec("PRAGMA table_info(subscriptions)");
    const columnNames = columnsResult[0]?.values.map(row => row[1]) || [];
    hasNewColumns = columnNames.includes('package_id') && columnNames.includes('plan_name');
  } catch (error) {
    console.log('Could not check table structure for subscription creation, using fallback');
  }

  try {
    if (hasNewColumns) {
      // Use new schema with all columns
      db.run(
        `INSERT INTO subscriptions (id, user_id, package_id, plan_name, plan, coins_added, price, analysis_limit, expires_at, auto_renew, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [id, userId, packageId, planName, planName, coinsAdded, price, analysisLimit, expiresAt, autoRenew ? 1 : 0]
      );
    } else {
      // Use old schema - map to existing columns
      db.run(
        `INSERT INTO subscriptions (id, user_id, plan, coins_added, price, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [id, userId, planName, coinsAdded, price, expiresAt]
      );
    }

    // Update user data
    const user = getUserById(userId);
    if (user) {
      db.run(
        `UPDATE users SET subscription = ?, subscription_expiry = ?, coins = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [planName, expiresAt, user.coins + coinsAdded, userId]
      );
    }
    saveDatabase();
  } catch (error) {
    console.error('Failed to create user subscription:', error);
    throw error;
  }
};

export const getUserActiveSubscription = (userId: string): any => {
  if (!db) return null;

  // First check what columns exist in the subscriptions table
  let hasNewColumns = false;
  try {
    const columnsResult = db.exec("PRAGMA table_info(subscriptions)");
    const columnNames = columnsResult[0]?.values.map(row => row[1]) || [];
    hasNewColumns = columnNames.includes('package_id') && columnNames.includes('plan_name');
  } catch (error) {
    console.log('Could not check table structure, using fallback');
  }

  try {
    if (hasNewColumns) {
      // Use new schema with proper column names
      const result = db.exec(
        `SELECT s.*, p.name_ar as package_name_ar, p.features 
         FROM subscriptions s 
         LEFT JOIN vip_packages p ON s.package_id = p.id 
         WHERE s.user_id = ? AND s.status = 'active' AND datetime(s.expires_at) > datetime('now') 
         ORDER BY s.started_at DESC LIMIT 1`,
        [userId]
      );

      if (result.length > 0 && result[0].values.length > 0) {
        const subscription = rowToObject(result[0].columns, result[0].values[0]);
        subscription.features = subscription.features ? JSON.parse(subscription.features) : [];
        return subscription;
      }
    } else {
      // Use old schema - map old columns to new expected names
      const result = db.exec(
        `SELECT *, plan as plan_name, plan as package_name_ar, -1 as analysis_limit, '[]' as features
         FROM subscriptions 
         WHERE user_id = ? AND status = 'active' AND datetime(expires_at) > datetime('now') 
         ORDER BY started_at DESC LIMIT 1`,
        [userId]
      );

      if (result.length > 0 && result[0].values.length > 0) {
        const subscription = rowToObject(result[0].columns, result[0].values[0]);
        subscription.features = [];
        subscription.package_id = subscription.package_id || `legacy-${subscription.plan}`;
        return subscription;
      }
    }
  } catch (error) {
    console.error('Active subscription query failed:', error);

    // Final fallback - basic query without datetime checks
    try {
      const result = db.exec(
        `SELECT * FROM subscriptions 
         WHERE user_id = ? AND status = 'active' 
         ORDER BY started_at DESC LIMIT 1`,
        [userId]
      );

      if (result.length > 0 && result[0].values.length > 0) {
        const subscription = rowToObject(result[0].columns, result[0].values[0]);
        subscription.plan_name = subscription.plan || 'free';
        subscription.package_name_ar = subscription.plan || 'مجاني';
        subscription.analysis_limit = -1;
        subscription.features = [];
        subscription.package_id = subscription.package_id || `legacy-${subscription.plan}`;
        return subscription;
      }
    } catch (basicError) {
      console.error('All subscription queries failed:', basicError);
    }
  }

  return null;
};

export const getUserSubscriptionHistory = (userId: string, limit: number = 10): any[] => {
  if (!db) return [];

  // Check what columns exist in the subscriptions table
  let hasNewColumns = false;
  try {
    const columnsResult = db.exec("PRAGMA table_info(subscriptions)");
    const columnNames = columnsResult[0]?.values.map(row => row[1]) || [];
    hasNewColumns = columnNames.includes('package_id') && columnNames.includes('plan_name');
  } catch (error) {
    console.log('Could not check table structure for history, using fallback');
  }

  try {
    if (hasNewColumns) {
      // Use new schema
      const result = db.exec(
        `SELECT s.*, p.name_ar as package_name_ar 
         FROM subscriptions s 
         LEFT JOIN vip_packages p ON s.package_id = p.id 
         WHERE s.user_id = ? 
         ORDER BY s.started_at DESC LIMIT ?`,
        [userId, limit]
      );

      if (result.length > 0) {
        return result[0].values.map((row: any) => rowToObject(result[0].columns, row));
      }
    } else {
      // Use old schema - map old columns to new expected names
      const result = db.exec(
        `SELECT *, plan as plan_name, plan as package_name_ar 
         FROM subscriptions 
         WHERE user_id = ? 
         ORDER BY started_at DESC LIMIT ?`,
        [userId, limit]
      );

      if (result.length > 0) {
        return result[0].values.map((row: any) => {
          const subscription = rowToObject(result[0].columns, row);
          subscription.package_id = subscription.package_id || `legacy-${subscription.plan}`;
          return subscription;
        });
      }
    }
  } catch (error) {
    console.error('Subscription history query failed:', error);

    // Final fallback - basic query
    try {
      const result = db.exec(
        `SELECT * FROM subscriptions 
         WHERE user_id = ? 
         ORDER BY started_at DESC LIMIT ?`,
        [userId, limit]
      );

      if (result.length > 0) {
        return result[0].values.map((row: any) => {
          const subscription = rowToObject(result[0].columns, row);
          subscription.plan_name = subscription.plan || 'free';
          subscription.package_name_ar = subscription.plan || 'مجاني';
          subscription.package_id = subscription.package_id || `legacy-${subscription.plan}`;
          return subscription;
        });
      }
    } catch (basicError) {
      console.error('All subscription history queries failed:', basicError);
    }
  }

  return [];
};

export const expireUserSubscription = (userId: string) => {
  if (!db) return;

  // تحديث حالة الاشتراك إلى منتهي الصلاحية
  db.run(
    `UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'`,
    [userId]
  );

  // تحديث بيانات المستخدم إلى الباقة المجانية
  db.run(
    `UPDATE users SET subscription = 'free', subscription_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [userId]
  );

  saveDatabase();
};

export const getExpiredSubscriptions = (): any[] => {
  if (!db) return [];

  // Check what columns exist in the subscriptions table
  let hasNewColumns = false;
  try {
    const columnsResult = db.exec("PRAGMA table_info(subscriptions)");
    const columnNames = columnsResult[0]?.values.map(row => row[1]) || [];
    hasNewColumns = columnNames.includes('plan_name');
  } catch (error) {
    console.log('Could not check table structure for expired subscriptions, using fallback');
  }

  try {
    if (hasNewColumns) {
      // Use new schema
      const result = db.exec(
        `SELECT user_id, plan_name, expires_at 
         FROM subscriptions 
         WHERE status = 'active' AND datetime(expires_at) <= datetime('now')`
      );
      if (result.length === 0) return [];
      return result[0].values.map((row: any) => rowToObject(result[0].columns, row));
    } else {
      // Use old schema
      const result = db.exec(
        `SELECT user_id, plan, expires_at 
         FROM subscriptions 
         WHERE status = 'active' AND datetime(expires_at) <= datetime('now')`
      );
      if (result.length === 0) return [];
      return result[0].values.map((row: any) => {
        const obj = rowToObject(result[0].columns, row);
        obj.plan_name = obj.plan; // Map old column to new expected name
        return obj;
      });
    }
  } catch (error) {
    console.error('Expired subscriptions query failed:', error);

    // Final fallback - get all active subscriptions and check expiry in code
    try {
      const result = db.exec(
        `SELECT user_id, plan, expires_at 
         FROM subscriptions 
         WHERE status = 'active'`
      );
      if (result.length === 0) return [];

      const now = new Date();
      return result[0].values
        .map((row: any) => rowToObject(result[0].columns, row))
        .filter(sub => {
          if (!sub.expires_at) return false;
          try {
            const expiryDate = new Date(sub.expires_at);
            return expiryDate <= now;
          } catch {
            return false;
          }
        })
        .map(sub => ({
          ...sub,
          plan_name: sub.plan
        }));
    } catch (basicError) {
      console.error('All expired subscription queries failed:', basicError);
      return [];
    }
  }
};

// ===================== Analysis Usage Tracking =====================
export const incrementAnalysisUsage = (userId: string): boolean => {
  if (!db) return false;

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  try {
    // التحقق من وجود جدول analysis_usage
    const tableExists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='analysis_usage'");

    if (tableExists.length === 0 || tableExists[0].values.length === 0) {
      console.log('Analysis usage table does not exist, skipping usage tracking');
      return true; // نعتبرها نجحت لأن الجدول غير موجود
    }

    // محاولة إدراج سجل جديد
    try {
      db.run(
        `INSERT INTO analysis_usage (id, user_id, analysis_date, analysis_count) 
         VALUES (?, ?, ?, 1)`,
        [uuidv4(), userId, today]
      );
    } catch (insertError) {
      // إذا فشل الإدراج (بسبب UNIQUE constraint)، قم بالتحديث
      db.run(
        `UPDATE analysis_usage SET analysis_count = analysis_count + 1 
         WHERE user_id = ? AND analysis_date = ?`,
        [userId, today]
      );
    }

    saveDatabase();
    return true;
  } catch (error) {
    console.error('Failed to increment analysis usage:', error);
    return true; // نعتبرها نجحت لتجنب منع التحليل
  }
};

export const getUserDailyAnalysisCount = (userId: string): number => {
  if (!db) return 0;

  try {
    // التحقق من وجود جدول analysis_usage
    const tableExists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='analysis_usage'");

    if (tableExists.length === 0 || tableExists[0].values.length === 0) {
      return 0; // الجدول غير موجود، إرجاع 0
    }

    const today = new Date().toISOString().split('T')[0];
    const result = db.exec(
      `SELECT analysis_count FROM analysis_usage WHERE user_id = ? AND analysis_date = ?`,
      [userId, today]
    );

    if (result.length === 0 || result[0].values.length === 0) return 0;
    return result[0].values[0][0] as number;
  } catch (error) {
    console.error('Failed to get daily analysis count:', error);
    return 0;
  }
};

export const canUserAnalyze = (userId: string): { canAnalyze: boolean; reason?: string; remainingAnalyses?: number } => {
  const user = getUserById(userId);
  if (!user) {
    return { canAnalyze: false, reason: 'المستخدم غير موجود' };
  }

  // التحقق من الاشتراك النشط
  const activeSubscription = getUserActiveSubscription(userId);

  if (!activeSubscription) {
    // مستخدم مجاني - تحقق من العملات
    if (user.coins < 50) {
      return { canAnalyze: false, reason: 'رصيد العملات غير كافٍ (مطلوب 50 عملة)' };
    }
    return { canAnalyze: true };
  }

  // مستخدم مشترك - تحقق من حد التحليلات
  if (activeSubscription.analysis_limit === -1) {
    // تحليلات غير محدودة
    return { canAnalyze: true };
  }

  // تحقق من الاستخدام اليومي
  const dailyUsage = getUserDailyAnalysisCount(userId);
  const remainingAnalyses = Math.max(0, activeSubscription.analysis_limit - dailyUsage);

  if (remainingAnalyses <= 0) {
    return {
      canAnalyze: false,
      reason: `تم استنفاد حد التحليلات اليومي (${activeSubscription.analysis_limit})`,
      remainingAnalyses: 0
    };
  }

  return {
    canAnalyze: true,
    remainingAnalyses
  };
};

// ===================== Helper =====================
const rowToObject = (columns: string[], values: any[]): any => {
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj;
};

// ===================== Session Management =====================

// إنشاء جلسة جديدة وإنهاء الجلسات القديمة
export const createSession = (userId: string, token: string, deviceInfo?: string, ipAddress?: string): string => {
  if (!db) throw new Error('Database not initialized');

  try {
    // إنهاء جميع الجلسات النشطة القديمة للمستخدم
    db.run(
      'UPDATE sessions SET is_active = 0 WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    // إنشاء جلسة جديدة
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // صلاحية 30 يوم

    db.run(
      `INSERT INTO sessions (id, user_id, token, device_info, ip_address, is_active, expires_at) 
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [sessionId, userId, token, deviceInfo || null, ipAddress || null, expiresAt.toISOString()]
    );

    saveDatabase();
    console.log(`✅ New session created for user ${userId}, old sessions terminated`);

    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

// التحقق من صلاحية الجلسة
export const validateSession = (token: string): { valid: boolean; userId?: string; sessionId?: string } => {
  if (!db) return { valid: false };

  try {
    const result = db.exec(
      `SELECT id, user_id, is_active, expires_at FROM sessions 
       WHERE token = ? AND is_active = 1`,
      [token]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return { valid: false };
    }

    const session = rowToObject(result[0].columns, result[0].values[0]);

    // التحقق من انتهاء الصلاحية
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      // الجلسة منتهية
      db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [session.id]);
      saveDatabase();
      return { valid: false };
    }

    // تحديث آخر نشاط
    db.run(
      'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
      [session.id]
    );
    saveDatabase();

    return {
      valid: true,
      userId: session.user_id,
      sessionId: session.id
    };
  } catch (error) {
    console.error('Error validating session:', error);
    return { valid: false };
  }
};

// إنهاء جلسة محددة
export const terminateSession = (sessionId: string): boolean => {
  if (!db) return false;

  try {
    db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [sessionId]);
    saveDatabase();
    console.log(`✅ Session ${sessionId} terminated`);
    return true;
  } catch (error) {
    console.error('Error terminating session:', error);
    return false;
  }
};

// إنهاء جميع جلسات المستخدم
export const terminateAllUserSessions = (userId: string): boolean => {
  if (!db) return false;

  try {
    db.run('UPDATE sessions SET is_active = 0 WHERE user_id = ? AND is_active = 1', [userId]);
    saveDatabase();
    console.log(`✅ All sessions terminated for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error terminating user sessions:', error);
    return false;
  }
};

// الحصول على الجلسات النشطة للمستخدم
export const getUserActiveSessions = (userId: string): any[] => {
  if (!db) return [];

  try {
    const result = db.exec(
      `SELECT id, device_info, ip_address, created_at, last_activity 
       FROM sessions 
       WHERE user_id = ? AND is_active = 1 
       ORDER BY created_at DESC`,
      [userId]
    );

    if (result.length === 0) return [];

    return result[0].values.map((row: any) => rowToObject(result[0].columns, row));
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
};

// تنظيف الجلسات المنتهية (يمكن تشغيله دورياً)
export const cleanupExpiredSessions = (): number => {
  if (!db) return 0;

  try {
    const result = db.exec(
      `SELECT COUNT(*) as count FROM sessions 
       WHERE is_active = 1 AND expires_at < datetime('now')`
    );

    const count = result[0]?.values[0]?.[0] as number || 0;

    if (count > 0) {
      db.run(
        `UPDATE sessions SET is_active = 0 
         WHERE is_active = 1 AND expires_at < datetime('now')`
      );
      saveDatabase();
      console.log(`🧹 Cleaned up ${count} expired sessions`);
    }

    return count;
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return 0;
  }
};

export default db;

