// services/aiService.ts - Clean v5.0
// ═══════════════════════════════════════════════════════════════════════════════
// ✅ ICT AI Trader - Simple & Direct
// ═══════════════════════════════════════════════════════════════════════════════

import { ICTAnalysis, ManagementAdvice, KillzoneInfo } from "../types";

declare const process: any;

console.log("� aiService v5.0 loaded - Clean & Direct");

// ===================== API Config =====================
const API_KEY = process?.env?.OLLAMA_API_KEY || process?.env?.AI_API_KEY || "YOUR_API_KEY";
const BASE_URL = process?.env?.OLLAMA_BASE_URL || process?.env?.AI_BASE_URL || "https://api.openai.com";
const MODEL = process?.env?.OLLAMA_MODEL || process?.env?.AI_MODEL || "llama3.2-vision";

console.log(`� API Config: ${BASE_URL} | Model: ${MODEL}`);

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

export const systemInstruction = `
أنت محلل ICT محترف (Smart Money Concepts) متخصص في الذهب (XAUUSD).
مهمتك: البحث عن أفضل فرصة دخول ممكنة *الآن*.

════════════════════
🎯 الهدف الاستراتيجي
════════════════════
- ابحث عن "الصفقات ذات الاحتمالية العالية" (High Probability).
- لا تكتفِ بالبحث عن الانعكاس (Reversal) فقط.
- ابحث أيضاً عن "استمرار الاتجاه" (Continuation) إذا كان الزخم قوياً.
- الدخول مع "السيولة" (Smart Money Footprint) هو الأساس.

════════════════════
🔍 نماذج الدخول المقبولة (Entry Models)
════════════════════

1️⃣ نموذج الانعكاس (Reversal Model) - ⭐️ المفضل
- الشرط: سحب سيولة (Liquidity Sweep) لقمة/قاع سابق.
- التأكيد: كسر هيكل (MSS/BOS) + فجوة (FVG).
- الدخول: عند الارتداد إلى FVG أو Order Block.

2️⃣ نموذج الاستمرار (Continuation Model) - 🚀 لزيادة الصفقات
- الشرط: اتجاه H1 قوي وواضح (بدون Sweep).
- التأكيد: احترام مناطق PD Array (مثل Breaker Block أو Mitigation Block).
- الدخول: بعد تصحيح بسيط (Retracement) إلى منطقة خصم/علاوة (Discount/Premium).

3️⃣ نموذج النطاق (Range Model) - ↔️ للأسواق العرضية
- الشرط: السوق يتحرك في نطاق واضح على H1.
- الاستراتيجية: الشراء من القاع (Discount) والبيع من القمة (Premium).
- التأكيد: رفض واضح (Wick Rejection) عند حدود النطاق.

════════════════════
✅ شروط الدخول (Checklist)
════════════════════

يجب توفر 3 شروط على الأقل للموافقة:

1.  **اتجاه H1:** هل الصفقة مع الاتجاه العام؟ (إلزامي لنموذج الاستمرار)
2.  **المنطقة (POI):** السعر الآن عند منطقة اهتمام (FVG, OB, BB, Breaker) ؟
3.  **الوقت (Time):** هل نحن في فترة Killzone (لندن/نيويورك)؟ (+1 درجة)
4.  **التأكيد (Confirmation):** هل يوجد شمعة ابتلاعية (Engulfing) أو ذيل طويل (Rejection on M5)؟

⚠️ إذا كان السعر في "منطقة ميتة" (Dead Zone) أو حركة عشوائية -> NO_TRADE.

════════════════════
💰 إدارة الصفقة (Risk Management)
════════════════════

- **نقطة الدخول (Entry):**
  - إذا كان السعر *قريباً جداً* (أقل من 10 نقاط)، اقترح دخول مباشر (MARKET).
  - إذا كان بعيداً، ضع أمر معلق (LIMIT) عند أقرب FVG/OB.

- **وقف الخسارة (SL):**
  - تحت/فوق آخر قاع/قمة (Swing Point) بـ 10-20 نقطة.
  - لا تجعل الستوب ضيقاً جداً (تجنب Hunt).

- **الأهداف (TPs):**
  - TP1: أقرب سيولة داخلية (Internal Liquidity).
  - TP2: قمة/قاع ضعيف سابق.
  - TP3: سيولة خارجية (External Liquidity) أو منطقة عرض/طلب رئيسية.

════════════════════
📊 نظام التقييم (Score 0-10)
════════════════════

- **9-10:** فرصة مع (Sweep + Trend + Killzone). "دخول قوي".
- **7-8:** فرصة جيدة (Trend Continuation أو Reversal بدون Killzone).
- **5-6:** مخاطرة متوسطة (Scalping سريع).
- **0-4:** لا تتداول (NO_TRADE).

════════════════════
📝 صيغة الرد (JSON فقط)
════════════════════

يجب أن يكون الرد JSON صالحاً تماماً (بدون Markdown):

{
  "decision": "PLACE_PENDING" | "NO_TRADE",
  "score": 0-10,
  "confidence": 0-100,
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bias": "شرح اتجاه H1 باختصار",
  "reasoning": "لماذا اخترت هذه الصفقة؟ اشرح النموذج (Reversal/Continuation) والمنطقة.",
  "killzoneInfo": { "session": "London/NewYork/Asian/None", "isActive": boolean },
  "suggestedTrade": {
    "type": "BUY_LIMIT" | "SELL_LIMIT" | "BUY_MARKET" | "SELL_MARKET",
    "entry": number,
    "sl": number,
    "tp1": number,
    "tp2": number,
    "tp3": number
  }
}
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

// ===================== Validator =====================
function validateAndFix(r: any, currentPrice: number): ICTAnalysis {
  console.log("\n🔍 التحقق من البيانات...");

  r = r || {};
  r.reasons = Array.isArray(r.reasons) ? r.reasons : [];
  r.confluences = Array.isArray(r.confluences) ? r.confluences : [];
  r.score = Number(r.score) || 0;
  r.confidence = Number(r.confidence) || 0;

  if (r.decision !== "PLACE_PENDING" || !r.suggestedTrade) {
    console.log("   ℹ️ NO_TRADE");
    return createNoTradeResult(r.reasons.length > 0 ? r.reasons : ["لا توجد فرصة"], r);
  }

  const t = r.suggestedTrade;
  const isBuy = String(t.type || "").includes("BUY");

  console.log(`   ℹ️ ${t.type} @ ${t.entry}`);

  const entry = toNumber(t.entry);
  const sl = toNumber(t.sl);
  const tp1 = toNumber(t.tp1);
  const tp2 = toNumber(t.tp2);
  const tp3 = toNumber(t.tp3);

  if ([entry, sl, tp1, tp2, tp3].some(isNaN)) {
    console.log("   ❌ أرقام غير صالحة");
    return createNoTradeResult(["أرقام غير صالحة"], r);
  }

  const tradeType = String(t.type);

  if (tradeType === "BUY_LIMIT" && entry >= currentPrice) {
    const correctedEntry = currentPrice * 0.998;
    if (correctedEntry > sl) {
      t.entry = round2(correctedEntry);
    } else {
      return createNoTradeResult([`BUY_LIMIT يجب أن يكون أسفل السعر`], r);
    }
  }

  if (tradeType === "SELL_LIMIT" && entry <= currentPrice) {
    const correctedEntry = currentPrice * 1.002;
    if (correctedEntry < sl) {
      t.entry = round2(correctedEntry);
    } else {
      return createNoTradeResult([`SELL_LIMIT يجب أن يكون أعلى السعر`], r);
    }
  }

  if (isBuy) {
    if (!(sl < t.entry && t.entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
      return createNoTradeResult(["ترتيب مستويات الشراء خاطئ"], r);
    }
  } else {
    if (!(tp3 < tp2 && tp2 < tp1 && tp1 < t.entry && t.entry < sl)) {
      return createNoTradeResult(["ترتيب مستويات البيع خاطئ"], r);
    }
  }

  t.entry = round2(toNumber(t.entry));
  t.sl = round2(toNumber(t.sl));
  t.tp1 = round2(toNumber(t.tp1));
  t.tp2 = round2(toNumber(t.tp2));
  t.tp3 = round2(toNumber(t.tp3));

  const risk = Math.abs(t.entry - t.sl);
  const rr1 = Math.abs(t.tp1 - t.entry) / risk;
  const rr2 = Math.abs(t.tp2 - t.entry) / risk;
  const rr3 = Math.abs(t.tp3 - t.entry) / risk;
  t.rrRatio = `TP1: 1:${rr1.toFixed(1)} | TP2: 1:${rr2.toFixed(1)} | TP3: 1:${rr3.toFixed(1)}`;

  console.log(`   ✅ صفقة صالحة`);

  return r as ICTAnalysis;
}

// ===================== API Call =====================
async function callAIChat(payload: any): Promise<{ content: string }> {
  console.log("🔌 Connecting to AI...");

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
    console.error(`❌ API Error: ${response.status}`);
    throw new Error(`API Error: ${response.status}`);
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
  console.log("🔍 بدء التحليل - v5.0");
  console.log(`💰 السعر: ${currentPrice}`);
  console.log(`⏰ الجلسة: ${killzoneInfo.session}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const cleanH1 = h1Image.replace(/^data:image\/\w+;base64,/, "");
  const cleanM5 = m5Image.replace(/^data:image\/\w+;base64,/, "");

  let candleDataText = '';
  if (h1Candles && h1Candles.length > 0) {
    const recentH1 = h1Candles.slice(-100);
    candleDataText += '\n\nبيانات H1 (آخر 100):\n';
    candleDataText += recentH1.map((c, i) =>
      `${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`
    ).join('\n');
  }

  if (m5Candles && m5Candles.length > 0) {
    const recentM5 = m5Candles.slice(-220);
    candleDataText += '\n\nبيانات M5 (آخر 220):\n';
    candleDataText += recentM5.map((c, i) =>
      `${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`
    ).join('\n');
  }

  const userPrompt = `${systemInstruction}

XAUUSD
السعر: ${currentPrice}
الجلسة: ${killzoneInfo.session}

الصورة 1: H1
الصورة 2: M5
${candleDataText}

JSON فقط
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

    const parsed = safeParseJson(data.content);
    console.log(`   القرار: ${parsed.decision || 'غير محدد'}`);

    const validated = validateAndFix(parsed, currentPrice);
    validated.killzoneInfo = killzoneInfo;

    console.log(`   النتيجة: ${validated.decision}`);
    console.log("═══════════════════════════════════════════════════════════════\n");

    return validated;
  } catch (error) {
    console.error("\n❌ خطأ:", error);
    return createNoTradeResult(["خطأ في الاتصال"]);
  }
};

// ===================== Chat =====================
export const chatWithAI = async (
  message: string,
  analysis: ICTAnalysis | null,
  currentPrice: number
): Promise<string> => {
  const context = analysis
    ? `القرار: ${analysis.decision} | ${analysis.sentiment}`
    : "لا يوجد تحليل";

  try {
    const data = await callAIChat({
      messages: [{
        role: "user",
        content: `مساعد ICT
السعر: ${currentPrice}
${context}

سؤال: ${message}

أجب باختصار`
      }],
      temperature: 0.45,
      max_tokens: 400
    });

    return data.content || "عذراً";
  } catch {
    return "خطأ";
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
${minutesPassed} دقيقة
السعر: ${currentPrice}
Entry: ${entry} | SL: ${sl} | TP1: ${tp1}

JSON:
{
  "shouldExit": true | false,
  "reason": "شرح",
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
    return {
      advice: 'خطأ',
      shouldExit: false,
      reason: 'خطأ'
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
            text: `راقب: ${trade.symbol} | دخول: ${trade.entryPrice} | الحالي: ${currentPrice}

JSON:
{
  "status": "HOLD" | "MOVE_TO_BE" | "PARTIAL_CLOSE" | "CLOSE_NOW",
  "reversalProbability": 0-100,
  "message": "شرح",
  "actionRequired": "إجراء"
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
      message: "خطأ",
      actionRequired: "أعد المحاولة"
    };
  }
};
