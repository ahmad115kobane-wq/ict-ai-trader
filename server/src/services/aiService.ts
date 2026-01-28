// services/aiService.ts
// ✅ نسخة ICT محسّنة - مرونة أكبر مع الحفاظ على الجودة
// ✅ تحليل متكامل: H1 للسياق + M5 للدخول
// ✅ صفقات قريبة من السعر الحالي + عدة صفقات يومياً
// 🔄 Version: 3.0.0 - Enhanced flexibility + closer entries + more trades

import { ICTAnalysis, ManagementAdvice } from "../types";

// ===================== Environment Variables =====================
declare const process: any;

console.log("🚀 aiService v3.0.0 loaded - Enhanced flexibility for more trades");

// ===================== API Config =====================
// ⚠️ يقرأ من OLLAMA_API_KEY و OLLAMA_BASE_URL في Railway
const API_KEY = process?.env?.OLLAMA_API_KEY || process?.env?.AI_API_KEY || "YOUR_API_KEY";
const BASE_URL = process?.env?.OLLAMA_BASE_URL || process?.env?.AI_BASE_URL || "https://api.openai.com";
const MODEL = process?.env?.OLLAMA_MODEL || process?.env?.AI_MODEL || "llama3.2-vision";

console.log(`📍 API Config: ${BASE_URL} | Model: ${MODEL}`);

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

// ===================== Validation Options =====================
// ✅ تم تخفيف المعايير لتوليد صفقات أكثر مع الحفاظ على جودة عالية
const VALIDATION_OPTIONS = {
  maxDistancePercent: 0.008,  // 0.8% حد أقصى للمسافة - صفقات قريبة جداً
  minRR: 1.2,                 // نسبة مخاطرة/عائد أدنى - أكثر مرونة
  minScore: 5.0,              // تقييم أدنى - مخفض لصفقات أكثر
  minConfidence: 55,          // ثقة أدنى - مخفضة
  minConfluences: 1,          // تلاقية واحدة كافية
  maxM5CandlesAgo: 30,        // أقصى عدد شموع لسحب M5 - أكثر مرونة
  
  // ✅ إعدادات جديدة لتحسين جودة الصفقات
  oteZone: { min: 0.618, max: 0.79 },  // منطقة OTE (فيبوناتشي)
  killzones: {
    london: { start: 7, end: 11 },      // جلسة لندن (UTC)
    newYork: { start: 13, end: 17 },    // جلسة نيويورك (UTC)
    overlap: { start: 13, end: 16 }     // تداخل الجلسات (أفضل وقت)
  },
  
  // ✅ إعدادات الأهداف
  tpMultipliers: {
    tp1: 1.5,   // TP1 = 1.5x المخاطرة
    tp2: 2.5,   // TP2 = 2.5x المخاطرة
    tp3: 4.0    // TP3 = 4x المخاطرة
  }
};

console.log("⚙️ Validation Options (Enhanced v3.0):", JSON.stringify(VALIDATION_OPTIONS, null, 2));

