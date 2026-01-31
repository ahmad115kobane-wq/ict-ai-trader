// services/systemNotificationService.ts
// خدمة إشعارات النظام (منفصلة عن إشعارات الصفقات)
// ═══════════════════════════════════════════════════════════════════════════════

import { sendFirebaseSystemNotification } from './firebasePushService';
import { sendSystemMessageToTelegram } from './telegramService';

export interface SystemNotification {
  type: 'subscription_expired' | 'subscription_expiring' | 'subscription_purchased' | 'coins_low' | 'system_update' | 'welcome';
  title: string;
  message: string;
  priority: 'high' | 'normal' | 'low';
  data?: Record<string, any>;
}

/**
 * إرسال إشعار نظام لمستخدم واحد
 */
export async function sendSystemNotification(
  userId: string,
  notification: SystemNotification
): Promise<boolean> {
  try {
    const { getUserById } = await import('../db/index');
    const user = await getUserById(userId);
    
    if (!user) {
      console.error('❌ User not found:', userId);
      return false;
    }

    let success = false;

    // إرسال إلى Telegram إذا كان المستخدم مسجل عبر Telegram
    if (user.email && user.email.startsWith('telegram_')) {
      const telegramId = user.email.replace('telegram_', '').replace('@ict-trader.local', '');
      const telegramSuccess = await sendSystemMessageToTelegram(telegramId, notification);
      success = success || telegramSuccess;
    }

    // إرسال Push Notification إذا كان لديه token
    if (user.push_token) {
      const pushSuccess = await sendFirebaseSystemNotification(
        [user.push_token],
        notification
      );
      success = success || pushSuccess;
    }

    // حفظ الإشعار في قاعدة البيانات
    await saveSystemNotificationToDb(userId, notification);

    return success;
  } catch (error) {
    console.error('❌ Error sending system notification:', error);
    return false;
  }
}

/**
 * إرسال إشعار نظام لعدة مستخدمين
 */
export async function sendSystemNotificationToMultipleUsers(
  userIds: string[],
  notification: SystemNotification
): Promise<void> {
  console.log(`📢 Sending system notification to ${userIds.length} users`);
  
  const promises = userIds.map(userId => sendSystemNotification(userId, notification));
  await Promise.all(promises);
  
  console.log(`✅ System notifications sent`);
}

/**
 * إشعار انتهاء الاشتراك
 */
export async function notifySubscriptionExpired(userId: string, subscriptionType: string): Promise<void> {
  const notification: SystemNotification = {
    type: 'subscription_expired',
    title: '⚠️ انتهى اشتراكك',
    message: `لقد انتهى اشتراكك في باقة ${subscriptionType}. قم بتجديد اشتراكك للاستمرار في الحصول على التحليلات التلقائية.`,
    priority: 'high',
    data: {
      subscriptionType,
      action: 'renew_subscription'
    }
  };

  await sendSystemNotification(userId, notification);
}

/**
 * إشعار قرب انتهاء الاشتراك (3 أيام قبل الانتهاء)
 */
export async function notifySubscriptionExpiring(
  userId: string,
  subscriptionType: string,
  daysRemaining: number
): Promise<void> {
  const notification: SystemNotification = {
    type: 'subscription_expiring',
    title: '⏰ اشتراكك على وشك الانتهاء',
    message: `سينتهي اشتراكك في باقة ${subscriptionType} خلال ${daysRemaining} أيام. جدد الآن لتجنب انقطاع الخدمة.`,
    priority: 'normal',
    data: {
      subscriptionType,
      daysRemaining,
      action: 'renew_subscription'
    }
  };

  await sendSystemNotification(userId, notification);
}

/**
 * إشعار شراء اشتراك جديد
 */
