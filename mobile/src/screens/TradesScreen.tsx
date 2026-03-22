// src/screens/TradesScreen.tsx
// شاشة إشارات التداول AI

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
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

const AUTO_FETCH_INTERVAL = 30000; // 30 ثانية

const TradesScreen = () => {
  const { user } = useAuth();
  const { showSuccess, showError, AlertComponent } = useCustomAlert();

  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoReceiveEnabled, setAutoReceiveEnabled] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const autoFetchTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadAllData();
    return () => {
      if (autoFetchTimer.current) clearInterval(autoFetchTimer.current);
    };
  }, []);

  const parseSuggestedTrade = (raw: any): SuggestedTrade | undefined => {
    if (!raw) return undefined;
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (obj && (obj.entry || obj.sl || obj.tp1)) return obj;
    } catch {}
    return undefined;
  };

  const parseServerAnalyses = (analyses: any[]): SignalItem[] => {
    return analyses.map((a: any) => {
      // محاولة استخراج suggestedTrade من الحقل المباشر أو بنائه من الحقول المنفصلة
      let trade = parseSuggestedTrade(a.suggestedTrade);
      if (!trade && (a.tradeType || a.entry || a.sl)) {
        trade = {
          type: a.tradeType || a.decision,
          entry: a.entry || a.price || 0,
          sl: a.sl || 0,
          tp1: a.tp1 || 0,
          tp2: a.tp2 || 0,
          tp3: a.tp3 || 0,
        } as SuggestedTrade;
      }
      return {
        id: `server-${a.id}`,
        symbol: a.symbol || 'XAUUSD',
        score: a.score || 0,
        decision: a.decision,
        price: a.price || a.entry,
        confidence: a.confidence,
        suggestedTrade: trade,
        created_at: a.createdAt,
        isServerAnalysis: true,
      };
    });
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [serverData, historyData] = await Promise.all([
        analysisService.getServerAnalyses(20).catch(() => null),
        analysisService.getTradesHistory(50).catch(() => null),
      ]);

      const allSignals: SignalItem[] = [];

      if (serverData?.success && Array.isArray(serverData.analyses)) {
        allSignals.push(...parseServerAnalyses(serverData.analyses));
      }

      if (historyData?.success && Array.isArray(historyData.trades)) {
        const existingIds = new Set(allSignals.map(s => s.id));
        const historyItems = historyData.trades
          .filter((t: any) => !existingIds.has(t.id))
          .map((t: any) => ({
            ...t,
            suggestedTrade: parseSuggestedTrade(t.suggestedTrade || t.suggested_trade),
            isServerAnalysis: false,
          }));
        allSignals.push(...historyItems);
      }

      allSignals.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setSignals(allSignals);
      if (allSignals.length > 0) {
        setLastFetchTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServerAnalysesBackground = async () => {
    try {
      const data = await analysisService.getServerAnalyses(20);
      if (data.success && Array.isArray(data.analyses) && data.analyses.length > 0) {
        const serverItems = parseServerAnalyses(data.analyses);
        setSignals(prev => {
          const nonServer = prev.filter(s => !s.isServerAnalysis);
          const merged = [...serverItems, ...nonServer];
          merged.sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          });
          return merged;
        });
        setLastFetchTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (error) {
      console.error('Background fetch error:', error);
    }
  };

  const handleToggleAutoReceive = (value: boolean) => {
    setAutoReceiveEnabled(value);
    if (value) {
      // جلب فوري ثم تشغيل التحديث التلقائي
      fetchServerAnalysesBackground();
      autoFetchTimer.current = setInterval(fetchServerAnalysesBackground, AUTO_FETCH_INTERVAL);
    } else {
      if (autoFetchTimer.current) {
        clearInterval(autoFetchTimer.current);
        autoFetchTimer.current = null;
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  const copySignal = async (item: SignalItem) => {
    const trade = item.suggestedTrade;
    const decision = item.decision || trade?.type || '';

    const parts: string[] = [];
    parts.push(`📊 ${item.symbol}`);
    if (decision) parts.push(`📌 ${decision}`);
    if (item.price) parts.push(`💰 السعر: ${item.price}`);
    if (trade?.entry) parts.push(`🎯 الدخول: ${trade.entry}`);
    if (trade?.sl) parts.push(`🛑 وقف الخسارة: ${trade.sl}`);
    if (trade?.tp1) parts.push(`✅ TP1: ${trade.tp1}`);
    if (trade?.tp2) parts.push(`✅ TP2: ${trade.tp2}`);
    if (trade?.tp3) parts.push(`✅ TP3: ${trade.tp3}`);
    if (item.confidence) parts.push(`📈 الثقة: ${item.confidence}%`);

    await Clipboard.setStringAsync(parts.join('\n'));
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

  const renderToggleHeader = () => (
    <View style={styles.toggleContainer}>
      <LinearGradient
        colors={autoReceiveEnabled ? ['#10b981', '#059669'] : ['#374151', '#1f2937']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.toggleGradient}
      >
        <View style={styles.toggleRow}>
          <Switch
            value={autoReceiveEnabled}
            onValueChange={handleToggleAutoReceive}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,255,255,0.3)' }}
            thumbColor={autoReceiveEnabled ? '#fff' : '#9ca3af'}
          />
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>استلام التحليلات التلقائي</Text>
            <Text style={styles.toggleSubtitle}>
              {autoReceiveEnabled
                ? `🟢 مفعّل - آخر تحديث: ${lastFetchTime || '--:--'}`
                : '⚪ معطّل - فعّل لاستقبال الصفقات تلقائياً'
              }
            </Text>
          </View>
          <View style={styles.toggleIcon}>
            {autoReceiveEnabled ? (
              <View style={styles.pulseWrapper}>
                <Ionicons name="radio" size={24} color="#fff" />
              </View>
            ) : (
              <Ionicons name="radio-outline" size={24} color="#9ca3af" />
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderSignalCard = ({ item }: { item: SignalItem }) => {
    const trade = item.suggestedTrade;
    // trade.type has actual direction (BUY_LIMIT/SELL_LIMIT), decision is just PLACE_PENDING/NO_TRADE
    const tradeType = trade?.type || item.decision || '';
    const isBuy = tradeType.toUpperCase().includes('BUY');
    const isSell = tradeType.toUpperCase().includes('SELL');
    const directionColor = isBuy ? colors.buy : isSell ? colors.sell : colors.textMuted;
    const directionLabel = isBuy
      ? (tradeType.includes('LIMIT') ? 'شراء معلق BUY LIMIT' : tradeType.includes('STOP') ? 'شراء ستوب BUY STOP' : 'شراء BUY')
      : isSell
      ? (tradeType.includes('LIMIT') ? 'بيع معلق SELL LIMIT' : tradeType.includes('STOP') ? 'بيع ستوب SELL STOP' : 'بيع SELL')
      : item.decision === 'NO_TRADE' ? 'لا تداول' : 'انتظار';
    const directionIcon = isBuy ? 'trending-up' : isSell ? 'trending-down' : 'remove';

    // Extract entry/SL/TP - from suggestedTrade or construct from analysis data
    const entry = trade?.entry || item.price || null;
    const sl = trade?.sl || null;
    const tp1 = trade?.tp1 || null;
    const tp2 = trade?.tp2 || null;
    const tp3 = trade?.tp3 || null;

    return (
      <View style={[styles.signalCard, item.isServerAnalysis && styles.serverSignalCard]}>
        {/* Top bar: type badge + symbol + score */}
        <View style={styles.signalTopBar}>
          <View style={[styles.typeBadgeLarge, { backgroundColor: directionColor + '20', borderColor: directionColor + '40' }]}>
            <Ionicons name={directionIcon as any} size={18} color={directionColor} />
            <Text style={[styles.typeBadgeText, { color: directionColor }]}>{directionLabel}</Text>
          </View>
          <View style={styles.symbolScoreRow}>
            <Text style={styles.symbolText}>{item.symbol}</Text>
            {item.isServerAnalysis && (
              <View style={styles.serverTag}>
                <Ionicons name="cloud" size={10} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.scoreContainer}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={styles.scoreText}>{item.score}/10</Text>
          </View>
        </View>

        {/* Trade details grid */}
        <View style={styles.tradeGrid}>
          {/* Entry */}
          <View style={[styles.tradeCell, styles.tradeCellEntry]}>
            <Text style={styles.tradeCellLabel}>🎯 الدخول</Text>
            <Text style={[styles.tradeCellValue, { color: colors.text }]}>
              {entry || '---'}
            </Text>
          </View>
          {/* Stop Loss */}
          <View style={[styles.tradeCell, styles.tradeCellSL]}>
            <Text style={styles.tradeCellLabel}>🛑 وقف الخسارة</Text>
            <Text style={[styles.tradeCellValue, { color: colors.loss || '#ef4444' }]}>
              {sl || '---'}
            </Text>
          </View>
          {/* TP1 */}
          <View style={[styles.tradeCell, styles.tradeCellTP]}>
            <Text style={styles.tradeCellLabel}>✅ TP1</Text>
            <Text style={[styles.tradeCellValue, { color: colors.profit || '#10b981' }]}>
              {tp1 || '---'}
            </Text>
          </View>
          {/* TP2 */}
          {tp2 ? (
            <View style={[styles.tradeCell, styles.tradeCellTP]}>
              <Text style={styles.tradeCellLabel}>✅ TP2</Text>
              <Text style={[styles.tradeCellValue, { color: colors.profit || '#10b981' }]}>
                {tp2}
              </Text>
            </View>
          ) : null}
          {/* TP3 */}
          {tp3 ? (
            <View style={[styles.tradeCell, styles.tradeCellTP]}>
              <Text style={styles.tradeCellLabel}>✅ TP3</Text>
              <Text style={[styles.tradeCellValue, { color: colors.profit || '#10b981' }]}>
                {tp3}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Confidence bar */}
        {item.confidence ? (
          <View style={styles.confidenceRow}>
            <View style={styles.confidenceBarBg}>
              <View style={[styles.confidenceBarFill, {
                width: `${Math.min(item.confidence, 100)}%`,
                backgroundColor: item.confidence >= 70 ? colors.success : item.confidence >= 50 ? colors.warning : colors.error,
              }]} />
            </View>
            <Text style={styles.confidenceText}>{item.confidence}%</Text>
            <Text style={styles.confidenceLabel}>الثقة</Text>
          </View>
        ) : null}

        {/* Footer: copy + date */}
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.copyBtn} onPress={() => copySignal(item)}>
            <Ionicons name="copy-outline" size={14} color={colors.primary} />
            <Text style={styles.copyBtnText}>نسخ</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
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
          ListHeaderComponent={renderToggleHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>لا توجد إشارات</Text>
              <Text style={styles.emptySubtitle}>فعّل استلام التحليلات أعلاه لتلقي الصفقات تلقائياً</Text>
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
  // ======= Toggle Header =======
  toggleContainer: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  toggleTitle: {
    color: '#fff',
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  toggleSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  toggleIcon: {
    width: 40,
    alignItems: 'center',
  },
  pulseWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ======= Signal Card =======
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
  },
  signalTopBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  typeBadgeLarge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontWeight: '800',
    fontSize: fontSizes.md,
  },
  symbolScoreRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  symbolText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  serverTag: {
    backgroundColor: colors.primary + '20',
    borderRadius: 6,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: fontSizes.sm,
  },
  // ======= Trade Grid =======
  tradeGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tradeCell: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
  },
  tradeCellEntry: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary + '50',
  },
  tradeCellSL: {
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444' + '50',
  },
  tradeCellTP: {
    borderBottomWidth: 2,
    borderBottomColor: '#10b981' + '50',
  },
  tradeCellLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginBottom: 4,
  },
  tradeCellValue: {
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  // ======= Confidence =======
  confidenceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  confidenceLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  confidenceText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    minWidth: 36,
  },
  confidenceBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // ======= Footer =======
  cardFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  copyBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  copyBtnText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
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
