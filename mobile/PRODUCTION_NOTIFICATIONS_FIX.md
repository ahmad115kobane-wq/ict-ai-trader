# 🔔 حل مشكلة الإشعارات في الإنتاج (Production Build)

## 📋 المشكلة
الإشعارات تعمل بشكل صحيح في **Expo Go** لكنها لا تعمل في **Production Build** (APK/AAB).

## 🔍 التشخيص

### ✅ ما يعمل بشكل صحيح:
1. **إعدادات `app.json`**: صحيحة ومكتملة
2. **خدمة الإشعارات**: الكود سليم
3. **Firebase Configuration**: `google-services.json` موجود
4. **Server Endpoints**: تسجيل Push Token يعمل
5. **Expo Push Service**: الخادم يرسل الإشعارات بشكل صحيح

### ❌ الأسباب المحتملة للمشكلة:

#### 1. **مشكلة Project ID في Production**
```typescript
// في notificationService.ts - السطر 73
let projectId = Constants.expoConfig?.extra?.eas?.projectId;

// Fallback للـ projectId
if (!projectId) {
  projectId = '1881cacc-0c4d-4a83-a05e-19f20a07f2c0';
}
```

**المشكلة**: في Production Build، قد لا يتم تحميل `Constants.expoConfig` بشكل صحيح.

**الحل**: استخدام `projectId` الثابت مباشرة في Production.

#### 2. **Firebase Cloud Messaging (FCM) غير مفعل**
- Expo يستخدم FCM لإرسال الإشعارات على Android
- يجب التأكد من تفعيل FCM في Firebase Console

#### 3. **Google Services Plugin غير مضاف**
- في Production Build، يجب إضافة Google Services Plugin بشكل صريح

#### 4. **الأذونات في Android 13+**
- Android 13 يتطلب إذن `POST_NOTIFICATIONS` بشكل صريح
- الإذن موجود في `app.json` لكن قد يحتاج تأكيد إضافي

---

## 🛠️ الحلول المقترحة

### الحل 1: تحديث `notificationService.ts` (الأهم)

استبدل الكود في `mobile/src/services/notificationService.ts`:

```typescript
// الحصول على توكن Expo Push - محسّن للإنتاج
try {
  // استخدام projectId الثابت مباشرة في Production
  const projectId = '1881cacc-0c4d-4a83-a05e-19f20a07f2c0';
  
  console.log('🔑 Using projectId:', projectId);

  const pushTokenData = await Notifications.getExpoPushTokenAsync({
    projectId: projectId,
  });
  
  token = pushTokenData.data;
  console.log('✅ Push token obtained:', token);
  
  // التحقق من صحة التوكن
  if (!token || !token.startsWith('ExponentPushToken[')) {
    console.error('❌ Invalid push token format:', token);
    return null;
  }
  
} catch (error) {
  console.error('❌ Error getting push token:', error);
  return null;
}
```

### الحل 2: تحديث `app.json` - إضافة FCM Configuration

أضف هذه الإعدادات في `mobile/app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.ictaitrader.app",
      "googleServicesFile": "./google-services.json",
      "useNextNotificationsApi": true,
      "permissions": [
        "INTERNET",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK",
        "POST_NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM"
      ]
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#10b981",
          "androidMode": "default",
          "androidCollapsedTitle": "ICT AI Trader",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": true,
            "compileSdkVersion": 34,
            "targetSdkVersion": 34,
            "buildToolsVersion": "34.0.0"
          }
        }
      ]
    ]
  }
}
```

### الحل 3: تفعيل FCM في Firebase Console

