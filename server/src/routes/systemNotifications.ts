// routes/systemNotifications.ts
// API endpoints لإشعارات النظام (منفصلة عن إشعارات الصفقات)

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  getUserSystemNotifications,
  markSystemNotificationAsRead,
  markAllSystemNotificationsAsRead,
  deleteSystemNotification
} from '../services/systemNotificationService';

const router = Router();

/**
 * GET /api/system-notifications
 * الحصول على إشعارات النظام للمستخدم
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;

    const notifications = await getUserSystemNotifications(userId, limit);

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error getting system notifications:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإشعارات'
    });
  }
});

/**
 * GET /api/system-notifications/unread-count
 * الحصول على عدد الإشعارات غير المقروءة
 */
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const notifications = await getUserSystemNotifications(userId, 1000);
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب عدد الإشعارات'
    });
  }
});

/**
 * PUT /api/system-notifications/:id/read
 * تعليم إشعار كمقروء
 */
router.put('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await markSystemNotificationAsRead(id);

    res.json({
      success: true,
      message: 'تم تعليم الإشعار كمقروء'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الإشعار'
    });
  }
});

/**
 * PUT /api/system-notifications/mark-all-read
 * تعليم جميع الإشعارات كمقروءة
 */
router.put('/mark-all-read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await markAllSystemNotificationsAsRead(userId);

    res.json({
      success: true,
      message: 'تم تعليم جميع الإشعارات كمقروءة'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الإشعارات'
    });
  }
});

/**
 * DELETE /api/system-notifications/:id
 * حذف إشعار
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteSystemNotification(id);

    res.json({
      success: true,
      message: 'تم حذف الإشعار'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حذف الإشعار'
    });
  }
});

/**
 * POST /api/system-notifications/test-broadcast
 * إرسال إشعار تجريبي لجميع المستخدمين (بدون authentication)
 */
router.post('/test-broadcast', async (req: any, res: Response) => {
  try {
    const { title, message, type, priority } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'البيانات المطلوبة: title, message'
      });
    }

    const notification = {
      type: type || 'system_update',
      title,
      message,
      priority: priority || 'normal',
      data: {}
    };

    const { getAllUsers } = await import('../db/index');
    const { sendSystemNotification } = await import('../services/systemNotificationService');
    
    const users = await getAllUsers();
    
    console.log(`📨 Broadcasting test notification to ${users.length} users...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const user of users) {
      try {
        const success = await sendSystemNotification(user.id, notification);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    res.json({
      success: true,
      message: 'تم إرسال الإشعار التجريبي',
      stats: {
        total: users.length,
        success: successCount,
        failed: failCount
      }
    });
  } catch (error) {
    console.error('Error broadcasting test notification:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إرسال الإشعار'
    });
  }
});

export default router;
