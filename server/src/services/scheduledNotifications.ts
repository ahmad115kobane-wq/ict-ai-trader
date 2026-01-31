// services/scheduledNotifications.ts
// خدمة الإشعارات المجدولة - تذكيرات الأحداث الاقتصادية وانتهاء الاشتراكات

import cron from 'node-cron';
import { query } from '../db/postgresAdapter';
import {
  createEventReminderNotification,
  createSubscriptionExpiredNotification,
  deleteOldNotifications
} from './notificationService';
import { getEconomicCalendar, EconomicEvent } from './economicCalendarService';

// ===================== Economic Event Reminders =====================

let eventReminderInterval: NodeJS.Timeout | null = null;
const notifiedEvents = new Set<string>(); // لتجنب إرسال نفس الإشعار مرتين

/**
 * بدء مراقبة الأحداث الاقتصادية وإرسال تذكيرات قبل 5 دقائق
 */
export function startEconomicEventReminders(): void {
  if (eventReminderInterval) {
    console.log('⚠️ Economic event reminders already running');
    return;
  }

  console.log('✅ Starting economic event reminders (5 min before)');

  // فحص كل دقيقة
  eventReminderInterval = setInterval(async () => {
    try {
      await checkUpcomingEvents();
    } catch (error) {
      console.error('❌ Error checking upcoming events:', error);
    }
  }, 60 * 1000); // كل دقيقة

  // فحص فوري عند البدء
  checkUpcomingEvents();
}

/**
 * إيقاف مراقبة الأحداث الاقتصادية
 */
export function stopEconomicEventReminders(): void {
  if (eventReminderInterval) {
    clearInterval(eventReminderInterval);
    eventReminderInterval = null;
    notifiedEvents.clear();
    console.log('⏹️ Economic event reminders stopped');
  }
}

/**
 * فحص الأحداث القادمة وإرسال تذكيرات
 */
async function checkUpcomingEvents(): Promise<void> {
  try {
    // جلب التقويم الاقتصادي
    const calendar = await getEconomicCalendar();
    if (!calendar.success || calendar.events.length === 0) {
      return;
    }

    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
    const sixMinutesLater = new Date(now.getTime() + 6 * 60 * 1000);

    // البحث عن الأحداث التي ستحدث خلال 5-6 دقائق
    const upcomingEvents = calendar.events.filter((event: EconomicEvent) => {
      const eventTime = new Date(`${event.date}T${event.time}`);
      return eventTime >= fiveMinutesLater && eventTime <= sixMinutesLater;
    });

    if (upcomingEvents.length === 0) {
      return;
    }

    // جلب جميع المستخدمين المشتركين
    const usersResult = await query(`
      SELECT id FROM users
      WHERE subscription IS NOT NULL
        AND subscription != 'free'
        AND subscription_expiry > NOW()
    `);

    const users = usersResult.rows;
    if (users.length === 0) {
      return;
    }

    // إرسال تذكيرات للأحداث القادمة
    for (const event of upcomingEvents) {
      const eventKey = `${event.date}_${event.time}_${event.event}`;
      
      // تجنب إرسال نفس الإشعار مرتين
      if (notifiedEvents.has(eventKey)) {
        continue;
      }

      notifiedEvents.add(eventKey);

      // إرسال إشعار لكل مستخدم
      for (const user of users) {
        await createEventReminderNotification(
          user.id,
          event.event,
          event.time,
          event.impact
        );
      }

      console.log(`📢 Sent event reminder to ${users.length} users: ${event.event} at ${event.time}`);
    }

    // تنظيف الأحداث القديمة من الذاكرة (الأحداث التي مضى عليها أكثر من ساعة)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    for (const eventKey of notifiedEvents) {
      const [date, time] = eventKey.split('_');
      const eventTime = new Date(`${date}T${time}`);
      if (eventTime < oneHourAgo) {
        notifiedEvents.delete(eventKey);
      }
    }

  } catch (error) {
    console.error('❌ Error in checkUpcomingEvents:', error);
  }
}

// ===================== Subscription Expiry Notifications =====================

/**
 * فحص الاشتراكات المنتهية وإرسال إشعارات
 * يعمل كل ساعة
 */
export function startSubscriptionExpiryCheck(): void {
  // فحص كل ساعة
  cron.schedule('0 * * * *', async () => {
    try {
      await checkExpiredSubscriptions();
    } catch (error) {
      console.error('❌ Error checking expired subscriptions:', error);
    }
  });

  console.log('✅ Subscription expiry check scheduled (every hour)');

  // فحص فوري عند البدء
  checkExpiredSubscriptions();
}

/**
 * فحص الاشتراكات التي انتهت خلال الساعة الماضية وإرسال إشعارات
 */
async function checkExpiredSubscriptions(): Promise<void> {
  try {
    // جلب الاشتراكات التي انتهت خلال الساعة الماضية ولم يتم إرسال إشعار لها
    const result = await query(`
      SELECT u.id as user_id, u.email, u.subscription, s.package_id, p.name_ar
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = FALSE
      LEFT JOIN packages p ON s.package_id = p.id
      WHERE u.subscription_expiry > NOW() - INTERVAL '1 hour'
        AND u.subscription_expiry <= NOW()
        AND u.subscription != 'free'
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = u.id
            AND n.type = 'subscription_expired'
            AND n.created_at > NOW() - INTERVAL '2 hours'
        )
    `);

    const expiredUsers = result.rows;
    if (expiredUsers.length === 0) {
      return;
    }

    // إرسال إشعار لكل مستخدم
    for (const user of expiredUsers) {
      const packageName = user.name_ar || user.subscription || 'الباقة';
      
      await createSubscriptionExpiredNotification(
        user.user_id,
        packageName
      );

      console.log(`📢 Sent expiry notification to user ${user.email}: ${packageName}`);
    }

    console.log(`✅ Sent ${expiredUsers.length} subscription expiry notifications`);

  } catch (error) {
    console.error('❌ Error in checkExpiredSubscriptions:', error);
  }
}

// ===================== Cleanup Old Notifications =====================

/**
 * حذف الإشعارات القديمة (أكثر من 30 يوم)
 * يعمل يومياً في الساعة 3 صباحاً
 */
export function startNotificationCleanup(): void {
  // يومياً في الساعة 3 صباحاً
  cron.schedule('0 3 * * *', async () => {
    try {
      const deletedCount = await deleteOldNotifications();
      if (deletedCount > 0) {
        console.log(`🗑️ Cleaned up ${deletedCount} old notifications`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up notifications:', error);
    }
  });

  console.log('✅ Notification cleanup scheduled (daily at 3 AM)');
}

// ===================== Start All Scheduled Jobs =====================

/**
 * بدء جميع المهام المجدولة
 */
export function startAllScheduledNotifications(): void {
  startEconomicEventReminders();
  startSubscriptionExpiryCheck();
  startNotificationCleanup();
  console.log('✅ All scheduled notification jobs started');
}

/**
 * إيقاف جميع المهام المجدولة
 */
export function stopAllScheduledNotifications(): void {
  stopEconomicEventReminders();
  console.log('⏹️ All scheduled notification jobs stopped');
}
