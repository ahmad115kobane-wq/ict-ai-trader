# دليل تحديث التطبيق بدون بناء (EAS Update)

## الطريقة 1: استخدام ملف Batch (الأسهل)

```bash
cd mobile
update-app.bat
```

## الطريقة 2: الأوامر اليدوية

```bash
cd mobile
npx expo export --platform android
npx eas-cli update --branch preview --message "تحديث: إشعارات انتهاء الاشتراك"
```

## الطريقة 3: تحديث تلقائي

```bash
cd mobile
npx eas-cli update --auto
```

## ملاحظات مهمة

1. **expo-updates مثبت**: تم تثبيت الحزمة بنجاح
2. **EAS Project مربوط**: المشروع مربوط بـ EAS
3. **app.json محدث**: تم إضافة إعدادات updates

## التحقق من التحديث

بعد رفع التحديث، يمكنك التحقق من:
- https://expo.dev/accounts/afa750/projects/ict-ai-trader-pro

## استكشاف الأخطاء

إذا واجهت مشكلة "expo package not found":
```bash
cd mobile
npm install
npx expo install expo-updates
```

## البدائل

إذا لم يعمل EAS Update، يمكنك:
1. بناء APK جديد: `npm run build:apk`
2. استخدام Expo Go للتطوير
3. استخدام Development Build
