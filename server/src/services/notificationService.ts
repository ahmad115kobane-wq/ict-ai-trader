// services/notificationService.ts
// خدمة الإشعارات للمستخدمين

// إعدادات Telegram Bot (اختيارية)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// إرسال إشعار Telegram
export const sendTelegramNotification = async (message: string): Promise<boolean> => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('📱 Telegram not configured, skipping notification');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (response.ok) {
      console.log('📱 Telegram notification sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send Telegram notification:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Telegram notification error:', error);
    return false;
  }
};

// إرسال إشعار بفرصة تداول
export const notifyTradeOpportunity = async (analysis: any, currentPrice: number): Promise<void> => {
  if (analysis.decision !== 'PLACE_PENDING' || !analysis.suggestedTrade) {
    return;
  }

  const trade = analysis.suggestedTrade;
  const type = trade.type.includes('BUY') ? 'شراء 🟢' : 'بيع 🔴';
  const rrRatio = trade.rrRatio || 'غير محدد';
  
  const message = `
🚨 <b>فرصة تداول جديدة على الذهب!</b>

📊 <b>النوع:</b> ${type}
💰 <b>الدخول:</b> ${trade.entry.toFixed(2)}
🛑 <b>وقف الخسارة:</b> ${trade.sl.toFixed(2)}
✅ <b>جني الأرباح:</b> ${trade.tp.toFixed(2)}
📈 <b>نسبة المخاطرة:</b> 1:${rrRatio}
⭐ <b>التقييم:</b> ${analysis.score}/10
⏰ <b>انتهاء الصلاحية:</b> ${trade.expiryMinutes || 60} دقيقة

💡 <b>السبب:</b> ${analysis.reasoning || analysis.bias || 'تحليل ICT متقدم'}

🕐 <b>الوقت:</b> ${new Date().toLocaleString('ar-EG')}
💲 <b>السعر الحالي:</b> ${currentPrice.toFixed(2)}
  `.trim();

  await sendTelegramNotification(message);
  
  // يمكن إضافة إشعارات أخرى هنا (Email, SMS, etc.)
  console.log('📱 Trade opportunity notification sent to subscribers');
};

// إرسال إشعار بعدم وجود فرصة (اختياري)
export const notifyNoTrade = async (analysis: any, currentPrice: number): Promise<void> => {
  // يمكن تعطيل هذا لتجنب الإزعاج
  const SEND_NO_TRADE_NOTIFICATIONS = false;
  
  if (!SEND_NO_TRADE_NOTIFICATIONS) {
    return;
  }

  const reasons = analysis.reasons || ['لا توجد فرصة مناسبة حالياً'];
  const message = `
⏳ <b>تحليل تلقائي - لا توجد فرصة</b>

📋 <b>السبب:</b> ${reasons[0]}
💲 <b>السعر الحالي:</b> ${currentPrice.toFixed(2)}
⭐ <b>التقييم:</b> ${analysis.score}/10
🕐 <b>الوقت:</b> ${new Date().toLocaleString('ar-EG')}
  `.trim();

  await sendTelegramNotification(message);
};

// إرسال إشعار يومي بالإحصائيات
export const sendDailyStats = async (): Promise<void> => {
  const message = `
📊 <b>إحصائيات اليوم - ${new Date().toLocaleDateString('ar-EG')}</b>

🤖 التحليل التلقائي يعمل بنجاح
⚡ يتم التحليل كل 5 دقائق عند إغلاق شمعة M5
💎 متاح للمشتركين فقط

🔄 النظام يعمل في الخلفية 24/7
  `.trim();

  await sendTelegramNotification(message);
};

// إرسال إشعار بخطأ في النظام
export const notifySystemError = async (error: string): Promise<void> => {
  const message = `
⚠️ <b>تنبيه نظام</b>

❌ <b>خطأ:</b> ${error}
🕐 <b>الوقت:</b> ${new Date().toLocaleString('ar-EG')}

يرجى التحقق من النظام.
  `.trim();

  await sendTelegramNotification(message);
};

export default {
  sendTelegramNotification,
  notifyTradeOpportunity,
  notifyNoTrade,
  sendDailyStats,
  notifySystemError
};