// ===================== ICT System Instruction =====================
export const systemInstruction = `
أنت "ICT Professional Analyzer" متخصص XAUUSD - تحليل مؤسسي مرن يهدف لتوليد صفقات عالية الجودة.
⚠️ يجب أن تكون جميع النصوص بالعربية فقط.
⚠️ يجب أن ترد بصيغة JSON فقط بدون أي نص خارجي.

🎯 الهدف: توليد صفقات معلقة قريبة من السعر الحالي بنسبة نجاح عالية

═══════════════════════════════════════════════════════════════
(1) سحب السيولة (Liquidity Sweep) - مهم لكن ليس إلزامي 100%
═══════════════════════════════════════════════════════════════
🔍 ابحث عن أي من العلامات التالية:

✅ علامات BSL Sweep (سحب سيولة الشراء) → يسمح بالبيع:
- السعر يكسر قمة سابقة ثم يغلق تحتها
- ذيل علوي طويل يظهر الرفض
- انعكاس هبوطي بعد الكسر

✅ علامات SSL Sweep (سحب سيولة البيع) → يسمح بالشراء:
- السعر يكسر قاع سابق ثم يغلق فوقه
- ذيل سفلي طويل يظهر الرفض
- انعكاس صعودي بعد الكسر

⚠️ بديل مقبول إذا لم يحدث sweep واضح:
- رفض من منطقة سيولة قوية (ذيول طويلة)
- تشكل نموذج انعكاسي عند مستوى مهم
- إذا وجدت 3+ تلاقيات أخرى، يمكن القبول

═══════════════════════════════════════════════════════════════
(2) هيكل السوق (Market Structure) - مرن
═══════════════════════════════════════════════════════════════
✅ الأفضل: MSS (Market Structure Shift) أو CHoCH
✅ مقبول: BOS (Break of Structure) مع تأكيد
✅ مقبول: ارتداد من منطقة OTE (62-79% فيبوناتشي)

للشراء: كسر آخر Lower High أو ارتداد من Discount
للبيع: كسر آخر Higher Low أو ارتداد من Premium

═══════════════════════════════════════════════════════════════
(3) Displacement - مرونة أكبر
═══════════════════════════════════════════════════════════════
✅ STRONG: شمعة كبيرة جداً مع FVG واضح (الأفضل)
✅ MODERATE: حركة واضحة في اتجاه واحد (مقبول)
⚠️ WEAK: مقبول إذا كانت هناك تلاقيات قوية أخرى

═══════════════════════════════════════════════════════════════
(4) الدخول من PD Arrays - مرن
═══════════════════════════════════════════════════════════════
✅ FVG (Fair Value Gap) - الأفضل
✅ OB (Order Block) - ممتاز
✅ Breaker Block - مقبول
✅ Mitigation Block - مقبول
✅ OTE Zone (62-79% فيبوناتشي) - ممتاز
✅ منطقة رفض قوي (ذيول طويلة) - مقبول

═══════════════════════════════════════════════════════════════
(5) الموقع السعري - مرن
═══════════════════════════════════════════════════════════════
✅ BUY → Discount أو MID السفلي
✅ SELL → Premium أو MID العلوي
⚠️ MID → مقبول مع تلاقيات قوية

═══════════════════════════════════════════════════════════════
(6) أوقات التداول المفضلة (Killzones)
═══════════════════════════════════════════════════════════════
🟢 جلسة لندن: 07:00-11:00 UTC
🟢 جلسة نيويورك: 13:00-17:00 UTC
🟢 تداخل الجلسات: 13:00-16:00 UTC (الأفضل)

═══════════════════════════════════════════════════════════════
(7) حساب الدخول والأهداف
═══════════════════════════════════════════════════════════════
🎯 نقطة الدخول:
- يجب أن تكون قريبة جداً من السعر الحالي (< 0.5% أفضل)
- في منطقة OTE أو PD Array
- BUY_LIMIT: تحت السعر الحالي قليلاً
- SELL_LIMIT: فوق السعر الحالي قليلاً

🎯 وقف الخسارة:
- خلف آخر swing high/low
- يجب أن يكون منطقياً (ليس بعيد جداً)

🎯 الأهداف (3 أهداف إلزامية):
- TP1: 1.5x المخاطرة (هدف سريع)
- TP2: 2.5x المخاطرة (هدف متوسط)
- TP3: 4x المخاطرة (هدف بعيد)

═══════════════════════════════════════════════════════════════
(8) صيغة JSON الإلزامية
═══════════════════════════════════════════════════════════════
{
  "decision": "PLACE_PENDING" | "NO_TRADE",
  "score": 0-10,
  "confidence": 0-100,
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bias": "وصف سياق H1 بالعربية",
  "priceLocation": "PREMIUM" | "DISCOUNT" | "MID",
  "h1Analysis": {
    "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
    "allowBuy": true | false,
    "allowSell": true | false,
    "liquiditySweep": "وصف السحب أو 'لم يحدث'",
    "nearestBSL": "وصف/سعر",
    "nearestSSL": "وصف/سعر"
  },
  "m5Analysis": {
    "marketStructure": "MSS" | "CHoCH" | "BOS" | "CONSOLIDATION",
    "mssOccurredAfterSweep": true | false,
    "displacement": "STRONG" | "MODERATE" | "WEAK",
    "pdArray": "FVG" | "OB" | "BREAKER" | "MITIGATION" | "OTE" | "NONE",
    "readyForEntry": true | false
  },
  "liquidityPurge": {
    "h1Sweep": {
      "occurred": true | false,
      "type": "BSL" | "SSL" | "NONE",
      "levelName": "اسم المستوى",
      "evidence": {
        "wickRejection": true | false,
        "closedBackInside": true | false,
        "reversedWithin3Candles": true | false
      }
    },
    "m5InternalSweep": {
      "occurred": true | false,
      "type": "BSL" | "SSL" | "NONE",
      "levelName": "اسم المستوى",
      "isRecent": true | false,
      "evidence": {
        "wickRejection": true | false,
        "wickSize": "LARGE" | "MEDIUM" | "SMALL",
        "closedBackInside": true | false,
        "candlesAgo": number
      }
    },
    "primarySource": "H1" | "M5" | "NONE"
  },
  "confluences": ["عامل 1", "عامل 2"],
  "reasons": ["سبب 1", "سبب 2"],
  "reasoning": "شرح مفصل",
  "suggestedTrade": {
    "type": "BUY_LIMIT" | "SELL_LIMIT" | "BUY_STOP" | "SELL_STOP",
    "entry": number,
    "sl": number,
    "tp1": number,
    "tp2": number,
    "tp3": number,
    "expiryMinutes": 60,
    "cancelConditions": ["شرط 1"]
  }
}

🔴 مهم جداً:
- أعطِ صفقة إذا وجدت 2+ تلاقيات حتى لو لم يكتمل كل الشروط
- الهدف هو توليد صفقات قريبة بنسبة نجاح عالية
- لا تكن متشدداً جداً - السوق لا يعطي setup مثالي دائماً
`;

// ===================== Result Builder =====================
interface ValidationResult {
  isValid: boolean;
  reasons: string[];
}

function createNoTradeResult(reasons: string[], original: any = {}): ICTAnalysis {
  return {
    decision: "NO_TRADE",
    score: original.score || 0,
    confidence: original.confidence || 0,
    sentiment: original.sentiment || "NEUTRAL",
    bias: original.bias || "",
    priceLocation: original.priceLocation || "MID",
    h1Analysis: original.h1Analysis || {},
    m5Analysis: original.m5Analysis || {},
    liquidityPurge: original.liquidityPurge || {},
    drawOnLiquidity: original.drawOnLiquidity || {
      direction: "NEUTRAL",
      target: "",
      nearestBSL: "",
      nearestSSL: ""
    },
    confluences: original.confluences || [],
    reasons: reasons,
    reasoning: original.reasoning || ""
  } as ICTAnalysis;
}

// ===================== Validation Functions =====================

