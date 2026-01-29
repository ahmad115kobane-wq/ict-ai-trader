# 📱 دليل برمجة الاتصال بين التطبيق والـ Backend

## 🎯 نظرة عامة

هذا الدليل يشرح كيفية بناء طبقة الاتصال (API Layer) بين تطبيق React Native والـ Backend بطريقة احترافية.

---

## 📁 هيكل المشروع المقترح

```
mobile/
├── src/
│   ├── api/
│   │   ├── client.js          # HTTP Client الأساسي
│   │   ├── auth.js            # Authentication APIs
│   │   ├── analysis.js        # Analysis APIs
│   │   ├── subscription.js    # Subscription APIs
│   │   └── index.js           # Export all APIs
│   ├── services/
│   │   ├── authService.js     # Auth logic & token management
│   │   └── notificationService.js  # Push notifications
│   ├── utils/
│   │   ├── storage.js         # AsyncStorage wrapper
│   │   └── constants.js       # API URLs & constants
│   └── contexts/
│       └── AuthContext.js     # Global auth state
```

---

## 🔧 الخطوة 1: إعداد الثوابت


**`src/utils/constants.js`**
```javascript
// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000'  // للتطوير المحلي
    : 'https://your-railway-domain.railway.app',  // للإنتاج
  
  TIMEOUT: 30000, // 30 seconds
  
  ENDPOINTS: {
    // Auth
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
    REGISTER_PUSH: '/api/auth/register-push-token',
    REMOVE_PUSH: '/api/auth/remove-push-token',
    
    // Analysis
    LATEST_AUTO: '/api/analysis/latest-auto',
    TOGGLE_AUTO: '/api/analysis/toggle-auto',
    TRADES_HISTORY: '/api/analysis/trades-history',
    NO_TRADES_HISTORY: '/api/analysis/no-trades-history',
    PRICE: '/api/analysis/price',
    
    // Subscription
    PACKAGES: '/api/subscription/packages',
    PURCHASE: '/api/subscription/purchase',
    STATUS: '/api/subscription/status',
    HISTORY: '/api/subscription/history'
  }
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  PUSH_TOKEN: '@push_token'
};
```

---

## 🔧 الخطوة 2: إعداد Storage Wrapper

**`src/utils/storage.js`**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

class Storage {
  // حفظ التوكن
  async saveToken(token) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  }

  // جلب التوكن
  async getToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // حذف التوكن
  async removeToken() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      return true;
    } catch (error) {
      console.error('Error removing token:', error);
      return false;
    }
  }

  // حفظ بيانات المستخدم
  async saveUser(userData) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA, 
        JSON.stringify(userData)
      );
      return true;
    } catch (error) {
      console.error('Error saving user:', error);
      return false;
    }
  }

  // جلب بيانات المستخدم
  async getUser() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // حذف بيانات المستخدم
  async removeUser() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      return true;
    } catch (error) {
      console.error('Error removing user:', error);
      return false;
    }
  }

  // مسح كل البيانات
  async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.PUSH_TOKEN
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
}

export default new Storage();
```

---

## 🔧 الخطوة 3: إنشاء HTTP Client

**`src/api/client.js`**
```javascript
import axios from 'axios';
import { API_CONFIG } from '../utils/constants';
import Storage from '../utils/storage';

