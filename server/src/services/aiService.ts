// services/aiService.ts - ICT Pro v6.0
// ═══════════════════════════════════════════════════════════════════════════════
// ✅ ICT AI Trader - High Win Rate Edition (70%+ Target)
// ═══════════════════════════════════════════════════════════════════════════════

import { ICTAnalysis, ManagementAdvice, KillzoneInfo } from "../types";

declare const process: any;

console.log("🚀 aiService v6.0 loaded - ICT Pro Edition");

// ===================== API Config =====================
const API_KEY = process?.env?.OLLAMA_API_KEY || process?.env?.AI_API_KEY || "YOUR_API_KEY";
const BASE_URL = process?.env?.OLLAMA_BASE_URL || process?.env?.AI_BASE_URL || "https://api.openai.com";
const MODEL = process?.env?.OLLAMA_MODEL || process?.env?.AI_MODEL || "llama3.2-vision";

console.log(`📡 API Config: ${BASE_URL} | Model: ${MODEL}`);

// ===================== Constants =====================
const MIN_SL_DISTANCE = 8;   // $8 minimum SL للذهب
const MAX_SL_DISTANCE = 25;  // $25 maximum SL (ديناميكي حسب التقلب)
const MIN_RR_RATIO = 1.5;    // Minimum Risk:Reward
const MAX_ENTRY_DISTANCE_PERCENT = 0.004; // 0.4% max entry distance (كان 0.8%)
const DEFAULT_EXPIRY_MINUTES = 45; // صلاحية الأمر المعلق بالدقائق

