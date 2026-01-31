// src/screens/NotificationsScreen.tsx
// شاشة الإشعارات

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

import { colors, spacing, borderRadius, fontSizes } from '../theme';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_BASE_URL } from '../config/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'trade' | 'analysis' | 'subscription' | 'system';
  read: boolean;
  createdAt: string;
}

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // جلب إشعارات النظام من API الجديد
      const token = await SecureStore.getItemAsync('token');
      
      console.log('🔍 Loading notifications from:', `${API_BASE_URL}/api/system-notifications?limit=50`);
      
      const response = await fetch(`${API_BASE_URL}/api/system-notifications?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      console.log('📥 API Response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log(`✅ Found ${data.notifications.length} notifications`);
        
        // تحويل البيانات من الخادم إلى تنسيق الشاشة
        const formattedNotifications: Notification[] = data.notifications.map((notif: any) => ({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: mapNotificationType(notif.type),
          read: notif.read === 1 || notif.read === true,
          createdAt: notif.created_at,
        }));
        
        console.log('📋 Formatted notifications:', formattedNotifications.length);
        
        setNotifications(formattedNotifications);
      } else {
        console.log('❌ API returned success: false');
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // تحويل نوع الإشعار من الخادم إلى نوع الشاشة
  const mapNotificationType = (serverType: string): 'trade' | 'analysis' | 'subscription' | 'system' => {
    switch (serverType) {
      case 'subscription_expired':
      case 'subscription_expiring':
      case 'subscription_purchased':
        return 'subscription';
      case 'coins_low':
        return 'system';
      case 'system_update':
      case 'welcome':
        return 'system';
      default:
        return 'system';
    }
  };

  // الحصول على عنوان الإشعار
  const getNotificationTitle = (type: string, defaultTitle: string): string => {
    return defaultTitle; // العنوان يأتي من الخادم
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      // تحديث في الواجهة فوراً
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );

      // إرسال الطلب للخادم
      const token = await SecureStore.getItemAsync('token');
      
      await fetch(`${API_BASE_URL}/api/system-notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // تحديث في الواجهة فوراً
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );

      // إرسال الطلب للخادم
      const token = await SecureStore.getItemAsync('token');
      
      await fetch(`${API_BASE_URL}/api/system-notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // حذف من الواجهة فوراً
      setNotifications(prev => prev.filter(notif => notif.id !== id));

      // إرسال الطلب للخادم
      const token = await SecureStore.getItemAsync('token');
      
      await fetch(`${API_BASE_URL}/api/system-notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'trade':
        return 'trending-up';
      case 'analysis':
        return 'analytics';
      case 'subscription':
        return 'diamond';
      case 'system':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'trade':
        return colors.success;
      case 'analysis':
        return colors.primary;
      case 'subscription':
        return colors.gold;
      case 'system':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-SA');
  };

  const renderNotification = (notification: Notification) => {
    const iconName = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type);

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationCard,
          !notification.read && styles.notificationCardUnread,
        ]}
        onPress={() => markAsRead(notification.id)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={iconName as any} size={24} color={iconColor} />
          </View>

          <View style={styles.notificationText}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTime(notification.createdAt)}
            </Text>
          </View>

          {!notification.read && <View style={styles.unreadDot} />}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNotification(notification.id)}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Header coins={user?.coins || 0} onLogout={logout} showLogout={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل الإشعارات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <Header coins={user?.coins || 0} onLogout={logout} showLogout={true} />

      {/* Page Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>الإشعارات</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>تعليم الكل كمقروء</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد إشعارات</Text>
            <Text style={styles.emptySubText}>
              سيتم عرض الإشعارات الجديدة هنا
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsContainer}>
            {notifications.map(renderNotification)}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
  },
  markAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  markAllText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  notificationsContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationCardUnread: {
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  notificationMessage: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.lg,
    fontWeight: '600',
  },
  emptySubText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default NotificationsScreen;
