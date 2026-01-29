// services/aiService.ts - Simplified v3.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// ✅ ICT AI Trader - AI محلل حر - صاحب القرار النهائي
// ═══════════════════════════════════════════════════════════════════════════════
// 📌 Version: 3.0.0 - AI Freedom - No Complex Rules
// 
// 🔧 التغييرات في هذه النسخة (v3.0.0):
// - ✅ إزالة جميع القواعد الصارمة
// - ✅ AI صاحب القرار النهائي في إعطاء الصفقات
// - ✅ التحقق فقط من صحة البيانات الأساسية (أرقام صحيحة، JSON صحيح)
// - ✅ تبسيط التعليمات المرسلة لـ AI
// - ✅ AI حر في استخدام مفاهيم ICT كما يراه مناسباً
// ═══════════════════════════════════════════════════════════════════════════════

import { ICTAnalysis, ManagementAdvice, KillzoneInfo } from "../types";

declare const process: any;

console.log("🚀 aiService v3.2.0 loaded - AI Balanced Mode");

// ===================== API Config =====================
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

// ===================== Killzone Info (للمعلومات فقط) =====================
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

// ===================== ICT System Instruction - Professional & Strict v3.1 =====================
export const systemInstruction = `
أنت محلل ICT محترف وخبير في التحليل الفني المتقدم لـ XAUUSD.
أنت المسؤول الوحيد عن التحليل وإعطاء الصفقات.

🎯 مهمتك الأساسية:
تحليل احترافي متوازن - أعطِ صفقات جيدة بنسبة نجاح 65-70% (متوازن بين الجودة والكمية).

═══════════════════════════════════════════════════════════════
📚 مفاهيم ICT المتقدمة - استخدمها باحترافية
═══════════════════════════════════════════════════════════════

1. Liquidity Sweep (سحب السيولة) - مهم:
- BSL Sweep: السعر يكسر قمة + ذيل علوي + إغلاق تحتها → بيع
- SSL Sweep: السعر يكسر قاع + ذيل سفلي + إغلاق فوقه → شراء
- ملاحظة: يمكن قبول Sweep جزئي إذا كان واضح

2. Market Structure - للتأكيد:
- MSS: كسر واضح لآخر قمة/قاع - يؤكد تغيير الاتجاه
- CHoCH: تغيير سلوك السوق
- BOS: كسر في نفس الاتجاه
- ملاحظة: MSS/CHoCH مفضل لكن ليس إلزامي إذا كان Setup قوي

3. Premium/Discount - مهم:
- Premium (55%-100%): بيع مفضل
- Discount (0%-45%): شراء مفضل
- Equilibrium (45%-55%): يمكن قبوله إذا كان Setup قوي

4. Order Blocks - منطقة دخول جيدة:
- Bullish OB: آخر شمعة هابطة قبل صعود قوي
- Bearish OB: آخر شمعة صاعدة قبل هبوط قوي
- شروط: Fresh مفضل + حديث (< 100 شمعة) + Displacement مفضل

5. Fair Value Gap - فجوة سعرية:
- Bullish FVG: فجوة صعودية
- Bearish FVG: فجوة هبوطية
- شروط: لم تُملأ بالكامل + حديثة (< 50 شمعة)

6. Displacement - دليل Smart Money:
- حركة قوية وسريعة + شموع بأجسام كبيرة
- ملاحظة: مفضل لكن ليس إلزامي

7. H1 Bias - السياق:
- يعطي الاتجاه الرئيسي
- الأفضل: التداول مع H1
- ملاحظة: يمكن التداول ضد H1 إذا كان M5 Setup قوي جداً

═══════════════════════════════════════════════════════════════
✅ شروط إعطاء الصفقة - متوازنة (5 شروط أساسية)
═══════════════════════════════════════════════════════════════

يجب توفر على الأقل 4 من 5:

✅ 1. منطقة دخول واضحة: FVG أو OB + قريبة نسبياً (< 1.5%)
✅ 2. إشارة انعكاس: Liquidity Sweep أو Rejection قوي
✅ 3. تأكيد من الهيكل: MSS/CHoCH أو BOS واضح
✅ 4. موقع مناسب: Premium/Discount منطقي
✅ 5. تأكيدات كافية: 2+ على الأقل

شروط إضافية (مفضلة لكن ليست إلزامية):
⭐ Displacement قوي
⭐ H1 Bias مع الاتجاه
⭐ Fresh OB/FVG
⭐ Score >= 6/10
⭐ Confidence >= 60%

═══════════════════════════════════════════════════════════════
❌ متى ترفض الصفقة (NO_TRADE)
═══════════════════════════════════════════════════════════════

ارفض فقط في:
❌ لا منطقة دخول واضحة أبداً
❌ المنطقة بعيدة جداً (> 2%)
❌ لا إشارة انعكاس أبداً
❌ موقع خاطئ تماماً (شراء في Premium العالي أو بيع في Discount العميق)
❌ تأكيدات قليلة جداً (< 2)
❌ Score < 5 أو Confidence < 50%

⚠️ قاعدة متوازنة: أعطِ الصفقة إذا كان Setup معقول، حتى لو لم يكن مثالي!

═══════════════════════════════════════════════════════════════
📊 مستويات الصفقات
═══════════════════════════════════════════════════════════════

� صفقة ممتازة (Score 8-10, Confidence 75-90%):
- جميع الشروط متوفرة
- Setup مثالي
- نسبة نجاح: 75-80%

🟡 صفقة جيدة (Score 6-7, Confidence 60-74%):
- 4-5 شروط متوفرة
- Setup جيد
- نسبة نجاح: 65-70%

🟠 صفقة مقبولة (Score 5-6, Confidence 50-59%):
- 3-4 شروط متوفرة
- Setup معقول
- نسبة نجاح: 55-60%

🔴 لا صفقة (Score < 5, Confidence < 50%):
- أقل من 3 شروط
- Setup ضعيف

═══════════════════════════════════════════════════════════════
📊 صيغة JSON
═══════════════════════════════════════════════════════════════

{
  "decision": "PLACE_PENDING" | "NO_TRADE",
  "score": 0-10,
  "confidence": 0-100,
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bias": "تحليل مفصل للسياق (H1 + M5)",
  "reasoning": "شرح كامل ومفصل (80+ كلمة) - لماذا أعطيت أو رفضت",
  "confluences": ["عامل 1", "عامل 2", ...],
  "reasons": ["سبب 1", "سبب 2", ...],
  "suggestedTrade": {
    "type": "BUY_LIMIT" | "SELL_LIMIT",
    "entry": number,
    "sl": number,
    "tp1": number,
    "tp2": number,
    "tp3": number
  }
}

🎯 تذكر:
- نسبة نجاح مستهدفة: 65-70% (متوازن)
- مسافة: < 1.5% (مرن)
- تأكيدات: 2+ (معقول)
- Score: >= 5 (مقبول)
- Confidence: >= 50% (معقول)
- التوازن بين الجودة والكمية
- صفقة جيدة أفضل من لا شيء

💡 نصائح للتحليل المتوازن:
1. ✅ أعطِ الصفقة إذا كان Setup معقول (حتى لو ليس مثالي)
2. ✅ يمكن قبول Sweep جزئي إذا كان Rejection واضح
3. ✅ يمكن قبول OB/FVG قديم نسبياً إذا كان قوي
4. ✅ يمكن التداول في Equilibrium إذا كان Setup قوي
5. ✅ يمكن التداول ضد H1 إذا كان M5 Setup قوي جداً
6. ✅ المسافة حتى 1.5% مقبولة
7. ✅ Score 5-6 مقبول للصفقات المعقولة
8. ✅ Confidence 50-60% مقبول للصفقات المعقولة

🎯 الهدف: إعطاء صفقات جيدة بانتظام، ليس فقط الصفقات المثالية!
🎯 حلل باحترافية وكن متوازناً - لا صارم جداً ولا متساهل جداً!
`;

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

