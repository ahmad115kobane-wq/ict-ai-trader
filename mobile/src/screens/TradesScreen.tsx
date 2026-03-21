// src/screens/TradesScreen.tsx
// شاشة إشارات التداول AI

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '../context/AuthContext';
import { analysisService } from '../services/apiService';
import { borderRadius, colors, fontSizes, spacing } from '../theme';
import { SuggestedTrade } from '../types';
import Header from '../components/Header';
import { useCustomAlert } from '../hooks/useCustomAlert';

type SignalItem = {
  id: string;
  symbol: string;
  score: number;
  suggestedTrade?: SuggestedTrade;
  created_at: string;
};

const TradesScreen = () => {
  const { user } = useAuth();
  const { showSuccess, AlertComponent } = useCustomAlert();

  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSignals();
  }, []);

  const loadSignals = async () => {
    setIsLoading(true);
    try {
      const data = await analysisService.getTradesHistory(50);
      if (data.success && Array.isArray(data.trades)) {
        setSignals(data.trades);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSignals();
    setRefreshing(false);
  }, []);

  const copySignal = async (trade?: SuggestedTrade) => {
    if (!trade) return;

    const text = [
      `Type: ${trade.type}`,
      `Entry: ${trade.entry}`,
      `SL: ${trade.sl}`,
      `TP1: ${trade.tp1}`,
      `TP2: ${trade.tp2}`,
      `TP3: ${trade.tp3}`,
    ].join('\n');

    await Clipboard.setStringAsync(text);
    showSuccess('تم النسخ', 'تم نسخ تفاصيل الإشارة');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ar-EG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSignalCard = ({ item }: { item: SignalItem }) => {
    const trade = item.suggestedTrade;
    const isBuy = trade?.type?.includes('BUY');

    return (
      <View style={styles.signalCard}>
        <View style={styles.signalHeader}>
          <View style={[styles.sideBadge, { backgroundColor: isBuy ? colors.buy + '22' : colors.sell + '22' }]}>
            <Text style={[styles.sideText, { color: isBuy ? colors.buy : colors.sell }]}>{trade?.type || 'N/A'}</Text>
          </View>
          <Text style={styles.symbolText}>{item.symbol}</Text>
          <View style={styles.scoreContainer}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={styles.scoreText}>{item.score}/10</Text>
          </View>
        </View>

        {trade && (
          <View style={styles.tradeDetails}>
            <View style={styles.tradeRow}>
              <Text style={styles.tradeValue}>{trade.entry}</Text>
              <Text style={styles.tradeLabel}>Entry</Text>
            </View>
            <View style={styles.tradeRow}>
              <Text style={[styles.tradeValue, { color: colors.loss }]}>{trade.sl}</Text>
              <Text style={styles.tradeLabel}>SL</Text>
            </View>
            <View style={styles.tradeRow}>
              <Text style={[styles.tradeValue, { color: colors.profit }]}>{trade.tp1}</Text>
              <Text style={styles.tradeLabel}>TP1</Text>
            </View>
            <View style={styles.tradeRow}>
              <Text style={[styles.tradeValue, { color: colors.profit }]}>{trade.tp2}</Text>
              <Text style={styles.tradeLabel}>TP2</Text>
            </View>
            <View style={styles.tradeRow}>
              <Text style={[styles.tradeValue, { color: colors.profit }]}>{trade.tp3}</Text>
              <Text style={styles.tradeLabel}>TP3</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => copySignal(trade)}
        >
          <Ionicons name="copy-outline" size={16} color={colors.text} />
          <Text style={styles.copyButtonText}>نسخ الإشارة</Text>
        </TouchableOpacity>

        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Header coins={user?.coins || 0} showLogout={false} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={signals}
          keyExtractor={(item) => item.id}
          renderItem={renderSignalCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>لا توجد إشارات</Text>
              <Text style={styles.emptySubtitle}>ستظهر هنا إشارات التحليل عند توفرها</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <AlertComponent />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 130,
  },
  signalCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  signalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sideBadge: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sideText: {
    fontWeight: '700',
    fontSize: fontSizes.sm,
  },
  symbolText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    color: colors.gold,
    fontWeight: '700',
  },
  tradeDetails: {
    gap: spacing.xs,
  },
  tradeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tradeLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  tradeValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  copyButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default TradesScreen;
