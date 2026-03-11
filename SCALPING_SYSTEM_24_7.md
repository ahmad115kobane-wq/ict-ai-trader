# نظام السكالبينج التلقائي 24/7

## التاريخ
11 مارس 2026

## نظرة عامة

تم تحويل الاستراتيجية إلى نظام سكالبينج سريع يعمل على مدار الساعة (24/7) بدون توقف.

## الميزات الرئيسية

### 1. استراتيجية سكالبينج سريعة
- **الإطار الزمني**: 5 دقائق (M5)
- **الهدف**: 7 دولار (TP)
- **الاستوب**: 4 دولار (SL)
- **Risk:Reward**: 1:1.75
- **التحليل**: كل 5 دقائق تلقائياً

### 2. العمل المستمر
- يعمل على مدار اليوم بدون توقف
- تحليل تلقائي كل 5 دقائق
- إعادة تعيين الإحصائيات اليومية عند منتصف الليل
- فترة انتظار 5 دقائق بين الصفقات

### 3. إرسال الإشارات للمستخدمين
- يتم إرسال الإشارات فقط للمستخدمين:
  - المشتركين (VIP/Premium)
  - المفعلين للتحليل التلقائي
  - لديهم push token مسجل
- إشعارات فورية عبر Firebase
- حفظ التحليلات في قاعدة البيانات

## البنية التقنية

### الملفات الجديدة

#### 1. `server/src/services/scalpingService.ts`
خدمة تحليل السكالبينج السريع

**الوظائف الرئيسية**:
```typescript
// تحليل الزخم السريع
analyzeFastMomentum(candles: any[]): MomentumAnalysis

// تحليل الدعم والمقاومة
findQuickSR(candles: any[], currentPrice: number): SupportResistance

// التحليل الرئيسي
analyzeScalping(symbol: string, m5Candles: any[], currentPrice: number): Promise<ICTAnalysis>

// إحصائيات اليوم
getTodayStats()

// إعادة تعيين يومية
resetDailyStats()
```

**معايير التحليل**:
- تحليل آخر 5 شموع للزخم
- 4 من 5 شموع في نفس الاتجاه = إشارة قوية
- الحد الأدنى للنقاط: 6/10
- التحقق من القرب من الدعم/المقاومة

#### 2. `server/src/services/autoTradingService.ts`
خدمة التداول التلقائي

**الوظائف الرئيسية**:
```typescript
// تشغيل التحليل التلقائي
runAutoAnalysis(): Promise<void>

// بدء النظام
startAutoTrading(): void

// حالة النظام
getSystemStatus()

// إيقاف النظام
stopAutoTrading(): void

// تحليل يدوي
runManualAnalysis(): Promise<any>
```

**الجدولة**:
- تحليل كل 5 دقائق: `*/5 * * * *`
- إعادة تعيين يومية: `0 0 * * *`

### التكامل مع النظام الحالي

#### في `server/src/index.ts`:
```typescript
// بدء نظام التداول التلقائي
const { startAutoTrading } = require('./services/autoTradingService');
startAutoTrading();
```

## API Endpoints الجديدة

### 1. حالة النظام
```
GET /auto-trading-status
```

**Response**:
```json
{
  "success": true,
  "system": {
    "isRunning": true,
    "analysisCount": 145,
    "lastAnalysisTime": "2026-03-11T10:35:00.000Z",
    "nextAnalysis": "2026-03-11T10:40:00.000Z",
    "uptime": "12h 35m"
  },
  "trading": {
    "todayTrades": 23,
    "consecutiveWins": 3,
    "consecutiveLosses": 0,
    "currentTrend": "BULLISH",
    "lastTradeTime": "2026-03-11T10:30:00.000Z"
  },
  "config": {
    "interval": "كل 5 دقائق",
    "strategy": "سكالبينج سريع",
    "targetProfit": "7 دولار",
    "stopLoss": "4 دولار",
    "riskReward": "1:1.75"
  }
}
```

### 2. تشغيل تحليل يدوي
```
POST /trigger-analysis
```

**Response**:
```json
{
  "success": true,
  "message": "تم تشغيل التحليل اليدوي بنجاح",
  "result": {
    "isRunning": false,
    "analysisCount": 146,
    "lastAnalysisTime": "2026-03-11T10:36:00.000Z"
  }
}
```

## آلية العمل

### 1. دورة التحليل (كل 5 دقائق)

```
1. جلب بيانات السوق
   ├─ شموع M5 (آخر 50 شمعة)
   └─ السعر الحالي

2. تحليل السوق
   ├─ تحليل الزخم (آخر 5 شموع)
   ├─ تحليل الدعم والمقاومة
   └─ تحديد القرار (BUY/SELL/WAIT)

3. حساب SL و TP
   ├─ Entry: السعر الحالي
   ├─ SL: ±4 دولار
   ├─ TP1: ±7 دولار
   ├─ TP2: ±10.5 دولار
   └─ TP3: ±14 دولار

4. حفظ التحليل
   └─ قاعدة البيانات (auto_analysis)

5. إرسال الإشعارات
   ├─ جلب المستخدمين المؤهلين
   ├─ إرسال Firebase Push Notification
   └─ حفظ في سجل كل مستخدم
```

