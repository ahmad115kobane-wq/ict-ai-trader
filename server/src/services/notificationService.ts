// services/notificationService.ts
// خدمة الإشعارات - إدارة الإشعارات داخل التطبيق

import { query } from '../db/postgresAdapter';
import { v4 as uuidv4 } from 'uuid';

// ===================== Types =====================
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'event_reminder' | 'subscription_purchased' | 'subscription_expired';
  read: boolean;
  created_at: string;
  data?: any; // بيانات إضافية (JSON)
}

// ===================== Database Functions =====================

/**
 * تهيئة جدول الإشعارات
 */
export async function initNotificationsTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data JSONB,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // إنشاء index للأداء
    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `);

    console.log('✅ Notifications table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize notifications table:', error);
    throw error;
  }
}

/**
 * إنشاء إشعار جديد
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'event_reminder' | 'subscription_purchased' | 'subscription_expired',
  data?: any
): Promise<string> {
  try {
    const id = uuidv4();
    
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, title, message, type, data ? JSON.stringify(data) : null]
    );

    console.log(`✅ Notification created for user ${userId}: ${title}`);
    return id;
  } catch (error) {
    console.error('❌ Failed to create notification:', error);
    throw error;
  }
}

/**
 * جلب إشعارات المستخدم
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50
): Promise<Notification[]> {
  try {
    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row: any) => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null
    }));
  } catch (error) {
    console.error('❌ Failed to get user notifications:', error);
    return [];
  }
}

/**
 * عدد الإشعارات غير المقروءة
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );

    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    console.error('❌ Failed to get unread count:', error);
    return 0;
  }
}

/**
 * تعليم إشعار كمقروء
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE notifications
       SET read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ Failed to mark as read:', error);
    return false;
  }
}

/**
 * تعليم جميع الإشعارات كمقروءة
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  try {
    await query(
      `UPDATE notifications
       SET read = TRUE
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );

    return true;
  } catch (error) {
    console.error('❌ Failed to mark all as read:', error);
    return false;
  }
}

/**
 * حذف إشعار
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ Failed to delete notification:', error);
    return false;
  }
}

/**
 * حذف الإشعارات القديمة (أكثر من 30 يوم)
 */
export async function deleteOldNotifications(): Promise<number> {
  try {
    const result = await query(
      `DELETE FROM notifications
       WHERE created_at < NOW() - INTERVAL '30 days'`
    );

    const deletedCount = result.rowCount;
    if (deletedCount > 0) {
      console.log(`🗑️ Deleted ${deletedCount} old notifications`);
    }

    return deletedCount;
  } catch (error) {
    console.error('❌ Failed to delete old notifications:', error);
    return 0;
  }
}

// ===================== Notification Creators =====================

/**
 * إنشاء إشعار تذكير بحدث اقتصادي (قبل 5 دقائق)
 */
export async function createEventReminderNotification(
  userId: string,
  eventName: string,
  eventTime: string,
  impact: string
): Promise<void> {
  const impactEmoji = impact === 'high' ? '🔴' : impact === 'medium' ? '🟡' : '🟢';
  
  await createNotification(
    userId,
    `${impactEmoji} تذكير: حدث اقتصادي قريب`,
    `سيصدر خبر "${eventName}" خلال 5 دقائق (${eventTime})`,
    'event_reminder',
    { eventName, eventTime, impact }
  );
}

/**
 * إنشاء إشعار شراء اشتراك
 */
export async function createSubscriptionPurchasedNotification(
  userId: string,
  packageName: string,
  duration: number
): Promise<void> {
  const durationText = duration === 7 ? 'أسبوع' : duration === 30 ? 'شهر' : duration === 365 ? 'سنة' : `${duration} يوم`;
  
  await createNotification(
    userId,
    '🎉 تم تفعيل الاشتراك',
    `تم تفعيل باقة ${packageName} لمدة ${durationText} بنجاح`,
    'subscription_purchased',
    { packageName, duration }
  );
}

/**
 * إنشاء إشعار انتهاء اشتراك
 */
export async function createSubscriptionExpiredNotification(
  userId: string,
  packageName: string
): Promise<void> {
  await createNotification(
    userId,
    '⚠️ انتهت صلاحية اشتراكك',
    `انتهت صلاحية باقة ${packageName}. قم بتجديد اشتراكك للاستمرار في الاستفادة من الخدمات`,
    'subscription_expired',
    { packageName }
  );
}

/**
 * إرسال إشعارات لجميع المستخدمين المشتركين
 */
export async function notifyAllSubscribers(
  title: string,
  message: string,
  type: 'event_reminder' | 'subscription_purchased' | 'subscription_expired'
): Promise<number> {
  try {
    // جلب جميع المستخدمين المشتركين
    const result = await query(`
      SELECT id FROM users
      WHERE subscription IS NOT NULL
        AND subscription != 'free'
        AND subscription_expiry > NOW()
    `);

    let count = 0;
    for (const user of result.rows) {
      await createNotification(user.id, title, message, type);
      count++;
    }

    console.log(`📢 Sent notification to ${count} subscribers`);
    return count;
  } catch (error) {
    console.error('❌ Failed to notify all subscribers:', error);
    return 0;
  }
}
