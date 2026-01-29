// services/chartService.ts
// ✅ خدمة الرسم البياني مع التقاط الصور الفعلية
// ✅ استخدام Puppeteer لالتقاط صور حقيقية بدلاً من SVG

import { Candle } from '../types';
import { captureRealChartScreenshots } from './screenshotService';

// ألوان مطابقة للتطبيق المحمول
const COLORS = {
  background: '#06080c',
  backgroundGradient: {
    start: '#0d1117',
    middle: '#0a0e14', 
    end: '#06080c'
  },
  candleUp: '#10b981',
  candleDown: '#ef4444',
  grid: 'rgba(255,255,255,0.04)',
  separator: 'rgba(255,255,255,0.1)',
  text: 'rgba(255,255,255,0.5)',
  textBright: 'rgba(255,255,255,0.8)',
  border: 'rgba(255,255,255,0.08)',
  highLabel: '#10b981',
  lowLabel: '#ef4444'
};

interface ChartOptions {
  width?: number;
  height?: number;
  candleCount?: number;
  timeframe?: 'H1' | 'M5';
}

// دالة مساعدة لتنسيق السعر (مطابقة للتطبيق)
const formatPrice = (price: number): string => {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
};

// رسم شارت H1 و M5 معاً باستخدام التقاط الصور الفعلية
export const renderDualCharts = async (
  h1Candles: Candle[],
  m5Candles: Candle[],
  currentPrice: number,
  h1CandleCount: number = 100,
  m5CandleCount: number = 140
): Promise<{ h1Image: string; m5Image: string }> => {
  console.log(`📸 Using real screenshot capture for charts...`);
  console.log(`📊 H1 Candles: ${h1Candles.length}, Target: ${h1CandleCount}`);
  console.log(`📊 M5 Candles: ${m5Candles.length}, Target: ${m5CandleCount}`);
  
  try {
    // التقاط الصور الفعلية باستخدام Puppeteer مع العدد المحدد
    const { h1Image, m5Image } = await captureRealChartScreenshots(
      h1Candles,
      m5Candles,
      currentPrice,
      h1CandleCount,
      m5CandleCount
    );

    console.log(`✅ Real screenshots captured successfully!`);
    console.log(`📊 H1 Screenshot: ${h1Image.length} chars`);
    console.log(`📊 M5 Screenshot: ${m5Image.length} chars`);

    return { h1Image, m5Image };

  } catch (error) {
    console.error(`❌ Real screenshot capture failed:`, error);
    
    // في حالة فشل التقاط الصور، استخدم الطريقة القديمة كـ fallback
    console.log(`🔄 Falling back to SVG generation...`);
    return renderDualChartsSVG(h1Candles, m5Candles, currentPrice);
  }
};

// الطريقة القديمة (SVG) كـ fallback
const renderDualChartsSVG = (
  h1Candles: Candle[],
  m5Candles: Candle[],
  currentPrice: number
): { h1Image: string; m5Image: string } => {
  const h1Image = renderCandlestickChartSVG(h1Candles, currentPrice, {
    width: 800,
    height: 300,
    candleCount: 100,  // 100 شمعة للساعة
    timeframe: 'H1'
  });

  const m5Image = renderCandlestickChartSVG(m5Candles, currentPrice, {
    width: 800,
    height: 300,
    candleCount: 140,  // 140 شمعة لـ5 دقائق
    timeframe: 'M5'
  });

  return { h1Image, m5Image };
};