// 1. التحقق من سحب السيولة - أكثر مرونة
function validateLiquiditySweep(r: any): ValidationResult {
  const reasons: string[] = [];
  
  const h1Sweep = r.liquidityPurge?.h1Sweep?.occurred === true;
  const m5Sweep = r.liquidityPurge?.m5InternalSweep?.occurred === true;
  const confluences = Array.isArray(r.confluences) ? r.confluences.length : 0;
  
  // ✅ مرونة: السماح بدون sweep إذا كانت هناك تلاقيات كثيرة
  if (!h1Sweep && !m5Sweep) {
    if (confluences >= 3) {
      reasons.push("⚠️ لم يحدث سحب سيولة واضح - لكن يوجد تلاقيات قوية (مقبول)");
      return { isValid: true, reasons };
    }
    
    // تحقق من وجود رفض قوي كبديل
    const h1WickReject = r.liquidityPurge?.h1Sweep?.evidence?.wickRejection === true;
    const m5WickReject = r.liquidityPurge?.m5InternalSweep?.evidence?.wickRejection === true;
    
    if (h1WickReject || m5WickReject) {
      reasons.push("⚠️ يوجد رفض قوي من مستوى سيولة (مقبول كبديل للـ sweep)");
      return { isValid: true, reasons };
    }
    
    reasons.push("❌ لم يحدث سحب سيولة ولا رفض قوي ولا تلاقيات كافية");
    return { isValid: false, reasons };
  }
  
  // التحقق من M5 إذا كان المصدر الأساسي - أكثر مرونة
  if (!h1Sweep && m5Sweep) {
    const m5Evidence = r.liquidityPurge?.m5InternalSweep?.evidence || {};
    const isRecent = r.liquidityPurge?.m5InternalSweep?.isRecent === true;
    const candlesAgo = Number(m5Evidence.candlesAgo) || 999;
    
    if (!isRecent && candlesAgo > VALIDATION_OPTIONS.maxM5CandlesAgo) {
      // مرونة: السماح إذا كان الرفض قوي
      if (m5Evidence.wickSize === "LARGE") {
        reasons.push(`⚠️ سحب M5 قديم (${candlesAgo} شموع) لكن الرفض قوي جداً`);
      } else {
        reasons.push(`❌ سحب M5 قديم جداً (${candlesAgo} شموع)`);
        return { isValid: false, reasons };
      }
    }
  }
  
  return { isValid: true, reasons };
}

// 2. التحقق من توافق نوع السحب مع الصفقة - أكثر مرونة
function validateSweepTypeMatch(r: any, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  
  const h1Sweep = r.liquidityPurge?.h1Sweep?.occurred === true;
  const m5Sweep = r.liquidityPurge?.m5InternalSweep?.occurred === true;
  const confluences = Array.isArray(r.confluences) ? r.confluences.length : 0;
  
  // تحديد المصدر الأساسي
  let primarySource = "NONE";
  let sweepType = "NONE";
  
  if (h1Sweep) {
    primarySource = "H1";
    sweepType = r.liquidityPurge?.h1Sweep?.type || "NONE";
  } else if (m5Sweep) {
    primarySource = "M5";
    sweepType = r.liquidityPurge?.m5InternalSweep?.type || "NONE";
  }
  
  // تحديث primarySource في البيانات
  if (r.liquidityPurge) {
    r.liquidityPurge.primarySource = primarySource;
  }
  
  // ✅ مرونة: السماح إذا لم يكن هناك sweep واضح لكن هناك تلاقيات
  if (sweepType === "NONE" && confluences >= 2) {
    reasons.push("⚠️ لا يوجد sweep واضح لكن التلاقيات كافية");
    return { isValid: true, reasons };
  }
  
  // التحقق من التوافق
  if (isBuy && sweepType !== "SSL" && sweepType !== "NONE") {
    reasons.push(`⚠️ شراء يفضل SSL Sweep - الموجود: ${sweepType} (مقبول مع حذر)`);
    // لا نرفض، فقط تحذير
  }
  
  if (!isBuy && sweepType !== "BSL" && sweepType !== "NONE") {
    reasons.push(`⚠️ بيع يفضل BSL Sweep - الموجود: ${sweepType} (مقبول مع حذر)`);
    // لا نرفض، فقط تحذير
  }
  
  return { isValid: true, reasons };
}

// 3. التحقق من H1 allowBuy/allowSell - أكثر مرونة
function validateH1Permission(r: any, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  const h1 = r.h1Analysis || {};
  const primarySource = r.liquidityPurge?.primarySource || "NONE";
  const confluences = Array.isArray(r.confluences) ? r.confluences.length : 0;
  
  // ✅ مرونة أكبر: تحذير بدلاً من رفض
  if (primarySource === "H1") {
    if (isBuy && h1.allowBuy !== true) {
      if (confluences >= 3) {
        reasons.push("⚠️ H1 لا يسمح بالشراء صراحة لكن التلاقيات قوية");
      } else {
        reasons.push("❌ سياق H1 لا يسمح بالشراء");
        return { isValid: false, reasons };
      }
    }
    if (!isBuy && h1.allowSell !== true) {
      if (confluences >= 3) {
        reasons.push("⚠️ H1 لا يسمح بالبيع صراحة لكن التلاقيات قوية");
      } else {
        reasons.push("❌ سياق H1 لا يسمح بالبيع");
        return { isValid: false, reasons };
      }
    }
  }
  
  // إذا كان المصدر M5، تحقق من عدم وجود اتجاه معاكس قوي على H1
  if (primarySource === "M5") {
    const h1Bias = h1.bias || "NEUTRAL";
    // مرونة: NEUTRAL مقبول دائماً
    if (isBuy && h1Bias === "BEARISH") {
      if (confluences >= 4) {
        reasons.push("⚠️ H1 هابط لكن التلاقيات قوية جداً (مخاطرة)");
      } else {
        reasons.push("❌ H1 هابط بقوة - لا يمكن الشراء");
        return { isValid: false, reasons };
      }
    }
    if (!isBuy && h1Bias === "BULLISH") {
      if (confluences >= 4) {
        reasons.push("⚠️ H1 صاعد لكن التلاقيات قوية جداً (مخاطرة)");
      } else {
        reasons.push("❌ H1 صاعد بقوة - لا يمكن البيع");
        return { isValid: false, reasons };
      }
    }
  }
  
  return { isValid: true, reasons };
}

