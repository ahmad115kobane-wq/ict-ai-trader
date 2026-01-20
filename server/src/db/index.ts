// db/index.ts
// Database wrapper - يختار تلقائياً بين SQLite (تطوير) و PostgreSQL (إنتاج)

import * as sqliteDb from './database';
import * as postgresDb from './postgresOperations';

// تحديد نوع قاعدة البيانات
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
const dbType = isProduction ? 'postgres' : 'sqlite';

console.log(`🗄️ Database type: ${dbType.toUpperCase()}`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

// Wrapper functions to make SQLite async-compatible
const wrapSync = <T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => Promise<ReturnType<T>> => {
  return async (...args: Parameters<T>) => fn(...args);
};

// تصدير الدوال المناسبة (كلها async)
export const initDatabase = isProduction ? postgresDb.initDatabase : wrapSync(sqliteDb.initDatabase);
export const createUser = isProduction ? postgresDb.createUser : wrapSync(sqliteDb.createUser);
export const getUserByEmail = isProduction ? postgresDb.getUserByEmail : wrapSync(sqliteDb.getUserByEmail);
export const getUserById = isProduction ? postgresDb.getUserById : wrapSync(sqliteDb.getUserById);
export const updateUserCoins = isProduction ? postgresDb.updateUserCoins : wrapSync(sqliteDb.updateUserCoins);
export const deductCoins = isProduction ? postgresDb.deductCoins : wrapSync(sqliteDb.deductCoins);
export const addCoins = isProduction ? postgresDb.addCoins : wrapSync(sqliteDb.addCoins);
export const setUserAutoAnalysis = isProduction ? postgresDb.setUserAutoAnalysis : wrapSync(sqliteDb.setUserAutoAnalysis);
export const getUsersWithAutoAnalysisEnabled = isProduction ? postgresDb.getUsersWithAutoAnalysisEnabled : wrapSync(sqliteDb.getUsersWithAutoAnalysisEnabled);

// Push token operations
export const setUserPushToken = isProduction ? postgresDb.setUserPushToken : wrapSync(sqliteDb.setUserPushToken);
export const getUserPushToken = isProduction ? postgresDb.getUserPushToken : wrapSync(sqliteDb.getUserPushToken);
export const getUsersWithPushTokens = isProduction ? postgresDb.getUsersWithPushTokens : wrapSync(sqliteDb.getUsersWithPushTokens);
export const removeUserPushToken = isProduction ? postgresDb.removeUserPushToken : wrapSync(sqliteDb.removeUserPushToken);

// Analysis operations
export const saveAnalysis = isProduction ? postgresDb.saveAnalysis : wrapSync(sqliteDb.saveAnalysis);
export const getAnalysisHistory = isProduction ? postgresDb.getAnalysisHistory : wrapSync(sqliteDb.getAnalysisHistory);
export const saveEnhancedAnalysis = isProduction ? postgresDb.saveEnhancedAnalysis : wrapSync(sqliteDb.saveEnhancedAnalysis);
export const getEnhancedAnalysisHistory = isProduction ? postgresDb.getEnhancedAnalysisHistory : wrapSync(sqliteDb.getEnhancedAnalysisHistory);
export const getTradeHistory = isProduction ? postgresDb.getTradeHistory : wrapSync(sqliteDb.getTradeHistory);
export const getNoTradeAnalysis = isProduction ? postgresDb.getNoTradeAnalysis : wrapSync(sqliteDb.getNoTradeAnalysis);
export const updateTradeResult = isProduction ? postgresDb.updateTradeResult : wrapSync(sqliteDb.updateTradeResult);

// Auto analysis operations
export const saveAutoAnalysis = isProduction ? postgresDb.saveAutoAnalysis : wrapSync(sqliteDb.saveAutoAnalysis);
export const getLatestAutoAnalysis = isProduction ? postgresDb.getLatestAutoAnalysis : wrapSync(sqliteDb.getLatestAutoAnalysis);

// VIP packages operations
export const createVipPackage = isProduction ? postgresDb.createVipPackage : wrapSync(sqliteDb.createVipPackage);
export const getAllVipPackages = isProduction ? postgresDb.getAllVipPackages : wrapSync(sqliteDb.getAllVipPackages);
export const getVipPackageById = isProduction ? postgresDb.getVipPackageById : wrapSync(sqliteDb.getVipPackageById);

// Subscription operations
export const createUserSubscription = isProduction ? postgresDb.createUserSubscription : wrapSync(sqliteDb.createUserSubscription);
export const getUserActiveSubscription = isProduction ? postgresDb.getUserActiveSubscription : wrapSync(sqliteDb.getUserActiveSubscription);
export const getUserSubscriptionHistory = isProduction ? postgresDb.getUserSubscriptionHistory : wrapSync(sqliteDb.getUserSubscriptionHistory);
export const expireUserSubscription = isProduction ? postgresDb.expireUserSubscription : wrapSync(sqliteDb.expireUserSubscription);
export const getExpiredSubscriptions = isProduction ? postgresDb.getExpiredSubscriptions : wrapSync(sqliteDb.getExpiredSubscriptions);

// Analysis usage tracking
export const incrementAnalysisUsage = isProduction ? postgresDb.incrementAnalysisUsage : wrapSync(sqliteDb.incrementAnalysisUsage);
export const getUserDailyAnalysisCount = isProduction ? postgresDb.getUserDailyAnalysisCount : wrapSync(sqliteDb.getUserDailyAnalysisCount);
export const canUserAnalyze = isProduction ? postgresDb.canUserAnalyze : wrapSync(sqliteDb.canUserAnalyze);

// Session management
export const createSession = isProduction ? postgresDb.createSession : wrapSync(sqliteDb.createSession);
export const validateSession = isProduction ? postgresDb.validateSession : wrapSync(sqliteDb.validateSession);
export const terminateSession = isProduction ? postgresDb.terminateSession : wrapSync(sqliteDb.terminateSession);
export const terminateAllUserSessions = isProduction ? postgresDb.terminateAllUserSessions : wrapSync(sqliteDb.terminateAllUserSessions);
export const getUserActiveSessions = isProduction ? postgresDb.getUserActiveSessions : wrapSync(sqliteDb.getUserActiveSessions);
export const cleanupExpiredSessions = isProduction ? postgresDb.cleanupExpiredSessions : wrapSync(sqliteDb.cleanupExpiredSessions);
