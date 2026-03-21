// src/services/apiService.ts
// خدمة API للتواصل مع السيرفر - باستخدام fetch

import * as SecureStore from 'expo-secure-store';
import { ENDPOINTS, API_BASE_URL } from '../config/api';

// متغير لتخزين التوكن في الذاكرة
let authToken: string | null = null;

// دالة للحصول على التوكن
export const getToken = async (): Promise<string | null> => {
  if (authToken) return authToken;
  try {
    authToken = await SecureStore.getItemAsync('authToken');
    return authToken;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// دالة لحفظ التوكن
export const setToken = async (token: string): Promise<void> => {
  authToken = token;
  await SecureStore.setItemAsync('authToken', token);
};

// دالة لحذف التوكن
export const removeToken = async (): Promise<void> => {
  authToken = null;
  await SecureStore.deleteItemAsync('authToken');
};

// دالة مساعدة للطلبات
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        await removeToken();
      }
      throw { response: { status: response.status, data } };
    }

    return data;
  } catch (error: any) {
    if (error.response) {
      throw error;
    }
    console.error('API Error:', error);
    throw { response: { status: 0, data: { error: 'Network error' } } };
  }
};

// ================== دوال المصادقة ==================

export const authService = {
  // تسجيل الدخول
  login: async (email: string, password: string) => {
    const response = await apiRequest(ENDPOINTS.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      await setToken(response.token);
    }
    return response;
  },

  // تسجيل حساب جديد
  register: async (email: string, password: string) => {
    const response = await apiRequest(ENDPOINTS.auth.register, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      await setToken(response.token);
    }
    return response;
  },

  // الحصول على بيانات المستخدم
  getMe: async () => {
    return await apiRequest(ENDPOINTS.auth.me);
  },

  // التحقق من صلاحية التوكن
  verifyToken: async () => {
    return await apiRequest(ENDPOINTS.auth.verifyToken);
  },

  // تسجيل توكن الإشعارات
  registerPushToken: async (pushToken: string) => {
    return await apiRequest(ENDPOINTS.auth.registerPushToken, {
      method: 'POST',
      body: JSON.stringify({ pushToken }),
    });
  },

  // إزالة توكن الإشعارات
  removePushToken: async () => {
    return await apiRequest(ENDPOINTS.auth.removePushToken, {
      method: 'POST',
    });
  },

  // تسجيل الخروج
  logout: async () => {
    try {
      // إيقاف التحليل التلقائي أولاً
      await apiRequest(ENDPOINTS.analysis.toggleAuto, {
        method: 'POST',
        body: JSON.stringify({ enabled: false }),
      });
    } catch (e) {
      console.log('Failed to disable auto analysis:', e);
    }

    try {
      // حذف Push Token من السيرفر قبل تسجيل الخروج
      await apiRequest(ENDPOINTS.auth.removePushToken, {
        method: 'POST',
      });
    } catch (e) {
      console.log('Failed to remove push token:', e);
    }

    try {
      await apiRequest(ENDPOINTS.auth.logout, { method: 'POST' });
    } catch (e) {
      // تجاهل الخطأ
    }

    await removeToken();
  },
};

// ================== دوال التحليل ==================

