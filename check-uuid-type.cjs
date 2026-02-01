// التحقق من نوع UUID في قاعدة البيانات
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

async function checkUUIDType() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // الحصول على user_id من جدول users
    const userResult = await client.query(`
      SELECT id, email, pg_typeof(id) as id_type
      FROM users
      WHERE email = 'a@a.a'
    `);

    console.log('👤 User table:');
    console.log(`   Email: ${userResult.rows[0].email}`);
    console.log(`   ID: ${userResult.rows[0].id}`);
    console.log(`   ID Type: ${userResult.rows[0].id_type}\n`);

    // الحصول على user_id من جدول system_notifications
    const notifResult = await client.query(`
      SELECT user_id, pg_typeof(user_id) as user_id_type, title
      FROM system_notifications
      LIMIT 1
    `);

    if (notifResult.rows.length > 0) {
      console.log('📬 System Notifications table:');
      console.log(`   User ID: ${notifResult.rows[0].user_id}`);
      console.log(`   User ID Type: ${notifResult.rows[0].user_id_type}`);
      console.log(`   Title: ${notifResult.rows[0].title}\n`);
    }

    // محاولة البحث بطرق مختلفة
    const userId = userResult.rows[0].id;
    
    console.log('🔍 Testing different query methods:\n');
    
    // Method 1: Direct string comparison
    const test1 = await client.query(`
      SELECT COUNT(*) as count
      FROM system_notifications
      WHERE user_id = '${userId}'
    `);
    console.log(`1. Direct string: ${test1.rows[0].count} notifications`);

    // Method 2: Parameter binding
    const test2 = await client.query(`
      SELECT COUNT(*) as count
      FROM system_notifications
      WHERE user_id = $1
    `, [userId]);
    console.log(`2. Parameter binding: ${test2.rows[0].count} notifications`);

    // Method 3: Cast to UUID
    const test3 = await client.query(`
      SELECT COUNT(*) as count
      FROM system_notifications
      WHERE user_id::text = $1::text
    `, [userId]);
    console.log(`3. Cast to text: ${test3.rows[0].count} notifications`);

    // Method 4: Show all user_ids in notifications
    const test4 = await client.query(`
      SELECT DISTINCT user_id, COUNT(*) as count
      FROM system_notifications
      GROUP BY user_id
      LIMIT 5
    `);
    console.log(`\n4. All user_ids in notifications:`);
    test4.rows.forEach(row => {
      console.log(`   ${row.user_id}: ${row.count} notifications`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUUIDType();
