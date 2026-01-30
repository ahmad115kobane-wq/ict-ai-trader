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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, borderRadius, fontSizes } from '../theme';
import { API_BASE_URL } from '../config/api';

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
}

type FilterType = 'all' | 'high' | 'today' | 'upcoming';

const EconomicCalendarScreen = () => {
  const navigation = useNavigation();
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    loadCalendar();
  }, []);

  useEffect(() => {
    applyFilter(selectedFilter);
  }, [events, selectedFilter]);

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

  const applyFilter = (filter: FilterType) => {
    let filtered = events;

    if (filter === 'high') {
      filtered = events.filter(e => e.impact === 'high');
    } else if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = events.filter(e => e.date === today);
    } else if (filter === 'upcoming') {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      filtered = events.filter(e => {
        const eventTime = new Date(`${e.date}T${e.time}`);
        return eventTime >= now && eventTime <= tomorrow;
      });
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
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'اليوم';
    } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return 'غداً';
    } else {
      return date.toLocaleDateString('ar-EG', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const renderEvent = (event: EconomicEvent) => {
    const impactColor = getImpactColor(event.impact);
    const now = new Date();
    const eventTime = new Date(`${event.date}T${event.time}`);
    const hasReleased = event.actual || eventTime < now;
    const isPending = !event.actual && eventTime > now;

    return (
      <View key={event.id} style={[styles.eventCard, { borderRightColor: impactColor }]}>
        <View style={styles.eventHeader}>
          <View style={styles.eventLeft}>
            <View style={styles.eventTitleRow}>
              <Text style={styles.eventTitle}>{event.event}</Text>
              {hasReleased && (
                <View style={styles.releasedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.releasedText}>صدر</Text>
                </View>
              )}
              {isPending && (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time-outline" size={16} color={colors.warning} />
                  <Text style={styles.pendingText}>لم يصدر بعد</Text>
                </View>
              )}
            </View>
            <View style={styles.eventCountry}>
              <Text style={styles.countryFlag}>{getCountryFlag(event.country)}</Text>
              <Text style={styles.countryText}>
                {event.countryName} ({event.currency})
              </Text>
            </View>
            <View style={[styles.impactBadge, { backgroundColor: impactColor + '20' }]}>
              <Text style={[styles.impactText, { color: impactColor }]}>
                {getImpactText(event.impact)}
              </Text>
            </View>
          </View>
          <View style={styles.eventRight}>
            <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
            <Text style={styles.eventTime}>{event.time}</Text>
          </View>
        </View>

        {(event.forecast || event.previous || event.actual) && (
          <View style={styles.eventDetails}>
            {event.actual && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>النتيجة الفعلية</Text>
                <Text style={[styles.detailValue, { color: colors.success, fontSize: fontSizes.lg, fontWeight: '700' }]}>
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
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>التقويم الاقتصادي</Text>
          <Text style={styles.headerSubtitle}>الأحداث المؤثرة على الأسواق</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => onRefresh()}
        >
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'all' && styles.filterTextActive
              ]}
            >
              الكل
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'high' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('high')}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'high' && styles.filterTextActive
              ]}
            >
              تأثير عالي 🔴
            </Text>
          </TouchableOpacity>

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
              اليوم
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'upcoming' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('upcoming')}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'upcoming' && styles.filterTextActive
              ]}
            >
              القادمة (24 ساعة)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Last Update */}
      {lastUpdate && (
        <View style={styles.lastUpdateContainer}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.lastUpdateText}>آخر تحديث: {lastUpdate}</Text>
        </View>
      )}

      {/* Events List */}
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
            <Text style={styles.emptyText}>لا توجد أحداث متاحة</Text>
          </View>
        ) : (
          <View style={styles.eventsContainer}>
            {filteredEvents.map(renderEvent)}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filters: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
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
    borderRightWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventLeft: {
    flex: 1,
  },
  eventRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  eventTitle: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  releasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
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
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  pendingText: {
    color: colors.warning,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  eventCountry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  impactBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  impactText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  eventDate: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginBottom: 4,
  },
  eventTime: {
    color: colors.primary,
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  eventDetails: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
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
  bottomSpacer: {
    height: 100,
  },
});

export default EconomicCalendarScreen;