// إنشاء Axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor - إضافة التوكن تلقائياً
apiClient.interceptors.request.use(
  async (config) => {
    const token = await Storage.getToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('📤 Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor - معالجة الأخطاء
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.url, response.status);
    return response.data;
  },
  async (error) => {
    console.error('❌ Response Error:', error.response?.status, error.message);
    
    // معالجة خطأ 401 (Unauthorized)
    if (error.response?.status === 401) {
      // حذف التوكن وتوجيه للـ Login
      await Storage.clearAll();
      // يمكنك هنا استدعاء navigation للذهاب لصفحة Login
      // NavigationService.navigate('Login');
    }
    
    // إرجاع رسالة خطأ واضحة
    const errorMessage = error.response?.data?.error || 
                        error.message || 
                        'حدث خطأ غير متوقع';
    
    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;
```

---


## 🔧 الخطوة 4: Authentication APIs

**`src/api/auth.js`**
```javascript
import apiClient from './client';
import { API_CONFIG } from '../utils/constants';

const AuthAPI = {
  // تسجيل مستخدم جديد
  register: async (email, password) => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.REGISTER, {
        email,
        password
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // تسجيل الدخول
  login: async (email, password) => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.LOGIN, {
        email,
        password
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // جلب بيانات المستخدم الحالي
  getMe: async () => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.ME);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // تسجيل Push Token
  registerPushToken: async (pushToken) => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.REGISTER_PUSH, {
        pushToken
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // إزالة Push Token
  removePushToken: async () => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.REMOVE_PUSH);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

export default AuthAPI;
```

---

## 🔧 الخطوة 5: Analysis APIs

**`src/api/analysis.js`**
```javascript
import apiClient from './client';
import { API_CONFIG } from '../utils/constants';

const AnalysisAPI = {
  // جلب آخر تحليل تلقائي
  getLatestAuto: async () => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.LATEST_AUTO);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // تفعيل/إلغاء التحليل التلقائي
  toggleAuto: async (enabled) => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.TOGGLE_AUTO, {
        enabled
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // جلب سجل الصفقات
  getTradesHistory: async (limit = 20) => {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.TRADES_HISTORY}?limit=${limit}`
      );
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // جلب سجل التحليلات بدون صفقات
  getNoTradesHistory: async (limit = 20) => {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.NO_TRADES_HISTORY}?limit=${limit}`
      );
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // جلب السعر الحالي
  getCurrentPrice: async (symbol = 'XAUUSD') => {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.PRICE}/${symbol}`
      );
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

export default AnalysisAPI;
```

---

## 🔧 الخطوة 6: Subscription APIs

**`src/api/subscription.js`**
```javascript
import apiClient from './client';
import { API_CONFIG } from '../utils/constants';

const SubscriptionAPI = {
  // جلب جميع الباقات
  getPackages: async () => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PACKAGES);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // شراء باقة
  purchase: async (packageId, paymentMethod = 'credit_card') => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PURCHASE, {
        packageId,
        paymentMethod,
        autoRenew: false
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // جلب حالة الاشتراك
  getStatus: async () => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.STATUS);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // جلب سجل الاشتراكات
  getHistory: async (limit = 10) => {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.HISTORY}?limit=${limit}`
      );
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

export default SubscriptionAPI;
```

---

## 🔧 الخطوة 7: Export All APIs

**`src/api/index.js`**
```javascript
export { default as AuthAPI } from './auth';
export { default as AnalysisAPI } from './analysis';
export { default as SubscriptionAPI } from './subscription';
```

---


## 🔧 الخطوة 8: Auth Service (إدارة المصادقة)

**`src/services/authService.js`**
```javascript
import { AuthAPI } from '../api';
import Storage from '../utils/storage';

class AuthService {
  // تسجيل دخول
  async login(email, password) {
    try {
      const result = await AuthAPI.login(email, password);
      
      if (result.success) {
        const { token, user } = result.data;
        
        // حفظ التوكن والمستخدم
        await Storage.saveToken(token);
        await Storage.saveUser(user);
        
        return { success: true, user };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // تسجيل مستخدم جديد
  async register(email, password) {
    try {
      const result = await AuthAPI.register(email, password);
      
      if (result.success) {
        const { token, user } = result.data;
        
        // حفظ التوكن والمستخدم
        await Storage.saveToken(token);
        await Storage.saveUser(user);
        
        return { success: true, user };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // تسجيل خروج
  async logout() {
    try {
      // إزالة Push Token من السيرفر
      await AuthAPI.removePushToken();
      
      // مسح البيانات المحلية
      await Storage.clearAll();
      
      return { success: true };
    } catch (error) {
      // حتى لو فشل، امسح البيانات المحلية
      await Storage.clearAll();
      return { success: true };
    }
  }

  // التحقق من تسجيل الدخول
  async isLoggedIn() {
    const token = await Storage.getToken();
    return !!token;
  }

  // جلب المستخدم الحالي
  async getCurrentUser() {
    try {
      // محاولة جلب من الذاكرة أولاً
      let user = await Storage.getUser();
      
      // إذا لم يوجد، جلب من السيرفر
      if (!user) {
        const result = await AuthAPI.getMe();
        if (result.success) {
          user = result.data;
          await Storage.saveUser(user);
        }
      }
      
      return user;
    } catch (error) {
      return null;
    }
  }

  // تحديث بيانات المستخدم
  async refreshUser() {
    try {
      const result = await AuthAPI.getMe();
      
      if (result.success) {
        await Storage.saveUser(result.data);
        return { success: true, user: result.data };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new AuthService();
```

---

## 🔧 الخطوة 9: Notification Service

**`src/services/notificationService.js`**
```javascript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { AuthAPI } from '../api';
import Storage from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

// إعداد كيفية عرض الإشعارات
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  // تسجيل للإشعارات
  async registerForPushNotifications() {
    try {
      // التحقق من أن الجهاز حقيقي
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return { success: false, error: 'يجب استخدام جهاز حقيقي' };
      }

      // طلب الإذن
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return { success: false, error: 'لم يتم منح إذن الإشعارات' };
      }

      // الحصول على Push Token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('📱 Push Token:', token);

      // حفظ محلياً
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

      // تسجيل في السيرفر
      const result = await AuthAPI.registerPushToken(token);
      
      if (result.success) {
        console.log('✅ Push token registered successfully');
        return { success: true, token };
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error registering push token:', error);
      return { success: false, error: error.message };
    }
  }

  // إلغاء تسجيل الإشعارات
  async unregisterPushNotifications() {
    try {
      const result = await AuthAPI.removePushToken();
      
      if (result.success) {
        await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
        console.log('✅ Push token removed successfully');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error removing push token:', error);
      return { success: false, error: error.message };
    }
  }

  // الاستماع للإشعارات الواردة
  addNotificationListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // الاستماع لضغط المستخدم على الإشعار
  addNotificationResponseListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // إرسال إشعار محلي (للاختبار)
  async sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // فوراً
    });
  }
}

export default new NotificationService();
```

---


## 🔧 الخطوة 10: Auth Context (إدارة الحالة العامة)

**`src/contexts/AuthContext.js`**
```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import AuthService from '../services/authService';
import NotificationService from '../services/notificationService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // التحقق من تسجيل الدخول عند بدء التطبيق
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isLoggedIn = await AuthService.isLoggedIn();
      
      if (isLoggedIn) {
        const userData = await AuthService.getCurrentUser();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          
          // تسجيل للإشعارات
          await NotificationService.registerForPushNotifications();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  // تسجيل دخول
  const login = async (email, password) => {
    try {
      const result = await AuthService.login(email, password);
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        
        // تسجيل للإشعارات
        await NotificationService.registerForPushNotifications();
        
        return { success: true };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // تسجيل مستخدم جديد
  const register = async (email, password) => {
    try {
      const result = await AuthService.register(email, password);
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        
        // تسجيل للإشعارات
        await NotificationService.registerForPushNotifications();
        
        return { success: true };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // تسجيل خروج
  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // تحديث بيانات المستخدم
  const refreshUser = async () => {
    try {
      const result = await AuthService.refreshUser();
      
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook للاستخدام في المكونات
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
};

export default AuthContext;
```

---

## 📱 الخطوة 11: أمثلة الاستخدام في الشاشات

### مثال 1: شاشة تسجيل الدخول

**`src/screens/LoginScreen.js`**
```javascript
import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('خطأ', 'الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    
    const result = await login(email, password);
    
    setLoading(false);
    
    if (result.success) {
      // التنقل للشاشة الرئيسية
      navigation.replace('Home');
    } else {
      Alert.alert('خطأ', result.error || 'فشل تسجيل الدخول');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>تسجيل الدخول</Text>
      
      <TextInput
        placeholder="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      
      <TextInput
        placeholder="كلمة المرور"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />
      
      <Button
        title={loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
        onPress={handleLogin}
        disabled={loading}
      />
      
      <Button
        title="إنشاء حساب جديد"
        onPress={() => navigation.navigate('Register')}
      />
    </View>
  );
};

export default LoginScreen;
```

---

### مثال 2: شاشة التحليل

**`src/screens/AnalysisScreen.js`**
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, RefreshControl, Alert } from 'react-native';
import { AnalysisAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';

const AnalysisScreen = () => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    loadAnalysis();
    setAutoEnabled(user?.autoAnalysisEnabled || false);
  }, []);

  const loadAnalysis = async () => {
    try {
      const result = await AnalysisAPI.getLatestAuto();
      
      if (result.success && result.data.analysis) {
        setAnalysis(result.data.analysis);
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalysis();
  };

  const toggleAutoAnalysis = async () => {
    try {
      const newState = !autoEnabled;
      const result = await AnalysisAPI.toggleAuto(newState);
      
      if (result.success) {
        setAutoEnabled(newState);
        await refreshUser(); // تحديث بيانات المستخدم
        Alert.alert(
          'نجح',
          newState ? 'تم تفعيل التحليل التلقائي' : 'تم إلغاء التحليل التلقائي'
        );
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, padding: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={{ fontSize: 24, marginBottom: 20 }}>آخر تحليل</Text>
      
      <Button
        title={autoEnabled ? 'إيقاف التحليل التلقائي' : 'تفعيل التحليل التلقائي'}
        onPress={toggleAutoAnalysis}
        color={autoEnabled ? 'red' : 'green'}
      />
      
      {analysis ? (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            القرار: {analysis.decision === 'PLACE_PENDING' ? 'صفقة متاحة' : 'لا توجد صفقة'}
          </Text>
          
          <Text>التقييم: {analysis.score}/10</Text>
          <Text>الثقة: {analysis.confidence}%</Text>
          <Text>السعر: {analysis.price}</Text>
          
          {analysis.decision === 'PLACE_PENDING' && analysis.suggestedTrade && (
            <View style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0' }}>
              <Text style={{ fontWeight: 'bold' }}>الصفقة المقترحة:</Text>
              <Text>النوع: {analysis.suggestedTrade.type}</Text>
              <Text>الدخول: {analysis.suggestedTrade.entry}</Text>
              <Text>وقف الخسارة: {analysis.suggestedTrade.sl}</Text>
              <Text>الهدف 1: {analysis.suggestedTrade.tp1}</Text>
              <Text>الهدف 2: {analysis.suggestedTrade.tp2}</Text>
              <Text>الهدف 3: {analysis.suggestedTrade.tp3}</Text>
              <Text>نسبة RR: {analysis.suggestedTrade.rrRatio}</Text>
            </View>
          )}
          
          {analysis.decision === 'NO_TRADE' && analysis.reasons && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontWeight: 'bold' }}>أسباب عدم التداول:</Text>
              {analysis.reasons.map((reason, index) => (
                <Text key={index}>• {reason}</Text>
              ))}
            </View>
          )}
        </View>
      ) : (
        <Text style={{ marginTop: 20 }}>لا يوجد تحليل متاح</Text>
      )}
    </ScrollView>
  );
};

export default AnalysisScreen;
```

---


### مثال 3: شاشة الاشتراكات

**`src/screens/SubscriptionScreen.js`**
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SubscriptionAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';

const SubscriptionScreen = ({ navigation }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const result = await SubscriptionAPI.getPackages();
      
      if (result.success) {
        setPackages(result.data.packages);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId) => {
    Alert.alert(
      'تأكيد الشراء',
      'هل تريد شراء هذه الباقة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'شراء',
          onPress: async () => {
            setPurchasing(true);
            
            const result = await SubscriptionAPI.purchase(packageId);
            
            setPurchasing(false);
            
            if (result.success) {
              await refreshUser(); // تحديث بيانات المستخدم
              Alert.alert('نجح', 'تم شراء الباقة بنجاح');
              navigation.goBack();
            } else {
              Alert.alert('خطأ', result.error);
            }
          }
        }
      ]
    );
  };

  const renderPackage = ({ item }) => (
    <TouchableOpacity
      style={styles.packageCard}
      onPress={() => handlePurchase(item.id)}
      disabled={purchasing}
    >
      <Text style={styles.packageName}>{item.nameAr}</Text>
      <Text style={styles.packageDescription}>{item.descriptionAr}</Text>
      <Text style={styles.packagePrice}>${item.price}</Text>
      
      <View style={styles.featuresContainer}>
        {item.features.map((feature, index) => (
          <Text key={index} style={styles.feature}>✓ {feature}</Text>
        ))}
      </View>
      
      {item.isUnlimited && (
        <View style={styles.unlimitedBadge}>
          <Text style={styles.unlimitedText}>غير محدود</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>الباقات المتاحة</Text>
      
      {user?.subscription !== 'free' && (
        <View style={styles.currentSubscription}>
          <Text style={styles.currentText}>
            الاشتراك الحالي: {user.subscription}
          </Text>
        </View>
      )}
      
      <FlatList
        data={packages}
        renderItem={renderPackage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  currentSubscription: {
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 20
  },
  currentText: {
    fontSize: 16,
    color: '#1976d2'
  },
  listContainer: {
    paddingBottom: 20
  },
  packageCard: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0'
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 15
  },
  featuresContainer: {
    marginTop: 10
  },
  feature: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333'
  },
  unlimitedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  unlimitedText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  }
});

export default SubscriptionScreen;
```

---

## 📱 الخطوة 12: إعداد App.js الرئيسي

**`App.js`**
```javascript
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import NotificationService from './src/services/notificationService';

// الشاشات
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();

// Navigation Stack
function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // إعداد الإشعارات
    setupNotifications();
  }, []);

  const setupNotifications = () => {
    // الاستماع للإشعارات الواردة
    const notificationListener = NotificationService.addNotificationListener(
      (notification) => {
        console.log('📬 Notification received:', notification);
        // يمكنك هنا عرض alert أو تحديث الـ UI
      }
    );

    // الاستماع لضغط المستخدم على الإشعار
    const responseListener = NotificationService.addNotificationResponseListener(
      (response) => {
        console.log('👆 Notification tapped:', response);
        // يمكنك هنا التنقل لشاشة معينة
        const data = response.notification.request.content.data;
        if (data.screen) {
          // navigation.navigate(data.screen);
        }
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  };

  if (loading) {
    return null; // أو شاشة تحميل
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isAuthenticated ? (
          // شاشات غير مسجل الدخول
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ title: 'تسجيل الدخول' }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ title: 'إنشاء حساب' }}
            />
          </>
        ) : (
          // شاشات مسجل الدخول
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'الرئيسية' }}
            />
            <Stack.Screen 
              name="Analysis" 
              component={AnalysisScreen}
              options={{ title: 'التحليل' }}
            />
            <Stack.Screen 
              name="Subscription" 
              component={SubscriptionScreen}
              options={{ title: 'الاشتراكات' }}
            />
            <Stack.Screen 
              name="History" 
              component={HistoryScreen}
              options={{ title: 'السجل' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// التطبيق الرئيسي
export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
```

---

## 📦 الخطوة 13: تثبيت المكتبات المطلوبة

```bash
# Navigation
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context

# HTTP Client
npm install axios

# Storage
npm install @react-native-async-storage/async-storage

# Notifications
npm install expo-notifications expo-device

# إذا كنت تستخدم Expo
npx expo install expo-notifications expo-device
```

---

## ✅ الخلاصة

الآن لديك نظام كامل للاتصال بين التطبيق والـ Backend:

### ✨ المميزات:
- ✅ HTTP Client مع Interceptors
- ✅ إدارة التوكن تلقائياً
- ✅ معالجة الأخطاء المركزية
- ✅ Auth Context للحالة العامة
- ✅ Notification Service كامل
- ✅ Storage Wrapper آمن
- ✅ أمثلة شاشات جاهزة

### 📁 الملفات المطلوبة:
```
src/
├── api/
│   ├── client.js          ✅
│   ├── auth.js            ✅
│   ├── analysis.js        ✅
│   ├── subscription.js    ✅
│   └── index.js           ✅
├── services/
│   ├── authService.js     ✅
│   └── notificationService.js  ✅
├── utils/
│   ├── storage.js         ✅
│   └── constants.js       ✅
└── contexts/
    └── AuthContext.js     ✅
```

---

**آخر تحديث:** 27 يناير 2025
**الإصدار:** 2.1.0
