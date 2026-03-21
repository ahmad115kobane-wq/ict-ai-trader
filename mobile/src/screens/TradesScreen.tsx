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
import { LinearGradient } from 'expo-linear-gradient';

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
  isServerAnalysis?: boolean;
};

const TradesScreen = () => {
  const { user } = useAuth();
  const { showSuccess, showError, AlertComponent } = useCustomAlert();

  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingServer, setFetchingServer] = useState(false);

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

  const fetchServerAnalyses = async () => {
    setFetchingServer(true);
    try {
      const data = await analysisService.getServerAnalyses(10);
      if (data.success && Array.isArray(data.analyses) && data.analyses.length > 0) {
        const serverItems: SignalItem[] = data.analyses.map((a: any) => ({
          id: `server-${a.id}`,
          symbol: a.symbol || 'XAUUSD',
          score: a.score || 0,
          suggestedTrade: a.suggestedTrade,
          created_at: a.createdAt,
          isServerAnalysis: true,
        }));

        setSignals(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newItems = serverItems.filter(s => !existingIds.has(s.id));
          return [...newItems, ...prev];
        });

        showSuccess('تم الاستلام', `تم جلب ${data.analyses.length} تحليلات من الخادم`);
      } else {
        showSuccess('لا توجد تحليلات', 'لا توجد تحليلات جديدة من الخادم حالياً');
      }
    } catch (error: any) {
      showError('خطأ', 'فشل في جلب التحليلات من الخادم');
    } finally {
      setFetchingServer(false);
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

  const renderServerButton = () => (
    <TouchableOpacity
      style={styles.serverButton}
      onPress={fetchServerAnalyses}
      disabled={fetchingServer}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.serverButtonGradient}
      >
        {fetchingServer ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="cloud-download-outline" size={22} color="#fff" />
        )}
        <Text style={styles.serverButtonText}>
          {fetchingServer ? 'جارٍ الجلب...' : 'استلام التحليلات من الخادم'}
        </Text>
        {!fetchingServer && (
          <View style={styles.serverButtonBadge}>
            <Ionicons name="sparkles" size={12} color={colors.gold} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSignalCard = ({ item }: { item: SignalItem }) => {
    const trade = item.suggestedTrade;
    const isBuy = trade?.type?.includes('BUY');

    return (
      <View style={[styles.signalCard, item.isServerAnalysis && styles.serverSignalCard]}>
        {item.isServerAnalysis && (
          <View style={styles.serverTag}>
            <Ionicons name="cloud" size={10} color={colors.primary} />
            <Text style={styles.serverTagText}>من الخادم</Text>
          </View>
        )}
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
          ListHeaderComponent={renderServerButton}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>لا توجد إشارات</Text>
              <Text style={styles.emptySubtitle}>اضغط على زر استلام التحليلات أعلاه لجلب الإشارات من الخادم</Text>
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
  serverButton: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  serverButtonGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  serverButtonText: {
    color: '#fff',
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  serverButtonBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  serverSignalCard: {
    borderColor: colors.primary + '40',
    borderWidth: 1,
  },
  serverTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  serverTagText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
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
