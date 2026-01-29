# 📱 API للتطبيق المحمول - ICT AI Trader

## 🔗 Base URL
```
https://your-railway-domain.railway.app
```

---

## 🎯 المسارات الأساسية للتطبيق

### 1️⃣ المصادقة (Authentication)

#### تسجيل مستخدم جديد
```javascript
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "message": "تم إنشاء الحساب بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "coins": 100,
    "subscription": "free"
  }
}
```

#### تسجيل الدخول
```javascript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "message": "تم تسجيل الدخول بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "coins": 100,
    "subscription": "premium",
    "subscriptionExpiry": "2025-02-27T00:00:00Z"
  }
}
```

#### الحصول على بيانات المستخدم
```javascript
GET /api/auth/me
Headers: { Authorization: "Bearer {token}" }

// Response
{
  "id": "uuid",
  "email": "user@example.com",
  "coins": 100,
  "subscription": "premium",
  "subscriptionExpiry": "2025-02-27T00:00:00Z",
  "autoAnalysisEnabled": true,
  "subscriptionStatus": {
    "hasActiveSubscription": true,
    "canAnalyze": true,
    "subscription": {
      "id": "sub-123",
      "planName": "Premium Monthly",
      "packageNameAr": "باقة بريميوم شهرية",
      "analysisLimit": -1,
      "isUnlimited": true,
      "expiresAt": "2025-02-27T00:00:00Z",
      "status": "active"
    },
    "analysisInfo": {
      "remainingAnalyses": -1,
      "isUnlimited": true
    }
  }
}
```

#### تسجيل Push Token (للإشعارات)
```javascript
POST /api/auth/register-push-token
Headers: { Authorization: "Bearer {token}" }
{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxx]"
}

// Response
{
  "success": true,
  "message": "تم تسجيل Push Token بنجاح",
  "pushNotificationsEnabled": true
}
```

#### إزالة Push Token
```javascript
POST /api/auth/remove-push-token
Headers: { Authorization: "Bearer {token}" }

// Response
{
  "success": true,
  "message": "تم إزالة Push Token بنجاح",
  "pushNotificationsEnabled": false
}
```

---

### 2️⃣ التحليل (Analysis)

#### آخر تحليل تلقائي
```javascript
GET /api/analysis/latest-auto
Headers: { Authorization: "Bearer {token}" }

// Response
{
  "success": true,
  "analysis": {
    "decision": "PLACE_PENDING",
    "score": 8.5,
    "confidence": 85,
    "price": 2750.50,
    "suggestedTrade": {
      "type": "BUY_LIMIT",
      "entry": 2745.00,
      "sl": 2740.00,
      "tp1": 2755.00,
      "tp2": 2765.00,
      "tp3": 2780.00,
      "expiryMinutes": 60,
      "rrRatio": "TP1: 1:2.0 | TP2: 1:4.0 | TP3: 1:7.0"
    },
    "reasoning": "تم سحب SSL على H1 + MSS على M5 + FVG واضح",
    "keyLevels": {
      "bsl": "2755.00",
      "ssl": "2740.00"
    }
  },
  "timestamp": "2025-01-27T12:00:00Z",
  "price": 2750.50
}
```

#### تفعيل/إلغاء التحليل التلقائي
```javascript
POST /api/analysis/toggle-auto
Headers: { Authorization: "Bearer {token}" }
{
  "enabled": true
}

// Response
{
  "success": true,
  "message": "Auto analysis enabled successfully",
  "autoAnalysisEnabled": true
}
```

#### سجل الصفقات
```javascript
GET /api/analysis/trades-history?limit=20
Headers: { Authorization: "Bearer {token}" }

// Response
{
  "success": true,
  "trades": [
    {
      "id": "analysis-123",
      "decision": "PLACE_PENDING",
      "score": 8.5,
      "confidence": 85,
      "price": 2750.50,
      "suggestedTrade": {
        "type": "BUY_LIMIT",
        "entry": 2745.00,
        "sl": 2740.00,
        "tp1": 2755.00,
        "tp2": 2765.00,
        "tp3": 2780.00
      },
      "created_at": "2025-01-27T12:00:00Z"
    }
  ]
}
```

