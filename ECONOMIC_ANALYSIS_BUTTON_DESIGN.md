# تصميم زر التحليل في كارت الخبر

## 📋 المتطلبات

### 1. إزالة تبويب "تحليل الأخبار اليوم"
- ✅ حذف التبويبات (Tabs)
- ✅ العودة لعرض التقويم فقط

### 2. إضافة زر "تحليل" في كل كارت خبر
- ✅ زر صغير في أسفل الكارت
- ✅ أيقونة: `analytics-outline`
- ✅ نص: "تحليل الخبر"

### 3. منطق التحليل

#### عند الضغط على زر "تحليل":

**الحالة 1: لا يوجد تحليل**
```
1. عرض Loading
2. استدعاء API: POST /api/economic-analysis/event/:eventId
3. AI يقوم بالتحليل
4. حفظ التحليل في قاعدة البيانات
5. عرض التحليل في Modal
```

**الحالة 2: يوجد تحليل**
```
1. جلب التحليل من API: GET /api/economic-analysis/event/:eventId
2. عرض التحليل مباشرة في Modal
```

### 4. حذف التحليل التلقائي

**متى يُحذف التحليل؟**
- ✅ عند صدور النتيجة الفعلية (`actual` موجود)
- ✅ يتم الحذف تلقائياً من قاعدة البيانات
- ✅ Cron job يعمل كل ساعة لحذف التحليلات القديمة

## 🎨 التصميم

### كارت الخبر (قبل):
```
┌─────────────────────────────────┐
│  🇺🇸 اجتماع الفيدرالي           │
│  📅 اليوم  ⏰ 19:00             │
│  🔴 تأثير عالي                  │
│  ✅ صدر                         │
│                                 │
│  التوقع: 3.75%                  │
│  السابق: 3.75%                  │
│  الفعلي: 3.75%                  │
└─────────────────────────────────┘
```

### كارت الخبر (بعد):
```
┌─────────────────────────────────┐
│  🇺🇸 اجتماع الفيدرالي           │
│  📅 اليوم  ⏰ 19:00             │
│  🔴 تأثير عالي                  │
│  ⏳ لم يصدر بعد                 │
│                                 │
│  التوقع: 3.75%                  │
│  السابق: 3.75%                  │
│                                 │
│  [📊 تحليل الخبر]               │ ← زر جديد
└─────────────────────────────────┘
```

### Modal التحليل:
```
┌─────────────────────────────────┐
│  📊 تحليل: اجتماع الفيدرالي     │
│                            [✕]  │
├─────────────────────────────────┤
│                                 │
│  📊 التحليل:                    │
│  هذا حدث اقتصادي عالي التأثير...│
│                                 │
│  🎯 التأثير المتوقع:            │
│  تأثير عالي على الأسواق...     │
│                                 │
│  📈 توقعات السوق:               │
│  السوق يتوقع 3.75%...          │
│                                 │
│  💡 توصيات التداول:             │
│  ⚠️ انتظر صدور النتيجة...       │
│  📈 راقب حركة السعر...          │
│                                 │
│  ⏰ تم التحليل: منذ 5 دقائق     │
│                                 │
│  [🔄 تحديث التحليل]  [إغلاق]   │
└─────────────────────────────────┘
```

## 🔧 التطبيق

### 1. تحديث Interface:
```typescript
interface EconomicEvent {
  id: string;
  // ... الحقول الموجودة
  hasAnalysis?: boolean;  // هل يوجد تحليل؟
  analysis?: {
    id: string;
    analysis: string;
    impact: string;
    marketExpectation: string;
    tradingRecommendation: string;
    analyzedAt: string;
  };
}
```

### 2. إضافة State:
```typescript
const [analyzingEventId, setAnalyzingEventId] = useState<string | null>(null);
const [selectedEventAnalysis, setSelectedEventAnalysis] = useState<any>(null);
const [showAnalysisModal, setShowAnalysisModal] = useState(false);
```