1. افتح [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك: `aaaaaa-34f8a`
3. اذهب إلى **Project Settings** > **Cloud Messaging**
4. تأكد من تفعيل **Cloud Messaging API (Legacy)**
5. انسخ **Server Key** (إذا لزم الأمر)

### الحل 4: إضافة `expo-build-properties`

قم بتثبيت الحزمة:

```bash
cd mobile
npx expo install expo-build-properties
```

### الحل 5: تحديث `eas.json` - إضافة Environment Variables

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease",
        "credentialsSource": "local"
      },
      "env": {
        "EXPO_PUBLIC_PROJECT_ID": "1881cacc-0c4d-4a83-a05e-19f20a07f2c0"
      }
    }
  }
}
```

### الحل 6: طلب الأذونات بشكل صريح (Android 13+)

أضف هذا الكود في `App.tsx` بعد تسجيل الدخول:

```typescript
// طلب أذونات الإشعارات بشكل صريح على Android 13+
if (Platform.OS === 'android' && Platform.Version >= 33) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'تنبيه',
      'يجب السماح بالإشعارات لتلقي تنبيهات التداول',
      [{ text: 'حسناً' }]
    );
  }
}
```

---

## 🧪 خطوات الاختبار

### 1. بناء APK جديد:
```bash
cd mobile
eas build --platform android --profile production
```

### 2. تثبيت APK على جهاز حقيقي

### 3. فحص Logs:
```bash
# على Android
adb logcat | grep -i "expo\|notification\|push"
```

### 4. اختبار إرسال إشعار من السيرفر:
```bash
curl -X POST https://ict-ai-trader-production.up.railway.app/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Checklist للتحقق

- [ ] تأكد من أن `projectId` صحيح في الكود
- [ ] تأكد من تفعيل FCM في Firebase Console
- [ ] تأكد من أن `google-services.json` صحيح
- [ ] تأكد من أن الأذونات موجودة في `app.json`
- [ ] قم ببناء APK جديد بعد التعديلات
- [ ] اختبر على جهاز حقيقي (ليس محاكي)
- [ ] تحقق من أن Push Token يتم تسجيله في السيرفر
- [ ] تحقق من أن السيرفر يرسل الإشعارات بنجاح

---

## 🔧 أدوات التشخيص

### 1. فحص Push Token في السيرفر:
```bash
curl https://ict-ai-trader-production.up.railway.app/api/auth/list-push-tokens
```

### 2. اختبار إرسال إشعار يدوي:
استخدم [Expo Push Notification Tool](https://expo.dev/notifications)

### 3. فحص Firebase:
تحقق من **Firebase Console** > **Cloud Messaging** > **Sent Messages**

---

## 📝 ملاحظات مهمة

1. **Expo Go vs Production**:
   - Expo Go يستخدم خوادم Expo مباشرة
   - Production Build يستخدم FCM (Firebase Cloud Messaging)
   - لذلك يجب تفعيل FCM للإنتاج

2. **Android 13+**:
   - يتطلب إذن `POST_NOTIFICATIONS` بشكل صريح
   - يجب طلب الإذن في Runtime

3. **Background Notifications**:
   - تأكد من أن التطبيق لديه أذونات Battery Optimization
   - بعض الأجهزة تحتاج إعدادات خاصة (Xiaomi, Huawei, etc.)

4. **Testing**:
   - اختبر دائماً على جهاز حقيقي
   - المحاكي قد لا يدعم Push Notifications بشكل كامل

---

## 🚀 الخطوات التالية

1. طبق **الحل 1** (تحديث `notificationService.ts`)
2. طبق **الحل 2** (تحديث `app.json`)
3. تأكد من **الحل 3** (تفعيل FCM)
4. قم ببناء APK جديد
5. اختبر على جهاز حقيقي
6. راقب Logs للتأكد من عمل الإشعارات

---

## 📞 الدعم

إذا استمرت المشكلة بعد تطبيق جميع الحلول:
1. تحقق من Firebase Console Logs
2. تحقق من Railway Logs للسيرفر
3. استخدم `adb logcat` لفحص أخطاء Android
4. تأكد من أن الجهاز متصل بالإنترنت
5. تأكد من أن التطبيق لديه جميع الأذونات المطلوبة
