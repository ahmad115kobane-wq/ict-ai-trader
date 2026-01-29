// services/firebasePushService.ts
// خدمة الإشعارات باستخدام Firebase Admin SDK مباشرة (FCM V1 API)

import * as admin from 'firebase-admin';
import { Expo } from 'expo-server-sdk';

// تهيئة Firebase Admin SDK
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) {
    return true;
  }

  try {
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    if (!serviceAccountJson) {
      console.log('⚠️ No Firebase Service Account found, Firebase push disabled');
      return false;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`📱 Project: ${serviceAccount.project_id}`);
    return true;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    return false;
  }
};

// تحويل Expo Push Token إلى FCM Token
const expoPushTokenToFcmToken = (expoPushToken: string): string | null => {
  // Expo Push Token format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
  // نحتاج استخراج الجزء الداخلي فقط
  const match = expoPushToken.match(/ExponentPushToken\[(.*?)\]/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
};

// إرسال إشعار واحد باستخدام Firebase Admin SDK
export const sendFirebasePushNotification = async (
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> => {
  if (!initializeFirebase()) {
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    // تحويل Expo Token إلى FCM Token
    const fcmToken = expoPushTokenToFcmToken(expoPushToken);
    
    if (!fcmToken) {
      console.error('❌ Invalid Expo Push Token format:', expoPushToken);
      return { success: false, error: 'Invalid token format' };
    }

    // إنشاء رسالة FCM
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: data ? Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
      ) : undefined,
      android: {
        priority: 'high',
        notification: {
          channelId: 'trade-alerts-v2',
          priority: 'max',
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: 'public',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // إرسال الإشعار
    const response = await admin.messaging().send(message);
    console.log('✅ Firebase push notification sent:', response);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending Firebase push notification:', error);
    return { success: false, error: error.message };
  }
};

// إرسال إشعارات متعددة
export const sendFirebasePushNotifications = async (
  expoPushTokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; successCount: number; failureCount: number }> => {
  if (!initializeFirebase()) {
    return { success: false, successCount: 0, failureCount: expoPushTokens.length };
  }

  let successCount = 0;
  let failureCount = 0;

  console.log(`📱 Sending ${expoPushTokens.length} Firebase push notifications...`);

  for (const token of expoPushTokens) {
    const result = await sendFirebasePushNotification(token, title, body, data);
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(`📊 Firebase push results: ${successCount} success, ${failureCount} failed`);

  return {
    success: successCount > 0,
    successCount,
    failureCount,
  };
};

// إرسال إشعار صفقة باستخدام Firebase
export const sendFirebaseTradeNotification = async (
  expoPushTokens: string[],
  trade: {
    type: string;
    entry: number;
    sl: number;
    tp1: number;
    tp2: number;
    tp3: number;
    rrRatio?: string;
  },
  score: number,
  currentPrice: number
): Promise<boolean> => {
  const isBuy = trade.type.includes('BUY');
  const emoji = isBuy ? '🟢' : '🔴';
  const direction = isBuy ? 'شراء' : 'بيع';

  const title = `${emoji} فرصة ${direction} على الذهب!`;
  const body = `💰 الدخول: ${trade.entry.toFixed(2)} | 🛑 SL: ${trade.sl.toFixed(2)} | ✅ TP1: ${trade.tp1.toFixed(2)} | TP2: ${trade.tp2.toFixed(2)} | TP3: ${trade.tp3.toFixed(2)} | ⭐ التقييم: ${score}/10`;

  const data = {
    type: 'trade_opportunity',
    tradeType: trade.type,
    entry: trade.entry.toString(),
    sl: trade.sl.toString(),
    tp1: trade.tp1.toString(),
    tp2: trade.tp2.toString(),
    tp3: trade.tp3.toString(),
    rrRatio: trade.rrRatio || '',
    score: score.toString(),
    currentPrice: currentPrice.toString(),
    timestamp: Date.now().toString(),
  };

  const result = await sendFirebasePushNotifications(expoPushTokens, title, body, data);
  return result.success;
};

// التحقق من صحة Expo Push Token
export const isValidExpoPushToken = (token: string): boolean => {
  if (!token) return false;
  const cleanToken = token.trim().replace('ExponentPushToken[ ', 'ExponentPushToken[');
  return Expo.isExpoPushToken(cleanToken);
};

export default {
  sendFirebasePushNotification,
  sendFirebasePushNotifications,
  sendFirebaseTradeNotification,
  isValidExpoPushToken,
};
