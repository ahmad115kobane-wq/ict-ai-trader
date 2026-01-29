# 🔥 تحقق من حالة Firebase

## 📋 الخطوات:

### 1️⃣ افتح Firebase Console:
```
https://console.firebase.google.com/project/icti-34ac0/settings/cloudmessaging
```

### 2️⃣ تحقق من:

#### ✅ يجب أن ترى:
```
Firebase Cloud Messaging API (V1): Enabled ✅
```

#### أو:
```
Cloud Messaging API (Legacy): Enabled ✅
```

---

## ⚠️ إذا كان معطل:

اضغط **Enable** لتفعيله!

---

## 🧪 اختبار Push Token:

بعد التفعيل، جرب إرسال إشعار تجريبي:

```bash
cd server
node test-push-notification.js ExponentPushToken[TX5fpqIRn6hgRU30hV6eBD]
```

---

## 📊 معلومات المشروع الجديد:

```
Project ID: icti-34ac0
Project Number: 306089278559
Package Name: com.ictaitrader.app
```

---

## 🎯 السبب المحتمل:

إذا كان Firebase Cloud Messaging **غير مفعّل** في المشروع الجديد، ستحصل على نفس الخطأ:

```
❌ Unable to retrieve the FCM server key
```

حتى لو كان APK جديد!
