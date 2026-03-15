# نظام مراقبة الصفقات على الخادم ✅

## التاريخ: 2026-03-11
## Commit: 498be16

---

## 🎯 المشكلة السابقة

كان النظام يعمل على الهاتف فقط:
- ❌ الستوب لوز والهدف لا يغلقان إلا عند فتح التطبيق
- ❌ فتح الصفقات يتم على الهاتف
- ❌ خصم وإضافة الرصيد يتم على الهاتف
- ❌ التداول التلقائي يرسل إشعارات فقط بدون فتح صفقات

---

## ✅ الحل الجديد - كل شيء على الخادم

### 1. نظام مراقبة الصفقات (Position Monitor Service)
**الملف**: `server/src/services/positionMonitorService.ts`

**الوظائف**:
- 🔍 يفحص جميع الصفقات المفتوحة كل 5 ثوان
- 📊 يتحقق من السعر الحالي من OANDA
- ✅ يغلق الصفقات تلقائياً عند:
  - وصول السعر للستوب لوز (Stop Loss)
  - وصول السعر للهدف (Take Profit)
  - Margin Call (عند 20% من الرصيد)
- 💰 يحدث رصيد المستخدم تلقائياً بعد كل إغلاق

**المميزات**:
```typescript
- CHECK_INTERVAL: 5000 // فحص كل 5 ثوان
- CONTRACT_SIZE: 100
- LEVERAGE: 500
- MARGIN_CALL_PERCENT: 0.20 // 20%
```

### 2. قاعدة البيانات - جدول الصفقات
**الجدول**: `paper_positions`

```sql
CREATE TABLE paper_positions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,              -- 'BUY' or 'SELL'
  lot_size REAL NOT NULL,
  entry_price REAL NOT NULL,
  stop_loss REAL NOT NULL,
  take_profit REAL NOT NULL,
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  close_price REAL,
  realized_pnl REAL,
  status TEXT DEFAULT 'open',      -- 'open' or 'closed'
  close_reason TEXT,               -- 'Stop Loss', 'Take Profit', 'Margin Call'
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### 3. دوال قاعدة البيانات الجديدة

**في `database.ts` و `postgresOperations.ts`**:

```typescript
// الحصول على جميع الصفقات المفتوحة
getAllOpenPositions(): Promise<any[]>

// إغلاق صفقة
closePositionInDb(positionId, closePrice, realizedPnl, reason): Promise<void>

// تحديث رصيد المستخدم
updateUserBalance(userId, newBalance): Promise<void>

// فتح صفقة جديدة
openPositionInDb(userId, symbol, side, lotSize, entryPrice, stopLoss, takeProfit): Promise<string>

// الحصول على صفقات مستخدم
getUserOpenPositions(userId): Promise<any[]>
getUserClosedPositions(userId, limit): Promise<any[]>

// تحديث SL/TP
updatePositionSlTp(positionId, stopLoss?, takeProfit?): Promise<void>

// الحصول على صفقة واحدة
getPositionById(positionId): Promise<any>
```

### 4. حقل balance في جدول users

تم إضافة حقل `balance` في جدول المستخدمين:
```sql
ALTER TABLE users ADD COLUMN balance REAL DEFAULT 10000;
```

---

## 🚀 كيف يعمل النظام

### 1. بدء التشغيل
عند تشغيل الخادم في `server/src/index.ts`:

```typescript
// بدء نظام التداول التلقائي (سكالبينج 24/7)
const { startAutoTrading } = require('./services/autoTradingService');
startAutoTrading();

// بدء مراقبة الصفقات على الخادم (SL/TP Monitoring)
const { startPositionMonitoring } = require('./services/positionMonitorService');
startPositionMonitoring();
```

### 2. دورة المراقبة (كل 5 ثوان)

```
1. جلب جميع الصفقات المفتوحة من قاعدة البيانات
2. جلب السعر الحالي من OANDA
3. لكل مستخدم:
   a. فحص Margin Call (إذا كان equity <= 20% من used margin)
      - إغلاق جميع الصفقات
      - تحديث الرصيد
   b. فحص كل صفقة:
      - BUY: إغلاق إذا السعر <= SL أو >= TP
      - SELL: إغلاق إذا السعر >= SL أو <= TP
      - حساب الربح/الخسارة
      - تحديث الرصيد
