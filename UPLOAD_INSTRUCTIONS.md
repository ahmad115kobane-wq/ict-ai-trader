# تعليمات رفع الملفات المعدلة

## الملفات المعدلة:

### 1. server/src/services/aiService.ts
**التعديل:** تم تبسيط تعليمات AI إلى 4 شروط فقط:
- الشرط 1: اتجاه H1
- الشرط 2: سحب سيولة على M5
- الشرط 3: BOS على M5
- الشرط 4: منطقة دخول قريبة (< 1.5%)

### 2. server/src/index.ts
**التعديل:** تم إضافة route لصفحة manual-trade

```typescript
// Manual trade entry page
app.get('/manual-trade', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'public', 'manual-trade.html'));
});
```

---

## طريقة الرفع:

### الطريقة 1: باستخدام Git (الأفضل)

```bash
# في مجلد المشروع
cd server

# إضافة الملفات المعدلة
git add src/services/aiService.ts
git add src/index.ts

# عمل commit
git commit -m "تبسيط تعليمات AI وإضافة route لصفحة manual-trade"

# رفع إلى GitHub
git push origin main

# على السيرفر (Railway)
# سيتم التحديث تلقائياً إذا كان Railway متصل بـ GitHub
```

### الطريقة 2: باستخدام Railway CLI

```bash
# تسجيل الدخول
railway login

# ربط المشروع
railway link

# رفع الملفات
railway up
```

### الطريقة 3: رفع يدوي عبر FTP/SFTP

إذا كنت تستخدم FTP:
1. افتح برنامج FTP (FileZilla مثلاً)
2. اتصل بالسيرفر
3. ارفع الملفات التالية:
   - `server/src/services/aiService.ts`
   - `server/src/index.ts`

---

## بعد الرفع:

### 1. إعادة بناء المشروع (Build)

```bash
cd server
npm run build
```

### 2. إعادة تشغيل السيرفر

```bash
# إذا كنت تستخدم PM2
pm2 restart ict-trader

# أو إذا كنت تستخدم Railway
# سيتم إعادة التشغيل تلقائياً
```

### 3. التحقق من التحديث

افتح المتصفح وتحقق من:
- `https://your-domain.com/manual-trade` - يجب أن تظهر صفحة إدخال الصفقة
- `https://your-domain.com/api/analysis/latest` - تحقق من أن التحليل يعمل بالشروط الجديدة

---

## ملاحظات مهمة:

1. ✅ تأكد من عمل backup قبل الرفع
2. ✅ تحقق من أن المتغيرات البيئية موجودة (AI_API_KEY, AI_BASE_URL, AI_MODEL)
3. ✅ راقب logs السيرفر بعد الرفع للتأكد من عدم وجود أخطاء

```bash
# لمشاهدة logs على Railway
railway logs

# أو على PM2
pm2 logs ict-trader
```

---

## في حالة وجود مشاكل:

### المشكلة: السيرفر لا يعمل بعد الرفع
**الحل:**
```bash
# تحقق من logs
railway logs
# أو
pm2 logs

# أعد بناء المشروع
npm run build

# أعد تشغيل السيرفر
pm2 restart ict-trader
```

### المشكلة: صفحة manual-trade لا تظهر
**الحل:**
- تأكد من وجود ملف `server/public/manual-trade.html`
- تحقق من أن route تم إضافته في `server/src/index.ts`
- أعد تشغيل السيرفر

---

## الأوامر السريعة:

```bash
# رفع سريع باستخدام Git
git add .
git commit -m "تحديث AI وإضافة manual-trade"
git push

# إعادة تشغيل على Railway
railway restart

# مشاهدة logs
railway logs --tail
```
