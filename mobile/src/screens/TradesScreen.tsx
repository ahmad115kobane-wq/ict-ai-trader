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
  decision?: string;
  price?: number;
  confidence?: number;
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
    loadAllData();
  }, []);

  const parseServerAnalyses = (analyses: any[]): SignalItem[] => {
    return analyses.map((a: any) => ({
      id: `server-${a.id}`,
      symbol: a.symbol || 'XAUUSD',
      score: a.score || 0,
      decision: a.decision,
      price: a.price,
      confidence: a.confidence,
      suggestedTrade: a.suggestedTrade,
      created_at: a.createdAt,
      isServerAnalysis: true,
    }));
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // جلب التحليلات التلقائية من الخادم (الأساسية) + سجل الصفقات
      const [serverData, historyData] = await Promise.all([
        analysisService.getServerAnalyses(20).catch(() => null),
        analysisService.getTradesHistory(50).catch(() => null),
      ]);

      const allSignals: SignalItem[] = [];

      // التحليلات التلقائية من الخادم (بيع/شراء)
      if (serverData?.success && Array.isArray(serverData.analyses)) {
        allSignals.push(...parseServerAnalyses(serverData.analyses));
      }

      // سجل الصفقات المنفذة
      if (historyData?.success && Array.isArray(historyData.trades)) {
        const existingIds = new Set(allSignals.map(s => s.id));
        const historyItems = historyData.trades
          .filter((t: any) => !existingIds.has(t.id))
          .map((t: any) => ({ ...t, isServerAnalysis: false }));
        allSignals.push(...historyItems);
      }

      // ترتيب حسب التاريخ (الأحدث أولاً)
      allSignals.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setSignals(allSignals);
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServerAnalyses = async () => {
    setFetchingServer(true);
    try {
      const data = await analysisService.getServerAnalyses(20);
      if (data.success && Array.isArray(data.analyses) && data.analyses.length > 0) {
        const serverItems = parseServerAnalyses(data.analyses);

        setSignals(prev => {
          // حذف التحليلات القديمة من الخادم واستبدالها بالجديدة
          const nonServer = prev.filter(s => !s.isServerAnalysis);
          const merged = [...serverItems, ...nonServer];
          merged.sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          });
          return merged;
        });

        showSuccess('تم التحديث', `تم جلب ${data.analyses.length} تحليلات من الخادم`);
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
    await loadAllData();
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
    const decision = item.decision || trade?.type || '';
    const isBuy = decision.toUpperCase().includes('BUY');
    const isSell = decision.toUpperCase().includes('SELL');
    const directionColor = isBuy ? colors.buy : isSell ? colors.sell : colors.textMuted;
    const directionLabel = isBuy ? 'شراء BUY' : isSell ? 'بيع SELL' : decision || 'انتظار';

    return (
      <View style={[styles.signalCard, item.isServerAnalysis && styles.serverSignalCard]}>
        {item.isServerAnalysis && (
          <View style={styles.serverTag}>
            <Ionicons name="cloud" size={10} color={colors.primary} />
            <Text style={styles.serverTagText}>تحليل تلقائي</Text>
          </View>
        )}

        {/* القرار + الرمز + النقاط */}
        <View style={styles.signalHeader}>
          <View style={[styles.sideBadge, { backgroundColor: directionColor + '22' }]}>
            <Ionicons
              name={isBuy ? 'trending-up' : isSell ? 'trending-down' : 'remove'}
              size={14}
              color={directionColor}
            />
            <Text style={[styles.sideText, { color: directionColor }]}>{directionLabel}</Text>
          </View>
          <Text style={styles.symbolText}>{item.symbol}</Text>
          <View style={styles.scoreContainer}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={styles.scoreText}>{item.score}/10</Text>
          </View>
        </View>

        {/* السعر والثقة */}
        {(item.price || item.confidence) && (
          <View style={styles.priceConfidenceRow}>
            {item.price ? (
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>السعر</Text>
                <Text style={styles.priceValue}>{item.price}</Text>
              </View>
            ) : null}
            {item.confidence ? (
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>الثقة</Text>
                <Text style={[styles.priceValue, { color: item.confidence >= 70 ? colors.success : colors.warning }]}>
                  {item.confidence}%
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* تفاصيل الصفقة */}
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
            {trade.tp2 && (
              <View style={styles.tradeRow}>
                <Text style={[styles.tradeValue, { color: colors.profit }]}>{trade.tp2}</Text>
                <Text style={styles.tradeLabel}>TP2</Text>
              </View>
            )}
            {trade.tp3 && (
              <View style={styles.tradeRow}>
                <Text style={[styles.tradeValue, { color: colors.profit }]}>{trade.tp3}</Text>
                <Text style={styles.tradeLabel}>TP3</Text>
              </View>
            )}
          </View>
        )}

        {trade && (
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => copySignal(trade)}
          >
            <Ionicons name="copy-outline" size={16} color={colors.text} />
            <Text style={styles.copyButtonText}>نسخ الإشارة</Text>
          </TouchableOpacity>
        )}

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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sideText: {
    fontWeight: '700',
    fontSize: fontSizes.sm,
  },
  priceConfidenceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  priceBox: {
    alignItems: 'center',
  },
  priceLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginBottom: 2,
  },
  priceValue: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
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
