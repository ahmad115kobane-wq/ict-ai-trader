// التحقق من وجود جدول system_notifications
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

async function checkSystemNotificationsTable() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 الاتصال بقاعدة البيانات...');
    await client.connect();
    console.log('✅ تم الاتصال بنجاح\n');

    // التحقق من وجود الجدول
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_notifications'
      );
    `);

    const tableExists = tableCheckResult.rows[0].exists;
    
    if (!tableExists) {
      console.log('❌ جدول system_notifications غير موجود!');
      console.log('\n💡 سنقوم بإنشائه الآن...\n');
      
      // إنشاء الجدول
      await client.query(`
        CREATE TABLE system_notifications (
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
      `);
      
      console.log('✅ تم إنشاء جدول system_notifications');
      
      // إنشاء الفهارس
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_system_notifications_user 
        ON system_notifications(user_id, created_at DESC);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_system_notifications_read 
        ON system_notifications(user_id, read);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_system_notifications_type 
        ON system_notifications(type);
      `);
      
      console.log('✅ تم إنشاء الفهارس');
      
      // إضافة أعمدة للمستخدمين
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS subscription_expiry_notified BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS subscription_expiring_notified BOOLEAN DEFAULT false;
      `);
      
      console.log('✅ تم إضافة الأعمدة الجديدة لجدول users');
      console.log('\n✨ تم إعداد نظام الإشعارات بنجاح!\n');
    } else {
      console.log('✅ جدول system_notifications موجود');
      
      // عرض هيكل الجدول
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'system_notifications'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 هيكل الجدول:\n');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(مطلوب)' : '(اختياري)'}`);
      });
      
      // عدد الإشعارات
      const countResult = await client.query('SELECT COUNT(*) FROM system_notifications');
      const totalCount = parseInt(countResult.rows[0].count);
      
      console.log(`\n📊 عدد الإشعارات: ${totalCount}\n`);
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('🔌 تم إغلاق الاتصال');
  }
}

checkSystemNotificationsTable();
