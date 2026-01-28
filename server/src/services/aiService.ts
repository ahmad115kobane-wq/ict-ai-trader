// services/aiService.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ✅ ICT AI Trader - Professional Analysis Service
// ═══════════════════════════════════════════════════════════════════════════════
// 📌 Version: 2.3.0 - Enhanced ICT Analysis with Smart Entry Positioning
// 
// 🔧 التحسينات في هذه النسخة (v2.3.0):
// - ✅ تصحيح تلقائي لموقع سعر الدخول (BUY_LIMIT أسفل السعر، SELL_LIMIT أعلى السعر)
// - ✅ التحقق الصارم من موقع الدخول بناءً على مفاهيم ICT الحقيقية
// - ✅ دمج منطقة الدخول (FVG/OB) مع تصحيح السعر التلقائي
// - توافق الاتجاه مع H1 (HTF Alignment) إلزامي
// - نظام Killzone/Session للتداول في أوقات نشطة
// - تصنيف قوة Order Blocks (STRONG/MEDIUM/WEAK)
// - معايير متوازنة (ليست صارمة جداً ولا متساهلة)
// - الدخول بعد التأكيد (MSS/CHoCH) وليس قبله
// - تحليل مفصل بالعربية
// 
// ✅ تحليل متكامل: H1 للسياق والاتجاه + M5 للدخول والتأكيد
// ✅ سحب السيولة + MSS إلزامي قبل الدخول
// ✅ الدخول من Order Block قوي أو FVG متميز
// ✅ تصحيح ذكي لسعر الدخول ليكون في المنطقة الصحيحة
// ═══════════════════════════════════════════════════════════════════════════════

import { ICTAnalysis, ManagementAdvice, KillzoneInfo } from "../types";

// ===================== Environment Variables =====================
declare const process: any;

console.log("🚀 aiService v2.3.0 loaded - Enhanced ICT Analysis with Smart Entry Positioning");

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
// 🔧 معايير محسّنة للحصول على إشارات أكثر موثوقية
// 📌 هذه المعايير أكثر صرامة قليلاً من السابقة لتصفية الإشارات الضعيفة

// Type for OB strength
type OBStrength = 'STRONG' | 'MEDIUM' | 'WEAK';

const VALIDATION_OPTIONS: {
  maxDistancePercent: number;
  minRR: number;
  minScore: number;
  minConfidence: number;
  minConfluences: number;
  maxM5CandlesAgo: number;
  requireKillzone: boolean;
  requireHTFAlignment: boolean;
  obMinStrength: OBStrength;
  killzonePenalty: number;
  neutralH1Penalty: number;
} = {
  maxDistancePercent: 0.012,  // 1.2% حد أقصى للمسافة (لدخول أقرب للسعر الحالي)
  minRR: 1.8,                 // نسبة مخاطرة/عائد أدنى (1:1.8 - جيدة للذهب)
  minScore: 6.0,              // تقييم أدنى (6/10 - يتطلب معظم الشروط)
  minConfidence: 65,          // ثقة أدنى (65% - موثوقية جيدة)
  minConfluences: 2,          // تلاقيات أدنى (على الأقل عاملين متوافقين)
  maxM5CandlesAgo: 15,        // أقصى عدد شموع لسحب M5 (15 شمعة = ساعة و15 دقيقة)
  requireKillzone: true,      // تحذير إذا كان خارج Killzone (لا يرفض)
  requireHTFAlignment: true,  // يجب توافق الاتجاه مع H1 (يرفض إذا معاكس)
  obMinStrength: 'MEDIUM',    // الحد الأدنى لقوة Order Block
  killzonePenalty: 0.5,       // خصم من Score عند خارج Killzone
  neutralH1Penalty: 1.0       // خصم من Score عند H1 محايد
};

console.log("⚙️ Validation Options (Enhanced v2.2):", JSON.stringify(VALIDATION_OPTIONS, null, 2));

// ===================== Killzone / Session Management =====================
// 📌 أوقات الجلسات الرئيسية (بتوقيت UTC)
// يُعد الدخول خلال هذه الأوقات أكثر أماناً بسبب حجم التداول العالي
// ⚠️ ملاحظة: الأوقات ثابتة ولا تراعي التوقيت الصيفي (DST)

/**
 * الحصول على معلومات الـ Killzone الحالية
 * @returns معلومات الجلسة الحالية وجودتها
 */
function getCurrentKillzone(): KillzoneInfo {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const totalMinutes = utcHour * 60 + utcMinute;
  
  // تعريف أوقات الجلسات (بالدقائق من بداية اليوم UTC)
  const sessions = {
    // جلسة آسيا: 00:00 - 03:00 UTC
    ASIA: { start: 0, end: 180, quality: 'MEDIUM' as const },
    // جلسة لندن: 07:00 - 10:00 UTC (أفضل وقت)
    LONDON: { start: 420, end: 600, quality: 'HIGH' as const },
    // جلسة نيويورك الصباحية: 12:00 - 15:00 UTC (ممتاز)
    NY_AM: { start: 720, end: 900, quality: 'HIGH' as const },
    // جلسة نيويورك المسائية: 15:00 - 18:00 UTC
    NY_PM: { start: 900, end: 1080, quality: 'MEDIUM' as const }
  };
  
  // تحديد الجلسة الحالية
  for (const [sessionName, session] of Object.entries(sessions)) {
    if (totalMinutes >= session.start && totalMinutes < session.end) {
      const minutesToEnd = session.end - totalMinutes;
      return {
        isActive: true,
        session: sessionName as KillzoneInfo['session'],
        quality: session.quality,
        minutesToEnd,
        description: getSessionDescription(sessionName as KillzoneInfo['session'])
      };
    }
  }
  
  // خارج أوقات التداول النشطة
  return {
    isActive: false,
    session: 'OFF_HOURS',
    quality: 'LOW',
    minutesToEnd: 0,
    description: '⚠️ خارج أوقات التداول النشطة - يُنصح بالانتظار'
  };
}

/**
 * الحصول على وصف الجلسة بالعربية
 */
function getSessionDescription(session: KillzoneInfo['session']): string {
  const descriptions: Record<KillzoneInfo['session'], string> = {
    ASIA: '🌏 جلسة آسيا - حجم تداول متوسط',
    LONDON: '🇬🇧 جلسة لندن - أفضل وقت للتداول (حجم عالي)',
    NY_AM: '🇺🇸 جلسة نيويورك الصباحية - ممتازة للتداول',
    NY_PM: '🇺🇸 جلسة نيويورك المسائية - حجم تداول جيد',
    OFF_HOURS: '⚠️ خارج أوقات التداول النشطة'
  };
  return descriptions[session];
}

