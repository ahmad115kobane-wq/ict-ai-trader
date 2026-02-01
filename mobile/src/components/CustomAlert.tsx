// src/components/CustomAlert.tsx
// مكون Alert مخصص بتصميم داكن متناسق مع التطبيق

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from './CustomModal';
import { colors, spacing, borderRadius, fontSizes } from '../theme';

interface CustomAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: CustomAlertButton[];
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'حسناً', style: 'default' }],
  icon,
  iconColor = colors.primary,
}) => {
  const [isVisible, setIsVisible] = React.useState(visible);

  React.useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const handleButtonPress = (button: CustomAlertButton) => {
    setIsVisible(false);
    if (button.onPress) {
      // تأخير بسيط لإغلاق Modal أولاً
      setTimeout(() => {
        button.onPress!();
      }, 100);
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'cancel':
        return styles.cancelButton;
      case 'destructive':
        return styles.destructiveButton;
      default:
        return styles.defaultButton;
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case 'cancel':
        return styles.cancelButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      default:
        return styles.defaultButtonText;
    }
  };

  return (
    <CustomModal
      visible={isVisible}
      onClose={() => {
        setIsVisible(false);
        const cancelButton = buttons.find(b => b.style === 'cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      }}
      showCloseButton={false}
      size="small"
    >
      <View style={styles.container}>
        {/* Icon */}
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={icon} size={40} color={iconColor} />
          </View>
        )}

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.button, getButtonStyle(button.style)]}
              onPress={() => handleButtonPress(button)}
            >
              <Text style={getButtonTextStyle(button.style)}>
                {button.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </CustomModal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  buttonsContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destructiveButton: {
    backgroundColor: colors.error,
  },
  defaultButtonText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  destructiveButtonText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});

export default CustomAlert;
