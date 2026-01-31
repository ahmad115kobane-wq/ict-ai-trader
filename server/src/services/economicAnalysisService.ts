// economicAnalysisService.ts - خدمة التحليل الاقتصادي بالذكاء الاصطناعي
import axios from 'axios';
import { EconomicEvent } from './economicCalendarService';

// ===================== Types =====================
export interface EconomicAnalysis {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  analysis: string;
  impact: string;
  marketExpectation: string;
  tradingRecommendation: string;
  analyzedAt: string;
  userId: string;
}

// ===================== Configuration =====================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// تخزين التحليلات في الذاكرة (يمكن نقلها لقاعدة البيانات لاحقاً)
const analysisCache = new Map<string, EconomicAnalysis>();

/**
 * تحليل حدث اقتصادي باستخدام الذكاء الاصطناعي
 */
export async function analyzeEconomicEvent(
  event: EconomicEvent,
  userId: string
): Promise<EconomicAnalysis> {
  try {
    console.log(`🔍 Analyzing economic event: ${event.event} for user: ${userId}`);

    // التحقق من وجود تحليل سابق
    const cacheKey = `${event.id}_${userId}`;
    if (analysisCache.has(cacheKey)) {
      console.log('📊 Returning cached analysis');
      return analysisCache.get(cacheKey)!;
    }

    // جلب معلومات عن الحدث من الإنترنت
    const eventInfo = await searchEventInfo(event);

    // تحليل الحدث باستخدام AI
    const analysis = await generateAIAnalysis(event, eventInfo);

    // حفظ التحليل
    const economicAnalysis: EconomicAnalysis = {
      id: `analysis_${Date.now()}_${userId}`,
      eventId: event.id,
      eventName: event.event,
      eventDate: event.date,
      analysis: analysis.mainAnalysis,
      impact: analysis.impact,
      marketExpectation: analysis.marketExpectation,
      tradingRecommendation: analysis.tradingRecommendation,
      analyzedAt: new Date().toISOString(),
      userId
    };

    // حفظ في Cache
    analysisCache.set(cacheKey, economicAnalysis);

    // حفظ في قاعدة البيانات
    await saveAnalysisToDatabase(economicAnalysis);

    console.log(`✅ Analysis completed for: ${event.event}`);
    return economicAnalysis;

  } catch (error) {
    console.error('❌ Failed to analyze economic event:', error);
    throw new Error('فشل تحليل الحدث الاقتصادي');
  }
}

/**
 * البحث عن معلومات الحدث من الإنترنت
 */
async function searchEventInfo(event: EconomicEvent): Promise<string> {
  try {
    // استخدام Google Search API أو web scraping بسيط
    const searchQuery = `${event.event} ${event.countryName} ${event.date} economic analysis`;
    
    // هنا يمكن استخدام API بحث حقيقي
    // للتبسيط، سنستخدم معلومات أساسية
    
    let info = `الحدث: ${event.event}\n`;
    info += `الدولة: ${event.countryName}\n`;
    info += `التاريخ: ${event.date}\n`;
    info += `الوقت: ${event.time}\n`;
    info += `التأثير: ${event.impact === 'high' ? 'عالي' : event.impact === 'medium' ? 'متوسط' : 'منخفض'}\n`;
    
    if (event.forecast) info += `التوقعات: ${event.forecast}\n`;
    if (event.previous) info += `القراءة السابقة: ${event.previous}\n`;
    if (event.actual) info += `النتيجة الفعلية: ${event.actual}\n`;

    return info;
  } catch (error) {
    console.error('⚠️ Failed to search event info:', error);
    return `معلومات أساسية عن ${event.event}`;
  }
}

/**
 * توليد التحليل باستخدام الذكاء الاصطناعي
 */
async function generateAIAnalysis(
  event: EconomicEvent,
  eventInfo: string
): Promise<{
  mainAnalysis: string;
  impact: string;
  marketExpectation: string;
  tradingRecommendation: string;
}> {
  try {
    const prompt = `أنت محلل اقتصادي خبير. قم بتحليل الحدث الاقتصادي التالي بشكل مفصل باللغة العربية:

${eventInfo}

قدم تحليلاً شاملاً يتضمن:
1. شرح مفصل للحدث الاقتصادي وأهميته
2. تأثيره المتوقع على الأسواق المالية
3. توقعات السوق وردود الفعل المحتملة
4. توصيات للمتداولين (شراء/بيع/انتظار)

اجعل التحليل احترافياً ومفيداً للمتداولين.`;

    // استخدام Gemini API
    if (GEMINI_API_KEY) {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      
      return parseAIResponse(aiResponse);
    }

    // Fallback: تحليل أساسي
    return generateBasicAnalysis(event);

  } catch (error) {
    console.error('⚠️ AI analysis failed, using basic analysis:', error);
    return generateBasicAnalysis(event);
  }
}

/**
 * تحليل أساسي في حالة فشل AI
 */
