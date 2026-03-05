// =============================================
// محرك التداول - Trading Engine
// يدير الحساب، الصفقات، السبريد، الهامش
// =============================================

import {
  TradingAccount,
  TradingOrder,
  PendingOrder,
  SpreadInfo,
  CandleData,
  OrderDirection,
  OrderType,
  SymbolInfo,
  SYMBOLS,
  TradingState,
  TimeFrame,
  ChartLine
} from './types';

// ---- مولد بيانات الشموع ----
function generateCandles(symbol: string, count: number): CandleData[] {
  const candles: CandleData[] = [];
  const info = SYMBOLS[symbol];
  if (!info) return candles;

  // أسعار بداية واقعية
  const basePrices: Record<string, number> = {
    'XAUUSD': 2650.00,
    'EURUSD': 1.08500,
    'GBPUSD': 1.27200,
    'BTCUSD': 97500.00,
    'ETHUSDT': 3850.00,
    'SOLUSDT': 195.0000
  };

  let price = basePrices[symbol] || 100;
  const now = Date.now();
  const interval = 60000; // 1 minute

  for (let i = count; i > 0; i--) {
    const time = Math.floor((now - i * interval) / 1000);
    const volatility = price * 0.0008;
    const open = price;
    const change1 = (Math.random() - 0.48) * volatility;
    const change2 = (Math.random() - 0.48) * volatility;
    const high = Math.max(open, open + Math.abs(change1) + Math.random() * volatility * 0.5);
    const low = Math.min(open, open - Math.abs(change2) - Math.random() * volatility * 0.5);
    const close = low + Math.random() * (high - low);
    
    candles.push({
      time,
      open: parseFloat(open.toFixed(info.digits)),
      high: parseFloat(high.toFixed(info.digits)),
      low: parseFloat(low.toFixed(info.digits)),
      close: parseFloat(close.toFixed(info.digits)),
      volume: Math.floor(Math.random() * 5000) + 500
    });
    
    price = close;
  }
  
  return candles;
}

// ---- مولد ID ----
let orderIdCounter = 1000;
function generateOrderId(): string {
  return `#${++orderIdCounter}`;
}

// ---- حساب الربح/الخسارة ----
function calculatePnL(
  direction: OrderDirection,
  openPrice: number,
  currentPrice: number,
  volume: number,
  symbolInfo: SymbolInfo
): { pnl: number; pnlPips: number } {
  const diff = direction === 'BUY'
    ? currentPrice - openPrice
    : openPrice - currentPrice;
  
  const pnlPips = diff / symbolInfo.pipSize;
  const pnl = diff * volume * symbolInfo.contractSize;
  
  return {
    pnl: parseFloat(pnl.toFixed(2)),
    pnlPips: parseFloat(pnlPips.toFixed(1))
  };
}

// ---- حساب الهامش ----
function calculateMargin(
  price: number,
  volume: number,
  symbolInfo: SymbolInfo,
  leverage: number
): number {
  const notionalValue = price * volume * symbolInfo.contractSize;
  const margin = notionalValue * (symbolInfo.marginPercent / 100);
  return parseFloat((margin / (leverage / 100)).toFixed(2));
}

// ---- إنشاء الحالة الابتدائية ----
export function createInitialState(): TradingState {
  const symbol = 'XAUUSD';
  const info = SYMBOLS[symbol];
  const basePrice = 2650.00;
  const spreadAmount = info.spreadPips * info.pipSize;

  return {
    account: {
      balance: 10000.00,
      equity: 10000.00,
      margin: 0,
      freeMargin: 10000.00,
      marginLevel: 0,
      leverage: 100,
      currency: 'USD'
    },
    positions: [],
    pendingOrders: [],
    closedPositions: [],
    selectedSymbol: symbol,
    selectedTimeframe: '1m',
    spread: {
      bid: parseFloat(basePrice.toFixed(info.digits)),
      ask: parseFloat((basePrice + spreadAmount).toFixed(info.digits)),
      spread: spreadAmount,
      spreadPips: info.spreadPips
    },
    chartLines: []
  };
}

