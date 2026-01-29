// App.tsx
// التطبيق الرئيسي - ICT AI Trader

import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerForPushNotificationsAsync,
  registerPushTokenWithServer,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  clearBadge,
} from './src/services/notificationService';

// مكون تسجيل الإشعارات
const NotificationHandler = () => {
  const { isAuthenticated } = useAuth();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (isAuthenticated) {
      // تسجيل للإشعارات
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          registerPushTokenWithServer(token);
        }
      });

      // مستمع استلام الإشعارات
      notificationListener.current = addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received:', notification);
          // يمكن إضافة منطق إضافي هنا
        }
      );

      // مستمع النقر على الإشعارات
      responseListener.current = addNotificationResponseReceivedListener(
        (response) => {
          console.log('Notification response:', response);
          const data = response.notification.request.content.data;
          
          // التنقل بناءً على نوع الإشعار
          if (data?.type === 'trade_opportunity') {
            // يمكن إضافة التنقل للصفقة هنا
            console.log('Trade notification tapped:', data);
          }
        }
      );

      // مسح شارة الإشعارات عند فتح التطبيق
      clearBadge();
    }

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  return null;
};

// التطبيق الرئيسي
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationHandler />
          <AppNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
