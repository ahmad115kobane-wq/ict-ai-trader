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

// تصدير الدوال المناسبة
export const initDatabase = isProduction ? postgresDb.initDatabase : sqliteDb.initDatabase;
export const createUser = isProduction ? postgresDb.createUser : sqliteDb.createUser;
export const getUserByEmail = isProduction ? postgresDb.getUserByEmail : sqliteDb.getUserByEmail;
export const getUserById = isProduction ? postgresDb.getUserById : sqliteDb.getUserById;
export const updateUserCoins = isProduction ? postgresDb.updateUserCoins : sqliteDb.updateUserCoins;
export const deductCoins = isProduction ? postgresDb.deductCoins : sqliteDb.deductCoins;
export const addCoins = isProduction ? postgresDb.addCoins : sqliteDb.addCoins;
export const setUserAutoAnalysis = isProduction ? postgresDb.setUserAutoAnalysis : sqliteDb.setUserAutoAnalysis;
export const getUsersWithAutoAnalysisEnabled = isProduction ? postgresDb.getUsersWithAutoAnalysisEnabled : sqliteDb.getUsersWithAutoAnalysisEnabled;

// Analysis operations
export const saveAnalysis = isProduction ? postgresDb.saveAnalysis : sqliteDb.saveAnalysis;
export const getAnalysisHistory = isProduction ? postgresDb.getAnalysisHistory : sqliteDb.getAnalysisHistory;
export const saveEnhancedAnalysis = isProduction ? postgresDb.saveEnhancedAnalysis : sqliteDb.saveEnhancedAnalysis;
export const getEnhancedAnalysisHistory = isProduction ? postgresDb.getEnhancedAnalysisHistory : sqliteDb.getEnhancedAnalysisHistory;
export const getTradeHistory = isProduction ? postgresDb.getTradeHistory : sqliteDb.getTradeHistory;
export const getNoTradeAnalysis = isProduction ? postgresDb.getNoTradeAnalysis : sqliteDb.getNoTradeAnalysis;
export const updateTradeResult = isProduction ? postgresDb.updateTradeResult : sqliteDb.updateTradeResult;

// Auto analysis operations
export const saveAutoAnalysis = isProduction ? postgresDb.saveAutoAnalysis : sqliteDb.saveAutoAnalysis;
export const getLatestAutoAnalysis = isProduction ? postgresDb.getLatestAutoAnalysis : sqliteDb.getLatestAutoAnalysis;

// VIP packages operations
export const createVipPackage = isProduction ? postgresDb.createVipPackage : sqliteDb.createVipPackage;
export const getAllVipPackages = isProduction ? postgresDb.getAllVipPackages : sqliteDb.getAllVipPackages;
export const getVipPackageById = isProduction ? postgresDb.getVipPackageById : sqliteDb.getVipPackageById;

// Subscription operations
export const createUserSubscription = isProduction ? postgresDb.createUserSubscription : sqliteDb.createUserSubscription;
export const getUserActiveSubscription = isProduction ? postgresDb.getUserActiveSubscription : sqliteDb.getUserActiveSubscription;
export const getUserSubscriptionHistory = isProduction ? postgresDb.getUserSubscriptionHistory : sqliteDb.getUserSubscriptionHistory;
export const expireUserSubscription = isProduction ? postgresDb.expireUserSubscription : sqliteDb.expireUserSubscription;
export const getExpiredSubscriptions = isProduction ? postgresDb.getExpiredSubscriptions : sqliteDb.getExpiredSubscriptions;

// Analysis usage tracking
export const incrementAnalysisUsage = isProduction ? postgresDb.incrementAnalysisUsage : sqliteDb.incrementAnalysisUsage;
export const getUserDailyAnalysisCount = isProduction ? postgresDb.getUserDailyAnalysisCount : sqliteDb.getUserDailyAnalysisCount;
export const canUserAnalyze = isProduction ? postgresDb.canUserAnalyze : sqliteDb.canUserAnalyze;

// Session management
export const createSession = isProduction ? postgresDb.createSession : sqliteDb.createSession;
export const validateSession = isProduction ? postgresDb.validateSession : sqliteDb.validateSession;
export const terminateSession = isProduction ? postgresDb.terminateSession : sqliteDb.terminateSession;
export const terminateAllUserSessions = isProduction ? postgresDb.terminateAllUserSessions : sqliteDb.terminateAllUserSessions;
export const getUserActiveSessions = isProduction ? postgresDb.getUserActiveSessions : sqliteDb.getUserActiveSessions;
export const cleanupExpiredSessions = isProduction ? postgresDb.cleanupExpiredSessions : sqliteDb.cleanupExpiredSessions;
