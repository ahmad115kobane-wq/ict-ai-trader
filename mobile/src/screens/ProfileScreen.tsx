// src/screens/ProfileScreen.tsx
// شاشة الملف الشخصي الكاملة

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/apiService';
import { borderRadius, colors, fontSizes, spacing } from '../theme';
import { useCustomAlert } from '../hooks/useCustomAlert';

interface ProfileData {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  country: string;
  bio: string;
  dateOfBirth: string;
  preferredLanguage: string;
  tradingExperience: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  coins: number;
  subscription: string;
  subscriptionExpiry: string;
}

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const { showConfirm, showError, showSuccess, AlertComponent } = useCustomAlert();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [editLabel, setEditLabel] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Password modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await profileService.getProfile();
      if (result.success) {
        setProfile(result.profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, []);

  const openEditField = (field: string, label: string, currentValue: string) => {
    setEditField(field);
    setEditLabel(label);
    setEditValue(currentValue || '');
    setEditModalVisible(true);
  };

  const saveField = async () => {
    if (!editField) return;

    setIsSaving(true);
    try {
      const data: Record<string, string> = {};
      data[editField] = editValue;

      const result = await profileService.updateProfile(data);
      if (result.success) {
        await loadProfile();
        setEditModalVisible(false);
        showSuccess('تم الحفظ', `تم تحديث ${editLabel} بنجاح`);
      } else {
        showError('خطأ', result.error || 'فشل في الحفظ');
      }
    } catch (error: any) {
      showError('خطأ', error.message || 'فشل في حفظ البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showError('بيانات ناقصة', 'يرجى ملء جميع الحقول');
      return;
    }
    if (newPassword.length < 6) {
      showError('كلمة مرور قصيرة', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('عدم تطابق', 'كلمة المرور الجديدة وتأكيدها غير متطابقتين');
      return;
    }

    setIsSaving(true);
    try {
      const result = await profileService.changePassword(currentPassword, newPassword);
      if (result.success) {
        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showSuccess('تم التغيير', 'تم تغيير كلمة المرور بنجاح');
      } else {
        showError('خطأ', result.error || 'فشل في تغيير كلمة المرور');
      }
    } catch (error: any) {
      showError('خطأ', error.message || 'فشل في تغيير كلمة المرور');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    showConfirm(
      'تسجيل الخروج',
      'هل تريد تسجيل الخروج من الحساب؟',
      async () => {
        try {
          await logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* رأس الملف الشخصي */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={colors.primary} />
            </View>
            {profile?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{profile?.fullName || profile?.email || 'مستخدم'}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          <View style={styles.subscriptionBadge}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={styles.subscriptionText}>
              {profile?.subscription === 'free' ? 'مجاني' : profile?.subscription || 'مجاني'}
            </Text>
          </View>
        </View>

        {/* المعلومات الشخصية */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>المعلومات الشخصية</Text>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditField('fullName', 'الاسم الكامل', profile?.fullName || '')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>{profile?.fullName || 'لم يتم تعيينه'}</Text>
              <Text style={styles.infoLabel}>الاسم الكامل</Text>
            </View>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditField('phone', 'رقم الهاتف', profile?.phone || '')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>{profile?.phone || 'لم يتم تعيينه'}</Text>
              <Text style={styles.infoLabel}>رقم الهاتف</Text>
            </View>
            <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditField('country', 'الدولة', profile?.country || '')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>{profile?.country || 'لم يتم تعيينه'}</Text>
              <Text style={styles.infoLabel}>الدولة</Text>
            </View>
            <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditField('bio', 'النبذة', profile?.bio || '')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue} numberOfLines={2}>
                {profile?.bio || 'لم يتم تعيينه'}
              </Text>
              <Text style={styles.infoLabel}>النبذة</Text>
            </View>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* معلومات الحساب */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات الحساب</Text>

          <View style={styles.infoRow}>
            <View />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>{formatDate(profile?.createdAt)}</Text>
              <Text style={styles.infoLabel}>تاريخ التسجيل</Text>
            </View>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          </View>

          <View style={styles.infoRow}>
            <View />
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>{formatDate(profile?.lastLoginAt)}</Text>
              <Text style={styles.infoLabel}>آخر تسجيل دخول</Text>
            </View>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
          </View>
        </View>

        {/* أزرار الإجراءات */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setPasswordModalVisible(true)}
          >
            <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
            <Text style={styles.actionButtonText}>تغيير كلمة المرور</Text>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>تسجيل الخروج</Text>
            <Ionicons name="chevron-back" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal تعديل الحقل */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تعديل {editLabel}</Text>

            <TextInput
              style={[styles.modalInput, editField === 'bio' && { height: 100, textAlignVertical: 'top' }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`أدخل ${editLabel}`}
              placeholderTextColor={colors.textMuted}
              multiline={editField === 'bio'}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={saveField}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={styles.modalButtonText}>حفظ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal تغيير كلمة المرور */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تغيير كلمة المرور</Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>كلمة المرور الحالية</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="أدخل كلمة المرور الحالية"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>كلمة المرور الجديدة</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="أدخل كلمة المرور الجديدة"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>تأكيد كلمة المرور</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="أعد إدخال كلمة المرور"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.modalButtonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleChangePassword}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={styles.modalButtonText}>تغيير</Text>
                )}
              </TouchableOpacity>
            </View>
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
  content: {
    padding: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  profileName: {
    color: colors.text,
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  profileEmail: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    marginBottom: spacing.sm,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  subscriptionText: {
    color: colors.gold,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoContent: {
    flex: 1,
    marginHorizontal: spacing.sm,
    alignItems: 'flex-end',
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  infoValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '500',
    textAlign: 'right',
  },
  actionsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButtonText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
    textAlign: 'right',
    marginHorizontal: spacing.sm,
  },
  logoutButton: {
    borderBottomWidth: 0,
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
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSizes.md,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.backgroundSecondary,
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

export default ProfileScreen;
