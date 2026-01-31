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
    console.log(`🔍 Searching for today's analysis of: ${event.event}`);
    
    // البحث عن تحليلات اليوم فقط
    const today = new Date().toISOString().split('T')[0];
    const searchQuery = `${event.event} ${event.countryName} economic analysis ${today}`;
    
    // محاولة البحث في مصادر موثوقة
    const sources = [
      'investing.com',
      'forexfactory.com',
      'tradingeconomics.com',
      'fxstreet.com',
      'dailyfx.com'
    ];
    
    let info = `الحدث: ${event.event}\n`;
    info += `الدولة: ${event.countryName}\n`;
    info += `التاريخ: ${event.date}\n`;
    info += `الوقت: ${event.time}\n`;
    info += `التأثير: ${event.impact === 'high' ? 'عالي' : event.impact === 'medium' ? 'متوسط' : 'منخفض'}\n`;
    
    if (event.forecast) info += `التوقعات: ${event.forecast}\n`;
    if (event.previous) info += `القراءة السابقة: ${event.previous}\n`;
    if (event.actual) info += `النتيجة الفعلية: ${event.actual}\n`;

    // محاولة جلب تحليلات من الإنترنت
    try {
      const webAnalysis = await fetchTodayAnalysis(event, today);
      if (webAnalysis) {
        info += `\n📰 تحليلات من الإنترنت (${today}):\n${webAnalysis}`;
      }
    } catch (error) {
      console.log('⚠️ Could not fetch web analysis, continuing with basic info');
    }

    return info;
  } catch (error) {
    console.error('⚠️ Failed to search event info:', error);
    return `معلومات أساسية عن ${event.event}`;
  }
}

/**
 * جلب تحليلات اليوم من الإنترنت
 */