export async function notifySubscriptionPurchased(
  userId: string,
  subscriptionType: string,
  expiryDate: Date
): Promise<void> {
  const notification: SystemNotification = {
    type: 'subscription_purchased',
    title: '🎉 تم تفعيل اشتراكك',
    message: `تم تفعيل اشتراكك في باقة ${subscriptionType} بنجاح! صالح حتى ${expiryDate.toLocaleDateString('ar-SA')}`,
    priority: 'high',
    data: {
      subscriptionType,
      expiryDate: expiryDate.toISOString(),
      action: 'view_subscription'
    }
  };

  await sendSystemNotification(userId, notification);
}

/**
 * إشعار انخفاض العملات
 */
export async function notifyCoinsLow(userId: string, remainingCoins: number): Promise<void> {
  const notification: SystemNotification = {
    type: 'coins_low',
    title: '💰 عملاتك على وشك النفاد',
    message: `لديك ${remainingCoins} عملة فقط. اشترِ المزيد من العملات أو اشترك في باقة للحصول على تحليلات غير محدودة.`,
    priority: 'normal',
    data: {
      remainingCoins,
      action: 'buy_coins'
    }
  };

  await sendSystemNotification(userId, notification);
}

/**
 * إشعار تحديث النظام
 */
export async function notifySystemUpdate(message: string): Promise<void> {
  const { getAllUsers } = await import('../db/index');
  const users = await getAllUsers();
  
  const notification: SystemNotification = {
    type: 'system_update',
    title: '🔔 تحديث جديد',
    message,
    priority: 'low',
    data: {
      action: 'view_updates'
    }
  };

  const userIds = users.map(u => u.id);
  await sendSystemNotificationToMultipleUsers(userIds, notification);
}

/**
 * إشعار ترحيب للمستخدمين الجدد
 */
export async function notifyWelcome(userId: string, userName?: string): Promise<void> {
  const notification: SystemNotification = {
    type: 'welcome',
    title: '👋 مرحباً بك في ICT AI Trader',
    message: `${userName ? `أهلاً ${userName}! ` : ''}نحن سعداء بانضمامك. ابدأ الآن بالحصول على تحليلات تداول احترافية مدعومة بالذكاء الاصطناعي.`,
    priority: 'normal',
    data: {
      action: 'view_tutorial'
    }
  };

  await sendSystemNotification(userId, notification);
}

/**
 * حفظ إشعار النظام في قاعدة البيانات
 */
async function saveSystemNotificationToDb(
  userId: string,
  notification: SystemNotification
): Promise<void> {
  try {
    // استخدام query مباشرة للوصول إلى قاعدة البيانات
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
    
    if (isProduction) {
      // PostgreSQL
      const { query } = await import('../db/postgresAdapter');
      const { v4: uuidv4 } = await import('uuid');
      
      await query(
        `INSERT INTO system_notifications (id, user_id, type, title, message, priority, data, read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
        [
          uuidv4(),
          userId,
          notification.type,
          notification.title,
          notification.message,
          notification.priority,
          notification.data ? JSON.stringify(notification.data) : null
        ]
      );
    } else {
      // SQLite
      const sqliteDb = await import('../db/database');
      const db = (sqliteDb as any).default;
      const { v4: uuidv4 } = await import('uuid');
      
      if (db) {
        db.run(
          `INSERT INTO system_notifications (id, user_id, type, title, message, priority, data, read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
          [
            uuidv4(),
            userId,
            notification.type,
            notification.title,
            notification.message,
            notification.priority,
            notification.data ? JSON.stringify(notification.data) : null
          ]
        );
      }
    }
    
    console.log(`✅ System notification saved to DB for user: ${userId}`);
  } catch (error) {
    console.error('❌ Error saving system notification to DB:', error);
  }
}

/**
 * الحصول على إشعارات النظام للمستخدم
 */
