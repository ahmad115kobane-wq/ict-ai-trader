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
    
    // حساب نسبة المخاطرة إلى العائد للأهداف الثلاثة
    const risk = Math.abs(signal.entry - signal.sl);
    const reward1 = Math.abs(signal.tp1 - signal.entry);
    const reward2 = Math.abs(signal.tp2 - signal.entry);
    const reward3 = Math.abs(signal.tp3 - signal.entry);
    const rr1 = (reward1 / risk).toFixed(1);
    const rr2 = (reward2 / risk).toFixed(1);
    const rr3 = (reward3 / risk).toFixed(1);

    const message = `
╔═══════════════════════════
${emoji} <b>إشارة ${direction} جديدة</b>
╚═══════════════════════════

📊 <b>الزوج:</b> ${signal.pair}
💰 <b>الدخول:</b> ${signal.entry.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 <b>الأهداف:</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
   🥇 TP1: ${signal.tp1.toFixed(2)} (1:${rr1})
   🥈 TP2: ${signal.tp2.toFixed(2)} (1:${rr2})
   🥉 TP3: ${signal.tp3.toFixed(2)} (1:${rr3})

━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 <b>إيقاف الخسارة:</b> ${signal.sl.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━
✅ <b>نسبة الثقة:</b> ${signal.confidence}%
⏰ <b>التوقيت:</b> ${signal.timestamp.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}

━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <b>تنبيه مهم:</b>
الأمر المعلق صالح لمدة 60 دقيقة فقط
إذا لم يتم تفعيله خلال هذه المدة، يُلغى تلقائياً
━━━━━━━━━━━━━━━━━━━━━━━━━

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