### 2. فلاتر الجودة

#### فلتر الزخم
- يجب أن يكون 4 من 5 شموع في نفس الاتجاه
- النقاط: 6/10 كحد أدنى

#### فلتر الدعم/المقاومة
- لا شراء قرب المقاومة (ضمن 0.3%)
- لا بيع قرب الدعم (ضمن 0.3%)

#### فلتر الانتظار
- 5 دقائق بين كل صفقة
- منع الإشارات المتكررة

### 3. إدارة المخاطر

```typescript
const SCALP_TP_DISTANCE = 7;      // هدف 7 دولار
const SCALP_SL_DISTANCE = 4;      // استوب 4 دولار
const MIN_MOMENTUM_SCORE = 6;     // الحد الأدنى للزخم
const COOLDOWN_MINUTES = 5;       // فترة الانتظار
```

## المستخدمون المؤهلون

### شروط استقبال الإشارات:

1. **اشتراك نشط**
   - VIP أو Premium
   - غير منتهي الصلاحية

2. **التحليل التلقائي مفعل**
   - `auto_analysis_enabled = true`

3. **Push Token مسجل**
   - تم تفعيل الإشعارات في التطبيق

### التحقق من المستخدمين:

```sql
SELECT u.* 
FROM users u
WHERE u.auto_analysis_enabled = true
  AND u.push_token IS NOT NULL 
  AND u.push_token != ''
  AND (
    u.subscription = 'vip' 
    OR u.subscription = 'premium'
  )
  AND (
    u.subscription_expiry IS NULL 
    OR u.subscription_expiry > NOW()
  )
```

## الإشعارات

### نوع الإشعار
```json
{
  "title": "🎯 إشارة سكالبينج جديدة",
  "body": "BUY @ 2750.00 | TP: 2757.00 | SL: 2746.00",
  "data": {
    "type": "trade_signal",
    "symbol": "XAUUSD",
    "decision": "BUY",
    "entry": 2750.00,
    "sl": 2746.00,
    "tp1": 2757.00,
    "tp2": 2760.50,
    "tp3": 2764.00,
    "score": 8,
    "confidence": 80
  }
}
```

## الإحصائيات اليومية

### يتم تتبع:
- عدد الصفقات اليوم
- الانتصارات المتتالية
- الخسائر المتتالية
- الاتجاه الحالي
- وقت آخر صفقة

### إعادة التعيين:
- تلقائياً عند منتصف الليل
- يدوياً عبر `resetDailyStats()`

## المراقبة والصيانة

### Logs
```bash
# عرض logs النظام
tail -f logs/auto-trading.log

# البحث عن أخطاء
grep "ERROR" logs/auto-trading.log

# عرض الإشارات المرسلة
grep "إشارة" logs/auto-trading.log
```

### الصحة
```bash
# التحقق من حالة النظام
curl https://your-domain.com/auto-trading-status

# تشغيل تحليل يدوي
curl -X POST https://your-domain.com/trigger-analysis
```

## الاختبار

### 1. اختبار محلي
```bash
cd server
npm run dev
```

### 2. اختبار التحليل
```bash
curl http://localhost:3001/trigger-analysis -X POST
```

### 3. اختبار الإشعارات
```bash
curl http://localhost:3001/send-test-notification?email=user@example.com
```

## النشر

### 1. رفع الكود
```bash
git add .
git commit -m "إضافة نظام السكالبينج التلقائي 24/7"
git push
```

### 2. Railway
- يتم النشر تلقائياً عند push
- يبدأ النظام تلقائياً عند التشغيل

### 3. التحقق
```bash
# التحقق من حالة النظام
curl https://ict-ai-trader-production.up.railway.app/auto-trading-status
```

## الأداء المتوقع

### الإشارات
- **التكرار**: كل 5 دقائق
- **الإشارات اليومية**: 50-100 تحليل
- **الصفقات الفعلية**: 10-20 إشارة تداول

### الدقة
- **الحد الأدنى للنقاط**: 6/10
- **الثقة**: 60%+
- **Risk:Reward**: 1:1.75

## الملاحظات المهمة

1. **الاستهلاك**: النظام يستهلك موارد بشكل مستمر
2. **التكلفة**: قد تزيد تكلفة API calls
3. **المراقبة**: يجب مراقبة الأداء بانتظام
4. **الصيانة**: إعادة تشغيل دورية موصى بها

## الدعم

للمشاكل أو الاستفسارات:
- تحقق من `/auto-trading-status`
- راجع logs الخادم
- اختبر `/trigger-analysis`
- تحقق من `/debug-notifications`

## التحديثات المستقبلية

- [ ] إضافة ML للتحسين التلقائي
- [ ] تتبع الأداء التاريخي
- [ ] تحسين الفلاتر بناءً على النتائج
- [ ] إضافة رموز أخرى (EUR/USD, etc.)
- [ ] لوحة تحكم للإحصائيات
