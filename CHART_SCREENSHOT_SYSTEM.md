# 📊 نظام الرسم البياني والتقاط الصور

## 🎯 نظرة عامة

النظام مسؤول عن رسم الرسوم البيانية (H1 و M5) والتقاطها كصور باستخدام Puppeteer.

---

## 📁 الملفات المسؤولة

### 1️⃣ **`server/src/services/screenshotService.ts`** ⭐
**الملف الرئيسي** - مسؤول عن:
- إنشاء HTML للرسم البياني
- فتح المتصفح (Puppeteer)
- التقاط الصور
- حساب مستويات السيولة

### 2️⃣ **`server/src/services/chartService.ts`**
**واجهة الاستخدام** - مسؤول عن:
- استدعاء screenshotService
- معالجة الأخطاء
- Fallback للطريقة القديمة (SVG)

---

## 🔧 كيف يعمل النظام؟

### المسار الكامل:

```
1. طلب تحليل
   ↓
2. جلب بيانات الشموع من OANDA
   ↓
3. استدعاء renderDualCharts()
   ↓
4. استدعاء captureRealChartScreenshots()
   ↓
5. إنشاء HTML للرسم البياني
   ↓
6. فتح المتصفح (Puppeteer)
   ↓
7. تحميل HTML في المتصفح
   ↓
8. التقاط صورة PNG
   ↓
9. تحويل إلى Base64
   ↓
10. إرجاع الصور للتحليل
```

---

## 📊 الدالة الرئيسية: `captureRealChartScreenshots`

**الموقع:** `server/src/services/screenshotService.ts`

### الوظيفة:
```typescript
export const captureRealChartScreenshots = async (
  h1Candles: Candle[],      // شموع H1
  m5Candles: Candle[],      // شموع M5
  currentPrice: number,     // السعر الحالي
  h1Count: number = 130,    // عدد شموع H1
  m5Count: number = 220     // عدد شموع M5
): Promise<{ h1Image: string; m5Image: string }>
```

### الخطوات:

#### 1. حساب مستويات السيولة
```typescript
const liquidityLevels = calculateLiquidityLevels(m5Candles);
// Returns: { swingHigh, swingLow, bsl, ssl }
```

#### 2. إنشاء HTML للرسم البياني
```typescript
const h1Html = createChartHTML(h1Candles, currentPrice, 'H1', ...);
const m5Html = createChartHTML(m5Candles, currentPrice, 'M5', ...);
```

#### 3. فتح المتصفح
```typescript
const browser = await getBrowser();
const page = await browser.newPage();
```

#### 4. تحميل HTML والتقاط الصورة
```typescript
await page.setContent(h1Html);
const screenshot = await page.screenshot({
  type: 'png',
  encoding: 'base64'
});
```

---


## 🎨 دالة إنشاء HTML: `createChartHTML`

### الوظيفة الكاملة:

```typescript
function createChartHTML(
  candles: Candle[],
  currentPrice: number,
  timeframe: string,
  requestedCount: number,
  liquidityLevels?: any
): string
```

### ما تفعله:

1. **تحضير البيانات:**
```typescript
const candlesToUse = candles.slice(-requestedCount);
const minPrice = Math.min(...candlesToUse.map(c => c.low));
const maxPrice = Math.max(...candlesToUse.map(c => c.high));
```

2. **إنشاء HTML مع Canvas:**
```html
<canvas id="chart" width="2093" height="900"></canvas>
```

3. **رسم الشموع:**
```javascript
// لكل شمعة
const bodyTop = priceToY(Math.max(open, close));
const bodyBottom = priceToY(Math.min(open, close));
const bodyHeight = Math.abs(bodyBottom - bodyTop);

// رسم الجسم
ctx.fillStyle = isGreen ? '#26a69a' : '#ef5350';
ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

// رسم الذيول (wicks)
ctx.strokeStyle = isGreen ? '#26a69a' : '#ef5350';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(centerX, priceToY(high));
ctx.lineTo(centerX, priceToY(low));
ctx.stroke();
```

4. **رسم خط السعر الحالي:**
```javascript
const priceY = priceToY(currentPrice);
ctx.strokeStyle = '#2196f3';
ctx.lineWidth = 2;
ctx.setLineDash([5, 5]);
ctx.beginPath();
ctx.moveTo(0, priceY);
ctx.lineTo(width, priceY);
ctx.stroke();
```

5. **رسم الشبكة:**
```javascript
const gridLines = 20;
for (let i = 0; i <= gridLines; i++) {
  const y = (height / gridLines) * i;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
}
```

---

## ⚙️ إعدادات الرسم البياني

