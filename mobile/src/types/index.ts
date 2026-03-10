// src/types/index.ts
// أنواع البيانات للتطبيق

export interface User {
  id: string;
  email: string;
  coins: number;
  subscription: 'free' | 'pro' | 'premium' | 'weekly';
  subscriptionExpiry?: string;
  autoAnalysisEnabled?: boolean;
  subscriptionStatus?: SubscriptionStatus;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  canAnalyze: boolean;
  subscription?: {
    id: string;
    planName: string;
    packageNameAr: string;
    analysisLimit: number;
    isUnlimited: boolean;
    expiresAt: string;
    status: string;
    features: string[];
  };
  analysisInfo?: {
    remaining: number;
    used: number;
    limit: number;
  };
}

export interface Package {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  durationType: string;
  durationDays: number;
  price: number;
  coinsIncluded: number;
  analysisLimit: number;
  features: string[];
  isUnlimited: boolean;
}

export type TradeType = 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';

export interface SuggestedTrade {
  type: TradeType;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  rrRatio?: string;
  expiryMinutes?: number;
}

export interface Analysis {
  id?: string;
  decision: 'PLACE_PENDING' | 'NO_TRADE';
  score: number;
  confidence: number;
  price?: number;
  reasoning?: string;
  bias?: string;
  suggestedTrade?: SuggestedTrade;
  keyLevels?: any;
  waitingFor?: string[];
  createdAt?: string;
  symbol?: string;
}

export interface TradeHistory {
  id: string;
  symbol: string;
  decision: string;
  score: number;
  confidence: number;
  price: number;
  suggestedTrade?: SuggestedTrade;
  createdAt: string;
  status?: 'pending' | 'active' | 'closed';
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: string;
}

export type PositionSide = 'BUY' | 'SELL';

export interface PaperPosition {
  id: string;
  symbol: string;
  side: PositionSide;
  lotSize: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  openedAt: string;
  closedAt?: string;
  closePrice?: number;
  realizedPnl?: number;
  status: 'open' | 'closed';
}

export interface PaperTradingAccount {
  initialBalance: number;
  balance: number;
  equity: number;
  floatingPnl: number;
  closedPnl: number;
  usedMargin: number;
  freeMargin: number;
  openPositionsCount: number;
}
