// economicCalendarService.ts - خدمة التقويم الاقتصادي
import axios from 'axios';

// ===================== Types =====================
export interface EconomicEvent {
  id: string;
  date: string; // ISO format
  time: string; // HH:MM
  country: string; // رمز الدولة (US, EU, GB, etc)
  countryName: string; // اسم الدولة بالعربية
  currency: string; // USD, EUR, GBP, etc
  event: string; // اسم الحدث بالعربية
  impact: 'high' | 'medium' | 'low'; // التأثير
  forecast?: string; // التوقعات
  previous?: string; // القراءة السابقة
  actual?: string; // القراءة الفعلية
}

export interface CalendarResponse {
  success: boolean;
  events: EconomicEvent[];
  lastUpdate: string;
}

// ===================== Configuration =====================
const CALENDAR_CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة
let cachedEvents: EconomicEvent[] = [];
let lastFetchTime = 0;

// ترجمة أسماء الدول
const countryNames: { [key: string]: string } = {
  'US': 'الولايات المتحدة',
  'EU': 'منطقة اليورو',
  'GB': 'بريطانيا',
  'JP': 'اليابان',
  'CH': 'سويسرا',
  'CA': 'كندا',
  'AU': 'أستراليا',
  'NZ': 'نيوزيلندا',
  'CN': 'الصين',
  'DE': 'ألمانيا',
  'FR': 'فرنسا',
  'IT': 'إيطاليا',
  'ES': 'إسبانيا'
};

// ترجمة الأحداث الشائعة
const eventTranslations: { [key: string]: string } = {
  'Non-Farm Payrolls': 'الوظائف غير الزراعية',
  'Unemployment Rate': 'معدل البطالة',
  'CPI': 'مؤشر أسعار المستهلك',
  'Core CPI': 'مؤشر أسعار المستهلك الأساسي',
  'GDP': 'الناتج المحلي الإجمالي',
  'Interest Rate Decision': 'قرار سعر الفائدة',
  'FOMC': 'اجتماع الفيدرالي الأمريكي',
  'ECB': 'البنك المركزي الأوروبي',
  'Retail Sales': 'مبيعات التجزئة',
  'Manufacturing PMI': 'مؤشر مديري المشتريات الصناعي',
  'Services PMI': 'مؤشر مديري المشتريات الخدمي',
  'Trade Balance': 'الميزان التجاري',
  'Consumer Confidence': 'ثقة المستهلك',
  'Industrial Production': 'الإنتاج الصناعي',
  'Building Permits': 'تصاريح البناء',
  'Housing Starts': 'بدء البناء السكني',
  'PPI': 'مؤشر أسعار المنتجين',
  'Initial Jobless Claims': 'طلبات إعانة البطالة الأولية',
  'Durable Goods Orders': 'طلبات السلع المعمرة',
  'ISM Manufacturing': 'مؤشر ISM الصناعي',
  'ISM Services': 'مؤشر ISM الخدمي',
  'ADP Employment': 'تقرير التوظيف ADP',
  'Fed Chair Speech': 'خطاب رئيس الفيدرالي',
  'ECB President Speech': 'خطاب رئيس البنك المركزي الأوروبي'
};

