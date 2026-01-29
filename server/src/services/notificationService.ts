// services/notificationService.ts
// خدمة الإشعارات للمستخدمين

import { sendTradeSignal } from './telegramService';
import { sendFirebaseTradeNotification } from './firebasePushService';

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

// إرسال إشعار بفرصة تداول - باستخدام التنسيق الجديد
export const notifyTradeOpportunity = async (analysis: any, currentPrice: number): Promise<void> => {
  if (analysis.decision !== 'PLACE_PENDING' || !analysis.suggestedTrade) {
    return;
  }

  const trade = analysis.suggestedTrade;
  
  // إرسال باستخدام خدمة تليجرام للمستخدمين المشتركين
  try {
    const { getUsersWithAutoAnalysisEnabled } = await import('../db/index');
    const users = await getUsersWithAutoAnalysisEnabled();
    
    console.log(`📱 Sending trade signal to ${users.length} users with auto analysis enabled`);
    
    // جمع Push Tokens للإشعارات
    const pushTokens: string[] = [];
    
    for (const user of users) {
      // إرسال إلى Telegram
      if (user.email && user.email.startsWith('telegram_')) {
        const telegramId = user.email.replace('telegram_', '').replace('@ict-trader.local', '');
        
        await sendTradeSignal(telegramId, {
          type: trade.type.includes('BUY') ? 'BUY' : 'SELL',
          entry: trade.entry,
          sl: trade.sl,
          tp1: trade.tp1,
          tp2: trade.tp2,
          tp3: trade.tp3,
          confidence: analysis.confidence || analysis.score * 10,
          pair: 'XAUUSD',
          timestamp: new Date()
        });
        
        console.log(`✅ Trade signal sent to Telegram user: ${telegramId}`);
      }
      
      // جمع Push Tokens
      if (user.push_token) {
        pushTokens.push(user.push_token);
      }
    }
    
    // إرسال Push Notifications باستخدام Firebase Admin SDK
    if (pushTokens.length > 0) {
      console.log(`📱 Sending Firebase push notifications to ${pushTokens.length} devices`);
      const success = await sendFirebaseTradeNotification(
        pushTokens,
        trade,
        analysis.score || 0,
        currentPrice
      );
      
      if (success) {
        console.log(`✅ Firebase push notifications sent successfully`);
      } else {
        console.log(`⚠️ Some Firebase push notifications failed`);
      }
    }
  } catch (error) {
    console.error('❌ Error sending trade signals:', error);
  }

  console.log('📱 Trade opportunity notification sent');
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