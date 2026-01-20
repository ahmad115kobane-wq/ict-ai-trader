// services/expoPushService.ts
// خدمة Expo Push Notifications لإرسال الإشعارات للتطبيق

import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// إنشاء instance من Expo SDK
const expo = new Expo();

// إرسال إشعارات Push للمستخدمين
export const sendPushNotifications = async (
  pushTokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; tickets: ExpoPushTicket[] }> => {
  // فلترة التوكنات الصالحة فقط
  const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));
  
  if (validTokens.length === 0) {
    console.log('⚠️ No valid Expo push tokens to send');
    return { success: false, tickets: [] };
  }

  // إنشاء الرسائل
  const messages: ExpoPushMessage[] = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: data || {},
    priority: 'high',
    channelId: 'trade-alerts',
  }));

  // تقسيم الرسائل إلى chunks (Expo يدعم 100 رسالة في المرة)
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  console.log(`📱 Sending ${messages.length} push notifications...`);

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      
      // التحقق من حالة كل تذكرة
      ticketChunk.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          console.log(`✅ Push sent to token ${index + 1}`);
        } else if (ticket.status === 'error') {
          console.error(`❌ Push error: ${ticket.message}`);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            console.log('⚠️ Device not registered - token should be removed');
          }
        }
      });
    } catch (error) {
      console.error('❌ Error sending push chunk:', error);
    }
  }

  return { success: tickets.length > 0, tickets };
};

// إرسال إشعار صفقة جديدة
export const sendTradeNotification = async (
  pushTokens: string[],
  trade: {
    type: string;
    entry: number;
    sl: number;
    tp: number;
    rrRatio?: string;
  },
  score: number,
  currentPrice: number
): Promise<boolean> => {
  const isBuy = trade.type.includes('BUY');
  const emoji = isBuy ? '🟢' : '🔴';
  const direction = isBuy ? 'شراء' : 'بيع';
  
  const title = `${emoji} فرصة ${direction} على الذهب!`;
  const body = `💰 الدخول: ${trade.entry.toFixed(2)} | 🛑 SL: ${trade.sl.toFixed(2)} | ✅ TP: ${trade.tp.toFixed(2)} | ⭐ التقييم: ${score}/10`;
  
  const data = {
    type: 'trade_opportunity',
    tradeType: trade.type,
    entry: trade.entry,
    sl: trade.sl,
    tp: trade.tp,
    rrRatio: trade.rrRatio || '',
    score,
    currentPrice,
    timestamp: Date.now(),
  };

  const result = await sendPushNotifications(pushTokens, title, body, data);
  
  if (result.success) {
    console.log(`📱 Trade notification sent to ${pushTokens.length} devices`);
  }
  
  return result.success;
};

// إرسال إشعار تحليل بدون صفقة (اختياري)
export const sendNoTradeNotification = async (
  pushTokens: string[],
  reason: string,
  score: number
): Promise<boolean> => {
  const title = '⏳ تحليل تلقائي جديد';
  const body = `لا توجد فرصة: ${reason.substring(0, 80)} | النقاط: ${score}/10`;
  
  const data = {
    type: 'no_trade',
    reason,
    score,
    timestamp: Date.now(),
  };

  const result = await sendPushNotifications(pushTokens, title, body, data);
  return result.success;
};

// التحقق من صحة Push Token
export const isValidPushToken = (token: string): boolean => {
  return Expo.isExpoPushToken(token);
};

export default {
  sendPushNotifications,
  sendTradeNotification,
  sendNoTradeNotification,
  isValidPushToken,
};
