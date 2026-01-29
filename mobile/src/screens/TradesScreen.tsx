// src/screens/TradesScreen.tsx
// شاشة سجل الصفقات والتحليلات

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '../context/AuthContext';
import { analysisService } from '../services/apiService';
import { colors, spacing, borderRadius, fontSizes } from '../theme';
import { TradeHistory, SuggestedTrade } from '../types';
import Header from '../components/Header';

interface TradeItem {
  id: string;
  symbol: string;
  decision: string;
  score: number;
  confidence: number;
  price: number;
  suggestedTrade?: SuggestedTrade;
  created_at: string;
  status?: string;
}

const TradesScreen = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const data = await analysisService.getTradesHistory(50);
      if (data.success && data.trades) {
        setTrades(data.trades);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrades();
    setRefreshing(false);
  }, []);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('تم النسخ', 'تم نسخ القيمة إلى الحافظة');
  };

  const copyAllTrade = async (trade: SuggestedTrade) => {
    const text = `
نوع الصفقة: ${trade.type}
الدخول: ${trade.entry}
وقف الخسارة: ${trade.sl}
الهدف الأول: ${trade.tp1}
الهدف الثاني: ${trade.tp2}
الهدف الثالث: ${trade.tp3}
نسبة المخاطرة: ${trade.rrRatio || 'غير محدد'}
    `.trim();
    await Clipboard.setStringAsync(text);
    Alert.alert('تم النسخ', 'تم نسخ تفاصيل الصفقة كاملة');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateRR = (trade: SuggestedTrade) => {
    const risk = Math.abs(trade.entry - trade.sl);
    const reward = Math.abs(trade.tp1 - trade.entry);
    const ratio = (reward / risk).toFixed(1);
    return `1:1:${ratio}`;
  };

  const renderTradeCard = ({ item }: { item: TradeItem }) => {
    const trade = item.suggestedTrade;
    const isBuy = trade?.type?.includes('BUY');

    return (
      <View style={styles.tradeCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.statusBadge}>
            <Ionicons name="hourglass-outline" size={14} color={colors.warning} />
            <Text style={styles.statusText}>معلقة</Text>
          </View>
          <View style={styles.symbolContainer}>
            <Text style={styles.symbolText}>{item.symbol}</Text>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        {/* Trade Type & Score */}
        <View style={styles.tradeTypeRow}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>النقاط:</Text>
            <Text style={styles.scoreValue}>{item.score}/10</Text>
          </View>
          <View style={[
            styles.tradeTypeBadge,
            { backgroundColor: isBuy ? colors.buy + '20' : colors.sell + '20' }
          ]}>
            <Ionicons
              name={isBuy ? 'trending-up' : 'trending-down'}
              size={18}
              color={isBuy ? colors.buy : colors.sell}
            />
            <Text style={[styles.tradeTypeText, { color: isBuy ? colors.buy : colors.sell }]}>
              {trade?.type}
            </Text>
          </View>
        </View>

        {/* Trade Levels */}
        {trade && (
          <View style={styles.levelsContainer}>
            {/* Entry */}
            <View style={styles.levelRow}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(trade.entry.toString())}
              >
                <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.levelValue}>{trade.entry}</Text>
              <Text style={styles.levelLabel}>دخول</Text>
            </View>

            {/* SL */}
            <View style={styles.levelRow}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(trade.sl.toString())}
              >
                <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={[styles.levelValue, { color: colors.error }]}>{trade.sl}</Text>
              <Text style={[styles.levelLabel, { color: colors.error }]}>SL</Text>
            </View>

            {/* TP */}
            <View style={styles.levelRow}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(trade.tp1.toString())}
              >
                <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={[styles.levelValue, { color: colors.success }]}>{trade.tp1}</Text>
              <Text style={[styles.levelLabel, { color: colors.success }]}>TP</Text>
            </View>

            {/* RR Ratio */}
            <View style={styles.rrRow}>
              <Text style={styles.rrValue}>{calculateRR(trade)}</Text>
              <Text style={styles.rrLabel}>نسبة المخاطرة</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.copyAllButton]}
            onPress={() => trade && copyAllTrade(trade)}
          >
            <Ionicons name="copy-outline" size={18} color={colors.text} />
            <Text style={styles.actionButtonText}>نسخ الكل</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.chatButton]}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
            <Text style={styles.actionButtonText}>دردشة</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.followButton]}>
            <Ionicons name="eye-outline" size={18} color={colors.text} />
            <Text style={styles.actionButtonText}>متابعة</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>لا توجد صفقات</Text>
      <Text style={styles.emptySubtitle}>
        ستظهر هنا الصفقات عندما يكتشف النظام فرص تداول
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <Header 
        coins={user?.coins || 0}
        showLogout={false}
      />

      {/* Trades List */}
      <FlatList
        data={trades}
        renderItem={renderTradeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 120, // مسافة إضافية لشريط التنقل العائم
  },
  tradeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  symbolContainer: {
    alignItems: 'flex-start',
  },
  symbolText: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: 2,
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  statusText: {
    color: colors.warning,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  tradeTypeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tradeTypeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  tradeTypeText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  scoreContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    textAlign: 'right',
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
    flexDirection: 'row-reverse',
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
    textAlign: 'left',
  },
  levelValue: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  copyButton: {
    padding: spacing.xs,
  },
  rrRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  rrLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'right',
  },
  rrValue: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
  actionButtons: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  copyAllButton: {
    backgroundColor: colors.secondary,
  },
  chatButton: {
    backgroundColor: colors.info,
  },
  followButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});

export default TradesScreen;
