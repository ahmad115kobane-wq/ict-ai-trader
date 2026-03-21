# إصلاح مشاكل الرسم البياني والصفقات

## التاريخ
11 مارس 2026

## المشاكل التي تم إصلاحها

### 1. مشكلة بقاء خطوط الصفقات بعد الإغلاق
**المشكلة**: عندما لا توجد صفقات مفتوحة، تبقى خطوط الصفقات ظاهرة في الرسم البياني

**الحل**:
- تم تعديل `loadOpenPositions` لإرسال مصفوفة فارغة حتى عندما لا توجد صفقات
- تم تحديث `window.__UPDATE_POSITIONS__` لحذف جميع الخطوط عند استقبال مصفوفة فارغة
- الآن يتم حذف الخطوط تلقائياً عند إغلاق جميع الصفقات

### 2. عدم دعم التعديل من الرسم البياني
**المشكلة**: لا يمكن الضغط على خطوط الصفقات في الرسم البياني لتعديلها

**الحل**:
- تم إضافة `chart.subscribeClick` للاستماع للضغط على الرسم البياني
- عند الضغط بالقرب من خط صفقة (ضمن 5 نقاط)، يتم إرسال رسالة للتطبيق
- تم إضافة `handleChartMessage` في HomeScreen لاستقبال الرسائل
- تم إضافة Modal في TradesScreen لتعديل SL/TP
- يمكن الآن الضغط على الصفقة في الرسم البياني للانتقال لصفحة التعديل

## التحديثات التقنية

### HomeScreen.tsx
```typescript
// إرسال الصفقات حتى لو كانت فارغة
if (chartWebViewRef.current) {
  const positionsJson = JSON.stringify(positionsWithPnl);
  chartWebViewRef.current.injectJavaScript(`
    window.__UPDATE_POSITIONS__ && window.__UPDATE_POSITIONS__(${positionsJson});
    true;
  `);
}

// معالج الرسائل من الرسم البياني
const handleChartMessage = (event: any) => {
  try {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'EDIT_POSITION') {
      navigation.navigate('Trades', { editPositionId: data.positionId });
    }
  } catch (error) {
    console.error('Error handling chart message:', error);
  }
};

// إضافة onMessage للـ WebView
<WebView
  onMessage={handleChartMessage}
  // ... باقي الخصائص
/>
```

### JavaScript في الرسم البياني
```javascript
// حذف جميع الخطوط عند مصفوفة فارغة
window.__UPDATE_POSITIONS__ = (positions) => {
  if (!positions || positions.length === 0) {
    Object.keys(positionLines).forEach(id => {
      if (positionLines[id].entryLine) candlestickSeries.removePriceLine(positionLines[id].entryLine);
      if (positionLines[id].slLine) candlestickSeries.removePriceLine(positionLines[id].slLine);
      if (positionLines[id].tpLine) candlestickSeries.removePriceLine(positionLines[id].tpLine);
      delete positionLines[id];
    });
    return;
  }
  // ... باقي الكود
};

// معالج الضغط على الرسم البياني
chart.subscribeClick((param) => {
  if (param.point && param.time) {
    const price = candlestickSeries.coordinateToPrice(param.point.y);
    
    // البحث عن أقرب خط صفقة
    let closestPosition = null;
    let minDistance = Infinity;
    
    Object.keys(positionLines).forEach(id => {
      const line = positionLines[id];
      const entryPrice = line.entryLine.options().price;
      const distance = Math.abs(price - entryPrice);
      
      if (distance < minDistance && distance < 5) {
        minDistance = distance;
        closestPosition = line.positionId;
      }
    });
    
    // إرسال رسالة للتطبيق
    if (closestPosition && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'EDIT_POSITION',
        positionId: closestPosition
      }));
    }
  }
});
```

### TradesScreen.tsx
```typescript
// Modal للتعديل
const [editModalVisible, setEditModalVisible] = useState(false);
const [editingPosition, setEditingPosition] = useState<PaperPosition | null>(null);
const [newStopLoss, setNewStopLoss] = useState('');
const [newTakeProfit, setNewTakeProfit] = useState('');

// فتح Modal التعديل
const editPosition = (position: PaperPosition) => {
  setEditingPosition(position);
  setNewStopLoss(position.stopLoss.toFixed(2));
  setNewTakeProfit(position.takeProfit.toFixed(2));
  setEditModalVisible(true);
};

// حفظ التعديلات
const savePositionEdit = async () => {
  const state = await paperTradingService.loadState();
  const positionIndex = state.openPositions.findIndex(p => p.id === editingPosition.id);
  
  state.openPositions[positionIndex].stopLoss = sl;
  state.openPositions[positionIndex].takeProfit = tp;
  
  await paperTradingService.saveState(state);
  await updateTradingSnapshot(currentPrice);
  
  setEditModalVisible(false);
  showSuccess('تم التعديل ✅', 'تم تحديث SL و TP بنجاح');
};
```

## الميزات الجديدة

1. **حذف تلقائي للخطوط**: عند إغلاق جميع الصفقات، تختفي الخطوط من الرسم البياني
2. **تعديل من الرسم البياني**: الضغط على خط الصفقة يفتح نافذة التعديل
3. **Modal احترافي**: واجهة تعديل سهلة مع حقول SL و TP
4. **تحديث فوري**: التعديلات تظهر مباشرة في الرسم البياني

## التحديث

```bash
# رفع الكود
git add .
git commit -m "إصلاح مشاكل الرسم البياني: حذف الخطوط عند إغلاق الصفقات وإضافة تعديل الصفقات من الرسم البياني"
git push

# تحديث التطبيق
npx eas update --branch production --message "إصلاح مشاكل الرسم البياني وإضافة تعديل الصفقات"
```

## معلومات التحديث

- **Branch**: production
- **Runtime version**: 1.0.0
- **Update group ID**: 25797636-58f7-4272-a752-de3007f9277b
- **Android update ID**: 019cda28-2341-7abc-a063-ea66b8bf0ba1
- **iOS update ID**: 019cda28-2341-73a0-9a1d-25dda5244851
- **Commit**: e93ba5b453e40206bc661479ea127d22a1d96393

## الملفات المعدلة

1. `mobile/src/screens/HomeScreen.tsx`
   - إضافة `handleChartMessage`
   - تحديث `loadOpenPositions` لإرسال مصفوفة فارغة
   - تحديث JavaScript في الرسم البياني
   - إضافة `onMessage` للـ WebView

2. `mobile/src/screens/TradesScreen.tsx`
   - إضافة Modal للتعديل
   - إضافة `editPosition` و `savePositionEdit`
   - إضافة حقول الإدخال لـ SL و TP

## الاختبار

للتأكد من عمل التحديثات:

1. افتح التطبيق وانتظر تحميل التحديث
2. افتح صفقة جديدة من الصفحة الرئيسية
3. تحقق من ظهور خطوط الصفقة في الرسم البياني
4. اضغط على خط الصفقة في الرسم البياني
5. يجب أن تفتح نافذة التعديل
6. عدل SL و TP واحفظ
7. أغلق الصفقة من صفحة السجلات
8. تحقق من اختفاء الخطوط من الرسم البياني

## ملاحظات

- الضغط يجب أن يكون ضمن 5 نقاط من خط الدخول
- التعديل يحفظ مباشرة في AsyncStorage
- الخطوط تتحدث كل 5 ثوانٍ مع الربح/الخسارة
