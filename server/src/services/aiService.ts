// services/aiService.ts
// ✅ نسخة ICT متخصصة لتحليل الصورتين (H1 + M5) فقط
// ✅ تحليل متكامل: H1 للسياق + M5 للدخول
// ✅ سحب السيولة إلزامي + معايير متوازنة

import { ICTAnalysis, ManagementAdvice } from "../types";

// ===================== Ollama Cloud Config =====================
const API_KEY = "9a1046cdc1284e0d904876669be18a12.PgNkAnhRaT7G-qQXCp-8x3Q1"; // ⚠️ لا تتركه هنا في الإنتاج
const BASE_URL = "https://ollama.com";
const MODEL = "gemma3:27b";

// ===================== Helpers =====================
const round2 = (n: number) => Math.round(n * 100) / 100;

const cleanJsonString = (str: string): string => {
  let cleaned = (str || "").trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
  return cleaned.trim();
};

// استخراج JSON حتى لو النموذج كتب كلام قبل/بعد
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

// ===================== ICT System Instruction (STRICT - Professional ICT Trading) =====================
// 🔴 لا صفقة إلا بعد اكتمال Setup مؤسسي كامل
// 🔴 MSS إلزامي بعد سحب السيولة
// 🔴 الدخول فقط من PD Array
export const systemInstruction = `
أنت "ICT Professional Analyzer" متخصص XAUUSD - تحليل صارم مثل متداول مؤسسي.
⚠️ يجب أن تكون جميع النصوص بالعربية فقط.
⚠️ يجب أن ترد بصيغة JSON فقط بدون أي نص خارجي.

🔴 المبدأ الأساسي: لا تعطي صفقة إلا بعد اكتمال Setup ICT مؤسسي كامل

═══════════════════════════════════════════════════════════════
(1) الشرط الأول - سحب السيولة إلزامي (NO EXCEPTIONS)
═══════════════════════════════════════════════════════════════
❌ بدون Sweep = NO_TRADE مباشرة

تعريف Sweep الصحيح:
✅ كسر قمة/قاع واضح
✅ ذيل طويل (50%+ من حجم الشمعة)
✅ عودة السعر داخل النطاق خلال 1-3 شموع

🔴 أولوية H1:
- SSL Sweep على H1 → يسمح بالشراء
- BSL Sweep على H1 → يسمح بالبيع

🟡 بديل M5 (فقط إذا لم يحدث على H1):
- SSL Sweep على M5 (محلي) → يسمح بالشراء
- BSL Sweep على M5 (محلي) → يسمح بالبيع
- يجب أن يكون حديث (< 15 شموع)

⚠️ إذا لم يحدث Sweep على H1 ولا M5 → NO_TRADE

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
❌ تذبذب = NO_TRADE
❌ شموع صغيرة = NO_TRADE

═══════════════════════════════════════════════════════════════
(4) الشرط الرابع - الدخول فقط من PD Array
═══════════════════════════════════════════════════════════════
❌ لا تدخل من مستوى أفقي فقط

الدخول يجب أن يكون من:
✅ FVG (Fair Value Gap)
✅ OB (Order Block) واضح

❌ ارتداد من سعر فقط = مرفوض
❌ دعم/مقاومة عادي = مرفوض
❌ Rejection بدون PD Array = مرفوض (إلا إذا كان قوي جداً)

═══════════════════════════════════════════════════════════════
(5) الشرط الخامس - الموقع السعري
═══════════════════════════════════════════════════════════════
❌ لا شراء في Premium
❌ لا بيع في Discount

✅ BUY → Discount فقط
✅ SELL → Premium فقط
❌ MID → NO_TRADE

═══════════════════════════════════════════════════════════════
(6) المنطق النهائي للقرار
═══════════════════════════════════════════════════════════════
IF (Liquidity Sweep حدث)
AND (MSS حدث بعد السحب)
AND (Displacement ≠ WEAK)
AND (Entry من FVG أو OB)
AND (Price في Premium/Discount الصحيح)
THEN → PLACE_PENDING

ELSE → NO_TRADE

═══════════════════════════════════════════════════════════════
(7) عند NO_TRADE - لا تعطي أمل
═══════════════════════════════════════════════════════════════
❌ لا تقل "انتظر كسر مستوى X"
❌ لا تقل "ممكن لاحقاً"

✅ فقط اذكر ما الذي لم يكتمل:
مثال: "NO_TRADE: تم سحب السيولة لكن لم يحدث MSS بعد"
مثال: "NO_TRADE: حدث MSS لكن لا يوجد FVG للدخول"
مثال: "NO_TRADE: لم يحدث سحب سيولة أصلاً"

═══════════════════════════════════════════════════════════════
(8) شروط الصفقة (صارمة)
═══════════════════════════════════════════════════════════════
- score >= 6.5 ✅ (رفعنا من 5.5)
- confidence >= 65 ✅ (رفعنا من 60)
- RR >= 1.8 ✅ (رفعنا من 1.5)
- الدخول قريب من السعر الحالي (< 1.2% للذهب) ✅
- ترتيب SL/TP صحيح ✅
- التلاقيات >= 3 ✅ (رفعنا من 2)
- priceLocation: ممنوع MID ✅

═══════════════════════════════════════════════════════════════
(9) المطلوب منك
═══════════════════════════════════════════════════════════════
1. حلّل H1: هل حدث Sweep؟
2. حلّل M5: هل حدث MSS بعد السحب؟
3. تحقق من Displacement
4. تحقق من وجود FVG أو OB
5. تحقق من الموقع السعري
6. أعط قرار: PLACE_PENDING أو NO_TRADE
7. اذكر سبب واحد مؤسسي واضح

⚠️ اشتغل ببطء، ارفض كثير، ولا تعطي صفقة إلا بعد اكتمال Setup كامل

═══════════════════════════════════════════════════════════════
(10) صيغة JSON الإلزامية
═══════════════════════════════════════════════════════════════
{
  "decision": "PLACE_PENDING" | "NO_TRADE",
  "score": 0-10,
  "confidence": 0-100,
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bias": "وصف سياق H1 بالعربية",
  "h1Analysis": {
    "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
    "allowBuy": true | false,
    "allowSell": true | false,
    "liquiditySweep": "وصف السحب على H1 بالعربية",
    "nearestBSL": "وصف/سعر",
    "nearestSSL": "وصف/سعر"
  },
  "m5Analysis": {
    "marketStructure": "MSS" | "CHoCH" | "CONSOLIDATION",
    "displacement": "STRONG" | "MODERATE" | "WEAK",
    "pdArray": "FVG" | "OB" | "NONE",
    "readyForEntry": true | false,
    "mssOccurredAfterSweep": true | false
  },
  "priceLocation": "PREMIUM" | "DISCOUNT" | "MID",
  "liquidityPurge": {
    "h1Sweep": {
      "occurred": true | false,
      "type": "BSL" | "SSL" | "NONE",
      "levelName": "اسم المستوى بالعربية",
      "evidence": {
        "wickRejection": true | false,
        "closedBackInside": true | false,
        "reversedWithin3Candles": true | false
      }
    },
    "m5InternalSweep": {
      "occurred": true | false,
      "type": "BSL" | "SSL" | "NONE",
      "levelName": "اسم المستوى المحلي بالعربية",
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
  "drawOnLiquidity": {
    "direction": "BULLISH" | "BEARISH" | "NEUTRAL",
    "target": "وصف هدف السيولة بالعربية",
    "nearestBSL": "وصف بالعربية",
    "nearestSSL": "وصف بالعربية"
  },
  "confluences": ["عامل 1 بالعربية", "عامل 2 بالعربية"],
  "reasons": [
    "سبب بالعربية مع مستوى سعر وتوجيه واضح"
  ],
  "reasoning": "شرح بالعربية يفصل بين H1 (سياق) و M5 (دخول)",
  "suggestedTrade": {
    "type": "BUY_LIMIT" | "SELL_LIMIT" | "BUY_STOP" | "SELL_STOP",
    "entry": number,
    "sl": number,
    "tp1": number,
    "tp2": number,
    "tp3": number,
    "expiryMinutes": 60,
    "cancelConditions": ["شرط 1 بالعربية", "شرط 2 بالعربية"]
  }
}
`;
// ===================== STRICT Validator (صارم - متداول محترف) =====================
function validateAndFix(r: any, currentPrice: number): ICTAnalysis {
  // ✅ معايير صارمة - جودة عالية فقط
  const opts = {
    maxDistancePercent: 0.012, // 1.2% (أكثر صرامة)
    minRR: 1.8,                // 1.8 (رفعنا من 1.5)
    minScore: 6.5,             // 6.5 (رفعنا من 5.5)
    minConfidence: 65,         // 65% (رفعنا من 60)
    minConfluences: 3          // 3 تلاقيات (رفعنا من 2)
  };

  // Defaults
  r = r || {};
  r.reasons = Array.isArray(r.reasons) ? r.reasons : [];
  r.confluences = Array.isArray(r.confluences) ? r.confluences : [];
  r.score = Number.isFinite(r.score) ? r.score : 0;
  r.confidence = Number.isFinite(r.confidence) ? r.confidence : 0;

  // 1) يجب قرار + صفقة
  if (r.decision !== "PLACE_PENDING" || !r.suggestedTrade) {
    // ✅ إصلاح 4: إذا النموذج قال NO_TRADE خلّيه كما هو بدون إضافة سبب إضافي
    if (r.decision === "NO_TRADE") return r as ICTAnalysis;
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, "لا يوجد إعداد صفقة صالح"];
    return r as ICTAnalysis;
  }

  // 2) Score + Confidence
  if (r.score < opts.minScore) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, `التقييم منخفض (${r.score}/10) - المطلوب >= ${opts.minScore}`];
    return r as ICTAnalysis;
  }
  if (r.confidence < opts.minConfidence) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, `الثقة منخفضة (${r.confidence}%) - المطلوب >= ${opts.minConfidence}%`];
    return r as ICTAnalysis;
  }

  // 3) Sweep (H1 أولوية، M5 بديل)
  const h1Sweep = r.liquidityPurge?.h1Sweep?.occurred === true;
  const m5Sweep = r.liquidityPurge?.m5InternalSweep?.occurred === true;
  let primarySource = r.liquidityPurge?.primarySource || "NONE";
  
  // ✅ إصلاح 4: تصحيح primarySource تلقائياً عند التضارب
  if (primarySource === "H1" && !h1Sweep && m5Sweep) primarySource = "M5";
  if (primarySource === "M5" && !m5Sweep && h1Sweep) primarySource = "H1";
  if (!h1Sweep && !m5Sweep) primarySource = "NONE";
  r.liquidityPurge = { ...(r.liquidityPurge || {}), primarySource };
  
  // يجب وجود سحب سيولة على H1 أو M5
  if (!h1Sweep && !m5Sweep) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, "NO_TRADE: لم يحدث سحب سيولة - الشرط الأول غير متوفر"];
    return r as ICTAnalysis;
  }

  // تحديد نوع السحب حسب المصدر الأساسي
  let sweepType = "NONE";
  if (primarySource === "H1" && h1Sweep) {
    sweepType = r.liquidityPurge?.h1Sweep?.type || "NONE";
  } else if (primarySource === "M5" && m5Sweep) {
    sweepType = r.liquidityPurge?.m5InternalSweep?.type || "NONE";
    
    // شروط إضافية لسحب السيولة الداخلي على M5
    const m5Evidence = r.liquidityPurge?.m5InternalSweep?.evidence || {};
    const isRecent = r.liquidityPurge?.m5InternalSweep?.isRecent === true;
    
    // ✅ إصلاح 6: تحسين منطق wickSize + closedBackInside
    const closedBackInside = m5Evidence.closedBackInside === true;
    const wickSize = m5Evidence.wickSize;
    const hasStrongWick = wickSize === "LARGE" || (wickSize === "MEDIUM" && closedBackInside);
    
    // ✅ إصلاح 5: تحويل candlesAgo إلى رقم مضبوط
    const candlesAgoRaw = m5Evidence.candlesAgo;
    const candlesAgo = Number.isFinite(Number(candlesAgoRaw)) ? Number(candlesAgoRaw) : 999;
    
    if (!isRecent || candlesAgo > 15) {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, `سحب السيولة على M5 قديم (${candlesAgo} شموع) - يجب أن يكون حديث (< 15 شموع)`];
      return r as ICTAnalysis;
    }
    
    if (!hasStrongWick) {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, "سحب السيولة على M5 بدون رفض قوي - يجب وجود ذيول واضحة"];
      return r as ICTAnalysis;
    }
  }

  // 4) H1 allowBuy/allowSell (استعمال فعلي لمنع أخطاء النموذج)
  const h1 = r.h1Analysis || {};
  const allowBuy = h1.allowBuy === true;
  const allowSell = h1.allowSell === true;

  // 5) Trade basics
  const t = r.suggestedTrade;
  const isBuy = String(t.type || "").includes("BUY");

  // 6) توافق نوع السحب مع نوع الصفقة (مع دعم M5)
  if (isBuy) {
    if (sweepType !== "SSL") {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, `NO_TRADE: شراء يتطلب SSL Sweep - الموجود: ${sweepType}`];
      return r as ICTAnalysis;
    }
    if (!allowBuy && primarySource === "H1") {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, "NO_TRADE: سياق H1 لا يسمح بالشراء"];
      return r as ICTAnalysis;
    }
  } else {
    if (sweepType !== "BSL") {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, `NO_TRADE: بيع يتطلب BSL Sweep - الموجود: ${sweepType}`];
      return r as ICTAnalysis;
    }
    if (!allowSell && primarySource === "H1") {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, "NO_TRADE: سياق H1 لا يسمح بالبيع"];
      return r as ICTAnalysis;
    }
  }

  // 6.5) شروط إضافية عند الاعتماد على M5 فقط
  if (primarySource === "M5" && !h1Sweep) {
    // تقليل التقييم قليلاً عند الاعتماد على M5 فقط
    r.score = Math.max(r.score - 0.5, 0);
    r.confidence = Math.max(r.confidence - 5, 0);
    
    // إضافة تحذير
    r.reasons = [...r.reasons, "الاعتماد على سحب السيولة الداخلي على M5 (مخاطرة أعلى قليلاً)"];
    
    // التأكد من عدم وجود اتجاه قوي معاكس على H1
    const h1Bias = h1.bias || "NEUTRAL";
    if (isBuy && h1Bias === "BEARISH") {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, "H1 هابط بقوة - لا يمكن الشراء بناءً على M5 فقط"];
      return r as ICTAnalysis;
    }
    if (!isBuy && h1Bias === "BULLISH") {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, "H1 صاعد بقوة - لا يمكن البيع بناءً على M5 فقط"];
      return r as ICTAnalysis;
    }
  }

  // 7) Confluences (متوازن - 2 تلاقيات كحد أدنى)
  if (r.confluences.length < opts.minConfluences) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, `عدد التلاقيات غير كافٍ (${r.confluences.length}/${opts.minConfluences}) - يجب وجود تلاقيين على الأقل`];
    return r as ICTAnalysis;
  }

  // ✅ إصلاح 5: اجعل "priceLocation" غير موجود = MID لكن خفّض Score بدل رفض فوري
  const priceLocation = r.priceLocation || "MID";
  if (priceLocation === "MID") {
    r.score = Math.max(r.score - 1.0, 0);
    r.confidence = Math.max(r.confidence - 8, 0);
    r.reasons = [...r.reasons, "تحذير: الموقع السعري غير محسوم (MID) - تم تخفيض التقييم"];
  }

  // 8) M5 Conditions (STRICT - MSS إلزامي)
  const m5 = r.m5Analysis || {};
  const m5Structure = (m5.marketStructure || r.marketStructure || "CONSOLIDATION") as string;
  const m5Disp = (m5.displacement || r.displacementStrength || "WEAK") as string;
  const m5Pd = (m5.pdArray || r.pdArrayDetails?.primary || "NONE") as string;
  const mssOccurred = m5.mssOccurredAfterSweep === true;

  const hasChoCHorMSS = m5Structure === "CHoCH" || m5Structure === "MSS";
  const dispOk = m5Disp !== "WEAK";
  const hasPdArray = m5Pd !== "NONE";
  
  // ✅ إصلاح 1: التحقق من الرفض القوي من المكان الصحيح
  const h1WickReject = r?.liquidityPurge?.h1Sweep?.evidence?.wickRejection === true;
  const m5WickReject = r?.liquidityPurge?.m5InternalSweep?.evidence?.wickRejection === true;
  const hasStrongReject = h1WickReject || m5WickReject;

  // 🔴 الشرط الأهم: MSS بعد السحب (CRITICAL)
  if (!hasChoCHorMSS) {
    r.decision = "NO_TRADE";
    r.reasons = [
      ...r.reasons,
      "NO_TRADE: لم يحدث MSS أو CHoCH بعد سحب السيولة - Setup غير مكتمل"
    ];
    return r as ICTAnalysis;
  }
  
  // ✅ إصلاح 3: فرض شرط MSS "بعد السحب" فعلياً
  const mssAfterSweep = r?.m5Analysis?.mssOccurredAfterSweep === true;
  if (!mssAfterSweep) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, "NO_TRADE: لم يحدث MSS/CHoCH بعد سحب السيولة (بعد السحب)"];
    return r as ICTAnalysis;
  }

  if (!dispOk) {
    r.decision = "NO_TRADE";
    r.reasons = [
      ...r.reasons,
      "NO_TRADE: الإزاحة السعرية ضعيفة (WEAK) - لا توجد حركة مؤسسية"
    ];
    return r as ICTAnalysis;
  }

  // لازم PD Array (FVG أو OB) - Rejection قوي بديل فقط إذا كان استثنائي
  if (!hasPdArray && !hasStrongReject) {
    r.decision = "NO_TRADE";
    r.reasons = [
      ...r.reasons,
      "NO_TRADE: لا يوجد FVG أو OB للدخول - الدخول من مستوى أفقي فقط مرفوض"
    ];
    return r as ICTAnalysis;
  }

  // 9) نوع الصفقة المدعوم
  const allowedTypes = ["BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"];
  if (!allowedTypes.includes(String(t.type))) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, `نوع الصفقة غير مدعوم: ${t.type}`];
    return r as ICTAnalysis;
  }

  // ✅ إصلاح 3: تأمين الأرقام ضد NaN/0
  const toNum = (x: any) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : NaN;
  };
  
  t.entry = toNum(t.entry);
  t.sl = toNum(t.sl);
  t.tp1 = toNum(t.tp1 || t.tp || 0);
  t.tp2 = toNum(t.tp2 || 0);
  t.tp3 = toNum(t.tp3 || 0);
  
  if (![t.entry, t.sl, t.tp1, t.tp2, t.tp3].every(Number.isFinite)) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, "قيم الدخول/الوقف/الأهداف غير صالحة (NaN)"];
    return r as ICTAnalysis;
  }
  
  // تقريب الأرقام بعد التحقق
  t.entry = round2(t.entry);
  t.sl = round2(t.sl);
  t.tp1 = round2(t.tp1);
  t.tp2 = round2(t.tp2);
  t.tp3 = round2(t.tp3);

  // التحقق من وجود الأهداف الثلاثة
  if (!t.tp1 || !t.tp2 || !t.tp3) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, "يجب تحديد 3 أهداف (TP1, TP2, TP3)"];
    return r as ICTAnalysis;
  }

  // 11) المسافة (2%)
  const dist = Math.abs(t.entry - currentPrice);
  const maxDist = currentPrice * opts.maxDistancePercent;
  if (dist > maxDist) {
    r.decision = "NO_TRADE";
    r.reasons = [
      ...r.reasons,
      `الدخول بعيد (${((dist / currentPrice) * 100).toFixed(2)}%) - المسموح <= ${(opts.maxDistancePercent * 100).toFixed(1)}%`
    ];
    return r as ICTAnalysis;
  }

  // 12) ترتيب SL/TP
  if (isBuy) {
    if (!(t.sl < t.entry && t.entry < t.tp1 && t.tp1 < t.tp2 && t.tp2 < t.tp3)) {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, "ترتيب مستويات الشراء خاطئ (SL < Entry < TP1 < TP2 < TP3)"];
      return r as ICTAnalysis;
    }
  } else {
    if (!(t.tp3 < t.tp2 && t.tp2 < t.tp1 && t.tp1 < t.entry && t.entry < t.sl)) {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, "ترتيب مستويات البيع خاطئ (TP3 < TP2 < TP1 < Entry < SL)"];
      return r as ICTAnalysis;
    }
  }

  // 13) RR للأهداف الثلاثة
  const risk = Math.abs(t.entry - t.sl);
  const reward1 = Math.abs(t.tp1 - t.entry);
  const reward2 = Math.abs(t.tp2 - t.entry);
  const reward3 = Math.abs(t.tp3 - t.entry);
  
  const rr1 = reward1 / (risk || 0.0001);
  const rr2 = reward2 / (risk || 0.0001);
  const rr3 = reward3 / (risk || 0.0001);
  
  // التحقق من RR للهدف الأول (الحد الأدنى)
  if (rr1 < opts.minRR) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, `RR للهدف الأول ضعيف (${rr1.toFixed(2)}) - المطلوب >= ${opts.minRR}`];
    return r as ICTAnalysis;
  }
  
  // التحقق من أن الأهداف تتصاعد بشكل منطقي
  if (rr2 <= rr1 || rr3 <= rr2) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, "الأهداف يجب أن تكون متصاعدة (RR1 < RR2 < RR3)"];
    return r as ICTAnalysis;
  }
  
  // حفظ نسب RR
  t.rrRatio = `TP1: 1:${rr1.toFixed(1)} | TP2: 1:${rr2.toFixed(1)} | TP3: 1:${rr3.toFixed(1)}`;

  // ✅ OK
  return r as ICTAnalysis;
}

