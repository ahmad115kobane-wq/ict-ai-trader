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

// ===================== ICT System Instruction (Balanced & Consistent) =====================
// ✅ لا يوجد تناقضات:
// - الصفقة ICT تتطلب Sweep على H1 (إجباري)
// - الدخول من M5 (إجباري) لكن مرن: CHoCH أو MSS + Displacement ليس WEAK + (PD Array أو Rejection قوي)
export const systemInstruction = `
أنت "ICT Dual-Chart Analyzer" متخصص XAUUSD - تحليل الصورتين إلزامي.
⚠️ يجب أن تكون جميع النصوص بالعربية فقط.
⚠️ يجب أن ترد بصيغة JSON فقط بدون أي نص خارجي.

🔴 المبدأ الأساسي: تحليل H1 + M5 معاً (لا تحليل صورة واحدة)

═══════════════════════════════════════════════════════════════
(1) منهجية الصورتين الإلزامية
═══════════════════════════════════════════════════════════════
- الصورة الأولى: H1 (فريم الساعة) - السياق والاتجاه العام
- الصورة الثانية: M5 (فريم 5 دقائق) - التوقيت والدخول

✅ لا صفقة بدون تحليل الصورتين معاً:
1) H1 يحدد: هل حدث Sweep؟ الاتجاه المسموح؟
2) M5 يحدد: متى الدخول؟ من أين؟

═══════════════════════════════════════════════════════════════
(2) شروط H1 (أولوية عالية) + M5 (بديل)
═══════════════════════════════════════════════════════════════
🔴 الأولوية الأولى - سحب السيولة على H1:
يسمح بالشراء إذا:
- حدث SSL Sweep واضح على H1 (اختراق قاع سيولة ثم عودة داخل النطاق)
- لا يوجد كسر هيكل هابط جديد واضح بعد السحب

يسمح بالبيع إذا:
- حدث BSL Sweep واضح على H1 (اختراق قمة سيولة ثم عودة داخل النطاق)
- لا يوجد كسر هيكل صاعد جديد واضح بعد السحب

🟡 البديل - سحب السيولة الداخلي على M5 (إذا لم يحدث على H1):
إذا لم يحدث Sweep على H1، يمكن الاعتماد على سحب السيولة الداخلي على M5:

للشراء:
- حدث SSL Sweep على M5 (اختراق قاع محلي ثم عودة)
- يجب أن يكون السحب واضح مع رفض قوي (ذيول طويلة)
- لا يوجد كسر هيكل هابط جديد بعد السحب على M5

للبيع:
- حدث BSL Sweep على M5 (اختراق قمة محلية ثم عودة)
- يجب أن يكون السحب واضح مع رفض قوي (ذيول طويلة)
- لا يوجد كسر هيكل صاعد جديد بعد السحب على M5

⚠️ شروط سحب السيولة الداخلي على M5:
- يجب أن يكون السحب حديث (خلال آخر 10-15 شموع)
- رفض واضح بذيول لا تقل عن 50% من حجم الشمعة
- عودة السعر داخل النطاق خلال 1-3 شموع
- لا يوجد اتجاه قوي معاكس على H1

إذا لم يحدث Sweep على H1 ولا على M5 → sentiment = NEUTRAL و decision = NO_TRADE

═══════════════════════════════════════════════════════════════
(3) شروط M5 (إجباري لكن مرن Balanced)
═══════════════════════════════════════════════════════════════
للسماح بالدخول على M5 يجب:
- (CHoCH أو MSS أو BOS) في اتجاه الصفقة  ✅
- Displacement = MODERATE أو STRONG  ✅ (ارفض WEAK)
- يوجد منطقة دخول: FVG أو OB  ✅
  أو (Rejection قوي بذيول عند مستوى الدخول) ✅ بديل مقبول إذا لم يتوفر FVG/OB

❌ ارفض إذا:
- M5 في تذبذب واضح (CONSOLIDATION / Range) + بدون كسر واضح
- Displacement ضعيف (WEAK)
- لا يوجد أي منطقة دخول ولا Rejection قوي

═══════════════════════════════════════════════════════════════
(4) شروط الصفقة (متوازنة - تعطي صفقات معقولة)
═══════════════════════════════════════════════════════════════
- score >= 5.5 ✅
- confidence >= 60 ✅
- RR >= 1.5 ✅
- الدخول قريب من السعر الحالي (< 1.5% للذهب) ✅
- ترتيب SL/TP صحيح ✅
- التلاقيات >= 2 ✅
- priceLocation: ممنوع MID فقط ✅

═══════════════════════════════════════════════════════════════
(5) المطلوب منك
═══════════════════════════════════════════════════════════════
- حلّل H1: هل يوجد Sweep؟ نوعه؟ وما هو BSL/SSL الأقرب؟
- حلّل M5: هل توجد CHoCH/MSS؟ Displacement؟ FVG/OB؟
- أعط قرار: PLACE_PENDING أو NO_TRADE
- عند NO_TRADE: اذكر السبب فقط (لا تطلب من المستخدم إعادة التحليل أو انتظار كسر مستوى)

⚠️ مهم جداً: لا تطلب من المستخدم "إعادة التحليل بعد كسر مستوى X" - إما أعط صفقة أو قل لا توجد فرصة حالياً

═══════════════════════════════════════════════════════════════
(6) صيغة JSON الإلزامية
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
    "marketStructure": "BOS" | "MSS" | "CHoCH" | "CONSOLIDATION",
    "displacement": "STRONG" | "MODERATE" | "WEAK",
    "pdArray": "FVG" | "OB" | "NONE",
    "readyForEntry": true | false
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
// ===================== Balanced Validator (متوازن - يعطي صفقات معقولة) =====================
function validateAndFix(r: any, currentPrice: number): ICTAnalysis {
  // ✅ معايير متوازنة - ليست متساهلة ولا متشددة
  const opts = {
    maxDistancePercent: 0.015, // 1.5% (متوازن للذهب)
    minRR: 1.5,                // 1.5 (متوازن)
    minScore: 5.5,             // 5.5 (متوازن)
    minConfidence: 60,         // 60%
    minConfluences: 2          // 2 تلاقيات (متوازن)
  };

  // Defaults
  r = r || {};
  r.reasons = Array.isArray(r.reasons) ? r.reasons : [];
  r.confluences = Array.isArray(r.confluences) ? r.confluences : [];
  r.score = Number.isFinite(r.score) ? r.score : 0;
  r.confidence = Number.isFinite(r.confidence) ? r.confidence : 0;

  // 1) يجب قرار + صفقة
  if (r.decision !== "PLACE_PENDING" || !r.suggestedTrade) {
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
  const primarySource = r.liquidityPurge?.primarySource || "NONE";
  
  // يجب وجود سحب سيولة على H1 أو M5
  if (!h1Sweep && !m5Sweep) {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, "لم يحدث سحب سيولة على H1 ولا على M5 - شرط أساسي"];
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
    const hasStrongWick = m5Evidence.wickSize === "LARGE" || m5Evidence.wickSize === "MEDIUM";
    const candlesAgo = m5Evidence.candlesAgo || 999;
    
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
      r.reasons = [...r.reasons, `شراء يتطلب سحب سيولة SSL - الموجود: ${sweepType} على ${primarySource}`];
      return r as ICTAnalysis;
    }
    if (!allowBuy && primarySource === "H1") {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, "فريم الساعة لا يسمح بالشراء حالياً (السياق غير مناسب)"];
      return r as ICTAnalysis;
    }
  } else {
    if (sweepType !== "BSL") {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, `بيع يتطلب سحب سيولة BSL - الموجود: ${sweepType} على ${primarySource}`];
      return r as ICTAnalysis;
    }
    if (!allowSell && primarySource === "H1") {
      r.decision = "NO_TRADE";
      r.reasons = [...r.reasons, "فريم الساعة لا يسمح بالبيع حالياً (السياق غير مناسب)"];
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

  // 7.5) فحص priceLocation - ممنوع الدخول من MID فقط (تحذير وليس رفض)
  const priceLocation = r.priceLocation || "";
  // إذا كان MID صريح - رفض الصفقة
  if (priceLocation === "MID") {
    r.decision = "NO_TRADE";
    r.reasons = [...r.reasons, "السعر في منتصف الرينج (MID) - لا توجد فرصة حالياً"];
    return r as ICTAnalysis;
  }
  // إذا لم يحدد النموذج priceLocation - نسمح بالصفقة (لا نرفض)

  // 8) M5 Conditions (Balanced)
  const m5 = r.m5Analysis || {};
  const m5Structure = (m5.marketStructure || r.marketStructure || "CONSOLIDATION") as string;
  const m5Disp = (m5.displacement || r.displacementStrength || "WEAK") as string;
  const m5Pd = (m5.pdArray || r.pdArrayDetails?.primary || "NONE") as string;

  const hasChoCHorMSS = m5Structure === "CHoCH" || m5Structure === "MSS" || m5Structure === "BOS";
  const dispOk = m5Disp !== "WEAK";
  const hasPdArray = m5Pd !== "NONE";
  const hasStrongReject = r.liquidityPurge?.evidence?.wickRejection === true;

  // رفض التذبذب الصريح إذا ماكو كسر
  if (!hasChoCHorMSS) {
    r.decision = "NO_TRADE";
    r.reasons = [
      ...r.reasons,
      "فريم 5 دقائق بدون CHoCH أو MSS أو BOS واضح - لا توجد فرصة حالياً"
    ];
    return r as ICTAnalysis;
  }

  if (!dispOk) {
    r.decision = "NO_TRADE";
    r.reasons = [
      ...r.reasons,
      "الإزاحة السعرية على فريم 5 دقائق ضعيفة - لا توجد فرصة حالياً"
    ];
    return r as ICTAnalysis;
  }

  // لازم PD Array أو Rejection قوي
  if (!hasPdArray && !hasStrongReject) {
    r.decision = "NO_TRADE";
    r.reasons = [
      ...r.reasons,
      "لا توجد منطقة دخول واضحة (FVG/OB) ولا رفض قوي - لا توجد فرصة حالياً"
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

  // 10) مستويات الصفقة
  t.entry = round2(Number(t.entry));
  t.sl = round2(Number(t.sl));
  t.tp1 = round2(Number(t.tp1 || t.tp || 0));
  t.tp2 = round2(Number(t.tp2 || 0));
  t.tp3 = round2(Number(t.tp3 || 0));

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
- حدّد CHoCH أو MSS أو BOS
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

    // حساب حالة الصفقة
    const entry = originalAnalysis.suggestedTrade?.entry || 0;
    const sl = originalAnalysis.suggestedTrade?.sl || 0;
    const tp = originalAnalysis.suggestedTrade?.tp || 0;
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
    
    // حساب المسافة من SL و TP
    const distanceToSL = Math.abs(currentPrice - sl);
    const distanceToTP = Math.abs(currentPrice - tp);
    const slPercent = ((distanceToSL / currentPrice) * 100).toFixed(2);
    const tpPercent = ((distanceToTP / currentPrice) * 100).toFixed(2);

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
✅ جني الأرباح: ${tp.toFixed(2)} (${tpPercent}% بعيد)

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