### حجم الصورة:
```typescript
const SCREENSHOT_CONFIG = {
  width: 2093,              // العرض
  height: 900,              // الارتفاع
  deviceScaleFactor: 1,     // جودة 1x (أداء أفضل)
  type: 'png',              // نوع الصورة
  quality: 100,             // جودة 100%
  fullPage: false
};
```

### عدد الشموع:
```typescript
// H1 Timeframe
h1Count: 130 شمعة

// M5 Timeframe
m5Count: 220 شمعة
```

### الألوان:
```typescript
const COLORS = {
  background: '#1e1e1e',      // خلفية داكنة
  grid: 'rgba(255,255,255,0.1)', // شبكة شفافة
  text: '#ffffff',            // نص أبيض
  greenCandle: '#26a69a',     // شمعة خضراء
  redCandle: '#ef5350',       // شمعة حمراء
  currentPrice: '#2196f3',    // خط السعر أزرق
  priceBar: 'rgba(33,150,243,0.1)' // شريط السعر
};
```

### المسافات:
```typescript
const rightMargin = 40;     // مسافة بين آخر شمعة وشريط الأسعار
const candleSpacing = 2;    // مسافة بين الشموع
const candleWidth = 8;      // عرض الشمعة
```

---

## 💧 حساب مستويات السيولة

### الدالة: `calculateLiquidityLevels`

```typescript
function calculateLiquidityLevels(candles: Candle[]): {
  swingHigh?: number;
  swingLow?: number;
  bsl?: number;
  ssl?: number;
}
```

### ما تحسبه:

#### 1. BSL (Buy Side Liquidity)
```typescript
// أعلى قمة في آخر 30 شمعة
const bsl = Math.max(...recentCandles.map(c => c.high));
```

#### 2. SSL (Sell Side Liquidity)
```typescript
// أدنى قاع في آخر 30 شمعة
const ssl = Math.min(...recentCandles.map(c => c.low));
```

#### 3. Swing High
```typescript
// قمة واضحة: شمعة أعلى من الشمعتين قبلها وبعدها
for (let i = recentCandles.length - 3; i >= 2; i--) {
  const current = recentCandles[i];
  const prev1 = recentCandles[i - 1];
  const prev2 = recentCandles[i - 2];
  const next1 = recentCandles[i + 1];
  const next2 = recentCandles[i + 2];
  
  if (current.high > prev1.high && 
      current.high > prev2.high &&
      current.high > next1.high && 
      current.high > next2.high) {
    swingHigh = current.high;
    break;
  }
}
```

#### 4. Swing Low
```typescript
// قاع واضح: شمعة أقل من الشمعتين قبلها وبعدها
// نفس المنطق لكن بالعكس
```

### مثال النتيجة:
```javascript
{
  swingHigh: 5087.30,
  swingLow: 5047.69,
  bsl: 5091.32,
  ssl: 5046.84
}
```

---

## 🌐 إعدادات المتصفح (Puppeteer)

### التكوين:
```typescript
const BROWSER_CONFIG = {
  headless: true,           // بدون واجهة
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--no-first-run',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-logging'
  ],
  timeout: 30000,           // 30 ثانية
  handleSIGINT: false,
  handleSIGTERM: false,
  handleSIGHUP: false
};
```

### إدارة المتصفح:
```typescript
// متصفح مشترك (Singleton)
let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.connected) {
    sharedBrowser = await puppeteer.launch(BROWSER_CONFIG);
  }
  return sharedBrowser;
}
```

**الفائدة:** استخدام متصفح واحد لجميع الطلبات = أداء أفضل

---

## 🚀 التقاط متوازي (Parallel)

### الطريقة القديمة (Sequential):
```typescript
// بطيء - 6-8 ثواني
const h1Image = await captureH1();
const m5Image = await captureM5();
```

### الطريقة الجديدة (Parallel):
```typescript
// سريع - 3-4 ثواني
const [h1Image, m5Image] = await Promise.all([
  captureH1(),
  captureM5()
]);
```

**تحسين الأداء:** 50% أسرع! ⚡

---

## 📝 مثال كامل للاستخدام

### في Analysis Route:

```typescript
import { renderDualCharts } from '../services/chartService';
import { getCandles, getCurrentPrice } from '../services/oandaService';

// 1. جلب البيانات
const [h1Candles, m5Candles, currentPrice] = await Promise.all([
  getCandles('XAUUSD', '1h', 200),
  getCandles('XAUUSD', '5m', 250),
  getCurrentPrice('XAUUSD')
]);

// 2. رسم والتقاط الصور
const { h1Image, m5Image } = await renderDualCharts(
  h1Candles, 
  m5Candles, 
  currentPrice,
  130,  // عدد شموع H1
  220   // عدد شموع M5
);

// 3. إرسال للـ AI
const analysis = await analyzeMultiTimeframe(
  h1Image, 
  m5Image, 
  currentPrice
);
```

