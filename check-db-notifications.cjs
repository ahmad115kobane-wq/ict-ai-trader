// التحقق من الإشعارات في قاعدة البيانات مباشرة
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

async function checkNotifications() {
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

    // عدد الإشعارات
    const countResult = await client.query('SELECT COUNT(*) FROM system_notifications');
    const totalCount = parseInt(countResult.rows[0].count);
    
    console.log(`📊 إجمالي الإشعارات: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️ لا توجد إشعارات في قاعدة البيانات');
      console.log('\n💡 لإرسال إشعار تجريبي، استخدم:');
      console.log('   node send-manual-notification.js');
      return;
    }

    // جلب آخر 10 إشعارات
    const result = await client.query(`
      SELECT 
        id,
        user_id,
        type,
        title,
        message,
        priority,
        read,
        created_at
      FROM system_notifications
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('📋 آخر 10 إشعارات:\n');
    
    result.rows.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title}`);
      console.log(`   📝 ${notif.message}`);
      console.log(`   👤 User ID: ${notif.user_id.substring(0, 8)}...`);
      console.log(`   📅 ${new Date(notif.created_at).toLocaleString('ar-EG')}`);
      console.log(`   ${notif.read ? '✅ مقروء' : '🔵 جديد'}`);
      console.log('');
    });

    // إحصائيات حسب المستخدم
    const userStats = await client.query(`
      SELECT 
        user_id,
        COUNT(*) as notification_count,
        SUM(CASE WHEN read = false THEN 1 ELSE 0 END) as unread_count
      FROM system_notifications
      GROUP BY user_id
      ORDER BY notification_count DESC
      LIMIT 5
    `);

    console.log('\n📊 إحصائيات المستخدمين (أكثر 5 مستخدمين):\n');
    userStats.rows.forEach((stat, index) => {
      console.log(`${index + 1}. User ${stat.user_id.substring(0, 8)}...`);
      console.log(`   📬 إجمالي: ${stat.notification_count}`);
      console.log(`   🔵 غير مقروء: ${stat.unread_count}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await client.end();
    console.log('🔌 تم إغلاق الاتصال');
  }
}

checkNotifications();
