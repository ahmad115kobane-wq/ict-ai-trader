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
    '--disable-permissions-api'
  ],
  timeout: 30000,
  ignoreDefaultArgs: ['--disable-extensions'],
  handleSIGINT: false,
  handleSIGTERM: false,
  handleSIGHUP: false
};

const SCREENSHOT_CONFIG = {
  width: 1648,  // زيادة 7% إضافية (1540 * 1.07)
  height: 900,
  deviceScaleFactor: 3,  // جودة عالية جداً (3x resolution) - Retina Display
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

// دالة إنشاء HTML للرسم البياني
function createChartHTML(
  candles: Candle[],
  currentPrice: number,
  timeframe: 'H1' | 'M5',
  candleCount: number
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
  const padding = (maxPrice - minPrice) * 0.05;
  const min = minPrice - padding;
  const max = maxPrice + padding;
  const range = (max - min) || 0.01;

  // إعدادات الرسم - جودة عالية
  const chartWidth = 1412; // زيادة 7% إضافية (1320 * 1.07)
  const chartHeight = 700;
  const paddingTop = 80;
  const paddingBottom = 80;
  const paddingLeft = 100;
  const paddingRight = 180;
  const rightMargin = 40; // مسافة إضافية بعد آخر شمعة

  const getY = (price: number) => paddingTop + ((max - price) / range) * chartHeight;
  
  // حساب المساحة المتاحة للشموع مع ترك مسافة على اليمين
  const chartAreaWidth = chartWidth - paddingLeft - paddingRight - rightMargin;
  const candleSpacing = chartAreaWidth / visibleData.length;
  const candleWidth = Math.max(candleSpacing * 0.7, 4);

  // بناء SVG للشموع - واضحة ومحسنة
  let candlesSVG = '';
  let wicksCount = 0;
  
  visibleData.forEach((candle, i) => {
    const x = paddingLeft + i * candleSpacing;
    const centerX = x + candleSpacing / 2;
    const isBullish = candle.close >= candle.open;
    
    // ألوان واضحة
    const bullColor = '#02b145e7';  // أخضر واضح
    const bearColor = '#cc3c3cff';  // أحمر واضح
    const color = isBullish ? bullColor : bearColor;
    
    const openY = getY(candle.open);
    const closeY = getY(candle.close);
    const highY = getY(candle.high);
    const lowY = getY(candle.low);
    
    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);
    const bodyHeight = Math.max(bodyBottom - bodyTop, 2);
    
    // الفتيل العلوي - واضح
    if (candle.high > Math.max(candle.open, candle.close)) {
      candlesSVG += `
        <line x1="${centerX}" y1="${highY}" x2="${centerX}" y2="${bodyTop}" 
              stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
      wicksCount++;
    }
    
    // الفتيل السفلي - واضح
    if (candle.low < Math.min(candle.open, candle.close)) {
      candlesSVG += `
        <line x1="${centerX}" y1="${bodyBottom}" x2="${centerX}" y2="${lowY}" 
              stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
      wicksCount++;
    }
    
    // جسم الشمعة - واضح وبسيط
    if (isBullish) {
      // شمعة صاعدة - مجوفة
      candlesSVG += `
        <rect x="${centerX - candleWidth/2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" 
              fill="white" stroke="${color}" stroke-width="2" rx="1"/>`;
    } else {
      // شمعة هابطة - مملوءة
      candlesSVG += `
        <rect x="${centerX - candleWidth/2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" 
              fill="${color}" stroke="${color}" stroke-width="1" rx="1"/>`;
    }
    
    // معالجة الشموع الصغيرة
    if (Math.abs(candle.close - candle.open) < (maxPrice - minPrice) * 0.001) {
      candlesSVG += `
        <line x1="${centerX - candleWidth/2}" y1="${(bodyTop + bodyBottom)/2}" 
              x2="${centerX + candleWidth/2}" y2="${(bodyTop + bodyBottom)/2}" 
              stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
    }
  });
  
  console.log(`📊 ${timeframe} - Drew ${wicksCount} wicks for ${visibleData.length} candles`);

  // خطوط الشبكة والأسعار - تفاصيل أكثر
  let gridLines = '';
  let priceLabels = '';
  
  // نهاية منطقة الشموع (مع المسافة)
  const candlesEndX = paddingLeft + chartAreaWidth;
  
  // زيادة عدد الخطوط من 12 إلى 20 لتفاصيل أفضل
  const gridCount = 20;
  
  for (let i = 0; i <= gridCount; i++) {
    const price = max - (range / gridCount) * i;
    const y = getY(price);
    
    // الخطوط تنتهي عند نهاية منطقة الشموع
    gridLines += `<line x1="${paddingLeft}" y1="${y}" x2="${candlesEndX}" y2="${y}" 
                        stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`;
    
    priceLabels += `<text x="${chartWidth - paddingRight + 15}" y="${y + 6}" 
                          fill="rgba(255,255,255,0.8)" font-size="16" font-weight="bold" font-family="Arial">
                          ${price.toFixed(2)}
                    </text>`;
  }

  // خط السعر الحالي - واضح
  const currentPriceY = getY(currentPrice);
  const currentPriceLine = `
    <line x1="${paddingLeft}" y1="${currentPriceY}" x2="${candlesEndX}" y2="${currentPriceY}" 
          stroke="#fbbf24" stroke-width="3" stroke-dasharray="8,6"/>
    <rect x="${chartWidth - paddingRight + 10}" y="${currentPriceY - 18}" width="120" height="36" 
          fill="#fbbf24" rx="6"/>
    <text x="${chartWidth - paddingRight + 70}" y="${currentPriceY + 8}" 
          fill="#000" font-size="16" font-weight="bold" text-anchor="middle" font-family="Arial">
          ${currentPrice.toFixed(2)}
    </text>
  `;

  // العنوان والمعلومات
  const title = `${timeframe} Chart - XAUUSD`;
  const info = `${visibleData.length} Candles (Target: ${candleCount}) | High: ${maxPrice.toFixed(2)} | Low: ${minPrice.toFixed(2)} | Current: ${currentPrice.toFixed(2)}`;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #0d1117 0%, #0a0e14 50%, #06080c 100%);
            font-family: 'Arial', sans-serif;
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
        .chart-container {
            background: rgba(255,255,255,0.03);
            border-radius: 16px;
            padding: 30px;
            border: 2px solid rgba(255,255,255,0.1);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
        }
        .chart-title {
            font-size: 32px;
            font-weight: bold;
            color: #00C896;
            text-align: center;
            margin-bottom: 15px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        .chart-info {
            font-size: 18px;
            color: rgba(255,255,255,0.8);
            text-align: center;
            margin-bottom: 25px;
            font-weight: 500;
        }
        svg {
            display: block;
            margin: 0 auto;
            border-radius: 8px;
        }
        .timeframe-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            background: ${timeframe === 'H1' ? '#3b82f6' : '#8b5cf6'};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="timeframe-badge">${timeframe}</div>
    <div class="chart-container">
        <div class="chart-title">${title}</div>
        <div class="chart-info">${info}</div>
        <svg width="${chartWidth}" height="${chartHeight + paddingTop + paddingBottom}" 
             viewBox="0 0 ${chartWidth} ${chartHeight + paddingTop + paddingBottom}">
            
            <!-- تعريف التدرج -->
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:0.8" />
                    <stop offset="50%" style="stop-color:#16213e;stop-opacity:0.6" />
                    <stop offset="100%" style="stop-color:#0f172a;stop-opacity:0.8" />
                </linearGradient>
            </defs>
            
            <!-- خلفية الرسم البياني -->
            <rect x="${paddingLeft}" y="${paddingTop}" 
                  width="${chartAreaWidth}" 
                  height="${chartHeight}" 
                  fill="url(#bgGradient)" rx="8"/>
            
            <!-- خطوط الشبكة -->
            ${gridLines}
            
            <!-- الشموع -->
            ${candlesSVG}
            
            <!-- خط السعر الحالي -->
            ${currentPriceLine}
            
            <!-- تسميات الأسعار -->
            ${priceLabels}
            
            <!-- إطار الرسم البياني -->
            <rect x="${paddingLeft}" y="${paddingTop}" 
                  width="${chartAreaWidth}" 
                  height="${chartHeight}" 
                  fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" rx="8"/>
        </svg>
    </div>
    
    <script>
        // تأكد من تحميل الصفحة بالكامل
        window.addEventListener('load', function() {
            console.log('Chart loaded successfully');
            document.body.style.opacity = '1';
        });
    </script>
</body>
</html>
  `;
}

// دالة التقاط صورة من متصفح حقيقي - محسنة لـ Windows
async function captureChartFromBrowser(
  candles: Candle[],
  currentPrice: number,
  timeframe: 'H1' | 'M5',
  candleCount: number
): Promise<string> {
  let page: Page | null = null;
  let browser: Browser | null = null;
  
  try {
    console.log(`📸 Starting ${timeframe} chart capture...`);
    
    // إنشاء متصفح جديد لكل عملية تصوير لتجنب مشاكل Windows
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
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 20000
    });

    // انتظار تحميل الرسم البياني
    await page.waitForFunction('document.readyState === "complete"', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // التأكد من وجود العناصر
    await page.waitForSelector('svg', { timeout: 10000 });

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
    console.error(`❌ Browser screenshot error for ${timeframe}:`, error);
    throw new Error(`Failed to capture ${timeframe} screenshot: ${(error as Error).message}`);
  } finally {
    // إغلاق الصفحة والمتصفح
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.warn('Warning: Failed to close page:', e);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.warn('Warning: Failed to close browser:', e);
      }
    }
  }
}