### النتيجة:
```javascript
{
  h1Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  m5Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

## 🔍 Debugging والاختبار

### 1. اختبار التقاط الصور:
```
GET /test-screenshot
```

### 2. اختبار متوازي:
```
GET /test-parallel
```

### 3. حفظ الصور كملفات:
```
GET /save-charts
```

### 4. Logs مفيدة:
```typescript
console.log('📸 Starting M5 chart capture...');
console.log('📊 M5 Liquidity levels:', liquidityLevels);
console.log('🎨 Creating M5 HTML with 220 candles...');
console.log('📊 M5 - Requested: 220, Using: 220 candles');
console.log('📊 M5 - Drew 424 wicks for 220 candles');
console.log('✅ M5 screenshot captured: 274164 chars');
```

---

## ⚠️ معالجة الأخطاء

### في chartService.ts:

```typescript
export const renderDualCharts = async (...) => {
  try {
    // محاولة التقاط الصور الفعلية
    const { h1Image, m5Image } = await captureRealChartScreenshots(...);
    return { h1Image, m5Image };
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    
    // Fallback للطريقة القديمة (SVG)
    console.log('🔄 Falling back to SVG generation...');
    return renderDualChartsSVG(h1Candles, m5Candles, currentPrice);
  }
};
```

---

## 🎯 التحسينات المطبقة

### ✅ تم تطبيقها:

1. **زيادة العرض:** 1200px → 2093px
2. **عدد الشموع:** H1=130, M5=220
3. **Right Margin:** 40px بين آخر شمعة والسعر
4. **خطوط الشبكة:** 12 → 20 خط
5. **Device Scale Factor:** 3 → 1 (أداء أفضل)
6. **التقاط متوازي:** تحسين 50% في السرعة
7. **حساب السيولة:** BSL, SSL, Swing High/Low
8. **Stroke Widths:** تحسين وضوح الشموع

---

## 📊 مقارنة الأداء

### قبل التحسينات:
- الوقت: 6-8 ثواني
- الحجم: 1200x900
- الجودة: 3x resolution
- الطريقة: Sequential

### بعد التحسينات:
- الوقت: 3-4 ثواني ⚡
- الحجم: 2093x900 📏
- الجودة: 1x resolution (أوضح)
- الطريقة: Parallel 🚀

---

## 🔧 تخصيص الإعدادات

### لتغيير عدد الشموع:

**في `server/src/index.ts` (Auto Analysis):**
```typescript
const { h1Image, m5Image } = await renderDualCharts(
  h1Candles, 
  m5Candles, 
  currentPrice, 
  130,  // ← غيّر هنا لـ H1
  220   // ← غيّر هنا لـ M5
);
```

### لتغيير حجم الصورة:

**في `server/src/services/screenshotService.ts`:**
```typescript
const SCREENSHOT_CONFIG = {
  width: 2093,   // ← غيّر العرض
  height: 900,   // ← غيّر الارتفاع
  deviceScaleFactor: 1,  // ← غيّر الجودة (1-3)
};
```

### لتغيير الألوان:

**في دالة `createChartHTML`:**
```javascript
const greenColor = '#26a69a';  // ← لون الشمعة الخضراء
const redColor = '#ef5350';    // ← لون الشمعة الحمراء
const bgColor = '#1e1e1e';     // ← لون الخلفية
```

---

## 📚 الملفات ذات الصلة

### الملفات الرئيسية:
1. `server/src/services/screenshotService.ts` - التقاط الصور ⭐
2. `server/src/services/chartService.ts` - واجهة الاستخدام
3. `server/src/services/oandaService.ts` - جلب البيانات
4. `server/src/services/aiService.ts` - تحليل الصور

### Routes التي تستخدمه:
1. `server/src/routes/analysis.ts` - التحليل اليدوي
2. `server/src/index.ts` - التحليل التلقائي
3. `server/src/index.ts` - اختبار الصور

---

## 🎓 الخلاصة

### النظام يتكون من:

1. **screenshotService.ts** - المحرك الرئيسي
   - إنشاء HTML
   - فتح المتصفح
   - التقاط الصور
   - حساب السيولة

2. **chartService.ts** - الواجهة
   - استدعاء screenshotService
   - معالجة الأخطاء
   - Fallback

3. **Puppeteer** - المتصفح
   - Headless Chrome
   - التقاط PNG
   - Base64 encoding

### التدفق:
```
Data → HTML → Browser → Screenshot → Base64 → AI Analysis
```

---

**آخر تحديث:** 27 يناير 2025
**الإصدار:** 2.1.0