// 4. التحقق من الموقع السعري ✅ أكثر مرونة
function validatePriceLocation(r: any, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  const priceLocation = r.priceLocation || "MID";
  const confluences = Array.isArray(r.confluences) ? r.confluences.length : 0;
  
  // ✅ MID مقبول الآن مع تخفيض بسيط
  if (priceLocation === "MID") {
    r.score = Math.max((r.score || 0) - 0.5, 0);  // تخفيض أقل
    r.confidence = Math.max((r.confidence || 0) - 5, 0);
    reasons.push("⚠️ الموقع السعري في المنتصف (MID) - تم تخفيض التقييم قليلاً");
  }
  
  // ✅ مرونة أكبر: السماح بالتداول العكسي مع تلاقيات قوية
  if (isBuy && priceLocation === "PREMIUM") {
    if (confluences >= 4) {
      r.score = Math.max((r.score || 0) - 1, 0);
      reasons.push("⚠️ شراء في Premium مع تلاقيات قوية (مخاطرة عالية)");
    } else {
      reasons.push("❌ لا يمكن الشراء في Premium - انتظر Discount");
      return { isValid: false, reasons };
    }
  }
  
  if (!isBuy && priceLocation === "DISCOUNT") {
    if (confluences >= 4) {
      r.score = Math.max((r.score || 0) - 1, 0);
      reasons.push("⚠️ بيع في Discount مع تلاقيات قوية (مخاطرة عالية)");
    } else {
      reasons.push("❌ لا يمكن البيع في Discount - انتظر Premium");
      return { isValid: false, reasons };
    }
  }
  
  return { isValid: true, reasons };
}

// 5. التحقق من MSS بعد السحب - أكثر مرونة
function validateMSSAfterSweep(r: any): ValidationResult {
  const reasons: string[] = [];
  const m5 = r.m5Analysis || {};
  const confluences = Array.isArray(r.confluences) ? r.confluences.length : 0;
  
  const marketStructure = m5.marketStructure || "CONSOLIDATION";
  const mssOccurredAfterSweep = m5.mssOccurredAfterSweep === true;
  
  // ✅ توسيع المقبول: MSS, CHoCH, أو حتى BOS مع تأكيد
  const hasValidStructure = ["MSS", "CHoCH", "BOS"].includes(marketStructure);
  
  if (!hasValidStructure) {
    if (confluences >= 3) {
      reasons.push("⚠️ لم يحدث كسر هيكل واضح لكن التلاقيات قوية");
      return { isValid: true, reasons };
    }
    reasons.push(`❌ الهيكل الحالي: ${marketStructure} - غير كافٍ`);
    return { isValid: false, reasons };
  }
  
  // ✅ مرونة: BOS مقبول مع تحذير
  if (marketStructure === "BOS") {
    reasons.push("⚠️ BOS فقط - ليس مثالياً لكن مقبول");
  }
  
  // ✅ مرونة: السماح بدون تأكيد MSS بعد السحب إذا كانت التلاقيات قوية
  if (!mssOccurredAfterSweep) {
    if (confluences >= 2 || hasValidStructure) {
      reasons.push("⚠️ MSS لم يُؤكد بعد السحب - لكن الهيكل واضح");
    } else {
      reasons.push("❌ MSS لم يحدث بعد السحب والتلاقيات ضعيفة");
      return { isValid: false, reasons };
    }
  }
  
  return { isValid: true, reasons };
}

// 6. التحقق من Displacement - أكثر مرونة
function validateDisplacement(r: any): ValidationResult {
  const reasons: string[] = [];
  const m5 = r.m5Analysis || {};
  const displacement = m5.displacement || "WEAK";
  const confluences = Array.isArray(r.confluences) ? r.confluences.length : 0;
  
  // ✅ مرونة: WEAK مقبول مع تلاقيات قوية
  if (displacement === "WEAK") {
    if (confluences >= 3) {
      r.score = Math.max((r.score || 0) - 0.5, 0);
      reasons.push("⚠️ الإزاحة ضعيفة لكن التلاقيات تعوض (مقبول)");
      return { isValid: true, reasons };
    }
    reasons.push("❌ الإزاحة السعرية ضعيفة (WEAK) والتلاقيات غير كافية");
    return { isValid: false, reasons };
  }
  
  if (displacement === "MODERATE") {
    reasons.push("✅ الإزاحة السعرية متوسطة (MODERATE) - جيد");
  }
  
  if (displacement === "STRONG") {
    reasons.push("✅ الإزاحة السعرية قوية (STRONG) - ممتاز");
  }
  
  return { isValid: true, reasons };
}

// 7. التحقق من PD Array - أكثر مرونة
function validatePDArray(r: any): ValidationResult {
  const reasons: string[] = [];
  const m5 = r.m5Analysis || {};
  const pdArray = m5.pdArray || "NONE";
  const confluences = Array.isArray(r.confluences) ? r.confluences.length : 0;
  
  // التحقق من وجود رفض قوي كبديل
  const h1WickReject = r.liquidityPurge?.h1Sweep?.evidence?.wickRejection === true;
  const m5WickReject = r.liquidityPurge?.m5InternalSweep?.evidence?.wickRejection === true;
  const hasStrongReject = h1WickReject || m5WickReject;
  
  // ✅ توسيع المقبول لتشمل أنواع PD Arrays الإضافية
  const validPDArrays = ["FVG", "OB", "BREAKER", "MITIGATION", "OTE"];
  
  if (validPDArrays.includes(pdArray)) {
    reasons.push(`✅ دخول من ${pdArray} - ممتاز`);
    return { isValid: true, reasons };
  }
  
  if (pdArray === "NONE") {
    if (hasStrongReject) {
      reasons.push("✅ رفض قوي من مستوى سيولة (بديل جيد لـ PD Array)");
      return { isValid: true, reasons };
    }
    
    if (confluences >= 2) {
      reasons.push("⚠️ لا يوجد PD Array واضح لكن التلاقيات كافية");
      return { isValid: true, reasons };
    }
    
    reasons.push("❌ لا يوجد FVG/OB/رفض قوي - الدخول غير محدد");
    return { isValid: false, reasons };
  }
  
  return { isValid: true, reasons };
}

// 8. التحقق من التلاقيات - أكثر مرونة
function validateConfluences(r: any): ValidationResult {
  const reasons: string[] = [];
  const confluences = Array.isArray(r.confluences) ? r.confluences : [];
  
  // ✅ مرونة: تلاقية واحدة كافية مع تحذير
  if (confluences.length === 0) {
    reasons.push("❌ لا توجد تلاقيات على الإطلاق");
    return { isValid: false, reasons };
  }
  
  if (confluences.length < VALIDATION_OPTIONS.minConfluences) {
    reasons.push(`⚠️ التلاقيات قليلة (${confluences.length}) - مقبول لكن ليس مثالي`);
  } else {
    reasons.push(`✅ التلاقيات جيدة (${confluences.length})`);
  }
  
  return { isValid: true, reasons };
}