export async function getUserSystemNotifications(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    console.log(`🔍 getUserSystemNotifications called for user: ${userId}, limit: ${limit}`);
    
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
    
    console.log(`🌍 Environment: ${isProduction ? 'Production (PostgreSQL)' : 'Development (SQLite)'}`);
    
    if (isProduction) {
      // PostgreSQL
      const { query } = await import('../db/postgresAdapter');
      
      console.log(`📥 Executing query for user: ${userId}`);
      
      const result = await query(
        `SELECT * FROM system_notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );
      
      console.log(`✅ Query result: ${result.rows.length} notifications found`);
      
      if (result.rows.length > 0) {
        console.log(`📋 First notification:`, result.rows[0]);
      }
      
      return result.rows.map((notif: any) => ({
        ...notif,
        data: notif.data ? JSON.parse(notif.data) : null
      }));
    } else {
      // SQLite
      const sqliteDb = await import('../db/database');
      const db = (sqliteDb as any).default;
      
      if (!db) return [];
      
      const notifications = db.exec(
        `SELECT * FROM system_notifications 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
      );
      
      if (notifications.length === 0 || notifications[0].values.length === 0) return [];
      
      return notifications[0].values.map((row: any) => {
        const notif = rowToObject(notifications[0].columns, row);
        return {
          ...notif,
          data: notif.data ? JSON.parse(notif.data) : null
        };
      });
    }
  } catch (error) {
    console.error('❌ Error getting system notifications:', error);
    return [];
  }
}

// Helper function for SQLite
function rowToObject(columns: string[], values: any[]): any {
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj;
}

/**
 * تعليم إشعار كمقروء
 */
export async function markSystemNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
    
    if (isProduction) {
      // PostgreSQL
      const { query } = await import('../db/postgresAdapter');
      
      await query(
        `UPDATE system_notifications SET read = true WHERE id = $1`,
        [notificationId]
      );
    } else {
      // SQLite
      const sqliteDb = await import('../db/database');
      const db = (sqliteDb as any).default;
      
      if (db) {
        db.run(
          `UPDATE system_notifications SET read = 1 WHERE id = ?`,
          [notificationId]
        );
      }
    }
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
  }
}

/**
 * تعليم جميع إشعارات المستخدم كمقروءة
 */
export async function markAllSystemNotificationsAsRead(userId: string): Promise<void> {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
    
    if (isProduction) {
      // PostgreSQL
      const { query } = await import('../db/postgresAdapter');
      
      await query(
        `UPDATE system_notifications SET read = true WHERE user_id = $1`,
        [userId]
      );
    } else {
      // SQLite
      const sqliteDb = await import('../db/database');
      const db = (sqliteDb as any).default;
      
      if (db) {
        db.run(
          `UPDATE system_notifications SET read = 1 WHERE user_id = ?`,
          [userId]
        );
      }
    }
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
  }
}

/**
 * حذف إشعار
 */
export async function deleteSystemNotification(notificationId: string): Promise<void> {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
    
    if (isProduction) {
      // PostgreSQL
      const { query } = await import('../db/postgresAdapter');
      
      await query(
        `DELETE FROM system_notifications WHERE id = $1`,
        [notificationId]
      );
    } else {
      // SQLite
      const sqliteDb = await import('../db/database');
      const db = (sqliteDb as any).default;
      
      if (db) {
        db.run(
          `DELETE FROM system_notifications WHERE id = ?`,
          [notificationId]
        );
      }
    }
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
  }
}

/**
 * مهمة دورية للتحقق من الاشتراكات المنتهية والقريبة من الانتهاء
 */
