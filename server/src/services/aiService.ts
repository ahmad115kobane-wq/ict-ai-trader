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
const MAX_SL_DISTANCE = 20;  // $20 maximum SL
const MIN_RR_RATIO = 1.5;    // Minimum Risk:Reward

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

// ===================== ICT Pro System Prompt =====================
export const systemInstruction = `
أنت محلل ICT محترف لتداول XAUUSD.
النظام يعمل بدون ذاكرة ويقوم بالتحليل كل 5 دقائق.
مهمتك: اتخاذ قرار فوري اعتمادًا على الحالة الحالية للسوق فقط (Snapshot).

⚠️ لا تفترض أي أحداث مستقبلية
⚠️ لا تنتظر تحقق شروط لاحقة
⚠️ كل الشروط يجب أن تكون واضحة الآن على الشارت

════════════════════
القواعد الأساسية
════════════════════

- التحليل لحظي فقط
- القرار يُتخذ من آخر 50–100 شمعة
- عدم وجود شرط = NO_TRADE
- الامتناع عن التداول قرار صحيح

════════════════════
1️⃣ تحديد الاتجاه (H1 – إلزامي)
════════════════════

- إذا كانت البنية صاعدة → شراء فقط
- إذا كانت البنية هابطة → بيع فقط
- إذا كان الاتجاه غير واضح → NO_TRADE

════════════════════
2️⃣ سحب السيولة (يجب أن يكون ظاهر الآن)
════════════════════

اعتبر سحب السيولة حاصل إذا وُجد حاليًا أحد التالي:

✔ Sweep واضح لقمم أو قيعان
✔ ذيول طويلة بعد كسر High / Low
✔ ابتلاع سعري بعد قمة أو قاع

- على فريم H1 أو M5
- داخلي أو خارجي
- يجب أن يكون واضح في الشارت الآن

❌ إذا لم يكن ظاهرًا بوضوح → NO_TRADE

════════════════════
3️⃣ منطقة الاهتمام POI (جاهزة حاليًا)
════════════════════

تحقق هل السعر الحالي أو قريب جدًا من:

✔ FVG غير مملوءة
✔ أو Order Block صالح

⚠️ لا تنتظر السعر يصل للمنطقة
⚠️ المنطقة يجب أن تكون قريبة من السعر الحالي

❌ إذا كانت بعيدة → NO_TRADE

════════════════════
4️⃣ التأكيد الفوري (واحد فقط)
════════════════════

بعد تحقق الاتجاه + السحب + POI اختر تأكيدًا واحدًا فقط:

✔ BOS مع اتجاه H1
✔ رفض سعري واضح من داخل FVG أو OB

❌ بدون تأكيد → NO_TRADE

════════════════════
5️⃣ الدخول
════════════════════

- دخول BUY_LIMIT أو SELL_LIMIT
- الدخول يكون داخل FVG أو Order Block
- ستوب خلف آخر High / Low منطقي

════════════════════
6️⃣ الأهداف
════════════════════

- TP1: أقرب سيولة مرئية
- TP2: سيولة وسطية أو فجوة
- TP3: سيولة خارجية واضحة

════════════════════
قرار التداول
════════════════════

✔ الاتجاه واضح
✔ سحب السيولة ظاهر الآن
✔ السعر داخل أو قريب من POI
✔ تأكيد واحد موجود

→ PLACE_PENDING

❌ غير ذلك → NO_TRADE

════════════════════
صيغة الإخراج (JSON فقط)
════════════════════

{
  "decision": "PLACE_PENDING" | "NO_TRADE",
  "score": 0-10,
  "confidence": 0-100,
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bias": "اتجاه H1",
  "reasoning": "سبب القرار باختصار",
  "suggestedTrade": {
    "type": "BUY_LIMIT" | "SELL_LIMIT",
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

// ===================== Enhanced Validator =====================
function validateAndFix(r: any, currentPrice: number): ICTAnalysis {
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
  const maxEntryDistance = currentPrice * 0.008; // 0.8%
  
  if (entryDistance > maxEntryDistance) {
    console.log(`   ❌ Entry بعيد جداً: ${entryDistance.toFixed(2)}$ (max: ${maxEntryDistance.toFixed(2)}$)`);
    return createNoTradeResult([`Entry بعيد: ${entryDistance.toFixed(1)}$ من السعر`], r);
  }

  // ═══════════════════════════════════════════════════════════
  // التحقق من SL وتصحيحه
  // ═══════════════════════════════════════════════════════════
  
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

  console.log(`   ✅ صفقة صالحة - RR جيد`);

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
  console.log("🔍 ICT Pro Analysis v6.0");
  console.log(`💰 السعر الحالي: ${currentPrice}`);
  console.log(`⏰ الجلسة: ${killzoneInfo.session} (${killzoneInfo.quality})`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const cleanH1 = h1Image.replace(/^data:image\/\w+;base64,/, "");
  const cleanM5 = m5Image.replace(/^data:image\/\w+;base64,/, "");

  // تحضير بيانات الشموع
  let candleDataText = '';
  
  if (h1Candles && h1Candles.length > 0) {
    const recentH1 = h1Candles.slice(-50);
    candleDataText += '\n\n📊 بيانات H1 (آخر 50 شمعة):\n';
    candleDataText += recentH1.map((c, i) =>
      `${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`
    ).join('\n');
  }

  if (m5Candles && m5Candles.length > 0) {
    const recentM5 = m5Candles.slice(-100);
    candleDataText += '\n\n📊 بيانات M5 (آخر 100 شمعة):\n';
    candleDataText += recentM5.map((c, i) =>
      `${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`
    ).join('\n');
  }

  const userPrompt = `${systemInstruction}

═══════════════════════════════════════
📈 بيانات السوق الحالية
═══════════════════════════════════════

الزوج: XAUUSD (الذهب)
السعر الحالي: ${currentPrice}
الجلسة: ${killzoneInfo.session}
جودة الجلسة: ${killzoneInfo.quality}

الصورة 1: شارت H1 (لتحديد الاتجاه)
الصورة 2: شارت M5 (لتحديد الدخول)
${candleDataText}

═══════════════════════════════════════
⚠️ تذكير مهم
═══════════════════════════════════════
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
      temperature: 0.1,
      max_tokens: 2500
    });

    const parsed = safeParseJson(data.content);
    console.log(`📋 قرار AI: ${parsed.decision || 'غير محدد'}`);

    const validated = validateAndFix(parsed, currentPrice);
    validated.killzoneInfo = killzoneInfo;

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
