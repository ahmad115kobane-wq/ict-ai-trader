// التحقق من User ID
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

async function checkUser() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // البحث عن المستخدم
    const result = await client.query(`
      SELECT id, email, subscription, subscription_expiry, auto_analysis_enabled
      FROM users
      WHERE email = 'a@a.a'
    `);

    if (result.rows.length === 0) {
      console.log('❌ المستخدم غير موجود');
      return;
    }

    const user = result.rows[0];
    console.log('👤 معلومات المستخدم:');
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   🆔 ID: ${user.id}`);
    console.log(`   💎 Subscription: ${user.subscription}`);
    console.log(`   📅 Expiry: ${user.subscription_expiry}`);
    console.log(`   🔔 Auto Analysis: ${user.auto_analysis_enabled}\n`);

    // البحث عن إشعارات هذا المستخدم
    const notifResult = await client.query(`
      SELECT COUNT(*) as count
      FROM system_notifications
      WHERE user_id = $1
    `, [user.id]);

    console.log(`📊 عدد الإشعارات لهذا المستخدم: ${notifResult.rows[0].count}`);

    // جلب آخر 5 إشعارات
    const lastNotifs = await client.query(`
      SELECT title, message, created_at, read
      FROM system_notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [user.id]);

    if (lastNotifs.rows.length > 0) {
      console.log('\n📋 آخر 5 إشعارات:\n');
      lastNotifs.rows.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title}`);
        console.log(`   ${notif.message}`);
        console.log(`   ${new Date(notif.created_at).toLocaleString('ar-EG')}`);
        console.log(`   ${notif.read ? '✅ مقروء' : '🔵 جديد'}\n`);
      });
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await client.end();
  }
}

checkUser();
