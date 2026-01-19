# ✅ تجهيز السيرفر للنشر على Railway - مكتمل

## 📋 الملفات المضافة

### 1. ملفات إعدادات Railway
- ✅ `server/railway.json` - إعدادات Railway الأساسية
- ✅ `server/nixpacks.toml` - إعدادات البناء والمكتبات المطلوبة
- ✅ `server/Procfile` - أمر تشغيل السيرفر
- ✅ `server/.railwayignore` - ملفات يتم تجاهلها عند النشر

### 2. ملفات التوثيق
- ✅ `server/RAILWAY_DEPLOYMENT.md` - دليل شامل للنشر
- ✅ `server/QUICK_START_RAILWAY.md` - دليل سريع (5 دقائق)
- ✅ `server/.env.example` - مثال للمتغيرات البيئية

### 3. تحديثات الكود
- ✅ `server/package.json` - إضافة engines و postinstall
- ✅ `server/src/routes/auth.ts` - إضافة health check endpoint
- ✅ `server/.gitignore` - تحديث لتجاهل الملفات غير المطلوبة

---

## 🚀 خطوات النشر السريعة

### 1. تجهيز المشروع
```bash
cd server
npm install
npm run build
```

### 2. رفع الكود لـ GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push
```

### 3. النشر على Railway
1. اذهب إلى: https://railway.app
2. سجل دخول بـ GitHub
3. New Project → Deploy from GitHub repo
4. اختر المستودع
5. **مهم**: Root Directory = `server`

### 4. إضافة المتغيرات البيئية
في Railway Dashboard → Variables:

```env
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
OLLAMA_API_KEY=b2bd46acc50c4414a7796b1ba8cbe928.cxRXHpFkuBtdNejTeRDiW_9A
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=gemma3:27b
OANDA_API_KEY=531b3cfe32a6e44f9b31c69734f85558-b8f3b06be8ebf821597510767d6bcf6d
OANDA_BASE_URL=https://api-fxpractice.oanda.com
OANDA_ACCOUNT_ID=101-001-30294518-001
DATABASE_PATH=./data/ict_trader.db
```

### 5. انتظر النشر
Railway سيقوم تلقائياً بـ:
- ✅ npm install
- ✅ npm run build
- ✅ node dist/index.js

### 6. احصل على الرابط
```
https://your-app-name.up.railway.app
```

### 7. اختبر السيرفر
```bash
curl https://your-app-name.up.railway.app/api/auth/health
```

النتيجة المتوقعة:
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### 8. حدّث التطبيق
في `mobile/src/services/apiService.ts`:
```typescript
const API_BASE_URL = 'https://your-app-name.up.railway.app/api';
```

---

## 🔧 الميزات المضافة

### Health Check Endpoint
```
GET /api/auth/health
```
يعيد:
- status: حالة السيرفر
- timestamp: الوقت الحالي
- uptime: مدة تشغيل السيرفر
- environment: بيئة التشغيل

### Auto-Restart
Railway يعيد تشغيل السيرفر تلقائياً عند:
- حدوث خطأ (حتى 10 محاولات)
- push جديد للكود

### Persistent Storage
- قاعدة البيانات SQLite محفوظة في `data/`
- Railway يوفر persistent volumes تلقائياً

### HTTPS
- Railway يوفر HTTPS تلقائياً
- شهادة SSL مجانية

---

## 📊 المراقبة

في Railway Dashboard:
- **Metrics**: CPU, Memory, Network
- **Logs**: عرض logs مباشرة
- **Deployments**: تاريخ النشر

---

## 🔐 الأمان

### ✅ تم تطبيقه:
- CORS مفعّل
- Helmet للحماية
- JWT للمصادقة
- Session management

### ⚠️ مهم:
- غيّر `JWT_SECRET` في production
- لا ترفع ملف `.env` للـ GitHub
- استخدم Environment Variables في Railway

---

## 💰 التكلفة

Railway يوفر:
- ✅ $5 رصيد مجاني شهرياً
- ✅ كافي لـ ~500 ساعة تشغيل
- ✅ Pay-as-you-go بعد ذلك

### تقدير التكلفة:
- سيرفر صغير: ~$5-10/شهر
- سيرفر متوسط: ~$10-20/شهر

---

## 🔄 التحديثات التلقائية

Railway يدعم Auto-Deploy:
1. كل push لـ GitHub
2. يتم بناء ونشر النسخة الجديدة تلقائياً
3. Zero-downtime deployment

---

## 📱 ربط التطبيق

### Mobile App
```typescript
// mobile/src/services/apiService.ts
const API_BASE_URL = 'https://your-app.up.railway.app/api';
```

### اختبار الاتصال
```typescript
// Test endpoints:
GET /api/auth/health
POST /api/auth/login
POST /api/auth/register
GET /api/analysis/price/XAUUSD
```

---

## 🐛 استكشاف الأخطاء

### خطأ في البناء؟
```bash
# اختبر محلياً:
npm run build
node dist/index.js
```

### خطأ في التشغيل؟
1. تحقق من Variables في Railway
2. تحقق من Logs
3. تحقق من أن PORT غير محدد (Railway يضبطه تلقائياً)

### لا يمكن الاتصال؟
1. تحقق من أن السيرفر يعمل (Logs)
2. تحقق من الرابط صحيح
3. تحقق من CORS مفعّل
4. اختبر health endpoint أولاً

---

## ✅ Checklist النشر

- [ ] تم تثبيت المكتبات (`npm install`)
- [ ] تم بناء المشروع (`npm run build`)
- [ ] تم اختبار السيرفر محلياً
- [ ] تم رفع الكود لـ GitHub
- [ ] تم إنشاء مشروع على Railway
- [ ] تم ضبط Root Directory على `server`
- [ ] تم إضافة جميع المتغيرات البيئية
- [ ] تم تغيير JWT_SECRET
- [ ] تم اختبار health endpoint
- [ ] تم تحديث رابط API في التطبيق
- [ ] تم اختبار جميع endpoints

---

## 📚 الموارد

- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Nixpacks Docs](https://nixpacks.com)

---

## 🎉 النتيجة

السيرفر الآن جاهز للنشر على Railway!

### الميزات:
- ✅ HTTPS تلقائي
- ✅ Auto-restart
- ✅ Auto-deploy
- ✅ Persistent storage
- ✅ Health monitoring
- ✅ Zero-downtime updates

### الخطوة التالية:
اتبع الخطوات في `QUICK_START_RAILWAY.md` للنشر الآن!

---

**التاريخ**: 2026-01-19  
**الحالة**: ✅ جاهز للنشر