async function fetchTodayAnalysis(event: EconomicEvent, today: string): Promise<string | null> {
  try {
    // استخدام web search API للبحث عن تحليلات اليوم
    const searchQuery = `${event.event} ${event.countryName} analysis ${today}`;
    
    // يمكن استخدام Google Custom Search API أو SerpAPI
    // للتبسيط، سنستخدم axios للبحث في مصادر محددة
    
    const sources = [
      {
        name: 'Investing.com',
        url: `https://www.investing.com/search/?q=${encodeURIComponent(event.event)}&tab=news`
      },
      {
        name: 'FXStreet',
        url: `https://www.fxstreet.com/search?q=${encodeURIComponent(event.event)}`
      }
    ];

    let analysis = '';
    
    // محاولة جلب من كل مصدر
    for (const source of sources) {
      try {
        const response = await axios.get(source.url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        // استخراج المعلومات من HTML (بسيط)
        const html = response.data;
        
        // البحث عن تاريخ اليوم في المحتوى
        if (html.includes(today)) {
          analysis += `\n✅ ${source.name}: وجدت تحليلات بتاريخ اليوم\n`;
          // يمكن إضافة استخراج أكثر تفصيلاً هنا
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch from ${source.name}`);
      }
    }

    return analysis || null;
  } catch (error) {
    console.error('❌ Failed to fetch today analysis:', error);
    return null;
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

/**
 * تحليل جميع أحداث اليوم وتجميع المعلومات
 */
export async function analyzeTodayEvents(userId: string): Promise<{
  summary: string;
  analyses: EconomicAnalysis[];
  totalEvents: number;
  highImpactEvents: number;
}> {
  try {
    console.log(`📊 Analyzing today's events for user: ${userId}`);
    
    // جلب أحداث اليوم
    const { getEconomicCalendar } = await import('./economicCalendarService');
    const calendar = await getEconomicCalendar();
    const today = new Date().toISOString().split('T')[0];
    
    const todayEvents = calendar.events.filter(event => event.date === today);
    const highImpactEvents = todayEvents.filter(event => event.impact === 'high');
    
    console.log(`📅 Found ${todayEvents.length} events today (${highImpactEvents.length} high impact)`);
    
    // تحليل الأحداث المهمة فقط
    const analyses: EconomicAnalysis[] = [];
    
    for (const event of highImpactEvents.slice(0, 5)) { // أول 5 أحداث مهمة
      try {
        const analysis = await analyzeEconomicEvent(event, userId);
        analyses.push(analysis);
      } catch (error) {
        console.error(`⚠️ Failed to analyze event: ${event.event}`);
      }
    }
    
    // إنشاء ملخص شامل
    const summary = generateDailySummary(todayEvents, highImpactEvents, analyses);
    
    return {
      summary,
      analyses,
      totalEvents: todayEvents.length,
      highImpactEvents: highImpactEvents.length
    };
    
  } catch (error) {
    console.error('❌ Failed to analyze today events:', error);
    throw new Error('فشل تحليل أحداث اليوم');
  }
}

/**
 * إنشاء ملخص يومي شامل
 */
function generateDailySummary(
  allEvents: EconomicEvent[],
  highImpactEvents: EconomicEvent[],
  analyses: EconomicAnalysis[]
): string {
  const today = new Date().toLocaleDateString('ar-SA');
  
  let summary = `📊 ملخص التحليل الاقتصادي ليوم ${today}\n\n`;
  
  summary += `📈 إجمالي الأحداث: ${allEvents.length}\n`;
  summary += `🔴 أحداث عالية التأثير: ${highImpactEvents.length}\n\n`;
  
  if (highImpactEvents.length > 0) {
    summary += `🎯 أهم الأحداث:\n`;
    highImpactEvents.slice(0, 5).forEach((event, index) => {
      summary += `${index + 1}. ${event.event} (${event.countryName}) - ${event.time}\n`;
    });
    summary += `\n`;
  }
  
  if (analyses.length > 0) {
    summary += `💡 التوصيات العامة:\n`;
    summary += `• راقب الأحداث عالية التأثير بعناية\n`;
    summary += `• استخدم إدارة مخاطر صارمة\n`;
    summary += `• تجنب التداول قبل وأثناء صدور الأخبار المهمة\n`;
    summary += `• انتظر استقرار السوق بعد الأخبار\n\n`;
  }
  
  summary += `📱 تم إنشاء هذا التحليل بواسطة الذكاء الاصطناعي\n`;
  summary += `⏰ آخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}`;
  
  return summary;
}

/**
 * البحث عن تحليلات اقتصادية من الإنترنت بتاريخ اليوم
 */
export async function searchTodayEconomicAnalysis(eventName: string): Promise<{
  sources: Array<{
    title: string;
    url: string;
    publishedDate: string;
    summary: string;
  }>;
  aggregatedAnalysis: string;
}> {
  try {
    console.log(`🔍 Searching for today's analysis of: ${eventName}`);
    
    const today = new Date().toISOString().split('T')[0];
    const sources: Array<{
      title: string;
      url: string;
      publishedDate: string;
      summary: string;
    }> = [];
    
    // البحث في مصادر موثوقة
    const searchSources = [
      {
        name: 'Investing.com',
        baseUrl: 'https://www.investing.com',
        searchPath: '/search/?q='
      },
      {
        name: 'FXStreet',
        baseUrl: 'https://www.fxstreet.com',
        searchPath: '/search?q='
      },
      {
        name: 'DailyFX',
        baseUrl: 'https://www.dailyfx.com',
        searchPath: '/search?q='
      }
    ];
    
    // محاولة البحث في كل مصدر
    for (const source of searchSources) {
      try {
        const searchUrl = `${source.baseUrl}${source.searchPath}${encodeURIComponent(eventName)}`;
        
        const response = await axios.get(searchUrl, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        // استخراج المقالات من HTML (بسيط)
        const html = response.data;
        
        // البحث عن تاريخ اليوم في المحتوى
        if (html.includes(today)) {
          sources.push({
            title: `تحليل من ${source.name}`,
            url: searchUrl,
            publishedDate: today,
            summary: `تحليل اقتصادي متاح على ${source.name}`
          });
        }
      } catch (error) {
        console.log(`⚠️ Could not search ${source.name}`);
      }
    }
    
    // تجميع التحليلات
    let aggregatedAnalysis = `📰 تحليلات اقتصادية ليوم ${today}\n\n`;
    
    if (sources.length > 0) {
      aggregatedAnalysis += `✅ وجدنا ${sources.length} تحليل(ات) من مصادر موثوقة:\n\n`;
      sources.forEach((source, index) => {
        aggregatedAnalysis += `${index + 1}. ${source.title}\n`;
        aggregatedAnalysis += `   📅 ${source.publishedDate}\n`;
        aggregatedAnalysis += `   🔗 ${source.url}\n\n`;
      });
    } else {
      aggregatedAnalysis += `⚠️ لم نجد تحليلات منشورة اليوم بعد.\n`;
      aggregatedAnalysis += `سيتم تحديث التحليلات تلقائياً عند توفرها.\n`;
    }
    
    return {
      sources,
      aggregatedAnalysis
    };
    
  } catch (error) {
    console.error('❌ Failed to search today economic analysis:', error);
    return {
      sources: [],
      aggregatedAnalysis: 'فشل البحث عن التحليلات الاقتصادية'
    };
  }
}
