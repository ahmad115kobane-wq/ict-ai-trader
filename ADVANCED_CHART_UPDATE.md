# تحديث الرسم البياني المتقدم - Advanced Chart Update

## ✅ التحديثات المنفذة

### 1. إضافة السبريد (Spread)

#### عرض السبريد في الرسم البياني
- ✅ سبريد ثابت: 0.50 نقطة
- ✅ عرض سعر BID (سعر البيع)
- ✅ عرض سعر ASK (سعر الشراء)
- ✅ خطوط متقطعة للسبريد على الرسم البياني
- ✅ تحديث مباشر كل 2 ثانية

#### الحسابات
```
BID = السعر الحالي - (السبريد / 2)
ASK = السعر الحالي + (السبريد / 2)

مثال:
السعر الحالي = 2650.00
BID = 2649.75
ASK = 2650.25
```

### 2. عرض الصفقات على الرسم البياني

#### خطوط الصفقات
- ✅ خط الدخول (Entry): خط سميك بلون أخضر للشراء / أحمر للبيع
- ✅ خط وقف الخسارة (SL): خط متقطع أحمر
- ✅ خط جني الأرباح (TP): خط متقطع أخضر
- ✅ عرض معلومات الصفقة على الخط (نوع الصفقة + حجم اللوت)

#### علامات الربح/الخسارة
- ✅ عرض الربح/الخسارة العائم لكل صفقة
- ✅ تحديث مباشر للأرباح/الخسائر
- ✅ ألوان ديناميكية (أخضر للربح / أحمر للخسارة)
- ✅ حجم صغير لا يعيق الرؤية

#### مثال العرض
```
BUY 0.10 | +15.50$  (صفقة رابحة)
SELL 0.20 | -8.30$  (صفقة خاسرة)
```

### 3. تعديل الصفقات من الرسم البياني

#### الميزات المخططة (للتطوير المستقبلي)
- 🔄 السحب لتعديل SL/TP
- 🔄 الضغط على الصفقة لفتح نافذة التعديل
- 🔄 تعديل مباشر من الرسم البياني

#### الحالة الحالية
- ✅ الضغط على علامة الصفقة يرسل إشارة للتطبيق
- ✅ البنية التحتية جاهزة للتطوير

### 4. المكون الجديد: AdvancedChart

#### الملف
```
mobile/src/components/AdvancedChart.tsx
```

#### الخصائص (Props)
```typescript
interface AdvancedChartProps {
  timeframe: '5m' | '1h';
  currentPrice: number;
  positions: Position[];
  onPositionUpdate?: (positionId: string, stopLoss: number, takeProfit: number) => void;
}
```

#### الاستخدام
```typescript
import AdvancedChart from '../components/AdvancedChart';

<AdvancedChart
  timeframe={selectedTimeframe}
  currentPrice={currentPrice}
  positions={openPositionsWithPnl}
  onPositionUpdate={handlePositionUpdate}
/>
```

## 📊 التحديثات المرفوعة

### معلومات التحديث
```
Branch:             production
Runtime version:    1.0.0
Platform:           Android, iOS
Update group ID:    b82d6c03-2805-44f1-afe1-60adcb2ce40d
Message:            إضافة السبريد والصفقات في الرسم البياني
```

### رابط لوحة التحكم
```
https://expo.dev/accounts/mustafa750/projects/ict-ai-trader/updates/b82d6c03-2805-44f1-afe1-60adcb2ce40d
```

## 🎯 الخطوات التالية

### للمستخدمين
1. أغلق التطبيق تماماً
2. افتحه مرة أخرى
3. سيتم تحميل التحديث تلقائياً
4. ستظهر الميزات الجديدة فوراً

### للمطورين - التطوير المستقبلي

#### 1. تفعيل تعديل الصفقات بالسحب
```typescript
// إضافة event listeners للسحب
candlestickSeries.subscribeCrosshairMove((param) => {
  // تتبع موضع المؤشر
  // السماح بسحب خطوط SL/TP
});
```