export const analysisService = {
  // الحصول على آخر تحليل تلقائي
  getLatestAuto: async () => {
    return await apiRequest(ENDPOINTS.analysis.latestAuto);
  },

  // تفعيل/إلغاء التحليل التلقائي
  toggleAutoAnalysis: async (enabled: boolean) => {
    return await apiRequest(ENDPOINTS.analysis.toggleAuto, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },

  // سجل التحليلات المحسن
  getEnhancedHistory: async (limit: number = 50) => {
    return await apiRequest(`${ENDPOINTS.analysis.enhancedHistory}?limit=${limit}`);
  },

  // سجل الصفقات
  getTradesHistory: async (limit: number = 20) => {
    return await apiRequest(`${ENDPOINTS.analysis.tradesHistory}?limit=${limit}`);
  },

  // الحصول على السعر الحالي
  getCurrentPrice: async (symbol: string = 'XAUUSD') => {
    return await apiRequest(`${ENDPOINTS.analysis.price}/${symbol}`);
  },

  // الحصول على بيانات الشموع
  getCandles: async (symbol: string, timeframe: string, count: number = 200) => {
    return await apiRequest(`${ENDPOINTS.analysis.candles}/${symbol}/${timeframe}?count=${count}`);
  },

  // الدردشة مع AI
  chat: async (message: string, analysis?: any, currentPrice?: number) => {
    return await apiRequest(ENDPOINTS.analysis.chat, {
      method: 'POST',
      body: JSON.stringify({ message, analysis, currentPrice }),
    });
  },

  // جلب التحليلات من الخادم
  getServerAnalyses: async (limit: number = 10) => {
    return await apiRequest(`${ENDPOINTS.analysis.serverAnalyses}?limit=${limit}`);
  },
};

// ================== دوال الاشتراكات ==================

export const subscriptionService = {
  // الحصول على الباقات المتاحة
  getPackages: async () => {
    return await apiRequest(ENDPOINTS.subscription.packages);
  },

  // الحصول على حالة الاشتراك
  getStatus: async () => {
    return await apiRequest(ENDPOINTS.subscription.status);
  },

  // شراء اشتراك (مع دعم كود الدعوة)
  purchase: async (packageId: string, referralCode?: string) => {
    return await apiRequest(ENDPOINTS.subscription.purchase, {
      method: 'POST',
      body: JSON.stringify({ packageId, referralCode: referralCode || undefined }),
    });
  },

  // سجل الاشتراكات
  getHistory: async () => {
    return await apiRequest(ENDPOINTS.subscription.history);
  },
};

// ================== دوال الملف الشخصي ==================

export const profileService = {
  // الحصول على الملف الشخصي
  getProfile: async () => {
    return await apiRequest(ENDPOINTS.profile.get);
  },

  // تحديث الملف الشخصي
  updateProfile: async (data: {
    fullName?: string;
    phone?: string;
    country?: string;
    bio?: string;
    dateOfBirth?: string;
    preferredLanguage?: string;
    tradingExperience?: string;
  }) => {
    return await apiRequest(ENDPOINTS.profile.update, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // تغيير كلمة المرور
  changePassword: async (currentPassword: string, newPassword: string) => {
    return await apiRequest(ENDPOINTS.profile.changePassword, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // إحصائيات التداول
  getTradingStats: async () => {
    return await apiRequest(ENDPOINTS.profile.tradingStats);
  },
};

// ================== دوال MT5 ==================

export const mt5Service = {
  // الاتصال بحساب MT5
  connect: async (data: { brokerServer: string; accountLogin: string; accountPassword: string }) => {
    return await apiRequest(ENDPOINTS.mt5.connect, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // قطع الاتصال
  disconnect: async (accountLogin: string) => {
    return await apiRequest(ENDPOINTS.mt5.disconnect, {
      method: 'POST',
      body: JSON.stringify({ accountLogin }),
    });
  },

  // حالة الاتصال
  getStatus: async (accountLogin: string) => {
    return await apiRequest(`${ENDPOINTS.mt5.status}/${accountLogin}`);
  },

  // جميع الحسابات
  getAccounts: async () => {
    return await apiRequest(ENDPOINTS.mt5.accounts);
  },
};

// ================== دوال الإحالة ==================

export const referralService = {
  // الحصول على كود الدعوة الخاص بي
  getMyCode: async () => {
    return await apiRequest(ENDPOINTS.referral.myCode);
  },

  // التحقق من كود الدعوة
  validateCode: async (referralCode: string, packageId: string) => {
    return await apiRequest(ENDPOINTS.referral.validate, {
      method: 'POST',
      body: JSON.stringify({ referralCode, packageId }),
    });
  },

  // لوحة إحصائيات الإحالة
  getDashboard: async () => {
    return await apiRequest(ENDPOINTS.referral.dashboard);
  },
};

// ================== دوال المؤشرات المخصصة ==================

export const indicatorService = {
  // جلب جميع المؤشرات
  getList: async () => {
    return await apiRequest(ENDPOINTS.indicators.list);
  },

  // جلب مؤشر واحد مع الكود
  getById: async (id: string) => {
    return await apiRequest(`${ENDPOINTS.indicators.get}/${id}`);
  },

  // جلب المؤشرات النشطة (مع الكود)
  getActiveList: async () => {
    return await apiRequest(ENDPOINTS.indicators.activeList);
  },

  // تفعيل/إلغاء تفعيل مؤشر
  toggle: async (id: string) => {
    return await apiRequest(`${ENDPOINTS.indicators.toggle}/${id}/toggle`, {
      method: 'POST',
    });
  },

  // حذف مؤشر
  deleteIndicator: async (id: string) => {
    return await apiRequest(`${ENDPOINTS.indicators.delete}/${id}`, {
      method: 'DELETE',
    });
  },

  // إنشاء/تعديل مؤشر بالذكاء الاصطناعي
  aiCreate: async (message: string, indicatorId?: string) => {
    return await apiRequest(ENDPOINTS.indicators.aiCreate, {
      method: 'POST',
      body: JSON.stringify({ message, indicatorId }),
    });
  },

  // جلب سجل محادثة مؤشر
  getChatHistory: async (id: string) => {
    return await apiRequest(`${ENDPOINTS.indicators.chat}/${id}/chat`);
  },
};

export default {
  authService,
  analysisService,
  subscriptionService,
  profileService,
  mt5Service,
  referralService,
  indicatorService,
  getToken,
  setToken,
  removeToken,
};

// ================== دوال الإشعارات ==================

export const notificationService = {
  // جلب إشعارات المستخدم
  getNotifications: async (limit: number = 50) => {
    return await apiRequest(`/api/notifications?limit=${limit}`);
  },

  // عدد الإشعارات غير المقروءة
  getUnreadCount: async () => {
    return await apiRequest('/api/notifications/unread-count');
  },

  // تعليم إشعار كمقروء
  markAsRead: async (notificationId: string) => {
    return await apiRequest(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  // تعليم جميع الإشعارات كمقروءة
  markAllAsRead: async () => {
    return await apiRequest('/api/notifications/mark-all-read', {
      method: 'POST',
    });
  },

  // حذف إشعار
  deleteNotification: async (notificationId: string) => {
    return await apiRequest(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
};
