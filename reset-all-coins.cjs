const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

async function resetAllCoins() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🔄 جاري الاتصال بقاعدة البيانات...');
    await client.connect();
    console.log('✅ متصل بقاعدة البيانات');

    // عرض إحصائيات قبل التصفير
    console.log('\n📊 إحصائيات قبل التصفير:');
    const beforeStats = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(coins) as total_coins,
        AVG(coins) as avg_coins,
        MAX(coins) as max_coins,
        MIN(coins) as min_coins
      FROM users
    `);
    
    console.log('عدد المستخدمين:', beforeStats.rows[0].total_users);
    console.log('إجمالي العملات:', beforeStats.rows[0].total_coins);
    console.log('متوسط العملات:', Math.round(beforeStats.rows[0].avg_coins));
    console.log('أعلى رصيد:', beforeStats.rows[0].max_coins);
    console.log('أقل رصيد:', beforeStats.rows[0].min_coins);

    // عرض المستخدمين الذين لديهم عملات
    console.log('\n👥 المستخدمين الذين لديهم عملات:');
    const usersWithCoins = await client.query(`
      SELECT 
        email,
        coins,
        CASE 
          WHEN email LIKE 'telegram_%@ict-trader.local' THEN 
            'تليجرام: ' || SUBSTRING(email FROM 'telegram_(.*)@ict-trader.local')
          ELSE email 
        END as display_name
      FROM users
      WHERE coins > 0
      ORDER BY coins DESC
    `);

    if (usersWithCoins.rows.length > 0) {
      usersWithCoins.rows.forEach(user => {
        console.log(`  - ${user.display_name}: ${user.coins} عملة`);
      });
    } else {
      console.log('  لا يوجد مستخدمين لديهم عملات');
    }

    // تأكيد من المستخدم
    console.log('\n⚠️  تحذير: هذا الإجراء سيقوم بتصفير جميع العملات لجميع المستخدمين!');
    console.log('⚠️  سيتم تصفير عملات ' + usersWithCoins.rows.length + ' مستخدم');
    console.log('\n🔄 جاري تنفيذ التصفير...');

    // تصفير جميع العملات
    const result = await client.query(`
      UPDATE users 
      SET coins = 0 
      WHERE coins > 0
      RETURNING id, email, coins
    `);

    console.log('\n✅ تم تصفير العملات بنجاح!');
    console.log('📊 عدد المستخدمين المحدثين:', result.rows.length);

    // عرض إحصائيات بعد التصفير
    console.log('\n📊 إحصائيات بعد التصفير:');
    const afterStats = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(coins) as total_coins,
        COUNT(CASE WHEN coins = 0 THEN 1 END) as users_with_zero_coins
      FROM users
    `);
    
    console.log('عدد المستخدمين:', afterStats.rows[0].total_users);
    console.log('إجمالي العملات:', afterStats.rows[0].total_coins);
    console.log('المستخدمين برصيد 0:', afterStats.rows[0].users_with_zero_coins);

    console.log('\n✅ اكتمل التصفير بنجاح!');

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error('التفاصيل:', error);
  } finally {
    await client.end();
    console.log('\n🔌 تم قطع الاتصال بقاعدة البيانات');
  }
}

// تشغيل السكريبت
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║         سكريبت تصفير جميع العملات للمستخدمين         ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

resetAllCoins();
