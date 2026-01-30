// economicEventNotificationService.ts - خدمة إشعارات الأحداث الاقتصادية
import { 
  getEconomicCalendar, 
  EconomicEvent, 
  formatEventForDisplay 
} from './economicCalendarService';

// تتبع الأحداث التي تم إرسال إشعارات لها
const notifiedEvents = new Set<string>();
const notifiedEventsBefore5Min = new Set<string>();

let monitoringInterval: NodeJS.Timeout | null = null;

/**
 * بدء مراقبة الأحداث الاقتصادية
 */
export function startEconomicEventMonitoring() {
  if (monitoringInterval) {
    console.log('⚠️ Economic event monitoring already running');
    return;
  }

  console.log('📅 Starting economic event monitoring...');
  
  // فحص كل دقيقة
  monitoringInterval = setInterval(async () => {
    await checkUpcomingEvents();
  }, 60 * 1000); // كل دقيقة

  // فحص فوري عند البدء
  checkUpcomingEvents();
}

/**
 * إيقاف مراقبة الأحداث الاقتصادية
 */
export function stopEconomicEventMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('📅 Economic event monitoring stopped');
  }
}

/**
 * فحص الأحداث القادمة وإرسال الإشعارات
 */
async function checkUpcomingEvents() {
  try {
    const calendar = await getEconomicCalendar(true); // فرض التحديث للحصول على أحدث البيانات
    const now = new Date();

    for (const event of calendar.events) {
      // تجاهل الأحداث منخفضة التأثير
      if (event.impact === 'low') continue;

      const eventTime = new Date(`${event.date}T${event.time}`);
      const timeDiff = eventTime.getTime() - now.getTime();
      const minutesUntil = Math.floor(timeDiff / (1000 * 60));

      // إشعار قبل 5 دقائق
      if (minutesUntil === 5 && !notifiedEventsBefore5Min.has(event.id)) {
        await sendEventNotification(event, 'before');
        notifiedEventsBefore5Min.add(event.id);
        console.log(`📅 Sent 5-minute warning for: ${event.event}`);
      }

      // إشعار عند صدور الخبر (في نفس الدقيقة أو بعدها مباشرة)
      // نتحقق إذا كان الوقت قد حان ولم نرسل إشعار من قبل
      if (minutesUntil <= 0 && minutesUntil >= -5 && !notifiedEvents.has(event.id)) {
        // إعادة جلب البيانات للتأكد من وجود النتيجة الفعلية
        const updatedCalendar = await getEconomicCalendar(true);
        const updatedEvent = updatedCalendar.events.find(e => e.id === event.id);
        
        if (updatedEvent) {
          await sendEventNotification(updatedEvent, 'now');
          notifiedEvents.add(event.id);
          console.log(`📅 Sent release notification for: ${updatedEvent.event}${updatedEvent.actual ? ' (Actual: ' + updatedEvent.actual + ')' : ''}`);
        }
      }

      // تنظيف الأحداث القديمة (أكثر من ساعة)
      if (minutesUntil < -60) {
        notifiedEvents.delete(event.id);
        notifiedEventsBefore5Min.delete(event.id);
      }
    }
  } catch (error) {
    console.error('❌ Error checking economic events:', error);
  }
}

/**
 * إرسال إشعار للحدث الاقتصادي
 */
async function sendEventNotification(
  event: EconomicEvent, 
  timing: 'before' | 'now'
) {
  const impactEmoji = event.impact === 'high' ? '🔴' : '🟡';
  
  let title: string;
  let message: string;

  if (timing === 'before') {
    title = `⏰ تنبيه: حدث اقتصادي خلال 5 دقائق`;
    message = `${impactEmoji} ${event.event}\n🌍 ${event.countryName} (${event.currency})\n🕐 ${event.time}`;
    if (event.forecast) {
      message += `\n📊 التوقع: ${event.forecast}`;
    }
    if (event.previous) {
      message += `\n📈 السابق: ${event.previous}`;
    }
  } else {
    // إشعار عند الصدور - مع التركيز على النتيجة
    if (event.actual) {
      title = `📢 صدر الآن: ${event.event}`;
      message = `${impactEmoji} ${event.countryName} (${event.currency})\n\n✅ النتيجة الفعلية: ${event.actual}`;
      if (event.forecast) {
        message += `\n📊 التوقع كان: ${event.forecast}`;
      }
      if (event.previous) {
        message += `\n📈 القراءة السابقة: ${event.previous}`;
      }
    } else {
      // إذا لم تتوفر النتيجة بعد
      title = `📢 حان وقت: ${event.event}`;
      message = `${impactEmoji} ${event.countryName} (${event.currency})\n🕐 ${event.time}\n\n⏳ في انتظار النتيجة...`;
      if (event.forecast) {
        message += `\n📊 التوقع: ${event.forecast}`;
      }
    }
  }

  // إرسال إشعار Telegram
  await sendTelegramNotification(title, message);

  // إرسال Push Notification للهواتف
  await sendPushNotification(title, message, event);
}

