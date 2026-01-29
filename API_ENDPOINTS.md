# 📚 دليل مسارات API الكامل - ICT AI Trader

## 🔗 Base URL
```
https://your-railway-domain.railway.app
```

---

## 📋 جدول المحتويات
1. [Authentication (المصادقة)](#authentication)
2. [Analysis (التحليل)](#analysis)
3. [Subscription (الاشتراكات)](#subscription)
4. [Telegram Bot](#telegram)
5. [Testing & Debug](#testing)
6. [Public Pages](#public-pages)

---

## 🔐 Authentication (المصادقة)

### 1. تسجيل مستخدم جديد
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```
**الوظيفة:** إنشاء حساب جديد
**الرد:** `{ token, user: { id, email, coins, subscription } }`

---

### 2. تسجيل الدخول
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```
**الوظيفة:** تسجيل دخول مستخدم موجود
**الرد:** `{ token, user }`

---

### 3. تسجيل دخول سريع (للاختبار)
```http
POST /api/auth/quick-login
Content-Type: application/json

{
  "email": "test@example.com"
}
```
**الوظيفة:** تسجيل دخول سريع بدون كلمة مرور (للاختبار فقط)

---

### 4. التحقق من التوكن
```http
GET /api/auth/verify-token
Authorization: Bearer {token}
```
**الوظيفة:** التحقق من صحة التوكن
**الرد:** `{ valid: true, user }`

---

### 5. تجديد التوكن
```http
POST /api/auth/refresh-token
Authorization: Bearer {token}
```
**الوظيفة:** الحصول على توكن جديد
**الرد:** `{ token }`

---

### 6. بيانات المستخدم الحالي
```http
GET /api/auth/me
Authorization: Bearer {token}
```
**الوظيفة:** جلب بيانات المستخدم مع حالة الاشتراك
**الرد:** `{ id, email, coins, subscription, autoAnalysisEnabled, subscriptionStatus }`

---

### 7. حالة الاشتراك
```http
GET /api/auth/subscription-status
Authorization: Bearer {token}
```
**الوظيفة:** جلب تفاصيل الاشتراك والتحليلات المتبقية
**الرد:** `{ user, subscriptionStatus: { hasActiveSubscription, canAnalyze, subscription, analysisInfo } }`

---

### 8. تسجيل الخروج
```http
POST /api/auth/logout
Authorization: Bearer {token}
```
**الوظيفة:** إنهاء الجلسة الحالية

---

### 9. الجلسات النشطة
```http
GET /api/auth/sessions
Authorization: Bearer {token}
```
**الوظيفة:** عرض جميع الجلسات النشطة للمستخدم
**الرد:** `{ sessions: [{ id, deviceInfo, ipAddress, createdAt, isCurrent }] }`

---

### 10. إنهاء الجلسات الأخرى
```http
POST /api/auth/terminate-other-sessions
Authorization: Bearer {token}
```
**الوظيفة:** إنهاء جميع الجلسات ماعدا الحالية

---

### 11. تسجيل Push Token (للإشعارات)
```http
POST /api/auth/register-push-token
Authorization: Bearer {token}
Content-Type: application/json

{
  "pushToken": "ExponentPushToken[xxxxxx]"
}
```
**الوظيفة:** تسجيل Expo Push Token لاستقبال الإشعارات

---

### 12. إزالة Push Token
```http
POST /api/auth/remove-push-token
Authorization: Bearer {token}
```
**الوظيفة:** إزالة Push Token وإيقاف الإشعارات

---

### 13. عرض جميع Push Tokens
```http
GET /api/auth/list-push-tokens
```
**الوظيفة:** عرض جميع المستخدمين مع Push Tokens (للمراقبة)

---

### 14. حذف Push Token بالقيمة
```http
POST /api/auth/delete-push-token-by-value
Content-Type: application/json

{
  "pushToken": "ExponentPushToken[xxxxxx]"
}
```
**الوظيفة:** حذف Push Token محدد من قاعدة البيانات

---

## 📊 Analysis (التحليل)

### 1. تحليل تجريبي (بدون تسجيل)
```http
POST /api/analysis/analyze-demo
Content-Type: application/json

{
  "symbol": "XAUUSD"
}
```
**الوظيفة:** تحليل تجريبي بدون حفظ أو خصم عملات
**الرد:** `{ analysis, currentPrice, demo: true, warning }`

---

### 2. المحادثة مع AI
```http
POST /api/analysis/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "ما رأيك في السوق الآن؟",
  "analysis": {...},
  "currentPrice": 2750.50
}
```
**الوظيفة:** محادثة مع AI حول التحليل (يخصم عملات)
**الرد:** `{ response, subscriptionInfo, updatedCoins }`

---

### 3. متابعة الصفقة
```http
POST /api/analysis/follow-up
Authorization: Bearer {token}
Content-Type: application/json

{
  "originalAnalysis": {...},
  "tradeTimestamp": "2025-01-27T12:00:00Z",
  "symbol": "XAUUSD"
}
```
**الوظيفة:** متابعة صفقة موجودة وتحديث التوصيات
**الرد:** `{ advice, shouldExit, reason, currentPrice }`

---

### 4. سجل التحليلات المحسن
```http
GET /api/analysis/enhanced-history?limit=50
Authorization: Bearer {token}
```
**الوظيفة:** جلب سجل التحليلات المحسن (مجاني)
**الرد:** `{ history: [{ id, decision, score, suggestedTrade, keyLevels, ... }] }`

---

### 5. سجل الصفقات فقط
```http
GET /api/analysis/trades-history?limit=20
Authorization: Bearer {token}
```
**الوظيفة:** جلب الصفقات التي تم اقتراحها فقط
**الرد:** `{ trades: [{ decision: "PLACE_PENDING", suggestedTrade, ... }] }`

---

### 6. سجل التحليلات بدون صفقات
```http
GET /api/analysis/no-trades-history?limit=20
Authorization: Bearer {token}
```
**الوظيفة:** جلب التحليلات التي لم تنتج صفقات (NO_TRADE)
**الرد:** `{ analyses: [{ decision: "NO_TRADE", reasons, ... }] }`

---

### 7. سجل التحليلات التلقائية
```http
GET /api/analysis/auto-history?limit=20
Authorization: Bearer {token}
```
**الوظيفة:** جلب التحليلات التلقائية فقط (للمشتركين)
**الرد:** `{ history: [{ isAutoAnalysis: true, ... }] }`

---

### 8. سجل التحليلات (قديم)
```http
GET /api/analysis/history?limit=50
Authorization: Bearer {token}
```
**الوظيفة:** جلب سجل التحليلات الأساسي

---

### 9. آخر تحليل تلقائي
```http
GET /api/analysis/latest-auto
Authorization: Bearer {token}
```
**الوظيفة:** جلب آخر تحليل تلقائي للمستخدم
**الرد:** `{ analysis, timestamp, price }`

---

### 10. تفعيل/إلغاء التحليل التلقائي
```http
POST /api/analysis/toggle-auto
Authorization: Bearer {token}
Content-Type: application/json

{
  "enabled": true
}
```
**الوظيفة:** تفعيل أو إلغاء استقبال التحليلات التلقائية
**الرد:** `{ success: true, autoAnalysisEnabled: true }`

---

### 11. السعر الحالي
```http
GET /api/analysis/price/XAUUSD
```
**الوظيفة:** جلب السعر الحالي لزوج معين
**الرد:** `{ symbol, price, timestamp }`

---

### 12. بيانات الشموع
```http
GET /api/analysis/candles/XAUUSD/1h?count=200
```
**الوظيفة:** جلب بيانات الشموع لإطار زمني محدد
**الرد:** `{ candles: [{ time, open, high, low, close }], currentPrice }`

---

## 💳 Subscription (الاشتراكات)

### 1. جميع الباقات المتاحة
```http
GET /api/subscription/packages
```
**الوظيفة:** عرض جميع باقات الاشتراك المتاحة
**الرد:** `{ packages: [{ id, name, nameAr, price, analysisLimit, features, ... }] }`

---

### 2. تفاصيل باقة محددة
```http
GET /api/subscription/packages/monthly-premium
```
**الوظيفة:** جلب تفاصيل باقة معينة
**الرد:** `{ package: { id, name, description, price, ... } }`

---

### 3. شراء اشتراك
```http
POST /api/subscription/purchase
Authorization: Bearer {token}
Content-Type: application/json

{
  "packageId": "monthly-premium",
  "paymentMethod": "credit_card",
  "autoRenew": false
}
```
**الوظيفة:** شراء باقة اشتراك جديدة
**الرد:** `{ subscription: { id, packageName, expiresAt, coinsAdded }, subscriptionStatus }`

---

### 4. حالة الاشتراك
```http
GET /api/subscription/status
Authorization: Bearer {token}
```
**الوظيفة:** جلب حالة الاشتراك الحالي
**الرد:** `{ user, subscriptionStatus: { hasActiveSubscription, subscription, analysisInfo } }`

---

### 5. سجل الاشتراكات
```http
GET /api/subscription/history?limit=10
Authorization: Bearer {token}
```
**الوظيفة:** جلب سجل جميع الاشتراكات السابقة
**الرد:** `{ subscriptions: [{ id, planName, price, status, startedAt, expiresAt }] }`

---

### 6. شراء عملات إضافية
```http
POST /api/subscription/buy-coins
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 100,
  "paymentMethod": "credit_card"
}
```
**الوظيفة:** شراء عملات إضافية
**الرد:** `{ purchase: { amount, price }, newBalance }`

---

### 7. إحصائيات الاشتراك (VIP)
```http
GET /api/subscription/stats
Authorization: Bearer {token}
```
**الوظيفة:** إحصائيات مفصلة للمشتركين فقط
**الرد:** `{ stats: { subscription, analysisUsage, features, expiryInfo } }`

---

### 8. تجديد الاشتراك
```http
POST /api/subscription/renew
Authorization: Bearer {token}
Content-Type: application/json

{
  "autoRenew": true
}
```
**الوظيفة:** تفعيل/إلغاء التجديد التلقائي

---

### 9. إلغاء الاشتراك
```http
POST /api/subscription/cancel
Authorization: Bearer {token}
```
**الوظيفة:** طلب إلغاء الاشتراك

---

## 🤖 Telegram Bot

### 1. Webhook للتحديثات
```http
POST /api/telegram/webhook
Content-Type: application/json

{
  "update_id": 123456,
  "message": {...}
}
```
**الوظيفة:** استقبال التحديثات من تليجرام

---

### 2. إعداد Webhook
```http
POST /api/telegram/setup-webhook
Content-Type: application/json

{
  "webhookUrl": "https://your-domain.com/api/telegram/webhook"
}
```
**الوظيفة:** تعيين webhook URL لبوت تليجرام

---

### 3. معلومات Webhook
```http
GET /api/telegram/webhook-info
```
**الوظيفة:** جلب معلومات webhook الحالي
**الرد:** `{ info: { url, has_custom_certificate, pending_update_count } }`

---

## 🧪 Testing & Debug

### 1. اختبار التقاط الصور
```http
GET /test-screenshot
```
**الوظيفة:** اختبار التقاط صور الرسوم البيانية

---

### 2. اختبار التقاط متوازي
```http
GET /test-parallel
```
**الوظيفة:** اختبار التقاط الصور بشكل متوازي

---

### 3. حفظ الرسوم البيانية
```http
GET /save-charts
```
**الوظيفة:** حفظ الرسوم البيانية كملفات

---

### 4. اختبار الإشعارات
```http
GET /test-notification
```
**الوظيفة:** اختبار نظام الإشعارات

---

### 5. إرسال صفقة تجريبية
```http
GET /send-test-trade
```
**الوظيفة:** إرسال صفقة تجريبية لاختبار الإشعارات

---

### 6. عرض المستخدمين (Debug)
```http
GET /debug-users
```
**الوظيفة:** عرض جميع المستخدمين في قاعدة البيانات

---

### 7. تعيين Push Token يدوياً
```http
GET /set-push-token?email=user@example.com&token=ExponentPushToken[xxx]
```
**الوظيفة:** تعيين Push Token لمستخدم محدد

---

### 8. Debug الإشعارات
```http
GET /debug-notifications
```
**الوظيفة:** عرض حالة الإشعارات لجميع المستخدمين

---

### 9. إرسال إشعار تجريبي
```http
GET /send-test-notification?email=user@example.com
```
**الوظيفة:** إرسال إشعار تجريبي لمستخدم محدد

---

### 10. اختبار التحليل
```http
GET /test-analysis
```
**الوظيفة:** اختبار نظام التحليل الكامل

---

### 11. فحص الاشتراكات المنتهية
```http
GET /check-expired-subscriptions
```
**الوظيفة:** فحص وتحديث الاشتراكات المنتهية يدوياً

---

### 12. حالة التحليل التلقائي
```http
GET /auto-analysis-status
```
**الوظيفة:** عرض معلومات التحليل التلقائي القادم
**الرد:** `{ nextCloseTime, timeUntilClose, isMarketOpen, currentPrice }`

---

### 13. Health Check
```http
GET /health
```
**الوظيفة:** التحقق من حالة السيرفر
**الرد:** `{ status: "ok", timestamp, uptime }`

---

### 14. معلومات API
```http
GET /api
```
**الوظيفة:** عرض معلومات API الأساسية
**الرد:** `{ name, version, endpoints }`

---

## 🌐 Public Pages (صفحات HTML)

### 1. إعداد تليجرام
```
GET /setup-telegram
```
**الوظيفة:** صفحة إعداد بوت تليجرام

---

### 2. اختبار الصور
```
GET /test-screenshot.html
```
**الوظيفة:** صفحة اختبار التقاط الصور

---

### 3. الرسم البياني المباشر
```
GET /live-chart.html
```
**الوظيفة:** عرض الرسم البياني المباشر

---

### 4. صفحة تسجيل الدخول
```
GET /login.html
```
**الوظيفة:** صفحة تسجيل الدخول

---

### 5. لوحة الاشتراكات
```
GET /subscription-dashboard
```
**الوظيفة:** لوحة إدارة الاشتراكات

---

### 6. إعدادات الإشعارات
```
GET /notification-config
```
**الوظيفة:** صفحة إعدادات الإشعارات

---

### 7. اختبار المصادقة
```
GET /test-auth
```
**الوظيفة:** صفحة اختبار نظام المصادقة

---

### 8. اختبار الإشعارات
```
GET /test-notifications
```
**الوظيفة:** صفحة اختبار الإشعارات

---

### 9. إرسال صفقة تجريبية
```
GET /test-send-trade
```
**الوظيفة:** صفحة إرسال صفقة تجريبية

---

### 10. إرسال صفقة (مبسط)
```
GET /test-send-trade-simple
```
**الوظيفة:** نسخة مبسطة لإرسال صفقة تجريبية

---

### 11. اختبار الاشتراك
```
GET /test-subscription
```
**الوظيفة:** صفحة اختبار نظام الاشتراكات

---

### 12. حذف Tokens القديمة
```
GET /delete-old-tokens
```
**الوظيفة:** صفحة حذف Push Tokens القديمة

---

### 13. التحليل التلقائي
```
GET /auto-analysis
```
**الوظيفة:** صفحة مراقبة التحليل التلقائي

---

### 14. الرسم البياني
```
GET /chart
```
**الوظيفة:** عرض الرسم البياني مع البيانات

---

## 📝 ملاحظات مهمة

### Authentication Headers
جميع المسارات المحمية تحتاج:
```
Authorization: Bearer {your-jwt-token}
```

### Response Format
جميع الردود بصيغة JSON:
```json
{
  "success": true,
  "data": {...},
  "message": "رسالة بالعربية"
}
```

### Error Handling
الأخطاء تُرجع بصيغة:
```json
{
  "success": false,
  "error": "وصف الخطأ بالعربية"
}
```

### Rate Limiting
- التحليل اليدوي: حسب الاشتراك
- التحليل التلقائي: كل 5 دقائق
- المحادثة: يخصم عملات

---

## 🔑 Environment Variables المطلوبة

```env
# Database
DATABASE_URL=postgresql://...

# OANDA API
OANDA_API_KEY=your-oanda-key
OANDA_ACCOUNT_ID=your-account-id

# AI Model (Ollama)
OLLAMA_API_KEY=your-ollama-key
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=gemma3:27b-cloud-128K

# JWT
JWT_SECRET=your-secret-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token

# Expo Push Notifications
EXPO_ACCESS_TOKEN=your-expo-token
```

---

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل:
- Telegram: @iqbotict
- Email: support@ict-trader.com

---

**آخر تحديث:** 27 يناير 2025
**الإصدار:** 2.1.0