// حساب ATR (Average True Range) لتحديد التقلب
function calculateATR(candles: any[], period: number = 14): number {
  if (!candles || candles.length < period + 1) return 12; // قيمة افتراضية
  const recentCandles = candles.slice(-(period + 1));
  let trSum = 0;
  for (let i = 1; i < recentCandles.length; i++) {
    const high = recentCandles[i].high;
    const low = recentCandles[i].low;
    const prevClose = recentCandles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
}

// حساب SL الديناميكي بناءً على ATR
function getDynamicSLRange(m5Candles?: any[]): { min: number; max: number } {
  if (!m5Candles || m5Candles.length < 20) return { min: MIN_SL_DISTANCE, max: MAX_SL_DISTANCE };
  const atr = calculateATR(m5Candles, 14);
  // SL = 1.5x إلى 2.5x ATR، محدود بالحدود القصوى
  const dynamicMin = Math.max(MIN_SL_DISTANCE, Math.round(atr * 1.5 * 100) / 100);
  const dynamicMax = Math.min(MAX_SL_DISTANCE, Math.round(atr * 2.5 * 100) / 100);
  console.log(`📏 ATR(14): ${atr.toFixed(2)} | Dynamic SL Range: $${dynamicMin.toFixed(1)} - $${dynamicMax.toFixed(1)}`);
  return { min: dynamicMin, max: dynamicMax };
}

// ===================== AI Memory System =====================
interface MarketEvent {
  time: Date;
  type: 'SWEEP_HIGH' | 'SWEEP_LOW' | 'MSS_BULLISH' | 'MSS_BEARISH' | 'FVG_BULLISH' | 'FVG_BEARISH' | 'REJECTION' | 'BOS';
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
}

// ذاكرة آخر 12 تحليل (ساعة كاملة)
const analysisHistory: AnalysisMemory[] = [];
const MAX_MEMORY_SIZE = 12;

// تخزين الأحداث المكتشفة
const detectedEvents: MarketEvent[] = [];
const MAX_EVENTS = 20;

// إضافة تحليل للذاكرة
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

// ═══════════════════════════════════════════════════════════
// 🎯 كشف تغير الاتجاه
// ═══════════════════════════════════════════════════════════

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

  // ✅ تصفية الأحداث - فقط الأحدث من ساعة كاملة
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

// ═══════════════════════════════════════════════════════════
// 🔍 كشف MSS و BOS من الشموع
// ═══════════════════════════════════════════════════════════

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
      // تحقق من وجود Lower Lows متتالية (2 على الأقل) في الماضي القريب
      let consecutiveLowerLows = 0;
      const checkCandles = previous10.slice(-6);
      for (let j = 1; j < checkCandles.length; j++) {
        if (checkCandles[j].low < checkCandles[j - 1].low) {
          consecutiveLowerLows++;
        } else {
          consecutiveLowerLows = 0; // إعادة العداد إذا انكسر التسلسل
        }
      }
      const hadBearishStructure = consecutiveLowerLows >= 2;

      // شرط إضافي: الشمعة الحالية يجب أن تكون قوية (جسم كبير)
      const bodySize = Math.abs(current.close - current.open);
      const totalSize = current.high - current.low;
      const isStrongCandle = totalSize > 0 && bodySize / totalSize > 0.5;

      if (hadBearishStructure && current.close > current.open && isStrongCandle) {
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
      // تحقق من وجود Higher Highs متتالية (2 على الأقل) في الماضي القريب
      let consecutiveHigherHighs = 0;
      const checkCandles = previous10.slice(-6);
      for (let j = 1; j < checkCandles.length; j++) {
        if (checkCandles[j].high > checkCandles[j - 1].high) {
          consecutiveHigherHighs++;
        } else {
          consecutiveHigherHighs = 0;
        }
      }
      const hadBullishStructure = consecutiveHigherHighs >= 2;

      // شرط إضافي: الشمعة الحالية يجب أن تكون قوية
      const bodySize = Math.abs(current.close - current.open);
      const totalSize = current.high - current.low;
      const isStrongCandle = totalSize > 0 && bodySize / totalSize > 0.5;

      if (hadBullishStructure && current.close < current.open && isStrongCandle) {
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

// ===================== Helpers =====================
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

// ===================== Killzone Info =====================
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

// ===================== ICT Pro System Prompt v8.0 =====================
// البرومبت الديناميكي - يتم بناؤه مع سياق الذاكرة
function buildSystemPrompt(memorySummary: string, killzoneInfo: KillzoneInfo): string {
  return `أنت محلل ICT خبير لـ XAUUSD مع ذاكرة للأحداث السابقة.

═══════════════════════════════════════════════════════════════
🧠 نظام ذكي مع ذاكرة - ICT Pro v8.0
═══════════════════════════════════════════════════════════════

${memorySummary}

═══════════════════════════════════════════════════════════════
⏰ الجلسة الحالية: ${killzoneInfo.session} (${killzoneInfo.quality})
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════
📋 منهجية التحليل ICT
═══════════════════════════════════════

1️⃣ تحديد الاتجاه H1 (إلزامي) 🎯
   • صاعد: Higher Highs + Higher Lows → شراء
   • هابط: Lower Highs + Lower Lows → بيع
   • عرضي: لا تتداول حتى يتضح الاتجاه

2️⃣ أولوية قصوى: كشف تغير الاتجاه 🔥🔥🔥
   ⚠️ إذا كان هناك تغيير مكتشف في الذاكرة:
      • هذه فرصة ذهبية! 🌟
      • السوق يتغير من [السابق] إلى [الجديد]
      • ركز على الاتجاه الجديد فقط!
      • ابحث عن MSS/BOS + Sweep + تأكيد

3️⃣ البحث عن MSS/BOS (مهم جداً) 📐
   • MSS = Market Structure Shift (تغيير الهيكل)
   • BOS = Break of Structure (كسر الهيكل)
   • MSS يحتاج Lower Lows/Higher Highs متتالية (2+) ثم انعكاس
   • إذا وجدت MSS حديث (آخر 30 دقيقة) → اهتمام عالي!
   • MSS + Sweep = إعداد قوي جداً

4️⃣ البحث عن Liquidity Sweep
   • سحب قمة/قاع سابق على M5
   • إغلاق قوي داخل النطاق
   • صالح لمدة 30 دقيقة فقط (فرص طازجة)
   ⚠️ إذا وجدت Sweep في الذاكرة خلال آخر 30 دقيقة → فرصة قوية!

5️⃣ تأكيدين قويين على الأقل (إلزامي) ✅
   ✔ رفض سعري قوي (ذيل 30%+ من الشمعة)
   ✔ شمعة ابتلاعية (Engulfing)
   ✔ FVG أو Order Block قريب
   ✔ BOS/MSS واضح
   ⚠️ يجب وجود تأكيدين مختلفين!

6️⃣ منطقة الدخول (Entry Zone) 🚨 مهم جداً!
   • من FVG أو Order Block أو منطقة الرفض
   • المسافة من السعر: 0.05% - 0.4% فقط
   • استخدم LIMIT ORDERS فقط
   • ⚠️ Entry قريب = تفعيل سريع = فرصة أفضل
   • ⚠️ Entry بعيد = قد لا يتفعل = فرصة ضائعة

═══════════════════════════════════════
💡 قواعد ذكية لزيادة الصفقات
═══════════════════════════════════════

✅ اقبل الصفقة إذا:
   • الاتجاه واضح + تأكيدات اثنين على الأقل
   • RR جيد (1:1.5 أو أفضل)
   • Entry قريب من السعر الحالي (0.4% كحد أقصى)
   • الفرصة طازجة (خلال آخر 30 دقيقة)

❌ ارفض بدون تردد:
   • الاتجاه غير واضح أو متناقض 🚫
   • تأكيد واحد فقط (غير كافي) ❌
   • Entry بعيد (أكثر من 0.4% من السعر) 🚫
   • RR ضعيف (أقل من 1:1.5) ❌
   • Score أقل من 7/10 🚫
   • Confidence أقل من 65% ❌
   • الفرصة قديمة (أكثر من 30 دقيقة) 🚫

💡 مبادئ ذكية:
   • الجودة فوق الكمية 🌟
   • لا تتساهل في المعايير ⚠️
   • إذا شككت → NO_TRADE 🚫
   • انتظر الإعداد المثالي ⏳
   • اختر Entry قريب من السعر لضمان تفعيل سريع ⚡

═══════════════════════════════════════
🎯 نظام الأهداف (TPs)
═══════════════════════════════════════

• TP1: أقرب سيولة (قمة/قاع قريب) - 1:1.5 RR
• TP2: السيولة التالية أو FVG - 1:2.5 RR
• TP3: سيولة خارجية رئيسية - 1:4+ RR

• SL: خلف القمة/القاع المسحوب + buffer 5-10$
• حجم SL: ديناميكي حسب ATR (سيتم تحديده في البيانات أدناه)

═══════════════════════════════════════
📊 JSON الإخراج
═══════════════════════════════════════

{
  "decision": "PLACE_PENDING" أو "NO_TRADE",
  "score": 0-10,
  "confidence": 0-100,
  "sentiment": "BULLISH" أو "BEARISH" أو "NEUTRAL",
  "bias": "وصف اتجاه H1 باختصار",
  "reasoning": "لماذا هذا القرار؟ اذكر السبب الرئيسي",
  "h1Trend": "BULLISH" أو "BEARISH" أو "NEUTRAL",
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
export const systemInstruction = `ICT Pro v8.0 - Dynamic Prompt with Dynamic SL & Session Guard`;


// ===================== Result Builder =====================
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

// ===================== Enhanced Validator =====================
function validateAndFix(r: any, currentPrice: number, m5Candles?: any[]): ICTAnalysis {
  console.log("\n🔍 التحقق من الصفقة...");

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

  // تحويل الأرقام
  let entry = toNumber(t.entry);
  let sl = toNumber(t.sl);
  let tp1 = toNumber(t.tp1);
  let tp2 = toNumber(t.tp2);
  let tp3 = toNumber(t.tp3);

  // التحقق من صلاحية الأرقام
  if ([entry, sl, tp1, tp2, tp3].some(isNaN)) {
    console.log("   ❌ أرقام غير صالحة");
    return createNoTradeResult(["أرقام غير صالحة في الصفقة"], r);
  }

  console.log(`   📍 Entry: ${entry} | SL: ${sl} | TP1: ${tp1}`);

  // ═══════════════════════════════════════════════════════════
  // التحقق من نوع الأمر المعلق
  // ═══════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════
  // التحقق من مسافة Entry من السعر الحالي
  // ═══════════════════════════════════════════════════════════

  const entryDistance = Math.abs(entry - currentPrice);
  const maxEntryDistance = currentPrice * MAX_ENTRY_DISTANCE_PERCENT; // 0.4% (كان 0.8%)

  if (entryDistance > maxEntryDistance) {
    console.log(`   ❌ Entry بعيد جداً: ${entryDistance.toFixed(2)}$ (max: ${maxEntryDistance.toFixed(2)}$)`);
    return createNoTradeResult([`Entry بعيد: ${entryDistance.toFixed(1)}$ من السعر`], r);
  }

  // ═══════════════════════════════════════════════════════════
  // التحقق من SL وتصحيحه
  // ═══════════════════════════════════════════════════════════

  // حساب SL الديناميكي بناءً على ATR
  const slRange = getDynamicSLRange(m5Candles);
  let slDistance = Math.abs(entry - sl);
  console.log(`   📏 مسافة SL: ${slDistance.toFixed(2)}$ | النطاق المطلوب: $${slRange.min.toFixed(1)} - $${slRange.max.toFixed(1)}`);

  // تصحيح SL إذا كان قريب جداً
  if (slDistance < slRange.min) {
    const idealSL = (slRange.min + slRange.max) / 2; // منتصف النطاق
    const newSl = isBuy ? entry - idealSL : entry + idealSL;
    console.log(`   🔧 تصحيح SL من ${sl} إلى ${newSl.toFixed(2)} (كان قريب جداً)`);
    sl = round2(newSl);
    slDistance = idealSL;
  }

  // رفض إذا SL بعيد جداً
  if (slDistance > slRange.max) {
    console.log(`   ❌ SL بعيد جداً: ${slDistance.toFixed(2)}$ (max: ${slRange.max.toFixed(1)}$)`);
    return createNoTradeResult([`SL بعيد جداً: ${slDistance.toFixed(1)}$`], r);
  }

  // ═══════════════════════════════════════════════════════════
  // التحقق من ترتيب المستويات
  // ═══════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════
  // حساب RR والتحقق منه
  // ═══════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════
  // تحديث الصفقة بالقيم المصححة
  // ═══════════════════════════════════════════════════════════

  t.entry = round2(entry);
  t.sl = round2(sl);
  t.tp1 = round2(tp1);
  t.tp2 = round2(tp2);
  t.tp3 = round2(tp3);
  t.rrRatio = `TP1: 1:${rr1.toFixed(1)} | TP2: 1:${rr2.toFixed(1)} | TP3: 1:${rr3.toFixed(1)}`;
  t.riskAmount = `${risk.toFixed(2)}$`;
  t.expiryMinutes = DEFAULT_EXPIRY_MINUTES;
  t.expiryTime = new Date(Date.now() + DEFAULT_EXPIRY_MINUTES * 60 * 1000).toISOString();

  console.log(`   ✅ صفقة صالحة - RR جيد | صلاحية: ${DEFAULT_EXPIRY_MINUTES} دقيقة`);

  return r as ICTAnalysis;
}

// ===================== API Call =====================
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

// ===================== Multi-Timeframe Analysis with Memory =====================
export const analyzeMultiTimeframe = async (
  h1Image: string,
  m5Image: string,
  currentPrice: number,
  h1Candles?: any[],
  m5Candles?: any[]
): Promise<ICTAnalysis> => {
  const killzoneInfo = getCurrentKillzone();

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("🧠 ICT Pro Analysis v8.0 - With Memory + Dynamic SL");
  console.log(`💰 السعر الحالي: ${currentPrice}`);
  console.log(`⏰ الجلسة: ${killzoneInfo.session} (${killzoneInfo.quality})`);
  console.log(`🧠 الذاكرة: ${analysisHistory.length} تحليلات سابقة`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // حارس جودة الجلسة - لا نتداول في OFF_HOURS
  if (!killzoneInfo.isActive || killzoneInfo.quality === 'LOW') {
    console.log(`⚠️ الجلسة غير نشطة أو منخفضة الجودة (${killzoneInfo.session}) - تخطي التحليل`);
    const noTradeResult = createNoTradeResult([
      `الجلسة غير نشطة (${killzoneInfo.session}) - لا يوجد سيولة كافية`,
      `انتظر جلسة London أو New York للحصول على إشارات أفضل`
    ]);
    noTradeResult.killzoneInfo = killzoneInfo;

    // لا نزال نحفظ في الذاكرة للتتبع
    addToMemory({
      timestamp: new Date(),
      price: currentPrice,
      decision: 'NO_TRADE',
      bias: 'OFF_HOURS',
      score: 0,
      events: [],
      h1Trend: 'NEUTRAL'
    });

    return noTradeResult;
  }

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

  // حساب ATR لعرضه في البرومبت
  const m5ATR = m5Candles ? calculateATR(m5Candles, 14) : 0;
  const slRange = getDynamicSLRange(m5Candles);

  if (h1Candles && h1Candles.length > 0) {
    const recentH1 = h1Candles.slice(-20);
    candleDataText += '\n\n📊 بيانات H1 (آخر 20 شمعة مع الوقت):\n';
    candleDataText += recentH1.map((c, i) => {
      const time = c.time ? new Date(c.time).toISOString().slice(0, 16).replace('T', ' ') : `#${i + 1}`;
      return `${time} | O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`;
    }).join('\n');
  }

  if (m5Candles && m5Candles.length > 0) {
    const recentM5 = m5Candles.slice(-40);
    candleDataText += '\n\n📊 بيانات M5 (آخر 40 شمعة مع الوقت):\n';
    candleDataText += recentM5.map((c, i) => {
      const time = c.time ? new Date(c.time).toISOString().slice(0, 16).replace('T', ' ') : `#${i + 1}`;
      return `${time} | O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`;
    }).join('\n');
  }

  const userPrompt = `${dynamicPrompt}

═══════════════════════════════════════
📈 بيانات السوق الحالية
═══════════════════════════════════════

الزوج: XAUUSD (الذهب)
السعر الحالي: ${currentPrice}
الجلسة: ${killzoneInfo.session}
جودة الجلسة: ${killzoneInfo.quality}

الصورة 1: شارت H1 (لتحديد الاتجاه)
الصورة 2: شارت M5 (لتحديد الدخول)

📊 معلومات التقلب:
- ATR(14) M5: ${m5ATR.toFixed(2)}$
- نطاق SL المطلوب: $${slRange.min.toFixed(1)} - $${slRange.max.toFixed(1)}
${candleDataText}

═══════════════════════════════════════
⚠️ تذكير مهم جداً
═══════════════════════════════════════
- SL: بين $${slRange.min.toFixed(0)} و $${slRange.max.toFixed(0)} من Entry (حسب ATR)
- Entry: أقل من 0.4% من السعر الحالي (${(currentPrice * MAX_ENTRY_DISTANCE_PERCENT).toFixed(2)}$)
- RR: minimum 1:1.5
- الأمر المعلق صالح لمدة ${DEFAULT_EXPIRY_MINUTES} دقيقة فقط
- اختر Entry قريب من السعر الحالي لضمان تفعيل الصفقة في الوقت المناسب

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

    const validated = validateAndFix(parsed, currentPrice, m5Candles);
    validated.killzoneInfo = killzoneInfo;

    // 4. حفظ التحليل في الذاكرة
    const h1Trend = (parsed.h1Trend || parsed.sentiment || 'NEUTRAL') as 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    addToMemory({
      timestamp: new Date(),
      price: currentPrice,
      decision: validated.decision,
      bias: validated.bias || '',
      score: validated.score || 0,
      events: detectedEvents.slice(0, 5),
      h1Trend: h1Trend
    });

    console.log(`\n🎯 النتيجة النهائية: ${validated.decision}`);
    if (validated.suggestedTrade) {
      const t = validated.suggestedTrade;
      console.log(`   ${t.type} @ ${t.entry}`);
      console.log(`   SL: ${t.sl} | TP1: ${t.tp1} | TP2: ${t.tp2} | TP3: ${t.tp3}`);
    }
    console.log("═══════════════════════════════════════════════════════════════\n");

    return validated;
  } catch (error) {
    console.error("\n❌ خطأ في التحليل:", error);
    return createNoTradeResult(["خطأ في الاتصال بالـ AI"]);
  }
};

// ===================== Chat =====================
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

// ===================== Follow Up Trade =====================
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
            text: `راجع الصفقة المفتوحة:

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

// ===================== Trade Monitoring =====================
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
            text: `راقب الصفقة:
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