4. حفظ التغييرات في قاعدة البيانات
```

### 3. حساب الربح/الخسارة

```typescript
function calculatePnl(
  entryPrice: number,
  currentPrice: number,
  lotSize: number,
  side: 'BUY' | 'SELL'
): number {
  const direction = side === 'BUY' ? 1 : -1;
  const delta = (currentPrice - entryPrice) * direction;
  return delta * lotSize * CONTRACT_SIZE; // CONTRACT_SIZE = 100
}
```

---

## 📊 مثال عملي

### فتح صفقة:
```typescript
// المستخدم يفتح صفقة BUY
userId: "user123"
symbol: "XAUUSD"
side: "BUY"
lotSize: 0.1
entryPrice: 2650.00
stopLoss: 2646.00  // -4$
takeProfit: 2657.00 // +7$
```

### المراقبة التلقائية:
```
⏰ كل 5 ثوان:
  📊 السعر الحالي: 2651.50
  ✅ الصفقة لا تزال مفتوحة (بين SL و TP)
  
⏰ بعد دقيقة:
  📊 السعر الحالي: 2657.50
  ✅ وصل للهدف! إغلاق تلقائي
  💰 الربح: +7$ × 0.1 × 100 = +70$
  💵 الرصيد الجديد: 10000 + 70 = 10070$
```

---

## 🔄 التكامل مع التداول التلقائي

### نظام السكالبينج (autoTradingService.ts):
1. يحلل السوق كل 5 دقائق
2. إذا وجد إشارة تداول:
   - يرسل إشعار للمستخدمين المشتركين
   - **المستقبل**: سيفتح صفقات تلقائياً باستخدام `openPositionInDb()`

### نظام المراقبة (positionMonitorService.ts):
1. يراقب الصفقات المفتوحة كل 5 ثوان
2. يغلق الصفقات عند SL/TP
3. يحدث الرصيد تلقائياً

---

## ✅ الفوائد

1. **يعمل 24/7**: لا يحتاج المستخدم لفتح التطبيق
2. **دقة عالية**: فحص كل 5 ثوان
3. **أمان**: Margin Call تلقائي عند 20%
4. **موثوقية**: كل شيء على الخادم
5. **قابل للتوسع**: يدعم آلاف المستخدمين

---

## 📝 الخطوات التالية

### 1. ربط التطبيق بالخادم
- تحويل `paperTradingService.ts` ليستخدم API الخادم
- إزالة `SecureStore` والاعتماد على قاعدة البيانات

### 2. API Endpoints المطلوبة
```typescript
POST /api/positions/open       // فتح صفقة
POST /api/positions/:id/close  // إغلاق صفقة
GET  /api/positions/open       // جلب الصفقات المفتوحة
GET  /api/positions/closed     // جلب الصفقات المغلقة
PUT  /api/positions/:id/sl-tp  // تعديل SL/TP
GET  /api/account/balance      // جلب الرصيد
```

### 3. التداول التلقائي الكامل
- فتح صفقات تلقائياً للمستخدمين المشتركين
- إدارة المخاطر (حد أقصى للصفقات المفتوحة)
- تنويع الصفقات (عدم فتح نفس الاتجاه مرتين)

---

## 🎯 الحالة الحالية

- ✅ نظام المراقبة جاهز ويعمل
- ✅ قاعدة البيانات جاهزة
- ✅ الدوال المطلوبة موجودة
- ⏳ يحتاج API endpoints للتطبيق
- ⏳ يحتاج تحديث التطبيق ليستخدم الخادم

---

## 🚀 النشر

تم رفع التحديثات إلى GitHub (Commit: 498be16)
Railway سيقوم ببناء ونشر الباك اند تلقائياً.

