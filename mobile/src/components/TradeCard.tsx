// src/components/TradeCard.tsx
// مكون بطاقة الصفقة

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, borderRadius, fontSizes } from '../theme';
import { SuggestedTrade } from '../types';

interface TradeCardProps {
  symbol: string;
  date: string;
  score: number;
  trade: SuggestedTrade;
  status?: 'pending' | 'active' | 'closed';
  onChat?: () => void;
  onFollow?: () => void;
}

const TradeCard: React.FC<TradeCardProps> = ({
  symbol,
  date,
  score,
  trade,
  status = 'pending',
  onChat,
  onFollow,
}) => {
  const isBuy = trade.type.includes('BUY');

  const copyToClipboard = async (value: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert('تم النسخ', 'تم نسخ القيمة');
  };

  const copyAllTrade = async () => {
    const text = `
نوع: ${trade.type}
دخول: ${trade.entry}
SL: ${trade.sl}
TP1: ${trade.tp1}
TP2: ${trade.tp2}
TP3: ${trade.tp3}
    `.trim();
    await Clipboard.setStringAsync(text);
    Alert.alert('تم النسخ', 'تم نسخ تفاصيل الصفقة');
  };

  const calculateRR = () => {
    const risk = Math.abs(trade.entry - trade.sl);
    const reward = Math.abs(trade.tp1 - trade.entry);
    return `1:1:${(reward / risk).toFixed(1)}`;
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'active':
        return { text: 'نشطة', color: colors.success };
      case 'closed':
        return { text: 'مغلقة', color: colors.textMuted };
      default:
        return { text: 'معلقة', color: colors.warning };
    }
  };

  const statusInfo = getStatusLabel();

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
          <Ionicons name="hourglass-outline" size={14} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
        </View>
        <View style={styles.symbolContainer}>
          <Text style={styles.symbolText}>{symbol}</Text>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </View>

      {/* Trade Type & Score */}
      <View style={styles.typeRow}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>النقاط:</Text>
          <Text style={styles.scoreValue}>{score}/10</Text>
        </View>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: isBuy ? colors.buy + '20' : colors.sell + '20' },
          ]}
        >
          <Ionicons
            name={isBuy ? 'trending-up' : 'trending-down'}
            size={18}
            color={isBuy ? colors.buy : colors.sell}
          />
          <Text style={[styles.typeText, { color: isBuy ? colors.buy : colors.sell }]}>
            {trade.type}
          </Text>
        </View>
      </View>

      {/* Levels */}
      <View style={styles.levelsContainer}>
        <LevelRow
          label="دخول"
          value={trade.entry.toString()}
          onCopy={() => copyToClipboard(trade.entry.toString())}
        />
        <LevelRow
          label="SL"
          value={trade.sl.toString()}
          color={colors.error}
          onCopy={() => copyToClipboard(trade.sl.toString())}
        />
        <LevelRow
          label="TP"
          value={trade.tp1.toString()}
          color={colors.success}
          onCopy={() => copyToClipboard(trade.tp1.toString())}
        />
        <View style={styles.rrRow}>
          <Text style={styles.rrValue}>{calculateRR()}</Text>
          <Text style={styles.rrLabel}>نسبة المخاطرة</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.copyBtn]} onPress={copyAllTrade}>
          <Ionicons name="copy-outline" size={18} color={colors.text} />
          <Text style={styles.actionText}>نسخ الكل</Text>
        </TouchableOpacity>

        {onChat && (
          <TouchableOpacity style={[styles.actionBtn, styles.chatBtn]} onPress={onChat}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
            <Text style={styles.actionText}>دردشة</Text>
          </TouchableOpacity>
        )}

        {onFollow && (
          <TouchableOpacity style={[styles.actionBtn, styles.followBtn]} onPress={onFollow}>
            <Ionicons name="eye-outline" size={18} color={colors.text} />
            <Text style={styles.actionText}>متابعة</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// مكون صف المستوى
const LevelRow: React.FC<{
  label: string;
  value: string;
  color?: string;
  onCopy: () => void;
}> = ({ label, value, color, onCopy }) => (
  <View style={styles.levelRow}>
    <TouchableOpacity onPress={onCopy} style={styles.copyIcon}>
      <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
    </TouchableOpacity>
    <Text style={[styles.levelValue, color && { color }]}>{value}</Text>
    <Text style={[styles.levelLabel, color && { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  symbolContainer: {
    alignItems: 'flex-end',
  },
  symbolText: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  typeText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
  scoreValue: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  levelsContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  levelLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    width: 50,
    textAlign: 'right',
  },
  levelValue: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  copyIcon: {
    padding: spacing.xs,
  },
  rrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  rrLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  rrValue: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  copyBtn: {
    backgroundColor: colors.secondary,
  },
  chatBtn: {
    backgroundColor: colors.info,
  },
  followBtn: {
    backgroundColor: colors.primary,
  },
  actionText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
});

export default TradeCard;
