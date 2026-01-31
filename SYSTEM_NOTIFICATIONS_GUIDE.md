# نظام الإشعارات الثاني - إشعارات النظام

تم إنشاء نظام إشعارات ثانٍ مستقل تماماً عن نظام إشعارات الصفقات، مخصص لإشعارات النظام مثل:

## أنواع الإشعارات المدعومة

### 1. إشعارات الاشتراك
- **انتهاء الاشتراك** (`subscription_expired`)
- **قرب انتهاء الاشتراك** (`subscription_expiring`) - قبل 3 أيام
- **شراء اشتراك جديد** (`subscription_purchased`)

### 2. إشعارات العملات
- **انخفاض العملات** (`coins_low`) - عندما يقل الرصيد عن حد معين

### 3. إشعارات عامة
- **تحديثات النظام** (`system_update`)
- **رسالة ترحيب** (`welcome`) - للمستخدمين الجدد

## المكونات الرئيسية

### 1. خدمة إشعارات النظام
**الملف:** `server/src/services/systemNotificationService.ts`

الدوال الرئيسية:
- `sendSystemNotification()` - إرسال إشعار لمستخدم واحد
- `sendSystemNotificationToMultipleUsers()` - إرسال لعدة مستخدمين
- `notifySubscriptionExpired()` - إشعار انتهاء الاشتراك
- `notifySubscriptionExpiring()` - إشعار قرب الانتهاء
- `notifySubscriptionPurchased()` - إشعار شراء اشتراك
- `notifyCoinsLow()` - إشعار انخفاض العملات
- `notifySystemUpdate()` - إشعار تحديث النظام
- `notifyWelcome()` - رسالة ترحيب
- `checkSubscriptionExpirations()` - فحص دوري للاشتراكات

### 2. قاعدة البيانات
**الجدول:** `system_notifications`

الحقول:
```sql
- id: معرف الإشعار
- user_id: معرف المستخدم
- type: نوع الإشعار
- title: العنوان
- message: الرسالة
- priority: الأولوية (high/normal/low)
- data: بيانات إضافية (JSON)
- read: حالة القراءة
- created_at: تاريخ الإنشاء
```

حقول إضافية في جدول `users`:
- `subscription_expiry_notified` - تم إشعار المستخدم بانتهاء الاشتراك
- `subscription_expiring_notified` - تم إشعار المستخدم بقرب الانتهاء

### 3. API Endpoints
**المسار:** `/api/system-notifications`

- `GET /api/system-notifications` - جلب الإشعارات
- `GET /api/system-notifications/unread-count` - عدد الإشعارات غير المقروءة
- `PUT /api/system-notifications/:id/read` - تعليم إشعار كمقروء
- `PUT /api/system-notifications/mark-all-read` - تعليم الكل كمقروء
- `DELETE /api/system-notifications/:id` - حذف إشعار

### 4. التكامل مع Telegram
تم تحديث `telegramService.ts` لإضافة دالة:
- `sendSystemMessageToTelegram()` - إرسال إشعارات النظام عبر Telegram

المميزات:
- أيقونات مخصصة حسب نوع الإشعار
- أزرار تفاعلية (تجديد الاشتراك، شراء عملات، إلخ)
- تنسيق HTML جميل

### 5. التكامل مع Firebase/Expo Push
تم تحديث `firebasePushService.ts` لإضافة دالة:
- `sendFirebaseSystemNotification()` - إرسال إشعارات النظام عبر Push Notifications

### 6. شاشة الإشعارات في التطبيق
**الملف:** `mobile/src/screens/NotificationsScreen.tsx`

التحديثات:
- دعم أنواع الإشعارات الجديدة
- تكامل مع API الجديد
- تحديث فوري عند القراءة/الحذف
- أيقونات وألوان مخصصة لكل نوع

## المهام الدورية (Cron Jobs)

### فحص الاشتراكات كل 6 ساعات
```javascript
cron.schedule('0 */6 * * *', async () => {
  await checkSubscriptionExpirations();
});
```

يقوم بـ:
1. البحث عن الاشتراكات المنتهية
2. البحث عن الاشتراكات القريبة من الانتهاء (3 أيام)
3. إرسال الإشعارات المناسبة
4. تحديث حالة الإشعار لتجنب التكرار

## كيفية الاستخدام

### إرسال إشعار انتهاء اشتراك
```typescript
import { notifySubscriptionExpired } from './services/systemNotificationService';

await notifySubscriptionExpired(userId, 'Premium');
```

### إرسال إشعار شراء اشتراك
```typescript
import { notifySubscriptionPurchased } from './services/systemNotificationService';

const expiryDate = new Date('2026-02-28');
await notifySubscriptionPurchased(userId, 'الباقة الشهرية', expiryDate);
```

### إرسال تحديث للجميع
```typescript
import { notifySystemUpdate } from './services/systemNotificationService';

await notifySystemUpdate('تم إضافة ميزات جديدة! تحقق من التطبيق الآن.');
```

### جلب إشعارات المستخدم
```typescript
import { getUserSystemNotifications } from './services/systemNotificationService';

const notifications = await getUserSystemNotifications(userId, 50);
```

## الفروقات عن نظام إشعارات الصفقات

| الميزة | إشعارات الصفقات | إشعارات النظام |
|--------|-----------------|----------------|
| الجدول | `trade_notifications` | `system_notifications` |
| API | `/api/notifications` | `/api/system-notifications` |
| الخدمة | `notificationService.ts` | `systemNotificationService.ts` |
| الأنواع | صفقات، تحليلات | اشتراكات، عملات، نظام |
| التكرار | عند كل صفقة | حسب الحدث |
| الأولوية | دائماً عالية | متغيرة |

## الاختبار

### اختبار إشعار انتهاء الاشتراك
```bash
# في Node.js REPL أو ملف اختبار
const { notifySubscriptionExpired } = require('./services/systemNotificationService');
await notifySubscriptionExpired('user-id-here', 'Premium');
```

### اختبار الفحص الدوري
```bash
const { checkSubscriptionExpirations } = require('./services/systemNotificationService');
await checkSubscriptionExpirations();
```

## الملاحظات المهمة

1. **الاستقلالية**: النظامان مستقلان تماماً ولا يتداخلان
2. **قاعدة البيانات**: جداول منفصلة مع فهارس محسّنة
3. **الأداء**: الإشعارات تُرسل بشكل غير متزامن
4. **التكرار**: يتم تتبع الإشعارات المرسلة لتجنب التكرار
5. **الأولوية**: إشعارات الاشتراك لها أولوية عالية
6. **التوقيت**: الفحص الدوري كل 6 ساعات لتوفير الموارد

## التطوير المستقبلي

- [ ] إضافة إشعارات البريد الإلكتروني
- [ ] إشعارات SMS للأحداث المهمة
- [ ] تخصيص تفضيلات الإشعارات لكل مستخدم
- [ ] إحصائيات الإشعارات (معدل القراءة، التفاعل)
- [ ] إشعارات مجدولة مسبقاً
- [ ] قوالب إشعارات قابلة للتخصيص
