# تعديل وإغلاق جزئي للصفقات مع تحديث فوري

## التاريخ
11 مارس 2026

## الميزات الجديدة

### 1. تعديل الصفقات في الصفحة الرئيسية
**الميزة**: يمكن الآن تعديل SL/TP مباشرة من الصفحة الرئيسية بدون الانتقال لصفحة السجلات

**التنفيذ**:
- إضافة Modal احترافي للتعديل في HomeScreen
- عند الضغط على خط الصفقة في الرسم البياني، يفتح Modal التعديل مباشرة
- زر "تعديل" في قائمة الصفقات المفتوحة
- حفظ فوري مع تحديث الرسم البياني

### 2. الإغلاق الجزئي للصفقات
**الميزة**: إمكانية إغلاق جزء من حجم الصفقة والاحتفاظ بالباقي

**التنفيذ**:
- إضافة وظيفة `partialClosePosition` في paperTradingService
- Modal خاص للإغلاق الجزئي مع عرض الحد الأقصى
- حساب الربح/الخسارة للجزء المغلق فقط
- تحديث حجم الصفقة المتبقية تلقائياً

### 3. قائمة الصفقات المفتوحة في الصفحة الرئيسية
**الميزة**: عرض جميع الصفقات المفتوحة أسفل الرسم البياني مباشرة

**المحتوى**:
- معلومات الصفقة: Side, Symbol, Entry, Lot, SL, TP
- الربح/الخسارة الحالي بالألوان
- 3 أزرار: تعديل، إغلاق جزئي، إغلاق كامل

### 4. التحديث الفوري
**الميزة**: تحديث فوري للصفقات والرسم البياني بعد أي عملية

**التنفيذ**:
- استدعاء `loadOpenPositions()` بعد كل عملية
- تحديث الرسم البياني تلقائياً
- تحديث قائمة الصفقات فوراً

## التحديثات التقنية

### paperTradingService.ts

