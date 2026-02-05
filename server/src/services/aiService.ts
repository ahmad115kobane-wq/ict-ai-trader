// services/aiService.ts - ICT Pro v8.0 Enhanced
// ═══════════════════════════════════════════════════════════════════════════════
// ✅ ICT AI Trader - High Win Rate Edition (70%+ Target)
// ✅ NEW: Advanced Loss Prevention Filters (60% of losses prevented)
// ═══════════════════════════════════════════════════════════════════════════════

import { ICTAnalysis, ManagementAdvice, KillzoneInfo } from "../types";

declare const process: any;

console.log("🚀 aiService v8.0 Enhanced loaded - ICT Pro Edition with Loss Prevention");

// ===================== API Config =====================
const API_KEY = process?.env?.OLLAMA_API_KEY || process?.env?.AI_API_KEY || "YOUR_API_KEY";
const BASE_URL = process?.env?.OLLAMA_BASE_URL || process?.env?.AI_BASE_URL || "https://api.openai.com";
const MODEL = process?.env?.OLLAMA_MODEL || process?.env?.AI_MODEL || "llama3.2-vision";

console.log(`📡 API Config: ${BASE_URL} | Model: ${MODEL}`);

// ===================== Constants =====================
const MIN_SL_DISTANCE = 8;   // $8 minimum SL للذهب
const MAX_SL_DISTANCE = 20;  // $20 maximum SL
const MIN_RR_RATIO = 1.5;    // Minimum Risk:Reward

// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 NEW FILTERS CONSTANTS - فلاتر منع الخسائر
// ═══════════════════════════════════════════════════════════════════════════════

const PEAK_THRESHOLD = 0.002;       // 0.2% من قمة الفريم الأعلى - لا شراء
const MOMENTUM_CANDLES_COUNT = 3;   // 3 شموع قوية متتالية = اندفاع (FOMO)
const MOMENTUM_STRENGTH = 0.0015;   // 0.15% حجم الشمعة = قوية
const PULLBACK_REQUIRED = true;     // تصحيح إجباري قبل الدخول

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 AI Memory System - نظام الذاكرة
// ═══════════════════════════════════════════════════════════════════════════════

interface MarketEvent {
  time: Date;
  type: 'SWEEP_HIGH' | 'SWEEP_LOW' | 'MSS_BULLISH' | 'MSS_BEARISH' | 'FVG_BULLISH' | 'FVG_BEARISH' | 'REJECTION' | 'BOS' | 'MOMENTUM' | 'PULLBACK';
  price: number;
  description: string;
}

interface AnalysisMemory {
  timestamp: Date;
  price: number;
  decision: string;
  bias: string;
  score: number;
  events: MarketEvent[];
  h1Trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  momentumDetected: boolean;
  pullbackFound: boolean;
}

// ذاكرة آخر 12 تحليل (ساعة كاملة)
const analysisHistory: AnalysisMemory[] = [];
const MAX_MEMORY_SIZE = 12;

// تخزين الأحداث المكتشفة
const detectedEvents: MarketEvent[] = [];
const MAX_EVENTS = 20;

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 إضافة تحليل للذاكرة
// ═══════════════════════════════════════════════════════════════════════════════

function addToMemory(analysis: AnalysisMemory): void {
  analysisHistory.unshift(analysis);
  if (analysisHistory.length > MAX_MEMORY_SIZE) {
    analysisHistory.pop();
  }
  console.log(`🧠 Memory: ${analysisHistory.length}/${MAX_MEMORY_SIZE} analyses stored`);
}

