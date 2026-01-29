// services/screenshotService.ts
// ✅ خدمة التقاط الصور الفعلية من متصفح حقيقي
// ✅ فتح الرسم البياني في متصفح وتصويره

import puppeteer, { Browser, Page } from 'puppeteer';
import { Candle } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// إعدادات المتصفح والتصوير - حجم عادي مع شموع واضحة
const BROWSER_CONFIG = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--no-first-run',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-ipc-flooding-protection',
    '--disable-extensions',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-pings',
    '--disable-logging',
    '--disable-permissions-api',
    '--single-process',
    '--no-zygote',
    '--disable-accelerated-2d-canvas',
    '--disable-software-rasterizer',
    '--disable-infobars',
    '--window-size=1920,1080',
    '--memory-pressure-off',
    '--max-old-space-size=512'
  ],
  timeout: 60000,
  ignoreDefaultArgs: ['--disable-extensions'],
  handleSIGINT: false,
  handleSIGTERM: false,
  handleSIGHUP: false,
  protocolTimeout: 60000
};

const SCREENSHOT_CONFIG = {
  width: 2093,  // زيادة 10% إضافية (1903 * 1.10)
  height: 900,
  deviceScaleFactor: 1,  // جودة عادية (1x resolution) - أداء أفضل
  type: 'png' as const,
  quality: 100,  // أقصى جودة للصورة
  fullPage: false
};

// متغير لحفظ المتصفح المشترك
let sharedBrowser: Browser | null = null;

// دالة إنشاء أو الحصول على المتصفح - محسنة لـ Windows
async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.connected) {
    console.log('🌐 Launching new browser instance for Windows...');
    try {
      sharedBrowser = await puppeteer.launch(BROWSER_CONFIG);
      console.log('✅ Browser launched successfully');
    } catch (error) {
      console.error('❌ Browser launch failed:', error);
      throw new Error(`Failed to launch browser: ${(error as Error).message}`);
    }
  }
  return sharedBrowser;
}

// ✅ واجهة نتائج تحليل السيولة
interface LiquidityAnalysis {
  swingHighs: number[];      // جميع القمم
  swingLows: number[];       // جميع القيعان
  bsl: number[];             // Buy Side Liquidity (آخر 2 مستوى)
  ssl: number[];             // Sell Side Liquidity (آخر 2 مستوى)
  sweeps: LiquiditySweep[];  // سحب السيولة المكتشفة
  equalHighs: number[];      // القمم المتساوية (EQH)
  equalLows: number[];       // القيعان المتساوية (EQL)
}

interface LiquiditySweep {
  type: 'BSL_SWEEP' | 'SSL_SWEEP';  // نوع السحب
  level: number;                     // المستوى الذي تم سحبه
  sweepCandle: number;               // index الشمعة التي سحبت
  confirmed: boolean;                // هل تم تأكيد الارتداد؟
}