function generateBasicAnalysis(event: EconomicEvent): {
  mainAnalysis: string;
  impact: string;
  marketExpectation: string;
  tradingRecommendation: string;
} {
  const impactAr = event.impact === 'high' ? 'عالي' : event.impact === 'medium' ? 'متوسط' : 'منخفض';
  
  let mainAnalysis = `📊 تحليل ${event.event}\n\n`;
  mainAnalysis += `هذا حدث اقتصادي ${impactAr} التأثير من ${event.countryName}.\n\n`;
  
  if (event.actual && event.forecast) {
    const actualNum = parseFloat(event.actual.replace(/[^0-9.-]/g, ''));
    const forecastNum = parseFloat(event.forecast.replace(/[^0-9.-]/g, ''));
    
    if (!isNaN(actualNum) && !isNaN(forecastNum)) {
      if (actualNum > forecastNum) {
        mainAnalysis += `النتيجة الفعلية (${event.actual}) جاءت أفضل من التوقعات (${event.forecast})، مما يشير إلى قوة الاقتصاد.\n\n`;
      } else if (actualNum < forecastNum) {
        mainAnalysis += `النتيجة الفعلية (${event.actual}) جاءت أقل من التوقعات (${event.forecast})، مما قد يشير إلى ضعف في الاقتصاد.\n\n`;
      } else {
        mainAnalysis += `النتيجة الفعلية (${event.actual}) جاءت مطابقة للتوقعات (${event.forecast}).\n\n`;
      }
    }
  }

  const impact = event.impact === 'high' 
    ? 'تأثير عالي على الأسواق المالية، قد يسبب تقلبات كبيرة في أسعار العملات والأسهم.'
    : event.impact === 'medium'
    ? 'تأثير متوسط على الأسواق، قد يسبب بعض التحركات في الأسعار.'
    : 'تأثير منخفض على الأسواق.';

  const marketExpectation = event.forecast
    ? `السوق يتوقع ${event.forecast}. أي انحراف كبير عن هذا الرقم قد يسبب تحركات سعرية.`
    : 'لا توجد توقعات محددة للسوق.';

  let tradingRecommendation = '⚠️ انتظر صدور النتيجة الفعلية قبل اتخاذ قرارات التداول.\n';
  tradingRecommendation += '📈 راقب حركة السعر بعد صدور الخبر.\n';
  tradingRecommendation += '🛡️ استخدم إدارة مخاطر صارمة.';

  return {
    mainAnalysis,
    impact,
    marketExpectation,
    tradingRecommendation
  };
}

/**
 * تحليل استجابة AI
 */
function parseAIResponse(aiResponse: string): {
  mainAnalysis: string;
  impact: string;
  marketExpectation: string;
  tradingRecommendation: string;
} {
  // محاولة استخراج الأقسام من الاستجابة
  const sections = aiResponse.split('\n\n');
  
  return {
    mainAnalysis: sections[0] || aiResponse,
    impact: sections[1] || 'تأثير متوقع على الأسواق',
    marketExpectation: sections[2] || 'توقعات السوق',
    tradingRecommendation: sections[3] || 'توصيات التداول'
  };
}

/**
 * حفظ التحليل في قاعدة البيانات
 */
async function saveAnalysisToDatabase(analysis: EconomicAnalysis): Promise<void> {
  try {
    const { query } = await import('../db/postgresAdapter');
    
    await query(
      `INSERT INTO economic_analyses 
       (id, event_id, event_name, event_date, analysis, impact, market_expectation, trading_recommendation, analyzed_at, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (event_id, user_id) DO UPDATE SET
       analysis = $5, impact = $6, market_expectation = $7, trading_recommendation = $8, analyzed_at = $9`,
      [
        analysis.id,
        analysis.eventId,
        analysis.eventName,
        analysis.eventDate,
        analysis.analysis,
        analysis.impact,
        analysis.marketExpectation,
        analysis.tradingRecommendation,
        analysis.analyzedAt,
        analysis.userId
      ]
    );

    console.log('💾 Analysis saved to database');
  } catch (error) {
    console.error('⚠️ Failed to save analysis to database:', error);
  }
}

/**
 * الحصول على تحليل سابق
 */
export async function getAnalysis(eventId: string, userId: string): Promise<EconomicAnalysis | null> {
  try {
    // البحث في Cache أولاً
    const cacheKey = `${eventId}_${userId}`;
    if (analysisCache.has(cacheKey)) {
      return analysisCache.get(cacheKey)!;
    }

    // البحث في قاعدة البيانات
    const { query } = await import('../db/postgresAdapter');
    const result = await query(
      'SELECT * FROM economic_analyses WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const analysis: EconomicAnalysis = {
        id: row.id,
        eventId: row.event_id,
        eventName: row.event_name,
        eventDate: row.event_date,
        analysis: row.analysis,
        impact: row.impact,
        marketExpectation: row.market_expectation,
        tradingRecommendation: row.trading_recommendation,
        analyzedAt: row.analyzed_at,
        userId: row.user_id
      };

      // حفظ في Cache
      analysisCache.set(cacheKey, analysis);
      return analysis;
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to get analysis:', error);
    return null;
  }
}

/**
 * الحصول على جميع تحليلات المستخدم لليوم
 */
export async function getUserTodayAnalyses(userId: string): Promise<EconomicAnalysis[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { query } = await import('../db/postgresAdapter');
    
    const result = await query(
      'SELECT * FROM economic_analyses WHERE user_id = $1 AND event_date = $2 ORDER BY analyzed_at DESC',
      [userId, today]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      eventId: row.event_id,
      eventName: row.event_name,
      eventDate: row.event_date,
      analysis: row.analysis,
      impact: row.impact,
      marketExpectation: row.market_expectation,
      tradingRecommendation: row.trading_recommendation,
      analyzedAt: row.analyzed_at,
      userId: row.user_id
    }));
  } catch (error) {
    console.error('❌ Failed to get user analyses:', error);
    return [];
  }
}
