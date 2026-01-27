// services/aiService.ts
// ✅ نسخة ICT مصححة بالكامل - خالية من الأخطاء المنطقية
// ✅ تحليل متكامل: H1 للسياق + M5 للدخول
// ✅ سحب السيولة إلزامي + معايير صارمة

import { ICTAnalysis, ManagementAdvice } from "../types";

// ===================== Environment Variables =====================
declare const process: any;

// ===================== API Config =====================
// ⚠️ يقرأ من OLLAMA_API_KEY و OLLAMA_BASE_URL في Railway
const API_KEY = process?.env?.OLLAMA_API_KEY || process?.env?.AI_API_KEY || "YOUR_API_KEY";
const BASE_URL = process?.env?.OLLAMA_BASE_URL || process?.env?.AI_BASE_URL || "https://api.openai.com";
const MODEL = process?.env?.OLLAMA_MODEL || process?.env?.AI_MODEL || "llama3.2-vision";

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
const VALIDATION_OPTIONS = {
  maxDistancePercent: 0.015,  // 1.5% حد أقصى للمسافة (كان 1.2%)
  minRR: 1.5,                 // نسبة مخاطرة/عائد أدنى (كان 1.8)
  minScore: 5.5,              // تقييم أدنى (كان 6.5)
  minConfidence: 60,          // ثقة أدنى (كان 65)
  minConfluences: 2,          // تلاقيات أدنى (كان 3)
  maxM5CandlesAgo: 20         // أقصى عدد شموع لسحب M5 (كان 15)
};

