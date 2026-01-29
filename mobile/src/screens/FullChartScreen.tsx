// src/screens/FullChartScreen.tsx
// شاشة الرسم البياني بملء الشاشة مع مؤشر ICT المتقدم

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, fontSizes } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FullChartScreen = () => {
  const navigation = useNavigation();
  const chartWebViewRef = useRef<WebView>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'5m' | '15m' | '1h' | '4h'>('5m');
  const [showIndicators, setShowIndicators] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);

  const handleFitChart = () => {
    chartWebViewRef.current?.injectJavaScript(
      'window.__FIT_CONTENT__ && window.__FIT_CONTENT__(); true;'
    );
  };

  const handleGoToRealTime = () => {
    chartWebViewRef.current?.injectJavaScript(
      'window.__SCROLL_TO_REALTIME__ && window.__SCROLL_TO_REALTIME__(); true;'
    );
  };

  const toggleIndicators = () => {
    setShowIndicators(!showIndicators);
    chartWebViewRef.current?.injectJavaScript(
      `window.__TOGGLE_INDICATORS__ && window.__TOGGLE_INDICATORS__(${!showIndicators}); true;`
    );
  };

  // HTML للشارت مع مؤشر ICT المتقدم
  const chartHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          margin: 0; 
          padding: 0; 
          background: #0a0e14;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        }
        #chart-container {
          width: 100vw;
          height: 100vh;
          position: relative;
        }
        #chart { 
          width: 100%; 
          height: 100%; 
        }
        .loading { 
          position: absolute; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%);
          color: #10b981;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(16, 185, 129, 0.2);
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .price-overlay {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 100;
          pointer-events: none;
        }
        .current-price {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }
        .price-up { color: #10b981; }
        .price-down { color: #ef4444; }
        .price-change {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          font-size: 13px;
          font-weight: 500;
        }
        .change-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        .change-up { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .change-down { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .watermark {
          position: absolute;
          bottom: 50%;
          left: 50%;
          transform: translate(-50%, 50%);
          font-size: 64px;
          font-weight: 800;
          color: rgba(255,255,255,0.02);
          pointer-events: none;
          letter-spacing: 6px;
        }
      </style>
    </head>
    <body>
      <div id="chart-container">
        <div id="chart">
          <div class="loading">
            <div class="loading-spinner"></div>
            <span>جاري تحميل البيانات مع مؤشر ICT...</span>
          </div>
        </div>
        <div class="watermark">XAUUSD</div>
        <div class="price-overlay">
          <div id="current-price" class="current-price price-up">---.--</div>
          <div class="price-change">
            <span id="price-change-badge" class="change-badge change-up">+0.00%</span>
            <span id="price-change-value" style="color: #10b981;">+0.00</span>
          </div>
        </div>
      </div>
      <script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
      <script>
        let chart, candlestickSeries;
        let orderBlockSeries = [];
        let liquidityZoneSeries = [];
        let bosSeries = [];
        let lastPrice = 0;
        let openPrice = 0;
        let showIndicators = ${showIndicators};
        let ictMarkers = [];
        
        function formatPrice(price) {
          return parseFloat(price).toFixed(2);
        }
        
        function updatePriceDisplay(price, prevPrice) {
          const priceEl = document.getElementById('current-price');
          const changeEl = document.getElementById('price-change-value');
          const badgeEl = document.getElementById('price-change-badge');
          
          priceEl.textContent = formatPrice(price);
          
          const isUp = price >= prevPrice;
          priceEl.className = 'current-price ' + (isUp ? 'price-up' : 'price-down');
          
          if (openPrice > 0) {
            const change = price - openPrice;
            const changePercent = ((price - openPrice) / openPrice * 100);
            
            changeEl.textContent = (change >= 0 ? '+' : '') + formatPrice(change);
            changeEl.style.color = change >= 0 ? '#10b981' : '#ef4444';
            
            badgeEl.textContent = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%';
            badgeEl.className = 'change-badge ' + (changePercent >= 0 ? 'change-up' : 'change-down');
          }
        }

        // ========== ICT Indicator - Precise Detection ==========
        
        // كشف Swing High/Low بدقة
        function findSwingPoints(candles, leftBars = 3, rightBars = 3) {
          const swingHighs = [];
          const swingLows = [];
          
          for (let i = leftBars; i < candles.length - rightBars; i++) {
            let isSwingHigh = true;
            let isSwingLow = true;
            
            // فحص الشموع على اليسار واليمين
            for (let j = 1; j <= leftBars; j++) {
              if (candles[i].high <= candles[i - j].high) isSwingHigh = false;
              if (candles[i].low >= candles[i - j].low) isSwingLow = false;
            }
            for (let j = 1; j <= rightBars; j++) {
              if (candles[i].high <= candles[i + j].high) isSwingHigh = false;
              if (candles[i].low >= candles[i + j].low) isSwingLow = false;
            }
            
            if (isSwingHigh) {
              swingHighs.push({ index: i, price: candles[i].high, time: candles[i].time });
            }
            if (isSwingLow) {
              swingLows.push({ index: i, price: candles[i].low, time: candles[i].time });
            }
          }
          
          return { swingHighs, swingLows };
        }
        
        // كشف BOS/MSS بدقة أعلى مع تأكيد كسر حقيقي
        function detectBOS(candles, swingHighs, swingLows) {
          const bosPoints = [];
          const avgRange = getAvgRange(candles, candles.length - 1, 30);
          const minBreak = avgRange * 0.6;
          const minBody = avgRange * 0.7;
          
          // كسر هيكلي صاعد (BOS)
          for (let i = 0; i < swingHighs.length - 1; i++) {
            const sh = swingHighs[i];
            for (let j = sh.index + 1; j < candles.length - 1; j++) {
              const c = candles[j];
              const body = Math.abs(c.close - c.open);
              const broke = c.close > sh.price + minBreak && candles[j - 1].close <= sh.price;
              if (broke && body >= minBody && hasStrongDisplacement(c, avgRange, 0.9, 1.2)) {
                // تأكيد: الشمعة التالية لا تغلق أسفل مستوى الكسر
                const confirm = candles[j + 1].close >= sh.price - minBreak * 0.2;
                if (confirm) {
                  bosPoints.push({
                    time: c.time,
                    startTime: sh.time,
                    price: sh.price,
                    type: 'bullish',
                    breakIndex: j
                  });
                  break;
                }
              }
            }
          }
          
          // كسر هيكلي هابط (MSS)
          for (let i = 0; i < swingLows.length - 1; i++) {
            const sl = swingLows[i];
            for (let j = sl.index + 1; j < candles.length - 1; j++) {
              const c = candles[j];
              const body = Math.abs(c.close - c.open);
              const broke = c.close < sl.price - minBreak && candles[j - 1].close >= sl.price;
              if (broke && body >= minBody && hasStrongDisplacement(c, avgRange, 0.9, 1.2)) {
                // تأكيد: الشمعة التالية لا تغلق أعلى مستوى الكسر
                const confirm = candles[j + 1].close <= sl.price + minBreak * 0.2;
                if (confirm) {
                  bosPoints.push({
                    time: c.time,
                    startTime: sl.time,
                    price: sl.price,
                    type: 'bearish',
                    breakIndex: j
                  });
                  break;
                }
              }
            }
          }
          
          return bosPoints.slice(-2);
        }
        
        // مساعدات لتحسين جودة المناطق
        function getAvgRange(candles, endIndex, lookback = 20) {
          const start = Math.max(0, endIndex - lookback);
          const slice = candles.slice(start, endIndex);
          if (slice.length === 0) return 0;
          return slice.reduce((sum, c) => sum + (c.high - c.low), 0) / slice.length;
        }

        function hasStrongDisplacement(candle, avgRange, bodyMult = 1.1, rangeMult = 1.4) {
          const body = Math.abs(candle.close - candle.open);
          const range = candle.high - candle.low;
          return body >= avgRange * bodyMult && range >= avgRange * rangeMult;
        }

        function isZoneRespected(candles, startIndex, high, low, bars = 12) {
          const height = Math.max(0.0001, high - low);
          const tolerance = height * 0.15;
          for (let k = startIndex; k < Math.min(startIndex + bars, candles.length); k++) {
            if (candles[k].close < low - tolerance) return false;
            if (candles[k].close > high + tolerance) return false;
          }
          return true;
        }

        function isFvgStillOpen(candles, startIndex, high, low, type, bars = 10) {
          for (let k = startIndex; k < Math.min(startIndex + bars, candles.length); k++) {
            if (type === 'bullish' && candles[k].low <= low) return false;
            if (type === 'bearish' && candles[k].high >= high) return false;
          }
          return true;
        }

        function isLevelStillValid(candles, startIndex, level, tolerance, bars = 12) {
          for (let k = startIndex; k < Math.min(startIndex + bars, candles.length); k++) {
            if (Math.abs(candles[k].close - level) > tolerance * 0.8) {
              return false;
            }
          }
          return true;
        }

        // كشف Order Block بدقة (الشمعة الأخيرة قبل الحركة القوية)
        function detectOrderBlocks(candles) {
          const orderBlocks = [];
          
          for (let i = 2; i < candles.length - 3; i++) {
            const c1 = candles[i];
            const c2 = candles[i + 1];
            const c3 = candles[i + 2];
            
            // متوسط حجم الشمعة (Range)
            const avgRange = getAvgRange(candles, i, 20);
            const bodySize = Math.abs(c1.close - c1.open);
            const displacement = hasStrongDisplacement(c2, avgRange, 1.0, 1.3) || hasStrongDisplacement(c3, avgRange, 1.0, 1.3);
            if (avgRange <= 0 || bodySize < avgRange * 0.3 || !displacement) continue;
            
            // Bullish Order Block
            if (c1.close < c1.open) {
              const moveUp = c3.close - c1.low;
              if (moveUp > avgRange * 2.5 && c2.close > c1.high && c3.close > c2.close) {
                let valid = true;
                for (let k = i + 3; k < Math.min(i + 18, candles.length); k++) {
                  if (candles[k].low < c1.close) {
                    valid = false;
                    break;
                  }
                }
                if ((valid || i > candles.length - 25) && isZoneRespected(candles, i + 3, Math.max(c1.open, c1.close), Math.min(c1.open, c1.close), 10)) {
                  orderBlocks.push({
                    startTime: c1.time,
                    endTime: candles[Math.min(i + 14, candles.length - 1)].time,
                    high: Math.max(c1.open, c1.close),
                    low: Math.min(c1.open, c1.close),
                    type: 'bullish',
                    index: i
                  });
                }
              }
            }
            
            // Bearish Order Block
            if (c1.close > c1.open) {
              const moveDown = c1.high - c3.close;
              if (moveDown > avgRange * 2.5 && c2.close < c1.low && c3.close < c2.close) {
                let valid = true;
                for (let k = i + 3; k < Math.min(i + 18, candles.length); k++) {
                  if (candles[k].high > c1.close) {
                    valid = false;
                    break;
                  }
                }
                if ((valid || i > candles.length - 25) && isZoneRespected(candles, i + 3, Math.max(c1.open, c1.close), Math.min(c1.open, c1.close), 10)) {
                  orderBlocks.push({
                    startTime: c1.time,
                    endTime: candles[Math.min(i + 14, candles.length - 1)].time,
                    high: Math.max(c1.open, c1.close),
                    low: Math.min(c1.open, c1.close),
                    type: 'bearish',
                    index: i
                  });
                }
              }
            }
          }
          
          // فلترة التداخل وتقليل الضجيج
          const filtered = filterOverlappingZones(orderBlocks, 10, 0.0005);
          const bullish = filtered.filter(ob => ob.type === 'bullish').slice(-2);
          const bearish = filtered.filter(ob => ob.type === 'bearish').slice(-2);
          return [...bullish, ...bearish];
        }
        
        // كشف FVG (Fair Value Gap) - الفجوات السعرية
        function detectFVG(candles) {
          const fvgZones = [];
          
          for (let i = 1; i < candles.length - 1; i++) {
            const c1 = candles[i - 1];
            const c2 = candles[i];
            const c3 = candles[i + 1];
            const avgRange = getAvgRange(candles, i, 20) || (c1.high - c1.low + c2.high - c2.low + c3.high - c3.low) / 3;
            if (avgRange <= 0) continue;
            const displacement = hasStrongDisplacement(c2, avgRange, 0.9, 1.2);
            if (!displacement) continue;
            
            // Bullish FVG
            if (c3.low > c1.high) {
              const gapSize = c3.low - c1.high;
              if (gapSize > avgRange * 0.5 && isFvgStillOpen(candles, i + 1, c3.low, c1.high, 'bullish', 8)) {
                fvgZones.push({
                  startTime: c1.time,
                  endTime: candles[Math.min(i + 10, candles.length - 1)].time,
                  high: c3.low,
                  low: c1.high,
                  type: 'bullish',
                  index: i
                });
              }
            }
            
            // Bearish FVG
            if (c3.high < c1.low) {
              const gapSize = c1.low - c3.high;
              if (gapSize > avgRange * 0.5 && isFvgStillOpen(candles, i + 1, c1.low, c3.high, 'bearish', 8)) {
                fvgZones.push({
                  startTime: c1.time,
                  endTime: candles[Math.min(i + 10, candles.length - 1)].time,
                  high: c1.low,
                  low: c3.high,
                  type: 'bearish',
                  index: i
                });
              }
            }
          }
          
          const filtered = filterOverlappingZones(fvgZones, 8, 0.0004);
          const bullish = filtered.filter(f => f.type === 'bullish').slice(-2);
          const bearish = filtered.filter(f => f.type === 'bearish').slice(-2);
          return [...bullish, ...bearish];
        }
        
        // كشف مناطق السيولة (EQH/EQL)
        function detectLiquidityZones(candles, swingHighs, swingLows) {
          const liquidityZones = [];
          const last = candles[candles.length - 1];
          const avgRange = candles.slice(Math.max(0, candles.length - 20)).reduce((sum, c) =>
            sum + (c.high - c.low), 0) / Math.min(20, candles.length);
          const tolerance = Math.max(avgRange * 0.2, (last.high - last.low) * 0.0015);
          const minSwingGap = 6;
          
          // Equal Highs (سيولة بيعية)
          for (let i = 0; i < swingHighs.length - 1; i++) {
            for (let j = i + 1; j < swingHighs.length; j++) {
              if (Math.abs(swingHighs[i].price - swingHighs[j].price) < tolerance && (swingHighs[j].index - swingHighs[i].index) >= minSwingGap) {
                const level = (swingHighs[i].price + swingHighs[j].price) / 2;
                if (!isLevelStillValid(candles, swingHighs[j].index, level, tolerance, 10)) continue;
                liquidityZones.push({
                  price: level,
                  startTime: swingHighs[i].time,
                  endTime: candles[candles.length - 1].time,
                  type: 'sell',
                  label: 'EQH'
                });
              }
            }
          }
          
          // Equal Lows (سيولة شرائية)
          for (let i = 0; i < swingLows.length - 1; i++) {
            for (let j = i + 1; j < swingLows.length; j++) {
              if (Math.abs(swingLows[i].price - swingLows[j].price) < tolerance && (swingLows[j].index - swingLows[i].index) >= minSwingGap) {
                const level = (swingLows[i].price + swingLows[j].price) / 2;
                if (!isLevelStillValid(candles, swingLows[j].index, level, tolerance, 10)) continue;
                liquidityZones.push({
                  price: level,
                  startTime: swingLows[i].time,
                  endTime: candles[candles.length - 1].time,
                  type: 'buy',
                  label: 'EQL'
                });
              }
            }
          }
          
          const filtered = filterUniqueLevels(liquidityZones, tolerance * 0.6).slice(-4);
          return filtered;
        }

        // فلترة التداخل بين المناطق لتقليل التشويش
        function filterOverlappingZones(zones, minBars = 8, minHeight = 0.0005) {
          const sorted = [...zones].sort((a, b) => a.index - b.index);
          const result = [];
          for (const z of sorted) {
            const height = Math.abs(z.high - z.low);
            if (height < minHeight) continue;
            const last = result[result.length - 1];
            if (!last) {
              result.push(z);
              continue;
            }
            const barGap = Math.abs(z.index - last.index);
            const priceOverlap = !(z.high < last.low || z.low > last.high);
            if (barGap < minBars && priceOverlap) {
              // احتفظ بالأحدث
              result[result.length - 1] = z;
            } else {
              result.push(z);
            }
          }
          return result;
        }

        // فلترة مستويات السيولة المتقاربة جداً
        function filterUniqueLevels(levels, tolerance) {
          const sorted = [...levels].sort((a, b) => a.price - b.price);
          const unique = [];
          for (const lvl of sorted) {
            const last = unique[unique.length - 1];
            if (!last || Math.abs(lvl.price - last.price) > tolerance) {
              unique.push(lvl);
            }
          }
          return unique;
        }
        
        // كشف سحب السيولة بدقة أعلى (اختراق + رجوع قوي)
        function detectLiquiditySweep(candles, swingHighs, swingLows) {
          const sweeps = [];
          const avgRange = getAvgRange(candles, candles.length - 1, 30);
          const minWick = avgRange * 0.4;
          
          // سحب سيولة من القمم
          for (const sh of swingHighs.slice(-6)) {
            for (let i = sh.index + 1; i < candles.length - 1; i++) {
              const c = candles[i];
              const wick = c.high - Math.max(c.open, c.close);
              const sweep = c.high > sh.price && c.close < sh.price && wick >= minWick;
              if (sweep) {
                // تأكيد: الشمعة التالية لا تغلق فوق القمة
                const confirm = candles[i + 1].close < sh.price;
                if (confirm) {
                  sweeps.push({
                    time: c.time,
                    price: sh.price,
                    sweepPrice: c.high,
                    type: 'bearish'
                  });
                  break;
                }
              }
            }
          }
          
          // سحب سيولة من القيعان
          for (const sl of swingLows.slice(-6)) {
            for (let i = sl.index + 1; i < candles.length - 1; i++) {
              const c = candles[i];
              const wick = Math.min(c.open, c.close) - c.low;
              const sweep = c.low < sl.price && c.close > sl.price && wick >= minWick;
              if (sweep) {
                const confirm = candles[i + 1].close > sl.price;
                if (confirm) {
                  sweeps.push({
                    time: c.time,
                    price: sl.price,
                    sweepPrice: c.low,
                    type: 'bullish'
                  });
                  break;
                }
              }
            }
          }
          
          return sweeps.slice(-2);
        }
        
        // رسم مؤشرات ICT على الرسم البياني - نسخة محسنة بدون تداخل
        function drawICTIndicators(candles) {
          if (!showIndicators || !candlestickSeries) return;
          
          ictMarkers = [];
          
          // كشف Swing Points
          const { swingHighs, swingLows } = findSwingPoints(candles, 3, 3);
          
          // كشف BOS
          const bosPoints = detectBOS(candles, swingHighs, swingLows);
          
          // كشف Order Blocks
          const orderBlocks = detectOrderBlocks(candles);
          
          // كشف FVG
          const fvgZones = detectFVG(candles);
          
          // كشف مناطق السيولة
          const liquidityZones = detectLiquidityZones(candles, swingHighs, swingLows);
          
          // كشف سحب السيولة
          const sweeps = detectLiquiditySweep(candles, swingHighs, swingLows);
          
          // ========== رسم Order Blocks - مستطيل واضح ==========
          orderBlocks.forEach((ob, idx) => {
            const obColor = ob.type === 'bullish' ? '#10b981' : '#ef4444';
            
            // رسم خطين أفقيين فقط (علوي وسفلي) لتشكيل مستطيل واضح
            const obTopLine = chart.addLineSeries({
              color: obColor,
              lineWidth: 2,
              lineStyle: 0,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            obTopLine.setData([
              { time: ob.startTime, value: ob.high },
              { time: ob.endTime, value: ob.high }
            ]);
            orderBlockSeries.push(obTopLine);
            
            const obBottomLine = chart.addLineSeries({
              color: obColor,
              lineWidth: 2,
              lineStyle: 0,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            obBottomLine.setData([
              { time: ob.startTime, value: ob.low },
              { time: ob.endTime, value: ob.low }
            ]);
            orderBlockSeries.push(obBottomLine);
            
            // خط عمودي يسار (بداية المستطيل)
            const obLeftLine = chart.addLineSeries({
              color: obColor,
              lineWidth: 2,
              lineStyle: 0,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            obLeftLine.setData([
              { time: ob.startTime, value: ob.low },
              { time: ob.startTime, value: ob.high }
            ]);
            orderBlockSeries.push(obLeftLine);
            
            // خط عمودي يمين (نهاية المستطيل)
            const obRightLine = chart.addLineSeries({
              color: obColor,
              lineWidth: 2,
              lineStyle: 0,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            obRightLine.setData([
              { time: ob.endTime, value: ob.low },
              { time: ob.endTime, value: ob.high }
            ]);
            orderBlockSeries.push(obRightLine);
            
            // علامة OB فوق المستطيل للصاعد، أسفله للهابط
            ictMarkers.push({
              time: ob.startTime,
              position: ob.type === 'bullish' ? 'belowBar' : 'aboveBar',
              color: obColor,
              shape: 'square',
              text: 'OB'
            });
          });
          
          // ========== رسم FVG - مستطيل واضح ==========
          fvgZones.forEach((fvg, idx) => {
            const fvgColor = fvg.type === 'bullish' ? '#3b82f6' : '#f97316';
            
            // خط علوي
            const fvgTopLine = chart.addLineSeries({
              color: fvgColor,
              lineWidth: 2,
              lineStyle: 0,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            fvgTopLine.setData([
              { time: fvg.startTime, value: fvg.high },
              { time: fvg.endTime, value: fvg.high }
            ]);
            orderBlockSeries.push(fvgTopLine);
            
            // خط سفلي
            const fvgBottomLine = chart.addLineSeries({
              color: fvgColor,
              lineWidth: 2,
              lineStyle: 0,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            fvgBottomLine.setData([
              { time: fvg.startTime, value: fvg.low },
              { time: fvg.endTime, value: fvg.low }
            ]);
            orderBlockSeries.push(fvgBottomLine);
            
            // خط عمودي يسار
            const fvgLeftLine = chart.addLineSeries({
              color: fvgColor,
              lineWidth: 2,
              lineStyle: 0,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            fvgLeftLine.setData([
              { time: fvg.startTime, value: fvg.low },
              { time: fvg.startTime, value: fvg.high }
            ]);
            orderBlockSeries.push(fvgLeftLine);
            
            // خط عمودي يمين
            const fvgRightLine = chart.addLineSeries({
              color: fvgColor,
              lineWidth: 2,
              lineStyle: 0,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            fvgRightLine.setData([
              { time: fvg.endTime, value: fvg.low },
              { time: fvg.endTime, value: fvg.high }
            ]);
            orderBlockSeries.push(fvgRightLine);
            
            // علامة FVG
            ictMarkers.push({
              time: fvg.startTime,
              position: fvg.type === 'bullish' ? 'belowBar' : 'aboveBar',
              color: fvgColor,
              shape: 'square',
              text: 'FVG'
            });
          });
          
          // ========== رسم BOS/MSS - خط أفقي واضح ==========
          bosPoints.forEach(bos => {
            const bosColor = bos.type === 'bullish' ? '#22c55e' : '#f43f5e';
            
            // خط BOS الأفقي
            const bosLine = chart.addLineSeries({
              color: bosColor,
              lineWidth: 2,
              lineStyle: 0,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            bosLine.setData([
              { time: bos.startTime, value: bos.price },
              { time: bos.time, value: bos.price }
            ]);
            bosSeries.push(bosLine);
            
            // علامة BOS/MSS - فوق الخط للصاعد، أسفل الخط للهابط
            ictMarkers.push({
              time: bos.time,
              position: bos.type === 'bullish' ? 'aboveBar' : 'belowBar',
              color: bosColor,
              shape: 'arrowUp',
              text: bos.type === 'bullish' ? 'BOS' : 'MSS'
            });
          });
          
          // ========== رسم مناطق السيولة ==========
          liquidityZones.forEach(zone => {
            const liqColor = zone.type === 'buy' ? '#a855f7' : '#ec4899';
            
            // خط السيولة
            const liqLine = chart.addLineSeries({
              color: liqColor,
              lineWidth: 1,
              lineStyle: 2,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            liqLine.setData([
              { time: zone.startTime, value: zone.price },
              { time: zone.endTime, value: zone.price }
            ]);
            liquidityZoneSeries.push(liqLine);
            
            // علامة السيولة - أسفل الخط للشرائية، فوق الخط للبيعية
            ictMarkers.push({
              time: zone.startTime,
              position: zone.type === 'buy' ? 'belowBar' : 'aboveBar',
              color: liqColor,
              shape: 'circle',
              text: zone.label
            });
          });
          
          // ========== رسم سحب السيولة ==========
          sweeps.forEach(sweep => {
            const sweepColor = '#f59e0b';
            
            // خط سحب السيولة الأفقي
            const sweepLine = chart.addLineSeries({
              color: sweepColor,
              lineWidth: 2,
              lineStyle: 2,
              priceScaleId: 'right',
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            
            const sweepStartTime = sweep.time - (60 * 60 * 2);
            sweepLine.setData([
              { time: sweepStartTime, value: sweep.price },
              { time: sweep.time, value: sweep.price }
            ]);
            liquidityZoneSeries.push(sweepLine);
            
            // علامة سحب السيولة - أسفل الخط للصاعد، فوق الخط للهابط
            ictMarkers.push({
              time: sweep.time,
              position: sweep.type === 'bullish' ? 'belowBar' : 'aboveBar',
              color: sweepColor,
              shape: 'diamond',
              text: 'SWEEP'
            });
          });
          
          // تطبيق العلامات
          if (ictMarkers.length > 0) {
            candlestickSeries.setMarkers(ictMarkers);
          }
        }
        
        // تبديل عرض المؤشرات
        window.__TOGGLE_INDICATORS__ = function(show) {
          showIndicators = show;
          
          // إزالة المؤشرات القديمة
          orderBlockSeries.forEach(s => { try { chart.removeSeries(s); } catch(e) {} });
          bosSeries.forEach(s => { try { chart.removeSeries(s); } catch(e) {} });
          liquidityZoneSeries.forEach(s => { try { chart.removeSeries(s); } catch(e) {} });
          
          orderBlockSeries = [];
          bosSeries = [];
          liquidityZoneSeries = [];
          
          if (show && window.__CANDLE_DATA__) {
            drawICTIndicators(window.__CANDLE_DATA__);
          } else {
            candlestickSeries.setMarkers([]);
          }
        };
        
        function updateOHLC(candle) {}
        
        try {
          const chartContainer = document.getElementById('chart');
          chartContainer.innerHTML = '';
          
          chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth || window.innerWidth,
            height: chartContainer.clientHeight || window.innerHeight,
            layout: {
              background: { type: 'solid', color: '#0a0e14' },
              textColor: '#6b7280',
              fontSize: 12,
            },
            grid: {
              vertLines: { color: 'rgba(55, 65, 81, 0.3)', style: 1 },
              horzLines: { color: 'rgba(55, 65, 81, 0.3)', style: 1 },
            },
            crosshair: {
              mode: LightweightCharts.CrosshairMode.Normal,
              vertLine: {
                color: 'rgba(16, 185, 129, 0.5)',
                width: 1,
                style: 2,
                labelBackgroundColor: '#10b981',
              },
              horzLine: {
                color: 'rgba(16, 185, 129, 0.5)',
                width: 1,
                style: 2,
                labelBackgroundColor: '#10b981',
              },
            },
            rightPriceScale: {
              borderColor: 'rgba(55, 65, 81, 0.5)',
              visible: true,
              scaleMargins: { top: 0.1, bottom: 0.15 },
              borderVisible: false,
            },
            timeScale: {
              borderColor: 'rgba(55, 65, 81, 0.5)',
              timeVisible: true,
              secondsVisible: false,
              borderVisible: false,
              rightOffset: 15,
              barSpacing: 10,
              minBarSpacing: 5,
            },
            handleScroll: {
              mouseWheel: true,
              pressedMouseMove: true,
              horzTouchDrag: true,
              vertTouchDrag: false,
            },
            handleScale: {
              axisPressedMouseMove: true,
              mouseWheel: true,
              pinch: true,
            },
          });

          candlestickSeries = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981',
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
          });

          const timeframe = '${selectedTimeframe}';
          const candleCount = timeframe === '5m' ? 300 : timeframe === '15m' ? 200 : timeframe === '1h' ? 150 : 100;
          const apiUrl = 'https://ict-ai-trader-production.up.railway.app/api/analysis/candles/XAUUSD/' + timeframe + '?count=' + candleCount;
          
          fetch(apiUrl)
            .then(r => r.json())
            .then(data => {
              if (data.candles && data.candles.length > 0) {
                const formattedData = data.candles.map(c => ({
                  time: Math.floor(new Date(c.time).getTime() / 1000),
                  open: parseFloat(c.open),
                  high: parseFloat(c.high),
                  low: parseFloat(c.low),
                  close: parseFloat(c.close)
                })).sort((a, b) => a.time - b.time);
                
                window.__CANDLE_DATA__ = formattedData;
                
                candlestickSeries.setData(formattedData);
                chart.timeScale().fitContent();
                
                if (formattedData.length > 0) {
                  openPrice = formattedData[0].open;
                  const lastCandle = formattedData[formattedData.length - 1];
                  lastPrice = lastCandle.close;
                  updatePriceDisplay(lastCandle.close, lastCandle.open);
                  updateOHLC(lastCandle);
                }
                
                // رسم مؤشرات ICT
                drawICTIndicators(formattedData);
                
                chart.subscribeCrosshairMove(param => {
                  if (param.time && param.seriesData) {
                    const candle = param.seriesData.get(candlestickSeries);
                    if (candle) {
                      updateOHLC(candle);
                    }
                  }
                });
                
                // تحديث السعر
                const timeframeSeconds = timeframe === '5m' ? 300 : timeframe === '15m' ? 900 : timeframe === '1h' ? 3600 : 14400;
                const lastLoadedCandle = formattedData[formattedData.length - 1];
                let currentCandleTime = lastLoadedCandle.time;
                let currentCandle = { ...lastLoadedCandle };
                
                setInterval(() => {
                  fetch('https://ict-ai-trader-production.up.railway.app/api/analysis/price/XAUUSD')
                    .then(r => r.json())
                    .then(priceData => {
                      if (priceData.price) {
                        const price = parseFloat(priceData.price);
                        const prevPrice = lastPrice;
                        lastPrice = price;
                        
                        updatePriceDisplay(price, prevPrice);
                        
                        const now = Math.floor(Date.now() / 1000);
                        const candleTime = Math.floor(now / timeframeSeconds) * timeframeSeconds;
                        
                        if (candleTime > currentCandleTime) {
                          currentCandleTime = candleTime;
                          currentCandle = {
                            time: candleTime,
                            open: price,
                            high: price,
                            low: price,
                            close: price
                          };
                        } else {
                          currentCandle.close = price;
                          currentCandle.high = Math.max(currentCandle.high, price);
                          currentCandle.low = Math.min(currentCandle.low, price);
                        }
                        
                        candlestickSeries.update(currentCandle);
                      }
                    }).catch(() => {});
                }, 2000);
              }
            })
            .catch(err => {
              console.error('Chart error:', err);
              chartContainer.innerHTML = '<div class="loading" style="color:#ef4444;">خطأ في تحميل البيانات</div>';
            });

          window.__FIT_CONTENT__ = () => {
            if (chart) chart.timeScale().fitContent();
          };

          window.__SCROLL_TO_REALTIME__ = () => {
            if (chart) chart.timeScale().scrollToRealTime();
          };

          window.addEventListener('resize', () => {
            chart.resize(chartContainer.clientWidth || window.innerWidth, chartContainer.clientHeight || window.innerHeight);
          });
        } catch(e) {
          console.error('Chart init error:', e);
          document.getElementById('chart').innerHTML = '<div class="loading" style="color:#ef4444;">خطأ في تهيئة الشارت</div>';
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Top Toolbar */}
      <View style={styles.topToolbar}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.symbolInfo}>
          <Text style={styles.symbolText}>XAUUSD</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        
      </View>
      
      {/* Timeframe Selector */}
      <View style={styles.timeframeBar}>
        {(['5m', '15m', '1h', '4h'] as const).map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[
              styles.timeframeButton,
              selectedTimeframe === tf && styles.timeframeButtonActive,
            ]}
            onPress={() => setSelectedTimeframe(tf)}
          >
            <Text
              style={[
                styles.timeframeText,
                selectedTimeframe === tf && styles.timeframeTextActive,
              ]}
            >
              {tf}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Full Screen Chart */}
      <View style={styles.chartContainer}>
        <WebView
          key={`${selectedTimeframe}-${showIndicators}`}
          source={{ html: chartHtml }}
          style={styles.chart}
          ref={chartWebViewRef}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          originWhitelist={['*']}
          mixedContentMode="always"
          androidLayerType="hardware"
        />
      </View>
      
      {/* Bottom Toolbar */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity style={styles.toolButton} onPress={handleGoToRealTime}>
          <Ionicons name="locate-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.toolText}>Live</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.toolButton, styles.ictButton]}
          onPress={toggleIndicators}
        >
          <Ionicons 
            name="analytics-outline" 
            size={18} 
            color={showIndicators ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.toolText, showIndicators && { color: colors.primary }]}>
            ICT
          </Text>
        </TouchableOpacity>
        
        <View style={styles.ictBadge}>
          <Text style={styles.ictBadgeText}>ICT AI</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e14',
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 42,
    paddingBottom: 8,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbolText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  liveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  indicatorButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorButtonActive: {
    backgroundColor: colors.primary + '30',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  timeframeBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: colors.card,
  },
  timeframeButtonActive: {
    backgroundColor: colors.primary + '30',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  timeframeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: colors.primary,
  },
  chartContainer: {
    flex: 1,
  },
  chart: {
    flex: 1,
    backgroundColor: '#0a0e14',
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 20,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    gap: 8,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  toolText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  ictButton: {
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  ictBadge: {
    flex: 1,
    alignItems: 'flex-end',
  },
  ictBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default FullChartScreen;
