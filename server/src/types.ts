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
  tp: number;
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

export interface M5Analysis {
  marketStructure: 'BOS' | 'MSS' | 'CHoCH' | 'CONSOLIDATION';
  displacement: 'STRONG' | 'MODERATE' | 'WEAK';
  pdArray: 'FVG' | 'OB' | 'NONE';
  readyForEntry: boolean;
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
