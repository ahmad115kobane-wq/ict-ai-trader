// src/theme/index.ts
// نظام الألوان والتصميم للتطبيق - داكن مثل الصور

export const colors = {
  // الألوان الأساسية
  primary: '#10b981', // أخضر
  primaryDark: '#059669',
  secondary: '#10b981', // أخضر
  secondaryDark: '#059669',
  
  // ألوان الخلفية
  background: '#0d1117', // خلفية داكنة
  backgroundSecondary: '#161b22', // خلفية ثانوية
  card: '#1a1f26', // خلفية البطاقات
  cardBorder: '#2d3748',
  
  // ألوان النصوص
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  
  // ألوان الحالة
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // ألوان التداول
  buy: '#10b981', // أخضر للشراء
  sell: '#ef4444', // أحمر للبيع
  profit: '#10b981',
  loss: '#ef4444',
  
  // ألوان إضافية
  gold: '#fbbf24',
  vip: '#fbbf24',
  border: '#374151',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

// أنماط عامة
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSizes.md,
    textAlign: 'right' as const,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.xxl,
    fontWeight: 'bold' as const,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  center: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  fontSizes,
  shadows,
  commonStyles,
};
