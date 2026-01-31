// test-welcome-notification.js
// سكريبت لاختبار إرسال إشعار ترحيبي

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testWelcomeNotification() {
  console.log('🚀 Starting welcome notification test...\n');

  try {
    // استيراد الدوال المطلوبة
    const { initDatabase, getAllUsers } = require('./dist/db/index');
    const { notifyWelcome } = require('./dist/services/systemNotificationService');

    // تهيئة قاعدة البيانات
    console.log('📊 Initializing database...');
    await initDatabase();
    console.log('✅ Database initialized\n');

    // جلب جميع المستخدمين
    console.log('👥 Fetching users...');
    const users = await getAllUsers();
    console.log(`✅ Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('⚠️ No users found in database');
      return;
    }

    // عرض قائمة المستخدمين
    console.log('📋 Available users:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
    });
    console.log('');

    // إرسال إشعار ترحيبي لكل مستخدم
    console.log('📨 Sending welcome notifications...\n');
    
    for (const user of users) {
      try {
        // استخراج اسم المستخدم من البريد الإلكتروني
        let userName = user.email.split('@')[0];
        
        // إذا كان مستخدم Telegram، استخراج الاسم بشكل أفضل
        if (user.email.startsWith('telegram_')) {
          userName = user.email.replace('telegram_', '').replace('@ict-trader.local', '');
        }

        console.log(`   📤 Sending to: ${user.email}`);
        await notifyWelcome(user.id, userName);
        console.log(`   ✅ Sent successfully\n`);
        
        // انتظار قصير بين الإشعارات
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`   ❌ Failed to send to ${user.email}:`, error.message);
      }
    }

    console.log('\n🎉 Welcome notification test completed!');
    console.log('📱 Check your mobile app or Telegram for the notifications');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }

  // إنهاء العملية
  process.exit(0);
}

// تشغيل الاختبار
testWelcomeNotification();
