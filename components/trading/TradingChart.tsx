// =============================================
// مكون الرسم البياني التفاعلي مع خطوط السبريد و TP/SL
// Interactive Trading Chart with Spread Lines & Draggable TP/SL
// =============================================

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineStyle,
  CrosshairMode,
  IPriceLine,
} from 'lightweight-charts';
import type { Time } from 'lightweight-charts';
import { TradingEngine } from './TradingEngine';
import { ChartLine, SYMBOLS, TimeFrame } from './types';

interface TradingChartProps {
  engine: TradingEngine;
  onChartClick?: (price: number) => void;
}

const TIMEFRAMES: { label: string; value: TimeFrame }[] = [
  { label: '1M', value: '1m' },
  { label: '5M', value: '5m' },
  { label: '15M', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1D' },
];

const TradingChart: React.FC<TradingChartProps> = ({ engine, onChartClick }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [draggedLine, setDraggedLine] = useState<string | null>(null);
  const isDragging = useRef(false);
  const dragLineId = useRef<string | null>(null);

  const state = engine.getState();
  const symbolInfo = SYMBOLS[state.selectedSymbol];

  // ---- إنشاء الرسم البياني ----
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: '#0a0e17' },
        textColor: '#848e9c',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#1a1e2e' },
        horzLines: { color: '#1a1e2e' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#6366f1',
        },
      },
      rightPriceScale: {
        borderColor: '#1a1e2e',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#1a1e2e',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // تحميل الشموع
    const candles = engine.getCandles();
    if (candles.length > 0) {
      candleSeries.setData(
        candles.map(c => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    }

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // مستمع لتغيير الحجم
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    // مستمع لحركة الماوس (Crosshair)
    chart.subscribeCrosshairMove(param => {
      if (param.point) {
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price !== null) {
          setCrosshairPrice(price as number);
        }
      }
    });

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      priceLinesRef.current.clear();
    };
  }, [state.selectedSymbol]);

  // ---- تحديث الشموع والخطوط ----
  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      const currentState = engine.getState();
      const candles = engine.getCandles();
      
      if (candleSeriesRef.current && candles.length > 0) {
        const lastCandle = candles[candles.length - 1];
        candleSeriesRef.current.update({
          time: lastCandle.time as Time,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
        });
      }

      // تحديث خطوط الأسعار
      updatePriceLines(currentState.chartLines);
    });

    return () => unsubscribe();
  }, [engine, state.selectedSymbol]);

  // ---- تحديث خطوط الأسعار ----
  const updatePriceLines = useCallback((lines: ChartLine[]) => {
    if (!candleSeriesRef.current) return;

    const currentLines = priceLinesRef.current;
    const newLineIds = new Set(lines.map(l => l.id));

    // حذف الخطوط القديمة
    currentLines.forEach((priceLine, id) => {
      if (!newLineIds.has(id)) {
        candleSeriesRef.current?.removePriceLine(priceLine);
        currentLines.delete(id);
      }
    });

    // إضافة/تحديث الخطوط
    lines.forEach(line => {
      const existing = currentLines.get(line.id);
      if (existing) {
        // تحديث السعر فقط
        existing.applyOptions({
          price: line.price,
          title: line.label,
        });
      } else {
        // إنشاء خط جديد
        const priceLine = candleSeriesRef.current!.createPriceLine({
          price: line.price,
          color: line.color,
          lineWidth: (line.lineWidth || 1) as 1 | 2 | 3 | 4,
          lineStyle: line.lineStyle === 0 ? LineStyle.Solid :
                     line.lineStyle === 1 ? LineStyle.Dotted :
                     LineStyle.Dashed,
          axisLabelVisible: true,
          title: line.label,
        });
        currentLines.set(line.id, priceLine);
      }
    });
  }, []);

  // ---- معالج النقر على الرسم البياني (للأوامر أو التحديد) ----
  const handleChartMouseDown = useCallback((e: React.MouseEvent) => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const price = candleSeriesRef.current.coordinateToPrice(y);
    if (price === null) return;

    // فحص إذا النقر قريب من خط قابل للسحب
    const currentState = engine.getState();
    const draggableLines = currentState.chartLines.filter(l => l.draggable);
    
    for (const line of draggableLines) {
      const lineY = candleSeriesRef.current.priceToCoordinate(line.price);
      if (lineY !== null && Math.abs(y - (lineY as number)) < 8) {
        isDragging.current = true;
        dragLineId.current = line.id;
        setDraggedLine(line.id);
        e.preventDefault();
        return;
      }
    }
  }, [engine]);

  const handleChartMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !dragLineId.current || !candleSeriesRef.current) return;

    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const price = candleSeriesRef.current.coordinateToPrice(y);
    if (price === null) return;

    // تعديل الخط المسحوب
    const lineId = dragLineId.current;
    const currentState = engine.getState();
    const line = currentState.chartLines.find(l => l.id === lineId);
    
    if (line && line.orderId) {
      if (line.type === 'SL') {
        engine.modifyStopLoss(line.orderId, price as number);
      } else if (line.type === 'TP') {
        engine.modifyTakeProfit(line.orderId, price as number);
      } else if (line.type === 'PENDING') {
        engine.modifyPendingPrice(line.orderId, price as number);
      }
    }
  }, [engine]);

  const handleChartMouseUp = useCallback(() => {
    isDragging.current = false;
    dragLineId.current = null;
    setDraggedLine(null);
  }, []);

  // النقر للنظام الخارجي
  const handleChartClick = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) return;
    if (!candleSeriesRef.current || !onChartClick) return;

    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const price = candleSeriesRef.current.coordinateToPrice(y);
    if (price !== null) {
      onChartClick(price as number);
    }
  }, [onChartClick]);

  // ---- تغيير الزوج ----
  const handleSymbolChange = (symbol: string) => {
    engine.changeSymbol(symbol);
  };

  // ---- تغيير الإطار الزمني ----
  const handleTimeframeChange = (tf: TimeFrame) => {
    engine.changeTimeframe(tf);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] rounded-lg overflow-hidden border border-[#1a1e2e]">
      {/* شريط الأدوات العلوي */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1117] border-b border-[#1a1e2e]">
        {/* اختيار الزوج */}
        <div className="flex items-center gap-2">
          <select
            value={state.selectedSymbol}
            onChange={e => handleSymbolChange(e.target.value)}
            className="bg-[#161b22] text-white border border-[#30363d] rounded px-2 py-1 text-sm font-bold cursor-pointer hover:border-indigo-500 transition-colors"
          >
            {Object.entries(SYMBOLS).map(([key, info]) => (
              <option key={key} value={key}>{info.displayName}</option>
            ))}
          </select>

          {/* السعر الحالي */}
          <div className="flex items-center gap-3 mr-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-500 uppercase">Bid</span>
              <span className="text-red-400 font-mono font-bold text-sm">
                {state.spread.bid.toFixed(symbolInfo.digits)}
              </span>
            </div>
            <div className="flex flex-col items-center px-2 bg-[#1a1e2e] rounded">
              <span className="text-[10px] text-gray-500 uppercase">Spread</span>
              <span className="text-yellow-400 font-mono text-xs font-bold">
                {state.spread.spreadPips}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-500 uppercase">Ask</span>
              <span className="text-blue-400 font-mono font-bold text-sm">
                {state.spread.ask.toFixed(symbolInfo.digits)}
              </span>
            </div>
          </div>
        </div>

        {/* الأطر الزمنية */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => handleTimeframeChange(tf.value)}
              className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                state.selectedTimeframe === tf.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#1a1e2e]'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* منطقة الرسم البياني */}
      <div
        ref={chartContainerRef}
        className="flex-1 relative"
        style={{ cursor: draggedLine ? 'ns-resize' : 'crosshair' }}
        onMouseDown={handleChartMouseDown}
        onMouseMove={handleChartMouseMove}
        onMouseUp={handleChartMouseUp}
        onMouseLeave={handleChartMouseUp}
        onClick={handleChartClick}
      />

      {/* شريط السعر السفلي */}
      {crosshairPrice !== null && (
        <div className="absolute bottom-10 left-3 bg-[#161b22]/90 px-2 py-1 rounded text-xs text-gray-300 font-mono border border-[#30363d]">
          {crosshairPrice.toFixed(symbolInfo.digits)}
        </div>
      )}
    </div>
  );
};

export default TradingChart;
