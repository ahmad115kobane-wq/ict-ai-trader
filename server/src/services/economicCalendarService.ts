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
  // أحداث التوظيف
  'Non-Farm Payrolls': 'الوظائف غير الزراعية',
  'Unemployment Rate': 'معدل البطالة',
  'ADP Employment': 'تقرير التوظيف ADP',
  'Initial Jobless Claims': 'طلبات إعانة البطالة الأولية',
  'Continuing Jobless Claims': 'طلبات إعانة البطالة المستمرة',
  'Employment Change': 'التغير في التوظيف',
  'Unemployment Claims': 'طلبات البطالة',
  
  // التضخم والأسعار
  'CPI': 'مؤشر أسعار المستهلك',
  'Core CPI': 'مؤشر أسعار المستهلك الأساسي',
  'PPI': 'مؤشر أسعار المنتجين',
  'Core PPI': 'مؤشر أسعار المنتجين الأساسي',
  'Inflation Rate': 'معدل التضخم',
  'Consumer Price Index': 'مؤشر أسعار المستهلك',
  'Producer Price Index': 'مؤشر أسعار المنتجين',
  
  // الناتج المحلي
  'GDP': 'الناتج المحلي الإجمالي',
  'GDP Growth Rate': 'معدل نمو الناتج المحلي',
  'Preliminary GDP': 'الناتج المحلي الأولي',
  'Final GDP': 'الناتج المحلي النهائي',
  'GDP Annualized': 'الناتج المحلي السنوي',
  
  // أسعار الفائدة والبنوك المركزية
  'Interest Rate Decision': 'قرار سعر الفائدة',
  'FOMC': 'اجتماع الفيدرالي الأمريكي',
  'FOMC Meeting': 'اجتماع الفيدرالي الأمريكي',
  'Fed Interest Rate Decision': 'قرار الفائدة الفيدرالي',
  'ECB': 'البنك المركزي الأوروبي',
  'ECB Interest Rate Decision': 'قرار الفائدة الأوروبي',
  'BOE Interest Rate Decision': 'قرار الفائدة البريطاني',
  'BOJ Interest Rate Decision': 'قرار الفائدة الياباني',
  'Fed Chair Speech': 'خطاب رئيس الفيدرالي',
  'ECB President Speech': 'خطاب رئيس البنك المركزي الأوروبي',
  'FOMC Minutes': 'محضر اجتماع الفيدرالي',
  'Monetary Policy Statement': 'بيان السياسة النقدية',
  
  // المبيعات والإنفاق
  'Retail Sales': 'مبيعات التجزئة',
  'Core Retail Sales': 'مبيعات التجزئة الأساسية',
  'Consumer Spending': 'الإنفاق الاستهلاكي',
  'Personal Spending': 'الإنفاق الشخصي',
  'Durable Goods Orders': 'طلبات السلع المعمرة',
  'Factory Orders': 'طلبات المصانع',
  
  // مؤشرات PMI
  'Manufacturing PMI': 'مؤشر مديري المشتريات الصناعي',
  'Services PMI': 'مؤشر مديري المشتريات الخدمي',
  'Composite PMI': 'مؤشر مديري المشتريات المركب',
  'ISM Manufacturing': 'مؤشر ISM الصناعي',
  'ISM Services': 'مؤشر ISM الخدمي',
  'ISM Non-Manufacturing': 'مؤشر ISM غير الصناعي',
  
  // التجارة والميزان
  'Trade Balance': 'الميزان التجاري',
  'Current Account': 'الحساب الجاري',
  'Exports': 'الصادرات',
  'Imports': 'الواردات',
  
  // الثقة والمعنويات
  'Consumer Confidence': 'ثقة المستهلك',
  'Business Confidence': 'ثقة الأعمال',
  'Consumer Sentiment': 'معنويات المستهلك',
  'ZEW Economic Sentiment': 'مؤشر ZEW للمعنويات الاقتصادية',
  
  // الإنتاج والصناعة
  'Industrial Production': 'الإنتاج الصناعي',
  'Manufacturing Production': 'الإنتاج الصناعي',
  'Capacity Utilization': 'معدل استغلال الطاقة',
  
  // البناء والإسكان
  'Building Permits': 'تصاريح البناء',
  'Housing Starts': 'بدء البناء السكني',
  'New Home Sales': 'مبيعات المنازل الجديدة',
  'Existing Home Sales': 'مبيعات المنازل القائمة',
  'Pending Home Sales': 'مبيعات المنازل المعلقة',
  'Construction Spending': 'الإنفاق على البناء',
  
  // أخرى
  'Crude Oil Inventories': 'مخزونات النفط الخام',
  'Natural Gas Storage': 'مخزونات الغاز الطبيعي',
  'Baker Hughes Oil Rig Count': 'عدد منصات النفط',
  'Beige Book': 'الكتاب البيج',
  'Nonfarm Productivity': 'إنتاجية القطاع غير الزراعي',
  'Unit Labor Costs': 'تكاليف العمالة',
  'Wholesale Inventories': 'مخزونات الجملة',
  'Business Inventories': 'مخزونات الأعمال',
  'Chicago PMI': 'مؤشر شيكاغو PMI',
  'Dallas Fed Manufacturing Index': 'مؤشر دالاس الصناعي',
  'Philadelphia Fed Manufacturing Index': 'مؤشر فيلادلفيا الصناعي',
  'NY Empire State Manufacturing Index': 'مؤشر نيويورك الصناعي',
  'Richmond Fed Manufacturing Index': 'مؤشر ريتشموند الصناعي',
  'Kansas City Fed Manufacturing Index': 'مؤشر كانساس الصناعي',
};

