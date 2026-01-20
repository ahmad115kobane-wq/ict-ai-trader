// db/postgresOperations.ts
// PostgreSQL operations implementation

import { initPostgres, query } from './postgresAdapter';
import { v4 as uuidv4 } from 'uuid';

// ===================== Initialization =====================
export const initDatabase = async (): Promise<void> => {
  await initPostgres();
};

// ===================== User Operations =====================
export const createUser = async (id: string, email: string, hashedPassword: string): Promise<void> => {
  await query(
    'INSERT INTO users (id, email, password, coins, subscription) VALUES ($1, $2, $3, 100, $4)',
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
    const result = await query('SELECT * FROM users WHERE auto_analysis_enabled = TRUE');
    return result.rows;
  } catch (error) {
    console.error('Error getting users with auto analysis:', error);
    return [];
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
    
    console.log(`✅ New session created for user ${userId}, old sessions terminated`);
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