### 3. دالة التحليل:
```typescript
const analyzeEvent = async (event: EconomicEvent) => {
  try {
    setAnalyzingEventId(event.id);
    
    const { getToken } = await import('../services/apiService');
    const token = await getToken();
    
    // محاولة جلب تحليل موجود
    let response = await fetch(
      `${API_BASE_URL}/api/economic-analysis/event/${event.id}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    let data = await response.json();
    
    if (data.success && data.analysis) {
      // يوجد تحليل - عرضه مباشرة
      setSelectedEventAnalysis(data.analysis);
    } else {
      // لا يوجد تحليل - إنشاء جديد
      response = await fetch(
        `${API_BASE_URL}/api/economic-analysis/analyze`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ eventId: event.id })
        }
      );
      
      data = await response.json();
      
      if (data.success) {
        setSelectedEventAnalysis(data.analysis);
      }
    }
    
    setShowAnalysisModal(true);
  } catch (error) {
    console.error('Error analyzing event:', error);
    Alert.alert('خطأ', 'فشل تحليل الحدث');
  } finally {
    setAnalyzingEventId(null);
  }
};
```

### 4. زر التحليل في الكارت:
```typescript
{/* زر التحليل - فقط للأحداث التي لم تصدر بعد */}
{!event.actual && (
  <TouchableOpacity
    style={styles.analyzeButton}
    onPress={() => analyzeEvent(event)}
    disabled={analyzingEventId === event.id}
  >
    {analyzingEventId === event.id ? (
      <ActivityIndicator size="small" color={colors.primary} />
    ) : (
      <>
        <Ionicons name="analytics-outline" size={18} color={colors.primary} />
        <Text style={styles.analyzeButtonText}>
          {event.hasAnalysis ? 'عرض التحليل' : 'تحليل الخبر'}
        </Text>
      </>
    )}
  </TouchableOpacity>
)}
```

### 5. Modal التحليل:
```typescript
<Modal
  visible={showAnalysisModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowAnalysisModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          📊 تحليل الخبر
        </Text>
        <TouchableOpacity onPress={() => setShowAnalysisModal(false)}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView style={styles.modalBody}>
        {selectedEventAnalysis && (
          <>
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>📊 التحليل</Text>
              <Text style={styles.analysisText}>
                {selectedEventAnalysis.analysis}
              </Text>
            </View>
            
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>🎯 التأثير المتوقع</Text>
              <Text style={styles.analysisText}>
                {selectedEventAnalysis.impact}
              </Text>
            </View>
            
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>📈 توقعات السوق</Text>
              <Text style={styles.analysisText}>
                {selectedEventAnalysis.marketExpectation}
              </Text>
            </View>
            
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>💡 توصيات التداول</Text>
              <Text style={styles.analysisRecommendation}>
                {selectedEventAnalysis.tradingRecommendation}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
      
      {/* Footer */}
      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={styles.modalButton}
          onPress={() => setShowAnalysisModal(false)}
        >
          <Text style={styles.modalButtonText}>إغلاق</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

## 🗄️ قاعدة البيانات

### جدول التحليلات:
```sql
CREATE TABLE economic_analyses (
  id VARCHAR(255) PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  analysis TEXT NOT NULL,
  impact TEXT,
  market_expectation TEXT,
  trading_recommendation TEXT,
  analyzed_at TIMESTAMP NOT NULL,
  event_released BOOLEAN DEFAULT FALSE,
  UNIQUE(event_id, user_id)
);

-- Index للبحث السريع
CREATE INDEX idx_event_user ON economic_analyses(event_id, user_id);
CREATE INDEX idx_event_released ON economic_analyses(event_released);
```

### Cron Job لحذف التحليلات:
```typescript
// في server/src/index.ts
cron.schedule('0 * * * *', async () => {
  try {
    // حذف التحليلات للأحداث التي صدرت
    const { query } = await import('./db/postgresAdapter');
    const { getEconomicCalendar } = await import('./services/economicCalendarService');
    
    const calendar = await getEconomicCalendar();
    const releasedEvents = calendar.events
      .filter(e => e.actual)
      .map(e => e.id);
    
    if (releasedEvents.length > 0) {
      await query(
        'DELETE FROM economic_analyses WHERE event_id = ANY($1)',
        [releasedEvents]
      );
      
      console.log(`🗑️ Deleted ${releasedEvents.length} analyses for released events`);
    }
  } catch (error) {
    console.error('❌ Failed to clean up analyses:', error);
  }
});
```

## 📊 API Endpoints

### 1. تحليل حدث جديد:
```
POST /api/economic-analysis/analyze
Authorization: Bearer <token>
Body: { eventId: "event_123" }

Response:
{
  "success": true,
  "analysis": {
    "id": "analysis_456",
    "eventId": "event_123",
    "analysis": "...",
    "impact": "...",
    "marketExpectation": "...",
    "tradingRecommendation": "...",
    "analyzedAt": "2026-01-31T10:00:00Z"
  }
}
```

### 2. جلب تحليل موجود:
```
GET /api/economic-analysis/event/:eventId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "analysis": { ... }
}
```

## 🎯 الفوائد

### للمستخدم:
1. ✅ **تحليل عند الطلب** - فقط عندما يحتاجه
2. ✅ **توفير الموارد** - لا يتم تحليل جميع الأحداث
3. ✅ **تحليل مشترك** - إذا حلل مستخدم، الآخرون يستفيدون
4. ✅ **تحديث تلقائي** - التحليلات تُحذف عند صدور الخبر

### للنظام:
1. ✅ **أداء أفضل** - تحليل عند الطلب فقط
2. ✅ **تخزين ذكي** - حذف تلقائي للتحليلات القديمة
3. ✅ **مشاركة التحليلات** - تحليل واحد لجميع المستخدمين
4. ✅ **واجهة أبسط** - بدون تبويبات معقدة

## 🚀 خطوات التنفيذ

1. ✅ إزالة التبويبات من الواجهة
2. ✅ إضافة زر التحليل في الكارت
3. ✅ إضافة Modal للتحليل
4. ✅ إضافة دالة `analyzeEvent()`
5. ✅ تحديث API endpoint
6. ✅ إضافة Cron job للحذف التلقائي
7. ✅ اختبار النظام

## 📝 ملاحظات

- التحليل يُحفظ لجميع المستخدمين (مشترك)
- عند صدور الخبر، يُحذف التحليل تلقائياً
- المستخدم الأول الذي يضغط "تحليل" يقوم بإنشائه
- المستخدمون الآخرون يرون نفس التحليل
- التحليل يبقى حتى صدور النتيجة الفعلية

## 🎉 الخلاصة

نظام تحليل ذكي وفعال:
- 📊 تحليل عند الطلب
- 🤝 مشاركة التحليلات
- 🗑️ حذف تلقائي
- 💡 واجهة بسيطة

جاهز للتنفيذ! 🚀