// ===================== Order Block Rating System =====================
// 📌 نظام تقييم كتل الأوامر (Order Blocks)

interface OBRating {
  strength: 'STRONG' | 'MEDIUM' | 'WEAK';
  score: number; // 0-10
  factors: string[];
}

/**
 * تقييم قوة Order Block
 * @param obDetails تفاصيل الـ OB من التحليل
 * @param priceLocation موقع السعر الحالي
 * @param hasLiquiditySweep هل حدث سحب سيولة
 */
function rateOrderBlock(obDetails: any, priceLocation: string, hasLiquiditySweep: boolean): OBRating {
  const factors: string[] = [];
  let score = 5; // نقطة بداية
  
  if (!obDetails || !obDetails.exists) {
    return { strength: 'WEAK', score: 0, factors: ['❌ لا يوجد OB'] };
  }
  
  // 1. هل تم اختباره سابقاً؟ (OB الجديد أفضل)
  if (obDetails.hasBeenTested === false) {
    score += 2;
    factors.push('✅ OB جديد لم يُختبر');
  } else {
    score -= 1;
    factors.push('⚠️ OB تم اختباره سابقاً');
  }
  
  // 2. هل هو Breaker Block؟ (سلبي - يعني تم كسره)
  if (obDetails.isBreaker === true) {
    score -= 3;
    factors.push('❌ تحول إلى Breaker Block');
  }
  
  // 3. عمر الـ OB (كلما كان حديثاً كان أفضل)
  const candlesAgo = obDetails.candlesAgo || 100;
  if (candlesAgo <= 20) {
    score += 2;
    factors.push('✅ OB حديث (< 20 شمعة)');
  } else if (candlesAgo <= 50) {
    score += 1;
    factors.push('✅ OB في نطاق جيد (< 50 شمعة)');
  } else if (candlesAgo > 100) {
    score -= 1;
    factors.push('⚠️ OB قديم (> 100 شمعة)');
  }
  
  // 4. توافق الموقع السعري مع نوع OB
  if (obDetails.type === 'BULLISH' && priceLocation === 'DISCOUNT') {
    score += 1;
    factors.push('✅ OB صعودي في منطقة Discount');
  } else if (obDetails.type === 'BEARISH' && priceLocation === 'PREMIUM') {
    score += 1;
    factors.push('✅ OB هبوطي في منطقة Premium');
  }
  
  // 5. وجود سحب سيولة قبل الوصول للـ OB
  if (hasLiquiditySweep) {
    score += 1;
    factors.push('✅ سحب سيولة قبل OB');
  }
  
  // 6. هل الـ OB صالح حسب التحليل
  if (obDetails.isValid === true) {
    score += 1;
    factors.push('✅ OB صالح للدخول');
  }
  
  // تحديد القوة بناءً على المجموع
  const strength = score >= 8 ? 'STRONG' : score >= 5 ? 'MEDIUM' : 'WEAK';
  
  return { strength, score: Math.max(0, Math.min(10, score)), factors };
}

