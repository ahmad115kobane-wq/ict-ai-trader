// routes/notifications.ts
// مسارات الإشعارات

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../services/notificationService';

const router = Router();

// جلب إشعارات المستخدم
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const notifications = await getUserNotifications(userId, limit);
    const unreadCount = await getUnreadCount(userId);
    
    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب الإشعارات'
    });
  }
});

// عدد الإشعارات غير المقروءة
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const count = await getUnreadCount(userId);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب عدد الإشعارات'
    });
  }
});

// تعليم إشعار كمقروء
router.post('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    
    const success = await markAsRead(id, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'تم تعليم الإشعار كمقروء'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'فشل في تعليم الإشعار'
      });
    }
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تعليم الإشعار'
    });
  }
});

// تعليم جميع الإشعارات كمقروءة
router.post('/mark-all-read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    const success = await markAllAsRead(userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'تم تعليم جميع الإشعارات كمقروءة'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'فشل في تعليم الإشعارات'
      });
    }
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تعليم الإشعارات'
    });
  }
});

// حذف إشعار
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    
    const success = await deleteNotification(id, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'تم حذف الإشعار'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'فشل في حذف الإشعار'
      });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في حذف الإشعار'
    });
  }
});

export default router;
