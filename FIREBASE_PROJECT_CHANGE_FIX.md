# 🔄 حل مشكلة تغيير Firebase Project

## 🔍 المشكلة:

بعد تغيير Firebase Project من `aaaaaa-34f8a` إلى `icti-34ac0`، المستخدمون الذين سجلوا Push Tokens القديمة لا يزالون يحصلون على خطأ:

```
❌ Push error: Unable to retrieve the FCM server key for the recipient's app.
```

## 💡 السبب:

Push Tokens القديمة مرتبطة بـ Firebase Project القديم المحذوف.

---

## ✅ الحل السريع:

### 1️⃣ مسح جميع Push Tokens القديمة:

افتح المتصفح أو استخدم curl:

```bash
curl -X POST https://ict-ai-trader-production.up.railway.app/api/auth/clear-all-push-tokens
```

أو افتح في المتصفح:
```
https://ict-ai-trader-production.up.railway.app/api/auth/clear-all-push-tokens
```

### 2️⃣ المستخدمون يعيدون تسجيل الدخول:

- عند فتح التطبيق الجديد (APK الجديد)
- سيتم تسجيل Push Token جديد تلقائياً
- مرتبط بـ Firebase Project الجديد

---

## 🧪 التحقق:

### قبل المسح:
```bash
curl https://ict-ai-trader-production.up.railway.app/api/auth/list-push-tokens
```

يجب أن ترى 6 tokens قديمة.

### بعد المسح:
```bash
curl https://ict-ai-trader-production.up.railway.app/api/auth/list-push-tokens
```

يجب أن ترى 0 tokens.

### بعد تسجيل الدخول بالتطبيق الجديد:
```bash
curl https://ict-ai-trader-production.up.railway.app/api/auth/list-push-tokens
```

سترى tokens جديدة مرتبطة بـ Firebase الجديد.

---

## 📱 خطوات كاملة:

### 1. مسح Tokens القديمة (الآن):
```bash
curl -X POST https://ict-ai-trader-production.up.railway.app/api/auth/clear-all-push-tokens
```

### 2. بناء APK جديد:
```bash
cd mobile
eas build --platform android --profile production
```

### 3. توزيع APK الجديد على المستخدمين

### 4. المستخدمون يفتحون التطبيق:
- سيتم تسجيل Push Token جديد تلقائياً
- الإشعارات ستعمل مباشرة!

---

## 🎯 النتيجة المتوقعة:

✅ لا مزيد من أخطاء FCM  
✅ الإشعارات تعمل بشكل صحيح  
✅ Push Tokens جديدة مرتبطة بـ Firebase الجديد  

---

## 📊 معلومات Firebase الجديد:

```
Project ID: icti-34ac0
Project Number: 306089278559
Package Name: com.ictaitrader.app
```

---

## ⚠️ ملاحظة مهمة:

**يجب توزيع APK الجديد على جميع المستخدمين!**

APK القديم لن يعمل مع Firebase الجديد.
