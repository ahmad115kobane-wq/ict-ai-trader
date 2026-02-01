// src/hooks/useCustomAlert.tsx
// Hook لاستخدام CustomAlert بسهولة

import React, { useState, useCallback } from 'react';
import CustomAlert from '../components/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message: string;
  buttons?: AlertButton[];
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertConfig(options);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setAlertConfig(null);
    }, 300);
  }, []);

  // دوال مساعدة سريعة
  const showSuccess = useCallback((title: string, message: string, onPress?: () => void) => {
    showAlert({
      title,
      message,
      icon: 'checkmark-circle',
      iconColor: colors.success,
      buttons: [{ text: 'حسناً', onPress, style: 'default' }],
    });
  }, [showAlert]);

  const showError = useCallback((title: string, message: string, onPress?: () => void) => {
    showAlert({
      title,
      message,
      icon: 'close-circle',
      iconColor: colors.error,
      buttons: [{ text: 'حسناً', onPress, style: 'default' }],
    });
  }, [showAlert]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showAlert({
      title,
      message,
      icon: 'help-circle',
      iconColor: colors.warning,
      buttons: [
        { text: 'إلغاء', onPress: onCancel, style: 'cancel' },
        { text: 'تأكيد', onPress: onConfirm, style: 'default' },
      ],
    });
  }, [showAlert]);

  const AlertComponent = useCallback(() => {
    if (!alertConfig) return null;

    return (
      <CustomAlert
        visible={visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
      />
    );
  }, [alertConfig, visible]);

  return {
    showAlert,
    showSuccess,
    showError,
    showConfirm,
    hideAlert,
    AlertComponent,
  };
};
