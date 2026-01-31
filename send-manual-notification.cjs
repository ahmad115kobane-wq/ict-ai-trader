// إرسال إشعار يدوي لجميع المستخدمين
const https = require('https');

const SERVER_URL = 'https://ict-ai-trader-production.up.railway.app';

// ========================================
// ✏️ عدل هنا فقط:
// ========================================

const NOTIFICATION = {
  title: '🎉 تحديث جديد',
  message: 'تم تحسين نظام الإشعارات لتجربة أفضل',
  type: 'system_update',
  priority: 'normal',
  excludeTelegram: true  // إرسال فقط لمستخدمي التطبيق
};

// ========================================
// لا تعدل شيء تحت هذا السطر
// ========================================

async function sendNotification() {
  console.log('📨 إرسال إشعار...\n');
  console.log(`📋 العنوان: ${NOTIFICATION.title}`);
  console.log(`💬 الرسالة: ${NOTIFICATION.message}\n`);

  const postData = JSON.stringify(NOTIFICATION);

  const options = {
    hostname: 'ict-ai-trader-production.up.railway.app',
    port: 443,
    path: '/api/system-notifications/test-broadcast',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.success) {
            console.log('✅ تم إرسال الإشعار بنجاح!\n');
            console.log('📊 الإحصائيات:');
            console.log(`   👥 المجموع: ${response.stats.total} مستخدم`);
            console.log(`   ✅ نجح: ${response.stats.success}`);
            console.log(`   ❌ فشل: ${response.stats.failed}\n`);
            console.log('📱 تحقق من التطبيق أو Telegram الآن!');
          } else {
            console.log('❌ فشل الإرسال:', response.message);
          }
          resolve();
        } catch (error) {
          console.error('❌ خطأ في تحليل الاستجابة:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ خطأ:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

sendNotification();
