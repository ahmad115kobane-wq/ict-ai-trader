// src/screens/EconomicCalendarScreen.tsx
// شاشة التقويم الاقتصادي

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, borderRadius, fontSizes } from '../theme';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  countryName: string;
  currency: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  actual?: string;
  hasAnalysis?: boolean;
  analysis?: {
    analysis: string;
    impact: string;
    marketExpectation: string;
    tradingRecommendation: string;
  };
}

type FilterType = 'today' | 'tomorrow' | 'lastWeek' | 'nextWeek';

const EconomicCalendarScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('today');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [analyzingEventId, setAnalyzingEventId] = useState<string | null>(null);
  const [selectedEventAnalysis, setSelectedEventAnalysis] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [filterCounts, setFilterCounts] = useState({
    today: 0,
    tomorrow: 0,
    lastWeek: 0,
    nextWeek: 0
  });

  useEffect(() => {
    loadCalendar();
  }, []);

  useEffect(() => {
    applyFilter(selectedFilter);
    calculateFilterCounts();
  }, [events, selectedFilter]);

  const calculateFilterCounts = () => {
    // إنشاء تاريخ اليوم بدقة (منتصف الليل UTC)
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const todayStr = today.toISOString().split('T')[0];
    
    // غداً
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // الأسبوع السابق: من (اليوم - 7) إلى (اليوم - 1)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
    
    // الأسبوع القادم: من (اليوم + 1) إلى (اليوم + 7)
    const nextWeekEnd = new Date(today);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
    const nextWeekEndStr = nextWeekEnd.toISOString().split('T')[0];
    
    // فقط الأحداث التي لديها بيانات
    const eventsWithData = events.filter(e => e.forecast || e.previous || e.actual);
    
    setFilterCounts({
      today: eventsWithData.filter(e => e.date === todayStr).length,
      tomorrow: eventsWithData.filter(e => e.date === tomorrowStr).length,
      lastWeek: eventsWithData.filter(e => e.date >= lastWeekStartStr && e.date <= yesterdayStr).length,
      nextWeek: eventsWithData.filter(e => e.date >= tomorrowStr && e.date <= nextWeekEndStr).length
    });
  };

  const loadCalendar = async (forceRefresh = false) => {
    try {
      const url = forceRefresh
        ? `${API_BASE_URL}/api/economic-calendar?refresh=true`
        : `${API_BASE_URL}/api/economic-calendar`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
        setLastUpdate(new Date(data.lastUpdate).toLocaleString('ar-EG'));
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendar(true);
  };

  const analyzeEvent = async (event: EconomicEvent) => {
    try {
      setAnalyzingEventId(event.id);
      
      const { getToken } = await import('../services/apiService');
      const token = await getToken();
      
      if (!token) {
        Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
        setAnalyzingEventId(null);
        return;
      }

      // محاولة جلب تحليل موجود
      let response = await fetch(
        `${API_BASE_URL}/api/economic-analysis/event/${event.id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // التحقق من نوع المحتوى
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response:', contentType);
        Alert.alert('خطأ', 'خطأ في الاتصال بالخادم');
        setAnalyzingEventId(null);
        return;
      }
      
      let data = await response.json();
      
      if (data.success && data.analysis) {
        // يوجد تحليل - عرضه مباشرة
        setSelectedEventAnalysis(data.analysis);
        setShowAnalysisModal(true);
        setAnalyzingEventId(null);
      } else {
        // لا يوجد تحليل - إنشاء جديد
        setAnalyzingEventId(null);
        Alert.alert(
          'تحليل الخبر',
          'سيتم تحليل هذا الخبر بواسطة الذكاء الاصطناعي. قد يستغرق بضع ثوانٍ.',
          [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'تحليل',
              onPress: async () => {
                try {
                  setAnalyzingEventId(event.id);
                  
                  response = await fetch(
                    `${API_BASE_URL}/api/economic-analysis/event/${event.id}`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                  
                  // التحقق من نوع المحتوى
                  const contentType = response.headers.get('content-type');
                  if (!contentType || !contentType.includes('application/json')) {
                    console.error('Server returned non-JSON response:', contentType);
                    Alert.alert('خطأ', 'خطأ في الاتصال بالخادم');
                    setAnalyzingEventId(null);
                    return;
                  }
                  
                  data = await response.json();
                  
                  if (data.success) {
                    setSelectedEventAnalysis(data.analysis);
                    setShowAnalysisModal(true);
                  } else {
                    Alert.alert('خطأ', data.error || 'فشل تحليل الحدث');
                  }
                } catch (error) {
                  console.error('Error creating analysis:', error);
                  Alert.alert('خطأ', 'فشل تحليل الحدث');
                } finally {
                  setAnalyzingEventId(null);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error analyzing event:', error);
      Alert.alert('خطأ', 'فشل تحليل الحدث');
    } finally {
      setAnalyzingEventId(null);
    }
  };

  const applyFilter = (filter: FilterType) => {
    // إنشاء تاريخ اليوم بدقة (منتصف الليل UTC)
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('🔍 Current filter:', filter);
    console.log('📅 Today date:', todayStr);
    
    // تصفية الأحداث التي لديها بيانات فقط
    let filtered = events.filter(e => e.forecast || e.previous || e.actual);
    
    console.log(`📊 Events with data: ${filtered.length} out of ${events.length}`);

    // تطبيق الفلتر حسب التاريخ
    if (filter === 'today') {
      // اليوم فقط - تطابق تام
      filtered = filtered.filter(e => e.date === todayStr);
      console.log(`✅ Today events: ${filtered.length}`);
      
    } else if (filter === 'tomorrow') {
      // غداً فقط - اليوم + 1
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      console.log('📅 Tomorrow date:', tomorrowStr);
      filtered = filtered.filter(e => e.date === tomorrowStr);
      console.log(`✅ Tomorrow events: ${filtered.length}`);
      
    } else if (filter === 'lastWeek') {
      // الأسبوع السابق: من (اليوم - 7) إلى (اليوم - 1)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
      
      console.log('📅 Last week range:', lastWeekStartStr, 'to', yesterdayStr);
      filtered = filtered.filter(e => e.date >= lastWeekStartStr && e.date <= yesterdayStr);
      console.log(`✅ Last week events: ${filtered.length}`);
      
    } else if (filter === 'nextWeek') {
      // الأسبوع القادم: من (اليوم + 1) إلى (اليوم + 7)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const nextWeekEnd = new Date(today);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
      const nextWeekEndStr = nextWeekEnd.toISOString().split('T')[0];
      
      console.log('📅 Next week range:', tomorrowStr, 'to', nextWeekEndStr);
      filtered = filtered.filter(e => e.date >= tomorrowStr && e.date <= nextWeekEndStr);
      console.log(`✅ Next week events: ${filtered.length}`);
    }

    // عرض عينة من التواريخ المفلترة
    if (filtered.length > 0) {
      const sampleDates = filtered.slice(0, 3).map(e => `${e.event}: ${e.date}`);
      console.log('📋 Sample filtered events:', sampleDates);
    }

    setFilteredEvents(filtered);
  };

  const getCountryFlag = (country: string): string => {
    const flags: { [key: string]: string } = {
      'US': '🇺🇸',
      'EU': '🇪🇺',
      'GB': '🇬🇧',
      'JP': '🇯🇵',
      'CH': '🇨🇭',
      'CA': '🇨🇦',
      'AU': '🇦🇺',
      'NZ': '🇳🇿',
      'CN': '🇨🇳',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'IT': '🇮🇹',
      'ES': '🇪🇸'
    };
    return flags[country] || '🌍';
  };

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return colors.error;
    if (impact === 'medium') return colors.warning;
    return colors.textMuted;
  };

  const getImpactText = (impact: string) => {
    if (impact === 'high') return 'تأثير عالي 🔴';
    if (impact === 'medium') return 'تأثير متوسط 🟡';
    return 'تأثير منخفض 🟢';
  };

  const formatDate = (dateStr: string): string => {
    // استخدام نفس منطق التاريخ في applyFilter
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const todayStr = today.toISOString().split('T')[0];
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      return 'اليوم';
    } else if (dateStr === tomorrowStr) {
      return 'غداً';
    } else {
      const date = new Date(dateStr + 'T00:00:00Z');
      return date.toLocaleDateString('ar-EG', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const renderEvent = (event: EconomicEvent) => {
    const impactColor = getImpactColor(event.impact);
    
    // تسجيل قوة الخبر للتحقق
    if (!event.impact || (event.impact !== 'high' && event.impact !== 'medium' && event.impact !== 'low')) {
      console.warn('⚠️ Invalid impact for event:', event.event, 'Impact:', event.impact);
    }
    
    // الحصول على الوقت الحالي بتوقيت مكة المكرمة (UTC+3)
    const now = new Date();
    const meccaTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // تحويل وقت الحدث إلى تاريخ كامل (UTC)
    const eventDateTime = new Date(`${event.date}T${event.time}:00Z`);
    
    // تحديد حالة الحدث بدقة
    const hasReleased = event.actual !== undefined && event.actual !== null && event.actual !== '';
    const isPending = !hasReleased && eventDateTime > meccaTime;
    
    // تحديد إذا كان الحدث اليوم أو غداً (لعرض زر التحليل)
    const isTodayOrTomorrow = event.date === todayStr || event.date === tomorrowStr;
    
    // تحويل وقت الحدث إلى توقيت مكة المكرمة
    const eventMeccaTime = new Date(eventDateTime.getTime() + (3 * 60 * 60 * 1000));
    const displayTime = eventMeccaTime.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    });

    return (
      <View key={event.id} style={[styles.eventCard, { borderLeftColor: impactColor }]}>
        {/* Header Section */}
        <View style={styles.eventHeader}>
          <View style={styles.eventHeaderLeft}>
            <Text style={styles.countryFlag}>{getCountryFlag(event.country)}</Text>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} numberOfLines={2}>{event.event}</Text>
              <Text style={styles.countryText}>{event.countryName} • {event.currency}</Text>
            </View>
          </View>
          
          <View style={styles.eventHeaderRight}>
            <Text style={styles.eventTime}>{displayTime}</Text>
            <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={styles.statusRow}>
          <View style={[styles.impactBadge, { backgroundColor: impactColor + '15' }]}>
            <Text style={[styles.impactText, { color: impactColor }]}>
              {getImpactText(event.impact)}
            </Text>
          </View>
          
          {hasReleased && (
            <View style={styles.releasedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.releasedText}>صدر</Text>
            </View>
          )}
          
          {isPending && (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={14} color={colors.warning} />
              <Text style={styles.pendingText}>لم يصدر</Text>
            </View>
          )}
        </View>

        {/* Data Section */}
        {(event.forecast || event.previous || event.actual) && (
          <View style={styles.eventDetails}>
            {event.actual && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>الفعلي</Text>
                <Text style={[styles.detailValue, styles.actualValue]}>
                  {event.actual}
                </Text>
              </View>
            )}
            {event.forecast && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>التوقع</Text>
                <Text style={styles.detailValue}>{event.forecast}</Text>
              </View>
            )}
            {event.previous && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>السابق</Text>
                <Text style={styles.detailValue}>{event.previous}</Text>
              </View>
            )}
          </View>
        )}

        {/* Analysis Button - Only for today and tomorrow unreleased events */}
        {!hasReleased && isTodayOrTomorrow && (
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              analyzingEventId === event.id && styles.analyzeButtonLoading
            ]}
            onPress={() => analyzeEvent(event)}
            disabled={analyzingEventId === event.id}
            activeOpacity={0.7}
          >
            {analyzingEventId === event.id ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.analyzeButtonText}>جاري التحليل...</Text>
              </>
            ) : (
              <>
                <Ionicons name="analytics-outline" size={16} color={colors.primary} />
                <Text style={styles.analyzeButtonText}>تحليل الخبر</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };



  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل التقويم الاقتصادي...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <Header 
        coins={user?.coins || 0}
        onLogout={logout}
        showLogout={true}
      />

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'today' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('today')}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'today' && styles.filterTextActive
              ]}
            >
              اليوم {filterCounts.today > 0 && `(${filterCounts.today})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'tomorrow' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('tomorrow')}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'tomorrow' && styles.filterTextActive
              ]}
            >
              غداً {filterCounts.tomorrow > 0 && `(${filterCounts.tomorrow})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'lastWeek' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('lastWeek')}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'lastWeek' && styles.filterTextActive
              ]}
            >
              الأسبوع السابق {filterCounts.lastWeek > 0 && `(${filterCounts.lastWeek})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'nextWeek' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('nextWeek')}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'nextWeek' && styles.filterTextActive
              ]}
            >
              الأسبوع القادم {filterCounts.nextWeek > 0 && `(${filterCounts.nextWeek})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Last Update */}
      {lastUpdate && (
        <View style={styles.lastUpdateContainer}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.lastUpdateText}>آخر تحديث: {lastUpdate}</Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {selectedFilter === 'today' && 'لا توجد أحداث اليوم'}
              {selectedFilter === 'tomorrow' && 'لا توجد أحداث غداً'}
              {selectedFilter === 'lastWeek' && 'لا توجد أحداث في الأسبوع السابق'}
              {selectedFilter === 'nextWeek' && 'لا توجد أحداث في الأسبوع القادم'}
            </Text>
            <Text style={styles.emptySubText}>
              جرب فلتر آخر أو اسحب للتحديث
            </Text>
          </View>
        ) : (
          <View style={styles.eventsContainer}>
            {filteredEvents.map(renderEvent)}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal التحليل */}
      <Modal
        visible={showAnalysisModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAnalysisModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 تحليل الخبر</Text>
              <TouchableOpacity onPress={() => setShowAnalysisModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Scroll Indicator */}
            <View style={styles.scrollIndicator}>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              <Text style={styles.scrollIndicatorText}>مرر للأسفل لمتابعة القراءة</Text>
            </View>
            
            {/* Content */}
            <ScrollView style={styles.modalBody}>
              {selectedEventAnalysis && (
                <>
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>📊 التحليل</Text>
                    <Text style={styles.analysisText}>
                      {selectedEventAnalysis.analysis}
                    </Text>
                  </View>
                  
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>🎯 التأثير المتوقع</Text>
                    <Text style={styles.analysisText}>
                      {selectedEventAnalysis.impact}
                    </Text>
                  </View>
                  
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>� توقعات السوق</Text>
                    <Text style={styles.analysisText}>
                      {selectedEventAnalysis.marketExpectation}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
            
            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowAnalysisModal(false)}
              >
                <Text style={styles.modalButtonText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.primary,
  },
  lastUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  lastUpdateText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  content: {
    flex: 1,
  },
  eventsContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  eventCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  eventHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  countryFlag: {
    fontSize: 28,
    marginTop: 2,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  countryText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  eventHeaderRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  eventTime: {
    color: colors.primary,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginBottom: 2,
  },
  eventDate: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  impactBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  impactText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  releasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  releasedText: {
    color: colors.success,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  pendingText: {
    color: colors.warning,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  eventDetails: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginBottom: 4,
  },
  detailValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  actualValue: {
    color: colors.success,
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  analyzeButtonLoading: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  analyzeButtonText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
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
  },
  emptySubText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: spacing.xs,
  },
  bottomSpacer: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  scrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
  },
  scrollIndicatorText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  modalBody: {
    padding: spacing.md,
  },
  analysisSection: {
    marginBottom: spacing.md,
  },
  analysisSectionTitle: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  analysisText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  modalFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});

export default EconomicCalendarScreen;