// ===================== ICT System Instruction =====================
export const systemInstruction = `
أنت "ICT Professional Analyzer" متخصص XAUUSD - تحليل صارم مثل متداول مؤسسي.
⚠️ يجب أن تكون جميع النصوص بالعربية فقط.
⚠️ يجب أن ترد بصيغة JSON فقط بدون أي نص خارجي.

🔴 المبدأ الأساسي: لا تعطي صفقة إلا بعد اكتمال Setup ICT مؤسسي كامل

═══════════════════════════════════════════════════════════════
(1) الشرط الأول - سحب السيولة إلزامي (NO EXCEPTIONS)
═══════════════════════════════════════════════════════════════
❌ بدون Sweep = NO_TRADE مباشرة

🔍 كيف تتعرف على Sweep (سحب السيولة):

✅ علامات BSL Sweep (Buy Side Liquidity - سحب سيولة الشراء):
- السعر يكسر قمة واضحة (High سابق)
- يتجاوز القمة بـ 5-20 نقطة
- ذيل علوي طويل (upper wick) يظهر الرفض
- الشمعة تغلق تحت القمة المكسورة (عودة داخل النطاق)
- يحدث انعكاس هبوطي بعدها مباشرة
→ هذا يسمح بالبيع (SELL)

✅ علامات SSL Sweep (Sell Side Liquidity - سحب سيولة البيع):
- السعر يكسر قاع واضح (Low سابق)
- يتجاوز القاع بـ 5-20 نقطة
- ذيل سفلي طويل (lower wick) يظهر الرفض
- الشمعة تغلق فوق القاع المكسور (عودة داخل النطاق)
- يحدث انعكاس صعودي بعدها مباشرة
→ هذا يسمح بالشراء (BUY)

⚠️ ابحث بعناية في الصورة:
- راجع آخر 10-20 شمعة على H1
- راجع آخر 30-50 شمعة على M5
- ابحث عن القمم والقيعان الواضحة
- تحقق من وجود ذيول طويلة عند كسرها
- تأكد من عودة السعر داخل النطاق

🔴 أولوية H1:
- SSL Sweep على H1 → يسمح بالشراء
- BSL Sweep على H1 → يسمح بالبيع

🟡 بديل M5 (فقط إذا لم يحدث على H1):
- SSL Sweep على M5 (محلي) → يسمح بالشراء
- BSL Sweep على M5 (محلي) → يسمح بالبيع
- يجب أن يكون حديث (< 15 شموع)

⚠️ إذا لم تجد أي Sweep واضح على H1 أو M5:
- ضع occurred: false
- ضع type: "NONE"
- القرار النهائي: NO_TRADE

═══════════════════════════════════════════════════════════════
(2) الشرط الثاني - MSS إلزامي بعد السحب (CRITICAL)
═══════════════════════════════════════════════════════════════
🔴 هذا أهم شرط - لا تدخل بدون MSS

❌ ممنوع الدخول من ارتداد السيولة فقط
✅ يجب كسر هيكل السوق (MSS) بعد السحب

للشراء:
- يجب كسر آخر Lower High
- إغلاق واضح فوقه
- تأكيد تغيير الاتجاه

للبيع:
- يجب كسر آخر Higher Low
- إغلاق واضح تحته
- تأكيد تغيير الاتجاه

⚠️ CHoCH مقبول أيضاً (تغيير طبيعة السوق)
❌ BOS فقط = غير كافٍ
❌ لم يحدث MSS بعد السحب = NO_TRADE

═══════════════════════════════════════════════════════════════
(3) الشرط الثالث - Displacement حقيقي فقط
═══════════════════════════════════════════════════════════════
❌ ارفض أي حركة بطيئة أو متذبذبة

المقبول فقط:
✅ شمعة أو أكثر بجسم كبير
✅ إغلاق قوي
✅ خلق FVG واضح
✅ حركة سريعة في اتجاه واحد

❌ WEAK Displacement = NO_TRADE

═══════════════════════════════════════════════════════════════
(4) الشرط الرابع - الدخول فقط من PD Array
═══════════════════════════════════════════════════════════════
❌ لا تدخل من مستوى أفقي فقط

الدخول يجب أن يكون من:
✅ FVG (Fair Value Gap)
✅ OB (Order Block) واضح

❌ ارتداد من سعر فقط = مرفوض

═══════════════════════════════════════════════════════════════
(5) الشرط الخامس - الموقع السعري
═══════════════════════════════════════════════════════════════
❌ لا شراء في Premium
❌ لا بيع في Discount

✅ BUY → Discount فقط
✅ SELL → Premium فقط
❌ MID → NO_TRADE

═══════════════════════════════════════════════════════════════
(6) صيغة JSON الإلزامية
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
    "liquiditySweep": "وصف السحب على H1 أو 'لم يحدث'",
    "nearestBSL": "وصف/سعر",
    "nearestSSL": "وصف/سعر"
  },
  "m5Analysis": {
    "marketStructure": "MSS" | "CHoCH" | "BOS" | "CONSOLIDATION",
    "mssOccurredAfterSweep": true | false,
    "displacement": "STRONG" | "MODERATE" | "WEAK",
    "pdArray": "FVG" | "OB" | "NONE",
    "readyForEntry": true | false
  },
  "liquidityPurge": {
    "h1Sweep": {
      "occurred": true | false,
      "type": "BSL" | "SSL" | "NONE",
      "levelName": "اسم المستوى أو 'لا يوجد'",
      "evidence": {
        "wickRejection": true | false,
        "closedBackInside": true | false,
        "reversedWithin3Candles": true | false
      }
    },
    "m5InternalSweep": {
      "occurred": true | false,
      "type": "BSL" | "SSL" | "NONE",
      "levelName": "اسم المستوى المحلي أو 'لا يوجد'",
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
  "confluences": ["عامل 1", "عامل 2", "عامل 3"],
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
    "cancelConditions": ["شرط 1", "شرط 2"]
  }
}

🔴 تذكر: إذا لم تجد Sweep واضح = NO_TRADE فوراً
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

// 1. التحقق من سحب السيولة
function validateLiquiditySweep(r: any): ValidationResult {
  const reasons: string[] = [];
  
  const h1Sweep = r.liquidityPurge?.h1Sweep?.occurred === true;
  const m5Sweep = r.liquidityPurge?.m5InternalSweep?.occurred === true;
  
  if (!h1Sweep && !m5Sweep) {
    reasons.push("❌ لم يحدث سحب سيولة على H1 أو M5 - الشرط الأول غير متوفر");
    return { isValid: false, reasons };
  }
  
  // التحقق من Evidence لـ H1
  if (h1Sweep) {
    const h1Evidence = r.liquidityPurge?.h1Sweep?.evidence || {};
    if (!h1Evidence.wickRejection && !h1Evidence.closedBackInside) {
      reasons.push("⚠️ سحب H1 بدون دليل قوي (لا رفض ولا عودة داخل النطاق)");
    }
  }
  
  // التحقق من M5 إذا كان المصدر الأساسي
  if (!h1Sweep && m5Sweep) {
    const m5Evidence = r.liquidityPurge?.m5InternalSweep?.evidence || {};
    const isRecent = r.liquidityPurge?.m5InternalSweep?.isRecent === true;
    const candlesAgo = Number(m5Evidence.candlesAgo) || 999;
    const wickSize = m5Evidence.wickSize;
    const closedBackInside = m5Evidence.closedBackInside === true;
    
    if (!isRecent || candlesAgo > VALIDATION_OPTIONS.maxM5CandlesAgo) {
      reasons.push(`❌ سحب M5 قديم (${candlesAgo} شموع) - يجب < ${VALIDATION_OPTIONS.maxM5CandlesAgo}`);
      return { isValid: false, reasons };
    }
    
    const hasStrongWick = wickSize === "LARGE" || (wickSize === "MEDIUM" && closedBackInside);
    if (!hasStrongWick) {
      reasons.push("❌ سحب M5 بدون رفض قوي - يجب ذيول واضحة");
      return { isValid: false, reasons };
    }
  }
  
  return { isValid: true, reasons };
}

// 2. التحقق من توافق نوع السحب مع الصفقة
function validateSweepTypeMatch(r: any, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  
  const h1Sweep = r.liquidityPurge?.h1Sweep?.occurred === true;
  const m5Sweep = r.liquidityPurge?.m5InternalSweep?.occurred === true;
  
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
  
  // التحقق من التوافق
  if (isBuy && sweepType !== "SSL") {
    reasons.push(`❌ شراء يتطلب SSL Sweep - الموجود: ${sweepType}`);
    return { isValid: false, reasons };
  }
  
  if (!isBuy && sweepType !== "BSL") {
    reasons.push(`❌ بيع يتطلب BSL Sweep - الموجود: ${sweepType}`);
    return { isValid: false, reasons };
  }
  
  return { isValid: true, reasons };
}

// 3. التحقق من H1 allowBuy/allowSell
function validateH1Permission(r: any, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  const h1 = r.h1Analysis || {};
  const primarySource = r.liquidityPurge?.primarySource || "NONE";
  
  // التحقق فقط إذا كان المصدر H1
  if (primarySource === "H1") {
    if (isBuy && h1.allowBuy !== true) {
      reasons.push("❌ سياق H1 لا يسمح بالشراء");
      return { isValid: false, reasons };
    }
    if (!isBuy && h1.allowSell !== true) {
      reasons.push("❌ سياق H1 لا يسمح بالبيع");
      return { isValid: false, reasons };
    }
  }
  
  // إذا كان المصدر M5، تحقق من عدم وجود اتجاه معاكس قوي على H1
  if (primarySource === "M5") {
    const h1Bias = h1.bias || "NEUTRAL";
    if (isBuy && h1Bias === "BEARISH") {
      reasons.push("❌ H1 هابط بقوة - لا يمكن الشراء بناءً على M5 فقط");
      return { isValid: false, reasons };
    }
    if (!isBuy && h1Bias === "BULLISH") {
      reasons.push("❌ H1 صاعد بقوة - لا يمكن البيع بناءً على M5 فقط");
      return { isValid: false, reasons };
    }
  }
  
  return { isValid: true, reasons };
}

// 4. التحقق من الموقع السعري ✅ إصلاح مهم
function validatePriceLocation(r: any, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  const priceLocation = r.priceLocation || "MID";
  
  // ✅ تخفيف: MID يخفض Score بدلاً من الرفض الفوري
  if (priceLocation === "MID") {
    r.score = Math.max((r.score || 0) - 1.0, 0);
    r.confidence = Math.max((r.confidence || 0) - 8, 0);
    reasons.push("⚠️ الموقع السعري في المنتصف (MID) - تم تخفيض التقييم");
  }
  
  // ✅ إصلاح: التحقق من توافق الموقع مع نوع الصفقة
  if (isBuy && priceLocation === "PREMIUM") {
    reasons.push("❌ لا يمكن الشراء في منطقة Premium - يجب الانتظار للـ Discount");
    return { isValid: false, reasons };
  }
  
  if (!isBuy && priceLocation === "DISCOUNT") {
    reasons.push("❌ لا يمكن البيع في منطقة Discount - يجب الانتظار للـ Premium");
    return { isValid: false, reasons };
  }
  
  return { isValid: true, reasons };
}

// 5. التحقق من MSS بعد السحب ✅ إصلاح مهم
function validateMSSAfterSweep(r: any): ValidationResult {
  const reasons: string[] = [];
  const m5 = r.m5Analysis || {};
  
  const marketStructure = m5.marketStructure || "CONSOLIDATION";
  const mssOccurredAfterSweep = m5.mssOccurredAfterSweep === true;
  
  // ✅ إصلاح: استخدام mssOccurredAfterSweep
  const hasValidStructure = marketStructure === "MSS" || marketStructure === "CHoCH";
  
  if (!hasValidStructure) {
    reasons.push(`❌ لم يحدث MSS أو CHoCH - الهيكل الحالي: ${marketStructure}`);
    return { isValid: false, reasons };
  }
  
  if (!mssOccurredAfterSweep) {
    reasons.push("❌ MSS لم يحدث بعد سحب السيولة - Setup غير مكتمل");
    return { isValid: false, reasons };
  }
  
  return { isValid: true, reasons };
}

// 6. التحقق من Displacement
function validateDisplacement(r: any): ValidationResult {
  const reasons: string[] = [];
  const m5 = r.m5Analysis || {};
  const displacement = m5.displacement || "WEAK";
  
  if (displacement === "WEAK") {
    reasons.push("❌ الإزاحة السعرية ضعيفة (WEAK) - لا حركة مؤسسية");
    return { isValid: false, reasons };
  }
  
  // ✅ قبول MODERATE أيضاً (ليس فقط STRONG)
  if (displacement === "MODERATE") {
    reasons.push("⚠️ الإزاحة السعرية متوسطة (MODERATE) - مقبول لكن ليس مثالي");
  }
  
  return { isValid: true, reasons };
}

// 7. التحقق من PD Array
function validatePDArray(r: any): ValidationResult {
  const reasons: string[] = [];
  const m5 = r.m5Analysis || {};
  const pdArray = m5.pdArray || "NONE";
  
  // التحقق من وجود رفض قوي كبديل
  const h1WickReject = r.liquidityPurge?.h1Sweep?.evidence?.wickRejection === true;
  const m5WickReject = r.liquidityPurge?.m5InternalSweep?.evidence?.wickRejection === true;
  const hasStrongReject = h1WickReject || m5WickReject;
  
  // ✅ تخفيف: تحذير بدلاً من رفض إذا كان هناك رفض قوي
  if (pdArray === "NONE") {
    if (hasStrongReject) {
      reasons.push("⚠️ لا يوجد FVG أو OB واضح - لكن يوجد رفض قوي (مقبول)");
    } else {
      reasons.push("❌ لا يوجد FVG أو OB للدخول - ولا رفض قوي");
      return { isValid: false, reasons };
    }
  }
  
  return { isValid: true, reasons };
}

// 8. التحقق من التلاقيات
function validateConfluences(r: any): ValidationResult {
  const reasons: string[] = [];
  const confluences = Array.isArray(r.confluences) ? r.confluences : [];
  
  if (confluences.length < VALIDATION_OPTIONS.minConfluences) {
    reasons.push(`❌ التلاقيات غير كافية (${confluences.length}/${VALIDATION_OPTIONS.minConfluences})`);
    return { isValid: false, reasons };
  }
  
  return { isValid: true, reasons };
}

// 9. التحقق من Score و Confidence
function validateScoreAndConfidence(r: any): ValidationResult {
  const reasons: string[] = [];
  
  const score = Number(r.score) || 0;
  const confidence = Number(r.confidence) || 0;
  
  if (score < VALIDATION_OPTIONS.minScore) {
    reasons.push(`❌ التقييم منخفض (${score}/10) - المطلوب >= ${VALIDATION_OPTIONS.minScore}`);
    return { isValid: false, reasons };
  }
  
  if (confidence < VALIDATION_OPTIONS.minConfidence) {
    reasons.push(`❌ الثقة منخفضة (${confidence}%) - المطلوب >= ${VALIDATION_OPTIONS.minConfidence}%`);
    return { isValid: false, reasons };
  }
  
  return { isValid: true, reasons };
}

// 10. التحقق من بيانات الصفقة
function validateTradeData(t: any, currentPrice: number, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  
  // التحقق من نوع الصفقة
  const allowedTypes = ["BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"];
  if (!allowedTypes.includes(String(t.type))) {
    reasons.push(`❌ نوع الصفقة غير مدعوم: ${t.type}`);
    return { isValid: false, reasons };
  }
  
  // تحويل الأرقام
  const entry = toNumber(t.entry);
  const sl = toNumber(t.sl);
  const tp1 = toNumber(t.tp1);
  const tp2 = toNumber(t.tp2);
  const tp3 = toNumber(t.tp3);
  
  if ([entry, sl, tp1, tp2, tp3].some(isNaN)) {
    reasons.push("❌ قيم الصفقة غير صالحة (entry/sl/tp)");
    return { isValid: false, reasons };
  }
  
  // التحقق من المسافة
  const dist = Math.abs(entry - currentPrice);
  const maxDist = currentPrice * VALIDATION_OPTIONS.maxDistancePercent;
  if (dist > maxDist) {
    const distPercent = ((dist / currentPrice) * 100).toFixed(2);
    reasons.push(`❌ الدخول بعيد (${distPercent}%) - المسموح <= ${(VALIDATION_OPTIONS.maxDistancePercent * 100).toFixed(1)}%`);
    return { isValid: false, reasons };
  }
  
  // التحقق من ترتيب المستويات
  if (isBuy) {
    if (!(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
      reasons.push("❌ ترتيب مستويات الشراء خاطئ (SL < Entry < TP1 < TP2 < TP3)");
      return { isValid: false, reasons };
    }
  } else {
    if (!(tp3 < tp2 && tp2 < tp1 && tp1 < entry && entry < sl)) {
      reasons.push("❌ ترتيب مستويات البيع خاطئ (TP3 < TP2 < TP1 < Entry < SL)");
      return { isValid: false, reasons };
    }
  }
  
  // التحقق من RR
  const risk = Math.abs(entry - sl);
  const reward1 = Math.abs(tp1 - entry);
  const rr1 = reward1 / (risk || 0.0001);
  
  if (rr1 < VALIDATION_OPTIONS.minRR) {
    reasons.push(`❌ RR للهدف الأول ضعيف (${rr1.toFixed(2)}) - المطلوب >= ${VALIDATION_OPTIONS.minRR}`);
    return { isValid: false, reasons };
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
    return createNoTradeResult(["❌ لا يوجد إعداد صفقة من النموذج"], r);
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

⚠️ تذكر:
1. سحب السيولة إلزامي (H1 أولاً، M5 بديل)
2. MSS إلزامي بعد السحب (mssOccurredAfterSweep = true)
3. الدخول من FVG أو OB فقط
4. BUY في Discount فقط، SELL في Premium فقط
5. 3 أهداف (TP1, TP2, TP3) بنسب RR متصاعدة

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
      console.log("\n📝 الأسباب:");
      validated.reasons.forEach((reason, i) => {
        console.log(`   ${i + 1}. ${reason}`);
      });
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
