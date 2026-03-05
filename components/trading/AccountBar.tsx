// =============================================
// لوحة معلومات الحساب - Account Info Bar
// الرصيد، الهامش، حقوق الملكية، الأرباح
// =============================================

import React, { useEffect, useState } from 'react';
import { TradingEngine } from './TradingEngine';
import {
  Wallet,
  TrendingUp,
  Shield,
  Percent,
  BarChart3,
  RotateCcw,
  Settings
} from 'lucide-react';

interface AccountBarProps {
  engine: TradingEngine;
}

const AccountBar: React.FC<AccountBarProps> = ({ engine }) => {
  const [, forceUpdate] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [leverage, setLeverage] = useState(100);

  useEffect(() => {
    const unsub = engine.subscribe(() => forceUpdate(n => n + 1));
    return unsub;
  }, [engine]);

  const state = engine.getState();
  const { account } = state;

  // إجمالي الربح/الخسارة العائم
  const floatingPnL = state.positions
    .filter(p => p.status === 'OPEN')
    .reduce((sum, p) => sum + p.pnl, 0);

  // عدد الصفقات
  const openCount = state.positions.filter(p => p.status === 'OPEN').length;
  const pendingCount = state.pendingOrders.filter(o => o.status === 'PENDING').length;

  const handleLeverageChange = (newLev: number) => {
    setLeverage(newLev);
    engine.setLeverage(newLev);
    setShowSettings(false);
  };

  return (
    <div className="bg-[#0d1117] border border-[#1a1e2e] rounded-lg">
      {/* الشريط الرئيسي */}
      <div className="flex items-center px-3 py-2 gap-4 overflow-x-auto">
        {/* الرصيد */}
        <div className="flex items-center gap-1.5 min-w-fit">
          <Wallet className="w-3.5 h-3.5 text-indigo-400" />
          <div>
            <div className="text-[9px] text-gray-500 uppercase">الرصيد</div>
            <div className="text-sm font-mono font-bold text-white">
              ${account.balance.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-[#1a1e2e]" />

        {/* حقوق الملكية */}
        <div className="flex items-center gap-1.5 min-w-fit">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <div>
            <div className="text-[9px] text-gray-500 uppercase">الأسهم</div>
            <div className={`text-sm font-mono font-bold ${
              account.equity >= account.balance ? 'text-green-400' : 'text-red-400'
            }`}>
              ${account.equity.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-[#1a1e2e]" />

        {/* الهامش */}
        <div className="flex items-center gap-1.5 min-w-fit">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <div>
            <div className="text-[9px] text-gray-500 uppercase">الهامش</div>
            <div className="text-sm font-mono font-bold text-amber-400">
              ${account.margin.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-[#1a1e2e]" />

        {/* الهامش المتاح */}
        <div className="flex items-center gap-1.5 min-w-fit">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <div>
            <div className="text-[9px] text-gray-500 uppercase">هامش متاح</div>
            <div className="text-sm font-mono font-bold text-emerald-400">
              ${account.freeMargin.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-[#1a1e2e]" />

        {/* مستوى الهامش */}
        <div className="flex items-center gap-1.5 min-w-fit">
          <Percent className="w-3.5 h-3.5 text-purple-400" />
          <div>
            <div className="text-[9px] text-gray-500 uppercase">مستوى الهامش</div>
            <div className={`text-sm font-mono font-bold ${
              account.marginLevel === 0 ? 'text-gray-400' :
              account.marginLevel > 200 ? 'text-green-400' :
              account.marginLevel > 100 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {account.marginLevel > 0 ? `${account.marginLevel.toFixed(0)}%` : '—'}
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-[#1a1e2e]" />

        {/* الربح/الخسارة العائم */}
        <div className="flex items-center gap-1.5 min-w-fit">
          <div>
            <div className="text-[9px] text-gray-500 uppercase">ربح عائم</div>
            <div className={`text-sm font-mono font-bold ${
              floatingPnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {floatingPnL >= 0 ? '+' : ''}{floatingPnL.toFixed(2)}$
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-[#1a1e2e]" />

        {/* عداد الصفقات */}
        <div className="flex items-center gap-2 min-w-fit">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-gray-400">{openCount} مفتوحة</span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span className="text-[10px] text-gray-400">{pendingCount} معلقة</span>
            </div>
          )}
        </div>

        {/* أزرار التحكم */}
        <div className="flex items-center gap-1 mr-auto">
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded hover:bg-[#161b22] text-gray-400 hover:text-white transition-all"
              title="الإعدادات"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            
            {showSettings && (
              <div className="absolute top-full left-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg p-3 z-50 min-w-[200px] shadow-xl">
                <div className="text-xs text-gray-400 mb-2">الرافعة المالية</div>
                <div className="grid grid-cols-3 gap-1">
                  {[50, 100, 200, 500, 1000, 2000].map(lev => (
                    <button
                      key={lev}
                      onClick={() => handleLeverageChange(lev)}
                      className={`text-xs py-1 rounded font-mono transition-all ${
                        account.leverage === lev
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[#0d1117] text-gray-400 hover:text-white border border-[#30363d]'
                      }`}
                    >
                      1:{lev}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (confirm('هل تريد إعادة تعيين الحساب؟')) {
                engine.resetAccount();
              }
            }}
            className="p-1.5 rounded hover:bg-[#161b22] text-gray-400 hover:text-red-400 transition-all"
            title="إعادة تعيين"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* مؤشر مستوى الهامش */}
      {account.margin > 0 && (
        <div className="px-3 pb-2">
          <div className="w-full h-1 bg-[#1a1e2e] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                account.marginLevel > 200 ? 'bg-green-500' :
                account.marginLevel > 100 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ 
                width: `${Math.min(100, (account.marginLevel / 500) * 100)}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountBar;
