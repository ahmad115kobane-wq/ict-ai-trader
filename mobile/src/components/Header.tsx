// src/components/Header.tsx
// مكون الهيدر القابل لإعادة الاستخدام

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSizes } from '../theme';

interface HeaderProps {
  coins: number;
  onLogout?: () => void;
  showLogout?: boolean;
}

const Header: React.FC<HeaderProps> = ({ coins, onLogout, showLogout = true }) => {
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

      {showLogout && onLogout ? (
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Ionicons name="exit-outline" size={22} color={colors.error} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
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
