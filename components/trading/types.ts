// =============================================
// نظام التداول - أنواع البيانات
// Trading System - Type Definitions
// =============================================

export interface TradingAccount {
  balance: number;        // الرصيد الكلي
  equity: number;         // حقوق الملكية (الرصيد + الربح/الخسارة العائم)
  margin: number;         // الهامش المستخدم
  freeMargin: number;     // الهامش المتاح
  marginLevel: number;    // مستوى الهامش (%)
  leverage: number;       // الرافعة المالية
  currency: string;       // عملة الحساب
}

export type OrderDirection = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type PositionStatus = 'OPEN' | 'CLOSED' | 'PENDING';

export interface SpreadInfo {
  ask: number;            // سعر الشراء (أعلى)
  bid: number;            // سعر البيع (أقل)
  spread: number;         // الفرق (بالنقاط)
  spreadPips: number;     // السبريد بالنقاط
}

export interface TradingOrder {
  id: string;
  symbol: string;
  direction: OrderDirection;
  type: OrderType;
  volume: number;         // حجم اللوت
  openPrice: number;      // سعر الفتح
  currentPrice: number;   // السعر الحالي
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number;            // الربح/الخسارة
  pnlPips: number;        // الربح/الخسارة بالنقاط
  margin: number;         // الهامش المطلوب
  status: PositionStatus;
  openTime: number;       // وقت الفتح
  closeTime?: number;     // وقت الإغلاق
  closePrice?: number;    // سعر الإغلاق
  swap: number;           // الفوائد
  commission: number;     // العمولة
}

export interface PendingOrder {
  id: string;
  symbol: string;
  direction: OrderDirection;
  type: 'LIMIT' | 'STOP';
  volume: number;
  price: number;          // السعر المطلوب
  stopLoss: number | null;
  takeProfit: number | null;
  expiry?: number;        // وقت الانتهاء
  status: 'PENDING' | 'TRIGGERED' | 'CANCELLED' | 'EXPIRED';
  createdAt: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ChartLine {
  id: string;
  price: number;
  color: string;
  label: string;
  draggable: boolean;
  lineWidth?: number;
  lineStyle?: number; // 0=Solid, 1=Dotted, 2=Dashed
  type: 'TP' | 'SL' | 'ENTRY' | 'ASK' | 'BID' | 'PENDING';
  orderId?: string;
}

export interface SymbolInfo {
  name: string;
  displayName: string;
  digits: number;        // عدد الخانات العشرية
  pipSize: number;       // حجم النقطة
  lotSize: number;       // حجم اللوت
  minLot: number;        // أقل حجم لوت
  maxLot: number;        // أكبر حجم لوت
  lotStep: number;       // خطوة اللوت
  spreadPips: number;    // السبريد الافتراضي
  marginPercent: number; // نسبة الهامش
  contractSize: number;  // حجم العقد
  currency: string;      // عملة الأداة
}

export const SYMBOLS: Record<string, SymbolInfo> = {
  'XAUUSD': {
    name: 'XAUUSD',
    displayName: 'Gold / USD',
    digits: 2,
    pipSize: 0.01,
    lotSize: 100,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 30,
    marginPercent: 1,
    contractSize: 100,
    currency: 'USD'
  },
  'EURUSD': {
    name: 'EURUSD',
    displayName: 'EUR / USD',
    digits: 5,
    pipSize: 0.00001,
    lotSize: 100000,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 12,
    marginPercent: 0.33,
    contractSize: 100000,
    currency: 'USD'
  },
  'GBPUSD': {
    name: 'GBPUSD',
    displayName: 'GBP / USD',
    digits: 5,
    pipSize: 0.00001,
    lotSize: 100000,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 15,
    marginPercent: 0.33,
    contractSize: 100000,
    currency: 'USD'
  },
  'BTCUSD': {
    name: 'BTCUSD',
    displayName: 'Bitcoin / USD',
    digits: 2,
    pipSize: 0.01,
    lotSize: 1,
    minLot: 0.01,
    maxLot: 10,
    lotStep: 0.01,
    spreadPips: 500,
    marginPercent: 5,
    contractSize: 1,
    currency: 'USD'
  },
  'ETHUSDT': {
    name: 'ETHUSDT',
    displayName: 'Ethereum / USDT',
    digits: 2,
    pipSize: 0.01,
    lotSize: 1,
    minLot: 0.01,
    maxLot: 100,
    lotStep: 0.01,
    spreadPips: 200,
    marginPercent: 5,
    contractSize: 1,
    currency: 'USDT'
  },
  'SOLUSDT': {
    name: 'SOLUSDT',
    displayName: 'Solana / USDT',
    digits: 4,
    pipSize: 0.0001,
    lotSize: 1,
    minLot: 0.1,
    maxLot: 1000,
    lotStep: 0.1,
    spreadPips: 50,
    marginPercent: 10,
    contractSize: 1,
    currency: 'USDT'
  }
};

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export interface TradingState {
  account: TradingAccount;
  positions: TradingOrder[];
  pendingOrders: PendingOrder[];
  closedPositions: TradingOrder[];
  selectedSymbol: string;
  selectedTimeframe: TimeFrame;
  spread: SpreadInfo;
  chartLines: ChartLine[];
}
