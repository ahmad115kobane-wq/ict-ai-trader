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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { subscriptionService, referralService } from '../services/apiService';
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

  // Referral code state per package
  const [referralCodes, setReferralCodes] = useState<Record<string, string>>({});
  const [referralDiscounts, setReferralDiscounts] = useState<Record<string, any>>({});
  const [validatingCode, setValidatingCode] = useState<string | null>(null);

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

  const handleValidateCode = async (packageId: string) => {
    const code = referralCodes[packageId]?.trim();
    if (!code) return;

    setValidatingCode(packageId);
    try {
      const result = await referralService.validateCode(code, packageId);
      if (result.success) {
        setReferralDiscounts(prev => ({
          ...prev,
          [packageId]: result.discount,
        }));
        showSuccess('كود صالح', result.message || 'تم تطبيق الخصم بنجاح');
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'كود الدعوة غير صالح';
      showError('كود غير صالح', errMsg);
      setReferralDiscounts(prev => {
        const copy = { ...prev };
        delete copy[packageId];
        return copy;
      });
    } finally {
      setValidatingCode(null);
    }
  };

  const clearReferralCode = (packageId: string) => {
    setReferralCodes(prev => ({ ...prev, [packageId]: '' }));
    setReferralDiscounts(prev => {
      const copy = { ...prev };
      delete copy[packageId];
      return copy;
    });
  };

  const handlePurchase = async (packageId: string, coinPrice: number) => {
    const discount = referralDiscounts[packageId];
    const finalPrice = discount ? Math.round(discount.finalPrice) : coinPrice;
    const userCoins = user?.coins || 0;
    const code = referralCodes[packageId]?.trim();
    
    if (userCoins < finalPrice) {
      showError(
        'رصيد غير كافٍ',
        `تحتاج إلى ${finalPrice} عملة لشراء هذه الباقة.\nرصيدك الحالي: ${userCoins} عملة\nينقصك: ${finalPrice - userCoins} عملة`
      );
      return;
    }

    const discountMsg = discount 
      ? `\n🎫 خصم كود الدعوة: ${discount.amount} عملة`
      : '';
    
    showConfirm(
      'تأكيد الشراء',
      `هل تريد شراء هذه الباقة مقابل ${finalPrice} عملة؟${discountMsg}\n\nرصيدك الحالي: ${userCoins} عملة\nرصيدك بعد الشراء: ${userCoins - finalPrice} عملة`,
      async () => {
        setPurchasingPackage(packageId);
        try {
          const result = await subscriptionService.purchase(packageId, discount ? code : undefined);
          if (result.success) {
            showSuccess('نجاح', result.message || 'تم شراء الباقة بنجاح');
            clearReferralCode(packageId);
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
          showConfirm(
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
          const coinPrice = Math.round(pkg.price * 1);
          const discount = referralDiscounts[pkg.id];
          const finalPrice = discount ? Math.round(discount.finalPrice) : coinPrice;
          const codeValue = referralCodes[pkg.id] || '';
          
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
                  {discount ? (
                    <>
                      <Text style={styles.originalPrice}>{coinPrice}</Text>
                      <View style={styles.coinPriceRow}>
                        <Ionicons name="diamond" size={16} color={colors.gold} />
                        <Text style={[styles.packagePrice, { color: colors.success }]}>{finalPrice}</Text>
                      </View>
                      <Text style={styles.discountBadgeText}>-{discount.percent}%</Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.coinPriceRow}>
                        <Ionicons name="diamond" size={16} color={colors.gold} />
                        <Text style={styles.packagePrice}>{coinPrice}</Text>
                      </View>
                      <Text style={styles.dollarPrice}>(${pkg.price})</Text>
                    </>
                  )}
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

              {/* Referral Code Input */}
              <View style={styles.referralSection}>
                <View style={styles.referralHeader}>
                  <Ionicons name="gift-outline" size={16} color={colors.gold} />
                  <Text style={styles.referralLabel}>كود الدعوة (خصم 15%)</Text>
                </View>
                <View style={styles.referralInputRow}>
                  <TextInput
                    style={styles.referralInput}
                    value={codeValue}
                    onChangeText={(text) => {
                      setReferralCodes(prev => ({ ...prev, [pkg.id]: text.toUpperCase() }));
                      if (discount) clearReferralCode(pkg.id);
                    }}
                    placeholder="أدخل كود الدعوة هنا"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    editable={!discount}
                  />
                  {discount ? (
                    <TouchableOpacity
                      style={styles.referralClearBtn}
                      onPress={() => clearReferralCode(pkg.id)}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.referralApplyBtn, !codeValue && styles.referralApplyBtnDisabled]}
                      onPress={() => handleValidateCode(pkg.id)}
                      disabled={!codeValue || validatingCode === pkg.id}
                    >
                      {validatingCode === pkg.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.referralApplyText}>تطبيق</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                {discount && (
                  <View style={styles.discountApplied}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.discountAppliedText}>
                      تم تطبيق خصم {discount.percent}% — وفّرت {discount.amount} عملة!
                    </Text>
                  </View>
                )}
                {!discount && (
                  <Text style={styles.referralHint}>
                    أدخل كود دعوة صديقك واحصل على خصم 15% من سعر الباقة
                  </Text>
                )}
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
                    <Text style={styles.purchaseButtonText}>
                      {discount ? `اشترك الآن بـ ${finalPrice} عملة` : 'اشترك الآن'}
                    </Text>
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
  originalPrice: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    textDecorationLine: 'line-through',
    textAlign: 'center',
  },
  discountBadgeText: {
    color: colors.success,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    backgroundColor: colors.success + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    textAlign: 'center',
    marginTop: 2,
  },
  referralSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  referralHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  referralLabel: {
    color: colors.gold,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  referralInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
  },
  referralInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: fontSizes.md,
    textAlign: 'right',
  },
  referralApplyBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralApplyBtnDisabled: {
    backgroundColor: colors.border,
  },
  referralApplyText: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  referralClearBtn: {
    padding: spacing.xs,
  },
  discountApplied: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  discountAppliedText: {
    color: colors.success,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  referralHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
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