#### سجل التحليلات بدون صفقات
```javascript
GET /api/analysis/no-trades-history?limit=20
Headers: { Authorization: "Bearer {token}" }

// Response
{
  "success": true,
  "analyses": [
    {
      "id": "analysis-456",
      "decision": "NO_TRADE",
      "score": 3.5,
      "confidence": 40,
      "reasons": [
        "❌ لم يحدث سحب سيولة على H1 أو M5",
        "❌ التقييم منخفض (3.5/10) - المطلوب >= 5.5"
      ],
      "created_at": "2025-01-27T11:55:00Z"
    }
  ]
}
```

#### السعر الحالي
```javascript
GET /api/analysis/price/XAUUSD

// Response
{
  "success": true,
  "symbol": "XAUUSD",
  "price": 2750.50,
  "timestamp": "2025-01-27T12:00:00Z"
}
```

#### المحادثة مع AI (اختياري)
```javascript
POST /api/analysis/chat
Headers: { Authorization: "Bearer {token}" }
{
  "message": "ما رأيك في السوق الآن؟",
  "currentPrice": 2750.50
}

// Response
{
  "success": true,
  "response": "السوق حالياً في منطقة Discount...",
  "subscriptionInfo": {...},
  "updatedCoins": 95
}
```

---

### 3️⃣ الاشتراكات (Subscription)

#### جميع الباقات المتاحة
```javascript
GET /api/subscription/packages

// Response
{
  "success": true,
  "packages": [
    {
      "id": "monthly-premium",
      "name": "Premium Monthly",
      "nameAr": "باقة بريميوم شهرية",
      "description": "Unlimited analysis + Auto analysis",
      "descriptionAr": "تحليلات غير محدودة + تحليل تلقائي",
      "durationType": "monthly",
      "durationDays": 30,
      "price": 29.99,
      "coinsIncluded": 0,
      "analysisLimit": -1,
      "isUnlimited": true,
      "features": [
        "تحليلات غير محدودة",
        "تحليل تلقائي كل 5 دقائق",
        "إشعارات فورية",
        "دعم فني مميز"
      ]
    },
    {
      "id": "weekly-basic",
      "name": "Basic Weekly",
      "nameAr": "باقة أساسية أسبوعية",
      "price": 9.99,
      "durationDays": 7,
      "analysisLimit": 50,
      "isUnlimited": false
    }
  ]
}
```

#### شراء اشتراك
```javascript
POST /api/subscription/purchase
Headers: { Authorization: "Bearer {token}" }
{
  "packageId": "monthly-premium",
  "paymentMethod": "credit_card",
  "autoRenew": false
}

// Response
{
  "success": true,
  "message": "تم شراء الاشتراك بنجاح",
  "subscription": {
    "id": "sub-123",
    "packageName": "باقة بريميوم شهرية",
    "expiresAt": "2025-02-27T00:00:00Z",
    "coinsAdded": 0,
    "analysisLimit": -1,
    "isUnlimited": true
  },
  "subscriptionStatus": {
    "hasActiveSubscription": true,
    "canAnalyze": true
  }
}
```

#### حالة الاشتراك
```javascript
GET /api/subscription/status
Headers: { Authorization: "Bearer {token}" }

// Response
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "coins": 100,
    "subscription": "premium",
    "subscriptionExpiry": "2025-02-27T00:00:00Z"
  },
  "subscriptionStatus": {
    "hasActiveSubscription": true,
    "canAnalyze": true,
    "subscription": {
      "id": "sub-123",
      "planName": "Premium Monthly",
      "packageNameAr": "باقة بريميوم شهرية",
      "analysisLimit": -1,
      "isUnlimited": true,
      "expiresAt": "2025-02-27T00:00:00Z",
      "status": "active",
      "features": [...]
    },
    "analysisInfo": {
      "remainingAnalyses": -1,
      "isUnlimited": true
    }
  }
}
```