#### وظيفة تعديل الصفقة
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
```

#### وظيفة الإغلاق الجزئي
```typescript
const partialClosePosition = async (
  positionId: string,
  closeLotSize: number,
  marketPrice: number
): Promise<{ closedPosition: PaperPosition; remainingPosition: PaperPosition | null } | null> => {
  const state = await loadState();
  const index = state.openPositions.findIndex((p) => p.id === positionId);

  if (index === -1) {
    return null;
  }

  const position = state.openPositions[index];
  
  // التحقق من الحجم
  if (closeLotSize >= position.lotSize) {
    throw new Error('حجم الإغلاق يجب أن يكون أقل من حجم الصفقة الكلي');
  }
  
  if (closeLotSize <= 0) {
    throw new Error('حجم الإغلاق يجب أن يكون أكبر من صفر');
  }

  // حساب الربح/الخسارة للجزء المغلق
  const delta = (marketPrice - position.entryPrice) * getDirectionMultiplier(position.side);
  const partialPnl = round2(delta * closeLotSize * CONTRACT_SIZE);

  // إنشاء صفقة مغلقة للجزء المغلق
  const closedPosition: PaperPosition = {
    ...position,
    id: `${position.id}_partial_${Date.now()}`,
    lotSize: round2(closeLotSize),
    status: 'closed',
    closePrice: round2(marketPrice),
    closedAt: new Date().toISOString(),
    realizedPnl: partialPnl,
  };

  // تحديث الصفقة المتبقية
  const remainingLotSize = round2(position.lotSize - closeLotSize);
  
  if (remainingLotSize > 0) {
    position.lotSize = remainingLotSize;
    state.openPositions[index] = position;
  } else {
    state.openPositions.splice(index, 1);
  }

  // تحديث الرصيد
  state.balance = round2(state.balance + partialPnl);
  state.closedPositions = [closedPosition, ...state.closedPositions].slice(0, 100);

  await saveState(state);
  
  return {
    closedPosition,
    remainingPosition: remainingLotSize > 0 ? position : null,
  };
};
```

### HomeScreen.tsx

#### معالج رسائل الرسم البياني
```typescript
const handleChartMessage = (event: any) => {
  try {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'EDIT_POSITION') {
      // فتح Modal التعديل في نفس الصفحة
      const position = openPositions.find(p => p.id === data.positionId);
      if (position) {
        openEditModal(position);
      }
    }
  } catch (error) {
    console.error('Error handling chart message:', error);
  }
};
```

#### وظيفة التعديل
```typescript
const savePositionEdit = async () => {
  if (!editingPosition) return;

  const sl = parseFloat(newStopLoss);
  const tp = parseFloat(newTakeProfit);

  if (!Number.isFinite(sl) || !Number.isFinite(tp)) {
    showError('قيم غير صحيحة', 'تأكد من إدخال أرقام صحيحة لـ SL و TP');
    return;
  }

  try {
    const updated = await paperTradingService.updatePosition(editingPosition.id, {
      stopLoss: sl,
      takeProfit: tp,
    });

    if (!updated) {
      showError('خطأ', 'لم يتم العثور على الصفقة');
      return;
    }

    // تحديث فوري
    await loadOpenPositions();
    
    setEditModalVisible(false);
    setEditingPosition(null);
    showSuccess('تم التعديل ✅', 'تم تحديث SL و TP بنجاح');
  } catch (error: any) {
    console.error('Edit position error:', error);
    showError('فشل التعديل ❌', error.message || 'تعذر تعديل الصفقة');
  }
};
```

#### وظيفة الإغلاق الجزئي
```typescript
const executePartialClose = async () => {
  if (!closingPosition) return;

  const lotSize = parseFloat(partialLotSize);

  if (!Number.isFinite(lotSize) || lotSize <= 0) {
    showError('حجم غير صحيح', 'أدخل حجم لوت صحيح');
    return;
  }

  if (lotSize >= closingPosition.lotSize) {
    showError('حجم كبير جداً', `الحد الأقصى: ${(closingPosition.lotSize - 0.01).toFixed(2)} LOT`);
    return;
  }

  try {
    const result = await paperTradingService.partialClosePosition(
      closingPosition.id,
      lotSize,
      currentPrice
    );

    if (!result) {
      showError('خطأ', 'لم يتم العثور على الصفقة');
      return;
    }

    // تحديث فوري
    await loadOpenPositions();
    
    setPartialCloseModalVisible(false);
    setClosingPosition(null);
    
    const pnl = result.closedPosition.realizedPnl || 0;
    showSuccess(
      'إغلاق جزئي ✅',
      `تم إغلاق ${lotSize.toFixed(2)} LOT\n\nالربح/الخسارة: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}$\n\nالمتبقي: ${result.remainingPosition ? result.remainingPosition.lotSize.toFixed(2) : '0.00'} LOT`
    );
  } catch (error: any) {
    console.error('Partial close error:', error);
    showError('فشل الإغلاق ❌', error.message || 'تعذر إغلاق الصفقة جزئياً');
  }
};
```

#### قائمة الصفقات المفتوحة
```tsx
{openPositions.length > 0 && (
  <View style={styles.positionsSection}>
    <Text style={styles.sectionTitle}>الصفقات المفتوحة ({openPositions.length})</Text>
    {openPositions.map((position) => {
      const pnl = position.floatingPnl || 0;
      const isProfit = pnl >= 0;
      
      return (
        <View key={position.id} style={styles.positionCard}>
          {/* معلومات الصفقة */}
          <View style={styles.positionHeader}>
            <View style={styles.sideBadge}>
              <Text style={styles.sideText}>{position.side}</Text>
            </View>
            <Text style={styles.positionSymbol}>{position.symbol}</Text>
            <Text style={styles.positionPnl}>
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}$
            </Text>
          </View>

          {/* التفاصيل */}
          <View style={styles.positionDetails}>
            <View style={styles.positionDetailRow}>
              <Text>Entry: {position.entryPrice.toFixed(2)}</Text>
            </View>
            {/* ... باقي التفاصيل */}
          </View>

          {/* الأزرار */}
          <View style={styles.positionActions}>
            <TouchableOpacity onPress={() => openEditModal(position)}>
              <Text>تعديل</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openPartialCloseModal(position)}>
              <Text>إغلاق جزئي</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => closePositionFull(position)}>
              <Text>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    })}
  </View>
)}
```

## المشاكل التي تم إصلاحها

### 1. فشل تعديل SL/TP
**المشكلة**: كان التعديل يفشل بسبب استخدام `loadState` و `saveState` مباشرة

**الحل**: إضافة وظيفة `updatePosition` في الخدمة تتعامل مع التحديث بشكل صحيح

### 2. عدم التحديث الفوري
**المشكلة**: بعد فتح أو إغلاق صفقة، لا تتحدث القائمة والرسم البياني

**الحل**: استدعاء `loadOpenPositions()` بعد كل عملية لتحديث كل شيء فوراً

### 3. التوجه لصفحة السجلات
**المشكلة**: عند الضغط على الصفقة في الرسم البياني، يتم التوجه لصفحة أخرى

**الحل**: فتح Modal التعديل في نفس الصفحة الرئيسية

## التحديث

```bash
# رفع الكود
git add .
git commit -m "إضافة تعديل وإغلاق جزئي للصفقات في الصفحة الرئيسية مع تحديث فوري"
git push