// ===================== API Call Helper =====================
async function callOllamaChat(payload: any) {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: payload.messages,
      stream: false,
      temperature: payload.options?.temperature || 0.2,
      max_tokens: payload.options?.num_predict || 1800
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  
  // تحويل الرد ليتوافق مع الكود الأصلي
  return {
    message: {
      content: data.choices?.[0]?.message?.content || "{}"
    },
    response: data.choices?.[0]?.message?.content || "{}"
  };
}

// ===================== Multi-Timeframe Analysis (H1 + M5) - الطريقة الوحيدة =====================
export const analyzeMultiTimeframe = async (
  h1Image: string,
  m5Image: string,
  currentPrice: number
): Promise<ICTAnalysis> => {
  const cleanH1 = h1Image.replace(/^data:image\/\w+;base64,/, "");
  const cleanM5 = m5Image.replace(/^data:image\/\w+;base64,/, "");

  const userPrompt = `${systemInstruction}

═══════════════════════════════════════════════════════════════
📌 مدخلات التحليل
═══════════════════════════════════════════════════════════════
- الزوج: XAUUSD
- السعر الحالي: ${currentPrice}

الصورة 1: H1 (السياق الأساسي)
- حدّد هل حدث SSL Sweep أو BSL Sweep على H1
- حدّد allowBuy / allowSell حسب السياق العام

الصورة 2: M5 (الدخول + السيولة الداخلية)
- حدّد CHoCH أو MSS (لا تقبل BOS فقط)
- حدّد displacement
- حدّد FVG/OB أو رفض قوي
- ⚠️ جديد: إذا لم يحدث Sweep على H1، ابحث عن سحب سيولة داخلي على M5:
  * اختراق قمة/قاع محلي مع رفض قوي (ذيول كبيرة)
  * عودة السعر داخل النطاق خلال 1-3 شموع
  * السحب حديث (خلال آخر 10-15 شموع)
- حدّد نقطة الدخول المعلق (Limit Order) عند FVG أو OB

🔄 أولوية سحب السيولة:
1. الأولوية الأولى: سحب السيولة على H1
2. البديل: سحب السيولة الداخلي على M5 (إذا لم يحدث على H1)
3. إذا لم يحدث على كليهما: NO_TRADE

⚠️ مهم جداً - الصفقات المعلقة:
- نوع الصفقة: BUY_LIMIT أو SELL_LIMIT (أوامر معلقة فقط)
- سعر الدخول: عند منطقة FVG أو OB (ليس السعر الحالي)
- الدخول يجب أن يكون أقل من السعر الحالي للشراء (BUY_LIMIT)
- الدخول يجب أن يكون أعلى من السعر الحالي للبيع (SELL_LIMIT)

⚠️ مهم جداً - 3 أهداف إجبارية:
- TP1 (الهدف الأول): أقرب مستوى مقاومة/دعم أو FVG معاكس (محافظ)
- TP2 (الهدف الثاني): مستوى سيولة متوسط أو OB مهم (متوازن)
- TP3 (الهدف الثالث): مستوى سيولة رئيسي BSL/SSL على H1 (طموح)

📊 نسب الأهداف الموصى بها:
- TP1: RR = 1.5 إلى 2.0 (هدف سريع وآمن)
- TP2: RR = 2.5 إلى 3.5 (هدف متوسط)
- TP3: RR = 4.0 إلى 6.0 (هدف رئيسي)

💡 يجب أن تكون الأهداف مبنية على:
- مستويات سيولة واضحة على H1
- مناطق PD Array معاكسة (FVG/OB)
- مستويات نفسية مهمة
- قمم/قيعان سابقة واضحة

🔄 مثال على سحب السيولة الداخلي على M5:
- السعر يكسر قاع محلي بذيل طويل ثم يعود للأعلى (SSL Sweep)
- أو السعر يكسر قمة محلية بذيل طويل ثم يعود للأسفل (BSL Sweep)
- الذيل يجب أن يكون واضح (50%+ من حجم الشمعة)
- السحب حدث خلال آخر 10-15 شموع على M5

⚠️ عند NO_TRADE:
- قل ماذا ينقص فقط
- لا تطلب من المستخدم انتظار كسر مستوى أو إعادة التحليل

الرد JSON فقط وبالعربية فقط.
`;

  const data = await callOllamaChat({
    model: MODEL,
    messages: [{
      role: "user",
      content: userPrompt,
      images: [cleanH1, cleanM5]
    }],
    stream: false,
    options: { temperature: 0.2, num_predict: 1800 }
  });

  const content = data.message?.content || data.response || "{}";
  const parsed = safeParseJson(content);
  return validateAndFix(parsed, currentPrice);
};

