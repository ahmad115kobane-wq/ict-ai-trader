# إعداد Ollama للتحليل الاقتصادي ✅

## ✅ التعديلات المنفذة

تم تعديل خدمة التحليل الاقتصادي لتستخدم **Ollama** بدلاً من Gemini:

### 📝 الملف المعدل:
- `server/src/services/economicAnalysisService.ts`

### 🔧 التغييرات:

#### قبل (Gemini):
```typescript
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
```

#### بعد (Ollama):
```typescript
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://api.openai.com';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
```

## 🔑 المتغيرات في Railway

تأكد من وجود هذه المتغيرات في Railway:

```bash
OLLAMA_API_KEY=your_ollama_api_key
OLLAMA_BASE_URL=https://your-ollama-server.com  # أو https://api.openai.com
OLLAMA_MODEL=llama3.2  # أو أي موديل آخر تستخدمه
```

## 🤖 كيف يعمل الآن:

### 1. عند طلب تحليل حدث اقتصادي:

```typescript
// يرسل للـ Ollama API
POST ${OLLAMA_BASE_URL}/v1/chat/completions
Authorization: Bearer ${OLLAMA_API_KEY}

{
  "model": "llama3.2",
  "messages": [
    {
      "role": "user",
      "content": "أنت محلل اقتصادي خبير..."
    }
  ],
  "temperature": 0.3,
  "max_tokens": 2000
}
```

### 2. Ollama يرد بالتحليل:

```json
{
  "choices": [
    {
      "message": {
        "content": "📊 تحليل الحدث الاقتصادي..."
      }
    }
  ]
}
```

### 3. النظام يحلل الرد ويقسمه:

```typescript
{
  mainAnalysis: "شرح مفصل للحدث...",
  impact: "تأثيره على الأسواق...",
  marketExpectation: "توقعات السوق...",
  tradingRecommendation: "توصيات التداول..."
}
```

## 📊 مثال على الاستخدام:

### في التطبيق:
1. المستخدم يضغط "تحليل الخبر"
2. التطبيق يرسل طلب للخادم
3. الخادم يرسل للـ Ollama
4. Ollama يحلل الحدث
5. النظام يعرض التحليل في Modal

### Logs المتوقعة:
```
🔍 Analyzing economic event: اجتماع الفيدرالي for user: user_123
🤖 Using Ollama API: https://api.openai.com | Model: llama3.2
✅ Ollama analysis completed
💾 Analysis saved to database
✅ Analysis completed for: اجتماع الفيدرالي
```

## 🔄 Fallback (احتياطي):

إذا فشل Ollama أو لم يكن متاحاً:
```typescript
⚠️ No Ollama API key, using basic analysis
```

سيستخدم النظام تحليل أساسي بناءً على:
- مقارنة النتيجة الفعلية بالتوقعات
- مستوى التأثير (عالي/متوسط/منخفض)
- البيانات التاريخية

## ✅ المميزات:

### 1. نفس API Format:
- Ollama يستخدم نفس format الـ OpenAI
- سهل التكامل والاستخدام

### 2. مرونة في الموديل:
```bash
# يمكنك استخدام أي موديل
OLLAMA_MODEL=llama3.2
OLLAMA_MODEL=qwen3-vl:235b-instruct-cloud
OLLAMA_MODEL=mistral
```

### 3. Fallback ذكي:
- إذا فشل AI → تحليل أساسي
- لا يتوقف النظام أبداً

## 🧪 اختبار التكامل:

### 1. تحقق من المتغيرات:
```bash
# في Railway Dashboard
Variables → OLLAMA_API_KEY ✅
Variables → OLLAMA_BASE_URL ✅
Variables → OLLAMA_MODEL ✅
```

### 2. اختبر التحليل:
```bash
# في التطبيق
1. افتح التقويم الاقتصادي
2. اختر حدث لم يصدر بعد
3. اضغط "تحليل الخبر"
4. انتظر التحليل
```

### 3. راقب Logs:
```bash
# في Railway Logs
🤖 Using Ollama API: ...
✅ Ollama analysis completed
```

## 📝 ملاحظات مهمة:

1. **نفس الموديل للتحليلين:**
   - التحليل الرئيسي (ICT): يستخدم Ollama ✅
   - التحليل الاقتصادي: يستخدم Ollama ✅

2. **المتغيرات مشتركة:**
   ```bash
   OLLAMA_API_KEY → يستخدم في الاثنين
   OLLAMA_BASE_URL → يستخدم في الاثنين
   OLLAMA_MODEL → يستخدم في الاثنين
   ```

3. **Temperature مختلفة:**
   - التحليل الرئيسي: `0.2` (دقيق)
   - التحليل الاقتصادي: `0.3` (أكثر إبداعاً)

## 🚀 الخطوات التالية:

1. ✅ التعديلات جاهزة
2. ⏳ رفع للخادم:
   ```bash
   cd server
   npm run build
   git add .
   git commit -m "Use Ollama for economic analysis"
   git push
   ```
3. ⏳ اختبار في التطبيق

## 🎉 النتيجة:

الآن التحليل الاقتصادي يستخدم **Ollama** مثل التحليل الرئيسي تماماً! 🤖

جميع التحليلات في نظام واحد متكامل! ✅