// ===================== ICT System Instruction =====================
// 📌 v2.2.0 - تحليل محسّن مع توافق الاتجاه والجلسات
export const systemInstruction = `
أنت "ICT Professional Analyzer" متخصص XAUUSD - تحليل مؤسسي متوازن وموثوق.
⚠️ يجب أن تكون جميع النصوص بالعربية فقط.
⚠️ يجب أن ترد بصيغة JSON فقط بدون أي نص خارجي.

🎯 المبدأ الأساسي: تحليل موثوق متوافق مع الاتجاه + دخول من مناطق قوية بعد التأكيد

═══════════════════════════════════════════════════════════════
(0) الشرط الصفر - توافق الاتجاه مع H1 (أهم شرط)
═══════════════════════════════════════════════════════════════
🔴 يجب أن يتوافق اتجاه الصفقة مع اتجاه H1 الرئيسي

✅ قواعد التوافق:
- إذا كان H1 صاعد (Higher Highs + Higher Lows) → ابحث عن شراء فقط
- إذا كان H1 هابط (Lower Highs + Lower Lows) → ابحث عن بيع فقط
- إذا كان H1 متذبذب → انتظر تحديد اتجاه واضح أو تداول Counter-Trend بحذر

🔍 كيفية تحديد اتجاه H1:
1. انظر لآخر 20-50 شمعة على H1
2. حدد القمم والقيعان الرئيسية
3. إذا القمم والقيعان ترتفع = صعودي
4. إذا القمم والقيعان تنخفض = هبوطي

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
(2) الشرط الثاني - كسر الهيكل MSS/CHoCH إلزامي بعد السحب
═══════════════════════════════════════════════════════════════
🔴 هذا شرط التأكيد - الدخول بعد الكسر فقط

❌ ممنوع الدخول من ارتداد السيولة فقط (قبل التأكيد)
✅ يجب كسر هيكل السوق (MSS/CHoCH) بعد السحب ثم الدخول

📌 ما هو MSS (Market Structure Shift):
- كسر واضح لآخر قمة/قاع مهم
- يؤكد تغيير الاتجاه قصير المدى
- يعطي تأكيد للدخول

للشراء:
- يجب كسر آخر Lower High على M5
- إغلاق واضح فوقه
- انتظار عودة السعر للـ FVG أو OB

للبيع:
- يجب كسر آخر Higher Low على M5
- إغلاق واضح تحته
- انتظار عودة السعر للـ FVG أو OB

⚠️ CHoCH (Change of Character) مقبول أيضاً
❌ BOS (Break of Structure) العادي = غير كافٍ للدخول
❌ لم يحدث MSS/CHoCH بعد السحب = NO_TRADE

═══════════════════════════════════════════════════════════════
(3) الشرط الثالث - Displacement حقيقي (إزاحة سعرية قوية)
═══════════════════════════════════════════════════════════════
❌ ارفض أي حركة بطيئة أو متذبذبة

المقبول فقط:
✅ شمعة أو أكثر بجسم كبير (أكبر من المتوسط)
✅ إغلاق قوي في اتجاه الحركة
✅ خلق FVG واضح
✅ حركة سريعة في اتجاه واحد

❌ WEAK Displacement = NO_TRADE (يجب MODERATE أو STRONG)

═══════════════════════════════════════════════════════════════
(4) الشرط الرابع - الدخول من Order Block قوي أو FVG متميز
═══════════════════════════════════════════════════════════════
🔴 هذا شرط إلزامي - الدخول يجب أن يكون من منطقة قوية

❌ لا تدخل من مستوى أفقي فقط
❌ لا تدخل من رقم دائري فقط
❌ ارتداد من سعر عشوائي = مرفوض

✅ Order Block القوي (المفضل للدخول):
   - آخر شمعة معاكسة قبل الحركة القوية (Displacement)
   - يجب ألا يكون قد تم اختباره سابقاً (Fresh OB)
   - الدخول من 50% من OB (مستوى التخفيف)
   - OB حديث (< 50 شمعة) أفضل من القديم

📊 تصنيف قوة Order Block:
   - STRONG: لم يُختبر + حديث + مع FVG = أفضل دخول
   - MEDIUM: تم اختباره مرة أو حديث بدون FVG = مقبول
   - WEAK: قديم أو تم اختباره عدة مرات = تجنب

✅ FVG (Fair Value Gap) - فجوة القيمة العادلة:
   - تتكون عندما يكون هناك فجوة بين ذيل الشمعة الأولى وذيل الشمعة الثالثة
   - الشمعة الثانية تخلق حركة قوية (Displacement)
   - Bullish FVG: فجوة صعودية - ندخل شراء عند عودة السعر إليها
   - Bearish FVG: فجوة هبوطية - ندخل بيع عند عودة السعر إليها
   - نقطة الدخول المثالية: منتصف الفجوة (50%)
   - يجب ألا تكون الفجوة قد تم ملؤها بالكامل (fillPercentage < 80%)

✅ OB (Order Block) - كتلة الأوامر:
   - آخر شمعة معاكسة قبل الحركة القوية (Displacement)
   - Bullish OB: آخر شمعة هابطة قبل صعود قوي - ندخل شراء من منطقتها
   - Bearish OB: آخر شمعة صاعدة قبل هبوط قوي - ندخل بيع من منطقتها
   - نقطة الدخول المثالية: 50% من OB (mitigationLevel)
   - يجب ألا يكون OB تم كسره (isBreaker = false)

✅ FVG داخل OB (الأفضل):
   - عندما توجد FVG داخل منطقة OB = إشارة قوية جداً
   - نقطة الدخول: منتصف FVG
   - هذا يعطي أعلى درجة ثقة

🔍 كيفية تحديد منطقة الدخول:
1. ابحث عن FVG في منطقة الـ Discount (للشراء) أو Premium (للبيع)
2. ابحث عن OB لم يتم اختباره بعد
3. إذا وجدت FVG داخل OB = الأفضل
4. حدد نقطة الدخول عند منتصف المنطقة

═══════════════════════════════════════════════════════════════
(5) الشرط الخامس - الموقع السعري
═══════════════════════════════════════════════════════════════
❌ لا شراء في Premium
❌ لا بيع في Discount

✅ BUY → Discount فقط (السعر تحت 50% من النطاق)
✅ SELL → Premium فقط (السعر فوق 50% من النطاق)
⚠️ MID → حذر - يمكن القبول مع تلاقيات قوية

═══════════════════════════════════════════════════════════════
(6) صيغة JSON الإلزامية - v2.2
═══════════════════════════════════════════════════════════════
{
  "decision": "PLACE_PENDING" | "NO_TRADE",
  "score": 0-10,
  "confidence": 0-100,
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "bias": "وصف سياق H1 بالعربية",
  "priceLocation": "PREMIUM" | "DISCOUNT" | "MID",
  "htfAlignment": true | false,
  "h1Analysis": {
    "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
    "trendStrength": "STRONG" | "MODERATE" | "WEAK",
    "allowBuy": true | false,
    "allowSell": true | false,
    "liquiditySweep": "وصف السحب على H1 أو 'لم يحدث'",
    "nearestBSL": "وصف/سعر",
    "nearestSSL": "وصف/سعر",
    "structureDescription": "وصف هيكل H1 بالعربية"
  },
  "m5Analysis": {
    "marketStructure": "MSS" | "CHoCH" | "BOS" | "CONSOLIDATION",
    "mssOccurredAfterSweep": true | false,
    "displacement": "STRONG" | "MODERATE" | "WEAK",
    "pdArray": "FVG" | "OB" | "FVG_IN_OB" | "NONE",
    "readyForEntry": true | false,
    "obStrength": "STRONG" | "MEDIUM" | "WEAK",
    "fvgDetails": {
      "exists": true | false,
      "type": "BULLISH" | "BEARISH" | "NONE",
      "topPrice": number,
      "bottomPrice": number,
      "midPrice": number,
      "isFilled": true | false,
      "fillPercentage": 0-100,
      "candlesAgo": number,
      "isValid": true | false
    },
    "obDetails": {
      "exists": true | false,
      "type": "BULLISH" | "BEARISH" | "NONE",
      "topPrice": number,
      "bottomPrice": number,
      "mitigationLevel": number,
      "isBreaker": true | false,
      "candlesAgo": number,
      "hasBeenTested": true | false,
      "isValid": true | false,
      "strength": "STRONG" | "MEDIUM" | "WEAK"
    },
    "entryZone": {
      "type": "FVG" | "OB" | "FVG_IN_OB" | "NONE",
      "topPrice": number,
      "bottomPrice": number,
      "optimalEntry": number,
      "isValid": true | false,
      "description": "وصف منطقة الدخول بالعربية"
    }
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
  "reasoning": "شرح مفصل بالعربية يوضح التحليل",
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

═══════════════════════════════════════════════════════════════
(7) قواعد حاسمة لموقع الدخول - ICT CORE CONCEPT
═══════════════════════════════════════════════════════════════
🔴 هذا الشرط إلزامي ولا يقبل استثناء:

✅ BUY_LIMIT: يجب أن يكون سعر الدخول أقل من السعر الحالي
   - لماذا؟ لأننا ننتظر السعر أن ينزل إلى منطقة Discount (FVG/OB) ثم نشتري
   - Entry < Current Price (إلزامي)
   - الدخول في Bullish FVG أو Bullish OB تحت السعر الحالي

✅ SELL_LIMIT: يجب أن يكون سعر الدخول أكبر من السعر الحالي
   - لماذا؟ لأننا ننتظر السعر أن يصعد إلى منطقة Premium (FVG/OB) ثم نبيع
   - Entry > Current Price (إلزامي)
   - الدخول في Bearish FVG أو Bearish OB فوق السعر الحالي

⚠️ مثال عملي:
   - السعر الحالي: 2660
   - للشراء: ابحث عن FVG/OB بين 2640-2650 (أسفل السعر) → BUY_LIMIT = 2645
   - للبيع: ابحث عن FVG/OB بين 2670-2680 (فوق السعر) → SELL_LIMIT = 2675

❌ خطأ شائع: وضع BUY_LIMIT فوق السعر أو SELL_LIMIT تحت السعر = مرفوض فوراً

📌 ملاحظات مهمة للتحليل:
- htfAlignment = true يعني أن اتجاه الصفقة يتوافق مع H1
- obStrength يحدد قوة الـ Order Block المختار
- trendStrength يحدد قوة الاتجاه على H1

🔴 تذكر: إذا لم تجد Sweep واضح أو لم يتوافق الاتجاه أو موقع الدخول خاطئ = NO_TRADE
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

// 7. التحقق من PD Array (FVG أو OB) - شرط إلزامي للدخول
function validatePDArray(r: any): ValidationResult {
  const reasons: string[] = [];
  const m5 = r.m5Analysis || {};
  const pdArray = m5.pdArray || "NONE";
  const entryZone = m5.entryZone || {};
  const fvgDetails = m5.fvgDetails || {};
  const obDetails = m5.obDetails || {};
  
  // التحقق من وجود رفض قوي كبديل
  const h1WickReject = r.liquidityPurge?.h1Sweep?.evidence?.wickRejection === true;
  const m5WickReject = r.liquidityPurge?.m5InternalSweep?.evidence?.wickRejection === true;
  const hasStrongReject = h1WickReject || m5WickReject;
  
  // ✅ التحقق من وجود منطقة دخول صالحة (FVG أو OB)
  if (pdArray === "NONE" || pdArray === undefined) {
    // لا يوجد FVG أو OB
    if (hasStrongReject) {
      // تحذير لكن مقبول بشرط وجود رفض قوي
      reasons.push("⚠️ لا يوجد FVG أو OB واضح - لكن يوجد رفض قوي (مقبول بحذر)");
      // تخفيض Score بسبب غياب منطقة الدخول المحددة
      if (r.score !== undefined) r.score = Math.max(r.score - 1, 0);
      if (r.confidence !== undefined) r.confidence = Math.max(r.confidence - 10, 0);
    } else {
      reasons.push("❌ لا يوجد FVG أو OB للدخول - شرط إلزامي غير متوفر");
      return { isValid: false, reasons };
    }
  }
  
  // ✅ التحقق من تفاصيل FVG إذا كان pdArray يتطلب FVG
  if (pdArray === "FVG" || pdArray === "FVG_IN_OB") {
    // التحقق من وجود تفاصيل FVG
    if (!fvgDetails.exists) {
      // عند عدم وجود تفاصيل، نتحقق من وجود رفض قوي كبديل
      if (!hasStrongReject) {
        reasons.push(`⚠️ pdArray = ${pdArray} لكن لا توجد تفاصيل FVG - تحذير`);
        if (r.score !== undefined) r.score = Math.max(r.score - 0.5, 0);
      }
    } else {
      // التحقق من صحة FVG
      if (fvgDetails.isFilled === true || (fvgDetails.fillPercentage && fvgDetails.fillPercentage >= 80)) {
        reasons.push("❌ FVG تم ملؤها بالكامل (fillPercentage >= 80%) - غير صالحة للدخول");
        return { isValid: false, reasons };
      }
      
      if (fvgDetails.candlesAgo && fvgDetails.candlesAgo > 50) {
        reasons.push("⚠️ FVG قديمة (> 50 شمعة) - صلاحية منخفضة");
        if (r.score !== undefined) r.score = Math.max(r.score - 0.5, 0);
      }
      
      if (fvgDetails.isValid === false) {
        reasons.push("❌ FVG غير صالحة للدخول حسب التحليل");
        return { isValid: false, reasons };
      }
      
      // إضافة تفاصيل FVG للأسباب
      const fvgType = fvgDetails.type === "BULLISH" ? "صعودية" : "هبوطية";
      reasons.push(`✅ FVG ${fvgType} صالحة: ${fvgDetails.bottomPrice?.toFixed(2)} - ${fvgDetails.topPrice?.toFixed(2)}`);
    }
  }
  
  // ✅ التحقق من تفاصيل OB إذا كان pdArray يتطلب OB
  if (pdArray === "OB" || pdArray === "FVG_IN_OB") {
    // التحقق من وجود تفاصيل OB
    if (!obDetails.exists) {
      // عند عدم وجود تفاصيل، نتحقق من وجود رفض قوي كبديل
      if (!hasStrongReject) {
        reasons.push(`⚠️ pdArray = ${pdArray} لكن لا توجد تفاصيل OB - تحذير`);
        if (r.score !== undefined) r.score = Math.max(r.score - 0.5, 0);
      }
    } else {
      // التحقق من صحة OB
      if (obDetails.isBreaker === true) {
        reasons.push("❌ OB تحول إلى Breaker Block - غير صالح للدخول");
        return { isValid: false, reasons };
      }
      
      if (obDetails.hasBeenTested === true) {
        reasons.push("⚠️ OB تم اختباره سابقاً - صلاحية منخفضة");
        if (r.score !== undefined) r.score = Math.max(r.score - 0.5, 0);
      }
      
      if (obDetails.candlesAgo && obDetails.candlesAgo > 100) {
        reasons.push("⚠️ OB قديم (> 100 شمعة) - صلاحية منخفضة");
        if (r.score !== undefined) r.score = Math.max(r.score - 0.5, 0);
      }
      
      if (obDetails.isValid === false) {
        reasons.push("❌ OB غير صالح للدخول حسب التحليل");
        return { isValid: false, reasons };
      }
      
      // إضافة تفاصيل OB للأسباب
      const obType = obDetails.type === "BULLISH" ? "صعودي" : "هبوطي";
      reasons.push(`✅ OB ${obType} صالح: ${obDetails.bottomPrice?.toFixed(2)} - ${obDetails.topPrice?.toFixed(2)}`);
    }
  }
  
  // ✅ التحقق الخاص بـ FVG_IN_OB - يجب أن يكون كلاهما موجوداً
  if (pdArray === "FVG_IN_OB") {
    if (!fvgDetails.exists || !obDetails.exists) {
      reasons.push("⚠️ FVG_IN_OB يتطلب وجود كل من FVG و OB - أحدهما مفقود");
      if (r.score !== undefined) r.score = Math.max(r.score - 0.5, 0);
    } else {
      reasons.push("⭐ FVG داخل OB = إشارة قوية جداً");
      if (r.score !== undefined) r.score = Math.min(r.score + 0.5, 10);
      if (r.confidence !== undefined) r.confidence = Math.min(r.confidence + 5, 100);
    }
  }
  
  // ✅ التحقق من منطقة الدخول إذا كانت محددة (معلومات إضافية)
  if (entryZone.isValid === true) {
    const zoneType = entryZone.type === "FVG" ? "FVG" : 
                     entryZone.type === "OB" ? "OB" : 
                     entryZone.type === "FVG_IN_OB" ? "FVG داخل OB" : "غير محدد";
    reasons.push(`✅ منطقة الدخول: ${zoneType} - ${entryZone.description || ''}`);
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

// 10. التحقق من Killzone (جلسة التداول)
// 📌 يُطبق خصم على Score إذا كان خارج Killzone
function validateKillzone(r: any): ValidationResult {
  const reasons: string[] = [];
  
  // الحصول على معلومات الجلسة الحالية
  const killzone = getCurrentKillzone();
  
  // إذا كان التحقق من Killzone مفعل في الإعدادات
  if (VALIDATION_OPTIONS.requireKillzone) {
    if (!killzone.isActive) {
      reasons.push(`⚠️ خارج أوقات التداول النشطة - ${killzone.description}`);
      // تطبيق خصم على Score
      if (r.score !== undefined) {
        r.score = Math.max(r.score - VALIDATION_OPTIONS.killzonePenalty, 0);
        reasons.push(`📉 تم خصم ${VALIDATION_OPTIONS.killzonePenalty} من التقييم`);
      }
      return { isValid: true, reasons }; // تحذير فقط، لا نرفض
    }
    
    if (killzone.quality === 'LOW') {
      reasons.push(`⚠️ جودة الجلسة منخفضة - ${killzone.description}`);
      // خصم أقل لجودة منخفضة
      if (r.score !== undefined) {
        r.score = Math.max(r.score - (VALIDATION_OPTIONS.killzonePenalty * 0.5), 0);
      }
    } else if (killzone.quality === 'HIGH') {
      reasons.push(`✅ جلسة ممتازة للتداول - ${killzone.description}`);
    } else {
      reasons.push(`✅ جلسة جيدة للتداول - ${killzone.description}`);
    }
    
    // تحذير إذا كان الوقت المتبقي قليل
    if (killzone.minutesToEnd < 30) {
      reasons.push(`⚠️ تبقى ${killzone.minutesToEnd} دقيقة على انتهاء الجلسة`);
    }
  }
  
  return { isValid: true, reasons };
}

// 11. التحقق من توافق الاتجاه مع H1 (HTF Alignment)
// 📌 يرفض إذا كان الاتجاه معاكس، ويخصم من Score إذا محايد
function validateHTFAlignment(r: any, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  const h1 = r.h1Analysis || {};
  
  // إذا كان التحقق من HTF Alignment مفعل في الإعدادات
  if (VALIDATION_OPTIONS.requireHTFAlignment) {
    const h1Bias = h1.bias || "NEUTRAL";
    const htfAlignment = r.htfAlignment;
    
    // التحقق من توافق الاتجاه
    if (isBuy && h1Bias === "BEARISH") {
      reasons.push("❌ محاولة شراء ضد اتجاه H1 الهابط - خطر عالي");
      return { isValid: false, reasons };
    }
    
    if (!isBuy && h1Bias === "BULLISH") {
      reasons.push("❌ محاولة بيع ضد اتجاه H1 الصاعد - خطر عالي");
      return { isValid: false, reasons };
    }
    
    // تطبيق خصم إذا كان H1 محايد
    if (h1Bias === "NEUTRAL") {
      reasons.push("⚠️ H1 محايد - الصفقة مقبولة لكن بحذر");
      // تطبيق خصم على Score
      if (r.score !== undefined) {
        r.score = Math.max(r.score - VALIDATION_OPTIONS.neutralH1Penalty, 0);
        reasons.push(`📉 تم خصم ${VALIDATION_OPTIONS.neutralH1Penalty} من التقييم بسبب H1 محايد`);
      }
      if (r.confidence !== undefined) {
        r.confidence = Math.max(r.confidence - 10, 0);
      }
    }
    
    // مكافأة إذا كان التوافق قوي
    if (htfAlignment === true) {
      reasons.push("✅ توافق قوي مع اتجاه H1");
    }
    
    // التحقق من قوة الاتجاه
    const trendStrength = h1.trendStrength || "WEAK";
    if (trendStrength === "STRONG") {
      reasons.push("✅ قوة اتجاه H1 ممتازة");
    } else if (trendStrength === "WEAK") {
      reasons.push("⚠️ قوة اتجاه H1 ضعيفة - انتبه للانعكاسات");
    }
  }
  
  return { isValid: true, reasons };
}

// 12. التحقق من قوة Order Block
function validateOrderBlockStrength(r: any): ValidationResult {
  const reasons: string[] = [];
  const m5 = r.m5Analysis || {};
  const obDetails = m5.obDetails || {};
  const pdArray = m5.pdArray || "NONE";
  
  // إذا كان الدخول من OB، تحقق من قوته
  if (pdArray === "OB" || pdArray === "FVG_IN_OB") {
    if (!obDetails.exists) {
      // سبق التحقق في validatePDArray
      return { isValid: true, reasons };
    }
    
    // حساب قوة OB
    const hasLiquiditySweep = r.liquidityPurge?.h1Sweep?.occurred === true || 
                              r.liquidityPurge?.m5InternalSweep?.occurred === true;
    const priceLocation = r.priceLocation || "MID";
    
    const obRating = rateOrderBlock(obDetails, priceLocation, hasLiquiditySweep);
    
    // التحقق من الحد الأدنى للقوة
    if (VALIDATION_OPTIONS.obMinStrength === 'STRONG' && obRating.strength !== 'STRONG') {
      reasons.push(`❌ قوة OB غير كافية (${obRating.strength}) - المطلوب STRONG`);
      return { isValid: false, reasons };
    }
    
    if (VALIDATION_OPTIONS.obMinStrength === 'MEDIUM' && obRating.strength === 'WEAK') {
      reasons.push(`❌ قوة OB ضعيفة (${obRating.strength}) - المطلوب MEDIUM على الأقل`);
      return { isValid: false, reasons };
    }
    
    // إضافة تفاصيل التقييم
    reasons.push(`📊 قوة OB: ${obRating.strength} (${obRating.score}/10)`);
    obRating.factors.forEach(factor => {
      reasons.push(`   ${factor}`);
    });
  }
  
  return { isValid: true, reasons };
}

// 13. التحقق من بيانات الصفقة
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
  
  // ✅ التحقق من موقع سعر الدخول بالنسبة للسعر الحالي (مفهوم ICT الأساسي)
  // BUY_LIMIT يجب أن يكون أسفل السعر الحالي (ننتظر السعر ينزل للدخول)
  // SELL_LIMIT يجب أن يكون أعلى السعر الحالي (ننتظر السعر يصعد للدخول)
  const tradeType = String(t.type);
  
  if (tradeType === "BUY_LIMIT") {
    if (entry >= currentPrice) {
      reasons.push(`❌ BUY_LIMIT (${entry.toFixed(2)}) يجب أن يكون أسفل السعر الحالي (${currentPrice.toFixed(2)}) - مفهوم ICT: ندخل شراء من Discount`);
      return { isValid: false, reasons };
    }
    reasons.push(`✅ BUY_LIMIT صحيح: Entry (${entry.toFixed(2)}) < Current Price (${currentPrice.toFixed(2)})`);
  }
  
  if (tradeType === "SELL_LIMIT") {
    if (entry <= currentPrice) {
      reasons.push(`❌ SELL_LIMIT (${entry.toFixed(2)}) يجب أن يكون أعلى السعر الحالي (${currentPrice.toFixed(2)}) - مفهوم ICT: ندخل بيع من Premium`);
      return { isValid: false, reasons };
    }
    reasons.push(`✅ SELL_LIMIT صحيح: Entry (${entry.toFixed(2)}) > Current Price (${currentPrice.toFixed(2)})`);
  }
  
  // BUY_STOP يجب أن يكون أعلى السعر الحالي
  if (tradeType === "BUY_STOP") {
    if (entry <= currentPrice) {
      reasons.push(`❌ BUY_STOP (${entry.toFixed(2)}) يجب أن يكون أعلى السعر الحالي (${currentPrice.toFixed(2)})`);
      return { isValid: false, reasons };
    }
  }
  
  // SELL_STOP يجب أن يكون أسفل السعر الحالي
  if (tradeType === "SELL_STOP") {
    if (entry >= currentPrice) {
      reasons.push(`❌ SELL_STOP (${entry.toFixed(2)}) يجب أن يكون أسفل السعر الحالي (${currentPrice.toFixed(2)})`);
      return { isValid: false, reasons };
    }
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

// ===================== تصحيح سعر الدخول بناءً على مناطق FVG/OB =====================
// 📌 هذه الدالة تصحح سعر الدخول ليكون في المنطقة الصحيحة حسب مفاهيم ICT
// BUY_LIMIT: يجب أن يكون أسفل السعر الحالي (في FVG/OB تحت السعر)
// SELL_LIMIT: يجب أن يكون أعلى السعر الحالي (في FVG/OB فوق السعر)
function correctEntryPrice(t: any, r: any, currentPrice: number): { entry: number; corrected: boolean; reason: string } {
  const m5 = r.m5Analysis || {};
  const entryZone = m5.entryZone || {};
  const fvgDetails = m5.fvgDetails || {};
  const obDetails = m5.obDetails || {};
  const pdArray = m5.pdArray || "NONE";
  
  const originalEntry = Number(t.entry) || 0;
  const tradeType = String(t.type || "");
  const isBuyLimit = tradeType === "BUY_LIMIT";
  const isSellLimit = tradeType === "SELL_LIMIT";
  
  // لا نصحح إذا لم تكن هناك منطقة محددة
  if (pdArray === "NONE" || (!entryZone.isValid && !fvgDetails.exists && !obDetails.exists)) {
    return { entry: originalEntry, corrected: false, reason: "لا توجد منطقة FVG/OB محددة" };
  }
  
  // حساب أفضل سعر دخول من المناطق المتاحة
  let optimalEntry = originalEntry;
  let zoneType = "";
  let zoneTop = 0;
  let zoneBottom = 0;
  
  // أولوية 1: منطقة الدخول المحددة (entryZone)
  if (entryZone.isValid && entryZone.optimalEntry) {
    optimalEntry = Number(entryZone.optimalEntry);
    zoneType = entryZone.type || "EntryZone";
    zoneTop = Number(entryZone.topPrice) || 0;
    zoneBottom = Number(entryZone.bottomPrice) || 0;
  }
  // أولوية 2: FVG
  else if (fvgDetails.exists && fvgDetails.midPrice) {
    optimalEntry = Number(fvgDetails.midPrice);
    zoneType = "FVG";
    zoneTop = Number(fvgDetails.topPrice) || 0;
    zoneBottom = Number(fvgDetails.bottomPrice) || 0;
  }
  // أولوية 3: OB (مستوى التخفيف 50%)
  else if (obDetails.exists && obDetails.mitigationLevel) {
    optimalEntry = Number(obDetails.mitigationLevel);
    zoneType = "OB";
    zoneTop = Number(obDetails.topPrice) || 0;
    zoneBottom = Number(obDetails.bottomPrice) || 0;
  }
  
  // ✅ التحقق والتصحيح حسب نوع الأمر
  if (isBuyLimit) {
    // BUY_LIMIT يجب أن يكون أسفل السعر الحالي
    if (optimalEntry >= currentPrice) {
      // الدخول المقترح فوق السعر - نحتاج منطقة أسفل السعر
      // نبحث عن أقرب دعم في المنطقة
      if (zoneBottom > 0 && zoneBottom < currentPrice) {
        // نستخدم منتصف المنطقة إذا كانت أسفل السعر
        const midZone = (zoneTop + zoneBottom) / 2;
        if (midZone < currentPrice) {
          optimalEntry = round2(midZone);
          return { 
            entry: optimalEntry, 
            corrected: true, 
            reason: `✅ تم تصحيح الدخول: BUY_LIMIT يجب أن يكون أسفل السعر (${optimalEntry.toFixed(2)} في ${zoneType})`
          };
        }
      }
      // لا توجد منطقة صالحة أسفل السعر
      return { 
        entry: originalEntry, 
        corrected: false, 
        reason: `❌ لا توجد منطقة ${zoneType} أسفل السعر الحالي للشراء`
      };
    }
    // الدخول المقترح صحيح (أسفل السعر)
    return { entry: round2(optimalEntry), corrected: optimalEntry !== originalEntry, reason: `✅ BUY_LIMIT في ${zoneType}` };
  }
  
  if (isSellLimit) {
    // SELL_LIMIT يجب أن يكون أعلى السعر الحالي
    if (optimalEntry <= currentPrice) {
      // الدخول المقترح تحت السعر - نحتاج منطقة فوق السعر
      if (zoneTop > 0 && zoneTop > currentPrice) {
        // نستخدم منتصف المنطقة إذا كانت فوق السعر
        const midZone = (zoneTop + zoneBottom) / 2;
        if (midZone > currentPrice) {
          optimalEntry = round2(midZone);
          return { 
            entry: optimalEntry, 
            corrected: true, 
            reason: `✅ تم تصحيح الدخول: SELL_LIMIT يجب أن يكون أعلى السعر (${optimalEntry.toFixed(2)} في ${zoneType})`
          };
        }
      }
      // لا توجد منطقة صالحة فوق السعر
      return { 
        entry: originalEntry, 
        corrected: false, 
        reason: `❌ لا توجد منطقة ${zoneType} أعلى السعر الحالي للبيع`
      };
    }
    // الدخول المقترح صحيح (فوق السعر)
    return { entry: round2(optimalEntry), corrected: optimalEntry !== originalEntry, reason: `✅ SELL_LIMIT في ${zoneType}` };
  }
  
  // للأنواع الأخرى (BUY_STOP, SELL_STOP) نعيد السعر الأصلي
  return { entry: originalEntry, corrected: false, reason: "نوع أمر غير LIMIT" };
}

// 11. التحقق من أن سعر الدخول داخل منطقة FVG أو OB
function validateEntryInZone(t: any, r: any, isBuy: boolean): ValidationResult {
  const reasons: string[] = [];
  const m5 = r.m5Analysis || {};
  const entryZone = m5.entryZone || {};
  const fvgDetails = m5.fvgDetails || {};
  const obDetails = m5.obDetails || {};
  const pdArray = m5.pdArray || "NONE";
  
  const entry = Number(t.entry) || 0;
  if (entry <= 0) return { isValid: true, reasons }; // سيتم التحقق منه في validateTradeData
  
  // إذا لم تكن هناك منطقة محددة، تجاوز هذا التحقق
  if (pdArray === "NONE" || pdArray === undefined) {
    return { isValid: true, reasons };
  }
  
  let hasValidatedEntry = false;
  const tolerance = entry * 0.001; // هامش 0.1% للتسامح
  
  // التحقق من entryZone إذا كانت موجودة
  if (entryZone.isValid === true && entryZone.topPrice && entryZone.bottomPrice) {
    const top = Number(entryZone.topPrice);
    const bottom = Number(entryZone.bottomPrice);
    
    if (entry < bottom - tolerance || entry > top + tolerance) {
      reasons.push(`⚠️ سعر الدخول (${entry.toFixed(2)}) خارج منطقة الـ ${entryZone.type} (${bottom.toFixed(2)} - ${top.toFixed(2)})`);
      if (r.score !== undefined) r.score = Math.max(r.score - 0.5, 0);
    } else {
      reasons.push(`✅ سعر الدخول داخل منطقة الـ ${entryZone.type}`);
    }
    hasValidatedEntry = true;
  }
  
  // التحقق من FVG إذا لم يتم التحقق عبر entryZone و pdArray يتطلب FVG
  if (!hasValidatedEntry && (pdArray === "FVG" || pdArray === "FVG_IN_OB") && fvgDetails.exists === true) {
    const fvgTop = Number(fvgDetails.topPrice) || 0;
    const fvgBottom = Number(fvgDetails.bottomPrice) || 0;
    
    if (fvgTop > 0 && fvgBottom > 0) {
      if (entry < fvgBottom - tolerance || entry > fvgTop + tolerance) {
        reasons.push(`⚠️ سعر الدخول (${entry.toFixed(2)}) خارج FVG (${fvgBottom.toFixed(2)} - ${fvgTop.toFixed(2)})`);
        if (r.score !== undefined) r.score = Math.max(r.score - 0.3, 0);
      } else {
        reasons.push(`✅ سعر الدخول داخل FVG`);
      }
      hasValidatedEntry = true;
    }
  }
  
  // التحقق من OB إذا لم يتم التحقق عبر entryZone و pdArray يتطلب OB
  if (!hasValidatedEntry && (pdArray === "OB" || pdArray === "FVG_IN_OB") && obDetails.exists === true) {
    const obTop = Number(obDetails.topPrice) || 0;
    const obBottom = Number(obDetails.bottomPrice) || 0;
    
    if (obTop > 0 && obBottom > 0) {
      if (entry < obBottom - tolerance || entry > obTop + tolerance) {
        reasons.push(`⚠️ سعر الدخول (${entry.toFixed(2)}) خارج OB (${obBottom.toFixed(2)} - ${obTop.toFixed(2)})`);
        if (r.score !== undefined) r.score = Math.max(r.score - 0.3, 0);
      } else {
        reasons.push(`✅ سعر الدخول داخل OB`);
      }
    }
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
    
    // فحص FVG/OB (منطقة الدخول)
    const pdArray = r.m5Analysis?.pdArray || "NONE";
    if (pdArray === "NONE") {
      detailedReasons.push("❌ لا يوجد FVG أو OB لتحديد منطقة الدخول");
    } else {
      // إضافة تفاصيل FVG/OB إذا كانت موجودة
      const entryZone = r.m5Analysis?.entryZone;
      if (entryZone?.type) {
        const zoneDesc = entryZone.type === "FVG" ? "FVG" : 
                        entryZone.type === "OB" ? "OB" : 
                        entryZone.type === "FVG_IN_OB" ? "FVG داخل OB" : pdArray;
        detailedReasons.push(`ℹ️ منطقة الدخول المحددة: ${zoneDesc}`);
      }
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
  
  // 9. التحقق من PD Array (FVG/OB)
  const pdCheck = validatePDArray(r);
  if (!pdCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...pdCheck.reasons], r);
  }
  allReasons.push(...pdCheck.reasons); // إضافة تفاصيل FVG/OB
  
  // 10. التحقق من التلاقيات
  const confCheck = validateConfluences(r);
  if (!confCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...confCheck.reasons], r);
  }
  
  // 11. التحقق من Killzone (جلسة التداول) - v2.2
  const killzoneCheck = validateKillzone(r);
  allReasons.push(...killzoneCheck.reasons);
  // يطبق خصم على Score ولكن لا يرفض الصفقة
  
  // 12. التحقق من توافق الاتجاه مع H1 (HTF Alignment) - v2.2
  const htfCheck = validateHTFAlignment(r, isBuy);
  if (!htfCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...htfCheck.reasons], r);
  }
  allReasons.push(...htfCheck.reasons);
  
  // 13. التحقق من قوة Order Block - v2.2
  const obStrengthCheck = validateOrderBlockStrength(r);
  if (!obStrengthCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...obStrengthCheck.reasons], r);
  }
  allReasons.push(...obStrengthCheck.reasons);
  
  // 🔧 تصحيح سعر الدخول بناءً على مناطق FVG/OB (قبل التحقق من بيانات الصفقة)
  const entryCorrection = correctEntryPrice(t, r, currentPrice);
  if (entryCorrection.corrected) {
    console.log(`🔧 تصحيح سعر الدخول: ${t.entry} → ${entryCorrection.entry}`);
    t.entry = entryCorrection.entry;
    allReasons.push(entryCorrection.reason);
  } else if (entryCorrection.reason.startsWith("❌")) {
    // إذا لم يمكن تصحيح الدخول وكان خطأ
    return createNoTradeResult([...r.reasons, entryCorrection.reason], r);
  }
  
  // 14. التحقق من بيانات الصفقة
  const tradeCheck = validateTradeData(t, currentPrice, isBuy);
  if (!tradeCheck.isValid) {
    return createNoTradeResult([...r.reasons, ...tradeCheck.reasons], r);
  }
  allReasons.push(...tradeCheck.reasons.filter(r => r.startsWith("✅")));
  
  // 15. التحقق من أن سعر الدخول داخل منطقة FVG أو OB
  const entryZoneCheck = validateEntryInZone(t, r, isBuy);
  allReasons.push(...entryZoneCheck.reasons);
  
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
  
  // إضافة التحذيرات ومعلومات FVG/OB
  const warnings = allReasons.filter(reason => reason.startsWith("⚠️"));
  const fvgObInfo = allReasons.filter(reason => reason.startsWith("✅") || reason.startsWith("⭐"));
  r.reasons = [...r.reasons, ...warnings, ...fvgObInfo];
  
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
// 📌 v2.2.0 - تحليل محسّن مع Killzone و توافق الاتجاه
export const analyzeMultiTimeframe = async (
  h1Image: string,
  m5Image: string,
  currentPrice: number
): Promise<ICTAnalysis> => {
  // الحصول على معلومات Killzone
  const killzoneInfo = getCurrentKillzone();
  
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("🔍 بدء التحليل متعدد الأطر الزمنية (v2.2.0 Enhanced)");
  console.log(`💰 السعر الحالي: ${currentPrice}`);
  console.log(`⏰ الجلسة الحالية: ${killzoneInfo.session} (${killzoneInfo.quality})`);
  console.log(`📊 ${killzoneInfo.description}`);
  console.log("═══════════════════════════════════════════════════════════════\n");
  
  const cleanH1 = h1Image.replace(/^data:image\/\w+;base64,/, "");
  const cleanM5 = m5Image.replace(/^data:image\/\w+;base64,/, "");

  const userPrompt = `${systemInstruction}

