// src/screens/TradesScreen.tsx
// شاشة تداول فعلي (Paper Trading) + إشارات AI

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '../context/AuthContext';
import { analysisService } from '../services/apiService';
import { paperTradingService } from '../services/paperTradingService';
import { borderRadius, colors, fontSizes, spacing } from '../theme';
import { PaperPosition, PaperTradingAccount, SuggestedTrade } from '../types';
import Header from '../components/Header';
import { useCustomAlert } from '../hooks/useCustomAlert';

type ActiveTab = 'trading' | 'signals';

type SignalItem = {
  id: string;
  symbol: string;
  score: number;
  suggestedTrade?: SuggestedTrade;
  created_at: string;
};

const DEFAULT_ACCOUNT: PaperTradingAccount = {
  initialBalance: 10000,
  balance: 10000,
  equity: 10000,
  floatingPnl: 0,
  closedPnl: 0,
  usedMargin: 0,
  freeMargin: 10000,
  openPositionsCount: 0,
};

const TradesScreen = () => {
  const { user } = useAuth();
  const { showAlert, showConfirm, showError, showSuccess, AlertComponent } = useCustomAlert();

  const [activeTab, setActiveTab] = useState<ActiveTab>('trading');
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [account, setAccount] = useState<PaperTradingAccount>(DEFAULT_ACCOUNT);
  const [openPositions, setOpenPositions] = useState<PaperPosition[]>([]);
  const [closedPositions, setClosedPositions] = useState<PaperPosition[]>([]);
  const [lotSizeInput, setLotSizeInput] = useState('0.10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal للتعديل
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PaperPosition | null>(null);
  const [newStopLoss, setNewStopLoss] = useState('');
  const [newTakeProfit, setNewTakeProfit] = useState('');

  useEffect(() => {
    void initialLoad();

    const interval = setInterval(() => {
      void refreshTradingOnly();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const initialLoad = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadSignals(), refreshTradingOnly()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSignals = async () => {
    try {
      const data = await analysisService.getTradesHistory(50);
      if (data.success && Array.isArray(data.trades)) {
        setSignals(data.trades);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  const updateTradingSnapshot = async (price: number) => {
    const autoClosed = await paperTradingService.autoCloseTriggeredPositions(price);
    if (autoClosed.length > 0) {
      showSuccess('إغلاق تلقائي', `تم إغلاق ${autoClosed.length} صفقة عند SL/TP`);
    }

    const snapshot = await paperTradingService.getSnapshot(price);
    setAccount(snapshot.account);
    setOpenPositions(snapshot.openPositions);
    setClosedPositions(snapshot.closedPositions);
  };

  const refreshTradingOnly = async () => {
    try {
      const priceData = await analysisService.getCurrentPrice('XAUUSD');
      if (typeof priceData.price === 'number') {
        setCurrentPrice(priceData.price);
        await updateTradingSnapshot(priceData.price);
      }
    } catch (error) {
      console.error('Error refreshing trading data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadSignals(), refreshTradingOnly()]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const closeAllBuy = async () => {
    if (openPositions.filter(p => p.side === 'BUY').length === 0) {
      showAlert('لا توجد صفقات', 'لا توجد صفقات شراء لإغلاقها');
      return;
    }
    
    showConfirm(
      'إغلاق جميع مراكز الشراء',
      'هل تريد إغلاق جميع مراكز BUY؟',
      async () => {
        try {
          const closed = await paperTradingService.closeAllBuyPositions(currentPrice);
          await updateTradingSnapshot(currentPrice);
          showSuccess('تم الإغلاق ✅', `تم إغلاق ${closed.length} صفقة شراء`);
        } catch (error) {
          showError('فشل الإغلاق ❌', 'تعذر إغلاق الصفقات');
        }
      }
    );
  };

  const closeAllSell = async () => {
    if (openPositions.filter(p => p.side === 'SELL').length === 0) {
      showAlert('لا توجد صفقات', 'لا توجد صفقات بيع لإغلاقها');
      return;
    }
    
    showConfirm(
      'إغلاق جميع مراكز البيع',
      'هل تريد إغلاق جميع مراكز SELL؟',
      async () => {
        try {
          const closed = await paperTradingService.closeAllSellPositions(currentPrice);
          await updateTradingSnapshot(currentPrice);
          showSuccess('تم الإغلاق ✅', `تم إغلاق ${closed.length} صفقة بيع`);
        } catch (error) {
          showError('فشل الإغلاق ❌', 'تعذر إغلاق الصفقات');
        }
      }
    );
  };

  const closeProfitable = async () => {
    const profitableCount = openPositions.filter(p => {
      const pnl = paperTradingService.getPositionFloatingPnl(p, currentPrice);
      return pnl > 0;
    }).length;
    
    if (profitableCount === 0) {
      showAlert('لا توجد مراكز رابحة', 'لا توجد صفقات رابحة حالياً');
      return;
    }
    
    showConfirm(
      'إغلاق المراكز الرابحة',
      `هل تريد إغلاق ${profitableCount} صفقة رابحة؟`,
      async () => {
        try {
          const closed = await paperTradingService.closeProfitablePositions(currentPrice);
          await updateTradingSnapshot(currentPrice);
          showSuccess('تم الإغلاق ✅', `تم إغلاق ${closed.length} صفقة رابحة`);
        } catch (error) {
          showError('فشل الإغلاق ❌', 'تعذر إغلاق الصفقات');
        }
      }
    );
  };

  const editPosition = (position: PaperPosition) => {
    setEditingPosition(position);
    setNewStopLoss(position.stopLoss.toFixed(2));
    setNewTakeProfit(position.takeProfit.toFixed(2));
    setEditModalVisible(true);
  };

  const savePositionEdit = async () => {
    if (!editingPosition) return;

    const sl = parseFloat(newStopLoss);
    const tp = parseFloat(newTakeProfit);

    if (!Number.isFinite(sl) || !Number.isFinite(tp)) {
      showError('قيم غير صحيحة', 'تأكد من إدخال أرقام صحيحة لـ SL و TP');
      return;
    }

    try {
      // تحديث الصفقة في الخدمة
      const state = await paperTradingService.loadState();
      const positionIndex = state.openPositions.findIndex(p => p.id === editingPosition.id);
      
      if (positionIndex === -1) {
        showError('خطأ', 'لم يتم العثور على الصفقة');
        return;
      }

      state.openPositions[positionIndex].stopLoss = sl;
      state.openPositions[positionIndex].takeProfit = tp;
      
      await paperTradingService.saveState(state);
      await updateTradingSnapshot(currentPrice);
      
      setEditModalVisible(false);
      setEditingPosition(null);
      showSuccess('تم التعديل ✅', 'تم تحديث SL و TP بنجاح');
    } catch (error) {
      console.error('Edit position error:', error);
      showError('فشل التعديل ❌', 'تعذر تعديل الصفقة');
    }
  };

  const parseLotSize = (): number | null => {
    const lot = Number(lotSizeInput);
    if (!Number.isFinite(lot) || lot <= 0 || lot > 50) {
      return null;
    }
    return lot;
  };

  const createMarketOrder = async (side: 'BUY' | 'SELL') => {
    if (!currentPrice) {
      showError('السعر غير متاح', 'انتظر تحميل السعر الحالي ثم حاول مرة أخرى');
      return;
    }

    const lotSize = parseLotSize();
    if (!lotSize) {
      showError('حجم لوت غير صحيح', 'ادخل قيمة بين 0.01 و 50');
      return;
    }

    setIsSubmitting(true);
    try {
      const slDistance = 5;
      const tpDistance = 10;

      const stopLoss = side === 'BUY' ? currentPrice - slDistance : currentPrice + slDistance;
      const takeProfit = side === 'BUY' ? currentPrice + tpDistance : currentPrice - tpDistance;

      await paperTradingService.openPosition({
        symbol: 'XAUUSD',
        side,
        lotSize,
        marketPrice: currentPrice,
        stopLoss,
        takeProfit,
      });

      await updateTradingSnapshot(currentPrice);
      showSuccess('تم فتح الصفقة', `${side} ${lotSize} LOT على ${currentPrice.toFixed(2)}`);
    } catch (error) {
      console.error('Open position error:', error);
      showError('فشل فتح الصفقة', 'تعذر فتح الصفقة حالياً');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closePosition = async (position: PaperPosition) => {
    showConfirm(
      'إغلاق الصفقة',
      `هل تريد إغلاق صفقة ${position.side} الآن؟`,
      async () => {
        try {
          const closed = await paperTradingService.closePosition(position.id, currentPrice);
          if (!closed) {
            showError('غير موجودة', 'لم يتم العثور على الصفقة');
            return;
          }

          await updateTradingSnapshot(currentPrice);
          showSuccess(
            'تم الإغلاق',
            `النتيجة: ${formatMoney(closed.realizedPnl || 0)}`
          );
        } catch (error) {
          console.error('Close position error:', error);
          showError('فشل الإغلاق', 'تعذر إغلاق الصفقة');
        }
      }
    );
  };

  const resetTradingAccount = () => {
    showConfirm(
      'إعادة تعيين الحساب',
      'سيتم تصفير جميع الصفقات وإرجاع الرصيد إلى 10,000$.',
      async () => {
        await paperTradingService.resetAccount(10000);
        await updateTradingSnapshot(currentPrice || 0);
        showSuccess('تمت الإعادة', 'تم تصفير الحساب بنجاح');
      }
    );
  };

  const copySignal = async (trade?: SuggestedTrade) => {
    if (!trade) {
      showAlert({
        title: 'لا توجد بيانات',
        message: 'هذه الإشارة لا تحتوي على تفاصيل تداول',
      });
      return;
    }

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

  const openFromSignal = async (trade?: SuggestedTrade) => {
    if (!trade) {
      return;
    }

    const side: 'BUY' | 'SELL' = trade.type.includes('BUY') ? 'BUY' : 'SELL';
    const lotSize = parseLotSize();

    if (!lotSize) {
      showError('حجم اللوت غير صحيح', 'ادخل حجم لوت صحيح قبل تنفيذ الصفقة');
      return;
    }

    setIsSubmitting(true);
    try {
      await paperTradingService.openPosition({
        symbol: 'XAUUSD',
        side,
        lotSize,
        marketPrice: trade.entry,
        stopLoss: trade.sl,
        takeProfit: trade.tp1,
      });
      await refreshTradingOnly();
      setActiveTab('trading');
      showSuccess('تم تنفيذ الإشارة', `تم فتح صفقة ${side} من الإشارة بنجاح`);
    } catch (error) {
      showError('فشل التنفيذ', 'تعذر فتح الصفقة من الإشارة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (value: number): string => {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return '-';
    }
    return new Date(dateString).toLocaleString('ar-EG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openPositionsWithPnl = useMemo(
    () =>
      openPositions.map((position) => ({
        ...position,
        floatingPnl: paperTradingService.getPositionFloatingPnl(position, currentPrice),
      })),
    [openPositions, currentPrice]
  );

  const showSignalsTab = activeTab === 'signals';

  const renderPosition = ({ item }: { item: PaperPosition & { floatingPnl?: number } }) => {
    const pnl = item.floatingPnl || 0;
    const isProfit = pnl >= 0;

    return (
      <View style={styles.positionCardCompact}>
        <View style={styles.positionHeaderCompact}>
          <View style={[styles.sideBadge, { backgroundColor: item.side === 'BUY' ? colors.buy + '22' : colors.sell + '22' }]}> 
            <Text style={[styles.sideText, { color: item.side === 'BUY' ? colors.buy : colors.sell }]}>{item.side}</Text>
          </View>
          <Text style={styles.symbolTextCompact}>{item.symbol}</Text>
          <Text style={[styles.pnlValueCompact, { color: isProfit ? colors.profit : colors.loss }]}>
            {formatMoney(pnl)}
          </Text>
        </View>

        <View style={styles.positionDetailsRow}>
          <Text style={styles.positionDetailText}>Entry: {item.entryPrice.toFixed(2)}</Text>
          <Text style={styles.positionDetailText}>Lot: {item.lotSize.toFixed(2)}</Text>
          <Text style={styles.positionDetailText}>SL: {item.stopLoss.toFixed(2)}</Text>
          <Text style={styles.positionDetailText}>TP: {item.takeProfit.toFixed(2)}</Text>
        </View>

        <View style={styles.positionButtonsRow}>
          <TouchableOpacity style={styles.closeButtonCompact} onPress={() => closePosition(item)}>
            <Ionicons name="close-circle" size={16} color={colors.text} />
            <Text style={styles.closeButtonTextCompact}>إغلاق</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.editButtonCompact} onPress={() => editPosition(item)}>
            <Ionicons name="create-outline" size={16} color={colors.text} />
            <Text style={styles.editButtonTextCompact}>تعديل</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSignalCard = ({ item }: { item: SignalItem }) => {
    const trade = item.suggestedTrade;
    const isBuy = trade?.type?.includes('BUY');

    return (
      <View style={styles.signalCard}>
        <View style={styles.positionHeader}>
          <View style={[styles.sideBadge, { backgroundColor: isBuy ? colors.buy + '22' : colors.sell + '22' }]}> 
            <Text style={[styles.sideText, { color: isBuy ? colors.buy : colors.sell }]}>{trade?.type || 'NO TRADE'}</Text>
          </View>
          <View>
            <Text style={styles.symbolText}>{item.symbol}</Text>
            <Text style={styles.smallMuted}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.positionRow}>
          <Text style={styles.positionValue}>{item.score}/10</Text>
          <Text style={styles.positionLabel}>Score</Text>
        </View>
        {trade && (
          <>
            <View style={styles.positionRow}>
              <Text style={styles.positionValue}>{trade.entry}</Text>
              <Text style={styles.positionLabel}>Entry</Text>
            </View>
            <View style={styles.positionRow}>
              <Text style={styles.positionValue}>{trade.sl}</Text>
              <Text style={styles.positionLabel}>SL</Text>
            </View>
            <View style={styles.positionRow}>
              <Text style={styles.positionValue}>{trade.tp1}</Text>
              <Text style={styles.positionLabel}>TP1</Text>
            </View>
          </>
        )}

        <View style={styles.signalButtonsRow}>
          <TouchableOpacity style={[styles.signalButton, styles.copySignalButton]} onPress={() => copySignal(trade)}>
            <Text style={styles.signalButtonText}>نسخ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.signalButton, styles.executeSignalButton]}
            onPress={() => openFromSignal(trade)}
            disabled={isSubmitting || !trade}
          >
            <Text style={styles.signalButtonText}>تنفيذ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTradingTab = () => (
    <>
      <View style={styles.accountCard}>
        <Text style={styles.sectionTitle}>حساب التداول الفعلي (Paper)</Text>
        <View style={styles.positionRow}>
          <Text style={styles.accountValue}>${account.balance.toFixed(2)}</Text>
          <Text style={styles.positionLabel}>الرصيد</Text>
        </View>
        <View style={styles.positionRow}>
          <Text style={styles.accountValue}>${account.equity.toFixed(2)}</Text>
          <Text style={styles.positionLabel}>Equity</Text>
        </View>
        <View style={styles.positionRow}>
          <Text style={[styles.accountValue, { color: account.floatingPnl >= 0 ? colors.profit : colors.loss }]}>
            {formatMoney(account.floatingPnl)}
          </Text>
          <Text style={styles.positionLabel}>P/L العائم</Text>
        </View>
        <View style={styles.positionRow}>
          <Text style={[styles.accountValue, { color: account.closedPnl >= 0 ? colors.profit : colors.loss }]}>
            {formatMoney(account.closedPnl)}
          </Text>
          <Text style={styles.positionLabel}>P/L المغلق</Text>
        </View>
        
        <TouchableOpacity style={styles.resetButton} onPress={resetTradingAccount}>
          <Ionicons name="refresh" size={16} color={colors.text} />
          <Text style={styles.resetButtonText}>إعادة تعيين الحساب</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.positionActionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={closeAllBuy}>
          <Text style={styles.actionButtonText}>إغلاق BUY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={closeAllSell}>
          <Text style={styles.actionButtonText}>إغلاق SELL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={closeProfitable}>
          <Text style={styles.actionButtonText}>إغلاق الرابحة</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>الصفقات المفتوحة ({openPositionsWithPnl.length})</Text>
      {openPositionsWithPnl.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pulse-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptySubtitle}>لا توجد صفقات مفتوحة حالياً</Text>
        </View>
      ) : (
        <FlatList
          data={openPositionsWithPnl}
          keyExtractor={(item) => item.id}
          renderItem={renderPosition}
          scrollEnabled={false}
        />
      )}

      <Text style={styles.sectionTitle}>آخر الصفقات المغلقة</Text>
      {closedPositions.slice(0, 5).map((position) => (
        <View key={position.id} style={styles.closedCard}>
          <Text style={styles.smallMuted}>{formatDate(position.closedAt)}</Text>
          <Text style={[styles.pnlValue, { color: (position.realizedPnl || 0) >= 0 ? colors.profit : colors.loss }]}> 
            {formatMoney(position.realizedPnl || 0)}
          </Text>
        </View>
      ))}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <Header coins={user?.coins || 0} showLogout={false} />

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'signals' && styles.activeTabButton]}
          onPress={() => setActiveTab('signals')}
        >
          <Text style={[styles.tabText, activeTab === 'signals' && styles.activeTabText]}>إشارات AI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'trading' && styles.activeTabButton]}
          onPress={() => setActiveTab('trading')}
        >
          <Text style={[styles.tabText, activeTab === 'trading' && styles.activeTabText]}>التداول الفعلي</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : showSignalsTab ? (
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
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderTradingTab()}
        </ScrollView>
      )}

      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تعديل الصفقة</Text>
            
            {editingPosition && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoText}>
                    {editingPosition.side} {editingPosition.lotSize.toFixed(2)} LOT
                  </Text>
                  <Text style={styles.modalInfoText}>
                    Entry: {editingPosition.entryPrice.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Stop Loss</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newStopLoss}
                    onChangeText={setNewStopLoss}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Take Profit</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newTakeProfit}
                    onChangeText={setNewTakeProfit}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>إلغاء</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalSaveButton]}
                    onPress={savePositionEdit}
                  >
                    <Text style={styles.modalButtonText}>حفظ</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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
  tabsRow: {
    flexDirection: 'row-reverse',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 130,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  accountCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  accountValue: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  positionCardCompact: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  positionHeaderCompact: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  symbolTextCompact: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  pnlValueCompact: {
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  positionDetailsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  positionDetailText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
  },
  positionButtonsRow: {
    flexDirection: 'row-reverse',
    gap: spacing.xs,
  },
  closeButtonCompact: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    flex: 1,
    marginRight: spacing.xs,
  },
  closeButtonTextCompact: {
    color: colors.text,
    fontWeight: '600',
    fontSize: fontSizes.sm,
  },
  editButtonCompact: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    flex: 1,
  },
  editButtonTextCompact: {
    color: colors.text,
    fontWeight: '600',
    fontSize: fontSizes.sm,
  },
  positionActionsRow: {
    flexDirection: 'row-reverse',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
  },
  resetButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  positionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  positionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  positionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  positionPnlRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  positionLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  positionValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  pnlValue: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  closeButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  closeButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  signalCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  signalButtonsRow: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  signalButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  copySignalButton: {
    backgroundColor: colors.secondary,
  },
  executeSignalButton: {
    backgroundColor: colors.primary,
  },
  signalButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  closedCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallMuted: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalInfo: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  modalInfoText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginBottom: 2,
  },
  modalInputGroup: {
    marginBottom: spacing.md,
  },
  modalLabel: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  modalInput: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    color: colors.text,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.secondary,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
});

export default TradesScreen;