/**
 * إرسال إشعار Telegram
 */
async function sendTelegramNotification(title: string, message: string) {
  try {
    const { sendTelegramNotification: sendTelegram } = await import('./notificationService');
    const fullMessage = `${title}\n\n${message}`;
    await sendTelegram(fullMessage);
  } catch (error) {
    console.error('❌ Failed to send Telegram notification:', error);
  }
}

/**
 * إرسال Push Notification للهواتف
 */
async function sendPushNotification(
  title: string, 
  message: string, 
  event: EconomicEvent
) {
  try {
    const { getUsersWithPushTokens } = await import('../db/index');
    const { sendFirebasePushNotification } = await import('./firebasePushService');

    const usersWithTokens = await getUsersWithPushTokens();
    const pushTokens = usersWithTokens.map((u: any) => u.push_token).filter(Boolean);

    if (pushTokens.length === 0) {
      console.log('📱 No push tokens registered for economic events');
      return;
    }

    // إرسال إشعار مخصص للأحداث الاقتصادية
    const success = await sendEconomicEventPushNotification(
      pushTokens,
      title,
      message,
      event
    );

    if (success) {
      console.log(`📱 Economic event notification sent to ${pushTokens.length} devices`);
    }
  } catch (error) {
    console.error('❌ Failed to send push notification:', error);
  }
}

/**
 * إرسال إشعار Firebase مخصص للأحداث الاقتصادية
 */
async function sendEconomicEventPushNotification(
  tokens: string[],
  title: string,
  body: string,
  event: EconomicEvent
): Promise<boolean> {
  try {
    const admin = await import('firebase-admin');
    
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        type: 'economic_event',
        eventId: event.id,
        eventName: event.event,
        country: event.countryName,
        currency: event.currency,
        impact: event.impact,
        time: event.time,
        date: event.date,
        forecast: event.forecast || '',
        previous: event.previous || '',
        actual: event.actual || '',
      },
      tokens,
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'economic_events',
          priority: 'high' as const,
          sound: 'default',
          color: event.impact === 'high' ? '#ef4444' : '#f59e0b',
          icon: 'notification_icon',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.default.messaging().sendEachForMulticast(message);
    
    if (response.failureCount > 0) {
      console.log(`⚠️ ${response.failureCount} notifications failed to send`);
      
      // تسجيل التوكنات الفاشلة فقط
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.log(`Failed token: ${tokens[idx].substring(0, 20)}...`);
        }
      });
    }

    return response.successCount > 0;
  } catch (error) {
    console.error('❌ Firebase economic event notification error:', error);
    return false;
  }
}

/**
 * إرسال إشعار تجريبي للأحداث الاقتصادية
 */
export async function sendTestEconomicEventNotification() {
  const testEvent: EconomicEvent = {
    id: 'test_' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    country: 'US',
    countryName: 'الولايات المتحدة',
    currency: 'USD',
    event: 'الوظائف غير الزراعية (اختبار)',
    impact: 'high',
    forecast: '180K',
    previous: '175K',
  };

  console.log('🧪 Sending test economic event notification...');
  await sendEventNotification(testEvent, 'before');
  
  return {
    success: true,
    message: 'Test economic event notification sent',
    event: testEvent,
  };
}

/**
 * الحصول على إحصائيات الإشعارات
 */
export function getNotificationStats() {
  return {
    totalNotified: notifiedEvents.size,
    totalWarnings: notifiedEventsBefore5Min.size,
    isMonitoring: monitoringInterval !== null,
  };
}