═══════════════════════════════════════════════════════════════
📌 مدخلات التحليل
═══════════════════════════════════════════════════════════════
- الزوج: XAUUSD
- السعر الحالي: ${currentPrice}
- الجلسة الحالية: ${killzoneInfo.session} (${killzoneInfo.isActive ? 'نشطة' : 'غير نشطة'})
- جودة الجلسة: ${killzoneInfo.quality}

الصورة 1: H1 (السياق الأساسي + تحديد الاتجاه)
الصورة 2: M5 (الدخول + السيولة الداخلية + التأكيد)

🔍 تعليمات مهمة جداً:
1. حدد أولاً اتجاه H1 (صاعد/هابط/محايد) - هذا يحدد اتجاه الصفقة
2. ابحث عن سحب سيولة (Sweep) على H1 أو M5
3. تأكد من حدوث MSS/CHoCH بعد السحب (شرط الدخول)
4. حدد منطقة الدخول (OB قوي أو FVG متميز)
5. الدخول يكون بعد التأكيد (بعد الكسر) وليس قبله

⚠️ معايير التحليل المتوازن:
- Score >= 6.0 للقبول (لا نريد صارم جداً)
- Confidence >= 65% (موثوقية جيدة)
- RR >= 1.8 للهدف الأول
- يجب توافق اتجاه الصفقة مع H1

