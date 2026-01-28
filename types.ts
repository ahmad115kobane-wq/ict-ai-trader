
export enum AppState {
  LOGIN = 'LOGIN',
  MT5_CONFIG = 'MT5_CONFIG',
  DASHBOARD = 'DASHBOARD'
}

export enum DashboardTab {
  HOME = 'HOME',
  TRADES = 'TRADES',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS'
}

export enum TradeType {
  BUY_LIMIT = 'BUY_LIMIT',
  SELL_LIMIT = 'SELL_LIMIT',
  BUY_STOP = 'BUY_STOP',
  SELL_STOP = 'SELL_STOP',
  MARKET_BUY = 'MARKET_BUY',
  MARKET_SELL = 'MARKET_SELL'
}

export interface Trade {
  id: string;
  symbol: string;
  type: TradeType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  volume: number;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  timestamp: number;
  analysisId?: string;
  pnl?: number;
}

export interface KillzoneInfo {
  isActive: boolean;
  session: 'ASIA' | 'LONDON' | 'NY_AM' | 'NY_PM' | 'OFF_HOURS';
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
  minutesToEnd: number;
  description?: string; // وصف الجلسة بالعربية (v2.2)
}

// Fair Value Gap (FVG) - فجوة القيمة العادلة
export interface FVGDetails {
  exists: boolean;
  type: 'BULLISH' | 'BEARISH' | 'NONE';
  topPrice: number;      // الحد العلوي للفجوة
  bottomPrice: number;   // الحد السفلي للفجوة
  midPrice: number;      // منتصف الفجوة (نقطة الدخول المثالية)
  isFilled: boolean;     // هل تم ملء الفجوة
  fillPercentage: number; // نسبة الملء (0-100)
  candlesAgo: number;    // عدد الشموع منذ تكوين الفجوة
  isValid: boolean;      // هل الفجوة صالحة للدخول
}

// Order Block (OB) - كتلة الأوامر
export interface OBDetails {
  exists: boolean;
  type: 'BULLISH' | 'BEARISH' | 'NONE';
  topPrice: number;      // الحد العلوي للـ OB
  bottomPrice: number;   // الحد السفلي للـ OB
  mitigationLevel: number; // مستوى التخفيف (50% من OB)
  isBreaker: boolean;    // هل تحول إلى Breaker Block
  candlesAgo: number;    // عدد الشموع منذ تكوين الـ OB
  hasBeenTested: boolean; // هل تم اختباره
  isValid: boolean;      // هل الـ OB صالح للدخول
}

// Entry Zone - منطقة الدخول المحددة
export interface EntryZone {
  type: 'FVG' | 'OB' | 'FVG_IN_OB' | 'NONE';  // FVG_IN_OB = فجوة داخل كتلة أوامر (الأفضل)
  topPrice: number;
  bottomPrice: number;
  optimalEntry: number;  // نقطة الدخول المثالية
  isValid: boolean;
  description: string;   // وصف المنطقة بالعربية
}

export interface SuggestedTrade {
  type: TradeType;
  entry: number;
  sl: number;
  tp?: number; // للتوافق مع الكود القديم
  tp1: number;
  tp2: number;
  tp3: number;
  rrRatio: string;
  calculatedRR?: number;
  expiryMinutes: number;
  cancelConditions: string[];
}

export interface ICTAnalysis {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  setupDetected: string[]; 
  bias: string;
  htfAlignment?: boolean;
  liquidityPurge: {
    occurred: boolean;
    type: 'BSL' | 'SSL' | 'INTERNAL' | 'NONE';
    levelName: string;
    wasClean?: boolean;
  };
  marketStructure: 'BOS' | 'MSS' | 'SMS' | 'CONSOLIDATION';
  displacementStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  pdArrayDetails: {
    primary: string;
    secondary?: string;
    isOTE: boolean;
    fibLevel?: number;
  };
  drawOnLiquidity: string;
  reasoning: string;
  
  // Strict Decision Fields
  decision: 'PLACE_PENDING' | 'NO_TRADE';
  score: number; // 0-10
  reasons: string[];
  
  // Killzone Info
  killzoneInfo?: KillzoneInfo;
  
  // Trade Suggestion
  suggestedTrade?: SuggestedTrade;
  
  // FVG and OB Entry Zone Details
  fvgDetails?: FVGDetails;
  obDetails?: OBDetails;
  entryZone?: EntryZone;
}

export interface ManagementAdvice {
  status: 'HOLD' | 'MOVE_TO_BE' | 'PARTIAL_CLOSE' | 'CLOSE_NOW';
  reversalProbability: number;
  message: string;
  actionRequired: string;
}

export interface MT5Config {
  login: string;
  server: string;
  password?: string;
  platform: 'MT5' | 'MT4';
  accountType: 'DEMO' | 'REAL';
  isConnected: boolean;
  apiUrl?: string;
  apiToken?: string;
}