# تحديث التطبيق
npx eas update --branch production --message "إضافة تعديل وإغلاق جزئي مع تحديث فوري"
```

## معلومات التحديث

- **Branch**: production
- **Runtime version**: 1.0.0
- **Update group ID**: a90855b7-c46d-47ab-89bd-dfca3af03e03
- **Android update ID**: 019cda42-bda1-7a53-87ac-1b389e29a5a3
- **iOS update ID**: 019cda42-bda1-784c-b607-d52ac1199249
- **Commit**: d3183d6759bebe392c7c51c782f9557cb71bc8d2

## الملفات المعدلة

1. `mobile/src/services/paperTradingService.ts`
   - إضافة `updatePosition`
   - إضافة `partialClosePosition`
   - تصدير `loadState` و `saveState`

2. `mobile/src/screens/HomeScreen.tsx`
   - إضافة قائمة الصفقات المفتوحة
   - إضافة Modal التعديل
   - إضافة Modal الإغلاق الجزئي
   - تحديث `handleChartMessage`
   - إضافة وظائف التعديل والإغلاق

3. `mobile/src/screens/TradesScreen.tsx`
   - تحديث `savePositionEdit` لاستخدام `updatePosition`

## الاختبار

### تعديل الصفقة
1. افتح صفقة جديدة
2. اضغط على زر "تعديل" أو اضغط على خط الصفقة في الرسم البياني
3. عدل SL و TP
4. احفظ التعديلات
5. تحقق من التحديث الفوري في القائمة والرسم البياني

### الإغلاق الجزئي
1. افتح صفقة بحجم 1.00 LOT
2. اضغط على "إغلاق جزئي"
3. أدخل 0.50 LOT
4. احفظ
5. تحقق من:
   - إغلاق 0.50 LOT
   - بقاء 0.50 LOT مفتوحة
   - تحديث الرصيد بالربح/الخسارة للجزء المغلق

### التحديث الفوري
1. افتح صفقة جديدة
2. تحقق من ظهورها فوراً في القائمة والرسم البياني
3. أغلق الصفقة
4. تحقق من اختفائها فوراً

## ملاحظات

- الإغلاق الجزئي يجب أن يكون أقل من الحجم الكلي
- التعديل يحفظ مباشرة في AsyncStorage
- التحديث الفوري يعمل لجميع العمليات
- قائمة الصفقات تظهر فقط عند وجود صفقات مفتوحة
