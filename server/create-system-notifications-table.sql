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

-- إضافة أعمدة لتتبع إشعارات الاشتراك في جدول users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_expiry_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_expiring_notified BOOLEAN DEFAULT false;

-- عرض النتيجة
SELECT 'System notifications table created successfully!' as status;
