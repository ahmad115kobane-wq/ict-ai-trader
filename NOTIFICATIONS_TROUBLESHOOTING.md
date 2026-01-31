# إصلاح مشكلة الإشعارات - Troubleshooting

## المشكلة
```
API Error: [SyntaxError: JSON Parse error: Unexpected character: <]
ERROR Error loading notifications: {"response": {"data": {"error": "Network error"}, "status": 0}}
```

هذا الخطأ يعني أن الخادم يرجع HTML بدلاً من JSON، وهذا يحدث عادة عندما:
1. الخادم لم يتم إعادة تشغيله بعد إضافة الكود الجديد
2. جدول الإشعارات لم يتم إنشاؤه في قاعدة البيانات

---

## الحل

### الخطوة 1: إعادة تشغيل الخادم

#### إذا كنت تستخدم Railway:
1. افتح لوحة تحكم Railway
2. اذهب إلى مشروعك
3. اضغط على "Redeploy" أو "Restart"
4. انتظر حتى يكتمل التشغيل (2-3 دقائق)

#### إذا كنت تستخدم الخادم محلياً:
```bash
cd server
npm run build
npm start
```

أو إذا كنت تستخدم development mode:
```bash
cd server
npm run dev
```

### الخطوة 2: التحقق من إنشاء الجدول

عند بدء تشغيل الخادم، يجب أن ترى هذه الرسائل في console:

```
✅ Database initialized
✅ Notifications table initialized
✅ Default packages initialized
```

إذا لم تظهر رسالة "Notifications table initialized"، فهناك مشكلة في إنشاء الجدول.

### الخطوة 3: اختبار الـ API

افتح المتصفح واذهب إلى:
```
https://ict-ai-trader-production.up.railway.app/api/notifications
```

يجب أن ترى:
- إما رسالة خطأ JSON (مثل "Unauthorized") - هذا جيد، يعني الـ endpoint يعمل
- أو قائمة فارغة من الإشعارات

إذا رأيت صفحة HTML أو خطأ 404، فالمشكلة أن الـ route غير مسجل.

---

## الحل البديل: إنشاء الجدول يدوياً

إذا لم يتم إنشاء الجدول تلقائياً، يمكنك إنشاؤه يدوياً:

### 1. اتصل بقاعدة البيانات

إذا كنت تستخدم Railway:
1. افتح لوحة تحكم Railway
2. اذهب إلى PostgreSQL database
3. اضغط على "Connect" أو "Query"

### 2. نفذ هذا الكود SQL:

```sql
-- إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data JSONB,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
```

### 3. تحقق من إنشاء الجدول:

```sql
SELECT * FROM notifications LIMIT 1;
```

يجب أن يعمل بدون خطأ (حتى لو كانت النتيجة فارغة).

---

## اختبار النظام

### 1. إنشاء إشعار تجريبي

افتح Railway console أو terminal الخادم ونفذ:

```javascript
// في Node.js console أو endpoint
const { createNotification } = require('./services/notificationService');

// استبدل 'user_id_here' بـ ID مستخدم حقيقي من جدول users
await createNotification(
  'user_id_here',
  '🎉 إشعار تجريبي',
  'هذا إشعار تجريبي للتأكد من عمل النظام',
  'subscription_purchased'
);
```

### 2. افتح التطبيق

1. سجل دخول
2. اضغط على أيقونة الجرس في الهيدر
3. يجب أن ترى الإشعار التجريبي

---

## التحقق من الكود

تأكد من أن هذه الملفات موجودة وصحيحة:

### في الخادم:
- ✅ `server/src/services/notificationService.ts` - موجود
- ✅ `server/src/services/scheduledNotifications.ts` - موجود
- ✅ `server/src/routes/notifications.ts` - موجود
- ✅ `server/src/index.ts` - يحتوي على:
  ```typescript
  import notificationsRoutes from './routes/notifications';
  app.use('/api/notifications', notificationsRoutes);
  await initNotificationsTable();
  ```

### في التطبيق:
- ✅ `mobile/src/screens/NotificationsScreen.tsx` - موجود
- ✅ `mobile/src/services/apiService.ts` - يحتوي على `notificationService`
- ✅ `mobile/src/config/api.ts` - يحتوي على endpoints الإشعارات

---

## إذا استمرت المشكلة

### 1. تحقق من logs الخادم

ابحث عن أي أخطاء في console الخادم:
```
❌ Failed to initialize notifications table
❌ Error in notifications route
```

### 2. تحقق من الاتصال بقاعدة البيانات

تأكد من أن متغيرات البيئة صحيحة:
```
DATABASE_URL=postgresql://...
```

### 3. تحقق من version Node.js

يجب أن يكون Node.js 16 أو أحدث:
```bash
node --version
```

### 4. أعد بناء المشروع

```bash
cd server
rm -rf dist node_modules
npm install
npm run build
npm start
```

---

## الحل المؤقت

إذا كنت تريد أن يعمل التطبيق الآن بدون إشعارات:

تم بالفعل إضافة معالجة الأخطاء في الكود، لذلك:
- التطبيق سيعمل بشكل طبيعي
- شاشة الإشعارات ستظهر فارغة
- Badge في الهيدر سيعرض 0
- لن يظهر أي خطأ للمستخدم

عندما تصلح المشكلة وتعيد تشغيل الخادم، سيعمل كل شيء تلقائياً.

---

## للتأكد من أن كل شيء يعمل

بعد إعادة تشغيل الخادم، يجب أن ترى في console:

```
✅ Database initialized
✅ Notifications table initialized
✅ Default packages initialized
✅ Starting economic event reminders (5 min before)
✅ Subscription expiry check scheduled (every hour)
✅ Notification cleanup scheduled (daily at 3 AM)
✅ All scheduled notification jobs started

╔════════════════════════════════════════════════════╗
║         ICT AI Trader Server with VIP System      ║
╠════════════════════════════════════════════════════╣
║  🚀 Server running on port 3001                   ║
║  📊 Smart auto analysis at M5 candle close        ║
║  💎 VIP subscription system active                ║
║  🕐 Daily expiry check at 12:00 AM                ║
║  💾 Database initialized                           ║
╚════════════════════════════════════════════════════╝
```

إذا رأيت كل هذه الرسائل، فالنظام يعمل بشكل صحيح! 🎉