📊 تقييم Order Block:
- STRONG: لم يُختبر + حديث (< 20 شمعة) + مع FVG = ممتاز
- MEDIUM: تم اختباره مرة أو < 50 شمعة = مقبول
- WEAK: قديم أو مختبر عدة مرات = تجنب

⚠️ إذا لم تجد sweep واضح أو لم يتوافق الاتجاه، اشرح لماذا في reasoning

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
      
      // تفاصيل FVG
      if (parsed.m5Analysis.fvgDetails?.exists) {
        const fvg = parsed.m5Analysis.fvgDetails;
        console.log(`\n   📊 FVG Details:`);
        console.log(`      النوع: ${fvg.type === 'BULLISH' ? 'صعودي ⬆️' : fvg.type === 'BEARISH' ? 'هبوطي ⬇️' : 'غير محدد'}`);
        console.log(`      النطاق: ${fvg.bottomPrice?.toFixed(2)} - ${fvg.topPrice?.toFixed(2)}`);
        console.log(`      المنتصف: ${fvg.midPrice?.toFixed(2)}`);
        console.log(`      نسبة الملء: ${fvg.fillPercentage || 0}%`);
        console.log(`      صالح للدخول: ${fvg.isValid ? '✅' : '❌'}`);
      }
      
      // تفاصيل OB
      if (parsed.m5Analysis.obDetails?.exists) {
        const ob = parsed.m5Analysis.obDetails;
        console.log(`\n   🧱 OB Details:`);
        console.log(`      النوع: ${ob.type === 'BULLISH' ? 'صعودي ⬆️' : ob.type === 'BEARISH' ? 'هبوطي ⬇️' : 'غير محدد'}`);
        console.log(`      النطاق: ${ob.bottomPrice?.toFixed(2)} - ${ob.topPrice?.toFixed(2)}`);
        console.log(`      مستوى التخفيف: ${ob.mitigationLevel?.toFixed(2)}`);
        console.log(`      Breaker: ${ob.isBreaker ? '✅' : '❌'}`);
        console.log(`      تم اختباره: ${ob.hasBeenTested ? '✅' : '❌'}`);
        console.log(`      صالح للدخول: ${ob.isValid ? '✅' : '❌'}`);
      }
      
      // منطقة الدخول
      if (parsed.m5Analysis.entryZone?.isValid) {
        const zone = parsed.m5Analysis.entryZone;
        console.log(`\n   🎯 Entry Zone:`);
        console.log(`      النوع: ${zone.type}`);
        console.log(`      النطاق: ${zone.bottomPrice?.toFixed(2)} - ${zone.topPrice?.toFixed(2)}`);
        console.log(`      الدخول الأمثل: ${zone.optimalEntry?.toFixed(2)}`);
        console.log(`      الوصف: ${zone.description || 'غير محدد'}`);
      }
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
    
    // إضافة معلومات Killzone للنتيجة
    validated.killzoneInfo = killzoneInfo;
    
    console.log("\n✅ نتيجة التحقق النهائية:");
    console.log(`   القرار النهائي: ${validated.decision}`);
    console.log(`   التقييم النهائي: ${validated.score}/10`);
    console.log(`   الثقة النهائية: ${validated.confidence}%`);
    console.log(`   ⏰ الجلسة: ${killzoneInfo.session} (${killzoneInfo.quality})`);
    
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
