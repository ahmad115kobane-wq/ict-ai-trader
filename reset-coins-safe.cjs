const { Client } = require('pg');
const readline = require('readline');

const DATABASE_URL = 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

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
    console.log('✅ متصل بقاعدة البيانات\n');

    // عرض إحصائيات قبل التصفير
    console.log('📊 إحصائيات الحالية:');
    const beforeStats = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(coins) as total_coins,
        COUNT(CASE WHEN coins > 0 THEN 1 END) as users_with_coins
      FROM users
    `);
    
    const totalUsers = beforeStats.rows[0].total_users;
    const totalCoins = beforeStats.rows[0].total_coins;
    const usersWithCoins = beforeStats.rows[0].users_with_coins;

    console.log(`  • إجمالي المستخدمين: ${totalUsers}`);
    console.log(`  • إجمالي العملات: ${totalCoins}`);
    console.log(`  • مستخدمين لديهم عملات: ${usersWithCoins}`);

    if (usersWithCoins === '0') {
      console.log('\n✅ جميع المستخدمين لديهم 0 عملة بالفعل!');
      rl.close();
      await client.end();
      return;
    }

    // عرض أعلى 10 مستخدمين
    console.log('\n👥 أعلى 10 مستخدمين لديهم عملات:');
    const topUsers = await client.query(`
      SELECT 
        CASE 
          WHEN email LIKE 'telegram_%@ict-trader.local' THEN 
            'تليجرام: ' || SUBSTRING(email FROM 'telegram_(.*)@ict-trader.local')
          ELSE email 
        END as display_name,
        coins
      FROM users
      WHERE coins > 0
      ORDER BY coins DESC
      LIMIT 10
    `);

    topUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.display_name}: ${user.coins} عملة`);
    });

    // طلب التأكيد
    console.log('\n⚠️  تحذير: هذا الإجراء سيقوم بتصفير جميع العملات لجميع المستخدمين!');
    console.log(`⚠️  سيتم تصفير عملات ${usersWithCoins} مستخدم`);
    console.log(`⚠️  سيتم حذف ${totalCoins} عملة\n`);

    const answer = await askQuestion('هل أنت متأكد من المتابعة؟ اكتب "نعم" للتأكيد: ');

    if (answer.trim().toLowerCase() !== 'نعم' && answer.trim().toLowerCase() !== 'yes') {
      console.log('\n❌ تم إلغاء العملية');
      rl.close();
      await client.end();
      return;
    }

    console.log('\n🔄 جاري تنفيذ التصفير...');

    // تصفير جميع العملات
    const result = await client.query(`
      UPDATE users 
      SET coins = 0 
      WHERE coins > 0
      RETURNING id
    `);

    console.log('\n✅ تم تصفير العملات بنجاح!');
    console.log(`📊 عدد المستخدمين المحدثين: ${result.rows.length}`);

    // التحقق النهائي
    const finalCheck = await client.query(`
      SELECT COUNT(*) as users_with_coins FROM users WHERE coins > 0
    `);

    if (finalCheck.rows[0].users_with_coins === '0') {
      console.log('✅ تم التحقق: جميع المستخدمين الآن لديهم 0 عملة');
    } else {
      console.log(`⚠️  تحذير: لا يزال هناك ${finalCheck.rows[0].users_with_coins} مستخدم لديهم عملات`);
    }

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
  } finally {
    rl.close();
    await client.end();
    console.log('\n🔌 تم قطع الاتصال بقاعدة البيانات');
  }
}

// تشغيل السكريبت
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║    سكريبت تصفير جميع العملات (مع تأكيد الأمان)      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

resetAllCoins();
