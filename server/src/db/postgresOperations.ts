// db/postgresOperations.ts
// PostgreSQL operations implementation

import { initPostgres, query, getClient, getPool } from './postgresAdapter';
import { v4 as uuidv4 } from 'uuid';

// ===================== Initialization =====================
export const initDatabase = async (): Promise<void> => {
  await initPostgres();
};

// ===================== User Operations =====================
export const createUser = async (id: string, email: string, hashedPassword: string): Promise<void> => {
  await query(
    'INSERT INTO users (id, email, password, coins, subscription) VALUES ($1, $2, $3, 0, $4)',
    [id, email, hashedPassword, 'free']
  );
};

export const getUserByEmail = async (email: string): Promise<any> => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

export const getUserById = async (id: string): Promise<any> => {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const getAllUsers = async (): Promise<any[]> => {
  const result = await query('SELECT * FROM users');
  return result.rows || [];
};

export const updateUserCoins = async (userId: string, coins: number): Promise<void> => {
  await query(
    'UPDATE users SET coins = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [coins, userId]
  );
};

export const deductCoins = async (userId: string, amount: number): Promise<boolean> => {
  const user = await getUserById(userId);
  if (!user || user.coins < amount) return false;
  await updateUserCoins(userId, user.coins - amount);
  return true;
};

export const addCoins = async (userId: string, amount: number): Promise<boolean> => {
  const user = await getUserById(userId);
  if (!user) return false;
  await updateUserCoins(userId, user.coins + amount);
  return true;
};

export const setUserAutoAnalysis = async (userId: string, enabled: boolean): Promise<boolean> => {
  try {
    const timestamp = enabled ? new Date().toISOString() : null;
    await query(
      'UPDATE users SET auto_analysis_enabled = $1, auto_analysis_enabled_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [enabled, timestamp, userId]
    );
    console.log(`✅ User ${userId} auto analysis ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  } catch (error) {
    console.error('Error setting user auto analysis:', error);
    return false;
  }
};

export const getUsersWithAutoAnalysisEnabled = async (): Promise<any[]> => {
  try {
    // جلب المستخدمين الذين لديهم auto_analysis مفعل واشتراك مدفوع (ليس مجاني)
    const result = await query(`
      SELECT u.* 
      FROM users u
      WHERE u.auto_analysis_enabled = TRUE
        AND u.subscription IS NOT NULL 
        AND u.subscription != ''
        AND u.subscription != 'free'
        AND (u.subscription_expiry IS NULL OR u.subscription_expiry::timestamp > CURRENT_TIMESTAMP)
    `);
    console.log(`👥 Found ${result.rows.length} users with paid subscriptions and auto analysis enabled`);
    return result.rows;
  } catch (error) {
    console.error('Error getting users with auto analysis:', error);
    return [];
  }
};

// ===================== Push Token Operations =====================
export const setUserPushToken = async (userId: string, pushToken: string): Promise<boolean> => {
  try {
    await query(
      'UPDATE users SET push_token = $1, push_token_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [pushToken, userId]
    );
    console.log(`✅ Push token updated for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error setting push token:', error);
    return false;
  }
};

export const getUserPushToken = async (userId: string): Promise<string | null> => {
  try {
    const result = await query('SELECT push_token FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.push_token || null;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

export const getUsersWithPushTokens = async (): Promise<any[]> => {
  try {
    // أولاً: جلب جميع المستخدمين الذين لديهم push_token لفهم المشكلة
    const allWithTokens = await query(`
      SELECT id, email, subscription, subscription_expiry, auto_analysis_enabled, push_token IS NOT NULL as has_token
      FROM users
      WHERE push_token IS NOT NULL AND push_token != ''
    `);

    console.log(`📱 Users with push tokens: ${allWithTokens.rows.length}`);

    // تحليل كل مستخدم
    const now = new Date();
    for (const user of allWithTokens.rows) {
      const issues: string[] = [];

      if (!user.auto_analysis_enabled) {
        issues.push('auto_analysis disabled');
      }
      if (!user.subscription || user.subscription === '' || user.subscription === 'free') {
        issues.push('free/no subscription');
      }
      if (user.subscription_expiry) {
        const expiry = new Date(user.subscription_expiry);
        if (expiry <= now) {
          issues.push('subscription expired');
        }
      }

      if (issues.length > 0) {
        console.log(`  ⚠️ ${user.email}: excluded (${issues.join(', ')})`);
      }
    }

    // جلب المستخدمين المؤهلين فقط
    const result = await query(`
      SELECT u.id, u.email, u.push_token, u.subscription, u.subscription_expiry
      FROM users u
      WHERE u.push_token IS NOT NULL 
        AND u.push_token != '' 
        AND u.auto_analysis_enabled = TRUE
        AND u.subscription IS NOT NULL 
        AND u.subscription != ''
        AND u.subscription != 'free'
        AND (u.subscription_expiry IS NULL OR u.subscription_expiry::timestamp > CURRENT_TIMESTAMP)
    `);

    console.log(`📱 Eligible users for push notifications: ${result.rows.length}`);
    result.rows.forEach((u: any) => console.log(`  ✅ ${u.email}: ${u.subscription}`));

    return result.rows;
  } catch (error) {
    console.error('Error getting users with push tokens:', error);
    return [];
  }
};

export const removeUserPushToken = async (userId: string): Promise<boolean> => {
  try {
    await query(
      'UPDATE users SET push_token = NULL, push_token_updated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
    console.log(`✅ Push token removed for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error removing push token:', error);
    return false;
  }
};

export const removePushTokenByValue = async (pushToken: string): Promise<boolean> => {
  try {
    await query(
      'UPDATE users SET push_token = NULL, push_token_updated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE push_token = $1',
      [pushToken]
    );
    console.log(`✅ Push token removed by value: ${pushToken}`);
    return true;
  } catch (error) {
    console.error('Error removing push token by value:', error);
    return false;
  }
};

// ===================== Analysis Operations =====================
export const saveAnalysis = async (
  id: string,
  userId: string,
  symbol: string,
  decision: string,
  score: number,
  confidence: number,
  sentiment: string,
  suggestedTrade: string | null,
  reasoning: string
): Promise<void> => {
  await query(
    `INSERT INTO analysis_history (id, user_id, symbol, decision, score, confidence, sentiment, suggested_trade, reasoning)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, userId, symbol, decision, score, confidence, sentiment, suggestedTrade, reasoning]
  );
};

export const getAnalysisHistory = async (userId: string, limit: number = 50): Promise<any[]> => {
  const result = await query(
    `SELECT * FROM analysis_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

// ===================== Enhanced Analysis Operations =====================
export const saveEnhancedAnalysis = async (
  id: string,
  userId: string,
  symbol: string,
  currentPrice: number,
  analysis: any,
  analysisType: 'manual' | 'auto' = 'manual',
  h1ImagePath?: string,
  m5ImagePath?: string
): Promise<void> => {
  const suggestedTrade = analysis.suggestedTrade;

  // Parse rrRatio string (e.g., "1:4.0") to numeric value (e.g., 4.0)
  let rrRatioNumeric: number | null = null;
  if (suggestedTrade?.rrRatio) {
    const rrStr = String(suggestedTrade.rrRatio);
    const parts = rrStr.split(':');
    if (parts.length === 2) {
      rrRatioNumeric = parseFloat(parts[1]) || null;
    } else {
      rrRatioNumeric = parseFloat(rrStr) || null;
    }
  }

  await query(
    `INSERT INTO enhanced_analysis_history (
      id, user_id, symbol, current_price, decision, score, confidence, 
      sentiment, bias, reasoning, suggested_trade, trade_type, entry_price, 
      stop_loss, take_profit, risk_reward_ratio, expiry_minutes, 
      liquidity_sweep_detected, market_structure, key_levels, waiting_for, 
      reasons, analysis_type, h1_image_path, m5_image_path
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
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
      rrRatioNumeric,
      suggestedTrade?.expiryMinutes || null,
      analysis.liquiditySweepDetected || false,
      analysis.marketStructure || '',
      analysis.keyLevels ? JSON.stringify(analysis.keyLevels) : null,
      analysis.waitingFor ? JSON.stringify(analysis.waitingFor) : null,
      analysis.reasons ? JSON.stringify(analysis.reasons) : null,
      analysisType,
      h1ImagePath || null,
      m5ImagePath || null
    ]
  );
};

export const getEnhancedAnalysisHistory = async (userId: string, limit: number = 50): Promise<any[]> => {
  try {
    const result = await query(
      `SELECT * FROM enhanced_analysis_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row: any) => {
      // تحويل JSON strings إلى objects
      if (row.suggested_trade && typeof row.suggested_trade === 'string') {
        try {
          row.suggested_trade = JSON.parse(row.suggested_trade);
        } catch (e) {
          row.suggested_trade = null;
        }
      }

      if (row.key_levels && typeof row.key_levels === 'string') {
        try {
          row.key_levels = JSON.parse(row.key_levels);
        } catch (e) {
          row.key_levels = [];
        }
      }

      if (row.waiting_for && typeof row.waiting_for === 'string') {
        try {
          row.waiting_for = JSON.parse(row.waiting_for);
        } catch (e) {
          row.waiting_for = null;
        }
      }

      if (row.reasons && typeof row.reasons === 'string') {
        try {
          row.reasons = JSON.parse(row.reasons);
        } catch (e) {
          row.reasons = [];
        }
      }

      return row;
    });
  } catch (error) {
    console.error('Error getting enhanced analysis history:', error);
    return [];
  }
};

export const getTradeHistory = async (userId: string, limit: number = 20): Promise<any[]> => {
  try {
    const result = await query(
      `SELECT * FROM enhanced_analysis_history 
       WHERE user_id = $1 AND decision = 'PLACE_PENDING' AND suggested_trade IS NOT NULL
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row: any) => {
      if (row.suggested_trade && typeof row.suggested_trade === 'string') {
        try {
          row.suggested_trade = JSON.parse(row.suggested_trade);
        } catch (e) {
          row.suggested_trade = null;
        }
      }
      return row;
    });
  } catch (error) {
    console.error('Error getting trade history:', error);
    return [];
  }
};

export const getNoTradeAnalysis = async (userId: string, limit: number = 20): Promise<any[]> => {
  try {
    const result = await query(
      `SELECT * FROM enhanced_analysis_history 
       WHERE user_id = $1 AND decision = 'NO_TRADE'
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row: any) => {
      if (row.reasons && typeof row.reasons === 'string') {
        try {
          row.reasons = JSON.parse(row.reasons);
        } catch (e) {
          row.reasons = [];
        }
      }

      if (row.waiting_for && typeof row.waiting_for === 'string') {
        try {
          row.waiting_for = JSON.parse(row.waiting_for);
        } catch (e) {
          row.waiting_for = null;
        }
      }

      return row;
    });
  } catch (error) {
    console.error('Error getting no-trade analysis:', error);
    return [];
  }
};

export const updateTradeResult = async (analysisId: string, result: string, pnl?: number): Promise<void> => {
  await query(
    `UPDATE enhanced_analysis_history 
     SET is_trade_executed = TRUE, trade_result = $1, pnl = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3`,
    [result, pnl || 0, analysisId]
  );
};

// ===================== Auto Analysis Operations =====================
export const saveAutoAnalysis = async (
  id: string,
  symbol: string,
  h1Image: string,
  m5Image: string,
  currentPrice: number,
  decision: string,
  score: number,
  confidence: number,
  suggestedTrade: string | null
): Promise<void> => {
  await query(
    `INSERT INTO auto_analysis (id, symbol, current_price, decision, score, confidence, suggested_trade)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, symbol, currentPrice, decision, score, confidence, suggestedTrade]
  );
};

export const getLatestAutoAnalysis = async (symbol: string): Promise<any> => {
  const result = await query(
    `SELECT * FROM auto_analysis WHERE symbol = $1 ORDER BY created_at DESC LIMIT 1`,
    [symbol]
  );
  return result.rows[0] || null;
};

// ===================== VIP Packages Operations =====================
export const createVipPackage = async (
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
): Promise<void> => {
  await query(
    `INSERT INTO vip_packages (id, name, name_ar, description, description_ar, duration_type, duration_days, price, coins_included, analysis_limit, features)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, name, nameAr, description, descriptionAr, durationType, durationDays, price, coinsIncluded, analysisLimit, JSON.stringify(features)]
  );
};

export const getAllVipPackages = async (): Promise<any[]> => {
  const result = await query('SELECT * FROM vip_packages WHERE is_active = TRUE ORDER BY price ASC');
  return result.rows.map((row: any) => {
    if (row.features && typeof row.features === 'string') {
      try {
        row.features = JSON.parse(row.features);
      } catch (e) {
        row.features = [];
      }
    }
    return row;
  });
};

export const getVipPackageById = async (id: string): Promise<any> => {
  const result = await query('SELECT * FROM vip_packages WHERE id = $1 AND is_active = TRUE', [id]);
  const pkg = result.rows[0] || null;
  if (pkg && pkg.features && typeof pkg.features === 'string') {
    try {
      pkg.features = JSON.parse(pkg.features);
    } catch (e) {
      pkg.features = [];
    }
  }
  return pkg;
};

// ===================== Subscription Operations =====================
export const createUserSubscription = async (
  id: string,
  userId: string,
  packageId: string,
  planName: string,
  coinsAdded: number,
  price: number,
  analysisLimit: number,
  expiresAt: string,
  autoRenew: boolean = false
): Promise<void> => {
  await query(
    `INSERT INTO subscriptions (id, user_id, package_id, plan_name, plan, coins_added, price, analysis_limit, expires_at, auto_renew, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')`,
    [id, userId, packageId, planName, planName, coinsAdded, price, analysisLimit, expiresAt, autoRenew]
  );

  // Update user data
  const user = await getUserById(userId);
  if (user) {
    await query(
      `UPDATE users SET subscription = $1, subscription_expiry = $2, coins = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [planName, expiresAt, user.coins + coinsAdded, userId]
    );
  }
};

export const getUserActiveSubscription = async (userId: string): Promise<any> => {
  try {
    const result = await query(
      `SELECT s.*, p.name_ar as package_name_ar, p.features 
       FROM subscriptions s 
       LEFT JOIN vip_packages p ON s.package_id = p.id 
       WHERE s.user_id = $1 AND s.status = 'active' AND s.expires_at > CURRENT_TIMESTAMP 
       ORDER BY s.started_at DESC LIMIT 1`,
      [userId]
    );

    const subscription = result.rows[0] || null;
    if (subscription && subscription.features && typeof subscription.features === 'string') {
      try {
        subscription.features = JSON.parse(subscription.features);
      } catch (e) {
        subscription.features = [];
      }
    }
    return subscription;
  } catch (error) {
    console.error('Error getting active subscription:', error);
    return null;
  }
};

export const getUserSubscriptionHistory = async (userId: string, limit: number = 10): Promise<any[]> => {
  try {
    const result = await query(
      `SELECT s.*, p.name_ar as package_name_ar 
       FROM subscriptions s 
       LEFT JOIN vip_packages p ON s.package_id = p.id 
       WHERE s.user_id = $1 
       ORDER BY s.started_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting subscription history:', error);
    return [];
  }
};

export const expireUserSubscription = async (userId: string): Promise<void> => {
  await query(
    `UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  await query(
    `UPDATE users SET subscription = 'free', subscription_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [userId]
  );
};

export const getExpiredSubscriptions = async (): Promise<any[]> => {
  try {
    const result = await query(
      `SELECT user_id, plan_name, expires_at 
       FROM subscriptions 
       WHERE status = 'active' AND expires_at <= CURRENT_TIMESTAMP`
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting expired subscriptions:', error);
    return [];
  }
};

// ===================== Analysis Usage Tracking =====================
export const incrementAnalysisUsage = async (userId: string): Promise<boolean> => {
  const today = new Date().toISOString().split('T')[0];

  try {
    // محاولة إدراج سجل جديد
    await query(
      `INSERT INTO analysis_usage (id, user_id, analysis_date, analysis_count) 
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_id, analysis_date) 
       DO UPDATE SET analysis_count = analysis_usage.analysis_count + 1`,
      [uuidv4(), userId, today]
    );
    return true;
  } catch (error) {
    console.error('Failed to increment analysis usage:', error);
    return true;
  }
};

export const getUserDailyAnalysisCount = async (userId: string): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT analysis_count FROM analysis_usage WHERE user_id = $1 AND analysis_date = $2`,
      [userId, today]
    );
    return result.rows[0]?.analysis_count || 0;
  } catch (error) {
    console.error('Failed to get daily analysis count:', error);
    return 0;
  }
};

export const canUserAnalyze = async (userId: string): Promise<{ canAnalyze: boolean; reason?: string; remainingAnalyses?: number }> => {
  const user = await getUserById(userId);
  if (!user) {
    return { canAnalyze: false, reason: 'المستخدم غير موجود' };
  }

  const activeSubscription = await getUserActiveSubscription(userId);

  if (!activeSubscription) {
    if (user.coins < 50) {
      return { canAnalyze: false, reason: 'رصيد العملات غير كافٍ (مطلوب 50 عملة)' };
    }
    return { canAnalyze: true };
  }

  if (activeSubscription.analysis_limit === -1) {
    return { canAnalyze: true };
  }

  const dailyUsage = await getUserDailyAnalysisCount(userId);
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

// ===================== Session Management =====================
export const createSession = async (userId: string, token: string, deviceInfo?: string, ipAddress?: string): Promise<string> => {
  try {
    // إزالة push token من الجهاز القديم لمنع استلام الإشعارات
    await query(
      'UPDATE users SET push_token = NULL, push_token_updated_at = NULL WHERE id = $1',
      [userId]
    );
    console.log(`📱 Push token removed for user ${userId} (new session starting)`);

    // إنهاء جميع الجلسات النشطة القديمة
    await query(
      'UPDATE sessions SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );

    // إنشاء جلسة جديدة
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await query(
      `INSERT INTO sessions (id, user_id, token, device_info, ip_address, is_active, expires_at) 
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)`,
      [sessionId, userId, token, deviceInfo || null, ipAddress || null, expiresAt.toISOString()]
    );

    console.log(`✅ New session created for user ${userId}, old sessions terminated, push token cleared`);
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const validateSession = async (token: string): Promise<{ valid: boolean; userId?: string; sessionId?: string }> => {
  try {
    const result = await query(
      `SELECT id, user_id, is_active, expires_at FROM sessions 
       WHERE token = $1 AND is_active = TRUE`,
      [token]
    );

    const session = result.rows[0];
    if (!session) {
      return { valid: false };
    }

    // التحقق من انتهاء الصلاحية
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      await query('UPDATE sessions SET is_active = FALSE WHERE id = $1', [session.id]);
      return { valid: false };
    }

    // تحديث آخر نشاط
    await query(
      'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
      [session.id]
    );

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

export const terminateSession = async (sessionId: string): Promise<boolean> => {
  try {
    await query('UPDATE sessions SET is_active = FALSE WHERE id = $1', [sessionId]);
    console.log(`✅ Session ${sessionId} terminated`);
    return true;
  } catch (error) {
    console.error('Error terminating session:', error);
    return false;
  }
};

export const terminateAllUserSessions = async (userId: string): Promise<boolean> => {
  try {
    await query('UPDATE sessions SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE', [userId]);
    console.log(`✅ All sessions terminated for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error terminating user sessions:', error);
    return false;
  }
};

export const getUserActiveSessions = async (userId: string): Promise<any[]> => {
  try {
    const result = await query(
      `SELECT id, device_info, ip_address, created_at, last_activity 
       FROM sessions 
       WHERE user_id = $1 AND is_active = TRUE 
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
};

export const cleanupExpiredSessions = async (): Promise<number> => {
  try {
    const result = await query(
      `UPDATE sessions SET is_active = FALSE 
       WHERE is_active = TRUE AND expires_at < CURRENT_TIMESTAMP
       RETURNING id`
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      console.log(`🧹 Cleaned up ${count} expired sessions`);
    }
    return count;
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return 0;
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// 📊 Position Management Functions - إدارة الصفقات على الخادم
// ═══════════════════════════════════════════════════════════════════════════════

// الحصول على جميع الصفقات المفتوحة
export const getAllOpenPositions = async (): Promise<any[]> => {
  const pool = getPool();
  if (!pool) throw new Error('PostgreSQL not initialized');
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT p.*, u.balance 
      FROM paper_positions p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'open'
      ORDER BY p.opened_at DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error getting open positions:', error);
    return [];
  } finally {
    client.release();
  }
};

// إغلاق صفقة في قاعدة البيانات
export const closePositionInDb = async (
  positionId: string,
  closePrice: number,
  realizedPnl: number,
  reason: string
): Promise<void> => {
  const pool = getPool();
  if (!pool) throw new Error('PostgreSQL not initialized');
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE paper_positions 
      SET status = 'closed',
          close_price = $1,
          realized_pnl = $2,
          closed_at = NOW(),
          close_reason = $3
      WHERE id = $4
    `, [closePrice, realizedPnl, reason, positionId]);
  } catch (error) {
    console.error('Error closing position:', error);
    throw error;
  } finally {
    client.release();
  }
};

// تحديث رصيد المستخدم
export const updateUserBalance = async (userId: string, newBalance: number): Promise<void> => {
  const pool = getPool();
  if (!pool) throw new Error('PostgreSQL not initialized');
  const client = await pool.connect();
  try {
    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw error;
  } finally {
    client.release();
  }
};

// فتح صفقة جديدة
export const openPositionInDb = async (
  userId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  lotSize: number,
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): Promise<string> => {
  const pool = getPool();
  if (!pool) throw new Error('PostgreSQL not initialized');
  const client = await pool.connect();
  const positionId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    await client.query(`
      INSERT INTO paper_positions (
        id, user_id, symbol, side, lot_size, 
        entry_price, stop_loss, take_profit, 
        opened_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'open')
    `, [positionId, userId, symbol, side, lotSize, entryPrice, stopLoss, takeProfit]);
    
    return positionId;
  } catch (error) {
    console.error('Error opening position:', error);
    throw error;
  } finally {
    client.release();
  }
};

// الحصول على صفقات مستخدم معين
export const getUserOpenPositions = async (userId: string): Promise<any[]> => {
  const pool = getPool();
  if (!pool) throw new Error('PostgreSQL not initialized');
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM paper_positions 
      WHERE user_id = $1 AND status = 'open'
      ORDER BY opened_at DESC
    `, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting user positions:', error);
    return [];
  } finally {
    client.release();
  }
};

// الحصول على صفقات مستخدم المغلقة
export const getUserClosedPositions = async (userId: string, limit: number = 50): Promise<any[]> => {
  const pool = getPool();
  if (!pool) throw new Error('PostgreSQL not initialized');
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM paper_positions 
      WHERE user_id = $1 AND status = 'closed'
      ORDER BY closed_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error getting closed positions:', error);
    return [];
  } finally {
    client.release();
  }
};

// تحديث SL/TP لصفقة
export const updatePositionSlTp = async (
  positionId: string,
  stopLoss?: number,
  takeProfit?: number
): Promise<void> => {
  const pool = getPool();
  if (!pool) throw new Error('PostgreSQL not initialized');
  const client = await pool.connect();
  try {
    if (stopLoss !== undefined && takeProfit !== undefined) {
      await client.query(`
        UPDATE paper_positions 
        SET stop_loss = $1, take_profit = $2
        WHERE id = $3 AND status = 'open'
      `, [stopLoss, takeProfit, positionId]);
    } else if (stopLoss !== undefined) {
      await client.query(`
        UPDATE paper_positions 
        SET stop_loss = $1
        WHERE id = $2 AND status = 'open'
      `, [stopLoss, positionId]);
    } else if (takeProfit !== undefined) {
      await client.query(`
        UPDATE paper_positions 
        SET take_profit = $1
        WHERE id = $2 AND status = 'open'
      `, [takeProfit, positionId]);
    }
  } catch (error) {
    console.error('Error updating position SL/TP:', error);
    throw error;
  } finally {
    client.release();
  }
};

// الحصول على صفقة واحدة
export const getPositionById = async (positionId: string): Promise<any> => {
  const pool = getPool();
  if (!pool) throw new Error('PostgreSQL not initialized');
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM paper_positions WHERE id = $1', [positionId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting position:', error);
    return null;
  } finally {
    client.release();
  }
};

// ===================== Referral System Operations =====================

// تعيين كود دعوة للمستخدم
export const setUserReferralCode = async (userId: string, code: string): Promise<boolean> => {
  try {
    await query(
      'UPDATE users SET referral_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [code, userId]
    );
    return true;
  } catch (error) {
    console.error('Error setting referral code:', error);
    return false;
  }
};

// الحصول على كود دعوة المستخدم
export const getUserReferralCode = async (userId: string): Promise<string | null> => {
  try {
    const result = await query('SELECT referral_code FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.referral_code || null;
  } catch (error) {
    console.error('Error getting referral code:', error);
    return null;
  }
};

// البحث عن مستخدم بكود الدعوة
export const getUserByReferralCode = async (code: string): Promise<any> => {
  try {
    const result = await query('SELECT * FROM users WHERE referral_code = $1', [code]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by referral code:', error);
    return null;
  }
};

// تسجيل استخدام كود دعوة
export const createReferralUsage = async (
  id: string,
  referralCode: string,
  referrerId: string,
  referredId: string,
  packageId: string,
  packageName: string,
  originalPrice: number,
  discountPercent: number,
  discountAmount: number,
  finalPrice: number,
  rewardAmount: number
): Promise<void> => {
  await query(
    `INSERT INTO referral_usage (id, referral_code, referrer_id, referred_id, package_id, package_name, original_price, discount_percent, discount_amount, final_price, reward_amount, reward_paid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)`,
    [id, referralCode, referrerId, referredId, packageId, packageName, originalPrice, discountPercent, discountAmount, finalPrice, rewardAmount]
  );
};

// إضافة مكافأة الإحالة لصاحب الكود
export const addReferralReward = async (userId: string, amount: number): Promise<boolean> => {
  try {
    await query(
      `UPDATE users SET 
        coins = coins + $1, 
        referral_balance = COALESCE(referral_balance, 0) + $1, 
        total_referral_earnings = COALESCE(total_referral_earnings, 0) + $1,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [amount, userId]
    );
    return true;
  } catch (error) {
    console.error('Error adding referral reward:', error);
    return false;
  }
};

// الحصول على إحصائيات الإحالة للمستخدم
export const getUserReferralStats = async (userId: string): Promise<any> => {
  try {
    const userResult = await query(
      'SELECT referral_code, referral_balance, total_referral_earnings FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    const usageResult = await query(
      `SELECT COUNT(*) as total_referrals, SUM(reward_amount) as total_earned
       FROM referral_usage WHERE referrer_id = $1`,
      [userId]
    );
    const stats = usageResult.rows[0];

    const recentResult = await query(
      `SELECT ru.*, u.email as referred_email
       FROM referral_usage ru
       LEFT JOIN users u ON ru.referred_id = u.id
       WHERE ru.referrer_id = $1
       ORDER BY ru.created_at DESC LIMIT 10`,
      [userId]
    );

    return {
      referralCode: user?.referral_code,
      referralBalance: user?.referral_balance || 0,
      totalEarnings: user?.total_referral_earnings || 0,
      totalReferrals: parseInt(stats?.total_referrals || '0'),
      recentReferrals: recentResult.rows
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return null;
  }
};

// التحقق من أن المستخدم لم يستخدم كود دعوة من قبل لنفس الباقة
export const hasUsedReferralForPackage = async (userId: string, packageId: string): Promise<boolean> => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM referral_usage WHERE referred_id = $1 AND package_id = $2',
      [userId, packageId]
    );
    return parseInt(result.rows[0]?.count || '0') > 0;
  } catch (error) {
    console.error('Error checking referral usage:', error);
    return false;
  }
};

// الحصول على سجل إحالات المستخدم
export const getUserReferralHistory = async (userId: string, limit: number = 20): Promise<any[]> => {
  try {
    const result = await query(
      `SELECT ru.*, u.email as referred_email
       FROM referral_usage ru
       LEFT JOIN users u ON ru.referred_id = u.id
       WHERE ru.referrer_id = $1
       ORDER BY ru.created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting referral history:', error);
    return [];
  }
};

// التحقق من صلاحية كود الدعوة
export const validateReferralCode = async (code: string, userId: string): Promise<{ valid: boolean; message: string; referrer?: any }> => {
  try {
    // البحث عن صاحب الكود
    const referrer = await getUserByReferralCode(code);
    if (!referrer) {
      return { valid: false, message: 'كود الدعوة غير صالح' };
    }

    // لا يمكن استخدام كودك الخاص
    if (referrer.id === userId) {
      return { valid: false, message: 'لا يمكنك استخدام كود الدعوة الخاص بك' };
    }

    return { valid: true, message: 'كود الدعوة صالح', referrer };
  } catch (error) {
    console.error('Error validating referral code:', error);
    return { valid: false, message: 'خطأ في التحقق من كود الدعوة' };
  }
};
