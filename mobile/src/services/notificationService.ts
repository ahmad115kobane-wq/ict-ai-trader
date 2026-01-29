// src/services/notificationService.ts
// خدمة الإشعارات للتطبيق

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authService } from './apiService';

// إعدادات الإشعارات
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// تسجيل للإشعارات والحصول على التوكن
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  let token: string | null = null;

  // التحقق من أن الجهاز حقيقي (ليس محاكي)
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // إنشاء قناة للإشعارات على Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('trade-alerts-v2', {
      name: 'تنبيهات التداول',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10b981',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  // التحقق من صلاحيات الإشعارات
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions not granted');
    return null;
  }

  // الحصول على توكن Expo Push
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    token = pushTokenData.data;
    console.log('Push token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  return token;
};

// تسجيل التوكن في السيرفر
export const registerPushTokenWithServer = async (token: string): Promise<boolean> => {
  try {
    await authService.registerPushToken(token);
    console.log('Push token registered with server');
    return true;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return false;
  }
};

// إلغاء تسجيل التوكن
export const unregisterPushToken = async (): Promise<void> => {
  try {
    await authService.removePushToken();
    console.log('Push token removed from server');
  } catch (error) {
    console.error('Failed to remove push token:', error);
  }
};

// إضافة مستمع للإشعارات
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(callback);
};

// إضافة مستمع للنقر على الإشعار
export const addNotificationResponseReceivedListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

// إرسال إشعار محلي (للاختبار)
export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // إرسال فوري
  });
};

// جدولة إشعار
export const scheduleNotification = async (
  title: string,
  body: string,
  seconds: number,
  data?: Record<string, any>
): Promise<string> => {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: {
      seconds,
    },
  });
  return id;
};

// إلغاء جميع الإشعارات المجدولة
export const cancelAllScheduledNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// الحصول على الإشعارات المعلقة
export const getPendingNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};

// مسح شارة الإشعارات
export const clearBadge = async (): Promise<void> => {
  await Notifications.setBadgeCountAsync(0);
};

export default {
  registerForPushNotificationsAsync,
  registerPushTokenWithServer,
  unregisterPushToken,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  sendLocalNotification,
  scheduleNotification,
  cancelAllScheduledNotifications,
  getPendingNotifications,
  clearBadge,
};
