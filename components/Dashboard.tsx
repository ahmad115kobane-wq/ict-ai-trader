
import React, { useState, useRef, useEffect } from 'react';
import { 
  RefreshCw, LogOut, BrainCircuit, Target, Zap, 
  ShieldCheck, ArrowUpRight, ArrowDownRight, 
  ChevronRight, Wifi, LayoutDashboard, Navigation, 
  Eye, History, AlertCircle, Timer, Home, Globe, CreditCard, Coins, CheckCircle2, Star, TrendingUp, XCircle, AlertTriangle, Key
} from 'lucide-react';
import { AppState, DashboardTab, MT5Config, Trade, ICTAnalysis, TradeType, ManagementAdvice } from '../types';
import { analyzeChartWithGemini, monitorActiveTrade } from '../services/geminiService';
import { placeMt5Order } from '../services/mt5Service';
import { MOCK_PAIRS } from '../constants';

interface DashboardProps {
  mt5Config: MT5Config;
  setAppState: (state: AppState) => void;
}

interface Candle {
  time: number; open: number; high: number; low: number; close: number;
}

const Dashboard: React.FC<DashboardProps> = ({ mt5Config, setAppState }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.HOME);
  const [coins, setCoins] = useState(150); 
  const [hasClaimedSilver, setHasClaimedSilver] = useState(false);
  
  const [selectedPair, setSelectedPair] = useState(MOCK_PAIRS[0]);
  const [activeTimeframe, setActiveTimeframe] = useState<'1h' | '5m'>('5m');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(''); 
  const [trades, setTrades] = useState<Trade[]>([]);
  const [m5Analysis, setM5Analysis] = useState<ICTAnalysis | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<'up' | 'down' | 'none'>('none');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candlesM5, setCandlesM5] = useState<Candle[]>([]);
  const [candlesH1, setCandlesH1] = useState<Candle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      let sym = selectedPair.replace('/', '');
      if (sym === 'XAUUSD') sym = 'XAUUSDT'; else if (sym.endsWith('USD')) sym += 'T';
      
      try {
        // تصحيح الروابط لضمان جلب 100 شمعة كاملة من Binance Futures
        const [h1Raw, m5Raw] = await Promise.all([
          fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=1h&limit=100`).then(r => r.json()),
          fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=5m&limit=100`).then(r => r.json())
        ]);
        
        const map = (d: any) => Array.isArray(d) ? d.map(c => ({ 
          time: c[0], 
          open: parseFloat(c[1]), 
          high: parseFloat(c[2]), 
          low: parseFloat(c[3]), 
          close: parseFloat(c[4]) 
        })) : [];

        const h1Data = map(h1Raw);
        const m5Data = map(m5Raw);

        setCandlesH1(h1Data);
        setCandlesM5(m5Data);

        if (m5Data.length > 0) {
          setCurrentPrice(m5Data[m5Data.length - 1].close);
        }
      } catch (err) { 
        console.error("History fetch error:", err); 
      }
    };
    fetchHistory();
  }, [selectedPair]);

  useEffect(() => {
    let symbol = selectedPair.replace('/', '').toLowerCase();
    if (symbol === 'xauusd') symbol = 'xauusdt'; else if (symbol.endsWith('usd')) symbol = symbol + 't';
    if (wsRef.current) wsRef.current.close();
    
    const streams = `${symbol}@markPrice/${symbol}@kline_5m/${symbol}@kline_1h`;
    const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const stream = msg.stream; const data = msg.data;
      if (stream.includes('@markPrice')) {
        const p = parseFloat(data.p);
        setCurrentPrice(prev => { setPriceChange(p > prev ? 'up' : p < prev ? 'down' : 'none'); return p; });
      }
      if (stream.includes('@kline')) {
        const k = data.k;
        const newCandle: Candle = { 
          time: k.t, 
          open: parseFloat(k.o), 
          high: parseFloat(k.h), 
          low: parseFloat(k.l), 
          close: parseFloat(k.c) 
        };
        
        const updateCandles = (prev: Candle[]) => {
          if (prev.length === 0) return [newCandle];
          const last = prev[prev.length - 1];
          if (last.time === newCandle.time) return [...prev.slice(0, -1), newCandle];
          if (newCandle.time > last.time) return [...prev.slice(1), newCandle];
          return prev;
        };
        
        if (k.i === '5m') setCandlesM5(updateCandles);
        if (k.i === '1h') setCandlesH1(updateCandles);
      }
    };
    return () => ws.close();
  }, [selectedPair]);

  useEffect(() => {
    if (activeTab !== DashboardTab.HOME) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const data = activeTimeframe === '1h' ? candlesH1 : candlesM5;
    if (data.length === 0) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const priceAxisWidth = 120; 
      const paddingTop = 40; 
      const paddingBottom = 40; 
      const cw = canvas.width - priceAxisWidth; 
      const ch = canvas.height - paddingTop - paddingBottom;
      
      const visibleData = data.slice(-80);
      const min = Math.min(...visibleData.map(d => d.low));
      const max = Math.max(...visibleData.map(d => d.high));
      const range = (max - min) || 0.01;
      const getY = (p: number) => paddingTop + ((max - p) / range) * ch;

      // إصلاح: بدلاً من تقسيم cw على visibleData.length مباشرة، نستخدم رقماً ثابتاً كحد أدنى للخانات
      // هذا يمنع الشمعة من التوسع لتملأ الشاشة بالكامل إذا كانت البيانات قليلة
      const slots = Math.max(visibleData.length, 60); 
      const candleAreaWidth = cw / slots;
      const bw = candleAreaWidth * 0.7; // عرض جسم الشمعة يمثل 70% من مساحة الخانة

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(cw, 0, priceAxisWidth, canvas.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath(); ctx.moveTo(cw, 0); ctx.lineTo(cw, canvas.height); ctx.stroke();

      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'left';
      const tickCount = 12; const step = range / tickCount;
      for (let i = 0; i <= tickCount; i++) {
        const p = min + (step * i); const y = getY(p);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(p.toFixed(2), cw + 12, y + 4);
      }

      visibleData.forEach((d, i) => {
        // البدء من اليسار
        const x = (i * candleAreaWidth) + (candleAreaWidth * 0.15);
        const bull = d.close >= d.open;
        
        // رسم الفتيل (Wick)
        ctx.strokeStyle = bull ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + bw/2, getY(d.high));
        ctx.lineTo(x + bw/2, getY(d.low));
        ctx.stroke();

        // رسم الجسم (Body)
        ctx.fillStyle = bull ? '#10b981' : '#f43f5e';
        const yTop = Math.min(getY(d.open), getY(d.close));
        const bodyHeight = Math.max(Math.abs(getY(d.open) - getY(d.close)), 1);
        ctx.fillRect(x, yTop, bw, bodyHeight);
      });

      if (currentPrice > 0) {
        const py = getY(currentPrice);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = priceChange === 'up' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(244, 63, 94, 0.5)';
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cw, py); ctx.stroke();
        ctx.setLineDash([]);
        
        const tagColor = priceChange === 'up' ? '#10b981' : '#f43f5e';
        ctx.fillStyle = tagColor;
        ctx.beginPath();
        ctx.moveTo(cw, py);
        ctx.lineTo(cw + 10, py - 13);
        ctx.lineTo(cw + 110, py - 13);
        ctx.lineTo(cw + 110, py + 13);
        ctx.lineTo(cw + 10, py + 13);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.fillText(currentPrice.toFixed(2), cw + 15, py + 5);
      }
    };
    render();
  }, [candlesM5, candlesH1, activeTimeframe, currentPrice, priceChange, activeTab]);

  const runAlgo = async () => {
    if (isAnalyzing) return;
    if (coins < 50) {
      alert('عذراً، رصيدك غير كافٍ. تحتاج إلى 50 عملة لكل تحليل.');
      setActiveTab(DashboardTab.SUBSCRIPTIONS);
      return;
    }
    setIsAnalyzing(true);
    setM5Analysis(null);
    setApiError(false);
    try {
      setAnalysisStep('محرك Pro: تحليل السياق (H1)...');
      const h1Img = generateBase64(candlesH1);
      const h1Res = await analyzeChartWithGemini(h1Img, currentPrice, undefined, true, true);
      
      setAnalysisStep('محرك Pro: معالجة التفكير العميق (M5)...');
      const m5Img = generateBase64(candlesM5);
      const m5Res = await analyzeChartWithGemini(m5Img, currentPrice, h1Res.reasoning, true, false);
      setM5Analysis(m5Res);
      setCoins(prev => prev - 50); 
    } catch (e: any) { 
      console.error(e);
      if (e.message === 'API_KEY_ERROR') {
        setApiError(true);
      }
    }
    finally { setIsAnalyzing(false); setAnalysisStep(''); }
  };

  const generateBase64 = (data: Candle[]) => {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 800;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f1115';
      ctx.fillRect(0, 0, 1200, 800);
      
      const visibleData = data.slice(-80);
      if (visibleData.length === 0) return "";
      
      const min = Math.min(...visibleData.map(d => d.low));
      const max = Math.max(...visibleData.map(d => d.high));
      const range = max - min || 0.1;
      const getY = (p: number) => 50 + ((max - p) / range) * 700;
      
      const slots = Math.max(visibleData.length, 80);
      const wArea = 1200 / slots;
      const wCandle = wArea * 0.8;

      visibleData.forEach((d, i) => {
        const x = (i * wArea) + (wArea * 0.1);
        ctx.strokeStyle = d.close >= d.open ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + wCandle/2, getY(d.high));
        ctx.lineTo(x + wCandle/2, getY(d.low));
        ctx.stroke();

        ctx.fillStyle = ctx.strokeStyle;
        const yTop = Math.min(getY(d.open), getY(d.close));
        const bodyH = Math.max(Math.abs(getY(d.open) - getY(d.close)), 2);
        ctx.fillRect(x, yTop, wCandle, bodyH);
      });
    }
    return c.toDataURL('image/png').split(',')[1];
  };

  const claimSilverVIP = () => {
    if (hasClaimedSilver) return;
    setCoins(prev => prev + 5000);
    setHasClaimedSilver(true);
  };

  const execTrade = async () => {
    if (!m5Analysis?.suggestedTrade) return;
    const t: Trade = {
      id: Math.random().toString(36).substring(7),
      symbol: selectedPair,
      type: m5Analysis.suggestedTrade.type as TradeType,
      entryPrice: m5Analysis.suggestedTrade.entry,
      stopLoss: m5Analysis.suggestedTrade.sl,
      takeProfit: m5Analysis.suggestedTrade.tp,
      volume: 0.1,
      status: 'PENDING',
      timestamp: Date.now(),
      pnl: 0
    };
    const ticket = await placeMt5Order(t, mt5Config);
    if (ticket) setTrades([t, ...trades]);
  };

  const renderDashboard = () => (
    <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden h-full pb-20">
      <div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
        <div className="bg-gray-950/60 p-3 rounded-2xl border border-white/5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            {MOCK_PAIRS.map(p => (
              <button key={p} onClick={() => setSelectedPair(p)} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${selectedPair === p ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-500 hover:bg-white/5'}`}>{p}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
            <Coins className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-black text-white">{coins} <span className="text-[10px] text-indigo-400 font-normal">عملة</span></span>
          </div>
        </div>

        <div className="flex-1 bg-gray-950 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl group min-h-0">
          <canvas ref={canvasRef} width={1600} height={900} className="w-full h-full cursor-crosshair" />
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <div className="flex bg-gray-950/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-2xl">
              {(['1h', '5m'] as const).map(tf => (
                <button key={tf} onClick={() => setActiveTimeframe(tf)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTimeframe === tf ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}>{tf}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-500 uppercase">Gemini 3 Pro Engine</span>
            </div>
          </div>
          {isAnalyzing && (
            <div className="absolute inset-0 bg-gray-950/90 backdrop-blur-2xl flex flex-col items-center justify-center z-[60]">
              <div className="w-24 h-24 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
              <div className="text-xl font-black text-white animate-pulse tracking-widest uppercase">{analysisStep}</div>
              <p className="text-[10px] text-indigo-400 mt-4 font-bold">قد يستغرق محرك Pro وقتاً أطول للتفكير بعمق في الصفقة</p>
            </div>
          )}
          {apiError && (
            <div className="absolute inset-0 bg-gray-950/95 backdrop-blur-xl flex flex-col items-center justify-center z-[70] p-8 text-center">
              <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
              <h3 className="text-2xl font-black text-white mb-4">خطأ في تصريح API (403)</h3>
              <p className="text-gray-400 max-w-md mb-8 leading-relaxed text-sm">
                يتطلب محرك **Gemini 3 Pro** مفتاح API مرتبطاً بمشروع GCP مفعل به الدفع (Billing Account). المفاتيح المجانية العادية قد لا تدعم هذا الطراز.
              </p>
              <button 
                onClick={async () => {
                   await window.aistudio.openSelectKey();
                   setApiError(false);
                }}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black flex items-center gap-2 transition-all shadow-xl"
              >
                <Key className="w-5 h-5" /> تفعيل مفتاح API جديد
              </button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 mt-4 underline">رابط تفعيل الفواتير</a>
            </div>
          )}
        </div>

        <div className="bg-gray-950/60 p-4 rounded-3xl border border-white/5 flex items-center justify-center shadow-2xl">
          <button onClick={runAlgo} disabled={isAnalyzing} className="w-full max-w-2xl py-4 bg-gradient-to-r from-indigo-700 to-indigo-500 hover:from-indigo-600 hover:to-indigo-400 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-[0.98] disabled:opacity-50">
            {isAnalyzing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />} تحليل ICT صارم (Pro Engine)
          </button>
        </div>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden min-h-0">
        <div className="bg-gray-950/60 border border-white/5 rounded-[2rem] p-5 h-[30%] flex flex-col shadow-xl min-h-0">
           <div className="flex items-center gap-2 mb-4 px-2">
              <LayoutDashboard className="w-4 h-4 text-emerald-500" />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">صفقات MT5 القائمة</h2>
           </div>
           <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {trades.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <Navigation className="w-8 h-8 mb-2" /><span className="text-[10px] font-bold uppercase">لا توجد صفقات</span>
                </div>
              ) : trades.map(t => (
                <div key={t.id} className="p-4 rounded-2xl border bg-white/5 border-white/5 hover:border-white/10 transition-all">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-sm font-black text-white">{t.symbol} <span className={t.type.includes('BUY') ? 'text-emerald-400' : 'text-rose-400'}>{t.type}</span></span>
                     <span className="text-[10px] font-bold text-gray-500">{t.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[9px]">
                     <div className="flex flex-col"><span className="text-gray-500">Entry</span><span className="text-white font-mono">{t.entryPrice}</span></div>
                     <div className="flex flex-col"><span className="text-rose-500">SL</span><span className="text-rose-400 font-mono">{t.stopLoss}</span></div>
                     <div className="flex flex-col"><span className="text-emerald-500">TP</span><span className="text-emerald-400 font-mono">{t.takeProfit}</span></div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="flex-1 bg-gradient-to-b from-gray-900/40 to-gray-950/80 border border-white/5 rounded-[2.5rem] p-6 overflow-y-auto custom-scrollbar shadow-2xl min-h-0 relative">
           {m5Analysis ? (
             <div className="flex flex-col gap-5 h-full animate-in fade-in duration-700">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-[10px] uppercase text-indigo-400">نتيجة التحليل الصارم</h2>
                  <div className={`px-4 py-1.5 rounded-xl font-black text-[12px] flex items-center gap-2 ${m5Analysis.score >= 6.5 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    <Star className="w-4 h-4" /> {m5Analysis.score}/10
                  </div>
                </div>

                {m5Analysis.decision === 'NO_TRADE' ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-rose-500/5 rounded-3xl border border-rose-500/10">
                    <XCircle className="w-12 h-12 text-rose-500 mb-4" />
                    <h3 className="text-lg font-black text-white mb-2">لا توجد فرصة صالحة</h3>
                    <div className="space-y-2">
                       {m5Analysis.reasons.map((r, i) => <p key={i} className="text-[10px] text-gray-400 flex items-center gap-2 justify-center text-right leading-relaxed"><AlertTriangle className="w-3 h-3 flex-shrink-0"/> {r}</p>)}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`p-5 rounded-[2rem] border ${m5Analysis.sentiment === 'BULLISH' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-black">{m5Analysis.sentiment}</span>
                          {m5Analysis.sentiment === 'BULLISH' ? <ArrowUpRight className="text-emerald-500"/> : <ArrowDownRight className="text-rose-500"/>}
                       </div>
                       <p className="text-[10px] text-gray-400 uppercase leading-relaxed text-right">{m5Analysis.bias}</p>
                    </div>

                    <div className="bg-indigo-600/5 p-4 rounded-2xl border border-indigo-500/20">
                       <span className="text-[8px] text-indigo-400 uppercase font-black block mb-2 text-right">شروط الإلغاء (Invalidation)</span>
                       <ul className="space-y-1.5">
                          {m5Analysis.suggestedTrade?.cancelConditions.map((c, i) => (
                            <li key={i} className="text-[9px] text-gray-400 flex items-start gap-2 italic leading-tight text-right justify-start flex-row-reverse">
                               <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1 flex-shrink-0" /> {c}
                            </li>
                          ))}
                       </ul>
                    </div>

                    <div className="mt-auto space-y-3">
                       <div className="bg-gray-950 p-4 rounded-2xl border border-white/5 flex justify-between flex-row-reverse">
                          <div className="flex flex-col text-right">
                             <span className="text-[8px] text-gray-500 uppercase">دخول معلق (Entry)</span>
                             <span className="text-xl font-mono font-black text-white">{m5Analysis.suggestedTrade?.entry}</span>
                          </div>
                          <div className="text-left">
                             <span className="text-[8px] text-gray-500 uppercase">الصلاحية (Expiry)</span>
                             <div className="text-[10px] font-black text-indigo-400">{m5Analysis.suggestedTrade?.expiryMinutes} دقيقة</div>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                          <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 text-center"><span className="text-[8px] text-rose-500 block">SL</span><div className="text-xs font-mono font-black">{m5Analysis.suggestedTrade?.sl}</div></div>
                          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-center"><span className="text-[8px] text-emerald-500 block">TP</span><div className="text-xs font-mono font-black">{m5Analysis.suggestedTrade?.tp}</div></div>
                       </div>
                       <button onClick={execTrade} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm transition-all shadow-2xl flex items-center justify-center gap-2 active:scale-95">
                         تنفيذ الأمر على MT5 <ChevronRight className="w-5 h-5" />
                       </button>
                    </div>
                  </>
                )}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                <Timer className="w-12 h-12 mb-4 text-gray-500" />
                <p className="text-xs font-black uppercase tracking-widest leading-relaxed">بانتظار تحليل ICT الصارم<br/>(Pro Engine Mode)</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );

  const renderGeneralTrades = () => (
    <div className="flex-1 p-6 overflow-y-auto pb-24 h-full">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8 flex-row-reverse">
          <div className="text-right"><h2 className="text-2xl font-black text-white">الصفقات العامة</h2><p className="text-gray-500 text-xs">تحليلات مشتركة من كبار المتداولين والذكاء الاصطناعي</p></div>
          <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20"><Globe className="w-4 h-4 text-indigo-400" /><span className="text-[10px] font-bold text-indigo-400 uppercase">Global Stream</span></div>
        </div>
        {[
          { pair: 'XAUUSD', sentiment: 'BULLISH', entry: '2645.20', tp: '2665.00', sl: '2638.00', confidence: 88, author: 'AI_BOT_01' },
          { pair: 'EURUSD', sentiment: 'BEARISH', entry: '1.08540', tp: '1.07800', sl: '1.08950', confidence: 75, author: 'Expert_Trader' },
          { pair: 'BTCUSD', sentiment: 'BULLISH', entry: '94200', tp: '98500', sl: '92000', confidence: 92, author: 'ICT_MASTER' }
        ].map((trade, i) => (
          <div key={i} className="bg-gray-950/60 border border-white/5 rounded-[2rem] p-6 hover:border-indigo-500/30 transition-all shadow-xl group">
             <div className="flex justify-between items-start mb-6 flex-row-reverse">
                <div className="flex items-center gap-4 flex-row-reverse text-right">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400">{trade.pair.slice(0,2)}</div>
                   <div><h3 className="font-black text-white text-lg">{trade.pair}</h3><span className="text-[10px] text-gray-500">بواسطة: {trade.author}</span></div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${trade.sentiment === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{trade.sentiment}</div>
             </div>
             <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center"><span className="block text-[8px] text-gray-500 uppercase mb-1">دخول</span><span className="text-sm font-mono font-black text-white">{trade.entry}</span></div>
                <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 text-center"><span className="block text-[8px] text-emerald-500 uppercase mb-1">الهدف</span><span className="text-sm font-mono font-black text-emerald-400">{trade.tp}</span></div>
                <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 text-center"><span className="block text-[8px] text-rose-500 uppercase mb-1">الوقف</span><span className="text-sm font-mono font-black text-rose-400">{trade.sl}</span></div>
             </div>
             <div className="flex items-center justify-between pt-4 border-t border-white/5 flex-row-reverse">
                <div className="flex items-center gap-2 flex-row-reverse"><TrendingUp className="w-4 h-4 text-indigo-400" /><span className="text-xs font-bold text-gray-400">ثقة {trade.confidence}%</span></div>
                <button className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase group-hover:translate-x-[-4px] transition-transform">نسخ الصفقة <ChevronRight className="w-4 h-4" /></button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSubscriptions = () => (
    <div className="flex-1 p-6 overflow-y-auto pb-24 h-full">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12"><h2 className="text-3xl font-black text-white mb-2">الاشتراكات والعملات</h2><p className="text-gray-500 text-sm">قم بترقية حسابك واحصل على وصول غير محدود لأدوات الذكاء الاصطناعي</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`bg-gray-950/80 border rounded-[2.5rem] p-8 flex flex-col shadow-2xl relative overflow-hidden transition-all ${hasClaimedSilver ? 'border-emerald-500/20 grayscale opacity-70' : 'border-indigo-500/30 hover:border-indigo-500'}`}>
             <div className="absolute top-0 right-0 p-4 opacity-5"><Star className="w-32 h-32" /></div>
             <div className="mb-8"><span className="px-4 py-1.5 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black uppercase">Silver VIP</span><h3 className="text-2xl font-black text-white mt-4 text-right">الفضي المجاني</h3><div className="text-4xl font-black text-white mt-4 text-right">0 <span className="text-sm text-gray-500">$/مجاناً</span></div></div>
             <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-xs text-gray-400 justify-end"><span className="text-right">الحصول على 5000 عملة فوراً</span> <CheckCircle2 className="w-4 h-4 text-indigo-500" /></li>
                <li className="flex items-center gap-3 text-xs text-gray-400 justify-end"><span className="text-right">تحليل مجاني لـ 100 عملية</span> <CheckCircle2 className="w-4 h-4 text-indigo-500" /></li>
             </ul>
             <button onClick={claimSilverVIP} disabled={hasClaimedSilver} className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${hasClaimedSilver ? 'bg-gray-800 text-gray-500' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-900/20'}`}>{hasClaimedSilver ? 'تم التفعيل' : 'تفعيل العضوية الفضية'}</button>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 border border-white/20 rounded-[2.5rem] p-8 flex flex-col shadow-2xl scale-105 z-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="w-32 h-32" /></div>
             <div className="mb-8"><span className="px-4 py-1.5 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Premium Choice</span><h3 className="text-2xl font-black text-white mt-4 text-right">الاحتراف الذهبي</h3><div className="text-4xl font-black text-white mt-4 text-right">49 <span className="text-sm text-indigo-200">$/شهرياً</span></div></div>
             <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-xs text-white justify-end"><span className="text-right">20,000 عملة شهرياً</span> <CheckCircle2 className="w-4 h-4 text-emerald-400" /></li>
                <li className="flex items-center gap-3 text-xs text-white justify-end"><span className="text-right">تحليل Gemini 3 Pro عميق</span> <CheckCircle2 className="w-4 h-4 text-emerald-400" /></li>
             </ul>
             <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all shadow-xl">اشترك الآن</button>
          </div>
          <div className="bg-gray-950/80 border border-white/10 rounded-[2.5rem] p-8 flex flex-col shadow-2xl">
             <div className="mb-8"><span className="px-4 py-1.5 bg-gray-800 text-gray-400 rounded-full text-[10px] font-black uppercase">Enterprise</span><h3 className="text-2xl font-black text-white mt-4 text-right">البلاتينيوم</h3><div className="text-4xl font-black text-white mt-4 text-right">129 <span className="text-sm text-gray-500">$/شهرياً</span></div></div>
             <button className="w-full py-4 bg-gray-800 text-gray-300 rounded-2xl font-black text-sm hover:bg-gray-700 transition-all">تواصل معنا</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06080c] text-gray-200 flex flex-col overflow-hidden" dir="rtl">
      <header className="h-16 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl flex items-center justify-between px-8 z-50 flex-row-reverse">
        <div className="flex items-center gap-4 flex-row-reverse">
          <BrainCircuit className="w-8 h-8 text-indigo-500" />
          <h1 className="text-xl font-black uppercase tracking-tighter">ICT <span className="text-indigo-500 font-normal">AI Trader</span></h1>
        </div>
        <div className="flex items-center gap-6 flex-row-reverse">
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20"><Coins className="w-4 h-4 text-indigo-500" /><span className="text-[10px] font-bold text-white uppercase">{coins} COINS</span></div>
          <button onClick={() => setAppState(AppState.LOGIN)} className="p-2 hover:bg-white/5 rounded-full transition"><LogOut className="w-5 h-5 text-gray-500" /></button>
        </div>
      </header>
      <main className="flex-1 relative overflow-hidden">
        {activeTab === DashboardTab.HOME && renderDashboard()}
        {activeTab === DashboardTab.TRADES && renderGeneralTrades()}
        {activeTab === DashboardTab.SUBSCRIPTIONS && renderSubscriptions()}
      </main>
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-gray-950/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 flex items-center justify-between shadow-2xl z-[100] flex-row-reverse">
        <button onClick={() => setActiveTab(DashboardTab.HOME)} className={`flex-1 py-3 flex flex-col items-center gap-1 rounded-2xl transition-all ${activeTab === DashboardTab.HOME ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}><Home className="w-5 h-5" /><span className="text-[9px] font-black uppercase">الرئيسية</span></button>
        <button onClick={() => setActiveTab(DashboardTab.TRADES)} className={`flex-1 py-3 flex flex-col items-center gap-1 rounded-2xl transition-all ${activeTab === DashboardTab.TRADES ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}><Globe className="w-5 h-5" /><span className="text-[9px] font-black uppercase">عام</span></button>
        <button onClick={() => setActiveTab(DashboardTab.SUBSCRIPTIONS)} className={`flex-1 py-3 flex flex-col items-center gap-1 rounded-2xl transition-all ${activeTab === DashboardTab.SUBSCRIPTIONS ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}><CreditCard className="w-5 h-5" /><span className="text-[9px] font-black uppercase">الاشتراكات</span></button>
      </nav>
    </div>
  );
};

export default Dashboard;