export async function checkSubscriptionExpirations(): Promise<void> {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
    
    if (isProduction) {
      // PostgreSQL
      const { query } = await import('../db/postgresAdapter');
      
      // البحث عن الاشتراكات المنتهية
      const expiredUsers = await query(
        `SELECT id, email, subscription, subscription_expiry 
         FROM users 
         WHERE subscription != 'free' 
         AND subscription_expiry IS NOT NULL 
         AND subscription_expiry <= NOW()
         AND subscription_expiry_notified = false`
      );
      
      for (const user of expiredUsers.rows) {
        await notifySubscriptionExpired(user.id, user.subscription);
        
        // تعليم المستخدم كمُشعَر
        await query(
          `UPDATE users SET subscription_expiry_notified = true WHERE id = $1`,
          [user.id]
        );
      }
      
      // البحث عن الاشتراكات القريبة من الانتهاء (3 أيام)
      const expiringUsers = await query(
        `SELECT id, email, subscription, subscription_expiry 
         FROM users 
         WHERE subscription != 'free' 
         AND subscription_expiry IS NOT NULL 
         AND subscription_expiry > NOW()
         AND subscription_expiry <= NOW() + INTERVAL '3 days'
         AND subscription_expiring_notified = false`
      );
      
      for (const user of expiringUsers.rows) {
        const expiryDate = new Date(user.subscription_expiry);
        const now = new Date();
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        await notifySubscriptionExpiring(user.id, user.subscription, daysRemaining);
        
        // تعليم المستخدم كمُشعَر
        await query(
          `UPDATE users SET subscription_expiring_notified = true WHERE id = $1`,
          [user.id]
        );
      }
      
      console.log(`✅ Checked subscriptions: ${expiredUsers.rows.length} expired, ${expiringUsers.rows.length} expiring`);
    } else {
      // SQLite
      const sqliteDb = await import('../db/database');
      const db = (sqliteDb as any).default;
      
      if (!db) return;
      
      // البحث عن الاشتراكات المنتهية
      const expiredUsers = db.exec(
        `SELECT id, email, subscription, subscription_expiry 
         FROM users 
         WHERE subscription != 'free' 
         AND subscription_expiry IS NOT NULL 
         AND datetime(subscription_expiry) <= datetime('now')
         AND subscription_expiry_notified = 0`
      );
      
      if (expiredUsers.length > 0 && expiredUsers[0].values.length > 0) {
        for (const row of expiredUsers[0].values) {
          const user = rowToObject(expiredUsers[0].columns, row);
          await notifySubscriptionExpired(user.id, user.subscription);
          
          // تعليم المستخدم كمُشعَر
          db.run(
            `UPDATE users SET subscription_expiry_notified = 1 WHERE id = ?`,
            [user.id]
          );
        }
      }
      
      // البحث عن الاشتراكات القريبة من الانتهاء (3 أيام)
      const expiringUsers = db.exec(
        `SELECT id, email, subscription, subscription_expiry 
         FROM users 
         WHERE subscription != 'free' 
         AND subscription_expiry IS NOT NULL 
         AND datetime(subscription_expiry) > datetime('now')
         AND datetime(subscription_expiry) <= datetime('now', '+3 days')
         AND subscription_expiring_notified = 0`
      );
      
      if (expiringUsers.length > 0 && expiringUsers[0].values.length > 0) {
        for (const row of expiringUsers[0].values) {
          const user = rowToObject(expiringUsers[0].columns, row);
          const expiryDate = new Date(user.subscription_expiry);
          const now = new Date();
          const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          await notifySubscriptionExpiring(user.id, user.subscription, daysRemaining);
          
          // تعليم المستخدم كمُشعَر
          db.run(
            `UPDATE users SET subscription_expiring_notified = 1 WHERE id = ?`,
            [user.id]
          );
        }
      }
      
      const expiredCount = expiredUsers.length > 0 ? expiredUsers[0].values.length : 0;
      const expiringCount = expiringUsers.length > 0 ? expiringUsers[0].values.length : 0;
      console.log(`✅ Checked subscriptions: ${expiredCount} expired, ${expiringCount} expiring`);
    }
  } catch (error) {
    console.error('❌ Error checking subscription expirations:', error);
  }
}

export default {
  sendSystemNotification,
  sendSystemNotificationToMultipleUsers,
  notifySubscriptionExpired,
  notifySubscriptionExpiring,
  notifySubscriptionPurchased,
  notifyCoinsLow,
  notifySystemUpdate,
  notifyWelcome,
  getUserSystemNotifications,
  markSystemNotificationAsRead,
  markAllSystemNotificationsAsRead,
  deleteSystemNotification,
  checkSubscriptionExpirations
};
