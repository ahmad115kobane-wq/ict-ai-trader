# 🗄️ تحويل قاعدة البيانات من SQLite إلى PostgreSQL على Railway

## ⚠️ المشكلة الحالية:

السيرفر يستخدم SQLite (`server/data/ict_trader.db`) والذي:
- ❌ يُمسح عند كل إعادة نشر على Railway
- ❌ لا يُحفظ البيانات بشكل دائم
- ❌ غير مناسب للإنتاج

## ✅ الحل: استخدام PostgreSQL على Railway

Railway يوفر PostgreSQL مجاناً مع:
- ✅ تخزين دائم (persistent)
- ✅ نسخ احتياطي تلقائي
- ✅ أداء أفضل
- ✅ مناسب للإنتاج

---

## 📋 خطوات التحويل:

### 1️⃣ إضافة PostgreSQL في Railway

1. اذهب إلى Railway Dashboard
2. افتح مشروعك `ict-ai-trader`
3. اضغط **"+ New"** → **"Database"** → **"Add PostgreSQL"**
4. Railway سينشئ قاعدة بيانات تلقائياً
5. سيضيف متغير بيئة: `DATABASE_URL`

---

### 2️⃣ تثبيت مكتبة PostgreSQL

في `server/package.json`، أضف:

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4"
  }
}
```

ثم:
```bash
cd server
npm install pg pg-hstore
```

---

### 3️⃣ إنشاء ملف database adapter

سأنشئ ملف جديد يدعم كلاً من SQLite (للتطوير) و PostgreSQL (للإنتاج).

---

### 4️⃣ تحديث متغيرات البيئة

في Railway Dashboard → Variables، أضف:

```env
DATABASE_URL=<سيتم إضافته تلقائياً من PostgreSQL>
NODE_ENV=production
```

---

### 5️⃣ ترحيل البيانات (اختياري)

إذا كان لديك بيانات مهمة في SQLite:

```bash
# تصدير البيانات من SQLite
sqlite3 server/data/ict_trader.db .dump > backup.sql

# تحويل إلى PostgreSQL format
# (يحتاج تعديلات يدوية)
```

---

## 🔧 الكود المطلوب:

### ملف: `server/src/db/postgresAdapter.ts`

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export default pool;
```

---

## 🎯 الخيارات المتاحة:

### الخيار 1: استخدام PostgreSQL (موصى به)
- ✅ تخزين دائم
- ✅ مناسب للإنتاج
- ⚠️ يحتاج تعديل الكود

### الخيار 2: استخدام Railway Volumes (SQLite)
- ✅ يبقي الكود كما هو
- ✅ تخزين دائم
- ⚠️ أبطأ من PostgreSQL
- ⚠️ محدود (1GB مجاناً)

### الخيار 3: استخدام Turso (SQLite في السحابة)
- ✅ SQLite في السحابة
- ✅ تخزين دائم
- ⚠️ يحتاج حساب منفصل

---

## 💡 التوصية:

**استخدم PostgreSQL** لأنه:
1. مدمج مع Railway
2. مجاني
3. أفضل أداء
4. تخزين دائم
5. نسخ احتياطي تلقائي

---

## 🚀 الخطوات السريعة:

1. أضف PostgreSQL في Railway Dashboard
2. سأنشئ لك الكود المطلوب
3. ارفع التغييرات
4. Railway سيستخدم PostgreSQL تلقائياً

---

هل تريد أن أنشئ لك الكود الكامل للتحويل إلى PostgreSQL؟