// ===================== Trade Monitoring (Optional) =====================
export const monitorActiveTrade = async (
  base64Image: string,
  trade: { symbol: string; entryPrice: number },
  currentPrice: number
): Promise<ManagementAdvice> => {
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

  const data = await callOllamaChat({
    model: MODEL,
    messages: [{
      role: "user",
      content: `أنت مدير مخاطر ICT محترف.
راقب علامات الانعكاس والسيولة فقط.
الصفقة: ${trade.symbol} | دخول: ${trade.entryPrice} | السعر الحالي: ${currentPrice}

رد JSON فقط:
{
  "status": "HOLD" | "MOVE_TO_BE" | "PARTIAL_CLOSE" | "CLOSE_NOW",
  "reversalProbability": 0-100,
  "message": "شرح بالعربية",
  "actionRequired": "الإجراء بالعربية"
}`,
      images: [cleanBase64]
    }],
    stream: false,
    options: { temperature: 0.25, num_predict: 700 }
  });

  const content = data.message?.content || data.response || "{}";
  return (safeParseJson(content) as ManagementAdvice) || {
    status: "HOLD",
    reversalProbability: 50,
    message: "لم أتمكن من استخراج رد صالح",
    actionRequired: "أعد المحاولة"
  };
};

// ===================== Chat (Optional) =====================
export const chatWithAI = async (
  message: string,
  analysis: ICTAnalysis | null,
  currentPrice: number
): Promise<string> => {
  const context = analysis
    ? `
القرار: ${analysis.decision}
الاتجاه: ${analysis.sentiment}
التقييم: ${analysis.score}/10
الثقة: ${analysis.confidence}%
${analysis.suggestedTrade ? `صفقة: ${analysis.suggestedTrade.type} | Entry ${analysis.suggestedTrade.entry} | SL ${analysis.suggestedTrade.sl} | TP1 ${analysis.suggestedTrade.tp1} | TP2 ${analysis.suggestedTrade.tp2} | TP3 ${analysis.suggestedTrade.tp3}` : ""}
`
    : "لا يوجد تحليل حالي";

  const data = await callOllamaChat({
    model: MODEL,
    messages: [{
      role: "user",
      content: `أنت مساعد تداول ICT بالعربية فقط.
السعر الحالي: ${currentPrice}

${context}

سؤال المستخدم: ${message}

أجب باختصار وبالعربية فقط.`
    }],
    stream: false,
    options: { temperature: 0.45, num_predict: 400 }
  });

  return data.message?.content || data.response || "عذراً، لم أتمكن من الرد.";
};