// ✅ دالة حساب مستويات السيولة المحسنة (Swing High/Low، BSL/SSL، Sweeps)
function calculateLiquidityLevels(candles: Candle[]): LiquidityAnalysis {
  const result: LiquidityAnalysis = {
    swingHighs: [],
    swingLows: [],
    bsl: [],
    ssl: [],
    sweeps: [],
    equalHighs: [],
    equalLows: []
  };

  if (!candles || candles.length < 5) {
    console.log('⚠️ Not enough candles for liquidity calculation');
    return result;
  }

  // ✅ 1. تغيير lookback من 50 إلى 30 (أحدث وأدق)
  const lookback = Math.min(30, candles.length); // آخر 30 شمعة فقط
  const recentCandles = candles.slice(-lookback);

  // حساب النطاق السعري للمستويات
  const allPrices = recentCandles.flatMap(c => [c.high, c.low]);
  const priceRange = Math.max(...allPrices) - Math.min(...allPrices);
  
  // ✅ 3. إضافة minDiff للـ Swing Detection (فرق أدنى 0.5% من النطاق)
  const minDiff = priceRange * 0.005; // 0.5% فرق أدنى لاعتبار القمة/القاع مهم

  // ✅ 2. كشف Swing Points مع minDiff (قمم/قيعان مهمة فقط)
  for (let i = 1; i < recentCandles.length - 1; i++) {
    const prev = recentCandles[i - 1];
    const current = recentCandles[i];
    const next = recentCandles[i + 1];

    // Swing High: أعلى من الجيران بفرق واضح
    if (current.high > prev.high + minDiff && current.high > next.high + minDiff) {
      result.swingHighs.push(current.high);
    }

    // Swing Low: أقل من الجيران بفرق واضح
    if (current.low < prev.low - minDiff && current.low < next.low - minDiff) {
      result.swingLows.push(current.low);
    }
  }

  // ✅ 2. حساب BSL/SSL من Swing Points (أدق بكثير!)
  // أخذ أعلى 2 Swing Highs كـ BSL
  const sortedSwingHighs = [...result.swingHighs].sort((a, b) => b - a);
  result.bsl = sortedSwingHighs.slice(0, 2);
  
  // أخذ أدنى 2 Swing Lows كـ SSL
  const sortedSwingLows = [...result.swingLows].sort((a, b) => a - b);
  result.ssl = sortedSwingLows.slice(0, 2);

  // ✅ 4. تقليل tolerance من 0.002 إلى 0.001 (أدق)
  const maxBsl = result.bsl.length > 0 ? Math.max(...result.bsl) : 0;
  const minSsl = result.ssl.length > 0 ? Math.min(...result.ssl) : 0;
  const tolerance = (maxBsl - minSsl) * 0.001; // 0.1% تسامح (أدق)

  for (let i = 0; i < result.swingHighs.length; i++) {
    for (let j = i + 1; j < result.swingHighs.length; j++) {
      if (Math.abs(result.swingHighs[i] - result.swingHighs[j]) <= tolerance) {
        if (!result.equalHighs.includes(result.swingHighs[i])) {
          result.equalHighs.push(result.swingHighs[i]);
        }
      }
    }
  }

  for (let i = 0; i < result.swingLows.length; i++) {
    for (let j = i + 1; j < result.swingLows.length; j++) {
      if (Math.abs(result.swingLows[i] - result.swingLows[j]) <= tolerance) {
        if (!result.equalLows.includes(result.swingLows[i])) {
          result.equalLows.push(result.swingLows[i]);
        }
      }
    }
  }

  // ✅ 4. كشف سحب السيولة (Liquidity Sweeps) مع فحص الذيل
  for (let i = 2; i < recentCandles.length; i++) {
    const candle = recentCandles[i];

    // ✅ 5. إضافة فحص الذيل في Sweep Detection (تحسين)
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const bodySize = Math.abs(candle.close - candle.open);

    // كشف BSL Sweep (سحب سيولة الشراء) مع فحص الذيل
    for (const swingHigh of result.swingHighs) {
      // الشمعة تخترق القمة ثم تغلق تحتها
      if (candle.high > swingHigh && candle.close < swingHigh) {
        // ✅ فحص قوة الذيل: يجب أن يكون الذيل العلوي واضح
        const hasStrongWick = upperWick > bodySize * 0.3; // الذيل أكبر من 30% من الجسم
        
        if (hasStrongWick) {
          // تأكيد: الشمعة التالية تغلق تحت القمة
          const isConfirmed = i < recentCandles.length - 1 &&
            recentCandles[i + 1].close < swingHigh;

          result.sweeps.push({
            type: 'BSL_SWEEP',
            level: swingHigh,
            sweepCandle: i,
            confirmed: isConfirmed
          });
        }
      }
    }

    // كشف SSL Sweep (سحب سيولة البيع) مع فحص الذيل
    for (const swingLow of result.swingLows) {
      // الشمعة تخترق القاع ثم تغلق فوقه
      if (candle.low < swingLow && candle.close > swingLow) {
        // ✅ فحص قوة الذيل: يجب أن يكون الذيل السفلي واضح
        const hasStrongWick = lowerWick > bodySize * 0.3; // الذيل أكبر من 30% من الجسم
        
        if (hasStrongWick) {
          const isConfirmed = i < recentCandles.length - 1 &&
            recentCandles[i + 1].close > swingLow;

          result.sweeps.push({
            type: 'SSL_SWEEP',
            level: swingLow,
            sweepCandle: i,
            confirmed: isConfirmed
          });
        }
      }
    }
  }

  console.log('📊 Liquidity Analysis:', {
    swingHighs: result.swingHighs.length,
    swingLows: result.swingLows.length,
    bsl: result.bsl.map(b => b.toFixed(2)),
    ssl: result.ssl.map(s => s.toFixed(2)),
    sweeps: result.sweeps.length,
    equalHighs: result.equalHighs.length,
    equalLows: result.equalLows.length
  });

  return result;
}

