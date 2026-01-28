// types.ts - أنواع البيانات للسيرفر

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type TradeType = 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';

export interface SuggestedTrade {
  type: TradeType;
  entry: number;
  sl: number;
  tp?: number; // للتوافق مع الكود القديم
  tp1: number;
  tp2: number;
  tp3: number;
  expiryMinutes: number;
  cancelConditions: string[];
  rrRatio?: string;
}

export interface H1Analysis {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  allowBuy: boolean;
  allowSell: boolean;
  liquiditySweep: string;
  nearestBSL: string;
  nearestSSL: string;
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

export interface M5Analysis {
  marketStructure: 'MSS' | 'CHoCH' | 'CONSOLIDATION';
  displacement: 'STRONG' | 'MODERATE' | 'WEAK';
  pdArray: 'FVG' | 'OB' | 'FVG_IN_OB' | 'NONE';
  readyForEntry: boolean;
  // تفاصيل FVG و OB الجديدة
  fvgDetails?: FVGDetails;
  obDetails?: OBDetails;
  entryZone?: EntryZone;
}

export interface LiquidityPurge {
  occurred: boolean;
  type: 'BSL' | 'SSL' | 'NONE';
  levelName: string;
  evidence: {
    wickRejection: boolean;
    closedBackInside: boolean;
    reversedWithin3Candles: boolean;
  };
}

export interface DrawOnLiquidity {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  target: string;
  nearestBSL: string;
  nearestSSL: string;
}

export interface ICTAnalysis {
  decision: 'PLACE_PENDING' | 'NO_TRADE';
  score: number;
  confidence: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  bias: string;
  h1Analysis: H1Analysis;
  m5Analysis: M5Analysis;
  priceLocation: 'PREMIUM' | 'DISCOUNT' | 'MID';
  liquidityPurge: LiquidityPurge;
  drawOnLiquidity: DrawOnLiquidity;
  confluences: string[];
  reasons: string[];
  reasoning: string;
  suggestedTrade?: SuggestedTrade;
}

export interface User {
  id: string;
  email: string;
  password: string;
  coins: number;
  subscription: 'free' | 'pro' | 'premium';
  subscriptionExpiry: string | null;
  createdAt: string;
}

export interface AnalysisHistory {
  id: string;
  userId: string;
  symbol: string;
  decision: string;
  score: number;
  confidence: number;
  suggestedTrade: string | null;
  createdAt: string;
}

export interface ManagementAdvice {
  status: 'HOLD' | 'MOVE_TO_BE' | 'PARTIAL_CLOSE' | 'CLOSE_NOW';
  reversalProbability: number;
  message: string;
  actionRequired: string;
}