// 9. التحقق من Score و Confidence - أكثر مرونة
function validateScoreAndConfidence(r: any): ValidationResult {
  const reasons: string[] = [];
  
  const score = Number(r.score) || 0;
  const confidence = Number(r.confidence) || 0;
  const confluences = Array.isArray(r.confluences) ? r.confluences.length : 0;
  
  // ✅ مرونة: السماح بتقييم أقل مع تلاقيات قوية
  if (score < VALIDATION_OPTIONS.minScore) {
    if (confluences >= 3 && score >= 4) {
      reasons.push(`⚠️ التقييم منخفض قليلاً (${score}/10) لكن التلاقيات قوية`);
    } else {
      reasons.push(`❌ التقييم منخفض جداً (${score}/10) - المطلوب >= ${VALIDATION_OPTIONS.minScore}`);
      return { isValid: false, reasons };
    }
  }
  
  if (confidence < VALIDATION_OPTIONS.minConfidence) {
    if (confluences >= 3 && confidence >= 45) {
      reasons.push(`⚠️ الثقة منخفضة قليلاً (${confidence}%) لكن التلاقيات قوية`);
    } else {
      reasons.push(`❌ الثقة منخفضة جداً (${confidence}%) - المطلوب >= ${VALIDATION_OPTIONS.minConfidence}%`);
      return { isValid: false, reasons };
    }
  }
  
  return { isValid: true, reasons };
}

