# إعداد نظام الإشعارات

## المشكلة
```
error: relation "system_notifications" does not exist
```

## الحل

### على Railway:

1. **افتح Railway Dashboard**
2. **اذهب إلى مشروعك**
3. **افتح PostgreSQL Database**
4. **اضغط على "Query"**
5. **انسخ والصق هذا الكود:**

```sql
-- إنشاء جدول إشعارات النظام
CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_system_notifications_user ON system_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_notifications_read ON system_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type);

-- إضافة أعمدة لتتبع إشعارات الاشتراك
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_expiry_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_expiring_notified BOOLEAN DEFAULT false;
```

6. **اضغط "Run Query"**
7. **انتظر حتى يظهر: "Query executed successfully"**

✅ **تم! الآن نظام الإشعارات جاهز**

---

## أو عبر Railway CLI:

```bash
# 1. تسجيل الدخول
railway login

# 2. ربط المشروع
railway link

# 3. تنفيذ Migration
railway run npm run db:create-notifications
```

---

## التحقق من نجاح العملية:

في Railway Query، نفذ:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'system_notifications';
```

يجب أن يظهر: `system_notifications`

---

## الآن يمكنك إرسال إشعارات! 🎉

### مثال:
```bash
railway run node send-notification.js welcome
```

أو من الكود:
```typescript
import { notifySystemUpdate } from './services/systemNotificationService';
await notifySystemUpdate('رسالة لجميع المستخدمين');
```
