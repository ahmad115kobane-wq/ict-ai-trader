// src/screens/MT5Screen.tsx
// شاشة إدارة حسابات MT5 - اتصال، حالة، قطع

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { mt5Service } from '../services/apiService';
import { colors, spacing, borderRadius, fontSizes } from '../theme';
import Header from '../components/Header';
import { useCustomAlert } from '../hooks/useCustomAlert';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'stopped';

interface MT5Account {
  status: ConnectionStatus;
  errorMessage: string | null;
  accountLogin: string;
  brokerServer: string;
  uptime: number | null;
}

const MT5Screen = () => {
  const { user } = useAuth();
  const { showError, showSuccess, showConfirm, AlertComponent } = useCustomAlert();

  const [brokerServer, setBrokerServer] = useState('');
  const [accountLogin, setAccountLogin] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<MT5Account | null>(null);

  const handleConnect = async () => {
    if (!brokerServer.trim()) {
      showError('خطأ', 'يرجى إدخال اسم سيرفر الوسيط');
      return;
    }
    if (!accountLogin.trim()) {
      showError('خطأ', 'يرجى إدخال رقم الحساب (Login)');
      return;
    }
    if (!accountPassword) {
      showError('خطأ', 'يرجى إدخال كلمة المرور');
      return;
    }

    setIsConnecting(true);
    try {
      const result = await mt5Service.connect({
        brokerServer: brokerServer.trim(),
        accountLogin: accountLogin.trim(),
        accountPassword,
      });

      if (result.success) {
        setConnectedAccount(result.data);
        showSuccess('تم الاتصال', result.message || 'تم الاتصال بالحساب بنجاح');
        setAccountPassword('');
      } else {
        const errData = result.data;
        if (errData) {
          setConnectedAccount({ ...errData, status: 'error' });
        }
        showError('فشل الاتصال', result.message || 'تعذر الاتصال بالحساب');
      }
    } catch (error: any) {
      showError('خطأ', error.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (!connectedAccount) return;
    showConfirm(
      'قطع الاتصال',
      `هل تريد قطع الاتصال بحساب ${connectedAccount.accountLogin}؟`,
      async () => {
        try {
          await mt5Service.disconnect(connectedAccount.accountLogin);
          setConnectedAccount(null);
          showSuccess('تم', 'تم قطع الاتصال بنجاح');
        } catch (error: any) {
          showError('خطأ', error.message);
        }
      }
    );
  };

  const handleRefreshStatus = async () => {
    if (!connectedAccount) return;
    setRefreshing(true);
    try {
      const result = await mt5Service.getStatus(connectedAccount.accountLogin);
      if (result.success) {
        setConnectedAccount(result.data);
      }
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  const formatUptime = (seconds: number | null): string => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} ساعة ${m} دقيقة`;
    return `${m} دقيقة`;
  };

  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected': return '#10b981';
      case 'connecting': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return colors.textMuted;
    }
  };

  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected': return 'متصل';
      case 'connecting': return 'جاري الاتصال...';
      case 'error': return 'خطأ';
      case 'stopped': return 'متوقف';
      default: return 'غير متصل';
    }
  };

  const renderStatusCard = () => {
    if (!connectedAccount) return null;
    const statusColor = getStatusColor(connectedAccount.status);

    return (
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusText(connectedAccount.status)}
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleRefreshStatus} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statusDetails}>
          <View style={styles.statusRow}>
            <Text style={styles.statusValue}>{connectedAccount.accountLogin}</Text>
            <Text style={styles.statusLabel}>رقم الحساب</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusValue}>{connectedAccount.brokerServer}</Text>
            <Text style={styles.statusLabel}>السيرفر</Text>
          </View>
          {connectedAccount.uptime !== null && (
            <View style={styles.statusRow}>
              <Text style={styles.statusValue}>{formatUptime(connectedAccount.uptime)}</Text>
              <Text style={styles.statusLabel}>مدة الاتصال</Text>
            </View>
          )}
          {connectedAccount.errorMessage && (
            <View style={[styles.errorBanner]}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorBannerText}>{connectedAccount.errorMessage}</Text>
            </View>
          )}
        </View>

        {connectedAccount.status === 'connected' && (
          <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
            <Ionicons name="power" size={18} color="#ef4444" />
            <Text style={styles.disconnectBtnText}>قطع الاتصال</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Header coins={user?.coins || 0} showLogout={false} />
      <AlertComponent />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefreshStatus}
              tintColor={colors.primary} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* العنوان */}
          <View style={styles.titleSection}>
            <View style={styles.titleIcon}>
              <Ionicons name="desktop" size={28} color="#10b981" />
            </View>
            <Text style={styles.title}>MetaTrader 5</Text>
            <Text style={styles.subtitle}>اتصل بحسابك التداولي وشغّل الروبوتات</Text>
          </View>

          {/* بطاقة الحالة */}
          {renderStatusCard()}

          {/* نموذج الاتصال */}
          {(!connectedAccount || connectedAccount.status === 'error' || connectedAccount.status === 'disconnected' || connectedAccount.status === 'stopped') && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>بيانات الحساب</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>سيرفر الوسيط</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={brokerServer}
                    onChangeText={setBrokerServer}
                    placeholder="مثال: ICMarkets-Demo03"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Ionicons name="server-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                </View>
                <Text style={styles.inputHint}>اسم السيرفر كما يظهر في MT5</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>رقم الحساب (Login)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={accountLogin}
                    onChangeText={setAccountLogin}
                    placeholder="مثال: 12345678"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>كلمة المرور</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 44 }]}
                    value={accountPassword}
                    onChangeText={setAccountPassword}
                    placeholder="كلمة مرور الحساب"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.connectBtn, isConnecting && styles.connectBtnDisabled]}
                onPress={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="flash" size={20} color="#fff" />
                )}
                <Text style={styles.connectBtnText}>
                  {isConnecting ? 'جاري الاتصال...' : 'اتصال بالحساب'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* معلومات */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              يتم تشغيل نسخة MT5 خاصة بك على السيرفر. يمكنك تحميل روبوتات (Expert Advisors) وتشغيلها على حسابك.
              كلمة المرور مشفرة ولا يتم تخزينها بشكل نصي.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  titleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    marginTop: 4,
    textAlign: 'center',
  },
  // Status Card
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDetails: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  statusValue: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: fontSizes.sm,
    flex: 1,
    textAlign: 'right',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  disconnectBtnText: {
    color: '#ef4444',
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  // Form Card
  formCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    paddingRight: 44,
    color: colors.text,
    fontSize: fontSizes.md,
    textAlign: 'right',
  },
  inputIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  inputHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'right',
    marginTop: 4,
  },
  eyeBtn: {
    position: 'absolute',
    left: 14,
    top: 14,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  connectBtnDisabled: {
    opacity: 0.6,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: {
    color: '#93c5fd',
    fontSize: fontSizes.sm,
    flex: 1,
    textAlign: 'right',
    lineHeight: 22,
  },
});

export default MT5Screen;
