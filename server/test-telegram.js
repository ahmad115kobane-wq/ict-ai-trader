// سكريبت اختبار بوت تليجرام
// استخدام: node test-telegram.js <CHAT_ID>

const BOT_TOKEN = '8533408629:AAHapMP2DMyQW1-e1BDf5Ys5S5csivPaeXA';

async function testBot(chatId) {
  if (!chatId) {
    console.log('❌ الرجاء تقديم Chat ID');
    console.log('الاستخدام: node test-telegram.js -1001234567890');
    process.exit(1);
  }

  console.log('🤖 اختبار بوت تليجرام...');
  console.log(`📱 Chat ID: ${chatId}`);

  // رسالة اختبار بسيطة
  const testMessage = `
🤖 *اختبار البوت*

✅ البوت يعمل بنجاح!
⏰ الوقت: ${new Date().toLocaleString('ar-SA')}

_هذه رسالة اختبار من ICT AI Trader_
  `.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ تم إرسال الرسالة بنجاح!');
      console.log('📱 تحقق من قناتك في تليجرام');
      console.log('\n🎉 البوت يعمل! يمكنك الآن إضافة Chat ID إلى ملف .env');
    } else {
      console.log('❌ فشل إرسال الرسالة:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.error_code === 400) {
        console.log('\n💡 نصيحة: تأكد من أن Chat ID صحيح');
      } else if (data.error_code === 403) {
        console.log('\n💡 نصيحة: تأكد من أن البوت مضاف كمسؤول في القناة');
      }
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:');
    console.log(error.message);
  }
}

// اختبار إشارة صفقة
async function testTradeSignal(chatId) {
  console.log('\n📊 اختبار إشارة صفقة...');

  const tradeSignal = `
🟢 *إشارة شراء جديدة*

📊 *الزوج:* XAUUSD
💰 *الدخول:* 2650.50
🎯 *الهدف:* 2665.00
🛑 *الإيقاف:* 2645.00

📈 *نسبة RR:* 1:2.90
✅ *الثقة:* 85%

⏰ *الوقت:* ${new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}

_تم إنشاؤها بواسطة ICT AI Trader_
  `.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: tradeSignal,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ تم إرسال إشارة الصفقة بنجاح!');
      console.log('📱 تحقق من قناتك في تليجرام');
    } else {
      console.log('❌ فشل إرسال إشارة الصفقة:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:');
    console.log(error.message);
  }
}

// الحصول على معلومات البوت
async function getBotInfo() {
  console.log('🔍 جلب معلومات البوت...\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const data = await response.json();

    if (data.ok) {
      const bot = data.result;
      console.log('✅ معلومات البوت:');
      console.log(`   الاسم: ${bot.first_name}`);
      console.log(`   المعرف: @${bot.username}`);
      console.log(`   ID: ${bot.id}`);
      console.log(`   الرابط: https://t.me/${bot.username}`);
      console.log('');
    } else {
      console.log('❌ فشل جلب معلومات البوت');
    }
  } catch (error) {
    console.log('❌ خطأ في الاتصال:');
    console.log(error.message);
  }
}

// تشغيل الاختبار
const chatId = process.argv[2];

(async () => {
  await getBotInfo();
  
  if (chatId) {
    await testBot(chatId);
    await testTradeSignal(chatId);
  } else {
    console.log('📋 للاختبار، استخدم:');
    console.log('   node test-telegram.js -1001234567890');
    console.log('');
    console.log('💡 للحصول على Chat ID:');
    console.log('   1. أرسل رسالة في قناتك');
    console.log('   2. افتح: https://api.telegram.org/bot' + BOT_TOKEN + '/getUpdates');
    console.log('   3. ابحث عن "chat":{"id":-1001234567890');
  }
})();
