// src/config/api.ts
// تكوين API والاتصال بالسيرفر

// عنوان السيرفر على Railway
export const API_BASE_URL = 'https://ict-ai-trader-production.up.railway.app';

// إعدادات API
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 ثانية
  headers: {
    'Content-Type': 'application/json',
  },
};

// نقاط النهاية
export const ENDPOINTS = {
  // المصادقة
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
    verifyToken: '/api/auth/verify-token',
    refreshToken: '/api/auth/refresh-token',
    registerPushToken: '/api/auth/register-push-token',
    removePushToken: '/api/auth/remove-push-token',
    logout: '/api/auth/logout',
  },
  // التحليل
  analysis: {
    latestAuto: '/api/analysis/latest-auto',
    toggleAuto: '/api/analysis/toggle-auto',
    enhancedHistory: '/api/analysis/enhanced-history',
    tradesHistory: '/api/analysis/trades-history',
    price: '/api/analysis/price',
    candles: '/api/analysis/candles',
    chat: '/api/analysis/chat',
    serverAnalyses: '/api/analysis/server-analyses',
  },
  // الاشتراكات
  subscription: {
    packages: '/api/subscription/packages',
    status: '/api/subscription/status',
    purchase: '/api/subscription/purchase',
    history: '/api/subscription/history',
    addCoins: '/api/subscription/add-coins',
  },
  // الإشعارات
  notifications: {
    list: '/api/notifications',
    unreadCount: '/api/notifications/unread-count',
    markAsRead: '/api/notifications/:id/read',
    markAllAsRead: '/api/notifications/mark-all-read',
    delete: '/api/notifications/:id',
  },
  // المؤشرات المخصصة
  indicators: {
    list: '/api/indicators/list',
    get: '/api/indicators',
    activeList: '/api/indicators/active/list',
    toggle: '/api/indicators',
    delete: '/api/indicators',
    aiCreate: '/api/indicators/ai/create',
    chat: '/api/indicators',
  },
  // الإحالة
  referral: {
    myCode: '/api/referral/my-code',
    validate: '/api/referral/validate',
    dashboard: '/api/referral/dashboard',
  },
  // MT5
  mt5: {
    connect: '/api/mt5/connect',
    disconnect: '/api/mt5/disconnect',
    status: '/api/mt5/status', // + /:accountLogin
    accounts: '/api/mt5/accounts',
  },
  // الملف الشخصي
  profile: {
    get: '/api/profile',
    update: '/api/profile/update',
    changePassword: '/api/profile/change-password',
    tradingStats: '/api/profile/trading-stats',
  },
};