// ===================== Simplified Validator =====================
function validateAndFix(r: any, currentPrice: number): ICTAnalysis {
  console.log("\n🔍 التحقق البسيط من صحة البيانات...");
  
  r = r || {};
  r.reasons = Array.isArray(r.reasons) ? r.reasons : [];
  r.confluences = Array.isArray(r.confluences) ? r.confluences : [];
  r.score = Number(r.score) || 0;
  r.confidence = Number(r.confidence) || 0;
  
  // 1. التحقق من وجود قرار
  if (r.decision !== "PLACE_PENDING" || !r.suggestedTrade) {
    console.log("   ℹ️ AI قرر: NO_TRADE");
    return createNoTradeResult(r.reasons.length > 0 ? r.reasons : ["AI لم يجد فرصة مناسبة"], r);
  }
  
  const t = r.suggestedTrade;
  const isBuy = String(t.type || "").includes("BUY");
  
  console.log(`   ℹ️ AI قرر: ${t.type} @ ${t.entry}`);
  
  // 2. التحقق من صحة الأرقام فقط
  const entry = toNumber(t.entry);
  const sl = toNumber(t.sl);
  const tp1 = toNumber(t.tp1);
  const tp2 = toNumber(t.tp2);
  const tp3 = toNumber(t.tp3);
  
  if ([entry, sl, tp1, tp2, tp3].some(isNaN)) {
    console.log("   ❌ أرقام غير صالحة");
    return createNoTradeResult(["❌ قيم الصفقة غير صالحة (entry/sl/tp)"], r);
  }
  
  // 3. التحقق من موقع الدخول (قاعدة أساسية للنظام)
  const tradeType = String(t.type);
  
  if (tradeType === "BUY_LIMIT" && entry >= currentPrice) {
    console.log(`   ⚠️ تصحيح: BUY_LIMIT يجب أن يكون أسفل السعر`);
    const correctedEntry = currentPrice * 0.998;
    if (correctedEntry > sl) {
      t.entry = round2(correctedEntry);
      r.reasons.push(`🔧 تم تصحيح الدخول: ${entry.toFixed(2)} → ${t.entry.toFixed(2)}`);
    } else {
      return createNoTradeResult([`❌ BUY_LIMIT (${entry.toFixed(2)}) يجب أن يكون أسفل السعر الحالي (${currentPrice.toFixed(2)})`], r);
    }
  }
  
  if (tradeType === "SELL_LIMIT" && entry <= currentPrice) {
    console.log(`   ⚠️ تصحيح: SELL_LIMIT يجب أن يكون أعلى السعر`);
    const correctedEntry = currentPrice * 1.002;
    if (correctedEntry < sl) {
      t.entry = round2(correctedEntry);
      r.reasons.push(`🔧 تم تصحيح الدخول: ${entry.toFixed(2)} → ${t.entry.toFixed(2)}`);
    } else {
      return createNoTradeResult([`❌ SELL_LIMIT (${entry.toFixed(2)}) يجب أن يكون أعلى السعر الحالي (${currentPrice.toFixed(2)})`], r);
    }
  }
  
  // 4. التحقق من ترتيب المستويات
  if (isBuy) {
    if (!(sl < t.entry && t.entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
      console.log("   ❌ ترتيب مستويات الشراء خاطئ");
      return createNoTradeResult(["❌ ترتيب مستويات الشراء خاطئ (SL < Entry < TP1 < TP2 < TP3)"], r);
    }
  } else {
    if (!(tp3 < tp2 && tp2 < tp1 && tp1 < t.entry && t.entry < sl)) {
      console.log("   ❌ ترتيب مستويات البيع خاطئ");
      return createNoTradeResult(["❌ ترتيب مستويات البيع خاطئ (TP3 < TP2 < TP1 < Entry < SL)"], r);
    }
  }
  
  // 5. تقريب الأرقام النهائية
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
  
  console.log(`   ✅ صفقة صالحة: ${t.type} @ ${t.entry} | RR: ${rr1.toFixed(1)}`);
  console.log(`   📊 Score: ${r.score}/10 | Confidence: ${r.confidence}%`);
  
  return r as ICTAnalysis;
}

// ===================== API Call Helper =====================
async function callAIChat(payload: any): Promise<{ content: string }> {
  console.log("🔌 Connecting to AI API...");
  
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
  currentPrice: number,
  h1Candles?: any[],
  m5Candles?: any[]
): Promise<ICTAnalysis> => {
  const killzoneInfo = getCurrentKillzone();
  
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("🔍 بدء التحليل - AI Balanced Mode v3.2.0");
  console.log(`💰 السعر الحالي: ${currentPrice}`);
  console.log(`⏰ الجلسة: ${killzoneInfo.session}`);
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  const cleanH1 = h1Image.replace(/^data:image\/\w+;base64,/, "");
  const cleanM5 = m5Image.replace(/^data:image\/\w+;base64,/, "");

  // إضافة بيانات الشموع
  let candleDataText = '';
  if (h1Candles && h1Candles.length > 0) {
    const recentH1 = h1Candles.slice(-30);
    candleDataText += '\n\n📊 بيانات شموع H1 (آخر 30 شمعة):\n';
    candleDataText += recentH1.map((c, i) => 
      `${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`
    ).join('\n');
  }
  
  if (m5Candles && m5Candles.length > 0) {
    const recentM5 = m5Candles.slice(-70);
    candleDataText += '\n\n📊 بيانات شموع M5 (آخر 70 شمعة):\n';
    candleDataText += recentM5.map((c, i) => 
      `${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`
    ).join('\n');
  }

  const userPrompt = `${systemInstruction}

═════════════════════════════════════
📌 مدخلات التحليل
═════════════════════════════════════
- الزوج: XAUUSD
- السعر الحالي: ${currentPrice}
- الجلسة: ${killzoneInfo.session}

الصورة 1: H1 (السياق العام)
الصورة 2: M5 (الدخول والتأكيد)
${candleDataText}

✅ حلل بحرية وأعط قرارك - JSON فقط بالعربية
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

    console.log("\n📊 نتيجة التحليل من AI:");
    const parsed = safeParseJson(data.content);
    console.log(`   القرار: ${parsed.decision || 'غير محدد'}`);
    console.log(`   التقييم: ${parsed.score || 0}/10`);
    console.log(`   الثقة: ${parsed.confidence || 0}%`);
    
    const validated = validateAndFix(parsed, currentPrice);
    validated.killzoneInfo = killzoneInfo;
    
    console.log("\n✅ نتيجة نهائية:");
    console.log(`   القرار: ${validated.decision}`);
    console.log(`   Score: ${validated.score}/10 | Confidence: ${validated.confidence}%`);
    console.log("═══════════════════════════════════════════════════════════════\n");
    
    return validated;
  } catch (error) {
    console.error("\n❌ خطأ في التحليل:", error);
    return createNoTradeResult(["❌ خطأ في الاتصال بالنموذج"]);
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

    const data = await callAIChat({
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `راجع الصفقة:
⏱️ ${minutesPassed} دقيقة
💰 السعر: ${currentPrice}
🎯 Entry: ${entry} | SL: ${sl} | TP1: ${tp1}

رد JSON:
{
  "shouldExit": true | false,
  "reason": "شرح بالعربية",
  "advice": "نصيحة"
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

    return {
      advice: parsed.advice || "استمر",
      shouldExit: parsed.shouldExit || false,
      reason: parsed.reason || ""
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
            text: `راقب الصفقة: ${trade.symbol} | دخول: ${trade.entryPrice} | الحالي: ${currentPrice}

رد JSON:
{
  "status": "HOLD" | "MOVE_TO_BE" | "PARTIAL_CLOSE" | "CLOSE_NOW",
  "reversalProbability": 0-100,
  "message": "شرح",
  "actionRequired": "الإجراء"
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
