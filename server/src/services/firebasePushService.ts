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

// ملاحظة: Expo Push Tokens لا يمكن استخدامها مباشرة مع Firebase Admin SDK
// Expo Push Tokens تعمل فقط مع Expo Push Service
// لذلك سنستخدم Expo SDK مع FCM credentials بدلاً من Firebase Admin SDK

// إرسال إشعار واحد باستخدام Expo SDK (يدعم FCM V1 تلقائياً)
export const sendFirebasePushNotification = async (
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> => {
  // استخدام Expo SDK بدلاً من Firebase Admin SDK
  // Expo SDK يتعامل مع FCM credentials تلقائياً من google-services.json
  const { sendPushNotifications } = await import('./expoPushService');
  
  try {
    const result = await sendPushNotifications(
      [expoPushToken],
      title,
      body,
      data,
      {
        priority: 'high',
        sound: 'default',
        badge: 1,
      }
    );
    
    if (result.success) {
      console.log('✅ Push notification sent via Expo SDK');
      return { success: true };
    } else {
      console.error('❌ Push notification failed via Expo SDK');
      return { success: false, error: 'Failed to send via Expo SDK' };
    }
  } catch (error: any) {
    console.error('❌ Error sending push notification:', error);
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
  // استخدام Expo SDK مباشرة
  const { sendPushNotifications } = await import('./expoPushService');
  
  console.log(`📱 Sending ${expoPushTokens.length} push notifications via Expo SDK...`);

  try {
    const result = await sendPushNotifications(
      expoPushTokens,
      title,
      body,
      data,
      {
        priority: 'high',
        sound: 'default',
        badge: 1,
      }
    );
    
    const successCount = result.success ? expoPushTokens.length : 0;
    const failureCount = result.success ? 0 : expoPushTokens.length;
    
    console.log(`📊 Push results: ${successCount} success, ${failureCount} failed`);
    
    return {
      success: result.success,
      successCount,
      failureCount,
    };
  } catch (error) {
    console.error('❌ Error sending push notifications:', error);
    return {
      success: false,
      successCount: 0,
      failureCount: expoPushTokens.length,
    };
  }
};

// إرسال إشعار صفقة باستخدام Expo SDK
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
  // استخدام Expo SDK مباشرة
  const { sendTradeNotification } = await import('./expoPushService');
  
  try {
    const success = await sendTradeNotification(
      expoPushTokens,
      trade,
      score,
      currentPrice
    );
    
    return success;
  } catch (error) {
    console.error('❌ Error sending trade notification:', error);
    return false;
  }
};

// إرسال إشعار نظام (غير متعلق بالصفقات)
export const sendFirebaseSystemNotification = async (
  expoPushTokens: string[],
  notification: {
    type: string;
    title: string;
    message: string;
    priority: string;
    data?: Record<string, any>;
  }
): Promise<boolean> => {
  const { sendPushNotifications } = await import('./expoPushService');
  
  try {
    // تحديد الأولوية
    const priority = notification.priority === 'high' ? 'high' : 'normal';
    
    const result = await sendPushNotifications(
      expoPushTokens,
      notification.title,
      notification.message,
      {
        type: 'system',
        notificationType: notification.type,
        ...notification.data
      },
      {
        priority: priority as 'high' | 'normal',
        sound: 'default',
        badge: 1,
      }
    );
    
    return result.success;
  } catch (error) {
    console.error('❌ Error sending system notification:', error);
    return false;
  }
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
  sendFirebaseSystemNotification,
  isValidExpoPushToken,
};