#### 2. نافذة تعديل الصفقة
```typescript
// عند الضغط على الصفقة
const handleEditPosition = (positionId: string) => {
  showModal({
    title: 'تعديل الصفقة',
    inputs: ['stopLoss', 'takeProfit'],
    onSave: (values) => updatePosition(positionId, values)
  });
};
```

#### 3. تحسينات إضافية
- إضافة أوامر معلقة (Pending Orders)
- عرض تاريخ الصفقات المغلقة
- إضافة مؤشرات فنية (Moving Averages, RSI, etc.)
- رسم خطوط الدعم والمقاومة

## 🔧 التكامل مع الكود الحالي

### التغييرات المطلوبة في HomeScreen.tsx

```typescript
// استبدال الرسم البياني القديم
import AdvancedChart from '../components/AdvancedChart';

// في الـ render
<AdvancedChart
  timeframe={selectedTimeframe}
  currentPrice={currentPrice}
  positions={openPositionsWithPnl}
  onPositionUpdate={handlePositionUpdate}
/>

// إضافة handler
const handlePositionUpdate = async (
  positionId: string, 
  stopLoss: number, 
  takeProfit: number
) => {
  try {
    await paperTradingService.updatePosition(positionId, { stopLoss, takeProfit });
    await refreshTradingOnly();
    showSuccess('تم التحديث', 'تم تعديل الصفقة بنجاح');
  } catch (error) {
    showError('فشل التحديث', 'تعذر تعديل الصفقة');
  }
};
```

### إضافة وظيفة تحديث الصفقة في paperTradingService.ts

```typescript
const updatePosition = async (
  positionId: string,
  updates: { stopLoss?: number; takeProfit?: number }
): Promise<PaperPosition | null> => {
  const state = await loadState();
  const index = state.openPositions.findIndex((p) => p.id === positionId);

  if (index === -1) {
    return null;
  }

  const position = state.openPositions[index];
  
  if (updates.stopLoss !== undefined) {
    position.stopLoss = round2(updates.stopLoss);
  }
  
  if (updates.takeProfit !== undefined) {
    position.takeProfit = round2(updates.takeProfit);
  }

  state.openPositions[index] = position;
  await saveState(state);
  
  return position;
};

// إضافة للـ export
export const paperTradingService = {
  // ... الوظائف الموجودة
  updatePosition,
};
```

## 📝 ملاحظات مهمة

### الأداء
- الرسم البياني محسّن للأداء العالي
- تحديث الصفقات يتم بكفاءة بدون إعادة رسم كامل
- استخدام WebView لعزل الرسم البياني عن الـ UI الرئيسي

### التوافق
- متوافق مع جميع التحديثات السابقة
- لا يؤثر على الوظائف الموجودة
- يمكن استخدامه بشكل مستقل أو مع الرسم البياني القديم

### الأمان
- جميع الحسابات تتم على الجهاز
- لا يتم إرسال بيانات الصفقات للخادم
- السبريد ثابت ولا يتغير

## 🎨 التصميم

### الألوان
- أخضر (#10b981): الشراء، الأرباح، TP
- أحمر (#ef4444): البيع، الخسائر، SL
- رمادي (#6b7280): المعلومات الثانوية
- شفاف: الخلفية للتكامل مع التصميم

### الخطوط
- خط سميك (2px): خط الدخول
- خط متقطع (1px): SL/TP
- خط متقطع رفيع: السبريد

## ✨ النتيجة النهائية

المستخدم الآن يمكنه:
1. ✅ رؤية السبريد الحالي (BID/ASK)
2. ✅ رؤية جميع صفقاته على الرسم البياني
3. ✅ متابعة الربح/الخسارة لكل صفقة مباشرة
4. ✅ رؤية خطوط SL/TP لكل صفقة
5. ✅ تجربة تداول احترافية مثل منصات MT4/MT5

---

**تم التحديث بنجاح! 🎉**

التطبيق الآن يحتوي على رسم بياني متقدم مع جميع الميزات المطلوبة.
