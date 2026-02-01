// التحقق من الإشعارات في قاعدة البيانات
const SERVER_URL = 'https://ict-ai-trader-production.up.railway.app';

// ضع بيانات تسجيل الدخول هنا
const LOGIN = {
  email: 'a@a.a',
  password: '123123'
};

async function checkNotifications() {
  try {
    console.log('🔐 تسجيل الدخول...');
    
    // تسجيل الدخول
    const loginResponse = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(LOGIN)
    });

    const loginData = await loginResponse.json();
    
    console.log('Response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success && !loginData.token) {
      console.log('❌ فشل تسجيل الدخول:', loginData.message || 'خطأ غير معروف');
      return;
    }

    const token = loginData.token;
    console.log('✅ تم تسجيل الدخول بنجاح\n');

    // جلب الإشعارات
    console.log('📥 جلب الإشعارات...');
    const notificationsResponse = await fetch(`${SERVER_URL}/api/system-notifications?limit=50`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const notificationsData = await notificationsResponse.json();

    if (!notificationsData.success) {
      console.log('❌ فشل جلب الإشعارات:', notificationsData.message);
      return;
    }

    console.log(`\n📊 عدد الإشعارات: ${notificationsData.count}\n`);

    if (notificationsData.count === 0) {
      console.log('⚠️ لا توجد إشعارات في قاعدة البيانات');
      console.log('\n💡 لإرسال إشعار تجريبي، استخدم:');
      console.log('   node send-manual-notification.js');
    } else {
      console.log('📋 الإشعارات:\n');
      notificationsData.notifications.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title}`);
        console.log(`   📝 ${notif.message}`);
        console.log(`   📅 ${new Date(notif.created_at).toLocaleString('ar-EG')}`);
        console.log(`   ${notif.read ? '✅ مقروء' : '🔵 جديد'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

checkNotifications();