// دالة إنشاء HTML للرسم البياني - محسن للذكاء الاصطناعي
function createChartHTML(
  candles: Candle[],
  currentPrice: number,
  timeframe: 'H1' | 'M5',
  candleCount: number,
  liquidityData?: LiquidityAnalysis
): string {
  console.log(`🎨 Creating ${timeframe} HTML with ${candleCount} candles from ${candles.length} available`);

  const visibleData = candles.slice(-candleCount);

  console.log(`📊 ${timeframe} - Requested: ${candleCount}, Using: ${visibleData.length} candles`);

  if (visibleData.length === 0) {
    return '<html><body><div style="color: red;">No data available</div></body></html>';
  }

  // حساب النطاق السعري
  const allPrices = visibleData.flatMap(d => [d.high, d.low]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const padding = (maxPrice - minPrice) * 0.08;
  const min = minPrice - padding;
  const max = maxPrice + padding;
  const range = (max - min) || 0.01;

  // إعدادات الرسم - تصميم نظيف للذكاء الاصطناعي
  const chartWidth = 1800;
  const chartHeight = 750;
  const paddingTop = 60;
  const paddingBottom = 60;
  const paddingLeft = 60;
  const paddingRight = 140;

  const getY = (price: number) => paddingTop + ((max - price) / range) * chartHeight;

  // حساب المساحة المتاحة للشموع
  const chartAreaWidth = chartWidth - paddingLeft - paddingRight;
  const candleSpacing = chartAreaWidth / visibleData.length;
  const candleWidth = Math.max(candleSpacing * 0.75, 6);
  const wickWidth = Math.max(2, candleWidth * 0.15);

  // بناء SVG للشموع - واضحة جداً
  let candlesSVG = '';
  let wicksCount = 0;

  visibleData.forEach((candle, i) => {
    const x = paddingLeft + i * candleSpacing;
    const centerX = x + candleSpacing / 2;
    const isBullish = candle.close >= candle.open;

    // ألوان عالية التباين
    const bullColor = '#00FF00';  // أخضر ساطع
    const bearColor = '#FF0000';  // أحمر ساطع
    const color = isBullish ? bullColor : bearColor;

    const openY = getY(candle.open);
    const closeY = getY(candle.close);
    const highY = getY(candle.high);
    const lowY = getY(candle.low);

    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);
    const bodyHeight = Math.max(bodyBottom - bodyTop, 3);

    // الفتيل (Wick) - خط واضح
    candlesSVG += `
      <line x1="${centerX}" y1="${highY}" x2="${centerX}" y2="${lowY}" 
            stroke="${color}" stroke-width="${wickWidth}" stroke-linecap="round"/>`;
    wicksCount++;

    // جسم الشمعة
    if (isBullish) {
      // شمعة صاعدة - مجوفة بحدود سميكة
      candlesSVG += `
        <rect x="${centerX - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" 
              fill="#0a0a0a" stroke="${color}" stroke-width="2.5"/>`;
    } else {
      // شمعة هابطة - مملوءة
      candlesSVG += `
        <rect x="${centerX - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" 
              fill="${color}" stroke="${color}" stroke-width="1"/>`;
    }
  });

  console.log(`📊 ${timeframe} - Drew ${wicksCount} wicks for ${visibleData.length} candles`);

  // خطوط الشبكة - واضحة ومنتظمة
  let gridLines = '';
  let priceLabels = '';
  const gridCount = 12;

  for (let i = 0; i <= gridCount; i++) {
    const price = max - (range / gridCount) * i;
    const y = getY(price);

    // خطوط أفقية منقطة
    gridLines += `<line x1="${paddingLeft}" y1="${y}" x2="${chartWidth - paddingRight}" y2="${y}" 
                        stroke="#333333" stroke-width="1" stroke-dasharray="5,5"/>`;

    // أسعار واضحة على اليمين
    priceLabels += `<text x="${chartWidth - paddingRight + 10}" y="${y + 5}" 
                          fill="#FFFFFF" font-size="14" font-weight="bold" font-family="monospace">
                          ${price.toFixed(2)}
                    </text>`;
  }

  // خطوط عمودية كل 10 شموع
  for (let i = 0; i <= visibleData.length; i += 10) {
    const x = paddingLeft + i * candleSpacing;
    gridLines += `<line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${paddingTop + chartHeight}" 
                        stroke="#222222" stroke-width="1"/>`;
  }

  // خط السعر الحالي - بارز جداً
  const currentPriceY = getY(currentPrice);
  const currentPriceLine = `
    <line x1="${paddingLeft}" y1="${currentPriceY}" x2="${chartWidth - paddingRight}" y2="${currentPriceY}" 
          stroke="#FFD700" stroke-width="2" stroke-dasharray="10,5"/>
    <rect x="${chartWidth - paddingRight + 5}" y="${currentPriceY - 12}" width="90" height="24" 
          fill="#FFD700" rx="4"/>
    <text x="${chartWidth - paddingRight + 50}" y="${currentPriceY + 5}" 
          fill="#000000" font-size="13" font-weight="bold" text-anchor="middle" font-family="monospace">
          ${currentPrice.toFixed(2)}
    </text>
  `;

  // معلومات الرسم البياني
  const highLowInfo = `High: ${maxPrice.toFixed(2)} | Low: ${minPrice.toFixed(2)} | Range: ${(maxPrice - minPrice).toFixed(2)}`;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            width: 100vw;
            height: 100vh;
            background: #0a0a0a;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .chart-box {
            background: #0a0a0a;
            padding: 20px;
        }
        .title {
            color: #FFFFFF;
            font-size: 24px;
            font-weight: bold;
            font-family: Arial, sans-serif;
            text-align: center;
            margin-bottom: 5px;
        }
        .info {
            color: #888888;
            font-size: 14px;
            font-family: monospace;
            text-align: center;
            margin-bottom: 15px;
        }
        .badge {
            display: inline-block;
            background: ${timeframe === 'H1' ? '#0066FF' : '#9933FF'};
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="chart-box">
        <div class="title">
            <span class="badge">${timeframe}</span>
            XAUUSD - ${visibleData.length} Candles
        </div>
        <div class="info">${highLowInfo}</div>
        <svg width="${chartWidth}" height="${chartHeight + paddingTop + paddingBottom}">
            
            <!-- خلفية سوداء -->
            <rect x="0" y="0" width="${chartWidth}" height="${chartHeight + paddingTop + paddingBottom}" fill="#0a0a0a"/>
            
            <!-- منطقة الرسم -->
            <rect x="${paddingLeft}" y="${paddingTop}" 
                  width="${chartAreaWidth}" height="${chartHeight}" 
                  fill="#0d0d0d" stroke="#333333" stroke-width="1"/>
            
            <!-- الشبكة -->
            ${gridLines}
            
            <!-- الشموع -->
            ${candlesSVG}
            
            <!-- السعر الحالي -->
            ${currentPriceLine}
            
            <!-- الأسعار -->
            ${priceLabels}
            
        </svg>
    </div>
</body>
</html>
  `;
}

// دالة التقاط صورة من متصفح حقيقي - محسنة للموارد المحدودة
async function captureChartFromBrowser(
  candles: Candle[],
  currentPrice: number,
  timeframe: 'H1' | 'M5',
  candleCount: number
): Promise<string> {
  let page: Page | null = null;
  let browser: Browser | null = null;
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount <= maxRetries) {
    try {
      console.log(`📸 Starting ${timeframe} chart capture... (attempt ${retryCount + 1})`);

      // إنشاء متصفح جديد لكل عملية تصوير
      browser = await puppeteer.launch(BROWSER_CONFIG);
      page = await browser.newPage();

      // تعيين حجم الصفحة
      await page.setViewport({
        width: SCREENSHOT_CONFIG.width,
        height: SCREENSHOT_CONFIG.height,
        deviceScaleFactor: SCREENSHOT_CONFIG.deviceScaleFactor
      });

      // إنشاء HTML وتحميله
      const html = createChartHTML(candles, currentPrice, timeframe, candleCount);

      console.log(`🌐 Loading ${timeframe} chart HTML...`);
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // انتظار تحميل الرسم البياني
      await page.waitForFunction('document.readyState === "complete"', { timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // التأكد من وجود العناصر
      try {
        await page.waitForSelector('svg', { timeout: 8000 });
      } catch {
        console.log(`⚠️ SVG not found for ${timeframe}, continuing anyway...`);
      }

      console.log(`📷 Taking screenshot of ${timeframe} chart...`);

      // التقاط الصورة
      const screenshot = await page.screenshot({
        type: SCREENSHOT_CONFIG.type,
        encoding: 'base64',
        fullPage: SCREENSHOT_CONFIG.fullPage,
        clip: {
          x: 0,
          y: 0,
          width: SCREENSHOT_CONFIG.width,
          height: SCREENSHOT_CONFIG.height
        }
      });

      console.log(`✅ ${timeframe} screenshot captured: ${screenshot.length} chars`);

      return `data:image/png;base64,${screenshot}`;

    } catch (error) {
      console.error(`❌ Browser screenshot error for ${timeframe} (attempt ${retryCount + 1}):`, error);
      retryCount++;
      
      if (retryCount > maxRetries) {
        throw new Error(`Failed to capture ${timeframe} screenshot after ${maxRetries + 1} attempts: ${(error as Error).message}`);
      }
      
      // انتظار قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      // إغلاق الصفحة والمتصفح
      if (page) {
        try {
          await page.close();
        } catch (e) {
          // تجاهل
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // تجاهل
        }
      }
    }
  }

  throw new Error(`Failed to capture ${timeframe} screenshot`);
}

// دالة التقاط الصورتين من المتصفح - محسنة للموارد المحدودة (تسلسلي)
export const captureRealChartScreenshots = async (
  h1Candles: Candle[],
  m5Candles: Candle[],
  currentPrice: number,
  h1CandleCount: number = 100,
  m5CandleCount: number = 140
): Promise<{ h1Image: string; m5Image: string }> => {
  console.log(`🎯 Starting sequential browser-based chart screenshot capture...`);
  console.log(`📊 Target H1: ${h1CandleCount}, Target M5: ${m5CandleCount}`);

  let h1Image: string = '';
  let m5Image: string = '';

  try {
    // التقاط الصورتين بشكل تسلسلي لتوفير الذاكرة
    console.log(`📊 Capturing H1 chart first...`);
    h1Image = await captureChartFromBrowser(h1Candles, currentPrice, 'H1', h1CandleCount);
    console.log(`✅ H1 captured: ${h1Image.length} chars`);

    // انتظار قليل للسماح بتحرير الذاكرة
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`📊 Capturing M5 chart...`);
    m5Image = await captureChartFromBrowser(m5Candles, currentPrice, 'M5', m5CandleCount);
    console.log(`✅ M5 captured: ${m5Image.length} chars`);

    console.log(`🎉 Both browser screenshots captured successfully!`);

    return { h1Image, m5Image };

  } catch (error) {
    console.error(`❌ Browser screenshot capture failed:`, error);
    throw new Error(`Screenshot capture failed: ${(error as Error).message}`);
  }
};

// دالة اختبار التقاط صورة من المتصفح - محسنة لـ Windows
export const testScreenshotCapture = async (): Promise<string> => {
  console.log(`🧪 Testing browser screenshot capture...`);

  // بيانات تجريبية
  const testCandles: Candle[] = [];
  const basePrice = 2000;

  // إنشاء 30 شمعة تجريبية
  for (let i = 0; i < 30; i++) {
    const open = basePrice + Math.random() * 20 - 10;
    const close = open + Math.random() * 10 - 5;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;

    testCandles.push({
      time: (Date.now() + i * 60000).toString(),
      open,
      high,
      low,
      close
    });
  }

  try {
    const testImage = await captureChartFromBrowser(testCandles, basePrice + 5, 'H1', 30);
    console.log(`✅ Test browser screenshot successful: ${testImage.length} chars`);
    return testImage;
  } catch (error) {
    console.error(`❌ Test browser screenshot failed:`, error);
    throw error;
  }
};

// دالة حفظ الصور في ملفات منفصلة (اختيارية)
export const saveChartsToFiles = async (
  h1Candles: Candle[],
  m5Candles: Candle[],
  currentPrice: number,
  outputDir: string = './screenshots'
): Promise<{ h1Path: string; m5Path: string }> => {
  console.log(`💾 Saving charts to files in ${outputDir}...`);

  try {
    // إنشاء مجلد الصور إذا لم يكن موجوداً
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // التقاط الصور
    const { h1Image, m5Image } = await captureRealChartScreenshots(h1Candles, m5Candles, currentPrice, 100, 140);

    // تحويل base64 إلى buffer
    const h1Buffer = Buffer.from(h1Image.replace('data:image/png;base64,', ''), 'base64');
    const m5Buffer = Buffer.from(m5Image.replace('data:image/png;base64,', ''), 'base64');

    // أسماء الملفات مع الوقت الحالي
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const h1Path = path.join(outputDir, `H1_${timestamp}.png`);
    const m5Path = path.join(outputDir, `M5_${timestamp}.png`);

    // حفظ الملفات
    fs.writeFileSync(h1Path, h1Buffer);
    fs.writeFileSync(m5Path, m5Buffer);

    console.log(`✅ Charts saved successfully!`);
    console.log(`📊 H1 Chart: ${h1Path}`);
    console.log(`📊 M5 Chart: ${m5Path}`);

    return { h1Path, m5Path };

  } catch (error) {
    console.error(`❌ Failed to save charts to files:`, error);
    throw new Error(`Failed to save charts: ${(error as Error).message}`);
  }
};

// دالة إنشاء GIF متحرك من عدة لقطات (متقدمة)
export const createAnimatedChart = async (
  symbol: string,
  timeframe: 'H1' | 'M5',
  frames: number = 10,
  outputPath: string = './animated_chart.gif'
): Promise<string> => {
  console.log(`🎬 Creating animated chart for ${symbol} ${timeframe}...`);

  try {
    const { getCandles, getCurrentPrice } = await import('../services/oandaService');

    // جلب بيانات أكثر للحصول على إطارات متعددة
    const candleCount = timeframe === 'H1' ? 150 : 200;  // أرقام أكبر قليلاً للرسوم المتحركة
    const candles = await getCandles(symbol, timeframe === 'H1' ? '1h' : '5m', candleCount);
    const currentPrice = await getCurrentPrice(symbol);

    if (!candles.length) {
      throw new Error('No candle data available');
    }

    const frameImages: string[] = [];
    const displayCount = timeframe === 'H1' ? 100 : 140;  // 100 شمعة للساعة، 140 شمعة لـ5 دقائق

    // إنشاء إطارات متعددة بعرض بيانات متزايدة
    for (let i = 0; i < frames; i++) {
      const startIndex = Math.max(0, candles.length - displayCount - (frames - i - 1) * 5);
      const frameCandles = candles.slice(startIndex, startIndex + displayCount);

      if (frameCandles.length > 0) {
        const frameImage = await captureChartFromBrowser(
          frameCandles,
          currentPrice,
          timeframe,
          displayCount
        );
        frameImages.push(frameImage);
      }
    }

    console.log(`🎬 Created ${frameImages.length} frames for animation`);

    // هنا يمكن إضافة مكتبة لإنشاء GIF من الصور
    // مثل sharp أو imagemagick
    // لكن للبساطة سنعيد المسار فقط

    return outputPath;

  } catch (error) {
    console.error(`❌ Failed to create animated chart:`, error);
    throw new Error(`Animation creation failed: ${(error as Error).message}`);
  }
};

// دالة إغلاق المتصفح عند إيقاف السيرفر - محسنة لـ Windows
export const closeBrowser = async (): Promise<void> => {
  if (sharedBrowser) {
    console.log('🔒 Closing shared browser...');
    try {
      await sharedBrowser.close();
    } catch (error) {
      console.warn('Warning: Failed to close browser:', error);
    } finally {
      sharedBrowser = null;
    }
  }
};

// معالج إيقاف السيرفر - محسن لـ Windows
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing browser...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing browser...');
  await closeBrowser();
  process.exit(0);
});

process.on('exit', async () => {
  console.log('Process exiting, closing browser...');
  await closeBrowser();
});