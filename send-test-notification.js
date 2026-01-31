// إرسال إشعار تجريبي مباشرة للسيرفر
const SERVER_URL = 'https://ict-ai-trader-production.up.railway.app';

async function sendTestNotification() {
  console.log('🚀 إرسال إشعار تجريبي لجميع المستخدمين...\n');

  try {
    // استدعاء endpoint مباشرة (بدون authentication)
    const response = await fetch(`${SERVER_URL}/api/system-notifications/test-broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '🎉 إشعار تجريبي',
        message: 'مرحباً! هذا اختبار لنظام الإشعارات الجديد. يعمل بنجاح ✅',
        type: 'system_update',
        priority: 'high'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ تم إرسال الإشعار بنجاح!');
      console.log(`📊 الإحصائيات:`);
      console.log(`   - المجموع: ${data.stats.total}`);
      console.log(`   - نجح: ${data.stats.success}`);
      console.log(`   - فشل: ${data.stats.failed}`);
      console.log('\n📱 تحقق من التطبيق أو Telegram');
    } else {
      console.log('❌ فشل الإرسال:', data.message);
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

sendTestNotification();