#### سجل الاشتراكات
```javascript
GET /api/subscription/history?limit=10
Headers: { Authorization: "Bearer {token}" }

// Response
{
  "success": true,
  "subscriptions": [
    {
      "id": "sub-123",
      "planName": "Premium Monthly",
      "packageNameAr": "باقة بريميوم شهرية",
      "price": 29.99,
      "analysisLimit": -1,
      "isUnlimited": true,
      "status": "active",
      "startedAt": "2025-01-27T00:00:00Z",
      "expiresAt": "2025-02-27T00:00:00Z",
      "autoRenew": false
    }
  ]
}
```

---

### 4️⃣ معلومات عامة

#### Health Check
```javascript
GET /health

// Response
{
  "status": "ok",
  "timestamp": "2025-01-27T12:00:00Z",
  "uptime": 86400
}
```

#### حالة التحليل التلقائي
```javascript
GET /auto-analysis-status

// Response
{
  "nextCloseTime": "2025-01-27T12:05:00Z",
  "timeUntilClose": "4 دقائق و 30 ثانية",
  "isMarketOpen": true,
  "currentPrice": 2750.50,
  "lastAnalysis": {
    "timestamp": "2025-01-27T12:00:00Z",
    "decision": "PLACE_PENDING"
  }
}
```

---

## 📋 سيناريوهات الاستخدام

### 🔐 سيناريو 1: تسجيل دخول المستخدم

```javascript
// 1. تسجيل الدخول
const loginResponse = await fetch('https://api.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const { token, user } = await loginResponse.json();

// 2. حفظ التوكن
await AsyncStorage.setItem('authToken', token);

// 3. تسجيل Push Token للإشعارات
const pushToken = await Notifications.getExpoPushTokenAsync();
await fetch('https://api.com/api/auth/register-push-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ pushToken: pushToken.data })
});

// 4. جلب بيانات المستخدم الكاملة
const meResponse = await fetch('https://api.com/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const userData = await meResponse.json();
```

---

### 📊 سيناريو 2: عرض آخر تحليل

```javascript
// 1. جلب آخر تحليل تلقائي
const analysisResponse = await fetch('https://api.com/api/analysis/latest-auto', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { analysis, timestamp, price } = await analysisResponse.json();

// 2. عرض التحليل في التطبيق
if (analysis.decision === 'PLACE_PENDING') {
  // عرض الصفقة المقترحة
  displayTrade(analysis.suggestedTrade);
} else {
  // عرض أسباب عدم التداول
  displayNoTradeReasons(analysis.reasons);
}

// 3. جلب السعر الحالي
const priceResponse = await fetch('https://api.com/api/analysis/price/XAUUSD');
const { price: currentPrice } = await priceResponse.json();
```

---

### 💳 سيناريو 3: شراء اشتراك

```javascript
// 1. جلب الباقات المتاحة
const packagesResponse = await fetch('https://api.com/api/subscription/packages');
const { packages } = await packagesResponse.json();

// 2. عرض الباقات للمستخدم
displayPackages(packages);

// 3. شراء باقة محددة
const purchaseResponse = await fetch('https://api.com/api/subscription/purchase', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    packageId: 'monthly-premium',
    paymentMethod: 'credit_card',
    autoRenew: false
  })
});
const { subscription } = await purchaseResponse.json();

// 4. تحديث حالة المستخدم
const updatedUser = await fetch('https://api.com/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

### 🔔 سيناريو 4: تفعيل التحليل التلقائي

```javascript
// 1. التحقق من الاشتراك
const statusResponse = await fetch('https://api.com/api/subscription/status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { subscriptionStatus } = await statusResponse.json();

if (!subscriptionStatus.hasActiveSubscription) {
  // توجيه المستخدم لشراء اشتراك
  navigateToSubscription();
  return;
}

// 2. تفعيل التحليل التلقائي
const toggleResponse = await fetch('https://api.com/api/analysis/toggle-auto', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ enabled: true })
});

