# 🚀 إعداد FCM V1 API (الحل النهائي)

## 📋 المشكلة

Legacy API معطل ولا يمكن تفعيله في Firebase Project الجديد.

## ✅ الحل: استخدام FCM V1 API مع Service Account

---

## الخطوة 1: الحصول على Service Account Key

### 1. افتح Google Cloud Console:
```
https://console.cloud.google.com/iam-admin/serviceaccounts?project=icti-34ac0
```

### 2. اختر Service Account:
ستجد Service Account بهذا الاسم:
```
firebase-adminsdk-xxxxx@icti-34ac0.iam.gserviceaccount.com
```

### 3. إنشاء Key:
1. اضغط على Service Account
2. اذهب إلى تبويب **"Keys"**
3. اضغط **"Add Key"** > **"Create New Key"**
4. اختر **"JSON"**
5. اضغط **"Create"**

سيتم تحميل ملف JSON يحتوي على:
```json
{
  "type": "service_account",
  "project_id": "icti-34ac0",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@icti-34ac0.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

---

## الخطوة 2: إضافة Credentials إلى Railway

### 1. افتح Railway Dashboard:
```
https://railway.app/project/your-project-id
```

### 2. اذهب إلى Variables:
1. اختر Service: **ict-ai-trader-server**
2. اضغط على **"Variables"**

### 3. أضف متغير جديد:
```
Name: GOOGLE_APPLICATION_CREDENTIALS_JSON
Value: [الصق محتوى ملف JSON كاملاً]
```

**مهم**: الصق محتوى الملف كاملاً كـ JSON string واحد.

---

## الخطوة 3: تحديث الكود

سأقوم بتحديث `expoPushService.ts` لاستخدام Service Account تلقائياً.

---

## 🧪 الاختبار

بعد إضافة Credentials:

### 1. أعد تشغيل السيرفر على Railway
(سيتم تلقائياً عند حفظ المتغيرات)

### 2. اختبر الإشعارات:
```bash
cd server
node test-push-notification.js ExponentPushToken[TX5fpqIRn6hgRU30hV6eBD]
```

### 3. أو من Expo Push Tool:
```
https://expo.dev/notifications
```

---

## ✅ النتيجة المتوقعة

```
✅ Notification sent successfully!
✅ Push notification delivered to device
```

---

## 📊 الفرق بين Legacy و V1

| Feature | Legacy API | V1 API |
|---------|-----------|--------|
| Status | Deprecated | Active |
| Setup | Server Key | Service Account |
| Security | Basic | Advanced |
| Features | Limited | Full |
| Future | ❌ Will stop | ✅ Supported |

---

## ⚠️ ملاحظات

1. **Service Account Key حساس جداً** - لا تشاركه أبداً
2. **استخدم Environment Variable** - لا تضعه في الكود
3. **Railway يدعم JSON strings** - الصق الملف كاملاً
4. **لا تحتاج تغيير APK** - التحديث على السيرفر فقط

---

## 🔗 روابط مفيدة

- Google Cloud Console: https://console.cloud.google.com/iam-admin/serviceaccounts?project=icti-34ac0
- Railway Dashboard: https://railway.app
- Expo Push Tool: https://expo.dev/notifications
