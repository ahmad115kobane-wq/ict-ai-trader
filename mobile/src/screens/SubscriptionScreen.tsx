// src/screens/SubscriptionScreen.tsx
// شاشة الاشتراكات وإدارة الحساب

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { subscriptionService } from '../services/apiService';
import { colors, spacing, borderRadius, fontSizes } from '../theme';
import { Package } from '../types';
import Header from '../components/Header';
import { useCustomAlert } from '../hooks/useCustomAlert';

const SubscriptionScreen = () => {
  const { user, logout, refreshUser } = useAuth();
  const { showAlert, showSuccess, showError, showConfirm, AlertComponent } = useCustomAlert();
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);
  const hasActiveSubscription = Boolean(user?.subscriptionStatus?.hasActiveSubscription);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [packagesData] = await Promise.all([
        subscriptionService.getPackages(),
        refreshUser(),
      ]);
      if (packagesData.success) {
        setPackages(packagesData.packages);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const handlePurchase = async (packageId: string, coinPrice: number) => {
    const userCoins = user?.coins || 0;
    
    // التحقق من الرصيد قبل الشراء
    if (userCoins < coinPrice) {
      showError(
        'رصيد غير كافٍ',
        `تحتاج إلى ${coinPrice} عملة لشراء هذه الباقة.\nرصيدك الحالي: ${userCoins} عملة\nينقصك: ${coinPrice - userCoins} عملة`
      );
      return;
    }
    
    showConfirm(
      'تأكيد الشراء',
      `هل تريد شراء هذه الباقة مقابل ${coinPrice} عملة؟\n\nرصيدك الحالي: ${userCoins} عملة\nرصيدك بعد الشراء: ${userCoins - coinPrice} عملة`,
      async () => {
        setPurchasingPackage(packageId);
        try {
          const result = await subscriptionService.purchase(packageId);
          if (result.success) {
            showSuccess('نجاح', result.message || 'تم شراء الباقة بنجاح');
            await refreshUser();
          }
        } catch (error: any) {
          showError('خطأ', error.response?.data?.error || 'فشل في شراء الباقة');
        } finally {
          setPurchasingPackage(null);
        }
      }
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getSubscriptionName = () => {
    const activeName = user?.subscriptionStatus?.subscription?.packageNameAr;
    if (activeName) {
      return activeName;
    }

    if (user?.subscriptionStatus?.hasActiveSubscription) {
      return 'اشتراك مفعّل';
    }

    switch (user?.subscription) {
      case 'premium':
        return 'الحزمة المميزة';
      case 'pro':
        return 'الحزمة الاحترافية';
      case 'weekly':
        return 'الحزمة الاسبوعية';
      default:
        return 'الحزمة المجانية';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <Header 
        coins={user?.coins || 0} 
        onLogout={() => {
          Alert.alert(
            'تسجيل الخروج',
            'هل أنت متأكد من تسجيل الخروج؟',
            logout
          );
        }}
      />

      <AlertComponent />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Account Info Card */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>حسابك</Text>
              <Text style={styles.emailText}>{user?.email}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.accountBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                  <Text style={styles.accountBadgeText}>{getSubscriptionName()}</Text>
                </View>
                <View style={styles.expiryBadge}>
                  <Ionicons name="calendar" size={12} color={colors.textSecondary} />
                  <Text style={styles.expiryBadgeText}>
                    تاريخ الانتهاء: {formatDate(user?.subscriptionExpiry || user?.subscriptionStatus?.subscription?.expiresAt)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الباقات المتاحة</Text>
        </View>

        {/* Packages */}
        {packages.map((pkg, index) => {
          const coinPrice = Math.round(pkg.price * 1); // 1 دولار = 1 عملة
          
          return (
            <View key={pkg.id} style={[styles.packageCard, index === 0 && styles.packageCardFeatured]}>
              {index === 0 && (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.featuredBadgeText}>الأكثر شعبية</Text>
                </View>
              )}
              
              <View style={styles.packageHeader}>
                <View style={styles.packageIconContainer}>
                  <Ionicons name="diamond" size={24} color={index === 0 ? colors.gold : colors.primary} />
                </View>
                <View style={styles.packageInfo}>
                  <Text style={styles.packageName}>{pkg.nameAr}</Text>
                  <Text style={styles.packageDuration}>
                    {pkg.durationDays === 7 ? 'أسبوع واحد' : pkg.durationDays === 30 ? 'شهر واحد' : `${pkg.durationDays} يوم`}
                  </Text>
                </View>
                <View style={styles.priceContainer}>
                  <View style={styles.coinPriceRow}>
                    <Ionicons name="diamond" size={16} color={colors.gold} />
                    <Text style={styles.packagePrice}>{coinPrice}</Text>
                  </View>
                  <Text style={styles.dollarPrice}>(${pkg.price})</Text>
                </View>
              </View>
              
              <View style={styles.packageFeatures}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.featureText}>{pkg.coinsIncluded} عملة إضافية</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.featureText}>تحليلات متقدمة</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.featureText}>دعم فني على مدار الساعة</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[styles.purchaseButton, index === 0 && styles.purchaseButtonFeatured]}
                onPress={() => handlePurchase(pkg.id, coinPrice)}
                disabled={purchasingPackage === pkg.id}
              >
                {purchasingPackage === pkg.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.purchaseButtonText}>اشترك الآن</Text>
                    <Ionicons name="arrow-back" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  accountCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  accountHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
    marginRight: spacing.md,
    alignItems: 'flex-end',
  },
  badgeRow: {
    marginTop: 4,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  accountBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '18',
    borderWidth: 1,
    borderColor: colors.primary + '35',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  accountBadgeText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  expiryBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  expiryBadgeText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  accountName: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    marginBottom: 2,
    textAlign: 'right',
  },
  emailText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
    textAlign: 'right',
  },
  sectionHeader: {
    marginVertical: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  packageCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  packageCardFeatured: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: -10,
    left: spacing.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  packageHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  packageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageInfo: {
    flex: 1,
    marginRight: spacing.md,
    alignItems: 'flex-end',
  },
  packageName: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  packageDuration: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    textAlign: 'right',
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  coinPriceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  packagePrice: {
    color: colors.primary,
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
  },
  dollarPrice: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  packageFeatures: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    textAlign: 'right',
  },
  purchaseButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  purchaseButtonFeatured: {
    backgroundColor: colors.primary,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default SubscriptionScreen;
