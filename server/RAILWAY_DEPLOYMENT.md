# 🚀 نشر السيرفر على Railway

## خطوات النشر

### 1. إنشاء حساب على Railway
1. اذهب إلى [railway.app](https://railway.app)
2. سجل دخول باستخدام GitHub

### 2. إنشاء مشروع جديد
1. اضغط على "New Project"
2. اختر "Deploy from GitHub repo"
3. اختر المستودع الخاص بك
4. اختر مجلد `server` كـ Root Directory

### 3. إعداد المتغيرات البيئية (Environment Variables)

في لوحة تحكم Railway، اذهب إلى Variables وأضف:

```env
# Server Config
NODE_ENV=production
PORT=3001

# JWT Secret - غيّر هذا لمفتاح قوي!
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Ollama AI Config
OLLAMA_API_KEY=b2bd46acc50c4414a7796b1ba8cbe928.cxRXHpFkuBtdNejTeRDiW_9A
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=gemma3:27b

# OANDA Config
OANDA_API_KEY=531b3cfe32a6e44f9b31c69734f85558-b8f3b06be8ebf821597510767d6bcf6d
OANDA_BASE_URL=https://api-fxpractice.oanda.com
OANDA_ACCOUNT_ID=101-001-30294518-001

# Database
DATABASE_PATH=./data/ict_trader.db
```

### 4. إعدادات Railway

Railway سيقوم تلقائياً بـ:
- ✅ تثبيت المكتبات (`npm install`)
- ✅ بناء المشروع (`npm run build`)
- ✅ تشغيل السيرفر (`node dist/index.js`)

### 5. الحصول على رابط السيرفر

بعد النشر، Railway سيعطيك رابط مثل:
```
https://your-app-name.up.railway.app
```

### 6. تحديث رابط API في التطبيق

في ملف `mobile/src/services/apiService.ts`، غيّر:

```typescript
// من:
const API_BASE_URL = 'http://192.168.0.116:3001/api';

// إلى:
const API_BASE_URL = 'https://your-app-name.up.railway.app/api';
```

## 📋 الملفات المضافة للنشر

- ✅ `railway.json` - إعدادات Railway
- ✅ `nixpacks.toml` - إعدادات البناء
- ✅ `Procfile` - أمر التشغيل
- ✅ `.railwayignore` - ملفات يتم تجاهلها
- ✅ `.env.example` - مثال للمتغيرات البيئية

## 🔧 إعدادات إضافية

### تفعيل HTTPS
Railway يوفر HTTPS تلقائياً ✅

### قاعدة البيانات
- السيرفر يستخدم SQLite (sql.js)
- البيانات تُحفظ في مجلد `data/`
- Railway يوفر persistent storage تلقائياً

### Auto-Restart
Railway يعيد تشغيل السيرفر تلقائياً عند:
- حدوث خطأ (حتى 10 محاولات)
- تحديث الكود (push جديد)

## 🐛 استكشاف الأخطاء

### عرض Logs
في لوحة تحكم Railway:
1. اذهب إلى "Deployments"
2. اضغط على آخر deployment
3. اضغط على "View Logs"

### مشاكل شائعة

#### 1. خطأ في البناء (Build Error)
```bash
# تأكد من أن package.json يحتوي على:
"engines": {
  "node": ">=18.0.0"
}
```

#### 2. خطأ في التشغيل (Runtime Error)
- تحقق من المتغيرات البيئية
- تحقق من أن PORT يساوي 3001 أو غير محدد (Railway يضبطه تلقائياً)

#### 3. خطأ في قاعدة البيانات
```bash
# تأكد من وجود مجلد data
mkdir -p data
```

## 🔄 التحديثات التلقائية

Railway يدعم Auto-Deploy:
1. كل push لـ GitHub
2. يتم بناء ونشر النسخة الجديدة تلقائياً
3. Zero-downtime deployment

## 💰 التكلفة

Railway يوفر:
- ✅ $5 رصيد مجاني شهرياً
- ✅ كافي لتطبيق صغير/متوسط
- ✅ Pay-as-you-go بعد ذلك

## 📊 المراقبة

في لوحة تحكم Railway:
- CPU Usage
- Memory Usage
- Network Traffic
- Request Count

## 🔐 الأمان

تأكد من:
- ✅ تغيير JWT_SECRET في production
- ✅ استخدام HTTPS فقط
- ✅ عدم رفع ملف .env للـ GitHub
- ✅ استخدام Environment Variables في Railway

## 📱 ربط التطبيق بالسيرفر

بعد النشر، حدّث:

### 1. Mobile App
```typescript
// mobile/src/services/apiService.ts
const API_BASE_URL = 'https://your-app-name.up.railway.app/api';
```

### 2. اختبار الاتصال
```bash
curl https://your-app-name.up.railway.app/api/auth/health
```

يجب أن ترى:
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T..."
}
```

## ✅ Checklist قبل النشر

- [ ] تم تحديث جميع المتغيرات البيئية
- [ ] تم تغيير JWT_SECRET
- [ ] تم اختبار السيرفر محلياً
- [ ] تم بناء المشروع بنجاح (`npm run build`)
- [ ] تم التأكد من عمل قاعدة البيانات
- [ ] تم تحديث رابط API في التطبيق

## 🎉 بعد النشر

1. اختبر جميع endpoints
2. تحقق من عمل التحليل التلقائي
3. تحقق من عمل الإشعارات
4. راقب الـ logs لأي أخطاء

---

**ملاحظة**: Railway يدعم Custom Domains إذا أردت استخدام نطاق خاص بك.
