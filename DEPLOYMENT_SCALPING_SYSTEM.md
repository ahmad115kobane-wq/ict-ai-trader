# دليل نشر نظام السكالبينج التلقائي

## الملفات الجديدة المضافة

### 1. Backend Files
```
server/src/services/scalpingService.ts       - خدمة تحليل السكالبينج
server/src/services/autoTradingService.ts    - خدمة التداول التلقائي
```

### 2. Documentation
```
SCALPING_SYSTEM_24_7.md                      - توثيق النظام الكامل
DEPLOYMENT_SCALPING_SYSTEM.md               - دليل النشر
```

### 3. التعديلات على الملفات الموجودة
```
server/src/index.ts                          - إضافة استدعاء startAutoTrading()
```

## خطوات النشر

### 1. رفع الكود إلى GitHub

```bash
# من مجلد المشروع الرئيسي
cd /path/to/appict1

# إضافة الملفات الجديدة
git add server/src/services/scalpingService.ts
git add server/src/services/autoTradingService.ts
git add server/src/index.ts
git add SCALPING_SYSTEM_24_7.md
git add DEPLOYMENT_SCALPING_SYSTEM.md

# Commit
git commit -m "إضافة نظام السكالبينج التلقائي 24/7 - يعمل على فريم 5 دقائق"

# Push
git push origin master
```

### 2. Railway سيقوم بالنشر تلقائياً

بمجرد push الكود، Railway سيقوم بـ:
1. اكتشاف التغييرات
2. بناء المشروع
3. إعادة تشغيل الخادم
4. بدء نظام التداول التلقائي

### 3. التحقق من النشر

```bash
# التحقق من حالة النظام
curl https://ict-ai-trader-production.up.railway.app/auto-trading-status

# يجب أن ترى:
{
  "success": true,
  "system": {
    "isRunning": true,
    "analysisCount": 1,
    ...
  }
}
```

## التحقق من عمل النظام

### 1. فحص Logs في Railway

```
1. افتح Railway Dashboard
2. اذهب إلى المشروع
3. افتح Deployments
4. اضغط على آخر deployment
5. افتح View Logs
```

**ابحث عن**:
```
✅ 24/7 Scalping System is ENABLED - Trading signals every 5 minutes
🤖 Auto Trading Service v1.0 - 24/7 Scalping System
🚀 بدء نظام التداول التلقائي...
```

### 2. اختبار التحليل اليدوي

```bash
curl -X POST https://ict-ai-trader-production.up.railway.app/trigger-analysis
```

### 3. فحص المستخدمين المؤهلين

```bash
curl https://ict-ai-trader-production.up.railway.app/debug-notifications
```

## إعداد المستخدمين

### لكي يستقبل المستخدم الإشارات:

1. **تفعيل الاشتراك**
   ```sql
   UPDATE users 
   SET subscription = 'vip', 
       subscription_expiry = '2026-12-31'
   WHERE email = 'user@example.com';
   ```

2. **تفعيل التحليل التلقائي**
   - من التطبيق: Settings → Auto Analysis → ON
   - أو يدوياً:
   ```sql
   UPDATE users 
   SET auto_analysis_enabled = true
   WHERE email = 'user@example.com';
   ```

3. **تسجيل Push Token**
   - يتم تلقائياً عند تفعيل الإشعارات في التطبيق
   - أو يدوياً:
   ```bash
   curl "https://ict-ai-trader-production.up.railway.app/set-push-token?email=user@example.com&token=ExponentPushToken[xxx]"
   ```

## المراقبة

### Endpoints للمراقبة

1. **حالة النظام**
   ```
   GET /auto-trading-status
   ```

2. **تشغيل تحليل يدوي**
   ```
   POST /trigger-analysis
   ```

3. **فحص المستخدمين**
   ```
   GET /debug-notifications
   ```

4. **فحص قاعدة البيانات**
   ```
   GET /debug-users
   ```

### مراقبة الأداء

