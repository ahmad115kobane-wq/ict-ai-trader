const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:SaPMOYHFVLiMxqPPZJjVWLLkXxfJBqYE@junction.proxy.rlwy.net:18716/railway';

async function updateCoins() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
  });

  try {
    console.log('🔄 جاري الاتصال بقاعدة البيانات...');
    await client.connect();
    console.log('✅ متصل بقاعدة البيانات');

    // البحث عن المستخدم
    console.log('🔍 جاري البحث عن المستخدم BatMan232...');
    const searchResult = await client.query(
      'SELECT id, email, telegram_username, telegram_id, coins FROM users WHERE telegram_username = $1',
      ['BatMan232']
    );

    if (searchResult.rows.length === 0) {
      console.log('❌ لم يتم العثور على المستخدم بهذا الـ username');
      return;
    }

    const user = searchResult.rows[0];
    console.log('\n📋 بيانات المستخدم الحالية:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Telegram Username:', user.telegram_username);
    console.log('Telegram ID:', user.telegram_id);
    console.log('Coins الحالية:', user.coins);

    // تحديث الكوينز
    const updateResult = await client.query(
      'UPDATE users SET coins = $1 WHERE telegram_username = $2 RETURNING id, email, telegram_username, telegram_id, coins',
      [3100, 'BatMan232']
    );

    console.log('\n✅ تم تحديث الكوينز بنجاح!');
    console.log('\n📋 بيانات المستخدم بعد التحديث:');
    console.log('ID:', updateResult.rows[0].id);
    console.log('Email:', updateResult.rows[0].email);
    console.log('Telegram Username:', updateResult.rows[0].telegram_username);
    console.log('Telegram ID:', updateResult.rows[0].telegram_id);
    console.log('Coins الجديدة:', updateResult.rows[0].coins);

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 تم قطع الاتصال بقاعدة البيانات');
  }
}

updateCoins();