// 10. التحقق من بيانات الصفقة - تحسين للصفقات القريبة
function validateTradeData(t: any, currentPrice: number, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  
  // التحقق من نوع الصفقة
  const allowedTypes = ["BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"];
  if (!allowedTypes.includes(String(t.type))) {
    reasons.push(`❌ نوع الصفقة غير مدعوم: ${t.type}`);
    return { isValid: false, reasons };
  }
  
  // تحويل الأرقام
  let entry = toNumber(t.entry);
  let sl = toNumber(t.sl);
  let tp1 = toNumber(t.tp1);
  let tp2 = toNumber(t.tp2);
  let tp3 = toNumber(t.tp3);
  
  if ([entry, sl, tp1, tp2, tp3].some(isNaN)) {
    reasons.push("❌ قيم الصفقة غير صالحة (entry/sl/tp)");
    return { isValid: false, reasons };
  }
  
  // ✅ تعديل نقطة الدخول لتكون قريبة جداً
  const dist = Math.abs(entry - currentPrice);
  const maxDist = currentPrice * VALIDATION_OPTIONS.maxDistancePercent;
  
  if (dist > maxDist) {
    // تعديل تلقائي للدخول ليكون أقرب
    const adjustment = currentPrice * 0.002; // 0.2% من السعر الحالي
    if (isBuy) {
      // BUY_LIMIT: تحت السعر الحالي
      entry = round2(currentPrice - adjustment);
      if (sl >= entry) sl = round2(entry - (currentPrice * 0.005)); // SL 0.5% تحت الدخول
    } else {
      // SELL_LIMIT: فوق السعر الحالي
      entry = round2(currentPrice + adjustment);
      if (sl <= entry) sl = round2(entry + (currentPrice * 0.005)); // SL 0.5% فوق الدخول
    }
    
    // إعادة حساب الأهداف بناءً على الدخول الجديد
    const risk = Math.abs(entry - sl);
    if (isBuy) {
      tp1 = round2(entry + (risk * VALIDATION_OPTIONS.tpMultipliers.tp1));
      tp2 = round2(entry + (risk * VALIDATION_OPTIONS.tpMultipliers.tp2));
      tp3 = round2(entry + (risk * VALIDATION_OPTIONS.tpMultipliers.tp3));
    } else {
      tp1 = round2(entry - (risk * VALIDATION_OPTIONS.tpMultipliers.tp1));
      tp2 = round2(entry - (risk * VALIDATION_OPTIONS.tpMultipliers.tp2));
      tp3 = round2(entry - (risk * VALIDATION_OPTIONS.tpMultipliers.tp3));
    }
    
    // تحديث القيم
    t.entry = entry;
    t.sl = sl;
    t.tp1 = tp1;
    t.tp2 = tp2;
    t.tp3 = tp3;
    
    reasons.push(`✅ تم تعديل الدخول ليكون أقرب للسعر الحالي (${entry})`);
  }
  
  // التحقق من ترتيب المستويات
  if (isBuy) {
    if (!(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
      // محاولة إصلاح الترتيب
      const risk = Math.abs(entry - sl) || (currentPrice * 0.005);
      t.tp1 = round2(entry + (risk * VALIDATION_OPTIONS.tpMultipliers.tp1));
      t.tp2 = round2(entry + (risk * VALIDATION_OPTIONS.tpMultipliers.tp2));
      t.tp3 = round2(entry + (risk * VALIDATION_OPTIONS.tpMultipliers.tp3));
      reasons.push("✅ تم إصلاح ترتيب أهداف الشراء");
    }
  } else {
    if (!(tp3 < tp2 && tp2 < tp1 && tp1 < entry && entry < sl)) {
      // محاولة إصلاح الترتيب
      const risk = Math.abs(sl - entry) || (currentPrice * 0.005);
      t.tp1 = round2(entry - (risk * VALIDATION_OPTIONS.tpMultipliers.tp1));
      t.tp2 = round2(entry - (risk * VALIDATION_OPTIONS.tpMultipliers.tp2));
      t.tp3 = round2(entry - (risk * VALIDATION_OPTIONS.tpMultipliers.tp3));
      reasons.push("✅ تم إصلاح ترتيب أهداف البيع");
    }
  }
  
  // التحقق من RR
  const risk = Math.abs(t.entry - t.sl);
  const reward1 = Math.abs(t.tp1 - t.entry);
  const rr1 = reward1 / (risk || 0.0001);
  
  if (rr1 < VALIDATION_OPTIONS.minRR) {
    // تعديل TP1 لتحقيق الحد الأدنى من RR
    if (isBuy) {
      t.tp1 = round2(t.entry + (risk * VALIDATION_OPTIONS.minRR));
    } else {
      t.tp1 = round2(t.entry - (risk * VALIDATION_OPTIONS.minRR));
    }
    reasons.push(`✅ تم تعديل TP1 لتحقيق RR >= ${VALIDATION_OPTIONS.minRR}`);
  }
  
  return { isValid: true, reasons };
}

// ===================== Main Validator =====================
function validateAndFix(r: any, currentPrice: number): ICTAnalysis {
  const allReasons: string[] = [];
  
  // تهيئة البيانات
  r = r || {};
  r.reasons = Array.isArray(r.reasons) ? r.reasons : [];
  r.confluences = Array.isArray(r.confluences) ? r.confluences : [];
  r.score = Number(r.score) || 0;
  r.confidence = Number(r.confidence) || 0;
  
  // 1. التحقق من وجود قرار وصفقة
  if (r.decision !== "PLACE_PENDING" || !r.suggestedTrade) {
    // ✅ إضافة الأسباب التفصيلية من النموذج
    const modelReasons = r.reasons && r.reasons.length > 0 
      ? r.reasons 
      : ["❌ النموذج لم يجد setup صالح"];
    
    // إضافة أسباب تفصيلية بناءً على التحليل
    const detailedReasons: string[] = [...modelReasons];
    
    // فحص سحب السيولة
    const h1Sweep = r.liquidityPurge?.h1Sweep?.occurred === true;
    const m5Sweep = r.liquidityPurge?.m5InternalSweep?.occurred === true;
    
    if (!h1Sweep && !m5Sweep) {
      detailedReasons.push("❌ لم يحدث سحب سيولة على H1 أو M5");
    }
    
    // فحص MSS
    const mssAfterSweep = r.m5Analysis?.mssOccurredAfterSweep === true;
    if (!mssAfterSweep) {
      detailedReasons.push("❌ لم يحدث MSS/CHoCH بعد سحب السيولة");
    }
    
    // فحص Displacement
    const displacement = r.m5Analysis?.displacement || "WEAK";
    if (displacement === "WEAK") {
      detailedReasons.push("❌ الإزاحة السعرية ضعيفة (WEAK)");
    }
    
    // فحص Score و Confidence
    if (r.score < VALIDATION_OPTIONS.minScore) {
      detailedReasons.push(`❌ التقييم منخفض (${r.score}/10) - المطلوب >= ${VALIDATION_OPTIONS.minScore}`);
    }
    
    if (r.confidence < VALIDATION_OPTIONS.minConfidence) {
      detailedReasons.push(`❌ الثقة منخفضة (${r.confidence}%) - المطلوب >= ${VALIDATION_OPTIONS.minConfidence}%`);
    }
    
    return createNoTradeResult(detailedReasons, r);
  }
  
  const t = r.suggestedTrade;
  const isBuy = String(t.type || "").includes("BUY");
  
  // 2. التحقق من Score و Confidence
  const scoreCheck = validateScoreAndConfidence(r);
  if (!scoreCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...scoreCheck.reasons], r);
  }
  
  // 3. التحقق من سحب السيولة
  const sweepCheck = validateLiquiditySweep(r);
  if (!sweepCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...sweepCheck.reasons], r);
  }
  allReasons.push(...sweepCheck.reasons);
  
  // 4. التحقق من توافق نوع السحب
  const sweepMatchCheck = validateSweepTypeMatch(r, isBuy);
  if (!sweepMatchCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...sweepMatchCheck.reasons], r);
  }
  
  // 5. التحقق من إذن H1
  const h1Check = validateH1Permission(r, isBuy);
  if (!h1Check.isValid) {
    return createNoTradeResult([...r.reasons, ...h1Check.reasons], r);
  }
  
  // 6. التحقق من الموقع السعري ✅
  const locationCheck = validatePriceLocation(r, isBuy);
  if (!locationCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...locationCheck.reasons], r);
  }
  
  // 7. التحقق من MSS ✅
  const mssCheck = validateMSSAfterSweep(r);
  if (!mssCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...mssCheck.reasons], r);
  }
  
  // 8. التحقق من Displacement
  const dispCheck = validateDisplacement(r);
  if (!dispCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...dispCheck.reasons], r);
  }
  
  // 9. التحقق من PD Array
  const pdCheck = validatePDArray(r);
  if (!pdCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...pdCheck.reasons], r);
  }
  
  // 10. التحقق من التلاقيات
  const confCheck = validateConfluences(r);
  if (!confCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...confCheck.reasons], r);
  }
  
  // 11. التحقق من بيانات الصفقة
  const tradeCheck = validateTradeData(t, currentPrice, isBuy);
  if (!tradeCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...tradeCheck.reasons], r);
  }
  
  // ✅ تقريب الأرقام النهائية
  t.entry = round2(toNumber(t.entry));
  t.sl = round2(toNumber(t.sl));
  t.tp1 = round2(toNumber(t.tp1));
  t.tp2 = round2(toNumber(t.tp2));
  t.tp3 = round2(toNumber(t.tp3));
  
  // حساب نسب RR
  const risk = Math.abs(t.entry - t.sl);
  const rr1 = Math.abs(t.tp1 - t.entry) / risk;
  const rr2 = Math.abs(t.tp2 - t.entry) / risk;
  const rr3 = Math.abs(t.tp3 - t.entry) / risk;
  t.rrRatio = `TP1: 1:${rr1.toFixed(1)} | TP2: 1:${rr2.toFixed(1)} | TP3: 1:${rr3.toFixed(1)}`;
  
  // تقليل التقييم إذا كان المصدر M5 فقط
  if (r.liquidityPurge?.primarySource === "M5") {
    r.score = Math.max(r.score - 0.5, 0);
    r.confidence = Math.max(r.confidence - 5, 0);
    r.reasons = [...r.reasons, "⚠️ الاعتماد على سحب M5 فقط (مخاطرة أعلى قليلاً)"];
  }
  
  // إضافة التحذيرات
  r.reasons = [...r.reasons, ...allReasons.filter(r => r.startsWith("⚠️"))];
  
  return r as ICTAnalysis;
}

