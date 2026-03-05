// =============================================
// لوحة الصفقات والأوامر - Positions & Orders Panel
// عرض الصفقات المفتوحة والمعلقة والمغلقة
// =============================================

import React, { useEffect, useState } from 'react';
import { TradingEngine } from './TradingEngine';
import { SYMBOLS } from './types';
import {
  X,
  Trash2,
  Edit3,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  History
} from 'lucide-react';

interface PositionsPanelProps {
  engine: TradingEngine;
}

type TabType = 'positions' | 'pending' | 'history';

const PositionsPanel: React.FC<PositionsPanelProps> = ({ engine }) => {
  const [activeTab, setActiveTab] = useState<TabType>('positions');
  const [, forceUpdate] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSL, setEditSL] = useState('');
  const [editTP, setEditTP] = useState('');

  useEffect(() => {
    const unsub = engine.subscribe(() => forceUpdate(n => n + 1));
    return unsub;
  }, [engine]);

  const state = engine.getState();
  const symbolInfo = SYMBOLS[state.selectedSymbol];
  const openPositions = state.positions.filter(p => p.status === 'OPEN');
  const pendingOrders = state.pendingOrders.filter(o => o.status === 'PENDING');

  // إغلاق صفقة
  const handleClose = (id: string) => {
    engine.closePosition(id);
  };

  // إلغاء أمر معلق
  const handleCancelPending = (id: string) => {
    engine.cancelPendingOrder(id);
  };

  // بدء التعديل
  const startEdit = (id: string, currentSL: number | null, currentTP: number | null) => {
    setEditingId(id);
    setEditSL(currentSL ? currentSL.toString() : '');
    setEditTP(currentTP ? currentTP.toString() : '');
  };

  // حفظ التعديل
  const saveEdit = (id: string) => {
    if (editSL) {
      engine.modifyStopLoss(id, parseFloat(editSL));
    }
    if (editTP) {
      engine.modifyTakeProfit(id, parseFloat(editTP));
    }
    setEditingId(null);
  };

  // إغلاق الكل
  const handleCloseAll = () => {
    if (confirm('هل تريد إغلاق جميع الصفقات؟')) {
      engine.closeAllPositions();
    }
  };

  // تنسيق الوقت
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // إجمالي الأرباح
  const totalPnL = openPositions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="bg-[#0d1117] border border-[#1a1e2e] rounded-lg flex flex-col h-full overflow-hidden">
      {/* تبويبات */}
      <div className="flex border-b border-[#1a1e2e]">
        <button
          onClick={() => setActiveTab('positions')}
          className={`flex-1 px-3 py-2 text-xs font-bold transition-all relative ${
            activeTab === 'positions'
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          صفقات ({openPositions.length})
          {activeTab === 'positions' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 px-3 py-2 text-xs font-bold transition-all relative ${
            activeTab === 'pending'
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          معلقة ({pendingOrders.length})
          {activeTab === 'pending' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-3 py-2 text-xs font-bold transition-all relative ${
            activeTab === 'history'
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <History className="w-3 h-3 inline ml-1" />
          سجل ({state.closedPositions.length})
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
      </div>

      {/* المحتوى */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* === الصفقات المفتوحة === */}
        {activeTab === 'positions' && (
          <div>
            {openPositions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <BarChartIcon />
                <p className="text-xs mt-2">لا توجد صفقات مفتوحة</p>
              </div>
            ) : (
              <>
                {openPositions.map(pos => (
                  <div
                    key={pos.id}
                    className="border-b border-[#1a1e2e] px-3 py-2 hover:bg-[#161b22] transition-colors group"
                  >
                    {/* السطر العلوي */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {pos.direction === 'BUY' ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span className={`text-xs font-bold ${
                          pos.direction === 'BUY' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {pos.direction}
                        </span>
                        <span className="text-xs text-white font-bold">{pos.symbol}</span>
                        <span className="text-[10px] text-gray-500">{pos.volume} lots</span>
                        <span className="text-[10px] text-gray-600">{pos.id}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* زر التعديل */}
                        <button
                          onClick={() => startEdit(pos.id, pos.stopLoss, pos.takeProfit)}
                          className="p-1 rounded hover:bg-[#1a1e2e] text-gray-500 hover:text-indigo-400 
                            opacity-0 group-hover:opacity-100 transition-all"
                          title="تعديل SL/TP"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {/* زر الإغلاق */}
                        <button
                          onClick={() => handleClose(pos.id)}
                          className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 
                            opacity-0 group-hover:opacity-100 transition-all"
                          title="إغلاق"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* السطر السفلي */}
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">
                          فتح: <span className="text-gray-300 font-mono">{pos.openPrice.toFixed(symbolInfo.digits)}</span>
                        </span>
                        <span className="text-gray-500">
                          حالي: <span className="text-gray-300 font-mono">{pos.currentPrice.toFixed(symbolInfo.digits)}</span>
                        </span>
                        {pos.stopLoss && (
                          <span className="text-red-400/70">
                            SL: <span className="font-mono">{pos.stopLoss.toFixed(symbolInfo.digits)}</span>
                          </span>
                        )}
                        {pos.takeProfit && (
                          <span className="text-green-400/70">
                            TP: <span className="font-mono">{pos.takeProfit.toFixed(symbolInfo.digits)}</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${
                          pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)}$
                        </span>
                        <span className={`font-mono text-[9px] ${
                          pos.pnlPips >= 0 ? 'text-green-400/60' : 'text-red-400/60'
                        }`}>
                          ({pos.pnlPips > 0 ? '+' : ''}{pos.pnlPips.toFixed(1)}p)
                        </span>
                      </div>
                    </div>

                    {/* واجهة التعديل */}
                    {editingId === pos.id && (
                      <div className="mt-2 flex items-center gap-2 bg-[#0a0e17] rounded p-2">
                        <div className="flex-1">
                          <label className="text-[9px] text-red-400">SL</label>
                          <input
                            type="number"
                            value={editSL}
                            onChange={e => setEditSL(e.target.value)}
                            placeholder="وقف الخسارة"
                            step={symbolInfo.pipSize * 10}
                            className="w-full bg-[#161b22] border border-red-500/30 rounded px-2 py-0.5 text-[10px] text-white font-mono outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-green-400">TP</label>
                          <input
                            type="number"
                            value={editTP}
                            onChange={e => setEditTP(e.target.value)}
                            placeholder="جني الأرباح"
                            step={symbolInfo.pipSize * 10}
                            className="w-full bg-[#161b22] border border-green-500/30 rounded px-2 py-0.5 text-[10px] text-white font-mono outline-none"
                          />
                        </div>
                        <button
                          onClick={() => saveEdit(pos.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2 py-1 rounded mt-3"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-white text-[10px] px-2 py-1 mt-3"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* شريط الإجمالي */}
                <div className="px-3 py-2 border-t border-[#1a1e2e] flex items-center justify-between bg-[#0a0e17]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">إجمالي الربح:</span>
                    <span className={`text-xs font-mono font-bold ${
                      totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}$
                    </span>
                  </div>
                  <button
                    onClick={handleCloseAll}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-all"
                  >
                    إغلاق الكل
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* === الأوامر المعلقة === */}
        {activeTab === 'pending' && (
          <div>
            {pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Clock className="w-8 h-8 opacity-30" />
                <p className="text-xs mt-2">لا توجد أوامر معلقة</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <div
                  key={order.id}
                  className="border-b border-[#1a1e2e] px-3 py-2 hover:bg-[#161b22] transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        order.direction === 'BUY'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {order.direction} {order.type}
                      </span>
                      <span className="text-xs text-white font-bold">{order.symbol}</span>
                      <span className="text-[10px] text-gray-500">{order.volume} lots</span>
                    </div>
                    <button
                      onClick={() => handleCancelPending(order.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 
                        opacity-0 group-hover:opacity-100 transition-all"
                      title="إلغاء"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span>
                      سعر التنفيذ: <span className="text-yellow-400 font-mono">{order.price.toFixed(symbolInfo.digits)}</span>
                    </span>
                    {order.stopLoss && (
                      <span className="text-red-400/70">
                        SL: <span className="font-mono">{order.stopLoss.toFixed(symbolInfo.digits)}</span>
                      </span>
                    )}
                    {order.takeProfit && (
                      <span className="text-green-400/70">
                        TP: <span className="font-mono">{order.takeProfit.toFixed(symbolInfo.digits)}</span>
                      </span>
                    )}
                    <span className="text-gray-600 mr-auto">{formatTime(order.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* === السجل === */}
        {activeTab === 'history' && (
          <div>
            {state.closedPositions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <History className="w-8 h-8 opacity-30" />
                <p className="text-xs mt-2">لا يوجد سجل</p>
              </div>
            ) : (
              state.closedPositions.slice(0, 50).map(pos => (
                <div
                  key={pos.id + pos.closeTime}
                  className="border-b border-[#1a1e2e] px-3 py-2 hover:bg-[#161b22] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {pos.pnl >= 0 ? (
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-400" />
                      )}
                      <span className={`text-xs font-bold ${
                        pos.direction === 'BUY' ? 'text-green-400/70' : 'text-red-400/70'
                      }`}>
                        {pos.direction}
                      </span>
                      <span className="text-xs text-gray-400">{pos.symbol}</span>
                      <span className="text-[10px] text-gray-600">{pos.volume} lots</span>
                    </div>
                    <span className={`text-xs font-mono font-bold ${
                      pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)}$
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-600">
                    <span>فتح: <span className="font-mono">{pos.openPrice.toFixed(symbolInfo.digits)}</span></span>
                    <ChevronRight className="w-2 h-2" />
                    <span>إغلاق: <span className="font-mono">{pos.closePrice?.toFixed(symbolInfo.digits)}</span></span>
                    <span className="mr-auto">{pos.closeTime ? formatTime(pos.closeTime) : ''}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// أيقونة بسيطة للرسم البياني الفارغ
const BarChartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
    <rect x="3" y="12" width="4" height="8" rx="1" />
    <rect x="10" y="8" width="4" height="12" rx="1" />
    <rect x="17" y="4" width="4" height="16" rx="1" />
  </svg>
);

export default PositionsPanel;
