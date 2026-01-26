# 🚀 دليل سريع للنشر على Railway

## الخطوات الأساسية (5 دقائق)

### 1️⃣ تجهيز الكود
```bash
cd server
npm install
npm run build
```

### 2️⃣ إنشاء مشروع على Railway
1. اذهب إلى: https://railway.app
2. سجل دخول بـ GitHub
3. اضغط "New Project"
4. اختر "Deploy from GitHub repo"
5. اختر المستودع
6. **مهم**: اضبط Root Directory على `server`

### 3️⃣ إضافة المتغيرات البيئية

في Railway Dashboard → Variables، أضف:

```
NODE_ENV=production
JWT_SECRET=اكتب-مفتاح-سري-قوي-هنا-32-حرف-على-الأقل
OLLAMA_API_KEY=b2bd46acc50c4414a7796b1ba8cbe928.cxRXHpFkuBtdNejTeRDiW_9A
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=gemma3:27b
OANDA_API_KEY=531b3cfe32a6e44f9b31c69734f85558-b8f3b06be8ebf821597510767d6bcf6d
OANDA_BASE_URL=https://api-fxpractice.oanda.com
OANDA_ACCOUNT_ID=101-001-30294518-001
DATABASE_PATH=./data/ict_trader.db
```

### 4️⃣ انتظر النشر
Railway سيقوم بـ:
- ✅ تثبيت المكتبات
- ✅ بناء المشروع
- ✅ تشغيل السيرفر

### 5️⃣ احصل على الرابط
بعد النشر، انسخ الرابط من Railway:
```
https://your-app.up.railway.app
```

### 6️⃣ اختبر السيرفر
```bash
curl https://your-app.up.railway.app/api/auth/health
```

يجب أن ترى:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123
}
```

### 7️⃣ حدّث التطبيق
في `mobile/src/services/apiService.ts`:
```typescript
const API_BASE_URL = 'https://your-app.up.railway.app/api';
```

## ✅ تم!

السيرفر الآن يعمل على Railway 🎉

---

## 🔧 إعدادات إضافية (اختياري)

### Custom Domain
في Railway Dashboard:
1. Settings → Domains
2. Add Custom Domain
3. اتبع التعليمات

### Auto Deploy
Railway يدعم Auto Deploy تلقائياً:
- كل push لـ GitHub = نشر تلقائي

### Monitoring
في Dashboard:
- Metrics → عرض CPU, Memory, Network
- Logs → عرض logs مباشرة

---

## 🐛 حل المشاكل

### خطأ في البناء؟
```bash
# تأكد من:
npm run build  # يعمل محلياً
```

### خطأ في التشغيل؟
- تحقق من Variables
- تحقق من Logs في Railway

### لا يمكن الاتصال؟
- تأكد من أن السيرفر يعمل (check Logs)
- تأكد من الرابط صحيح
- تأكد من CORS مفعّل

---

## 💰 التكلفة
- $5 مجاناً شهرياً
- كافي لتطبيق صغير/متوسط

---

## 📞 الدعم
- Railway Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