```bash
# كل 5 دقائق، تحقق من:
watch -n 300 'curl -s https://ict-ai-trader-production.up.railway.app/auto-trading-status | jq'
```

## استكشاف الأخطاء

### المشكلة: النظام لا يرسل إشعارات

**الحل**:
1. تحقق من `/debug-notifications`
2. تأكد من وجود مستخدمين مؤهلين
3. تحقق من Firebase credentials
4. راجع logs الخادم

### المشكلة: التحليل لا يعمل

**الحل**:
1. تحقق من `/auto-trading-status`
2. جرب `/trigger-analysis`
3. تحقق من OANDA API
4. راجع logs

### المشكلة: الإشارات غير دقيقة

**الحل**:
1. راجع `scalpingService.ts`
2. عدل `MIN_MOMENTUM_SCORE`
3. عدل `SCALP_TP_DISTANCE` و `SCALP_SL_DISTANCE`
4. أضف فلاتر إضافية

## التخصيص

### تعديل الإعدادات

في `server/src/services/scalpingService.ts`:

```typescript
// تعديل الأهداف والاستوب
const SCALP_TP_DISTANCE = 7;      // غير إلى 10 لأهداف أكبر
const SCALP_SL_DISTANCE = 4;      // غير إلى 5 لاستوب أوسع

// تعديل الحد الأدنى للنقاط
const MIN_MOMENTUM_SCORE = 6;     // غير إلى 7 لإشارات أقوى

// تعديل فترة الانتظار
const COOLDOWN_MINUTES = 5;       // غير إلى 10 لإشارات أقل
```

### تعديل التكرار

في `server/src/services/autoTradingService.ts`:

```typescript
// تغيير من كل 5 دقائق إلى كل 15 دقيقة
const ANALYSIS_INTERVAL = '*/15 * * * *';
```

## الصيانة

### إعادة تشغيل النظام

```bash
# في Railway Dashboard
1. اذهب إلى Settings
2. اضغط Restart
```

### تحديث الكود

```bash
git pull
# عدل الملفات
git add .
git commit -m "تحديث النظام"
git push
# Railway سيعيد النشر تلقائياً
```

### النسخ الاحتياطي

```bash
# نسخ قاعدة البيانات
pg_dump $DATABASE_URL > backup.sql

# استعادة
psql $DATABASE_URL < backup.sql
```

## الأمان

### حماية Endpoints

أضف authentication للـ endpoints الحساسة:

```typescript
app.post('/trigger-analysis', authMiddleware, async (req, res) => {
  // ...
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100 // 100 طلب
});

app.use('/auto-trading-status', limiter);
```

## الأداء

### تحسين الأداء

1. **Caching**
   ```typescript
   // Cache بيانات السوق لمدة دقيقة
   const cache = new Map();
   ```

2. **Parallel Processing**
   ```typescript
   // معالجة المستخدمين بالتوازي
   await Promise.all(users.map(sendNotification));
   ```

3. **Database Indexing**
   ```sql
   CREATE INDEX idx_auto_analysis ON users(auto_analysis_enabled);
   CREATE INDEX idx_push_token ON users(push_token);
   ```

## الدعم

### للمساعدة:
1. راجع `SCALPING_SYSTEM_24_7.md`
2. تحقق من logs
3. اختبر endpoints
4. راجع قاعدة البيانات

### الموارد:
- Railway Docs: https://docs.railway.app
- Node-cron: https://github.com/node-cron/node-cron
- Firebase Admin: https://firebase.google.com/docs/admin/setup

## الخلاصة

النظام الآن:
- ✅ يعمل على مدار الساعة
- ✅ يحلل كل 5 دقائق
- ✅ يرسل إشارات للمستخدمين المؤهلين
- ✅ يحفظ التحليلات في قاعدة البيانات
- ✅ يدعم المراقبة والصيانة

**ملاحظة**: تأكد من مراقبة النظام بانتظام وتعديل الإعدادات حسب الأداء.
