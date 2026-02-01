// src/components/CustomModal.tsx
// مكون Modal مخصص بتصميم داكن متناسق مع التطبيق

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSizes } from '../theme';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  footer,
}) => {
  const getMaxHeight = () => {
    switch (size) {
      case 'small': return '40%';
      case 'medium': return '60%';
      case 'large': return '80%';
      case 'full': return '95%';
      default: return '60%';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { maxHeight: getMaxHeight() }]}>
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {showCloseButton && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Scroll Indicator */}
          <View style={styles.scrollIndicator}>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            <Text style={styles.scrollIndicatorText}>مرر للأسفل لمتابعة القراءة</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            {children}
          </ScrollView>

          {/* Footer */}
          {footer && (
            <View style={styles.footer}>
              {footer}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
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
  content: {
    padding: spacing.md,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default CustomModal;
