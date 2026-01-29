# 🔥 دليل تفعيل Firebase Cloud Messaging (Legacy)

## 🎯 المشكلة الحالية

Push Token مسجل بنجاح: `ExponentPushToken[TX5fpqIRn6hgRU30hV6eBD]`

لكن الإشعارات لا تعمل بسبب:
```
❌ Push error: Unable to retrieve the FCM server key for the recipient's app.
```

**السبب**: Firebase Cloud Messaging API (Legacy) غير مفعّل.

---

## ✅ الحل: تفعيل Legacy API

### الخطوة 1: افتح Firebase Console

1. اذهب إلى: https://console.firebase.google.com/
2. اختر المشروع: **icti-34ac0**

### الخطوة 2: اذهب إلى Cloud Messaging

1. من القائمة الجانبية، اختر: **Project Settings** (⚙️)
2. اختر تبويب: **Cloud Messaging**

### الخطوة 3: تفعيل Legacy API

ستجد قسمين:

#### 1. Firebase Cloud Messaging API (V1)
```
✅ Enabled (مفعّل بالفعل)
```

#### 2. Cloud Messaging API (Legacy)
```
❌ Disabled (يجب تفعيله!)
```

**اضغط على زر "Enable" أو "⋮" (ثلاث نقاط) واختر "Enable"**

### الخطوة 4: احصل على Server Key

بعد التفعيل، ستظهر لك:

```
Server Key: AIza...........................
Sender ID: 306089278559
```

**لا تحتاج نسخ Server Key** - Expo سيستخدمه تلقائياً عبر `google-services.json`

---

## 🧪 اختبار بعد التفعيل

### 1. اختبر مباشرة من السيرفر:

```bash
cd server
node test-push-notification.js ExponentPushToken[TX5fpqIRn6hgRU30hV6eBD]
```

### 2. أو استخدم Expo Push Tool:

1. افتح: https://expo.dev/notifications
2. ضع Token: `ExponentPushToken[TX5fpqIRn6hgRU30hV6eBD]`
3. اكتب رسالة تجريبية
4. اضغط "Send a Notification"

---

## 📊 النتيجة المتوقعة

### قبل التفعيل:
```
❌ Push error: Unable to retrieve the FCM server key
```

### بعد التفعيل:
```
✅ Notification sent successfully!
✅ Push notification delivered to device
```

---

## ⚠️ ملاحظات مهمة

### 1. Legacy API ضروري لـ Expo
Expo SDK يستخدم Legacy API حالياً. حتى لو كان V1 مفعّل، يجب تفعيل Legacy أيضاً.

### 2. لا تحتاج تغيير الكود
الكود الحالي صحيح 100%. فقط تفعيل Legacy API في Firebase Console.

### 3. لا تحتاج إعادة بناء APK
APK الحالي سيعمل مباشرة بعد تفعيل Legacy API.

### 4. Push Tokens الحالية صحيحة
```
ExponentPushToken[TX5fpqIRn6hgRU30hV6eBD]
```
هذا Token صحيح ومرتبط بـ Firebase الجديد.

---

## 🎯 الخلاصة

**الخطوة الوحيدة المطلوبة:**

1. افتح Firebase Console
2. اذهب إلى Project Settings > Cloud Messaging
3. فعّل "Cloud Messaging API (Legacy)"
4. انتهى! ✅

**لا تحتاج:**
- ❌ تغيير الكود
- ❌ إعادة بناء APK
- ❌ مسح Push Tokens
- ❌ إعادة تسجيل الدخول

---

## 📞 إذا استمرت المشكلة

بعد تفعيل Legacy API، إذا استمر الخطأ:

1. انتظر 2-3 دقائق (Firebase يحتاج وقت للتحديث)
2. جرب إرسال إشعار تجريبي من Expo Push Tool
3. تحقق من Railway Logs للتأكد من عدم وجود أخطاء أخرى

---

## 🔗 روابط مفيدة

- Firebase Console: https://console.firebase.google.com/project/icti-34ac0/settings/cloudmessaging
- Expo Push Tool: https://expo.dev/notifications
- List Push Tokens: https://ict-ai-trader-production.up.railway.app/api/auth/list-push-tokens

---

## ✨ معلومات Firebase الحالية

```
Project ID: icti-34ac0
Project Number: 306089278559
Package Name: com.ictaitrader.app
Expo Project ID: 1881cacc-0c4d-4a83-a05e-19f20a07f2c0

Current Push Token: ExponentPushToken[TX5fpqIRn6hgRU30hV6eBD]
User: a@aaaaaa.g
Status: Token registered ✅, Waiting for Legacy API ⏳
```
