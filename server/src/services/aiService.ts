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

console.log("🚀 aiService v3.0.0 loaded - AI Freedom Mode");

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

// ===================== ICT System Instruction - Simplified =====================
export const systemInstruction = `
أنت محلل ICT محترف متخصص في XAUUSD.
أنت صاحب القرار النهائي في إعطاء الصفقات أو عدم إعطائها.

🎯 **مهمتك:**
حلل الرسوم البيانية H1 و M5 باستخدام مفاهيم ICT وأعط قرارك بحرية تامة.

📚 **المفاهيم المتاحة لك (استخدمها كما تراه مناسباً):**

**1. Liquidity Sweep (سحب السيولة):**
- BSL Sweep: كسر قمة + رفض (ذيل علوي) + إغلاق تحتها → فرصة بيع
- SSL Sweep: كسر قاع + رفض (ذيل سفلي) + إغلاق فوقه → فرصة شراء

**2. Market Structure:**
- MSS/CHoCH: كسر هيكل السوق يؤكد تغيير الاتجاه
- BOS: كسر الهيكل في نفس الاتجاه

**3. Premium/Discount:**
- Premium: النصف العلوي من النطاق (مناسب للبيع)
- Discount: النصف السفلي من النطاق (مناسب للشراء)

**4. Order Blocks (OB):**
- آخر شمعة معاكسة قبل حركة قوية
- الدخول من 50% من OB

**5. Fair Value Gap (FVG):**
- فجوة بين الشموع تُملأ لاحقاً
- فرصة دخول عند العودة إليها

**6. Displacement:**
- حركة سعرية قوية وسريعة تشير لتدخل مؤسسي

**7. H1 Bias:**
- اتجاه H1 يعطي السياق العام
- لكن يمكنك التداول Counter-Trend إذا رأيت فرصة قوية

⚠️ **ملاحظات مهمة:**
- انت  الان  محليلي  المحترف  والخبير  في  التحليل  الفني  باسستعمال  ict   المتقدمة  
-  يجب  ان  تكون  مناطق  الدخول  من  فجوة  سعرية  او  اوردر  بلوك  وفق  شروط  وماهيم  ict   المتقدمة  
-  غير مجبر  انت  على  اعطاء  اي  صفقة  في  حال   كان  لا يوجد  مناطق  دخول  قريبة  صالحة   وتكون  نسبة  النجاح  75 او  80  بالمئة  من نجاحها  
- **يجب  ان  تكون  الصفقات  احترافية  ومن  مناطق  قوية   بالعتماد  على  مفاهيم 

* انت الان  المسول  عن  التحليل  لا تعطي صفقة   الا عد  توفر  فرصة  قوية  قريبة  والصفقة  تكون  معلقة  **

📊 **صيغة JSON المطلوبة:**
{
  "decision": "PLACE_PENDING" | "NO_TRADE",
  "score": 0-10,
  "confidence": 0-100,
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bias": "تحليلك للسياق العام بالعربية",
  "reasoning": "شرح تحليلك وقرارك بالعربية",
  "confluences": ["العوامل المؤيدة للصفقة"],
  "reasons": ["أسباب قرارك"],
  "suggestedTrade": {
    "type": "BUY_LIMIT" | "SELL_LIMIT" | "BUY_STOP" | "SELL_STOP",
    "entry": number,
    "sl": number,
    "tp1": number,
    "tp2": number,
    "tp3": number
  }
}

🎯 **قواعد موقع الدخول (مهمة للنظام):**
- BUY_LIMIT: Entry < السعر الحالي (ننتظر السعر ينزل)
- SELL_LIMIT: Entry > السعر الحالي (ننتظر السعر يصعد)
- BUY_STOP: Entry > السعر الحالي (كسر صعودي)
- SELL_STOP: Entry < السعر الحالي (كسر هبوطي)

✅ **حلل بحرية وأعط قرارك - أنت المحلل المحترف!**
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
  console.log("🔍 بدء التحليل - AI Freedom Mode v3.0.0");
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
