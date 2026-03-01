const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Use global fetch (available in Node 18+)
const fetchFn = globalThis.fetch;

interface TradeSignal {
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp?: number; // للتوافق مع الكود القديم
  tp1: number;
  tp2: number;
  tp3: number;
  confidence: number;
  pair: string;
  timestamp: Date;
}

/**
 * إرسال إشارة صفقة إلى قناة تليجرام
 */
export async function sendTradeSignal(chatId: string, signal: TradeSignal): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const emoji = signal.type === 'BUY' ? '🟢' : '🔴';
    const direction = signal.type === 'BUY' ? 'شراء' : 'بيع';

    const message = `
${emoji} <b>إشارة ${direction} جديدة</b>

📊 <b>الزوج:</b> ${signal.pair}
💰 <b>الدخول:</b> ${signal.entry.toFixed(2)}

🎯 <b>الأهداف:</b>
   🥇 TP1: ${signal.tp1.toFixed(2)}
   🥈 TP2: ${signal.tp2.toFixed(2)}
   🥉 TP3: ${signal.tp3.toFixed(2)}

🛑 <b>إيقاف الخسارة:</b> ${signal.sl.toFixed(2)}

✅ <b>نسبة الثقة:</b> ${signal.confidence}%
⏰ <b>التوقيت:</b> ${signal.timestamp.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}

⚠️ <b>ملاحظة مهمة:</b>
• الأمر المعلق صالح لمدة 45 دقيقة فقط
• في حال تعرضت لستوب لوس مرتين في اليوم، أوقف التداول إلى اليوم التالي

<i>🤖 تم إنشاؤها بواسطة ICT AI Trader</i>
`.trim();

    const response = await fetchFn(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🏠 الرئيسية',
                callback_data: 'main_menu'
              }
            ]
          ]
        }
      }),
    });

    const data: any = await response.json();

    if (data.ok) {
      console.log('✅ Trade signal sent to Telegram:', signal.type, signal.pair);
      return true;
    } else {
      console.error('❌ Failed to send Telegram message:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error);
    return false;
  }
}

/**
 * إرسال رسالة نصية بسيطة
 */
export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetchFn(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data: any = await response.json();
    return data.ok;
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error);
    return false;
  }
}

/**
 * الحصول على معلومات البوت
 */
export async function getBotInfo(): Promise<any> {
  if (!TELEGRAM_BOT_TOKEN) {
    return null;
  }

  try {
    const response = await fetchFn(`${TELEGRAM_API_URL}/getMe`);
    const data: any = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('❌ Error getting bot info:', error);
    return null;
  }
}

/**
 * إرسال رسالة نظام (غير متعلقة بالصفقات) إلى Telegram
 */
export async function sendSystemMessageToTelegram(
  chatId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    priority: string;
    data?: Record<string, any>;
  }
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    // اختيار الأيقونة حسب نوع الإشعار
    let emoji = '🔔';
    switch (notification.type) {
      case 'subscription_expired':
        emoji = '⚠️';
        break;
      case 'subscription_expiring':
        emoji = '⏰';
        break;
      case 'subscription_purchased':
        emoji = '🎉';
        break;
      case 'coins_low':
        emoji = '💰';
        break;
      case 'system_update':
        emoji = '🔔';
        break;
      case 'welcome':
        emoji = '👋';
        break;
    }

    const message = `
${emoji} <b>${notification.title}</b>

${notification.message}

<i>⏰ ${new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}</i>
`.trim();

    // إنشاء أزرار حسب نوع الإشعار
    const buttons: any[] = [];
    
    if (notification.data?.action === 'renew_subscription') {
      buttons.push([
        {
          text: '💎 تجديد الاشتراك',
          callback_data: 'view_packages'
        }
      ]);
    } else if (notification.data?.action === 'buy_coins') {
      buttons.push([
        {
          text: '💰 شراء عملات',
          callback_data: 'view_packages'
        }
      ]);
    } else if (notification.data?.action === 'view_subscription') {
      buttons.push([
        {
          text: '📊 عرض اشتراكي',
          callback_data: 'my_subscription'
        }
      ]);
    }
    
    // إضافة زر الرئيسية دائماً
    buttons.push([
      {
        text: '🏠 الرئيسية',
        callback_data: 'main_menu'
      }
    ]);

    const response = await fetchFn(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: buttons
        }
      }),
    });

    const data: any = await response.json();

    if (data.ok) {
      console.log('✅ System notification sent to Telegram:', notification.type);
      return true;
    } else {
      console.error('❌ Failed to send Telegram system notification:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending Telegram system notification:', error);
    return false;
  }
}
