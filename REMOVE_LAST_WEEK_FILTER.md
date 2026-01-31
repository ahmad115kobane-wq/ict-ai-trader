# إزالة فلتر "الأسبوع السابق"

## التغييرات المطبقة

### 1. إزالة FilterType ✅
```typescript
// قبل:
type FilterType = 'today' | 'tomorrow' | 'lastWeek' | 'nextWeek';

// بعد:
type FilterType = 'today' | 'tomorrow' | 'nextWeek';
```

### 2. إزالة من filterCounts ✅
```typescript
// قبل:
const [filterCounts, setFilterCounts] = useState({
  today: 0,
  tomorrow: 0,
  lastWeek: 0,
  nextWeek: 0
});

// بعد:
const [filterCounts, setFilterCounts] = useState({
  today: 0,
  tomorrow: 0,
  nextWeek: 0
});
```

### 3. إزالة من calculateFilterCounts() ✅
- إزالة حساب lastWeek
- إزالة yesterday و lastWeekStart

### 4. إزالة من applyFilter() ✅
- إزالة case 'lastWeek'
- إزالة منطق تصفية الأسبوع السابق

### 5. إزالة زر الفلتر من الواجهة ✅
- إزالة TouchableOpacity للأسبوع السابق
- الآن فقط 3 أزرار: اليوم، غداً، الأسبوع القادم

### 6. إزالة رسالة Empty State ✅
```typescript
// إزالة:
{selectedFilter === 'lastWeek' && 'لا توجد أحداث في الأسبوع السابق'}
```

## النتيجة

✅ فلتر "الأسبوع السابق" تم إزالته بالكامل
✅ الفلاتر المتبقية: اليوم، غداً، الأسبوع القادم
✅ الواجهة أبسط وأوضح
✅ التركيز على الأحداث القادمة فقط

## الملفات المعدلة

- `mobile/src/screens/EconomicCalendarScreen.tsx`
  - إزالة lastWeek من جميع الأماكن
  - تحديث الواجهة
  - تحديث المنطق
