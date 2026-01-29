// test-push-notification.js
// سكريبت لاختبار إرسال إشعارات Push

const { Expo } = require('expo-server-sdk');

// إنشاء instance من Expo SDK
const expo = new Expo();

// دالة لاختبار إرسال إشعار
async function testPushNotification(pushToken) {
  // التحقق من صحة التوكن
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error('❌ Invalid Expo Push Token format!');
    console.log('Expected format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
    return;
  }

  console.log('📱 Testing push notification...');
  console.log('Token:', pushToken);

  // إنشاء رسالة الإشعار
  const message = {
    to: pushToken,
    sound: 'default',
    title: '🧪 اختبار الإشعارات',
    body: 'هذا إشعار تجريبي من السيرفر. إذا وصلك هذا الإشعار، فالنظام يعمل بشكل صحيح! ✅',
    data: {
      type: 'test',
      timestamp: Date.now(),
      message: 'Test notification from server'
    },
    priority: 'high',
    channelId: 'trade-alerts-v2',
    badge: 1,
  };

  try {
    // إرسال الإشعار
    console.log('📤 Sending notification...');
    const tickets = await expo.sendPushNotificationsAsync([message]);
    
    console.log('\n✅ Notification sent successfully!');
    console.log('Ticket:', JSON.stringify(tickets, null, 2));
    
    // التحقق من حالة التذكرة
    if (tickets[0].status === 'ok') {
      console.log('\n🎉 Success! The notification was accepted by Expo.');
      console.log('Check your device for the notification.');
    } else if (tickets[0].status === 'error') {
      console.error('\n❌ Error sending notification:');
      console.error('Message:', tickets[0].message);
      console.error('Details:', tickets[0].details);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

// دالة لاختبار إشعار صفقة
async function testTradeNotification(pushToken) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error('❌ Invalid Expo Push Token format!');
    return;
  }

  console.log('📱 Testing trade notification...');

  const message = {
    to: pushToken,
    sound: 'default',
    title: '🟢 فرصة شراء على الذهب!',
    body: '💰 الدخول: 2650.50 | 🛑 SL: 2645.00 | ✅ TP1: 2655.00 | TP2: 2660.00 | TP3: 2665.00 | ⭐ التقييم: 8/10',
    data: {
      type: 'trade_opportunity',
      tradeType: 'BUY_LIMIT',
      entry: 2650.50,
      sl: 2645.00,
      tp1: 2655.00,
      tp2: 2660.00,
      tp3: 2665.00,
      score: 8,
      currentPrice: 2652.00,
      timestamp: Date.now(),
    },
    priority: 'high',
    channelId: 'trade-alerts-v2',
    badge: 1,
  };

  try {
    console.log('📤 Sending trade notification...');
    const tickets = await expo.sendPushNotificationsAsync([message]);
    
    console.log('\n✅ Trade notification sent!');
    console.log('Ticket:', JSON.stringify(tickets, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// الاستخدام
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('📋 Usage:');
  console.log('  node test-push-notification.js <push-token> [trade]');
  console.log('');
  console.log('Examples:');
  console.log('  node test-push-notification.js ExponentPushToken[xxxxxx]');
  console.log('  node test-push-notification.js ExponentPushToken[xxxxxx] trade');
  console.log('');
  console.log('💡 Tip: Get your push token from:');
  console.log('  https://ict-ai-trader-production.up.railway.app/api/auth/list-push-tokens');
  process.exit(0);
}

const pushToken = args[0];
const testType = args[1];

if (testType === 'trade') {
  testTradeNotification(pushToken);
} else {
  testPushNotification(pushToken);
}