// ===================== Forex Factory API =====================
// استخدام Forex Factory Calendar API
async function fetchFromForexFactory(): Promise<EconomicEvent[]> {
  try {
    // استخدام API من nfs.faireconomy.media (يوفر بيانات Forex Factory)
    const response = await axios.get('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const events: EconomicEvent[] = [];
    const data = response.data;

    console.log(`📅 Fetched ${Array.isArray(data) ? data.length : 0} events from Forex Factory`);

    if (Array.isArray(data)) {
      for (const item of data) {
        // تصفية الأحداث ذات التأثير المنخفض
        if (item.impact === 'Low' || item.impact === 'low') continue;

        // تحويل التاريخ والوقت من ISO
        let eventDate: string;
        let eventTime: string;
        
        if (item.date && item.date.includes('T')) {
          // التاريخ بصيغة ISO
          const dateObj = new Date(item.date);
          eventDate = dateObj.toISOString().split('T')[0];
          eventTime = dateObj.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        } else {
          // التاريخ بصيغة عادية
          eventDate = item.date || new Date().toISOString().split('T')[0];
          eventTime = item.time || '00:00';
          
          // تنظيف الوقت (إزالة am/pm وتحويل إلى 24 ساعة)
          if (eventTime.includes('am') || eventTime.includes('pm')) {
            const isPM = eventTime.includes('pm');
            eventTime = eventTime.replace(/am|pm/gi, '').trim();
            const [hours, minutes] = eventTime.split(':').map(Number);
            let hour24 = hours;
            if (isPM && hours !== 12) hour24 = hours + 12;
            if (!isPM && hours === 12) hour24 = 0;
            eventTime = `${hour24.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}`;
          }
        }

        // تحديد الدولة واسمها
        let country = item.country || 'US';
        let countryName = countryNames[country] || country;
        
        // إذا كانت الدولة رمز عملة، نحاول تحويلها
        if (country === 'USD') {
          country = 'US';
          countryName = 'الولايات المتحدة';
        } else if (country === 'EUR') {
          country = 'EU';
          countryName = 'منطقة اليورو';
        } else if (country === 'GBP') {
          country = 'GB';
          countryName = 'بريطانيا';
        } else if (country === 'JPY') {
          country = 'JP';
          countryName = 'اليابان';
        } else if (country === 'CAD') {
          country = 'CA';
          countryName = 'كندا';
        } else if (country === 'AUD') {
          country = 'AU';
          countryName = 'أستراليا';
        } else if (country === 'NZD') {
          country = 'NZ';
          countryName = 'نيوزيلندا';
        } else if (country === 'CHF') {
          country = 'CH';
          countryName = 'سويسرا';
        } else if (country === 'CNY') {
          country = 'CN';
          countryName = 'الصين';
        }

        const event: EconomicEvent = {
          id: `${eventDate}_${eventTime}_${item.title || item.event}`,
          date: eventDate,
          time: eventTime,
          country: country,
          countryName: countryName,
          currency: item.currency || 'USD',
          event: translateEvent(item.title || item.event || 'حدث اقتصادي'),
          impact: mapImpact(item.impact),
          forecast: item.forecast || undefined,
          previous: item.previous || undefined,
          actual: item.actual || undefined
        };

        events.push(event);
      }
    }

    console.log(`✅ Processed ${events.length} events (filtered low impact)`);
    return events;
  } catch (error) {
    console.error('❌ Failed to fetch from Forex Factory:', error);
    return [];
  }
}

// ===================== Alternative: Trading Economics API =====================
// يمكن استخدام Trading Economics كبديل (يتطلب API key)
async function fetchFromTradingEconomics(): Promise<EconomicEvent[]> {
  try {
    const API_KEY = process.env.TRADING_ECONOMICS_API_KEY;
    if (!API_KEY) {
      console.log('⚠️ Trading Economics API key not configured');
      return [];
    }

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const endDate = nextWeek.toISOString().split('T')[0];

    const response = await axios.get(
      `https://api.tradingeconomics.com/calendar/country/all/${today}/${endDate}`,
      {
        params: { c: API_KEY },
        timeout: 10000
      }
    );

    const events: EconomicEvent[] = [];
    
    if (Array.isArray(response.data)) {
      for (const item of response.data) {
        // تصفية حسب الأهمية
        if (item.Importance !== 'High' && item.Importance !== 'Medium') continue;

        const eventDate = new Date(item.Date);
        const event: EconomicEvent = {
          id: `te_${item.CalendarId}`,
          date: eventDate.toISOString().split('T')[0],
          time: eventDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          country: item.Country || 'US',
          countryName: countryNames[item.Country] || item.Country,
          currency: item.Currency || 'USD',
          event: translateEvent(item.Event),
          impact: item.Importance === 'High' ? 'high' : 'medium',
          forecast: item.Forecast?.toString() || undefined,
          previous: item.Previous?.toString() || undefined,
          actual: item.Actual?.toString() || undefined
        };

        events.push(event);
      }
    }

    console.log(`✅ Fetched ${events.length} events from Trading Economics`);
    return events;
  } catch (error) {
    console.error('❌ Failed to fetch from Trading Economics:', error);
    return [];
  }
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

    // محاولة جلب البيانات من Forex Factory أولاً
    let events = await fetchFromForexFactory();

    // إذا فشل Forex Factory، جرب Trading Economics
    if (events.length === 0) {
      console.log('⚠️ Forex Factory failed, trying Trading Economics...');
      events = await fetchFromTradingEconomics();
    }

    // إذا فشلت جميع المصادر، إرجاع قائمة فارغة
    if (events.length === 0) {
      console.error('❌ All data sources failed - no economic events available');
      
      // إرجاع الـ cache القديم إذا كان موجوداً
      if (cachedEvents.length > 0) {
        console.log('⚠️ Using old cached data');
        return {
          success: true,
          events: cachedEvents,
          lastUpdate: new Date(lastFetchTime).toISOString()
        };
      }
      
      // لا توجد بيانات على الإطلاق
      return {
        success: false,
        events: [],
        lastUpdate: new Date().toISOString()
      };
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
      console.log('⚠️ Error occurred, using cached data');
      return {
        success: true,
        events: cachedEvents,
        lastUpdate: new Date(lastFetchTime).toISOString()
      };
    }

    // لا توجد بيانات
    return {
      success: false,
      events: [],
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
  if (!eventName) return 'حدث اقتصادي';
  
  // البحث عن ترجمة مباشرة (مطابقة كاملة)
  if (eventTranslations[eventName]) {
    return eventTranslations[eventName];
  }

  // البحث عن ترجمة جزئية (يحتوي على)
  for (const [key, value] of Object.entries(eventTranslations)) {
    if (eventName.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // محاولة ترجمة الكلمات الشائعة
  let translated = eventName;
  
  // استبدال الكلمات الشائعة
  const commonWords: { [key: string]: string } = {
    'Preliminary': 'أولي',
    'Final': 'نهائي',
    'Revised': 'منقح',
    'Flash': 'سريع',
    'Forecast': 'توقعات',
    'Actual': 'فعلي',
    'Previous': 'سابق',
    'Change': 'تغير',
    'Rate': 'معدل',
    'Index': 'مؤشر',
    'Report': 'تقرير',
    'Data': 'بيانات',
    'Release': 'إصدار',
    'Statement': 'بيان',
    'Minutes': 'محضر',
    'Speech': 'خطاب',
    'Conference': 'مؤتمر',
    'Meeting': 'اجتماع',
    'Decision': 'قرار',
    'Announcement': 'إعلان',
    'Sales': 'مبيعات',
    'Orders': 'طلبات',
    'Production': 'إنتاج',
    'Spending': 'إنفاق',
    'Income': 'دخل',
    'Price': 'سعر',
    'Prices': 'أسعار',
    'Growth': 'نمو',
    'Inflation': 'تضخم',
    'Employment': 'توظيف',
    'Unemployment': 'بطالة',
    'Jobs': 'وظائف',
    'Payrolls': 'رواتب',
    'Claims': 'طلبات',
    'Balance': 'ميزان',
    'Trade': 'تجارة',
    'Exports': 'صادرات',
    'Imports': 'واردات',
    'Confidence': 'ثقة',
    'Sentiment': 'معنويات',
    'Manufacturing': 'صناعي',
    'Services': 'خدمي',
    'Composite': 'مركب',
    'Consumer': 'مستهلك',
    'Producer': 'منتج',
    'Business': 'أعمال',
    'Industrial': 'صناعي',
    'Retail': 'تجزئة',
    'Wholesale': 'جملة',
    'Housing': 'إسكان',
    'Building': 'بناء',
    'Construction': 'إنشاءات',
    'Permits': 'تصاريح',
    'Starts': 'بدء',
    'Inventories': 'مخزونات',
    'Capacity': 'طاقة',
    'Utilization': 'استغلال',
    'Durable': 'معمرة',
    'Goods': 'سلع',
    'Core': 'أساسي',
    'Crude': 'خام',
    'Oil': 'نفط',
    'Natural Gas': 'غاز طبيعي',
    'Fed': 'الفيدرالي',
    'Federal': 'فيدرالي',
    'Central Bank': 'البنك المركزي',
    'Interest': 'فائدة',
    'Monetary': 'نقدي',
    'Policy': 'سياسة',
    'GDP': 'الناتج المحلي',
    'CPI': 'مؤشر أسعار المستهلك',
    'PPI': 'مؤشر أسعار المنتجين',
    'PMI': 'مؤشر مديري المشتريات',
    'ISM': 'ISM',
    'ADP': 'ADP',
    'NFP': 'الوظائف غير الزراعية',
    'FOMC': 'الفيدرالي',
    'ECB': 'المركزي الأوروبي',
    'BOE': 'بنك إنجلترا',
    'BOJ': 'بنك اليابان',
    'ZEW': 'ZEW',
  };

  // محاولة استبدال الكلمات
  for (const [eng, ar] of Object.entries(commonWords)) {
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    if (translated.match(regex)) {
      // إذا وجدنا ترجمة، نستبدل
      translated = translated.replace(regex, ar);
    }
  }

  // إذا تم الترجمة جزئياً، نعيدها
  if (translated !== eventName) {
    return translated;
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
