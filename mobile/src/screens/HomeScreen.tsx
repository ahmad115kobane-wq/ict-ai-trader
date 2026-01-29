// src/screens/HomeScreen.tsx
// الشاشة الرئيسية - الشارت والتحليل التلقائي

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import { useAuth } from '../context/AuthContext';
import { analysisService, subscriptionService } from '../services/apiService';
import { colors, spacing, borderRadius, fontSizes } from '../theme';
import { Analysis } from '../types';
import { API_BASE_URL } from '../config/api';
import Header from '../components/Header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HomeScreen = () => {
  const { user, refreshUser, logout } = useAuth();
  const chartWebViewRef = useRef<WebView>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [latestAnalysis, setLatestAnalysis] = useState<Analysis | null>(null);
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isChartInteracting, setIsChartInteracting] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'5m' | '1h'>('5m');
  const [chartHigh, setChartHigh] = useState(0);
  const [chartLow, setChartLow] = useState(0);

  useEffect(() => {
    fetchData();
    // تحديث السعر كل 3 ثواني
    const priceInterval = setInterval(fetchCurrentPrice, 3000);
    // تحديث البيانات الكاملة كل 30 ثانية
    const dataInterval = setInterval(fetchPriceAndAnalysis, 30000);
    return () => {
      clearInterval(priceInterval);
      clearInterval(dataInterval);
    };
  }, []);

  useEffect(() => {
    if (user) {
      setAutoAnalysisEnabled(user.autoAnalysisEnabled || false);
    }
  }, [user]);

  const fetchCurrentPrice = async () => {
    try {
      const priceData = await analysisService.getCurrentPrice('XAUUSD');
      if (priceData.price) {
        setCurrentPrice(priceData.price);
      }
    } catch (error) {
      // تجاهل أخطاء تحديث السعر
    }
  };

  const fetchData = async () => {
    await Promise.all([
      fetchPriceAndAnalysis(),
      refreshUser(),
    ]);
  };

  const fetchPriceAndAnalysis = async () => {
    try {
      // جلب السعر الحالي
      const priceData = await analysisService.getCurrentPrice('XAUUSD');
      if (priceData.price) {
        setCurrentPrice(priceData.price);
      }

      // جلب بيانات الشموع للشارت
      const candlesData = await analysisService.getCandles('XAUUSD', selectedTimeframe, 250);
      if (candlesData.candles && candlesData.candles.length > 0) {
        const highs = candlesData.candles.map((c: any) => c.high);
        const lows = candlesData.candles.map((c: any) => c.low);
        setChartHigh(Math.max(...highs));
        setChartLow(Math.min(...lows));
      }

      // جلب آخر تحليل
      const analysisData = await analysisService.getLatestAuto();
      if (analysisData.success && analysisData.analysis) {
        setLatestAnalysis(analysisData.analysis);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const handleToggleAutoAnalysis = async (value: boolean) => {
    if (value && !user?.subscriptionStatus?.hasActiveSubscription) {
      Alert.alert(
        'اشتراك مطلوب',
        'يجب أن يكون لديك اشتراك نشط لتفعيل التحليل التلقائي',
        [{ text: 'حسناً' }]
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await analysisService.toggleAutoAnalysis(value);
      if (result.success) {
        setAutoAnalysisEnabled(value);
        await refreshUser();
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.message || 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

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

  // HTML للشارت المباشر - تصميم احترافي مثل التطبيقات العالمية
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
          background: linear-gradient(180deg, #0a0e14 0%, #0d1117 100%); 
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
          font-size: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
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
          top: 8px;
          left: 8px;
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
          gap: 6px;
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
        .change-up { 
          background: rgba(16, 185, 129, 0.2); 
          color: #10b981; 
        }
        .change-down { 
          background: rgba(239, 68, 68, 0.2); 
          color: #ef4444; 
        }
        .ohlc-info {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 100;
          text-align: right;
          font-size: 11px;
          color: #6b7280;
          pointer-events: none;
        }
        .ohlc-row {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-bottom: 2px;
        }
        .ohlc-label { color: #9ca3af; }
        .ohlc-value { font-weight: 600; font-family: 'SF Mono', monospace; }
        .ohlc-open { color: #f59e0b; }
        .ohlc-high { color: #10b981; }
        .ohlc-low { color: #ef4444; }
        .ohlc-close { color: #3b82f6; }
        .watermark {
          position: absolute;
          bottom: 50%;
          left: 50%;
          transform: translate(-50%, 50%);
          font-size: 48px;
          font-weight: 800;
          color: rgba(255,255,255,0.03);
          pointer-events: none;
          letter-spacing: 4px;
        }
        .timeframe-badge {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(16, 185, 129, 0.3);
          z-index: 100;
        }
        .volume-info {
          position: absolute;
          bottom: 8px;
          right: 8px;
          font-size: 11px;
          color: #6b7280;
          z-index: 100;
        }
      </style>
    </head>
    <body>
      <div id="chart-container">
        <div id="chart">
          <div class="loading">
            <div class="loading-spinner"></div>
            <span>جاري تحميل البيانات...</span>
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
        <div class="ohlc-info">
          <div class="ohlc-row">
            <span><span class="ohlc-label">O</span> <span id="ohlc-o" class="ohlc-value ohlc-open">---</span></span>
            <span><span class="ohlc-label">H</span> <span id="ohlc-h" class="ohlc-value ohlc-high">---</span></span>
          </div>
          <div class="ohlc-row">
            <span><span class="ohlc-label">L</span> <span id="ohlc-l" class="ohlc-value ohlc-low">---</span></span>
            <span><span class="ohlc-label">C</span> <span id="ohlc-c" class="ohlc-value ohlc-close">---</span></span>
          </div>
        </div>
        <div class="timeframe-badge">${selectedTimeframe === '5m' ? '5 دقائق' : 'ساعة'}</div>
        <div class="volume-info" id="volume-info">250 شمعة</div>
      </div>
      <script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
      <script>
        let chart, candlestickSeries, volumeSeries;
        let lastPrice = 0;
        let openPrice = 0;
        
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
        
        function updateOHLC(candle) {
          document.getElementById('ohlc-o').textContent = formatPrice(candle.open);
          document.getElementById('ohlc-h').textContent = formatPrice(candle.high);
          document.getElementById('ohlc-l').textContent = formatPrice(candle.low);
          document.getElementById('ohlc-c').textContent = formatPrice(candle.close);
        }
        
        try {
          const chartContainer = document.getElementById('chart');
          chartContainer.innerHTML = '';
          
          chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth || window.innerWidth,
            height: chartContainer.clientHeight || window.innerHeight,
            layout: {
              background: { type: 'solid', color: 'transparent' },
              textColor: '#6b7280',
              fontSize: 11,
            },
            grid: {
              vertLines: { color: 'rgba(55, 65, 81, 0.4)', style: 1 },
              horzLines: { color: 'rgba(55, 65, 81, 0.4)', style: 1 },
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
              scaleMargins: { top: 0.15, bottom: 0.2 },
              borderVisible: false,
            },
            timeScale: {
              borderColor: 'rgba(55, 65, 81, 0.5)',
              timeVisible: true,
              secondsVisible: false,
              borderVisible: false,
              rightOffset: 10,
              barSpacing: 7,
              minBarSpacing: 4,
              lockVisibleTimeRangeOnResize: true,
              fixLeftEdge: true,
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

          // خط السعر الحالي
          candlestickSeries.createPriceLine({
            price: 0,
            color: 'transparent',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: false,
          });

          const timeframe = '${selectedTimeframe}';
          const apiUrl = 'https://ict-ai-trader-production.up.railway.app/api/analysis/candles/XAUUSD/' + timeframe + '?count=250';
          
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
                
                candlestickSeries.setData(formattedData);
                chart.timeScale().fitContent();
                
                // تعيين السعر الافتتاحي
                if (formattedData.length > 0) {
                  openPrice = formattedData[0].open;
                  const lastCandle = formattedData[formattedData.length - 1];
                  lastPrice = lastCandle.close;
                  updatePriceDisplay(lastCandle.close, lastCandle.open);
                  updateOHLC(lastCandle);
                }
                
                document.getElementById('volume-info').textContent = formattedData.length + ' شمعة';
                
                // تحديث عند تمرير المؤشر
                chart.subscribeCrosshairMove(param => {
                  if (param.time && param.seriesData) {
                    const candle = param.seriesData.get(candlestickSeries);
                    if (candle) {
                      updateOHLC(candle);
                    }
                  }
                });
                
                // متغيرات لتتبع الشمعة الحالية
                const timeframeSeconds = timeframe === '5m' ? 300 : 3600; // 5 دقائق أو ساعة
                const lastLoadedCandle = formattedData[formattedData.length - 1];
                let currentCandleTime = lastLoadedCandle.time;
                let currentCandle = { ...lastLoadedCandle };
                
                // تحديث السعر كل 2 ثانية
                setInterval(() => {
                  fetch('https://ict-ai-trader-production.up.railway.app/api/analysis/price/XAUUSD')
                    .then(r => r.json())
                    .then(priceData => {
                      if (priceData.price) {
                        const price = parseFloat(priceData.price);
                        const prevPrice = lastPrice;
                        lastPrice = price;
                        
                        updatePriceDisplay(price, prevPrice);
                        
                        // حساب وقت الشمعة الحالية بناءً على الإطار الزمني
                        const now = Math.floor(Date.now() / 1000);
                        const candleTime = Math.floor(now / timeframeSeconds) * timeframeSeconds;
                        
                        // إذا كان وقت الشمعة الجديدة أكبر من الشمعة الحالية
                        if (candleTime > currentCandleTime) {
                          // شمعة جديدة
                          currentCandleTime = candleTime;
                          currentCandle = {
                            time: candleTime,
                            open: price,
                            high: price,
                            low: price,
                            close: price
                          };
                        } else {
                          // تحديث الشمعة الحالية (نفس الوقت أو تحديث للشمعة المحملة)
                          currentCandle.close = price;
                          currentCandle.high = Math.max(currentCandle.high, price);
                          currentCandle.low = Math.min(currentCandle.low, price);
                        }
                        
                        // تحديث الشمعة في الرسم
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
            if (chart) {
              chart.timeScale().fitContent();
            }
          };

          window.__SCROLL_TO_REALTIME__ = () => {
            if (chart) {
              chart.timeScale().scrollToRealTime();
            }
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

  const getScoreColor = (score: number) => {
    if (score >= 7) return colors.success;
    if (score >= 5) return colors.warning;
    return colors.error;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <Header 
        coins={user?.coins || 0}
        onLogout={() => {
          Alert.alert(
            'تسجيل الخروج',
            'هل أنت متأكد من تسجيل الخروج؟',
            [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'تسجيل الخروج', onPress: logout, style: 'destructive' }
            ]
          );
        }}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            enabled={!isChartInteracting}
          />
        }
      >
        {/* Symbol Selector */}
        <View style={styles.symbolRow}>
          <TouchableOpacity style={styles.symbolBadge}>
            <Text style={styles.symbolText}>XAUUSD</Text>
          </TouchableOpacity>
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeRow}>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              selectedTimeframe === '5m' && styles.timeframeButtonActive,
            ]}
            onPress={() => setSelectedTimeframe('5m')}
          >
            <Text
              style={[
                styles.timeframeText,
                selectedTimeframe === '5m' && styles.timeframeTextActive,
              ]}
            >
              5m
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              selectedTimeframe === '1h' && styles.timeframeButtonActive,
            ]}
            onPress={() => setSelectedTimeframe('1h')}
          >
            <Text
              style={[
                styles.timeframeText,
                selectedTimeframe === '1h' && styles.timeframeTextActive,
              ]}
            >
              1h
            </Text>
          </TouchableOpacity>

          <View style={styles.aiStatus}>
            <View style={styles.aiDot} />
            <Text style={styles.aiText}>ICT AI</Text>
          </View>
        </View>

        {/* Professional Chart */}
        <View
          style={styles.chartContainer}
          onTouchStart={() => setIsChartInteracting(true)}
          onTouchEnd={() => setIsChartInteracting(false)}
          onTouchCancel={() => setIsChartInteracting(false)}
        >
          <View style={styles.chartToolbar}>
            <View style={styles.chartToolbarLeft}>
              <View style={styles.symbolPill}>
                <View style={styles.symbolDot} />
                <Text style={styles.symbolPillText}>XAUUSD</Text>
              </View>
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <View style={styles.chartToolbarRight}>
              <TouchableOpacity style={styles.chartToolButton} onPress={handleFitChart}>
                <Ionicons name="scan-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.chartToolButton} onPress={handleGoToRealTime}>
                <Ionicons name="locate-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.chartToolButton}>
                <Ionicons name="expand-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.chartToolButton}>
                <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.chartWrapper}>
            <WebView
              key={selectedTimeframe}
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

          {/* Chart Footer */}
          <View style={styles.chartFooter}>
            <View style={styles.chartFooterLeft}>
              <View style={styles.autoAnalysisDot} />
              <Text style={styles.autoAnalysisText}>AUTO ANALYSIS</Text>
            </View>
            <View style={styles.chartFooterRight}>
              <Ionicons name="analytics-outline" size={14} color={colors.primary} />
              <Text style={styles.chartFooterText}>TradingView Data</Text>
            </View>
          </View>
        </View>

        {/* Auto Analysis Toggle */}
        <View style={styles.autoAnalysisCard}>
          <View style={styles.autoAnalysisRow}>
            <Switch
              value={autoAnalysisEnabled}
              onValueChange={handleToggleAutoAnalysis}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
              disabled={isLoading}
            />
            <View style={styles.autoAnalysisInfo}>
              <Text style={styles.autoAnalysisTitle}>
                استقبال تحاليل الخادم التلقائية
              </Text>
              <View style={styles.subscriptionBadge}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text style={styles.subscriptionBadgeText}>
                  {user?.subscriptionStatus?.subscription?.packageNameAr || 'الحزمة الاسبوعية'}
                </Text>
              </View>
            </View>
            <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
          </View>
          
          <View style={[
            styles.connectionStatus,
            { backgroundColor: autoAnalysisEnabled ? colors.primary + '20' : colors.error + '20' }
          ]}>
            <Ionicons 
              name={autoAnalysisEnabled ? "checkmark-circle" : "close-circle"} 
              size={18} 
              color={autoAnalysisEnabled ? colors.primary : colors.error} 
            />
            <Text style={[
              styles.connectionText,
              { color: autoAnalysisEnabled ? colors.primary : colors.error }
            ]}>
              {autoAnalysisEnabled ? 'متصل بالخادم' : 'متوقف'}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  symbolRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  symbolBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-end',
  },
  symbolText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
    textAlign: 'right',
  },
  timeframeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  timeframeButton: {
    backgroundColor: 'rgba(55, 65, 81, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 50,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.primary,
  },
  timeframeText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  timeframeTextActive: {
    color: colors.primary,
  },
  aiStatus: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginRight: 'auto',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  aiText: {
    color: colors.text,
    fontSize: fontSizes.sm,
  },
  chartContainer: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: '#0a0e14',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chartToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
    backgroundColor: 'rgba(13, 17, 23, 0.8)',
  },
  chartToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chartToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  symbolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  symbolDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  symbolPillText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  liveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  chartToolButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(55, 65, 81, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chartInfo: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  barsInfo: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  chartWrapper: {
    height: 320,
    position: 'relative',
    backgroundColor: '#0a0e14',
  },
  chart: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.3)',
    backgroundColor: 'rgba(13, 17, 23, 0.6)',
  },
  chartFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chartFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartFooterText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  priceTag: {
    position: 'absolute',
    right: 0,
    top: '40%',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopLeftRadius: borderRadius.sm,
    borderBottomLeftRadius: borderRadius.sm,
  },
  priceText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  autoAnalysisDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  autoAnalysisText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  autoAnalysisCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  autoAnalysisRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoAnalysisInfo: {
    flex: 1,
    marginHorizontal: spacing.md,
    alignItems: 'flex-start',
  },
  autoAnalysisTitle: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '500',
    textAlign: 'left',
  },
  subscriptionBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  subscriptionBadgeText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: '500',
  },
  connectionStatus: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  connectionText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    textAlign: 'right',
  },
  bottomSpacer: {
    height: 100, // مسافة إضافية لشريط التنقل العائم
  },
});

export default HomeScreen;
