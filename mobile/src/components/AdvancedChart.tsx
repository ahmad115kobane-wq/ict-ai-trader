// src/components/AdvancedChart.tsx
// رسم بياني متقدم مع السبريد والصفقات

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Position {
  id: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  floatingPnl: number;
}

interface AdvancedChartProps {
  timeframe: '5m' | '1h';
  currentPrice: number;
  positions: Position[];
  onPositionUpdate?: (positionId: string, stopLoss: number, takeProfit: number) => void;
}

const SPREAD = 0.50; // سبريد 0.50

const AdvancedChart: React.FC<AdvancedChartProps> = ({
  timeframe,
  currentPrice,
  positions,
  onPositionUpdate,
}) => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // تحديث الصفقات في الرسم البياني
    if (webViewRef.current && positions.length > 0) {
      const positionsJson = JSON.stringify(positions);
      webViewRef.current.injectJavaScript(`
        window.__UPDATE_POSITIONS__ && window.__UPDATE_POSITIONS__(${positionsJson});
        true;
      `);
    }
  }, [positions]);

  useEffect(() => {
    // تحديث السعر
    if (webViewRef.current && currentPrice > 0) {
      webViewRef.current.injectJavaScript(`
        window.__UPDATE_PRICE__ && window.__UPDATE_PRICE__(${currentPrice});
        true;
      `);
    }
  }, [currentPrice]);

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
        .spread-info {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          z-index: 100;
          display: flex;
          gap: 8px;
        }
        .spread-label { color: #9ca3af; }
        .position-marker {
          position: absolute;
          background: rgba(16, 185, 129, 0.9);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          pointer-events: auto;
          cursor: pointer;
          z-index: 200;
          white-space: nowrap;
        }
        .position-marker.sell {
          background: rgba(239, 68, 68, 0.9);
        }
        .position-marker:hover {
          transform: scale(1.1);
        }
      </style>
    </head>
    <body>
      <div id="chart-container">
        <div id="chart"></div>
        <div class="spread-info">
          <span class="spread-label">Spread:</span>
          <span id="spread-value">${SPREAD.toFixed(2)}</span>
          <span class="spread-label">|</span>
          <span id="bid-price">Bid: ---</span>
          <span class="spread-label">|</span>
          <span id="ask-price">Ask: ---</span>
        </div>
      </div>
      <script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
      <script>
        const SPREAD = ${SPREAD};
        let chart, candlestickSeries;
        let currentPositions = [];
        let priceLines = {};
        let positionMarkers = {};
        
        function formatPrice(price) {
          return parseFloat(price).toFixed(2);
        }
        
        function updateSpreadDisplay(midPrice) {
          const bid = midPrice - (SPREAD / 2);
          const ask = midPrice + (SPREAD / 2);
          document.getElementById('bid-price').textContent = 'Bid: ' + formatPrice(bid);
          document.getElementById('ask-price').textContent = 'Ask: ' + formatPrice(ask);
        }
        
        function createPositionLines(position) {
          // خط الدخول
          const entryLine = candlestickSeries.createPriceLine({
            price: position.entryPrice,
            color: position.side === 'BUY' ? '#10b981' : '#ef4444',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: position.side + ' ' + position.lotSize.toFixed(2),
          });
          
          // خط SL
          const slLine = candlestickSeries.createPriceLine({
            price: position.stopLoss,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'SL',
          });
          
          // خط TP
          const tpLine = candlestickSeries.createPriceLine({
            price: position.takeProfit,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'TP',
          });
          
          priceLines[position.id] = { entryLine, slLine, tpLine };
          
          // إضافة علامة الربح/الخسارة
          createPositionMarker(position);
        }
        
        function createPositionMarker(position) {
          const marker = document.createElement('div');
          marker.className = 'position-marker ' + (position.side === 'BUY' ? 'buy' : 'sell');
          marker.id = 'marker-' + position.id;
          
          const pnlText = position.floatingPnl >= 0 ? '+' : '';
          marker.innerHTML = position.side + ' ' + position.lotSize.toFixed(2) + ' | ' + pnlText + position.floatingPnl.toFixed(2) + '$';
          
          marker.style.color = position.floatingPnl >= 0 ? '#10b981' : '#ef4444';
          
          // وضع العلامة بجانب خط الدخول
          marker.style.top = '50%';
          marker.style.right = '10px';
          
          marker.onclick = () => {
            // إرسال رسالة للتطبيق لتعديل الصفقة
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'editPosition',
              positionId: position.id
            }));
          };
          
          document.getElementById('chart-container').appendChild(marker);
          positionMarkers[position.id] = marker;
        }
        
        function removePositionLines(positionId) {
          if (priceLines[positionId]) {
            candlestickSeries.removePriceLine(priceLines[positionId].entryLine);
            candlestickSeries.removePriceLine(priceLines[positionId].slLine);
            candlestickSeries.removePriceLine(priceLines[positionId].tpLine);
            delete priceLines[positionId];
          }
          
          if (positionMarkers[positionId]) {
            positionMarkers[positionId].remove();
            delete positionMarkers[positionId];
          }
        }
        
        window.__UPDATE_POSITIONS__ = (positions) => {
          // إزالة الخطوط القديمة
          Object.keys(priceLines).forEach(id => {
            if (!positions.find(p => p.id === id)) {
              removePositionLines(id);
            }
          });
          
          // إضافة/تحديث الخطوط الجديدة
          positions.forEach(position => {
            if (priceLines[position.id]) {
              // تحديث العلامة فقط
              const marker = positionMarkers[position.id];
              if (marker) {
                const pnlText = position.floatingPnl >= 0 ? '+' : '';
                marker.innerHTML = position.side + ' ' + position.lotSize.toFixed(2) + ' | ' + pnlText + position.floatingPnl.toFixed(2) + '$';
                marker.style.color = position.floatingPnl >= 0 ? '#10b981' : '#ef4444';
              }
            } else {
              createPositionLines(position);
            }
          });
          
          currentPositions = positions;
        };
        
        window.__UPDATE_PRICE__ = (price) => {
          updateSpreadDisplay(price);
        };
        
        try {
          const chartContainer = document.getElementById('chart');
          
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
            },
            rightPriceScale: {
              borderColor: 'rgba(55, 65, 81, 0.5)',
              visible: true,
              borderVisible: false,
            },
            timeScale: {
              borderColor: 'rgba(55, 65, 81, 0.5)',
              timeVisible: true,
              borderVisible: false,
              rightOffset: 10,
            },
          });

          candlestickSeries = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981',
          });

          // خطوط السبريد
          const bidLine = candlestickSeries.createPriceLine({
            price: 0,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'BID',
          });
          
          const askLine = candlestickSeries.createPriceLine({
            price: 0,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'ASK',
          });

          const timeframe = '${timeframe}';
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
                
                const lastCandle = formattedData[formattedData.length - 1];
                const midPrice = lastCandle.close;
                
                // تحديث خطوط السبريد
                bidLine.applyOptions({ price: midPrice - (SPREAD / 2) });
                askLine.applyOptions({ price: midPrice + (SPREAD / 2) });
                updateSpreadDisplay(midPrice);
                
                // تحديث السعر كل 2 ثانية
                setInterval(() => {
                  fetch('https://ict-ai-trader-production.up.railway.app/api/analysis/price/XAUUSD')
                    .then(r => r.json())
                    .then(priceData => {
                      if (priceData.price) {
                        const price = parseFloat(priceData.price);
                        bidLine.applyOptions({ price: price - (SPREAD / 2) });
                        askLine.applyOptions({ price: price + (SPREAD / 2) });
                        updateSpreadDisplay(price);
                      }
                    }).catch(() => {});
                }, 2000);
              }
            })
            .catch(err => {
              console.error('Chart error:', err);
            });

          window.addEventListener('resize', () => {
            chart.resize(chartContainer.clientWidth || window.innerWidth, chartContainer.clientHeight || window.innerHeight);
          });
        } catch(e) {
          console.error('Chart init error:', e);
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: chartHtml }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'editPosition' && onPositionUpdate) {
              // سيتم التعامل معه في الشاشة الرئيسية
            }
          } catch (e) {
            console.error('Message parse error:', e);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default AdvancedChart;
