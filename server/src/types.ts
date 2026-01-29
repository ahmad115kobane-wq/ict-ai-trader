// types.ts - أنواع البيانات للسيرفر
// ═══════════════════════════════════════════════════════════════════════════════
// 📌 Version: 2.2.0 - Enhanced types for ICT Analysis
// ═══════════════════════════════════════════════════════════════════════════════

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

// ===================== Killzone / Session Management =====================
// 📌 معلومات جلسة التداول (Killzone)
export interface KillzoneInfo {
  isActive: boolean;
  session: 'ASIA' | 'LONDON' | 'NY_AM' | 'NY_PM' | 'OFF_HOURS';
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
  minutesToEnd: number;
  description: string;
}

export interface H1Analysis {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trendStrength?: 'STRONG' | 'MODERATE' | 'WEAK';
  allowBuy: boolean;
  allowSell: boolean;
  liquiditySweep: string;
  nearestBSL: string;
  nearestSSL: string;
  structureDescription?: string;
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
  strength?: 'STRONG' | 'MEDIUM' | 'WEAK'; // قوة الـ OB (v2.2)
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
  marketStructure: 'MSS' | 'CHoCH' | 'BOS' | 'CONSOLIDATION';
  mssOccurredAfterSweep?: boolean; // هل حدث MSS بعد سحب السيولة (v2.2)
  displacement: 'STRONG' | 'MODERATE' | 'WEAK';
  pdArray: 'FVG' | 'OB' | 'FVG_IN_OB' | 'NONE';
  readyForEntry: boolean;
  obStrength?: 'STRONG' | 'MEDIUM' | 'WEAK'; // قوة OB الدخول (v2.2)
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

// ===================== ICT Analysis Result =====================
// 📌 نتيجة التحليل الكاملة
export interface ICTAnalysis {
  decision: 'PLACE_PENDING' | 'NO_TRADE';
  score: number;
  confidence: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  bias: string;
  htfAlignment?: boolean; // توافق الاتجاه مع H1 (v2.2)
  h1Analysis: H1Analysis;
  m5Analysis: M5Analysis;
  priceLocation: 'PREMIUM' | 'DISCOUNT' | 'MID';
  liquidityPurge: LiquidityPurge;
  drawOnLiquidity: DrawOnLiquidity;
  confluences: string[];
  reasons: string[];
  reasoning: string;
  suggestedTrade?: SuggestedTrade;
  killzoneInfo?: KillzoneInfo; // معلومات جلسة التداول (v2.2)
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
