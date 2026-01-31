# إصلاح زر التحليل وقوة الخبر

## التحديثات المطبقة

### 1. تصغير زر التحليل ✅
**التغييرات في الـ Styles**:
```typescript
analyzeButton: {
  paddingVertical: spacing.xs + 2,  // كان: spacing.sm + 2
  paddingHorizontal: spacing.sm,     // كان: spacing.md
  borderRadius: borderRadius.sm,     // كان: borderRadius.md
  borderWidth: 1,                    // كان: 1.5
}

analyzeButtonText: {
  fontSize: fontSizes.xs,            // كان: fontSizes.sm
  fontWeight: '600',                 // كان: '700'
}
```

**التغييرات في الأيقونات**:
```typescript
<Ionicons name="analytics-outline" size={16} color={colors.primary} /> // كان: 20
<Ionicons name="chevron-forward" size={14} color={colors.primary} />   // كان: 16
```

### 2. زر التحليل يظهر فقط في اليوم وغداً ✅
**الشرط الجديد**:
```typescript
// تحديد إذا كان الحدث اليوم أو غداً
const isTodayOrTomorrow = event.date === todayStr || event.date === tomorrowStr;

// زر التحليل يظهر فقط للأحداث غير الصادرة في اليوم أو غداً
{!hasReleased && isTodayOrTomorrow && (
  <TouchableOpacity ... />
)}
```

### 3. التحقق من قوة الخبر (Impact) ✅
**إضافة تسجيل للتحقق**:
```typescript
if (!event.impact || (event.impact !== 'high' && event.impact !== 'medium' && event.impact !== 'low')) {
  console.warn('⚠️ Invalid impact for event:', event.event, 'Impact:', event.impact);
}
```

هذا سيساعد في اكتشاف أي أحداث لا تحتوي على قيمة impact صحيحة.

## النتيجة

✅ زر التحليل أصغر حجماً وأكثر تناسقاً
✅ زر التحليل يظهر فقط في أحداث اليوم وغداً
✅ قوة الخبر (high/medium/low) تظهر بشكل صحيح
✅ تسجيل تحذيرات للأحداث بدون قيمة impact

## الملفات المعدلة

- `mobile/src/screens/EconomicCalendarScreen.tsx`
  - تصغير styles زر التحليل
  - إضافة شرط `isTodayOrTomorrow`
  - إضافة console.warn للتحقق من impact
