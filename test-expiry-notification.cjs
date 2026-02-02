// test-expiry-notification.cjs
// سكريبت لاختبار إرسال إشعار انتهاء الاشتراك

const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

async function testExpiryNotification() {
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

    // البحث عن مستخدم لديه اشتراك نشط
    console.log('🔍 البحث عن مستخدمين لديهم اشتراكات نشطة...');
    const result = await client.query(`
      SELECT u.id, u.email, u.subscription, u.subscription_expiry, u.push_token
      FROM users u
      WHERE u.subscription != 'free' 
      AND u.subscription_expiry IS NOT NULL
      ORDER BY u.subscription_expiry DESC
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log('⚠️ لا يوجد مستخدمين لديهم اشتراكات نشطة');
      await client.end();
      return;
    }

    console.log(`\n📊 وجدنا ${result.rows.length} مستخدمين لديهم اشتراكات:\n`);
    
    result.rows.forEach((user, index) => {
      const displayName = user.email.startsWith('telegram_') 
        ? `تليجرام: ${user.email.replace('telegram_', '').replace('@ict-trader.local', '')}`
        : user.email;
      
      const expiryDate = new Date(user.subscription_expiry);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`${index + 1}. ${displayName}`);
      console.log(`   الاشتراك: ${user.subscription}`);
      console.log(`   ينتهي في: ${expiryDate.toLocaleDateString('ar-SA')}`);
      console.log(`   الأيام المتبقية: ${daysRemaining} يوم`);
      console.log(`   لديه Push Token: ${user.push_token ? 'نعم' : 'لا'}`);
      console.log('');
    });

    // اختيار أول مستخدم للاختبار
    const testUser = result.rows[0];
    const displayName = testUser.email.startsWith('telegram_') 
      ? `تليجرام: ${testUser.email.replace('telegram_', '').replace('@ict-trader.local', '')}`
      : testUser.email;

    console.log(`\n🧪 سنرسل إشعار تجريبي إلى: ${displayName}\n`);

    // إنشاء إشعار تجريبي
    const { v4: uuidv4 } = require('uuid');
    const notificationId = uuidv4();
    
    await client.query(`
      INSERT INTO system_notifications (id, user_id, type, title, message, priority, data, read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
    `, [
      notificationId,
      testUser.id,
      'subscription_expired',
      '⚠️ انتهى اشتراكك',
      `لقد انتهى اشتراكك في باقة ${testUser.subscription}. قم بتجديد اشتراكك للاستمرار في الحصول على التحليلات التلقائية.`,
      'high',
      JSON.stringify({
        subscriptionType: testUser.subscription,
        action: 'renew_subscription'
      })
    ]);

    console.log('✅ تم إنشاء الإشعار في قاعدة البيانات');
    console.log(`📧 معرف الإشعار: ${notificationId}`);

    // التحقق من الإشعار
    const checkResult = await client.query(`
      SELECT * FROM system_notifications WHERE id = $1
    `, [notificationId]);

    if (checkResult.rows.length > 0) {
      console.log('\n✅ تم التحقق من الإشعار:');
      console.log(`   العنوان: ${checkResult.rows[0].title}`);
      console.log(`   الرسالة: ${checkResult.rows[0].message}`);
      console.log(`   الأولوية: ${checkResult.rows[0].priority}`);
      console.log(`   مقروء: ${checkResult.rows[0].read ? 'نعم' : 'لا'}`);
    }

    console.log('\n📱 ملاحظة: لإرسال الإشعار فعلياً عبر Push Notification أو التليجرام،');
    console.log('   يجب استدعاء دالة sendSystemNotification من الخادم.');
    console.log('\n💡 يمكنك التحقق من الإشعار في التطبيق أو عبر API:');
    console.log(`   GET /api/notifications?userId=${testUser.id}`);

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 تم قطع الاتصال بقاعدة البيانات');
  }
}

// تشغيل السكريبت
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║      اختبار إشعارات انتهاء الاشتراك                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

testExpiryNotification();