// ---- كلاس محرك التداول ----
export class TradingEngine {
  private state: TradingState;
  private candles: Map<string, CandleData[]> = new Map();
  private listeners: Set<() => void> = new Set();
  private priceInterval: ReturnType<typeof setInterval> | null = null;
  private candleInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = createInitialState();
    this.initCandles();
  }

  // ---- تهيئة الشموع ----
  private initCandles() {
    Object.keys(SYMBOLS).forEach(sym => {
      this.candles.set(sym, generateCandles(sym, 300));
    });
  }

  // ---- الحصول على الحالة ----
  getState(): TradingState {
    return { ...this.state };
  }

  // ---- الحصول على الشموع ----
  getCandles(symbol?: string): CandleData[] {
    const sym = symbol || this.state.selectedSymbol;
    return this.candles.get(sym) || [];
  }

  // ---- الاشتراك في التحديثات ----
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // ---- بدء محاكاة السعر ----
  startPriceSimulation() {
    if (this.priceInterval) return;

    // تحديث السعر كل 500ms
    this.priceInterval = setInterval(() => {
      this.tickPrice();
    }, 500);

    // إضافة شمعة جديدة كل 5 ثواني (محاكاة)
    this.candleInterval = setInterval(() => {
      this.addNewCandle();
    }, 5000);
  }

  stopPriceSimulation() {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
      this.priceInterval = null;
    }
    if (this.candleInterval) {
      clearInterval(this.candleInterval);
      this.candleInterval = null;
    }
  }

  // ---- تحديث التيك ----
  private tickPrice() {
    const symbol = this.state.selectedSymbol;
    const info = SYMBOLS[symbol];
    if (!info) return;

    const candles = this.candles.get(symbol);
    if (!candles || candles.length === 0) return;

    const lastCandle = candles[candles.length - 1];
    const volatility = lastCandle.close * 0.00015;
    const change = (Math.random() - 0.49) * volatility;
    const newPrice = parseFloat((lastCandle.close + change).toFixed(info.digits));
    const spreadAmount = info.spreadPips * info.pipSize;

    // تحديث آخر شمعة
    lastCandle.close = newPrice;
    lastCandle.high = Math.max(lastCandle.high, newPrice);
    lastCandle.low = Math.min(lastCandle.low, newPrice);

    // تحديث السبريد
    this.state.spread = {
      bid: newPrice,
      ask: parseFloat((newPrice + spreadAmount).toFixed(info.digits)),
      spread: spreadAmount,
      spreadPips: info.spreadPips
    };

    // تحديث الصفقات المفتوحة
    this.updateOpenPositions();

    // فحص الأوامر المعلقة
    this.checkPendingOrders();

    // فحص TP/SL
    this.checkStopLossAndTakeProfit();

    // تحديث الحساب
    this.updateAccountEquity();

    // تحديث خطوط الرسم البياني
    this.updateChartLines();

    this.notify();
  }

  // ---- إضافة شمعة جديدة ----
  private addNewCandle() {
    const symbol = this.state.selectedSymbol;
    const info = SYMBOLS[symbol];
    const candles = this.candles.get(symbol);
    if (!candles || candles.length === 0 || !info) return;

    const lastCandle = candles[candles.length - 1];
    const newTime = lastCandle.time + 60;
    const openPrice = lastCandle.close;

    candles.push({
      time: newTime,
      open: openPrice,
      high: openPrice,
      low: openPrice,
      close: openPrice,
      volume: 0
    });

    // إبقاء آخر 500 شمعة فقط
    if (candles.length > 500) {
      candles.shift();
    }
  }

  // ---- تحديث الصفقات المفتوحة ----
  private updateOpenPositions() {
    const info = SYMBOLS[this.state.selectedSymbol];
    if (!info) return;

    this.state.positions.forEach(pos => {
      if (pos.status !== 'OPEN') return;
      
      // BUY تُغلق على Bid، SELL تُغلق على Ask
      pos.currentPrice = pos.direction === 'BUY'
        ? this.state.spread.bid
        : this.state.spread.ask;
      
      const result = calculatePnL(
        pos.direction,
        pos.openPrice,
        pos.currentPrice,
        pos.volume,
        info
      );
      pos.pnl = result.pnl;
      pos.pnlPips = result.pnlPips;
    });
  }

  // ---- فحص الأوامر المعلقة ----
  private checkPendingOrders() {
    const { bid, ask } = this.state.spread;
    const toTrigger: PendingOrder[] = [];

    this.state.pendingOrders = this.state.pendingOrders.filter(order => {
      if (order.status !== 'PENDING') return false;

      let triggered = false;
      if (order.type === 'LIMIT') {
        if (order.direction === 'BUY' && ask <= order.price) triggered = true;
        if (order.direction === 'SELL' && bid >= order.price) triggered = true;
      } else if (order.type === 'STOP') {
        if (order.direction === 'BUY' && ask >= order.price) triggered = true;
        if (order.direction === 'SELL' && bid <= order.price) triggered = true;
      }

      if (triggered) {
        toTrigger.push(order);
        return false;
      }
      return true;
    });

    toTrigger.forEach(order => {
      this.executeMarketOrder(
        order.direction,
        order.volume,
        order.stopLoss,
        order.takeProfit
      );
    });
  }

  // ---- فحص وقف الخسارة وجني الأرباح ----
  private checkStopLossAndTakeProfit() {
    const info = SYMBOLS[this.state.selectedSymbol];
    if (!info) return;
    const { bid, ask } = this.state.spread;

    this.state.positions = this.state.positions.filter(pos => {
      if (pos.status !== 'OPEN') return true;

      let closedByTP = false;
      let closedBySL = false;

      if (pos.direction === 'BUY') {
        // BUY: TP عندما bid >= TP, SL عندما bid <= SL
        if (pos.takeProfit && bid >= pos.takeProfit) closedByTP = true;
        if (pos.stopLoss && bid <= pos.stopLoss) closedBySL = true;
      } else {
        // SELL: TP عندما ask <= TP, SL عندما ask >= SL
        if (pos.takeProfit && ask <= pos.takeProfit) closedByTP = true;
        if (pos.stopLoss && ask >= pos.stopLoss) closedBySL = true;
      }

      if (closedByTP || closedBySL) {
        const closePrice = pos.direction === 'BUY' ? bid : ask;
        const result = calculatePnL(pos.direction, pos.openPrice, closePrice, pos.volume, info);
        
        pos.status = 'CLOSED';
        pos.closePrice = closePrice;
        pos.closeTime = Date.now();
        pos.pnl = result.pnl;
        pos.pnlPips = result.pnlPips;
        pos.currentPrice = closePrice;

        // إضافة للأرباح
        this.state.account.balance += pos.pnl;
        this.state.account.margin -= pos.margin;
        
        this.state.closedPositions.unshift(pos);
        return false;
      }
      return true;
    });
  }

  // ---- تحديث حقوق الملكية ----
  private updateAccountEquity() {
    const totalPnL = this.state.positions
      .filter(p => p.status === 'OPEN')
      .reduce((sum, p) => sum + p.pnl, 0);
    
    const totalMargin = this.state.positions
      .filter(p => p.status === 'OPEN')
      .reduce((sum, p) => sum + p.margin, 0);

    this.state.account.equity = parseFloat((this.state.account.balance + totalPnL).toFixed(2));
    this.state.account.margin = parseFloat(totalMargin.toFixed(2));
    this.state.account.freeMargin = parseFloat((this.state.account.equity - totalMargin).toFixed(2));
    this.state.account.marginLevel = totalMargin > 0
      ? parseFloat(((this.state.account.equity / totalMargin) * 100).toFixed(2))
      : 0;
  }

  // ---- تحديث خطوط الرسم البياني ----
  private updateChartLines() {
    const lines: ChartLine[] = [];

    // خط السبريد - Ask (شراء)
    lines.push({
      id: 'ask-line',
      price: this.state.spread.ask,
      color: '#2196F3',
      label: `ASK ${this.state.spread.ask}`,
      draggable: false,
      lineWidth: 1,
      lineStyle: 2,
      type: 'ASK'
    });

    // خط السبريد - Bid (بيع)
    lines.push({
      id: 'bid-line',
      price: this.state.spread.bid,
      color: '#F44336',
      label: `BID ${this.state.spread.bid}`,
      draggable: false,
      lineWidth: 1,
      lineStyle: 2,
      type: 'BID'
    });

    // خطوط الصفقات المفتوحة
    this.state.positions.forEach(pos => {
      if (pos.status !== 'OPEN') return;

      // خط سعر الدخول
      lines.push({
        id: `entry-${pos.id}`,
        price: pos.openPrice,
        color: pos.direction === 'BUY' ? '#4CAF50' : '#FF5722',
        label: `${pos.direction} ${pos.volume} @ ${pos.openPrice}`,
        draggable: false,
        lineWidth: 2,
        lineStyle: 0,
        type: 'ENTRY',
        orderId: pos.id
      });

      // خط وقف الخسارة
      if (pos.stopLoss) {
        lines.push({
          id: `sl-${pos.id}`,
          price: pos.stopLoss,
          color: '#FF1744',
          label: `SL ${pos.stopLoss}`,
          draggable: true,
          lineWidth: 1,
          lineStyle: 2,
          type: 'SL',
          orderId: pos.id
        });
      }

      // خط جني الأرباح
      if (pos.takeProfit) {
        lines.push({
          id: `tp-${pos.id}`,
          price: pos.takeProfit,
          color: '#00E676',
          label: `TP ${pos.takeProfit}`,
          draggable: true,
          lineWidth: 1,
          lineStyle: 2,
          type: 'TP',
          orderId: pos.id
        });
      }
    });

    // خطوط الأوامر المعلقة
    this.state.pendingOrders.forEach(order => {
      if (order.status !== 'PENDING') return;

      lines.push({
        id: `pending-${order.id}`,
        price: order.price,
        color: '#FFD600',
        label: `${order.direction} ${order.type} ${order.volume} @ ${order.price}`,
        draggable: true,
        lineWidth: 1,
        lineStyle: 1,
        type: 'PENDING',
        orderId: order.id
      });

      if (order.stopLoss) {
        lines.push({
          id: `psl-${order.id}`,
          price: order.stopLoss,
          color: '#FF1744',
          label: `SL ${order.stopLoss}`,
          draggable: true,
          lineWidth: 1,
          lineStyle: 2,
          type: 'SL',
          orderId: order.id
        });
      }

      if (order.takeProfit) {
        lines.push({
          id: `ptp-${order.id}`,
          price: order.takeProfit,
          color: '#00E676',
          label: `TP ${order.takeProfit}`,
          draggable: true,
          lineWidth: 1,
          lineStyle: 2,
          type: 'TP',
          orderId: order.id
        });
      }
    });

    this.state.chartLines = lines;
  }

  // ========== أوامر التداول ==========

  // ---- فتح صفقة سوق ----
  executeMarketOrder(
    direction: OrderDirection,
    volume: number,
    stopLoss: number | null = null,
    takeProfit: number | null = null
  ): TradingOrder | null {
    const info = SYMBOLS[this.state.selectedSymbol];
    if (!info) return null;

    // BUY يفتح على Ask، SELL يفتح على Bid
    // هذا يعني الصفقة تفتح بخسارة = السبريد
    const openPrice = direction === 'BUY'
      ? this.state.spread.ask
      : this.state.spread.bid;

    // حساب الهامش
    const margin = calculateMargin(openPrice, volume, info, this.state.account.leverage);

    // فحص الهامش المتاح
    if (margin > this.state.account.freeMargin) {
      console.warn('هامش غير كافٍ');
      return null;
    }

    // السعر الحالي للحساب (عكس سعر الفتح)
    const currentPrice = direction === 'BUY'
      ? this.state.spread.bid  // BUY: الربح يحسب على bid
      : this.state.spread.ask; // SELL: الربح يحسب على ask

    const pnlResult = calculatePnL(direction, openPrice, currentPrice, volume, info);

    const order: TradingOrder = {
      id: generateOrderId(),
      symbol: this.state.selectedSymbol,
      direction,
      type: 'MARKET',
      volume,
      openPrice,
      currentPrice,
      stopLoss,
      takeProfit,
      pnl: pnlResult.pnl,
      pnlPips: pnlResult.pnlPips,
      margin,
      status: 'OPEN',
      openTime: Date.now(),
      swap: 0,
      commission: parseFloat((volume * 3.5).toFixed(2))  // عمولة ثابتة
    };

    this.state.positions.push(order);
    this.state.account.margin += margin;
    this.state.account.freeMargin -= margin;
    
    this.updateAccountEquity();
    this.updateChartLines();
    this.notify();

    return order;
  }

  // ---- إنشاء أمر معلق ----
  placePendingOrder(
    direction: OrderDirection,
    type: 'LIMIT' | 'STOP',
    price: number,
    volume: number,
    stopLoss: number | null = null,
    takeProfit: number | null = null
  ): PendingOrder | null {
    const info = SYMBOLS[this.state.selectedSymbol];
    if (!info) return null;

    const order: PendingOrder = {
      id: generateOrderId(),
      symbol: this.state.selectedSymbol,
      direction,
      type,
      volume,
      price: parseFloat(price.toFixed(info.digits)),
      stopLoss: stopLoss ? parseFloat(stopLoss.toFixed(info.digits)) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit.toFixed(info.digits)) : null,
      status: 'PENDING',
      createdAt: Date.now()
    };

    this.state.pendingOrders.push(order);
    this.updateChartLines();
    this.notify();

    return order;
  }

  // ---- إغلاق صفقة ----
  closePosition(positionId: string): boolean {
    const info = SYMBOLS[this.state.selectedSymbol];
    if (!info) return false;

    const idx = this.state.positions.findIndex(p => p.id === positionId && p.status === 'OPEN');
    if (idx === -1) return false;

    const pos = this.state.positions[idx];
    const closePrice = pos.direction === 'BUY'
      ? this.state.spread.bid
      : this.state.spread.ask;

    const result = calculatePnL(pos.direction, pos.openPrice, closePrice, pos.volume, info);
    
    pos.status = 'CLOSED';
    pos.closePrice = closePrice;
    pos.closeTime = Date.now();
    pos.pnl = result.pnl;
    pos.pnlPips = result.pnlPips;
    pos.currentPrice = closePrice;

    this.state.account.balance += pos.pnl;
    this.state.account.margin -= pos.margin;

    this.state.closedPositions.unshift(pos);
    this.state.positions.splice(idx, 1);

    this.updateAccountEquity();
    this.updateChartLines();
    this.notify();

    return true;
  }

  // ---- إلغاء أمر معلق ----
  cancelPendingOrder(orderId: string): boolean {
    const idx = this.state.pendingOrders.findIndex(o => o.id === orderId);
    if (idx === -1) return false;

    this.state.pendingOrders.splice(idx, 1);
    this.updateChartLines();
    this.notify();
    return true;
  }

  // ---- تعديل وقف الخسارة ----
  modifyStopLoss(positionId: string, newSL: number): boolean {
    const info = SYMBOLS[this.state.selectedSymbol];
    if (!info) return false;

    const pos = this.state.positions.find(p => p.id === positionId);
    if (!pos) {
      // جرب الأوامر المعلقة
      const pending = this.state.pendingOrders.find(o => o.id === positionId);
      if (pending) {
        pending.stopLoss = parseFloat(newSL.toFixed(info.digits));
        this.updateChartLines();
        this.notify();
        return true;
      }
      return false;
    }

    pos.stopLoss = parseFloat(newSL.toFixed(info.digits));
    this.updateChartLines();
    this.notify();
    return true;
  }

  // ---- تعديل جني الأرباح ----
  modifyTakeProfit(positionId: string, newTP: number): boolean {
    const info = SYMBOLS[this.state.selectedSymbol];
    if (!info) return false;

    const pos = this.state.positions.find(p => p.id === positionId);
    if (!pos) {
      const pending = this.state.pendingOrders.find(o => o.id === positionId);
      if (pending) {
        pending.takeProfit = parseFloat(newTP.toFixed(info.digits));
        this.updateChartLines();
        this.notify();
        return true;
      }
      return false;
    }

    pos.takeProfit = parseFloat(newTP.toFixed(info.digits));
    this.updateChartLines();
    this.notify();
    return true;
  }

  // ---- تعديل سعر الأمر المعلق ----
  modifyPendingPrice(orderId: string, newPrice: number): boolean {
    const info = SYMBOLS[this.state.selectedSymbol];
    if (!info) return false;

    const order = this.state.pendingOrders.find(o => o.id === orderId);
    if (!order) return false;

    order.price = parseFloat(newPrice.toFixed(info.digits));
    this.updateChartLines();
    this.notify();
    return true;
  }

  // ---- تغيير الزوج ----
  changeSymbol(symbol: string) {
    if (!SYMBOLS[symbol]) return;
    
    this.state.selectedSymbol = symbol;
    const info = SYMBOLS[symbol];
    const candles = this.candles.get(symbol);
    
    if (candles && candles.length > 0) {
      const lastPrice = candles[candles.length - 1].close;
      const spreadAmount = info.spreadPips * info.pipSize;
      this.state.spread = {
        bid: lastPrice,
        ask: parseFloat((lastPrice + spreadAmount).toFixed(info.digits)),
        spread: spreadAmount,
        spreadPips: info.spreadPips
      };
    }

    this.updateChartLines();
    this.notify();
  }

  // ---- تغيير الإطار الزمني ----
  changeTimeframe(tf: TimeFrame) {
    this.state.selectedTimeframe = tf;
    this.notify();
  }

  // ---- إغلاق كل الصفقات ----
  closeAllPositions() {
    const openIds = this.state.positions
      .filter(p => p.status === 'OPEN')
      .map(p => p.id);
    
    openIds.forEach(id => this.closePosition(id));
  }

  // ---- تغيير الرافعة المالية ----
  setLeverage(leverage: number) {
    this.state.account.leverage = leverage;
    this.updateAccountEquity();
    this.notify();
  }

  // ---- إعادة تعيين الحساب ----
  resetAccount() {
    this.state = createInitialState();
    this.initCandles();
    this.updateChartLines();
    this.notify();
  }

  // ---- التنظيف ----
  destroy() {
    this.stopPriceSimulation();
    this.listeners.clear();
  }
}

// Singleton instance
let engineInstance: TradingEngine | null = null;

export function getTradingEngine(): TradingEngine {
  if (!engineInstance) {
    engineInstance = new TradingEngine();
  }
  return engineInstance;
}