// دالة SVG القديمة (للـ fallback)
const renderCandlestickChartSVG = (
  candles: Candle[],
  currentPrice: number,
  options: ChartOptions = {}
): string => {
  const {
    width = 800,
    height = 300,
    candleCount = 100,  // 100 شمعة للساعة (افتراضي)
    timeframe = 'H1'
  } = options;

  const visibleData = candles.slice(-candleCount);
  if (visibleData.length === 0) {
    return '';
  }

  // الإعدادات
  const paddingTop = 25;
  const paddingBottom = 25;
  const priceAxisWidth = 65;
  const rightMargin = 10;
  const chartWidth = width - priceAxisWidth - rightMargin;
  const chartHeight = height - paddingTop - paddingBottom;

  // حساب النطاق السعري
  const allPrices = visibleData.flatMap(d => [d.high, d.low]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  
  const padding = (maxPrice - minPrice) * 0.02;
  const min = minPrice - padding;
  const max = maxPrice + padding;
  const range = (max - min) || 0.01;

  const getY = (price: number) => paddingTop + ((max - price) / range) * chartHeight;

  // إعدادات الشموع
  const slots = visibleData.length;
  const candleAreaWidth = chartWidth / slots;
  const candleWidth = Math.max(candleAreaWidth * 0.65, 2);
  const wickWidth = Math.max(candleWidth * 0.15, 1);

  // السعر الحالي
  const priceLineY = getY(currentPrice);
  const priceChange = currentPrice > visibleData[visibleData.length - 1]?.close ? 'up' : 
                     currentPrice < visibleData[visibleData.length - 1]?.close ? 'down' : 'none';
  const priceColor = priceChange === 'up' ? '#10b981' : priceChange === 'down' ? '#ef4444' : '#6b7280';

  // مستويات الأسعار
  const priceLevels: { price: number; y: number }[] = [];
  const step = range / 7;
  for (let i = 0; i <= 7; i++) {
    const price = max - (step * i);
    priceLevels.push({ price, y: getY(price) });
  }

  // أعلى وأدنى شمعة
  let highestIdx = 0;
  let lowestIdx = 0;
  visibleData.forEach((c, i) => {
    if (c.high > visibleData[highestIdx].high) highestIdx = i;
    if (c.low < visibleData[lowestIdx].low) lowestIdx = i;
  });

  // بناء SVG
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // تعريف التدرج
  svgContent += `
    <defs>
      <linearGradient id="bgGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${COLORS.backgroundGradient.start}" stop-opacity="1" />
        <stop offset="0.5" stop-color="${COLORS.backgroundGradient.middle}" stop-opacity="1" />
        <stop offset="1" stop-color="${COLORS.backgroundGradient.end}" stop-opacity="1" />
      </linearGradient>
    </defs>
  `;

  // الخلفية
  svgContent += `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#bgGradient)" rx="12" />`;

  // خطوط الشبكة
  priceLevels.forEach((level, i) => {
    svgContent += `<line x1="0" y1="${level.y}" x2="${chartWidth}" y2="${level.y}" stroke="${COLORS.grid}" stroke-width="1" />`;
  });

  // خط فاصل
  svgContent += `<line x1="${chartWidth + rightMargin}" y1="${paddingTop - 5}" x2="${chartWidth + rightMargin}" y2="${height - 20}" stroke="${COLORS.separator}" stroke-width="1" />`;

  // رسم الشموع
  visibleData.forEach((candle, i) => {
    const x = i * candleAreaWidth + (candleAreaWidth - candleWidth) / 2;
    const isBullish = candle.close >= candle.open;
    const color = isBullish ? COLORS.candleUp : COLORS.candleDown;
    const bodyTop = Math.min(getY(candle.open), getY(candle.close));
    const bodyBottom = Math.max(getY(candle.open), getY(candle.close));
    const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

    // الفتيل العلوي
    svgContent += `<line x1="${x + candleWidth / 2}" y1="${getY(candle.high)}" x2="${x + candleWidth / 2}" y2="${bodyTop}" stroke="${color}" stroke-width="${wickWidth}" />`;
    
    // الفتيل السفلي
    svgContent += `<line x1="${x + candleWidth / 2}" y1="${bodyBottom}" x2="${x + candleWidth / 2}" y2="${getY(candle.low)}" stroke="${color}" stroke-width="${wickWidth}" />`;
    
    // جسم الشمعة
    svgContent += `<rect x="${x}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" fill="${color}" rx="1" />`;
  });

  // علامة أعلى سعر
  svgContent += `<text x="${highestIdx * candleAreaWidth + candleAreaWidth / 2}" y="${getY(visibleData[highestIdx].high) - 6}" fill="${COLORS.highLabel}" font-size="8" font-weight="bold" text-anchor="middle">H</text>`;

  // علامة أدنى سعر
  svgContent += `<text x="${lowestIdx * candleAreaWidth + candleAreaWidth / 2}" y="${getY(visibleData[lowestIdx].low) + 12}" fill="${COLORS.lowLabel}" font-size="8" font-weight="bold" text-anchor="middle">L</text>`;

  // خط السعر الحالي
  if (currentPrice > 0 && priceLineY > paddingTop && priceLineY < height - 20) {
    svgContent += `<line x1="0" y1="${priceLineY}" x2="${chartWidth + rightMargin}" y2="${priceLineY}" stroke="${priceColor}" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.8" />`;
    
    // مربع السعر
    svgContent += `<rect x="${chartWidth + rightMargin + 2}" y="${priceLineY - 10}" width="${priceAxisWidth - 4}" height="20" fill="${priceColor}" rx="4" />`;
    
    // نص السعر
    svgContent += `<text x="${chartWidth + rightMargin + priceAxisWidth / 2}" y="${priceLineY + 4}" fill="#fff" font-size="9" font-weight="bold" text-anchor="middle">${formatPrice(currentPrice)}</text>`;
  }

  // أسعار الشريط الجانبي
  priceLevels.forEach((level, i) => {
    const distFromCurrent = Math.abs(level.y - priceLineY);
    if (distFromCurrent < 16 && currentPrice > 0) return;
    
    svgContent += `<text x="${chartWidth + rightMargin + 6}" y="${level.y + 3}" fill="${COLORS.text}" font-size="8">${formatPrice(level.price)}</text>`;
  });

  // معلومات في الأعلى
  svgContent += `<text x="8" y="14" fill="${COLORS.highLabel}" font-size="9" font-weight="bold">H: ${formatPrice(maxPrice)}</text>`;
  svgContent += `<text x="85" y="14" fill="${COLORS.lowLabel}" font-size="9" font-weight="bold">L: ${formatPrice(minPrice)}</text>`;
  svgContent += `<text x="${chartWidth - 35}" y="14" fill="rgba(255,255,255,0.4)" font-size="8">${visibleData.length} bars</text>`;

  // إطار خارجي
  svgContent += `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="${COLORS.border}" stroke-width="1" rx="12" />`;

  svgContent += '</svg>';

  // تحويل SVG لـ base64
  const base64 = Buffer.from(svgContent).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
};
