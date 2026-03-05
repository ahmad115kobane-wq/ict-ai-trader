// =============================================
// نظام التداول الكامل - Full Trading System
// المكون الرئيسي الذي يجمع كل الأجزاء
// =============================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TradingEngine, getTradingEngine } from './TradingEngine';
import TradingChart from './TradingChart';
import OrderPanel from './OrderPanel';
import AccountBar from './AccountBar';
import PositionsPanel from './PositionsPanel';
import { SYMBOLS } from './types';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  LayoutGrid,
  GripVertical
} from 'lucide-react';

interface TradingSystemProps {
  onClose?: () => void;
}

const TradingSystem: React.FC<TradingSystemProps> = ({ onClose }) => {
  const engineRef = useRef<TradingEngine>(getTradingEngine());
  const engine = engineRef.current;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [panelWidth, setPanelWidth] = useState(280);
  const [bottomHeight, setBottomHeight] = useState(200);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // بدء محاكاة الأسعار
  useEffect(() => {
    engine.startPriceSimulation();
    return () => {
      engine.stopPriceSimulation();
    };
  }, [engine]);

  // تبديل وضع ملء الشاشة
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // سحب الفاصل العمودي
  const handlePanelDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPanel(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMove = (ev: MouseEvent) => {
      const diff = startX - ev.clientX;
      const newWidth = Math.max(220, Math.min(400, startWidth + diff));
      setPanelWidth(newWidth);
    };

    const onUp = () => {
      setIsDraggingPanel(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // سحب الفاصل الأفقي
  const handleBottomDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingBottom(true);
    const startY = e.clientY;
    const startHeight = bottomHeight;

    const onMove = (ev: MouseEvent) => {
      const diff = startY - ev.clientY;
      const newHeight = Math.max(100, Math.min(400, startHeight + diff));
      setBottomHeight(newHeight);
    };

    const onUp = () => {
      setIsDraggingBottom(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen w-full bg-[#07090f] text-white select-none"
      style={{ direction: 'ltr' }}
    >
      {/* ===== شريط الحساب العلوي ===== */}
      <div className="flex-shrink-0">
        <AccountBar engine={engine} />
      </div>

      {/* ===== المنطقة الرئيسية ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ---- الرسم البياني + الصفقات ---- */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* الرسم البياني */}
          <div className="flex-1 relative overflow-hidden">
            <TradingChart engine={engine} />

            {/* أزرار التحكم العائمة */}
            <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded bg-[#161b22]/80 border border-[#30363d] text-gray-400 
                  hover:text-white hover:border-indigo-500 transition-all backdrop-blur-sm"
                title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded bg-[#161b22]/80 border border-[#30363d] text-gray-400 
                  hover:text-white hover:border-indigo-500 transition-all backdrop-blur-sm"
                title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* مؤشر السبريد المرئي */}
            <SpreadIndicator engine={engine} />
          </div>

          {/* فاصل أفقي قابل للسحب */}
          <div
            className={`h-1.5 cursor-row-resize flex items-center justify-center 
              hover:bg-indigo-500/30 transition-colors ${isDraggingBottom ? 'bg-indigo-500/50' : 'bg-[#1a1e2e]'}`}
            onMouseDown={handleBottomDrag}
          >
            <div className="w-8 h-0.5 rounded-full bg-gray-600" />
          </div>

          {/* لوحة الصفقات السفلية */}
          <div className="flex-shrink-0 overflow-hidden" style={{ height: bottomHeight }}>
            <PositionsPanel engine={engine} />
          </div>
        </div>

        {/* ---- فاصل عمودي قابل للسحب ---- */}
        <div
          className={`w-1.5 cursor-col-resize flex items-center justify-center
            hover:bg-indigo-500/30 transition-colors ${isDraggingPanel ? 'bg-indigo-500/50' : 'bg-[#1a1e2e]'}`}
          onMouseDown={handlePanelDrag}
        >
          <GripVertical className="w-3 h-3 text-gray-700" />
        </div>

        {/* ---- لوحة الأوامر الجانبية ---- */}
        <div className="flex-shrink-0 overflow-y-auto custom-scrollbar" style={{ width: panelWidth }}>
          <OrderPanel engine={engine} />
        </div>
      </div>

      {/* ===== ستايلات إضافية ===== */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0d1117;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6366f1;
        }
      `}</style>
    </div>
  );
};

// ---- مؤشر السبريد المرئي ----
const SpreadIndicator: React.FC<{ engine: TradingEngine }> = ({ engine }) => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = engine.subscribe(() => forceUpdate(n => n + 1));
    return unsub;
  }, [engine]);

  const state = engine.getState();
  const symbolInfo = SYMBOLS[state.selectedSymbol];

  return (
    <div className="absolute bottom-3 right-3 z-10">
      <div className="bg-[#0d1117]/90 backdrop-blur-sm border border-[#1a1e2e] rounded-lg p-2 min-w-[140px]">
        {/* Ask */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-blue-400 uppercase font-bold">ASK</span>
          <span className="text-sm font-mono font-bold text-blue-400">
            {state.spread.ask.toFixed(symbolInfo.digits)}
          </span>
        </div>

        {/* السبريد */}
        <div className="flex items-center justify-center py-0.5 my-0.5 rounded bg-[#1a1e2e]">
          <span className="text-[9px] text-yellow-400 font-mono font-bold">
            Spread: {state.spread.spreadPips} pts
          </span>
        </div>

        {/* Bid */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-red-400 uppercase font-bold">BID</span>
          <span className="text-sm font-mono font-bold text-red-400">
            {state.spread.bid.toFixed(symbolInfo.digits)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TradingSystem;
