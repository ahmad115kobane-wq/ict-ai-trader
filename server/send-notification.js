// send-notification.js
// سكريبت لإرسال إشعار نظام مخصص

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// الحصول على المعاملات من سطر الأوامر
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📨 استخدام السكريبت:

1. إرسال إشعار ترحيبي لجميع المستخدمين:
   node send-notification.js welcome

2. إرسال إشعار ترحيبي لمستخدم محدد:
   node send-notification.js welcome user@example.com

3. إرسال إشعار مخصص لجميع المستخدمين:
   node send-notification.js custom "العنوان" "الرسالة"

4. إرسال إشعار مخصص لمستخدم محدد:
   node send-notification.js custom "العنوان" "الرسالة" user@example.com

5. إرسال تحديث نظام لجميع المستخدمين:
   node send-notification.js update "رسالة التحديث"

أمثلة:
   node send-notification.js welcome
   node send-notification.js welcome telegram_123456@ict-trader.local
   node send-notification.js custom "عرض خاص" "خصم 50% على جميع الباقات!"
   node send-notification.js update "تم إضافة ميزات جديدة للتطبيق"
  `);
  process.exit(0);
}

async function sendNotification() {
  const command = args[0];

  try {
    // استيراد الدوال المطلوبة
    const { initDatabase, getAllUsers, getUserByEmail } = require('./dist/db/index');
    const { 
      notifyWelcome, 
      notifySystemUpdate,
      sendSystemNotification 
    } = require('./dist/services/systemNotificationService');

    // تهيئة قاعدة البيانات
    console.log('📊 Initializing database...');
    await initDatabase();
    console.log('✅ Database initialized\n');

    if (command === 'welcome') {
      // إشعار ترحيبي
      const targetEmail = args[1];

      if (targetEmail) {
        // إرسال لمستخدم محدد
        console.log(`📤 Sending welcome notification to: ${targetEmail}`);
        const user = await getUserByEmail(targetEmail);
        
        if (!user) {
          console.error('❌ User not found');
          process.exit(1);
        }

        let userName = targetEmail.split('@')[0];
        if (targetEmail.startsWith('telegram_')) {
          userName = targetEmail.replace('telegram_', '').replace('@ict-trader.local', '');
        }

        await notifyWelcome(user.id, userName);
        console.log('✅ Welcome notification sent successfully!');
      } else {
        // إرسال لجميع المستخدمين
        console.log('📤 Sending welcome notifications to all users...');
        const users = await getAllUsers();
        console.log(`Found ${users.length} users\n`);

        for (const user of users) {
          let userName = user.email.split('@')[0];
          if (user.email.startsWith('telegram_')) {
            userName = user.email.replace('telegram_', '').replace('@ict-trader.local', '');
          }

          console.log(`   📨 Sending to: ${user.email}`);
          await notifyWelcome(user.id, userName);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n✅ All welcome notifications sent!');
      }
    } else if (command === 'update') {
      // تحديث النظام
      const message = args[1];

      if (!message) {
        console.error('❌ Please provide update message');
        process.exit(1);
      }

      console.log('📤 Sending system update to all users...');
      await notifySystemUpdate(message);
      console.log('✅ System update sent successfully!');
    } else if (command === 'custom') {
      // إشعار مخصص
      const title = args[1];
      const message = args[2];
      const targetEmail = args[3];

      if (!title || !message) {
        console.error('❌ Please provide title and message');
        process.exit(1);
      }

      const notification = {
        type: 'system_update',
        title,
        message,
        priority: 'normal',
        data: {}
      };

      if (targetEmail) {
        // إرسال لمستخدم محدد
        console.log(`📤 Sending custom notification to: ${targetEmail}`);
        const user = await getUserByEmail(targetEmail);
        
        if (!user) {
          console.error('❌ User not found');
          process.exit(1);
        }

        await sendSystemNotification(user.id, notification);
        console.log('✅ Custom notification sent successfully!');
      } else {
        // إرسال لجميع المستخدمين
        console.log('📤 Sending custom notification to all users...');
        const users = await getAllUsers();
        
        for (const user of users) {
          console.log(`   📨 Sending to: ${user.email}`);
          await sendSystemNotification(user.id, notification);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n✅ All custom notifications sent!');
      }
    } else {
      console.error('❌ Unknown command:', command);
      console.log('Use: node send-notification.js (without arguments) to see usage');
      process.exit(1);
    }

    console.log('\n📱 Check your mobile app or Telegram for the notifications');

  } catch (error) {
    console.error('❌ Failed to send notification:', error);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// تشغيل السكريبت
sendNotification();