// 3. تأكيد التفعيل
const { autoAnalysisEnabled } = await toggleResponse.json();
if (autoAnalysisEnabled) {
  showSuccess('تم تفعيل التحليل التلقائي');
}
```

---

### 📜 سيناريو 5: عرض السجل

```javascript
// 1. جلب سجل الصفقات
const tradesResponse = await fetch('https://api.com/api/analysis/trades-history?limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { trades } = await tradesResponse.json();

// 2. جلب سجل التحليلات بدون صفقات
const noTradesResponse = await fetch('https://api.com/api/analysis/no-trades-history?limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { analyses } = await noTradesResponse.json();

// 3. دمج وعرض السجل الكامل
const fullHistory = [...trades, ...analyses].sort((a, b) => 
  new Date(b.created_at) - new Date(a.created_at)
);
displayHistory(fullHistory);
```

---

## 🔒 Authentication Headers

جميع المسارات المحمية تحتاج:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## ⚠️ Error Handling

جميع الأخطاء تُرجع بصيغة:
```javascript
{
  "success": false,
  "error": "وصف الخطأ بالعربية"
}
```

أمثلة الأخطاء الشائعة:
- `401`: غير مصرح (Token غير صالح)
- `403`: ممنوع (اشتراك منتهي)
- `404`: غير موجود
- `500`: خطأ في السيرفر

---

## 📱 React Native Example

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-railway-domain.railway.app';

// دالة مساعدة للطلبات
async function apiRequest(endpoint, options = {}) {
  const token = await AsyncStorage.getItem('authToken');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'حدث خطأ');
  }
  
  return data;
}

// أمثلة الاستخدام
export const AuthAPI = {
  login: (email, password) => 
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  
  register: (email, password) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  
  getMe: () => apiRequest('/api/auth/me'),
  
  registerPushToken: (pushToken) =>
    apiRequest('/api/auth/register-push-token', {
      method: 'POST',
      body: JSON.stringify({ pushToken })
    })
};

export const AnalysisAPI = {
  getLatest: () => apiRequest('/api/analysis/latest-auto'),
  
  toggleAuto: (enabled) =>
    apiRequest('/api/analysis/toggle-auto', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    }),
  
  getTradesHistory: (limit = 20) =>
    apiRequest(`/api/analysis/trades-history?limit=${limit}`),
  
  getCurrentPrice: (symbol = 'XAUUSD') =>
    apiRequest(`/api/analysis/price/${symbol}`)
};

export const SubscriptionAPI = {
  getPackages: () => apiRequest('/api/subscription/packages'),
  
  purchase: (packageId, paymentMethod) =>
    apiRequest('/api/subscription/purchase', {
      method: 'POST',
      body: JSON.stringify({ packageId, paymentMethod })
    }),
  
  getStatus: () => apiRequest('/api/subscription/status'),
  
  getHistory: (limit = 10) =>
    apiRequest(`/api/subscription/history?limit=${limit}`)
};
```

---

## 🎯 الخلاصة

### المسارات الأساسية للتطبيق:

**Authentication (5 مسارات):**
- ✅ Register, Login, Get Me
- ✅ Register/Remove Push Token

**Analysis (5 مسارات):**
- ✅ Latest Auto, Toggle Auto
- ✅ Trades History, No-Trades History
- ✅ Current Price

**Subscription (4 مسارات):**
- ✅ Get Packages, Purchase
- ✅ Status, History

**Total: 14 مسار أساسي للتطبيق المحمول**

---

**آخر تحديث:** 27 يناير 2025
**الإصدار:** 2.1.0
