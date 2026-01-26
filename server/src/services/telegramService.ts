const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Use global fetch (available in Node 18+)
const fetchFn = globalThis.fetch;

interface TradeSignal {
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
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
    
    // حساب نسبة المخاطرة إلى العائد
    const risk = Math.abs(signal.entry - signal.sl);
    const reward = Math.abs(signal.tp - signal.entry);
    const rr = (reward / risk).toFixed(2);

    const message = `
${emoji} *إشارة ${direction} جديدة*

📊 *الزوج:* ${signal.pair}
💰 *الدخول:* ${signal.entry.toFixed(2)}
🎯 *الهدف:* ${signal.tp.toFixed(2)}
🛑 *الإيقاف:* ${signal.sl.toFixed(2)}

📈 *نسبة RR:* 1:${rr}
✅ *الثقة:* ${signal.confidence}%

⏰ *الوقت:* ${signal.timestamp.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}

_تم إنشاؤها بواسطة ICT AI Trader_
`.trim();

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