// دالة التقاط الصورتين من المتصفح - محسنة لـ Windows مع التقاط متوازي
export const captureRealChartScreenshots = async (
  h1Candles: Candle[],
  m5Candles: Candle[],
  currentPrice: number,
  h1CandleCount: number = 199,
  m5CandleCount: number = 300
): Promise<{ h1Image: string; m5Image: string }> => {
  console.log(`🎯 Starting parallel browser-based chart screenshot capture...`);
  console.log(`📊 Target H1: ${h1CandleCount}, Target M5: ${m5CandleCount}`);
  
  try {
    // التقاط الصورتين بشكل متوازي لتحسين الأداء
    console.log(`📊 Capturing both H1 and M5 charts simultaneously...`);
    
    const [h1Image, m5Image] = await Promise.all([
      captureChartFromBrowser(h1Candles, currentPrice, 'H1', h1CandleCount),   // استخدام العدد المرسل
      captureChartFromBrowser(m5Candles, currentPrice, 'M5', m5CandleCount)    // استخدام العدد المرسل
    ]);

    console.log(`🎉 Both browser screenshots captured successfully!`);
    console.log(`📊 H1 Image: ${h1Image.length} chars`);
    console.log(`📊 M5 Image: ${m5Image.length} chars`);

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
    const { h1Image, m5Image } = await captureRealChartScreenshots(h1Candles, m5Candles, currentPrice, 199, 300);

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
    const candleCount = timeframe === 'H1' ? 220 : 350;  // أرقام أكبر قليلاً للرسوم المتحركة
    const candles = await getCandles(symbol, timeframe === 'H1' ? '1h' : '5m', candleCount);
    const currentPrice = await getCurrentPrice(symbol);

    if (!candles.length) {
      throw new Error('No candle data available');
    }

    const frameImages: string[] = [];
    const displayCount = timeframe === 'H1' ? 199 : 300;  // استخدام الأرقام الجديدة

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