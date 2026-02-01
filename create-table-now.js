// إنشاء الجدول الآن
const { Client } = require('pg');

async function createTable() {
  const client = new Client({
    connectionString: 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ متصل بقاعدة البيانات\n');

    const sql = `
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

      CREATE INDEX IF NOT EXISTS idx_system_notifications_user ON system_notifications(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_system_notifications_read ON system_notifications(user_id, read);
      CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type);

      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS subscription_expiry_notified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS subscription_expiring_notified BOOLEAN DEFAULT false;
    `;

    await client.query(sql);
    console.log('✅ تم إنشاء الجدول بنجاح!\n');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await client.end();
  }
}

createTable();
