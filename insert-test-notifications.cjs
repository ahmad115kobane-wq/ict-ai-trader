// إدخال إشعارات تجريبية مباشرة في قاعدة البيانات
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

async function insertTestNotifications() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ متصل بقاعدة البيانات\n');

    // إدخال إشعارات لأول 10 مستخدمين من التطبيق (ليس التليجرام)
    const result = await client.query(`
      INSERT INTO system_notifications (user_id, type, title, message, priority)
      SELECT 
        id::uuid,
        'system_update'::varchar,
        '🎉 نظام الإشعارات يعمل الآن!'::text,
        'تم إصلاح مشكلة الإشعارات. ستتلقى من الآن إشعارات حول اشتراكك والتحديثات الجديدة.'::text,
        'normal'::varchar
      FROM users
      WHERE email NOT LIKE 'telegram_%'
      LIMIT 10
      RETURNING id, user_id
    `);

    console.log(`✅ تم إدخال ${result.rows.length} إشعارات\n`);

    // عرض المستخدمين الذين تم إرسال الإشعارات لهم
    for (const row of result.rows) {
      const userResult = await client.query(
        'SELECT email FROM users WHERE id = $1',
        [row.user_id]
      );
      console.log(`📬 إشعار لـ: ${userResult.rows[0].email}`);
    }

    console.log('\n✅ تم بنجاح! افتح التطبيق الآن وتحقق من صفحة الإشعارات');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await client.end();
  }
}

insertTestNotifications();
