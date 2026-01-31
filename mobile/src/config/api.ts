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
};