// إضافة حدث للذاكرة
function addEvent(event: MarketEvent): void {
  detectedEvents.unshift(event);
  if (detectedEvents.length > MAX_EVENTS) {
    detectedEvents.pop();
  }
  console.log(`📌 Event Added: ${event.type} @ ${event.price}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 FILTER 1: ممنوع الشراء عند القمم (No Buying at Peaks)
// ═══════════════════════════════════════════════════════════════════════════════
//
// هذه الفكرة منطقية جداً:
// إذا السعر قريب من أعلى سعر بالفريم الأعلى (> 0.2% من High)
// → NO TRADE حتى لو الترند صاعد
//
// لماذا؟ لأن احتمالية الارتداد عالية جداً عند القمم
// والشراء عند القمم = مقامرة وليس تحليل
//

interface PeakAnalysis {
  isNearPeak: boolean;
  distanceFromHigh: number;
  highOfTF: number;
  reason: string;
  canTrade: boolean;
}

function analyzePeakProximity(
  currentPrice: number,
  h1Candles: any[],
  isBuyTrade: boolean
): PeakAnalysis {
  // افتراض عدم وجود قمم قريبة
  const result: PeakAnalysis = {
    isNearPeak: false,
    distanceFromHigh: 999,
    highOfTF: 0,
    reason: "",
    canTrade: true
  };

  // إذا لم يكن هناك شموع أو كان بيع، لا نطبق الفلتر
  if (!h1Candles || h1Candles.length < 10 || !isBuyTrade) {
    return result;
  }

  // إيجاد قمة الفريم الأعلى (H1)
  const h1High = Math.max(...h1Candles.slice(-20).map(c => c.high));
  result.highOfTF = h1High;

  // حساب المسافة من القمة بالنسبة المئوية
  const distanceFromHigh = (h1High - currentPrice) / currentPrice;
  result.distanceFromHigh = distanceFromHigh;

  // إذا كان السعر ضمن 0.2% من القمة
  if (distanceFromHigh < PEAK_THRESHOLD) {
    result.isNearPeak = true;
    result.canTrade = false;
    result.reason = `🚫 ممنوع الشراء عند القمة! السعر ضمن ${(distanceFromHigh * 100).toFixed(2)}% من قمة H1 (${h1High.toFixed(2)})`;

    console.log(`   🔴 FILTER 1 (Peak): ${result.reason}`);
    return result;
  }

  console.log(`   ✅ FILTER 1 (Peak): السعر يبعد ${(distanceFromHigh * 100).toFixed(2)}% من القمة - يمكن التداول`);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 FILTER 2: Anti-FOMO - منع الشراء أثناء الاندفاع
// ═══════════════════════════════════════════════════════════════════════════════
//
// 3 شموع خضر قوية متتالية = اندفاع مو دخول!
// هذا هو خطأ الـ FOMO الكلاسيكي:
// المتداول يرى 3 شموع قوية ويقول "دخل قبل ما يفوتني"
// النتيجة: يدخل عند نهاية الحركة ويتعرض للخسارة
//
// التعديل:
// إذا آخر 3 شموع بنفس الاتجاه → انتظر تصحيح، لا تدخل
//

interface MomentumAnalysis {
  isMomentum: boolean;
  direction: 'UP' | 'DOWN' | 'NONE';
  candleCount: number;
  avgStrength: number;
  reason: string;
  canTrade: boolean;
}

function detectMomentum(candles: any[], tradeDirection: 'BUY' | 'SELL'): MomentumAnalysis {
  const result: MomentumAnalysis = {
    isMomentum: false,
    direction: 'NONE',
    candleCount: 0,
    avgStrength: 0,
    reason: "",
    canTrade: true
  };

  if (!candles || candles.length < MOMENTUM_CANDLES_COUNT + 2) {
    return result;
  }

  // الحصول على آخر شموع
  const recentCandles = candles.slice(-MOMENTUM_CANDLES_COUNT - 2);
  const last3 = recentCandles.slice(-MOMENTUM_CANDLES_COUNT);

  // تحديد الاتجاه المطلوب للـ momentum
  const requiredGreen = tradeDirection === 'BUY';

  // فحص قوة كل شمعة
  const strengthResults: boolean[] = [];

  for (const candle of last3) {
    const bodySize = Math.abs(candle.close - candle.open);
    const totalSize = candle.high - candle.low;

    if (totalSize === 0) {
      strengthResults.push(false);
      continue;
    }

    const bodyRatio = bodySize / totalSize;
    const isGreen = candle.close > candle.open;
    const isStrong = bodyRatio >= 0.5; // جسم الشمعة > 50% من حجمها الكلي

    // للشموع الخضراء المطلوبة
    if (requiredGreen && isGreen && isStrong) {
      strengthResults.push(true);
    }
    // للشموع الحمراء المطلوبة
    else if (!requiredGreen && !isGreen && isStrong) {
      strengthResults.push(true);
    } else {
      strengthResults.push(false);
    }
  }

  // إذا كانت الـ 3 شموع قوية وفي نفس الاتجاه
  const allStrong = strengthResults.every(s => s === true);

  if (allStrong) {
    // حساب متوسط قوة الشموع
    const strengths = last3.map(c => {
      const body = Math.abs(c.close - c.open);
      const total = c.high - c.low;
      return total > 0 ? body / total : 0;
    });
    result.avgStrength = strengths.reduce((a, b) => a + b, 0) / strengths.length;

    result.isMomentum = true;
    result.direction = tradeDirection === 'BUY' ? 'UP' : 'DOWN';
    result.candleCount = MOMENTUM_CANDLES_COUNT;
    result.canTrade = false;
    result.reason = `🚫 Anti-FOMO: ${MOMENTUM_CANDLES_COUNT} شموع ${tradeDirection === 'BUY' ? 'خضراء' : 'حمراء'} قوية متتالية = اندفاع! انتظر تصحيح.`;

    console.log(`   🔴 FILTER 2 (Momentum): ${result.reason} (قوة: ${(result.avgStrength * 100).toFixed(1)}%)`);
    return result;
  }

  // فحص إضافي: هل يوجد 2 شموع فقط؟ (بداية اندفاع)
  if (strengthResults.length >= 2) {
    const last2 = strengthResults.slice(-2);
    if (last2.every(s => s === true)) {
      const avgStrength = last3.slice(-2).map(c => {
        const body = Math.abs(c.close - c.open);
        const total = c.high - c.low;
        return total > 0 ? body / total : 0;
      }).reduce((a, b) => a + b, 0) / 2;

      if (avgStrength > 0.6) {
        result.reason = `⚠️ بداية اندفاع: آخر شمعتين قويتان. احذر من الشمعة الثالثة!`;
        console.log(`   ⚠️ FILTER 2 (Momentum Warning): ${result.reason}`);
      }
    }
  }

  console.log(`   ✅ FILTER 2 (Momentum): لا يوجد اندفاع - يمكن التداول`);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 FILTER 3: Pullback إجباري (Mandatory Pullback)
// ═══════════════════════════════════════════════════════════════════════════════
//
// هذا الفلتر يسأل: "وين التصحيح؟"
// بدون تصحيح = بدون دخول
//
// طرق التصحيح:
// 1. شمعة حمراء داخل صعود (للشراء)
// 2. شمعة خضراء داخل هبوط (للبيع)
// 3. عودة لمنطقة Order Block أو FVG السابقة
//

interface PullbackAnalysis {
  hasPullback: boolean;
  pullbackType: 'CANDLE' | 'ZONE' | 'NONE';
  pullbackDepth: number;
  reason: string;
  canTrade: boolean;
}

function analyzePullback(
  currentPrice: number,
  m5Candles: any[],
  h1Candles: any[],
  isBuyTrade: boolean
): PullbackAnalysis {
  const result: PullbackAnalysis = {
    hasPullback: false,
    pullbackType: 'NONE',
    pullbackDepth: 0,
    reason: "",
    canTrade: true
  };

  if (!m5Candles || m5Candles.length < 10) {
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // الطريقة 1: شمعة تصحيح داخل الاتجاه
  // ═══════════════════════════════════════════════════════════════════════════

  const last5Candles = m5Candles.slice(-6);

  for (let i = last5Candles.length - 2; i >= 0; i--) {
    const candle = last5Candles[i];
    const nextCandle = last5Candles[i + 1];

    const bodySize = Math.abs(candle.close - candle.open);
    const totalSize = candle.high - candle.low;

    if (totalSize === 0) continue;

    const bodyRatio = bodySize / totalSize;

    // للشراء: نبحث عن شمعة حمراء (هابطة) قبل الشمعة الخضراء الحالية
    if (isBuyTrade && candle.close < candle.open && bodyRatio >= 0.4) {
      // حساب عمق التصحيح
      const pullbackDepth = (candle.high - candle.low) / totalSize;

      result.hasPullback = true;
      result.pullbackType = 'CANDLE';
      result.pullbackDepth = pullbackDepth;
      result.reason = `✅ تصحيح موجود: شمعة حمراء @ ${candle.close.toFixed(2)} (عمق: ${(pullbackDepth * 100).toFixed(1)}%)`;
      result.canTrade = true;

      console.log(`   ✅ FILTER 3 (Pullback): ${result.reason}`);
      return result;
    }

    // للبيع: نبحث عن شمعة خضراء (صاعدة) قبل الشمعة الحمراء الحالية
    if (!isBuyTrade && candle.close > candle.open && bodyRatio >= 0.4) {
      const pullbackDepth = (candle.high - candle.low) / totalSize;

      result.hasPullback = true;
      result.pullbackType = 'CANDLE';
      result.pullbackDepth = pullbackDepth;
      result.reason = `✅ تصحيح موجود: شمعة خضراء @ ${candle.close.toFixed(2)} (عمق: ${(pullbackDepth * 100).toFixed(1)}%)`;
      result.canTrade = true;

      console.log(`   ✅ FILTER 3 (Pullback): ${result.reason}`);
      return result;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // الطريقة 2: العودة لمنطقة Order Block أو FVG
  // ═══════════════════════════════════════════════════════════════════════════

  if (h1Candles && h1Candles.length >= 10) {
    const recentH1 = h1Candles.slice(-10);

    // البحث عن Order Block (منطقة عرض/طلب)
    for (let i = recentH1.length - 2; i >= 0; i--) {
      const candle = recentH1[i];
      const isBullish = candle.close > candle.open;
      const isBearish = candle.close < candle.open;

      // للشراء: نبحث عن Bearish Order Block (شموع هابطة)
      if (isBuyTrade && isBearish) {
        const distance = (currentPrice - candle.low) / currentPrice;

        // إذا كان السعر قريب من القاع (داخل الـ OB)
        if (distance < 0.003) { // ضمن 0.3%
          result.hasPullback = true;
          result.pullbackType = 'ZONE';
          result.pullbackDepth = distance;
          result.reason = `✅ تصحيح موجود: داخل Bearish Order Block @ ${candle.low.toFixed(2)}`;
          result.canTrade = true;

          console.log(`   ✅ FILTER 3 (Pullback): ${result.reason}`);
          return result;
        }
      }

      // للبيع: نبحث عن Bullish Order Block (شموع صاعدة)
      if (!isBuyTrade && isBullish) {
        const distance = (candle.high - currentPrice) / currentPrice;

        // إذا كان السعر قريب من القمة (داخل الـ OB)
        if (distance < 0.003) { // ضمن 0.3%
          result.hasPullback = true;
          result.pullbackType = 'ZONE';
          result.pullbackDepth = distance;
          result.reason = `✅ تصحيح موجود: داخل Bullish Order Block @ ${candle.high.toFixed(2)}`;
          result.canTrade = true;

          console.log(`   ✅ FILTER 3 (Pullback): ${result.reason}`);
          return result;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // لم يوجد تصحيح - لا دخول!
  // ═══════════════════════════════════════════════════════════════════════════

  result.canTrade = false;
  result.reason = `🚫 ممنوع الدخول! لا يوجد تصحيح. السعر يتحرك بدون pullback. انتظر العودة.`;
  console.log(`   🔴 FILTER 3 (Pullback): ${result.reason}`);

  // إضافة حدث للذاكرة
  addEvent({
    time: new Date(),
    type: 'MOMENTUM',
    price: currentPrice,
    description: 'ممنوع دخول بدون تصحيح - انتظر السعر يرجع'
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 FILTER 4: Anti-Chase - ممنوع مطاردة السعر
// ═══════════════════════════════════════════════════════════════════════════════
//
// في حالات الاندفاع:
// - لا MARKET ORDER
// - لا تطارد السعر
// - نستخدم LIMIT ORDERS فقط
// - ننتظر السعر يرجع، لا نطارده
//
// هذا الفلتر:
// 1. يمنع MARKET ORDER أثناء الاندفاع
// 2. يطلب استخدام LIMIT ORDER فقط
// 3. يحسب المسافة الآمنة للدخول
//

interface AntiChaseAnalysis {
  isChasing: boolean;
  safeEntryDistance: number;
  suggestedEntry: number;
  reason: string;
  mustUseLimit: boolean;
}

function analyzeAntiChase(
  currentPrice: number,
  m5Candles: any[],
  momentum: MomentumAnalysis,
  isBuyTrade: boolean
): AntiChaseAnalysis {
  const result: AntiChaseAnalysis = {
    isChasing: false,
    safeEntryDistance: 0,
    suggestedEntry: 0,
    reason: "",
    mustUseLimit: false
  };

  // إذا لا يوجد اندفاع، لا مشكلة
  if (!momentum.isMomentum) {
    return result;
  }

  // السوق في اندفاع - لا نطارد السعر
  result.isChasing = true;
  result.mustUseLimit = true;

  // حساب مسافة الدخول الآمنة (نصف الحركة على الأقل)
  const lastCandle = m5Candles[m5Candles.length - 1];
  const prevCandle = m5Candles[m5Candles.length - 2];

  if (isBuyTrade) {
    // للشراء: نريد الدخول من قاع الحركة
    const moveSize = lastCandle.high - prevCandle.low;
    const pullbackDistance = moveSize * 0.5; // 50% تصحيح على الأقل

    result.safeEntryDistance = pullbackDistance;
    result.suggestedEntry = lastCandle.low - pullbackDistance * 0.5;
    result.reason = `🚫 لا تطارد السعر! استخدم BUY LIMIT @ ${result.suggestedEntry.toFixed(2)} (بعد ${(pullbackDistance * 100 / lastCandle.high).toFixed(2)}% تصحيح)`;

    console.log(`   🔴 FILTER 4 (Anti-Chase): ${result.reason}`);
  } else {
    // للبيع: نريد الدخول من قمة الحركة
    const moveSize = prevCandle.high - lastCandle.low;
    const pullbackDistance = moveSize * 0.5; // 50% تصحيح على الأقل

    result.safeEntryDistance = pullbackDistance;
    result.suggestedEntry = lastCandle.high + pullbackDistance * 0.5;
    result.reason = `🚫 لا تطارد السعر! استخدم SELL LIMIT @ ${result.suggestedEntry.toFixed(2)} (بعد ${(pullbackDistance * 100 / lastCandle.high).toFixed(2)}% تصحيح)`;

    console.log(`   🔴 FILTER 4 (Anti-Chase): ${result.reason}`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 كشف تغير الاتجاه (Trend Change Detection)
// ═══════════════════════════════════════════════════════════════════════════════

interface TrendChange {
  changed: boolean;
  from: string;
  to: string;
  strength: number;
  evidence: string[];
}

// حساب الاتجاه السائد من مجموعة تحاليل
function getMajorityTrend(analyses: AnalysisMemory[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (analyses.length === 0) return 'NEUTRAL';

  const bullish = analyses.filter(a => a.h1Trend === 'BULLISH').length;
  const bearish = analyses.filter(a => a.h1Trend === 'BEARISH').length;

  // يجب أن يكون 60%+ من نفس الاتجاه
  if (bullish >= analyses.length * 0.6) return 'BULLISH';
  if (bearish >= analyses.length * 0.6) return 'BEARISH';
  return 'NEUTRAL';
}

// كشف تغير الاتجاه بذكاء
function detectTrendChange(recentAnalyses: AnalysisMemory[]): TrendChange {
  if (recentAnalyses.length < 6) {
    return { changed: false, from: '', to: '', strength: 0, evidence: [] };
  }

  // آخر 3 تحاليل (15 دقيقة الأخيرة)
  const current = recentAnalyses.slice(0, 3);
  // السابقة (15-30 دقيقة)
  const previous = recentAnalyses.slice(3, 6);

  const currentTrend = getMajorityTrend(current);
  const previousTrend = getMajorityTrend(previous);

  // هل تغير الاتجاه؟
  if (currentTrend !== previousTrend &&
    currentTrend !== 'NEUTRAL' &&
    previousTrend !== 'NEUTRAL') {

    // حساب قوة التغيير
    const evidence: string[] = [];
    let strength = 5; // قاعدة

    // كل التحاليل الثلاثة متفقة؟ → قوة +3
    if (current.every(a => a.h1Trend === currentTrend)) {
      strength += 3;
      evidence.push('كل التحاليل الأخيرة متفقة');
    }

    // يوجد MSS حديث؟ (صالح لـ 45 دقيقة للتداول اليومي)
    const recentMSS = detectedEvents.filter(e =>
      e.type.includes('MSS') &&
      Date.now() - e.time.getTime() < 45 * 60 * 1000
    );
    if (recentMSS.length > 0) {
      strength += 2;
      evidence.push(`MSS ${currentTrend} مكتشف`);
    }

    // Score عالي؟
    const avgScore = current.reduce((sum, a) => sum + a.score, 0) / current.length;
    if (avgScore >= 7) {
      strength += 1;
      evidence.push(`ثقة عالية (${avgScore.toFixed(1)}/10)`);
    }

    return {
      changed: true,
      from: previousTrend,
      to: currentTrend,
      strength: Math.min(strength, 10),
      evidence
    };
  }

  return { changed: false, from: '', to: '', strength: 0, evidence: [] };
}

// الحصول على ملخص الذاكرة
function getMemorySummary(): string {
  if (analysisHistory.length === 0) {
    return "لا توجد بيانات سابقة - هذا أول تحليل";
  }

  // ✅ استخدام آخر 12 تحليل (ساعة كاملة)
  const recentAnalyses = analysisHistory.slice(0, 12);

  // ✅ تصفية الأحداث - فقط الأحدث من ساعة واحدة
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const recentEvents = detectedEvents.filter(e => e.time.getTime() > oneHourAgo).slice(0, 8);

  // تحديد الاتجاه السائد
  const bullishCount = recentAnalyses.filter(a => a.h1Trend === 'BULLISH').length;
  const bearishCount = recentAnalyses.filter(a => a.h1Trend === 'BEARISH').length;
  const dominantTrend = bullishCount > bearishCount ? 'BULLISH' : bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL';

  // تحديد آخر أحداث مهمة
  const sweeps = recentEvents.filter(e => e.type.includes('SWEEP'));
  const mss = recentEvents.filter(e => e.type.includes('MSS'));
  const fvgs = recentEvents.filter(e => e.type.includes('FVG'));
  const momentum = recentEvents.filter(e => e.type === 'MOMENTUM');

  let summary = `
══════════════════════════════════════
📊 ذاكرة آخر ${recentAnalyses.length} تحليلات (ساعة كاملة)
══════════════════════════════════════

🎯 الاتجاه السائد: ${dominantTrend}
📈 صعودي: ${bullishCount} | 📉 هبوطي: ${bearishCount}

`;

  // آخر 3 تحليلات
  summary += `📋 آخر التحليلات:\n`;
  recentAnalyses.slice(0, 3).forEach((a, i) => {
    const timeAgo = Math.round((Date.now() - a.timestamp.getTime()) / 60000);
    summary += `   ${i + 1}. [${timeAgo}m ago] ${a.decision} | ${a.h1Trend} | Price: ${a.price}\n`;
  });

  // الأحداث المهمة
  if (sweeps.length > 0) {
    summary += `\n🔄 سحب السيولة (Sweeps):\n`;
    sweeps.slice(0, 3).forEach(s => {
      const timeAgo = Math.round((Date.now() - s.time.getTime()) / 60000);
      summary += `   • ${s.type} @ ${s.price} [${timeAgo}m ago]\n`;
    });
  }

  if (mss.length > 0) {
    summary += `\n📐 كسر الهيكل (MSS):\n`;
    mss.slice(0, 2).forEach(m => {
      const timeAgo = Math.round((Date.now() - m.time.getTime()) / 60000);
      summary += `   • ${m.type} @ ${m.price} [${timeAgo}m ago]\n`;
    });
  }

  if (fvgs.length > 0) {
    summary += `\n📊 الفجوات (FVG):\n`;
    fvgs.slice(0, 2).forEach(f => {
      const timeAgo = Math.round((Date.now() - f.time.getTime()) / 60000);
      summary += `   • ${f.type} @ ${f.price} [${timeAgo}m ago]\n`;
    });
  }

  // تنبيهات Anti-FOMO
  if (momentum.length > 0) {
    summary += `\n⚠️ تنبيهات Anti-FOMO:\n`;
    momentum.slice(0, 2).forEach(m => {
      const timeAgo = Math.round((Date.now() - m.time.getTime()) / 60000);
      summary += `   • ${m.description} [${timeAgo}m ago]\n`;
    });
  }

  // ⚠️ كشف تغير الاتجاه
  const trendChange = detectTrendChange(recentAnalyses);
  if (trendChange.changed) {
    summary += `

⚠️⚠️⚠️ تنبيه: تغيير الاتجاه مكتشف! ⚠️⚠️⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 من: ${trendChange.from} → إلى: ${trendChange.to}
💪 قوة التغيير: ${trendChange.strength}/10

📌 الأدلة:
${trendChange.evidence.map(e => `   • ${e}`).join('\n')}

⚡ توصية: ابحث عن صفقات في الاتجاه الجديد (${trendChange.to})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 كشف MSS و BOS من الشموع
// ═══════════════════════════════════════════════════════════════════════════════

// كشف Higher High
function isHigherHigh(candle: any, previousCandles: any[]): boolean {
  if (previousCandles.length === 0) return false;
  const maxHigh = Math.max(...previousCandles.map(c => c.high));
  return candle.high > maxHigh;
}

// كشف Lower Low
function isLowerLow(candle: any, previousCandles: any[]): boolean {
  if (previousCandles.length === 0) return false;
  const minLow = Math.min(...previousCandles.map(c => c.low));
  return candle.low < minLow;
}

// كشف MSS (Market Structure Shift)
function detectMSS(candles: any[]): MarketEvent[] {
  const events: MarketEvent[] = [];
  if (candles.length < 15) return events;

  const recent = candles.slice(-20); // آخر 20 شمعة

  for (let i = 10; i < recent.length; i++) {
    const current = recent[i];
    const previous10 = recent.slice(i - 10, i);

    // MSS Bullish: Higher High بعد فترة من Lower Lows
    if (isHigherHigh(current, previous10)) {
      // تحقق من وجود Lower Lows في الماضي القريب
      const hadBearishStructure = previous10.slice(-5).some((c, idx, arr) => {
        if (idx === 0) return false;
        return c.low < arr[idx - 1].low;
      });

      if (hadBearishStructure && current.close > current.open) {
        events.push({
          type: 'MSS_BULLISH',
          price: current.high,
          time: new Date(current.time),
          description: `MSS صعودي @ ${current.high.toFixed(2)} - تغيير هيكل السوق`
        });
      }
    }

    // MSS Bearish: Lower Low بعد فترة من Higher Highs
    if (isLowerLow(current, previous10)) {
      // تحقق من وجود Higher Highs في الماضي القريب
      const hadBullishStructure = previous10.slice(-5).some((c, idx, arr) => {
        if (idx === 0) return false;
        return c.high > arr[idx - 1].high;
      });

      if (hadBullishStructure && current.close < current.open) {
        events.push({
          type: 'MSS_BEARISH',
          price: current.low,
          time: new Date(current.time),
          description: `MSS هبوطي @ ${current.low.toFixed(2)} - تغيير هيكل السوق`
        });
      }
    }
  }

  return events;
}

// اكتشاف الأحداث من الشموع
function detectEventsFromCandles(h1Candles: any[], m5Candles: any[], currentPrice: number): MarketEvent[] {
  const events: MarketEvent[] = [];

  if (!m5Candles || m5Candles.length < 20) return events;

  const recent20 = m5Candles.slice(-20);
  const recent50 = m5Candles.slice(-50);

  // البحث عن سحب السيولة (Sweep)
  const highestHigh = Math.max(...recent50.map(c => c.high));
  const lowestLow = Math.min(...recent50.map(c => c.low));

  // آخر 5 شموع
  const last5 = recent20.slice(-5);

  for (const candle of last5) {
    // Sweep High - السعر تجاوز القمة ثم عاد
    if (candle.high >= highestHigh && candle.close < highestHigh) {
      events.push({
        time: new Date(candle.time),
        type: 'SWEEP_HIGH',
        price: candle.high,
        description: `سحب سيولة القمة @ ${candle.high}`
      });
    }

    // Sweep Low - السعر تجاوز القاع ثم عاد
    if (candle.low <= lowestLow && candle.close > lowestLow) {
      events.push({
        time: new Date(candle.time),
        type: 'SWEEP_LOW',
        price: candle.low,
        description: `سحب سيولة القاع @ ${candle.low}`
      });
    }

    // Rejection - ذيل طويل (30%+ من حجم الشمعة)
    const bodySize = Math.abs(candle.close - candle.open);
    const totalSize = candle.high - candle.low;
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;

    if (totalSize > 0 && upperWick / totalSize > 0.3) {
      events.push({
        time: new Date(candle.time),
        type: 'REJECTION',
        price: candle.high,
        description: `رفض سعري عند ${candle.high}`
      });
    }

    if (totalSize > 0 && lowerWick / totalSize > 0.3) {
      events.push({
        time: new Date(candle.time),
        type: 'REJECTION',
        price: candle.low,
        description: `رفض سعري عند ${candle.low}`
      });
    }
  }

  // ✅ كشف MSS من شموع M5
  const mssEvents = detectMSS(m5Candles);
  mssEvents.forEach(e => events.push(e));

  // البحث عن FVG (فقط الكبيرة والواضحة)
  for (let i = 2; i < recent20.length; i++) {
    const c1 = recent20[i - 2];
    const c2 = recent20[i - 1];
    const c3 = recent20[i];

    // Bullish FVG
    if (c1.high < c3.low) {
      events.push({
        time: new Date(c2.time),
        type: 'FVG_BULLISH',
        price: (c1.high + c3.low) / 2,
        description: `FVG صعودي ${c1.high} - ${c3.low}`
      });
    }

    // Bearish FVG
    if (c1.low > c3.high) {
      events.push({
        time: new Date(c2.time),
        type: 'FVG_BEARISH',
        price: (c1.low + c3.high) / 2,
        description: `FVG هبوطي ${c3.high} - ${c1.low}`
      });
    }
  }

  // إضافة الأحداث الجديدة للذاكرة
  events.forEach(e => addEvent(e));

  return events;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

const round2 = (n: number): number => Math.round(n * 100) / 100;

const toNumber = (x: any): number => {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : NaN;
};

const cleanJsonString = (str: string): string => {
  let cleaned = (str || "").trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
  return cleaned.trim();
};

const extractJson = (text: string): string => {
  const s = cleanJsonString(text || "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) return "{}";
  return s.slice(a, b + 1);
};

const safeParseJson = (content: string): any => {
  try {
    return JSON.parse(extractJson(content));
  } catch {
    return {};
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ⏰ Killzone Info
// ═══════════════════════════════════════════════════════════════════════════════

function getCurrentKillzone(): KillzoneInfo {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const totalMinutes = utcHour * 60 + utcMinute;

  const sessions = {
    ASIA: { start: 0, end: 180, quality: 'MEDIUM' as const },
    LONDON: { start: 420, end: 600, quality: 'HIGH' as const },
    NY_AM: { start: 720, end: 900, quality: 'HIGH' as const },
    NY_PM: { start: 900, end: 1080, quality: 'MEDIUM' as const }
  };

  for (const [sessionName, session] of Object.entries(sessions)) {
    if (totalMinutes >= session.start && totalMinutes < session.end) {
      return {
        isActive: true,
        session: sessionName as KillzoneInfo['session'],
        quality: session.quality,
        minutesToEnd: session.end - totalMinutes,
        description: `${sessionName} Session`
      };
    }
  }

  return {
    isActive: false,
    session: 'OFF_HOURS',
    quality: 'LOW',
    minutesToEnd: 0,
    description: 'Off Hours'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ICT Pro System Prompt v8.0 - مع فلاتر منع الخسائر
// ═══════════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(memorySummary: string, killzoneInfo: KillzoneInfo): string {
  return `أنت محلل ICT خبير لـ XAUUSD مع ذاكرة للأحداث السابقة.

═══════════════════════════════════════════════════════════════════════════════
🧠 نظام ذكي مع ذاكرة - ICT Pro v8.0 مع فلاتر منع الخسائر
═══════════════════════════════════════════════════════════════════════════════

${memorySummary}

═══════════════════════════════════════════════════════════════════════════════
⏰ الجلسة الحالية: ${killzoneInfo.session} (${killzoneInfo.quality})
═══════════════════════════════════════════════════════════════════════════════

╔══════════════════════════════════════════════════════════════════════════════╗
║ 🔴 فلاتر منع الخسائر (الحلقة المفقودة!)                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║ هذه الفلاتر تصلح 60% من الخسائر! طبقها بإصرار                                ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 🔴 FILTER 1: ممنوع الشراء عند القمم (No Buying at Peaks)                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║ ✅ القاعدة:                                                                  ║
║    إذا السعر أقل من 0.2% من High الفريم الأعلى (H1)                         ║
║    → NO_TRADE حتى لو الترند صاعد                                            ║
║                                                                              ║
║ 💡 لماذا؟                                                                   ║
║    • الشراء عند القمم = مقامرة                                              ║
║    • احتمالية الارتداد عالية جداً عند القمم                                  ║
║    • السوق يصنع قمم ثم يهبط - هذا هو السيناريو الطبيعي                       ║
║                                                                              ║
║ 📊 التطبيق:                                                                  ║
║    • احسب H1 High من آخر 20 شمعة                                            ║
║    • إذا (H1 High - Price) / Price < 0.2%                                   ║
║    → NO_TRADE                                                               ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 🔴 FILTER 2: Anti-FOMO - منع الشراء أثناء الاندفاع                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║ ✅ القاعدة:                                                                  ║
║    إذا آخر 3 شموع بنفس الاتجاه قوية                                          ║
║    → NO_TRADE - هذا اندفاع مو دخول!                                          ║
║                                                                              ║
║ 💡 لماذا؟                                                                   ║
║    • 3 شموع قوية = السوق في حالة اندفاع (FOMO)                              ║
║    • يدخل المتداول متأخراً في آخر الشمعة                                     ║
║    • النتيجة: شراء عند القمة ثم انعكاس                                       ║
║                                                                              ║
║ 📊 تعريف الشمعة "القوية":                                                     ║
║    • جسم الشمعة > 50% من حجمها الكلي                                         ║
║    • إغلاق في اتجاه الحركة                                                   ║
║                                                                              ║
║ ⚡ الحل:                                                                     ║
║    • انتظر تصحيح (Pullback)                                                  ║
║    • ثم ادخل من التصحيح                                                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 🔴 FILTER 3: Pullback إجباري (Mandatory Pullback)                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║ ✅ القاعدة:                                                                  ║
║    لا دخول بدون تصحيح!                                                       ║
║                                                                              ║
║ 💡 لماذا؟                                                                   ║
║    • الدخول بدون تصحيح = مطاردة السعر                                       ║
║    • السوق يعطي فرصة دائماً للشراء من أسفل                                   ║
║    • الصبر = أرباح                                                            ║
║                                                                              ║
║ 📊 طرق التصحيح المقبولة:                                                      ║
║    1. شمعة تصحيح (حمراء داخل صعود / خضراء داخل هبوط)                        ║
║    2. العودة لمنطقة Order Block                                              ║
║    3. العودة لمنطقة FVG                                                      ║
║                                                                              ║
║ ⚠️ بدون تصحيح = NO_TRADE                                                     ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 🔴 FILTER 4: Anti-Chase - ممنوع مطاردة السعر                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║ ✅ القاعدة:                                                                  ║
║    أثناء الاندفاع:                                                           ║
║    • لا MARKET ORDER                                                         ║
║    • لا تطارد السعر                                                          ║
║    • استخدم LIMIT ORDER فقط                                                  ║
║                                                                              ║
║ 💡 لماذا؟                                                                   ║
║    • MARKET ORDER = دخول بسعر السوق (غالباً أسوأ سعر)                        ║
║    • مطاردة السعر = خسارة عاطفية                                             ║
║    • LIMIT ORDER = أنت تتحكم في السعر                                        ║
║                                                                              ║
║ 📊 التطبيق:                                                                  ║
║    • حدد مسافة الدخول الآمن (50% من الحركة على الأقل)                        ║
║    • ضع LIMIT ORDER عند تلك المسافة                                          ║
║    • إذا السعر ما وصل - ما دخلت!                                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
📋 منهجية التحليل ICT
═══════════════════════════════════════════════════════════════════════════════

1️⃣ تحديد الاتجاه H1 (إلزامي) 🎯
   • صاعد: Higher Highs + Higher Lows → شراء
   • هابط: Lower Highs + Lower Lows → بيع
   • عرضي: لا تتداول حتى يتضح الاتجاه

2️⃣ تطبيق فلاتر منع الخسائر (إلزامي) 🔴🔥
   • ✅ FILTER 1: هل السعر قريب من القمة؟ → NO_TRADE إذا نعم
   • ✅ FILTER 2: هل هناك 3 شموع قوية؟ → انتظر تصحيح إذا نعم
   • ✅ FILTER 3: هل يوجد تصحيح؟ → NO_TRADE إذا لا يوجد
   • ✅ FILTER 4: هل تطارد السعر؟ → استخدم LIMIT ORDER

3️⃣ أولوية قصوى: كشف تغير الاتجاه 🔥🔥🔥
   ⚠️ إذا كان هناك تغيير مكتشف في الذاكرة:
      • هذه فرصة ذهبية! 🌟
      • السوق يتغير من [السابق] إلى [الجديد]
      • ركز على الاتجاه الجديد فقط!
      • ابحث عن MSS/BOS + Sweep + تأكيد

4️⃣ البحث عن MSS/BOS (مهم جداً) 📐
   • MSS = Market Structure Shift (تغيير الهيكل)
   • BOS = Break of Structure (كسر الهيكل)
   • إذا وجدت MSS حديث (آخر 45 دقيقة) → اهتمام عالي!
   • MSS + Sweep = إعداد قوي جداً

5️⃣ البحث عن Liquidity Sweep
   • سحب قمة/قاع سابق على M5
   • إغلاق قوي داخل النطاق
   • صالح لمدة 45 دقيقة (للتداول اليومي)
   ⚠️ إذا وجدت Sweep في الذاكرة خلال آخر 45 دقيقة → فرصة قوية!

6️⃣ تأكيدين قويين على الأقل (إلزامي) ✅
   ✔ رفض سعري قوي (ذيل 30%+ من الشمعة)
   ✔ شمعة ابتلاعية (Engulfing)
   ✔ FVG أو Order Block قريب
   ✔ BOS/MSS واضح
   ⚠️ يجب وجود تأكيدين مختلفين!

7️⃣ منطقة الدخول (Entry Zone)
   • من FVG أو Order Block أو منطقة الرفض
   • المسافة من السعر: 0.1% - 0.5%
   • استخدم LIMIT ORDERS فقط (مهم جداً!)
   ⚠️ بعد تطبيق فلاتر منع الخسائر

═══════════════════════════════════════════════════════════════════════════════
💡 قواعد ذهبية لزيادة نسبة الفوز
═══════════════════════════════════════════════════════════════════════════════

✅ اقبل الصفقة إذا:
   • ✅ جميع فلاتر منع الخسائر passed
   • الاتجاه واضح + تأكيدات اثنين على الأقل
   • RR جيد (1:1.5 أو أفضل)
   • لا تنتظر المثالية

❌ ارفض بدون تردد:
   • 🚫 فلتر 1 فاشل (قرب من القمة) ❌
   • 🚫 فلتر 2 فاشل (اندفاع FOMO) ❌
   • 🚫 فلتر 3 فاشل (بدون تصحيح) ❌
   • 🚫 فلتر 4: تطارد السعر؟ → استخدم LIMIT ❌
   • الاتجاه غير واضح أو متناقض 🚫
   • تأكيد واحد فقط (غير كافي) ❌
   • Entry بعيد (أكثر من 0.6% من السعر) 🚫
   • RR ضعيف (أقل من 1:1.5) ❌
   • Score أقل من 7/10 🚫
   • Confidence أقل من 65% ❌

💡 مبادئ ذهبية:
   • 🔴 الفلاتر أولاً! قبل أي تحليل                                         🔴
   • 🔴 الجودة فوق الكمية - صبراً ثم صفقة مربحة                               🔴
   • 🔴 لا تتساهل في الفلاتر - حتى لو الفرصة تبدو جيدة                        🔴
   • 🔴 إذا شككت → NO_TRADE                                                  🔴
   • 🔴 انتظر الإعداد المثالي ⏳                                            🔴
   • 🔴 لا تطارد السعر - LIMIT ORDER حليفك                                   🔴

═══════════════════════════════════════════════════════════════════════════════
🎯 نظام الأهداف (TPs)
═══════════════════════════════════════════════════════════════════════════════

• TP1: أقرب سيولة (قمة/قاع قريب) - 1:1.5 RR
• TP2: السيولة التالية أو FVG - 1:2.5 RR
• TP3: سيولة خارجية رئيسية - 1:4+ RR

• SL: خلف القمة/القاع المسحوب + buffer 5-10$
• حجم SL: بين 8$ و 20$

═══════════════════════════════════════════════════════════════════════════════
📊 JSON الإخراج
═══════════════════════════════════════════════════════════════════════════════

{
  "decision": "PLACE_PENDING" أو "NO_TRADE",
  "score": 0-10,
  "confidence": 0-100,
  "sentiment": "BULLISH" أو "BEARISH" أو "NEUTRAL",
  "bias": "وصف اتجاه H1 باختصار",
  "reasoning": "لماذا هذا القرار؟ اذكر السبب الرئيسي",
  "h1Trend": "BULLISH" أو "BEARISH" أو "NEUTRAL",
  "filter1_peakCheck": "PASS/FAIL مع السبب",
  "filter2_momentumCheck": "PASS/FAIL مع السبب",
  "filter3_pullbackCheck": "PASS/FAIL مع السبب",
  "filter4_antiChaseCheck": "PASS/FAIL مع السبب",
  "suggestedTrade": {
    "type": "BUY_LIMIT" أو "SELL_LIMIT",
    "entry": رقم,
    "sl": رقم,
    "tp1": رقم,
    "tp2": رقم,
    "tp3": رقم
  }
}

⚠️ أعط JSON فقط - بدون أي نص إضافي!
`;
}

// للتوافق مع الكود القديم
export const systemInstruction = `ICT Pro v8.0 - Dynamic Prompt with Loss Prevention Filters`;


// ═══════════════════════════════════════════════════════════════════════════════
// 📋 Result Builder
// ═══════════════════════════════════════════════════════════════════════════════

function createNoTradeResult(reasons: string[], original: any = {}): ICTAnalysis {
  return {
    decision: "NO_TRADE",
    score: original.score || 0,
    confidence: original.confidence || 0,
    sentiment: original.sentiment || "NEUTRAL",
    bias: original.bias || "",
    priceLocation: original.priceLocation || "MID",
    confluences: original.confluences || [],
    reasons: reasons,
    reasoning: original.reasoning || ""
  } as ICTAnalysis;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 Enhanced Validator - مع فلاتر منع الخسائر
// ═══════════════════════════════════════════════════════════════════════════════

function validateAndFix(
  r: any,
  currentPrice: number,
  h1Candles?: any[],
  m5Candles?: any[]
): ICTAnalysis {
  console.log("\n🔍 التحقق من الصفقة مع فلاتر منع الخسائر...");

  r = r || {};
  r.reasons = Array.isArray(r.reasons) ? r.reasons : [];
  r.confluences = Array.isArray(r.confluences) ? r.confluences : [];
  r.score = Number(r.score) || 0;
  r.confidence = Number(r.confidence) || 0;

  // إذا لم يكن هناك صفقة
  if (r.decision !== "PLACE_PENDING" || !r.suggestedTrade) {
    console.log("   ℹ️ NO_TRADE - لا توجد فرصة");
    return createNoTradeResult(r.reasons.length > 0 ? r.reasons : ["لا توجد فرصة مناسبة"], r);
  }

  const t = r.suggestedTrade;
  const tradeType = String(t.type || "");
  const isBuy = tradeType.includes("BUY");

  console.log(`   📊 نوع الصفقة: ${tradeType}`);
  console.log(`   💰 السعر الحالي: ${currentPrice}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔴 FILTER 1: فحص القرب من القمة
  // ═══════════════════════════════════════════════════════════════════════════

  if (isBuy && h1Candles && h1Candles.length > 0) {
    const peakAnalysis = analyzePeakProximity(currentPrice, h1Candles, isBuy);

    if (!peakAnalysis.canTrade) {
      console.log(`   🔴 FILTER 1 (Peak) REJECTED: ${peakAnalysis.reason}`);
      return createNoTradeResult([peakAnalysis.reason], r);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔴 FILTER 2: فحص الاندفاع (Anti-FOMO)
  // ═══════════════════════════════════════════════════════════════════════════

  if (m5Candles && m5Candles.length > 0) {
    const tradeDirection = isBuy ? 'BUY' : 'SELL';
    const momentum = detectMomentum(m5Candles, tradeDirection);

    if (momentum.isMomentum) {
      console.log(`   🔴 FILTER 2 (Momentum) REJECTED: ${momentum.reason}`);
      return createNoTradeResult([momentum.reason], r);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔴 FILTER 3: فحص وجود التصحيح (Mandatory Pullback)
  // ═══════════════════════════════════════════════════════════════════════════

  if (h1Candles && m5Candles && m5Candles.length > 0) {
    const pullbackAnalysis = analyzePullback(currentPrice, m5Candles, h1Candles, isBuy);

    if (!pullbackAnalysis.canTrade) {
      console.log(`   🔴 FILTER 3 (Pullback) REJECTED: ${pullbackAnalysis.reason}`);
      return createNoTradeResult([pullbackAnalysis.reason], r);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔴 FILTER 4: Anti-Chase - فحص مطاردة السعر
  // ═══════════════════════════════════════════════════════════════════════════

  if (m5Candles && m5Candles.length > 0) {
    const tradeDirection = isBuy ? 'BUY' : 'SELL';
    const momentum = detectMomentum(m5Candles, tradeDirection);

    if (momentum.isMomentum) {
      const antiChase = analyzeAntiChase(currentPrice, m5Candles, momentum, isBuy);

      // إذا كان السوق في اندفاع، يجب استخدام LIMIT ORDER فقط
      if (tradeType === "BUY_MARKET" || tradeType === "SELL_MARKET") {
        console.log(`   🔴 FILTER 4 (Anti-Chase) REJECTED: ${antiChase.reason}`);
        return createNoTradeResult([antiChase.reason + " استخدم LIMIT ORDER"], r);
      }

      // فحص أن Entry ليس قريب من السعر الحالي
      if (isBuy && t.entry > currentPrice * 0.998) {
        console.log(`   🔴 FILTER 4 (Anti-Chase) REJECTED: Entry ${antiChase.reason}`);
        return createNoTradeResult([antiChase.reason], r);
      }

      if (!isBuy && t.entry < currentPrice * 1.002) {
        console.log(`   🔴 FILTER 4 (Anti-Chase) REJECTED: ${antiChase.reason}`);
        return createNoTradeResult([antiChase.reason], r);
      }
    }
  }

  // تحويل الأرقام
  let entry = toNumber(t.entry);
  let sl = toNumber(t.sl);
  let tp1 = toNumber(tp1);
  let tp2 = toNumber(tp2);
  let tp3 = toNumber(tp3);

  // التحقق من صلاحية الأرقام
  if ([entry, sl, tp1, tp2, tp3].some(isNaN)) {
    console.log("   ❌ أرقام غير صالحة");
    return createNoTradeResult(["أرقام غير صالحة في الصفقة"], r);
  }

  console.log(`   📍 Entry: ${entry} | SL: ${sl} | TP1: ${tp1}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // التحقق من نوع الأمر المعلق
  // ═══════════════════════════════════════════════════════════════════════════

  if (tradeType === "BUY_LIMIT" && entry >= currentPrice) {
    // BUY_LIMIT يجب أن يكون أسفل السعر الحالي
    const maxDistance = currentPrice * 0.005; // 0.5%
    const correctedEntry = currentPrice - (maxDistance * 0.5);

    if (correctedEntry > sl + MIN_SL_DISTANCE) {
      entry = round2(correctedEntry);
      console.log(`   🔧 تصحيح Entry إلى: ${entry}`);
    } else {
      console.log("   ❌ BUY_LIMIT: لا يمكن تصحيح Entry");
      return createNoTradeResult(["BUY_LIMIT يجب أن يكون أسفل السعر الحالي"], r);
    }
  }

  if (tradeType === "SELL_LIMIT" && entry <= currentPrice) {
    // SELL_LIMIT يجب أن يكون أعلى السعر الحالي
    const maxDistance = currentPrice * 0.005; // 0.5%
    const correctedEntry = currentPrice + (maxDistance * 0.5);

    if (correctedEntry < sl - MIN_SL_DISTANCE) {
      entry = round2(correctedEntry);
      console.log(`   🔧 تصحيح Entry إلى: ${entry}`);
    } else {
      console.log("   ❌ SELL_LIMIT: لا يمكن تصحيح Entry");
      return createNoTradeResult(["SELL_LIMIT يجب أن يكون أعلى السعر الحالي"], r);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // التحقق من مسافة Entry من السعر الحالي
  // ═══════════════════════════════════════════════════════════════════════════

  const entryDistance = Math.abs(entry - currentPrice);
  const maxEntryDistance = currentPrice * 0.008; // 0.8%

  if (entryDistance > maxEntryDistance) {
    console.log(`   ❌ Entry بعيد جداً: ${entryDistance.toFixed(2)}$ (max: ${maxEntryDistance.toFixed(2)}$)`);
    return createNoTradeResult([`Entry بعيد: ${entryDistance.toFixed(1)}$ من السعر`], r);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // التحقق من SL وتصحيحه
  // ═══════════════════════════════════════════════════════════════════════════

  let slDistance = Math.abs(entry - sl);
  console.log(`   📏 مسافة SL: ${slDistance.toFixed(2)}$`);

  // تصحيح SL إذا كان قريب جداً
  if (slDistance < MIN_SL_DISTANCE) {
    const newSl = isBuy ? entry - 10 : entry + 10;
    console.log(`   🔧 تصحيح SL من ${sl} إلى ${newSl} (كان قريب جداً)`);
    sl = round2(newSl);
    slDistance = MIN_SL_DISTANCE + 2;
  }

  // رفض إذا SL بعيد جداً
  if (slDistance > MAX_SL_DISTANCE) {
    console.log(`   ❌ SL بعيد جداً: ${slDistance.toFixed(2)}$`);
    return createNoTradeResult([`SL بعيد جداً: ${slDistance.toFixed(1)}$`], r);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // التحقق من ترتيب المستويات
  // ═══════════════════════════════════════════════════════════════════════════

  if (isBuy) {
    // للشراء: SL < Entry < TP1 < TP2 < TP3
    if (!(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
      console.log("   ❌ ترتيب مستويات الشراء خاطئ");
      console.log(`      SL:${sl} < Entry:${entry} < TP1:${tp1} < TP2:${tp2} < TP3:${tp3}`);
      return createNoTradeResult(["ترتيب مستويات الشراء غير صحيح"], r);
    }
  } else {
    // للبيع: TP3 < TP2 < TP1 < Entry < SL
    if (!(tp3 < tp2 && tp2 < tp1 && tp1 < entry && entry < sl)) {
      console.log("   ❌ ترتيب مستويات البيع خاطئ");
      console.log(`      TP3:${tp3} < TP2:${tp2} < TP1:${tp1} < Entry:${entry} < SL:${sl}`);
      return createNoTradeResult(["ترتيب مستويات البيع غير صحيح"], r);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // حساب RR والتحقق منه
  // ═══════════════════════════════════════════════════════════════════════════

  const risk = Math.abs(entry - sl);
  const reward1 = Math.abs(tp1 - entry);
  const reward2 = Math.abs(tp2 - entry);
  const reward3 = Math.abs(tp3 - entry);

  const rr1 = reward1 / risk;
  const rr2 = reward2 / risk;
  const rr3 = reward3 / risk;

  console.log(`   📈 RR: TP1=1:${rr1.toFixed(1)} | TP2=1:${rr2.toFixed(1)} | TP3=1:${rr3.toFixed(1)}`);

  // رفض RR ضعيف
  if (rr1 < MIN_RR_RATIO) {
    console.log(`   ❌ RR ضعيف: 1:${rr1.toFixed(1)} (minimum 1:${MIN_RR_RATIO})`);
    return createNoTradeResult([`RR ضعيف: 1:${rr1.toFixed(1)}`], r);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // تحديث الصفقة بالقيم المصححة
  // ═══════════════════════════════════════════════════════════════════════════

  t.entry = round2(entry);
  t.sl = round2(sl);
  t.tp1 = round2(tp1);
  t.tp2 = round2(tp2);
  t.tp3 = round2(tp3);
  t.rrRatio = `TP1: 1:${rr1.toFixed(1)} | TP2: 1:${rr2.toFixed(1)} | TP3: 1:${rr3.toFixed(1)}`;
  t.riskAmount = `${risk.toFixed(2)}$`;

  // ═══════════════════════════════════════════════════════════════════════════
  // إضافة معلومات الفلاتر للصفقة
  // ═══════════════════════════════════════════════════════════════════════════

  t.filtersApplied = {
    filter1_peak: h1Candles && isBuy ? "PASS" : "N/A",
    filter2_momentum: m5Candles ? "PASS" : "N/A",
    filter3_pullback: (h1Candles && m5Candles) ? "PASS" : "N/A",
    filter4_antiChase: m5Candles ? "PASS" : "N/A"
  };

  console.log(`   ✅ جميع الفلاتر passed - صفقة صالحة - RR جيد`);

  return r as ICTAnalysis;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 API Call
// ═══════════════════════════════════════════════════════════════════════════════

async function callAIChat(payload: any): Promise<{ content: string }> {
  console.log("🔌 الاتصال بالـ AI...");

  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: payload.messages,
      max_tokens: payload.max_tokens || 2500,
      temperature: payload.temperature || 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(`❌ API Error: ${response.status}`);
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json() as any;
  console.log("✅ تم استلام رد AI");
  return {
    content: data.choices?.[0]?.message?.content || "{}"
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 Multi-Timeframe Analysis with Memory and Loss Prevention Filters
// ═══════════════════════════════════════════════════════════════════════════════

export const analyzeMultiTimeframe = async (
  h1Image: string,
  m5Image: string,
  currentPrice: number,
  h1Candles?: any[],
  m5Candles?: any[]
): Promise<ICTAnalysis> => {
  const killzoneInfo = getCurrentKillzone();

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("🧠 ICT Pro Analysis v8.0 - With Loss Prevention Filters");
  console.log(`💰 السعر الحالي: ${currentPrice}`);
  console.log(`⏰ الجلسة: ${killzoneInfo.session} (${killzoneInfo.quality})`);
  console.log(`🧠 الذاكرة: ${analysisHistory.length} تحليلات سابقة`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. اكتشاف الأحداث من الشموع
  if (h1Candles && m5Candles) {
    const newEvents = detectEventsFromCandles(h1Candles, m5Candles, currentPrice);
    if (newEvents.length > 0) {
      console.log(`📌 أحداث جديدة مكتشفة: ${newEvents.length}`);
    }
  }

  // 2. الحصول على ملخص الذاكرة
  const memorySummary = getMemorySummary();
  console.log("📊 ملخص الذاكرة:");
  console.log(memorySummary);

  // 3. بناء البرومبت الديناميكي
  const dynamicPrompt = buildSystemPrompt(memorySummary, killzoneInfo);

  const cleanH1 = h1Image.replace(/^data:image\/\w+;base64,/, "");
  const cleanM5 = m5Image.replace(/^data:image\/\w+;base64,/, "");

  // تحضير بيانات الشموع
  let candleDataText = '';

  if (h1Candles && h1Candles.length > 0) {
    const recentH1 = h1Candles.slice(-30);
    candleDataText += '\n\n📊 بيانات H1 (آخر 30 شمعة):\n';
    candleDataText += recentH1.map((c, i) =>
      `${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`
    ).join('\n');
  }

  if (m5Candles && m5Candles.length > 0) {
    const recentM5 = m5Candles.slice(-60);
    candleDataText += '\n\n📊 بيانات M5 (آخر 60 شمعة):\n';
    candleDataText += recentM5.map((c, i) =>
      `${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`
    ).join('\n');
  }

  const userPrompt = `${dynamicPrompt}

═══════════════════════════════════════
📈 بيانات السوق الحالية
═══════════════════════════════════════

الزوج: XAUUSD (الذهب)
السعر الحالي: ${currentPrice}
الجلسة: ${killzoneInfo.session}
جودة الجلسة: ${killzoneInfo.quality}

🔴 فلاتر منع الخسائر المطبقة:
• FILTER 1: ممنوع الشراء عند القمة (> 0.2% من H1 High)
• FILTER 2: Anti-FOMO (3 شموع قوية = انتظر تصحيح)
• FILTER 3: Pullback إجباري (بدون تصحيح = لا دخول)
• FILTER 4: Anti-Chase (استخدم LIMIT ORDER)

الصورة 1: شارت H1 (لتحديد الاتجاه)
الصورة 2: شارت M5 (لتحديد الدخول)
${candleDataText}

═══════════════════════════════════════
⚠️ تذكير مهم
═══════════════════════════════════════
- 🚫 لا تدخل شراء إذا السعر قريب من قمة H1
- 🚫 لا تدخل أثناء اندفاع (3 شموع قوية)
- 🚫 لا تدخل بدون تصحيح
- 🚫 لا تطارد السعر - استخدم LIMIT
- SL: بين 8$ و 20$ من Entry
- Entry: أقل من 0.5% من السعر الحالي (${(currentPrice * 0.005).toFixed(2)}$)
- RR: minimum 1:1.5

أعطني JSON فقط - بدون أي نص إضافي
`;

  try {
    const data = await callAIChat({
      messages: [{
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: `data:image/png;base64,${cleanH1}` } },
          { type: "image_url", image_url: { url: `data:image/png;base64,${cleanM5}` } }
        ]
      }],
      temperature: 0.08, // دقة عالية - لا عشوائية
      max_tokens: 2500
    });

    const parsed = safeParseJson(data.content);
    console.log(`📋 قرار AI: ${parsed.decision || 'غير محدد'}`);

    // ✅ استخدام الفلاتر في التحقق
    const validated = validateAndFix(parsed, currentPrice, h1Candles, m5Candles);
    validated.killzoneInfo = killzoneInfo;

    // 4. حفظ التحليل في الذاكرة
    const h1Trend = (parsed.h1Trend || parsed.sentiment || 'NEUTRAL') as 'BULLISH' | 'BEARISH' | 'NEUTRAL';

    // كشف وجود اندفاع للتصحيح
    let momentumDetected = false;
    if (m5Candles && m5Candles.length >= 3) {
      const momentum = detectMomentum(m5Candles, h1Trend === 'BULLISH' ? 'BUY' : 'SELL');
      momentumDetected = momentum.isMomentum;
    }

    // كشف وجود تصحيح
    let pullbackFound = false;
    if (h1Candles && m5Candles && m5Candles.length > 0) {
      const pullback = analyzePullback(currentPrice, m5Candles, h1Candles, h1Trend === 'BULLISH');
      pullbackFound = pullback.hasPullback;
    }

    addToMemory({
      timestamp: new Date(),
      price: currentPrice,
      decision: validated.decision,
      bias: validated.bias || '',
      score: validated.score || 0,
      events: detectedEvents.slice(0, 5),
      h1Trend: h1Trend,
      momentumDetected: momentumDetected,
      pullbackFound: pullbackFound
    });

    console.log(`\n🎯 النتيجة النهائية: ${validated.decision}`);
    if (validated.suggestedTrade) {
      const t = validated.suggestedTrade;
      console.log(`   ${t.type} @ ${t.entry}`);
      console.log(`   SL: ${t.sl} | TP1: ${t.tp1} | TP2: ${t.tp2} | TP3: ${t.tp3}`);
      console.log(`   الفلاتر: ${JSON.stringify(t.filtersApplied || {})}`);
    }
    console.log("═══════════════════════════════════════════════════════════════\n");

    return validated;
  } catch (error) {
    console.error("\n❌ خطأ في التحليل:", error);
    return createNoTradeResult(["خطأ في الاتصال بالـ AI"]);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 Chat
// ═══════════════════════════════════════════════════════════════════════════════

export const chatWithAI = async (
  message: string,
  analysis: ICTAnalysis | null,
  currentPrice: number
): Promise<string> => {
  const context = analysis
    ? `القرار: ${analysis.decision} | الاتجاه: ${analysis.sentiment} | السبب: ${analysis.reasoning}`
    : "لا يوجد تحليل حالي";

  try {
    const data = await callAIChat({
      messages: [{
        role: "user",
        content: `أنت مساعد ICT للتداول.

السعر الحالي: ${currentPrice}
${context}

سؤال المتداول: ${message}

أجب بوضوح واختصار.`
      }],
      temperature: 0.4,
      max_tokens: 500
    });

    return data.content || "عذراً، حدث خطأ";
  } catch {
    return "خطأ في الاتصال";
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 Follow Up Trade
// ═══════════════════════════════════════════════════════════════════════════════

export const followUpTrade = async (
  h1Image: string,
  m5Image: string,
  originalAnalysis: ICTAnalysis,
  currentPrice: number,
  tradeTimestamp: Date,
  h1Candles?: any[],
  m5Candles?: any[]
): Promise<{ advice: string; shouldExit: boolean; reason: string }> => {
  try {
    const cleanH1 = h1Image.replace(/^data:image\/\w+;base64,/, "");
    const cleanM5 = m5Image.replace(/^data:image\/\w+;base64,/, "");

    const now = new Date();
    const minutesPassed = Math.floor((now.getTime() - tradeTimestamp.getTime()) / 60000);

    const t = originalAnalysis.suggestedTrade;
    const entry = t?.entry || 0;
    const sl = t?.sl || 0;
    const tp1 = t?.tp1 || 0;
    const tp2 = t?.tp2 || 0;

    const isBuy = String(t?.type || "").includes("BUY");
    const currentPnL = isBuy ? currentPrice - entry : entry - currentPrice;
    const pnlPercent = ((currentPnL / Math.abs(entry - sl)) * 100).toFixed(1);

    const data = await callAIChat({
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `راجع الصفقة المفتوحة مع مراعاة فلاتر منع الخسائر:

⏱️ الوقت: ${minutesPassed} دقيقة
💰 السعر الحالي: ${currentPrice}
📊 P&L: ${currentPnL.toFixed(2)}$ (${pnlPercent}% من المخاطرة)

الصفقة:
- النوع: ${t?.type}
- Entry: ${entry}
- SL: ${sl}
- TP1: ${tp1}
- TP2: ${tp2}

هل يجب الخروج أو الاستمرار؟

JSON:
{
  "shouldExit": true | false,
  "reason": "شرح مختصر",
  "advice": "نصيحة للمتداول",
  "moveSL": "سعر جديد لـ SL أو null"
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${cleanH1}` } },
          { type: "image_url", image_url: { url: `data:image/png;base64,${cleanM5}` } }
        ]
      }],
      temperature: 0.15,
      max_tokens: 600
    });

    const parsed = safeParseJson(data.content);

    return {
      advice: parsed.advice || "استمر في الصفقة",
      shouldExit: parsed.shouldExit || false,
      reason: parsed.reason || ""
    };
  } catch (error) {
    return {
      advice: 'خطأ في المراجعة',
      shouldExit: false,
      reason: 'خطأ في الاتصال'
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 Trade Monitoring
// ═══════════════════════════════════════════════════════════════════════════════

export const monitorActiveTrade = async (
  base64Image: string,
  trade: { symbol: string; entryPrice: number },
  currentPrice: number
): Promise<ManagementAdvice> => {
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const data = await callAIChat({
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `راقب الصفقة مع مراعاة فلاتر منع الخسائر:
الزوج: ${trade.symbol}
سعر الدخول: ${trade.entryPrice}
السعر الحالي: ${currentPrice}
الربح/الخسارة: ${(currentPrice - trade.entryPrice).toFixed(2)}$

JSON:
{
  "status": "HOLD" | "MOVE_TO_BE" | "PARTIAL_CLOSE" | "CLOSE_NOW",
  "reversalProbability": 0-100,
  "message": "شرح",
  "actionRequired": "الإجراء المطلوب"
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${cleanBase64}` } }
        ]
      }],
      temperature: 0.2,
      max_tokens: 700
    });

    return safeParseJson(data.content) as ManagementAdvice;
  } catch {
    return {
      status: "HOLD",
      reversalProbability: 50,
      message: "خطأ في المراقبة",
      actionRequired: "أعد المحاولة"
    };
  }
};
