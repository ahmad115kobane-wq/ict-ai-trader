// src/components/Header.tsx
// مكون الهيدر القابل لإعادة الاستخدام

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, fontSizes } from '../theme';

interface HeaderProps {
  coins: number;
  onLogout?: () => void;
  showLogout?: boolean;
  showNotifications?: boolean;
  unreadCount?: number;
}

const Header: React.FC<HeaderProps> = ({ 
  coins, 
  onLogout, 
  showLogout = true,
  showNotifications = true,
  unreadCount = 0
}) => {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <View style={styles.headerTitle}>
        <Ionicons name="analytics" size={24} color={colors.primary} />
        <Text style={styles.titleText}>ICT AI Trader</Text>
      </View>

      <View style={styles.headerCenter}>
        <View style={styles.coinsBadge}>
          <Ionicons name="logo-bitcoin" size={16} color={colors.gold} />
          <Text style={styles.coinsText}>{coins}</Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        {showNotifications && (
          <TouchableOpacity 
            onPress={() => (navigation as any).navigate('Notifications')} 
            style={styles.notificationButton}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {showLogout && onLogout ? (
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="exit-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        ) : !showNotifications ? (
          <View style={styles.placeholder} />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  coinsText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  titleText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
});

export default Header;
