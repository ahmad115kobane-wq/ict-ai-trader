// التحقق من الإشعارات لجميع المستخدمين
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

async function checkAllUsers() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // جلب آخر 5 مستخدمين مع عدد إشعاراتهم
    const result = await client.query(`
      SELECT 
        u.email,
        u.id,
        u.created_at as user_created,
        COUNT(sn.id) as notification_count
      FROM users u
      LEFT JOIN system_notifications sn ON u.id = sn.user_id
      GROUP BY u.id, u.email, u.created_at
      ORDER BY u.created_at DESC
      LIMIT 10
    `);

    console.log('👥 آخر 10 مستخدمين:\n');
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   🆔 ID: ${user.id.substring(0, 20)}...`);
      console.log(`   📅 تاريخ التسجيل: ${new Date(user.user_created).toLocaleString('ar-EG')}`);
      console.log(`   📬 عدد الإشعارات: ${user.notification_count}`);
      console.log('');
    });

    // جلب آخر 5 إشعارات
    const lastNotifs = await client.query(`
      SELECT 
        sn.title,
        sn.message,
        sn.created_at,
        u.email
      FROM system_notifications sn
      JOIN users u ON sn.user_id = u.id
      ORDER BY sn.created_at DESC
      LIMIT 5
    `);

    console.log('\n📋 آخر 5 إشعارات:\n');
    
    lastNotifs.rows.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title}`);
      console.log(`   📝 ${notif.message}`);
      console.log(`   👤 ${notif.email}`);
      console.log(`   📅 ${new Date(notif.created_at).toLocaleString('ar-EG')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await client.end();
  }
}

checkAllUsers();
