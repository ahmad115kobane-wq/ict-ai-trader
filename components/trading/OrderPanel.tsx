// =============================================
// لوحة فتح الأوامر - Order Entry Panel
// شراء/بيع مع حجم لوت و TP/SL
// =============================================

import React, { useState, useEffect } from 'react';
import { TradingEngine } from './TradingEngine';
import { SYMBOLS, OrderDirection } from './types';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';

interface OrderPanelProps {
  engine: TradingEngine;
}

type OrderMode = 'market' | 'pending';
type PendingType = 'BUY_LIMIT' | 'BUY_STOP' | 'SELL_LIMIT' | 'SELL_STOP';

const OrderPanel: React.FC<OrderPanelProps> = ({ engine }) => {
  const [orderMode, setOrderMode] = useState<OrderMode>('market');
  const [volume, setVolume] = useState(0.01);
  const [slEnabled, setSLEnabled] = useState(false);
  const [tpEnabled, setTPEnabled] = useState(false);
  const [slPips, setSLPips] = useState(50);
  const [tpPips, setTPPips] = useState(100);
  const [pendingType, setPendingType] = useState<PendingType>('BUY_LIMIT');
  const [pendingPrice, setPendingPrice] = useState(0);
  const [, forceUpdate] = useState(0);

  const state = engine.getState();
  const symbolInfo = SYMBOLS[state.selectedSymbol];

  useEffect(() => {
    const unsub = engine.subscribe(() => forceUpdate(n => n + 1));
    return unsub;
  }, [engine]);

  // حساب SL و TP من النقاط
  const calculateSL = (direction: OrderDirection, price: number): number | null => {
    if (!slEnabled) return null;
    const offset = slPips * symbolInfo.pipSize;
    return direction === 'BUY'
      ? parseFloat((price - offset).toFixed(symbolInfo.digits))
      : parseFloat((price + offset).toFixed(symbolInfo.digits));
  };

  const calculateTP = (direction: OrderDirection, price: number): number | null => {
    if (!tpEnabled) return null;
    const offset = tpPips * symbolInfo.pipSize;
    return direction === 'BUY'
      ? parseFloat((price + offset).toFixed(symbolInfo.digits))
      : parseFloat((price - offset).toFixed(symbolInfo.digits));
  };

  // حساب الخسارة/الربح المحتملة
  const calcPotentialPnL = (direction: OrderDirection, pips: number): number => {
    return parseFloat((pips * symbolInfo.pipSize * volume * symbolInfo.contractSize).toFixed(2));
  };

  // فتح صفقة سوق
  const handleMarketOrder = (direction: OrderDirection) => {
    const price = direction === 'BUY' ? state.spread.ask : state.spread.bid;
    const sl = calculateSL(direction, price);
    const tp = calculateTP(direction, price);
    engine.executeMarketOrder(direction, volume, sl, tp);
  };

  // فتح أمر معلق
  const handlePendingOrder = () => {
    if (pendingPrice <= 0) return;

    const direction: OrderDirection = pendingType.startsWith('BUY') ? 'BUY' : 'SELL';
    const type = pendingType.includes('LIMIT') ? 'LIMIT' as const : 'STOP' as const;
    const sl = calculateSL(direction, pendingPrice);
    const tp = calculateTP(direction, pendingPrice);

    engine.placePendingOrder(direction, type, pendingPrice, volume, sl, tp);
    setPendingPrice(0);
  };

  // حساب الهامش المطلوب
  const requiredMargin = parseFloat(
    ((state.spread.bid * volume * symbolInfo.contractSize * symbolInfo.marginPercent) / 
      (100 * state.account.leverage / 100)).toFixed(2)
  );

  const hasEnoughMargin = requiredMargin <= state.account.freeMargin;

  // تعديل الحجم
  const adjustVolume = (delta: number) => {
    const newVol = Math.max(symbolInfo.minLot, Math.min(symbolInfo.maxLot, 
      parseFloat((volume + delta).toFixed(2))
    ));
    setVolume(newVol);
  };

  return (
    <div className="bg-[#0d1117] border border-[#1a1e2e] rounded-lg flex flex-col">
      {/* عنوان */}
      <div className="px-3 py-2 border-b border-[#1a1e2e] flex items-center justify-between">
        <span className="text-sm font-bold text-white">أمر جديد</span>
        <div className="flex gap-1">
          <button
            onClick={() => setOrderMode('market')}
            className={`px-2 py-0.5 text-xs rounded font-bold transition-all ${
              orderMode === 'market'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 inline ml-1" />
            سوق
          </button>
          <button
            onClick={() => setOrderMode('pending')}
            className={`px-2 py-0.5 text-xs rounded font-bold transition-all ${
              orderMode === 'pending'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3 inline ml-1" />
            معلق
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* حجم اللوت */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase mb-1 block">حجم اللوت (Volume)</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustVolume(-symbolInfo.lotStep)}
              className="bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-gray-400 hover:text-white hover:border-red-500 transition-all"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <input
              type="number"
              value={volume}
              onChange={e => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= symbolInfo.minLot && val <= symbolInfo.maxLot) {
                  setVolume(parseFloat(val.toFixed(2)));
                }
              }}
              min={symbolInfo.minLot}
              max={symbolInfo.maxLot}
              step={symbolInfo.lotStep}
              className="flex-1 bg-[#161b22] border border-[#30363d] rounded text-center text-white text-sm font-mono py-1 outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => adjustVolume(symbolInfo.lotStep)}
              className="bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-gray-400 hover:text-white hover:border-green-500 transition-all"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
          {/* أزرار سريعة */}
          <div className="flex gap-1 mt-1">
            {[0.01, 0.05, 0.1, 0.5, 1.0].map(v => (
              <button
                key={v}
                onClick={() => setVolume(v)}
                className={`flex-1 text-[10px] py-0.5 rounded font-mono transition-all ${
                  volume === v
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#161b22] text-gray-500 hover:text-white border border-[#30363d]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* أمر معلق - اختيار النوع والسعر */}
        {orderMode === 'pending' && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">نوع الأمر</label>
              <select
                value={pendingType}
                onChange={e => setPendingType(e.target.value as PendingType)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-sm text-white cursor-pointer"
              >
                <option value="BUY_LIMIT">Buy Limit</option>
                <option value="BUY_STOP">Buy Stop</option>
                <option value="SELL_LIMIT">Sell Limit</option>
                <option value="SELL_STOP">Sell Stop</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">السعر</label>
              <input
                type="number"
                value={pendingPrice || ''}
                onChange={e => setPendingPrice(parseFloat(e.target.value) || 0)}
                placeholder={state.spread.bid.toFixed(symbolInfo.digits)}
                step={symbolInfo.pipSize * 10}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-sm text-white font-mono outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* وقف الخسارة */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSLEnabled(!slEnabled)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${
              slEnabled
                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                : 'bg-[#161b22] text-gray-500 border border-[#30363d] hover:text-red-400'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            SL
          </button>
          {slEnabled && (
            <div className="flex-1 flex items-center gap-1">
              <input
                type="number"
                value={slPips}
                onChange={e => setSLPips(Math.max(1, parseInt(e.target.value) || 0))}
                className="flex-1 bg-[#161b22] border border-red-500/30 rounded px-2 py-1 text-xs text-red-400 font-mono outline-none text-center"
              />
              <span className="text-[10px] text-gray-500">pips</span>
              <span className="text-[10px] text-red-400 font-mono">
                -${calcPotentialPnL('BUY', slPips).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* جني الأرباح */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTPEnabled(!tpEnabled)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${
              tpEnabled
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-[#161b22] text-gray-500 border border-[#30363d] hover:text-green-400'
            }`}
          >
            <Target className="w-3 h-3" />
            TP
          </button>
          {tpEnabled && (
            <div className="flex-1 flex items-center gap-1">
              <input
                type="number"
                value={tpPips}
                onChange={e => setTPPips(Math.max(1, parseInt(e.target.value) || 0))}
                className="flex-1 bg-[#161b22] border border-green-500/30 rounded px-2 py-1 text-xs text-green-400 font-mono outline-none text-center"
              />
              <span className="text-[10px] text-gray-500">pips</span>
              <span className="text-[10px] text-green-400 font-mono">
                +${calcPotentialPnL('BUY', tpPips).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* معلومات الهامش */}
        <div className="bg-[#161b22] rounded p-2 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">الهامش المطلوب</span>
            <span className={`font-mono ${hasEnoughMargin ? 'text-white' : 'text-red-400'}`}>
              ${requiredMargin.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">الهامش المتاح</span>
            <span className="text-white font-mono">${state.account.freeMargin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">السبريد</span>
            <span className="text-yellow-400 font-mono">{state.spread.spreadPips} pips</span>
          </div>
        </div>

        {!hasEnoughMargin && (
          <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded p-2 text-[10px] text-red-400">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>هامش غير كافٍ لفتح هذا الأمر</span>
          </div>
        )}

        {/* أزرار الشراء والبيع */}
        {orderMode === 'market' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleMarketOrder('SELL')}
              disabled={!hasEnoughMargin}
              className="relative bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 
                disabled:opacity-50 disabled:cursor-not-allowed
                text-white rounded-lg py-3 font-bold text-sm transition-all 
                active:scale-95 shadow-lg shadow-red-900/30 group"
            >
              <TrendingDown className="w-4 h-4 mx-auto mb-0.5 group-hover:animate-bounce" />
              <div className="text-xs">SELL</div>
              <div className="text-[10px] font-mono opacity-80">
                {state.spread.bid.toFixed(symbolInfo.digits)}
              </div>
            </button>
            <button
              onClick={() => handleMarketOrder('BUY')}
              disabled={!hasEnoughMargin}
              className="relative bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 
                disabled:opacity-50 disabled:cursor-not-allowed
                text-white rounded-lg py-3 font-bold text-sm transition-all 
                active:scale-95 shadow-lg shadow-green-900/30 group"
            >
              <TrendingUp className="w-4 h-4 mx-auto mb-0.5 group-hover:animate-bounce" />
              <div className="text-xs">BUY</div>
              <div className="text-[10px] font-mono opacity-80">
                {state.spread.ask.toFixed(symbolInfo.digits)}
              </div>
            </button>
          </div>
        ) : (
          <button
            onClick={handlePendingOrder}
            disabled={!hasEnoughMargin || pendingPrice <= 0}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              ${pendingType.startsWith('BUY')
                ? 'bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 shadow-green-900/30'
                : 'bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-900/30'
              } text-white`}
          >
            <Clock className="w-4 h-4 inline ml-1" />
            وضع أمر {pendingType.replace('_', ' ')}
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderPanel;