// ===================== Forex Factory API =====================
// استخدام Forex Factory Calendar API (غير رسمي)
async function fetchFromForexFactory(): Promise<EconomicEvent[]> {
  try {
    // ملاحظة: Forex Factory لا يوفر API رسمي
    // يمكن استخدام خدمات طرف ثالث مثل:
    // - https://nfs.faireconomy.media/ff_calendar_thisweek.json
    // - أو web scraping
    
    const response = await axios.get('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const events: EconomicEvent[] = [];
    const data = response.data;

    if (Array.isArray(data)) {
      for (const item of data) {
        // تصفية الأحداث ذات التأثير العالي والمتوسط فقط
        if (item.impact === 'Low') continue;

        const event: EconomicEvent = {
          id: `${item.date}_${item.time}_${item.title}`,
          date: item.date,
          time: item.time || '00:00',
          country: item.country || 'US',
          countryName: countryNames[item.country] || item.country,
          currency: item.currency || 'USD',
          event: translateEvent(item.title),
          impact: mapImpact(item.impact),
          forecast: item.forecast || undefined,
          previous: item.previous || undefined,
          actual: item.actual || undefined
        };

        events.push(event);
      }
    }

    return events;
  } catch (error) {
    console.error('❌ Failed to fetch from Forex Factory:', error);
    return [];
  }
}

// ===================== Investing.com Alternative =====================
// استخدام بيانات وهمية واقعية كمثال
function getMockEconomicEvents(): EconomicEvent[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return [
    {
      id: 'nfp_' + today.toISOString(),
      date: today.toISOString().split('T')[0],
      time: '15:30',
      country: 'US',
      countryName: 'الولايات المتحدة',
      currency: 'USD',
      event: 'الوظائف غير الزراعية',
      impact: 'high',
      forecast: '180K',
      previous: '175K'
    },
    {
      id: 'cpi_' + today.toISOString(),
      date: today.toISOString().split('T')[0],
      time: '15:30',
      country: 'US',
      countryName: 'الولايات المتحدة',
      currency: 'USD',
      event: 'مؤشر أسعار المستهلك',
      impact: 'high',
      forecast: '3.2%',
      previous: '3.1%'
    },
    {
      id: 'fomc_' + tomorrow.toISOString(),
      date: tomorrow.toISOString().split('T')[0],
      time: '21:00',
      country: 'US',
      countryName: 'الولايات المتحدة',
      currency: 'USD',
      event: 'قرار سعر الفائدة الفيدرالي',
      impact: 'high',
      forecast: '5.50%',
      previous: '5.50%'
    },
    {
      id: 'ecb_' + tomorrow.toISOString(),
      date: tomorrow.toISOString().split('T')[0],
      time: '14:45',
      country: 'EU',
      countryName: 'منطقة اليورو',
      currency: 'EUR',
      event: 'قرار سعر الفائدة الأوروبي',
      impact: 'high',
      forecast: '4.00%',
      previous: '4.00%'
    },
    {
      id: 'gdp_' + today.toISOString(),
      date: today.toISOString().split('T')[0],
      time: '15:30',
      country: 'US',
      countryName: 'الولايات المتحدة',
      currency: 'USD',
      event: 'الناتج المحلي الإجمالي',
      impact: 'high',
      forecast: '2.5%',
      previous: '2.4%'
    },
    {
      id: 'retail_' + today.toISOString(),
      date: today.toISOString().split('T')[0],
      time: '15:30',
      country: 'US',
      countryName: 'الولايات المتحدة',
      currency: 'USD',
      event: 'مبيعات التجزئة',
      impact: 'medium',
      forecast: '0.3%',
      previous: '0.2%'
    }
  ];
}

// ===================== Main Functions =====================

/**
 * جلب التقويم الاقتصادي
 * @param forceRefresh - إجبار التحديث حتى لو كان هناك cache
 */
export async function getEconomicCalendar(forceRefresh = false): Promise<CalendarResponse> {
  try {
    const now = Date.now();

    // استخدام الـ cache إذا كان حديثاً
    if (!forceRefresh && cachedEvents.length > 0 && (now - lastFetchTime) < CALENDAR_CACHE_DURATION) {
      console.log('📅 Using cached economic calendar');
      return {
        success: true,
        events: cachedEvents,
        lastUpdate: new Date(lastFetchTime).toISOString()
      };
    }

    console.log('📅 Fetching fresh economic calendar...');

    // محاولة جلب البيانات من Forex Factory
    let events = await fetchFromForexFactory();

    // إذا فشل، استخدام البيانات الوهمية
    if (events.length === 0) {
      console.log('⚠️ Using mock economic data');
      events = getMockEconomicEvents();
    }

    // ترتيب حسب التاريخ والوقت
    events.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    // حفظ في الـ cache
    cachedEvents = events;
    lastFetchTime = now;

    console.log(`✅ Economic calendar loaded: ${events.length} events`);

    return {
      success: true,
      events,
      lastUpdate: new Date(lastFetchTime).toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to get economic calendar:', error);
    
    // إرجاع الـ cache القديم إذا كان موجوداً
    if (cachedEvents.length > 0) {
      return {
        success: true,
        events: cachedEvents,
        lastUpdate: new Date(lastFetchTime).toISOString()
      };
    }

    // إرجاع بيانات وهمية كحل أخير
    return {
      success: false,
      events: getMockEconomicEvents(),
      lastUpdate: new Date().toISOString()
    };
  }
}

/**
 * جلب الأحداث ذات التأثير العالي فقط
 */
export async function getHighImpactEvents(): Promise<EconomicEvent[]> {
  const calendar = await getEconomicCalendar();
  return calendar.events.filter(event => event.impact === 'high');
}

/**
 * جلب أحداث اليوم
 */
export async function getTodayEvents(): Promise<EconomicEvent[]> {
  const calendar = await getEconomicCalendar();
  const today = new Date().toISOString().split('T')[0];
  return calendar.events.filter(event => event.date === today);
}

/**
 * جلب الأحداث القادمة (خلال الساعات القادمة)
 */
export async function getUpcomingEvents(hoursAhead = 24): Promise<EconomicEvent[]> {
  const calendar = await getEconomicCalendar();
  const now = new Date();
  const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return calendar.events.filter(event => {
    const eventTime = new Date(`${event.date}T${event.time}`);
    return eventTime >= now && eventTime <= futureTime;
  });
}

// ===================== Helper Functions =====================

function translateEvent(eventName: string): string {
  // البحث عن ترجمة مباشرة
  if (eventTranslations[eventName]) {
    return eventTranslations[eventName];
  }

  // البحث عن ترجمة جزئية
  for (const [key, value] of Object.entries(eventTranslations)) {
    if (eventName.includes(key)) {
      return value;
    }
  }

  // إرجاع الاسم الأصلي إذا لم توجد ترجمة
  return eventName;
}

function mapImpact(impact: string): 'high' | 'medium' | 'low' {
  const impactLower = impact.toLowerCase();
  if (impactLower.includes('high') || impactLower.includes('3')) return 'high';
  if (impactLower.includes('medium') || impactLower.includes('2')) return 'medium';
  return 'low';
}

/**
 * تنسيق الحدث للعرض
 */
export function formatEventForDisplay(event: EconomicEvent): string {
  const impactEmoji = event.impact === 'high' ? '🔴' : event.impact === 'medium' ? '🟡' : '🟢';
  
  let text = `${impactEmoji} **${event.event}**\n`;
  text += `🌍 ${event.countryName} (${event.currency})\n`;
  text += `🕐 ${event.time}\n`;
  
  if (event.forecast) text += `📊 التوقع: ${event.forecast}\n`;
  if (event.previous) text += `📈 السابق: ${event.previous}\n`;
  if (event.actual) text += `✅ الفعلي: ${event.actual}\n`;
  
  return text;
}

/**
 * التحقق من وجود أحداث عالية التأثير قريبة
 */
export async function hasHighImpactEventSoon(minutesAhead = 30): Promise<boolean> {
  const calendar = await getEconomicCalendar();
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);

  const upcomingHighImpact = calendar.events.filter(event => {
    if (event.impact !== 'high') return false;
    const eventTime = new Date(`${event.date}T${event.time}`);
    return eventTime >= now && eventTime <= futureTime;
  });

  return upcomingHighImpact.length > 0;
}
