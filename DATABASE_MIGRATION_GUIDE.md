# دليل تحديث قاعدة البيانات 🔄

## التاريخ: 2026-03-11
## Commit: eb0035f

---

## 🎯 المشكلة

قاعدة البيانات على Railway لا تحتوي على:
- ❌ حقل `balance` في جدول `users`
- ❌ جدول `paper_positions` للصفقات
- ❌ الفهارس المطلوبة

---

## ✅ الحل - نظام Migrations

تم إنشاء نظام migrations كامل لتحديث قاعدة البيانات تلقائياً.

### الملفات الجديدة:

1. **`server/src/db/migrations.ts`**
   - دوال تحديث قاعدة البيانات
   - التحقق من حالة قاعدة البيانات

2. **`server/public/run-migrations.html`**
   - واجهة ويب لتشغيل migrations
   - عرض حالة قاعدة البيانات

3. **Endpoints جديدة في `index.ts`**:
   - `POST /api/admin/run-migrations` - تشغيل migrations
   - `GET /api/admin/database-status` - التحقق من الحالة
   - `GET /run-migrations` - صفحة الويب

---

## 🚀 كيفية الاستخدام

### الطريقة 1: عبر الويب (الأسهل) ✅

1. افتح المتصفح واذهب إلى:
   ```
   https://your-railway-url.railway.app/run-migrations
   ```

2. ستظهر لك صفحة بها:
   - ✅ حالة قاعدة البيانات الحالية
   - ✅ زر "التحقق من الحالة"
   - ✅ زر "تشغيل Migrations"

3. اضغط على "تشغيل Migrations"

4. انتظر حتى تكتمل العملية

5. تحقق من النتيجة

### الطريقة 2: عبر API

```bash
# التحقق من الحالة
curl https://your-railway-url.railway.app/api/admin/database-status

# تشغيل migrations
curl -X POST https://your-railway-url.railway.app/api/admin/run-migrations
```

---

## 📊 ما الذي سيتم إنشاؤه؟

### 1. حقل balance في جدول users

```sql
ALTER TABLE users ADD COLUMN balance REAL DEFAULT 10000;
UPDATE users SET balance = 10000 WHERE balance IS NULL;
```

**الفائدة**: كل مستخدم سيكون له رصيد افتراضي 10,000$

### 2. جدول paper_positions

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
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  close_price REAL,
  realized_pnl REAL,
  status TEXT DEFAULT 'open',      -- 'open' or 'closed'
  close_reason TEXT,               -- 'Stop Loss', 'Take Profit', 'Margin Call'
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**الفائدة**: تخزين جميع الصفقات على الخادم

### 3. الفهارس

```sql
CREATE INDEX idx_positions_user ON paper_positions(user_id);
CREATE INDEX idx_positions_status ON paper_positions(status);
CREATE INDEX idx_positions_user_status ON paper_positions(user_id, status);
```

**الفائدة**: استعلامات أسرع بكثير

---

## 🔍 التحقق من النجاح

بعد تشغيل migrations، يجب أن ترى:

```json
{
  "success": true,
  "hasBalanceColumn": true,
  "hasPositionsTable": true,
  "usersCount": 5,
  "totalPositions": 0,
  "openPositions": 0,
  "needsMigration": false
}
```

---

## ⚠️ ملاحظات مهمة

1. **آمن تماماً**: 
   - يستخدم `IF NOT EXISTS` لتجنب الأخطاء
   - لن يحذف أي بيانات موجودة
   - يمكن تشغيله عدة مرات بأمان

2. **تلقائي**:
   - يتحقق من وجود الحقول والجداول قبل الإنشاء
   - يعرض رسائل واضحة عن كل خطوة

3. **قابل للتراجع**:
   - يستخدم transactions (BEGIN/COMMIT)
   - إذا فشلت أي خطوة، يتم التراجع عن كل شيء

---

## 🎯 بعد Migration

بعد نجاح migration، سيعمل النظام بالكامل:

✅ **نظام مراقبة الصفقات**:
- يفحص الصفقات كل 5 ثوان
- يغلق عند SL/TP تلقائياً
- يحدث الرصيد تلقائياً

✅ **نظام التداول التلقائي**:
- يحلل السوق كل 5 دقائق
- يرسل إشعارات للمستخدمين
- (المستقبل) سيفتح صفقات تلقائياً

✅ **API Endpoints** (قريباً):
- فتح صفقة جديدة
- إغلاق صفقة
- تعديل SL/TP
- جلب الصفقات والرصيد

---

## 🐛 استكشاف الأخطاء

### خطأ: "PostgreSQL not initialized"
**الحل**: انتظر 10 ثوانٍ بعد بدء الخادم ثم حاول مرة أخرى

### خطأ: "Permission denied"
**الحل**: تأكد من أن DATABASE_URL صحيح في Railway

### خطأ: "Table already exists"
**الحل**: هذا طبيعي! يعني أن الجدول موجود بالفعل

---

## 📝 الخطوات التالية

1. ✅ تشغيل migrations على Railway
2. ⏳ إنشاء API endpoints للتطبيق
3. ⏳ تحديث التطبيق ليستخدم الخادم بدلاً من SecureStore
4. ⏳ اختبار النظام الكامل

---

## 🚀 الحالة الحالية

- ✅ نظام migrations جاهز
- ✅ صفحة الويب جاهزة
- ✅ Endpoints جاهزة
- ⏳ يحتاج تشغيل على Railway
- ⏳ يحتاج API endpoints للتطبيق

