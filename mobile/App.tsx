// App.tsx
// التطبيق الرئيسي - ICT AI Trader

import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, AppState, AppStateStatus, Platform, I18nManager } from 'react-native';
import * as Notifications from 'expo-notifications';

// تفعيل دعم RTL للغة العربية
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerForPushNotificationsAsync,
  registerPushTokenWithServer,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  clearBadge,
} from './src/services/notificationService';

// مكون تسجيل الإشعارات المحسّن
const NotificationHandler = () => {
  const { isAuthenticated, user } = useAuth();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const appState = useRef(AppState.currentState);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);
  const hasSetupNotifications = useRef(false); // منع التكرار

  // تسجيل Push Token
  const setupPushNotifications = async () => {
    // منع التكرار
    if (hasSetupNotifications.current) {
      console.log('🔔 Notifications already setup, skipping...');
      return;
    }
    hasSetupNotifications.current = true;

    try {
      console.log('🔔 Setting up push notifications...');

      // طلب أذونات الإشعارات بشكل صريح على Android 13+
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        console.log('📱 Android 13+ detected - requesting explicit notification permission');
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('⚠️ Notification permission not granted');
          Alert.alert(
            'تنبيه الإشعارات',
            'يجب السماح بالإشعارات لتلقي تنبيهات التداول الفورية',
            [{ text: 'حسناً' }]
          );
          return;
        }
        console.log('✅ Notification permission granted');
      }

      const token = await registerForPushNotificationsAsync();

      if (token) {
        console.log('📱 Push Token obtained:', token.substring(0, 30) + '...');
        const success = await registerPushTokenWithServer(token);
        if (success) {
          console.log('✅ Push token registered with server');
        } else {
          console.log('⚠️ Failed to register push token with server');
        }
      } else {
        console.log('⚠️ No push token obtained - notifications may not work');
        // إظهار تنبيه للمستخدم
        Alert.alert(
          'تنبيه',
          'لم يتم الحصول على توكن الإشعارات. قد لا تعمل الإشعارات بشكل صحيح.',
          [{ text: 'حسناً' }]
        );
      }
    } catch (error) {
      console.error('❌ Error setting up push notifications:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
  };

  // معالجة استلام الإشعار
  const handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('📬 Notification received:', JSON.stringify(notification.request.content, null, 2));
    setLastNotification(notification);

    const data = notification.request.content.data;

    // إظهار تنبيه داخل التطبيق للإشعارات المهمة
    if (data?.type === 'trade_opportunity') {
      const trade = data;
      const emoji = trade.tradeType?.includes('BUY') ? '🟢' : '🔴';
      const direction = trade.tradeType?.includes('BUY') ? 'شراء' : 'بيع';

      Alert.alert(
        `${emoji} فرصة تداول جديدة!`,
        `${direction} على الذهب\n💰 الدخول: ${trade.entry}\n🛑 وقف الخسارة: ${trade.sl}\n✅ الهدف الأول: ${trade.tp1}\n⭐ التقييم: ${trade.score}/10`,
        [
          { text: 'عرض التفاصيل', onPress: () => console.log('Navigate to trade details') },
          { text: 'إغلاق', style: 'cancel' }
        ]
      );
    }
  };

  // معالجة النقر على الإشعار
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    console.log('👆 Notification tapped:', JSON.stringify(response.notification.request.content.data, null, 2));

    const data = response.notification.request.content.data;

    if (data?.type === 'trade_opportunity') {
      // التنقل لصفحة الصفقات
      console.log('Navigate to trades screen with data:', data);
      // يمكن استخدام navigation هنا إذا كان متاحاً
    }
  };

  // مراقبة حالة التطبيق
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App came to foreground - clearing badge');
        clearBadge();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // تسجيل للإشعارات
      setupPushNotifications();

      // مستمع استلام الإشعارات (التطبيق مفتوح)
      notificationListener.current = addNotificationReceivedListener(handleNotificationReceived);

      // مستمع النقر على الإشعارات
      responseListener.current = addNotificationResponseReceivedListener(handleNotificationResponse);

      // مسح شارة الإشعارات عند فتح التطبيق
      clearBadge();

      // التحقق من آخر إشعار تم استلامه عندما كان التطبيق مغلق
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          console.log('📬 Last notification response:', response.notification.request.content.data);
          handleNotificationResponse(response);
        }
      });
    }

    return () => {
      if (notificationListener.current) {
        try {
          notificationListener.current.remove();
        } catch (error) {
          console.log('⚠️ Could not remove notification listener');
        }
      }
      if (responseListener.current) {
        try {
          responseListener.current.remove();
        } catch (error) {
          console.log('⚠️ Could not remove response listener');
        }
      }
    };
  }, [isAuthenticated]);

  return null;
};

// التطبيق الرئيسي
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0d1117' }}>
      <SafeAreaProvider style={{ backgroundColor: '#0d1117' }}>
        <AuthProvider>
          <NotificationHandler />
          <AppNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