// ===================== API Call Helper =====================
async function callAIChat(payload: any): Promise<{ content: string }> {
  console.log("🔌 Connecting to AI API...");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🤖 Model: ${MODEL}`);
  console.log(`🔑 API Key: ${API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT SET'}`);
  
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: payload.messages,
      max_tokens: payload.max_tokens || 2000,
      temperature: payload.temperature || 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(`❌ API Error: ${response.status} - ${errorText}`);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  console.log("✅ AI Response received");
  return {
    content: data.choices?.[0]?.message?.content || "{}"
  };
}

// ===================== Multi-Timeframe Analysis =====================
export const analyzeMultiTimeframe = async (
  h1Image: string,
  m5Image: string,
  currentPrice: number
): Promise<ICTAnalysis> => {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("🔍 بدء التحليل متعدد الأطر الزمنية");
  console.log(`💰 السعر الحالي: ${currentPrice}`);
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  const cleanH1 = h1Image.replace(/^data:image\/\w+;base64,/, "");
  const cleanM5 = m5Image.replace(/^data:image\/\w+;base64,/, "");

  const userPrompt = `${systemInstruction}

═══════════════════════════════════════════════════════════════
📌 مدخلات التحليل
═══════════════════════════════════════════════════════════════
- الزوج: XAUUSD
- السعر الحالي: ${currentPrice}

الصورة 1: H1 (السياق الأساسي)
الصورة 2: M5 (الدخول + السيولة الداخلية)

🔍 تعليمات مهمة جداً:
1. انظر بعناية شديدة للشموع الأخيرة (آخر 10-20 شمعة)
2. ابحث عن أي قمة أو قاع تم كسره مع ذيل طويل
3. حتى لو كان الكسر صغير (5-20 نقطة) فهو sweep
4. تحقق من وجود ذيول طويلة (wicks) عند القمم والقيعان
5. إذا رأيت ذيل طويل عند قمة/قاع = هذا sweep محتمل

⚠️ تذكر:
1. سحب السيولة إلزامي (H1 أولاً، M5 بديل)
2. MSS إلزامي بعد السحب (mssOccurredAfterSweep = true)
3. الدخول من FVG أو OB فقط
4. BUY في Discount فقط، SELL في Premium فقط
5. 3 أهداف (TP1, TP2, TP3) بنسب RR متصاعدة

⚠️ إذا لم تجد sweep واضح، اشرح لماذا في reasoning

الرد JSON فقط وبالعربية فقط.
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
      temperature: 0.2,
      max_tokens: 2000
    });

    console.log("\n📊 نتيجة التحليل من النموذج:");
    const parsed = safeParseJson(data.content);
    console.log(`   القرار: ${parsed.decision || 'غير محدد'}`);
    console.log(`   التقييم: ${parsed.score || 0}/10`);
    console.log(`   الثقة: ${parsed.confidence || 0}%`);
    console.log(`   الاتجاه: ${parsed.sentiment || 'غير محدد'}`);
    
    // ⚠️ تحذير إذا كان النموذج ليس vision model
    if (!MODEL.toLowerCase().includes('vision') && !MODEL.toLowerCase().includes('llava')) {
      console.log(`\n⚠️ تحذير: النموذج ${MODEL} قد لا يدعم تحليل الصور بشكل جيد`);
      console.log("   يُنصح باستخدام: llama3.2-vision أو llava");
    }
    if (parsed.h1Analysis) {
      console.log("\n📈 تحليل H1:");
      console.log(`   الاتجاه: ${parsed.h1Analysis.bias || 'غير محدد'}`);
      console.log(`   سماح شراء: ${parsed.h1Analysis.allowBuy ? '✅' : '❌'}`);
      console.log(`   سماح بيع: ${parsed.h1Analysis.allowSell ? '✅' : '❌'}`);
    }
    
    if (parsed.m5Analysis) {
      console.log("\n📉 تحليل M5:");
      console.log(`   هيكل السوق: ${parsed.m5Analysis.marketStructure || 'غير محدد'}`);
      console.log(`   MSS بعد السحب: ${parsed.m5Analysis.mssOccurredAfterSweep ? '✅' : '❌'}`);
      console.log(`   الإزاحة: ${parsed.m5Analysis.displacement || 'غير محدد'}`);
      console.log(`   PD Array: ${parsed.m5Analysis.pdArray || 'غير محدد'}`);
    }
    
    if (parsed.liquidityPurge) {
      console.log("\n💧 فحص سحب السيولة:");
      console.log(`   H1 Sweep: ${parsed.liquidityPurge.h1Sweep?.occurred ? '✅' : '❌'} (${parsed.liquidityPurge.h1Sweep?.type || 'NONE'})`);
      console.log(`   M5 Sweep: ${parsed.liquidityPurge.m5InternalSweep?.occurred ? '✅' : '❌'} (${parsed.liquidityPurge.m5InternalSweep?.type || 'NONE'})`);
      console.log(`   المصدر الأساسي: ${parsed.liquidityPurge.primarySource || 'NONE'}`);
      
      if (parsed.liquidityPurge.h1Sweep?.evidence) {
        const ev = parsed.liquidityPurge.h1Sweep.evidence;
        console.log(`   H1 Evidence: wickReject=${ev.wickRejection ? '✅' : '❌'}, closedBack=${ev.closedBackInside ? '✅' : '❌'}`);
      }
      
      if (parsed.liquidityPurge.m5InternalSweep?.evidence) {
        const ev = parsed.liquidityPurge.m5InternalSweep.evidence;
        console.log(`   M5 Evidence: wickReject=${ev.wickRejection ? '✅' : '❌'}, wickSize=${ev.wickSize || 'N/A'}, closedBack=${ev.closedBackInside ? '✅' : '❌'}, candlesAgo=${ev.candlesAgo || 'N/A'}`);
      }
    }
    
    console.log("\n🔍 بدء التحقق من الصحة...");
    const validated = validateAndFix(parsed, currentPrice);
    
    console.log("\n✅ نتيجة التحقق النهائية:");
    console.log(`   القرار النهائي: ${validated.decision}`);
    console.log(`   التقييم النهائي: ${validated.score}/10`);
    console.log(`   الثقة النهائية: ${validated.confidence}%`);
    
    if (validated.reasons && validated.reasons.length > 0) {
      console.log("\n📝 الأسباب التفصيلية:");
      validated.reasons.forEach((reason, i) => {
        console.log(`   ${i + 1}. ${reason}`);
      });
    }
    
    if (validated.decision === "NO_TRADE") {
      console.log("\n🚫 ملخص أسباب عدم التداول:");
      const summary = validated.reasons.filter(r => r.startsWith("❌")).slice(0, 3);
      summary.forEach(s => console.log(`   • ${s}`));
    }
    
    console.log("\n═══════════════════════════════════════════════════════════════\n");
    
    return validated;
  } catch (error) {
    console.error("\n❌ خطأ في التحليل:", error);
    console.error("═══════════════════════════════════════════════════════════════\n");
    return createNoTradeResult(["❌ خطأ في الاتصال بالنموذج"]);
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
            text: `أنت مدير مخاطر ICT محترف.
راقب علامات الانعكاس والسيولة فقط.
الصفقة: ${trade.symbol} | دخول: ${trade.entryPrice} | السعر الحالي: ${currentPrice}

رد JSON فقط:
{
  "status": "HOLD" | "MOVE_TO_BE" | "PARTIAL_CLOSE" | "CLOSE_NOW",
  "reversalProbability": 0-100,
  "message": "شرح بالعربية",
  "actionRequired": "الإجراء بالعربية"
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${cleanBase64}` } }
        ]
      }],
      temperature: 0.25,
      max_tokens: 700
    });

    return safeParseJson(data.content) as ManagementAdvice;
  } catch {
    return {
      status: "HOLD",
      reversalProbability: 50,
      message: "خطأ في التحليل",
      actionRequired: "أعد المحاولة"
    };
  }
};

// ===================== Chat =====================
export const chatWithAI = async (
  message: string,
  analysis: ICTAnalysis | null,
  currentPrice: number
): Promise<string> => {
  const context = analysis
    ? `القرار: ${analysis.decision} | الاتجاه: ${analysis.sentiment} | التقييم: ${analysis.score}/10`
    : "لا يوجد تحليل حالي";

  try {
    const data = await callAIChat({
      messages: [{
        role: "user",
        content: `أنت مساعد تداول ICT بالعربية.
السعر الحالي: ${currentPrice}
${context}

سؤال: ${message}

أجب باختصار وبالعربية.`
      }],
      temperature: 0.45,
      max_tokens: 400
    });

    return data.content || "عذراً، لم أتمكن من الرد.";
  } catch {
    return "خطأ في الاتصال.";
  }
};

// ===================== Follow Up Trade =====================
export const followUpTrade = async (
  h1Image: string,
  m5Image: string,
  originalAnalysis: ICTAnalysis,
  currentPrice: number,
  tradeTimestamp: Date
): Promise<{ advice: string; shouldExit: boolean; reason: string }> => {
  try {
    const cleanH1 = h1Image.replace(/^data:image\/\w+;base64,/, "");
    const cleanM5 = m5Image.replace(/^data:image\/\w+;base64,/, "");

    const now = new Date();
    const minutesPassed = Math.floor((now.getTime() - tradeTimestamp.getTime()) / 60000);
    const timePassedStr = minutesPassed >= 60
      ? `${Math.floor(minutesPassed / 60)} ساعة و ${minutesPassed % 60} دقيقة`
      : `${minutesPassed} دقيقة`;

    const t = originalAnalysis.suggestedTrade;
    const entry = t?.entry || 0;
    const sl = t?.sl || 0;
    const tp1 = t?.tp1 || 0;
    const tp2 = t?.tp2 || 0;
    const tp3 = t?.tp3 || 0;
    const isBuy = t?.type?.includes('BUY') || false;

    let tradeStatus = 'لم تُفعّل بعد';
    if (isBuy ? currentPrice <= entry : currentPrice >= entry) {
      tradeStatus = 'تم التفعيل ✅';
    }

    const data = await callAIChat({
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `أنت مدير مخاطر ICT. راجع الصفقة:

⏱️ الوقت المنقضي: ${timePassedStr}
📊 حالة الصفقة: ${tradeStatus}
💰 السعر الحالي: ${currentPrice}
📈 النوع: ${isBuy ? 'شراء' : 'بيع'}
🎯 Entry: ${entry} | SL: ${sl}
✅ TP1: ${tp1} | TP2: ${tp2} | TP3: ${tp3}

رد JSON:
{
  "shouldExit": true | false,
  "reason": "شرح بالعربية",
  "advice": "نصيحة مختصرة",
  "riskLevel": "منخفض" | "متوسط" | "مرتفع"
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${cleanH1}` } },
          { type: "image_url", image_url: { url: `data:image/png;base64,${cleanM5}` } }
        ]
      }],
      temperature: 0.2,
      max_tokens: 500
    });

    const parsed = safeParseJson(data.content);
    const emoji = parsed.shouldExit ? '⚠️' : '✅';
    const action = parsed.shouldExit ? 'اخرج من الصفقة' : 'استمر';

    return {
      advice: `${emoji} ${action}\n📊 ${tradeStatus}\n⏱️ ${timePassedStr}\n⚡ ${parsed.riskLevel || 'غير محدد'}\n📝 ${parsed.reason || ''}`,
      shouldExit: parsed.shouldExit || false,
      reason: parsed.reason || "لا يوجد سبب"
    };
  } catch (error) {
    console.error('Follow-up Error:', error);
    return {
      advice: '❌ خطأ في التحليل',
      shouldExit: false,
      reason: 'خطأ في الاتصال'
    };
  }
};
