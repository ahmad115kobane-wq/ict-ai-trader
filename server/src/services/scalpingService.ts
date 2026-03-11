// services/scalpingService.ts - Fast Scalping Strategy
// ═══════════════════════════════════════════════════════════════════════════════
// ✅ استراتيجية سكالبينج سريعة على فريم 5 دقائق
// ✅ تعمل على مدار اليوم بدون توقف
// ✅ أهداف قريبة (5-10 نقاط) و SL قريب (3-5 نقاط)
// ═══════════════════════════════════════════════════════════════════════════════

import { ICTAnalysis, SuggestedTrade } from "../types";

console.log("🚀 Scalping Service v1.0 - Fast 5M Strategy");

// ===================== Scalping Constants =====================
const SCALP_TP_DISTANCE = 7;      // هدف 7 دولار
const SCALP_SL_DISTANCE = 4;      // استوب 4 دولار
const MIN_MOMENTUM_SCORE = 6;     // الحد الأدنى للزخم
const COOLDOWN_MINUTES = 5;       // فترة الانتظار بين الصفقات

// ===================== Market State =====================
interface MarketState {
  lastTradeTime: Date | null;
  consecutiveLosses: number;
  consecutiveWins: number;
  todayTrades: number;
  lastPrice: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

const marketState: MarketState = {
  lastTradeTime: null,
  consecutiveLosses: 0,
  consecutiveWins: 0,
  todayTrades: 0,
  lastPrice: 0,
  trend: 'NEUTRAL'
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 تحليل الزخم السريع (Fast Momentum Analysis)
// ═══════════════════════════════════════════════════════════════════════════════

interface MomentumAnalysis {
  direction: 'BUY' | 'SELL' | 'WAIT';
  strength: number;
  score: number;
  reason: string;
  canTrade: boolean;
}

function analyzeFastMomentum(candles: any[]): MomentumAnalysis {
  if (!candles || candles.length < 10) {
    return {
      direction: 'WAIT',
      strength: 0,
      score: 0,
      reason: 'بيانات غير كافية',
      canTrade: false
    };
  }

  const recent = candles.slice(-10);
  const lastCandle = recent[recent.length - 1];
  const prevCandle = recent[recent.length - 2];
  
  // حساب الزخم من آخر 5 شموع
  const last5 = recent.slice(-5);
  let bullishCount = 0;
  let bearishCount = 0;
  let totalVolume = 0;

  for (const candle of last5) {
    const body = Math.abs(candle.close - candle.open);
    const isBullish = candle.close > candle.open;
    
    if (isBullish) {
      bullishCount++;
    } else {
      bearishCount++;
    }
    
    totalVolume += body;
  }

  // حساب متوسط حجم الشمعة
  const avgBody = totalVolume / 5;
  const lastBody = Math.abs(lastCandle.close - lastCandle.open);
  
  // قوة الزخم (0-10)
  let strength = 0;
  let direction: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let reason = '';

  // تحديد الاتجاه
  if (bullishCount >= 4) {
    direction = 'BUY';
    strength = (bullishCount / 5) * 10;
    reason = `زخم صاعد قوي: ${bullishCount}/5 شموع صاعدة`;
  } else if (bearishCount >= 4) {
    direction = 'SELL';
    strength = (bearishCount / 5) * 10;
    reason = `زخم هابط قوي: ${bearishCount}/5 شموع هابطة`;
  } else {
    direction = 'WAIT';
    strength = 5;
    reason = 'زخم متذبذب - انتظار';
  }

  // تعزيز القوة إذا كانت الشمعة الأخيرة قوية
  if (lastBody > avgBody * 1.5) {
    strength += 2;
    reason += ' + شمعة قوية';
  }

  // حساب النقاط (0-10)
  const score = Math.min(10, Math.round(strength));

  // التحقق من إمكانية التداول
  const canTrade = score >= MIN_MOMENTUM_SCORE && direction !== 'WAIT';

  console.log(`📊 Momentum: ${direction} | Score: ${score}/10 | ${reason}`);

  return {
    direction,
    strength,
    score,
    reason,
    canTrade
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 تحليل الدعم والمقاومة السريع
// ═══════════════════════════════════════════════════════════════════════════════

interface SupportResistance {
  support: number;
  resistance: number;
  nearSupport: boolean;
  nearResistance: boolean;
}

function findQuickSR(candles: any[], currentPrice: number): SupportResistance {
  const recent = candles.slice(-20);
  
  // إيجاد أعلى وأدنى سعر في آخر 20 شمعة
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);
  
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);
  
  // التحقق من القرب (ضمن 0.3%)
  const distanceToResistance = (resistance - currentPrice) / currentPrice;
  const distanceToSupport = (currentPrice - support) / currentPrice;
  
  const nearResistance = distanceToResistance < 0.003; // 0.3%
  const nearSupport = distanceToSupport < 0.003;
  
  console.log(`🎯 S/R: Support=${support.toFixed(2)} | Resistance=${resistance.toFixed(2)}`);
  
  return {
    support,
    resistance,
    nearSupport,
    nearResistance
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 التحليل الرئيسي للسكالبينج
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeScalping(
  symbol: string,
  m5Candles: any[],
  currentPrice: number
): Promise<ICTAnalysis> {
  console.log(`\n🔥 ═══════════════════════════════════════════════════════`);
  console.log(`🔥 Scalping Analysis - ${symbol} @ ${currentPrice.toFixed(2)}`);
  console.log(`🔥 ═══════════════════════════════════════════════════════\n`);

  // التحقق من فترة الانتظار
  if (marketState.lastTradeTime) {
    const timeSinceLastTrade = Date.now() - marketState.lastTradeTime.getTime();
    const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
    
    if (timeSinceLastTrade < cooldownMs) {
      const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastTrade) / 60000);
      console.log(`⏳ Cooldown: ${remainingMinutes} دقيقة متبقية`);
      
      return {
        symbol,
        currentPrice,
        decision: 'WAIT',
        bias: 'NEUTRAL',
        score: 0,
        confidence: 0,
        reasoning: `انتظار ${remainingMinutes} دقيقة قبل الصفقة التالية`,
        suggestedTrade: undefined,
        killzones: [],
        managementAdvice: {
          stopLoss: 0,
          takeProfit1: 0,
          takeProfit2: 0,
          takeProfit3: 0,
          riskRewardRatio: 0,
          positionSize: 0.1
        }
      };
    }
  }

  // 1. تحليل الزخم
  const momentum = analyzeFastMomentum(m5Candles);
  
  // 2. تحليل الدعم والمقاومة
  const sr = findQuickSR(m5Candles, currentPrice);
  
  // 3. تحديد القرار
  let decision: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let score = momentum.score;
  let reasoning = momentum.reason;
  
  if (momentum.canTrade) {
    if (momentum.direction === 'BUY' && !sr.nearResistance) {
      decision = 'BUY';
      reasoning += ' | بعيد عن المقاومة';
    } else if (momentum.direction === 'SELL' && !sr.nearSupport) {
      decision = 'SELL';
      reasoning += ' | بعيد عن الدعم';
    } else {
      decision = 'WAIT';
      score = 5;
      reasoning = 'قريب من مستوى حرج - انتظار';
    }
  }

  // 4. حساب SL و TP
  let suggestedTrade: SuggestedTrade | undefined;
  
  if (decision !== 'WAIT') {
    const entry = currentPrice;
    const sl = decision === 'BUY' 
      ? entry - SCALP_SL_DISTANCE 
      : entry + SCALP_SL_DISTANCE;
    const tp1 = decision === 'BUY'
      ? entry + SCALP_TP_DISTANCE
      : entry - SCALP_TP_DISTANCE;
    const tp2 = decision === 'BUY'
      ? entry + (SCALP_TP_DISTANCE * 1.5)
      : entry - (SCALP_TP_DISTANCE * 1.5);
    const tp3 = decision === 'BUY'
      ? entry + (SCALP_TP_DISTANCE * 2)
      : entry - (SCALP_TP_DISTANCE * 2);

    suggestedTrade = {
      type: decision,
      entry: parseFloat(entry.toFixed(2)),
      sl: parseFloat(sl.toFixed(2)),
      tp1: parseFloat(tp1.toFixed(2)),
      tp2: parseFloat(tp2.toFixed(2)),
      tp3: parseFloat(tp3.toFixed(2))
    };

    // تحديث حالة السوق
    marketState.lastTradeTime = new Date();
    marketState.todayTrades++;
    marketState.lastPrice = currentPrice;
    marketState.trend = decision === 'BUY' ? 'BULLISH' : 'BEARISH';

    console.log(`\n✅ إشارة ${decision}:`);
    console.log(`   Entry: ${entry.toFixed(2)}`);
    console.log(`   SL: ${sl.toFixed(2)} (${SCALP_SL_DISTANCE}$)`);
    console.log(`   TP1: ${tp1.toFixed(2)} (${SCALP_TP_DISTANCE}$)`);
    console.log(`   TP2: ${tp2.toFixed(2)}`);
    console.log(`   TP3: ${tp3.toFixed(2)}`);
  }

  const confidence = decision === 'WAIT' ? 0 : Math.min(95, score * 10);

  return {
    symbol,
    currentPrice,
    decision,
    bias: decision === 'BUY' ? 'BULLISH' : decision === 'SELL' ? 'BEARISH' : 'NEUTRAL',
    score,
    confidence,
    reasoning,
    suggestedTrade,
    killzones: [],
    managementAdvice: {
      stopLoss: suggestedTrade?.sl || 0,
      takeProfit1: suggestedTrade?.tp1 || 0,
      takeProfit2: suggestedTrade?.tp2 || 0,
      takeProfit3: suggestedTrade?.tp3 || 0,
      riskRewardRatio: SCALP_TP_DISTANCE / SCALP_SL_DISTANCE,
      positionSize: 0.1
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 إحصائيات اليوم
// ═══════════════════════════════════════════════════════════════════════════════

export function getTodayStats() {
  return {
    todayTrades: marketState.todayTrades,
    consecutiveWins: marketState.consecutiveWins,
    consecutiveLosses: marketState.consecutiveLosses,
    currentTrend: marketState.trend,
    lastTradeTime: marketState.lastTradeTime
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 إعادة تعيين الإحصائيات اليومية
// ═══════════════════════════════════════════════════════════════════════════════

export function resetDailyStats() {
  marketState.todayTrades = 0;
  marketState.consecutiveWins = 0;
  marketState.consecutiveLosses = 0;
  console.log('📊 Daily stats reset');
}