// ===================== Follow Up Trade (Optional) =====================
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

    // حساب الوقت المنقضي منذ إعطاء الصفقة
    const now = new Date();
    const timeDiff = now.getTime() - tradeTimestamp.getTime();
    const minutesPassed = Math.floor(timeDiff / 60000);
    const hoursPassed = Math.floor(minutesPassed / 60);
    const timePassedStr = hoursPassed > 0 
      ? `${hoursPassed} ساعة و ${minutesPassed % 60} دقيقة`
      : `${minutesPassed} دقيقة`;

    // ✅ إصلاح 2: تصحيح followUpTrade (tp → tp1,tp2,tp3)
    const entry = originalAnalysis.suggestedTrade?.entry || 0;
    const sl = originalAnalysis.suggestedTrade?.sl || 0;
    const tp1 = originalAnalysis.suggestedTrade?.tp1 || 0;
    const tp2 = originalAnalysis.suggestedTrade?.tp2 || 0;
    const tp3 = originalAnalysis.suggestedTrade?.tp3 || 0;
    const isBuy = originalAnalysis.suggestedTrade?.type.includes('BUY') || false;
    
    // هل تم تفعيل الصفقة؟
    let tradeStatus = 'لم تُفعّل بعد';
    let currentPnL = 0;
    
    if (isBuy) {
      if (currentPrice <= entry) {
        tradeStatus = 'تم التفعيل ✅';
        currentPnL = currentPrice - entry;
      }
    } else {
      if (currentPrice >= entry) {
        tradeStatus = 'تم التفعيل ✅';
        currentPnL = entry - currentPrice;
      }
    }
    
    // حساب المسافة من SL و TP (استخدام TP1 كهدف قريب)
    const distanceToSL = Math.abs(currentPrice - sl);
    const distanceToTP1 = Math.abs(currentPrice - tp1);
    const distanceToTP2 = Math.abs(currentPrice - tp2);
    const distanceToTP3 = Math.abs(currentPrice - tp3);
    const slPercent = ((distanceToSL / currentPrice) * 100).toFixed(2);
    const tp1Percent = ((distanceToTP1 / currentPrice) * 100).toFixed(2);
    const tp2Percent = ((distanceToTP2 / currentPrice) * 100).toFixed(2);
    const tp3Percent = ((distanceToTP3 / currentPrice) * 100).toFixed(2);

    const data = await callOllamaChat({
      model: MODEL,
      messages: [{
        role: "user",
        content: `أنت مدير مخاطر ICT محترف. راجع الصفقة وقدم نصيحة بالعربية فقط.

═══════════════════════════════════════════════════════════════
                    📋 بيانات الصفقة
═══════════════════════════════════════════════════════════════

⏰ وقت إعطاء الصفقة: ${tradeTimestamp.toLocaleString('ar-EG')}
⏱️ الوقت المنقضي: ${timePassedStr}
📊 حالة الصفقة: ${tradeStatus}

💰 السعر الحالي: ${currentPrice.toFixed(2)}
📈 نوع الصفقة: ${isBuy ? 'شراء (BUY)' : 'بيع (SELL)'}
🎯 سعر الدخول: ${entry.toFixed(2)}
🛑 وقف الخسارة: ${sl.toFixed(2)} (${slPercent}% بعيد)
✅ الأهداف:
   TP1: ${tp1.toFixed(2)} (${tp1Percent}% بعيد)
   TP2: ${tp2.toFixed(2)} (${tp2Percent}% بعيد)
   TP3: ${tp3.toFixed(2)} (${tp3Percent}% بعيد)

${tradeStatus === 'تم التفعيل ✅' ? `📊 الربح/الخسارة الحالية: ${currentPnL > 0 ? '+' : ''}${currentPnL.toFixed(2)} نقطة` : ''}

═══════════════════════════════════════════════════════════════
                    📝 التحليل الأصلي
═══════════════════════════════════════════════════════════════

${originalAnalysis.reasoning || originalAnalysis.bias}
الأسباب: ${originalAnalysis.reasons?.join(' | ') || 'غير متوفر'}

رد بصيغة JSON:
{
  "shouldExit": true أو false,
  "reason": "شرح مفصل بالعربية لماذا يجب الاستمرار أو الخروج",
  "advice": "نصيحة مختصرة بالعربية مع إيموجي مناسب",
  "tradeActivated": true أو false,
  "riskLevel": "منخفض" أو "متوسط" أو "مرتفع"
}`,
        images: [cleanH1, cleanM5]
      }],
      stream: false,
      options: { temperature: 0.2 }
    });

    const content = data.message?.content || data.response || "{}";
    const parsed = safeParseJson(content);
    
    // بناء النصيحة النهائية بالعربية
    const emoji = parsed.shouldExit ? '⚠️' : '✅';
    const action = parsed.shouldExit ? 'اخرج من الصفقة' : 'استمر في الصفقة';
    const risk = parsed.riskLevel || 'غير محدد';
    
    const fullAdvice = `${emoji} ${action}

📊 حالة الصفقة: ${tradeStatus}
⏱️ منذ: ${timePassedStr}
⚡ مستوى المخاطرة: ${risk}

📝 ${parsed.reason || 'لا يوجد تفاصيل'}`;

    return {
      advice: fullAdvice,
      shouldExit: parsed.shouldExit || false,
      reason: parsed.reason || "لا يوجد سبب محدد"
    };
  } catch (error) {
    console.error('Follow-up Error:', error);
    return {
      advice: '❌ حدث خطأ في التحليل. حاول مرة أخرى.',
      shouldExit: false,
      reason: 'خطأ في الاتصال'
    };
  }
};