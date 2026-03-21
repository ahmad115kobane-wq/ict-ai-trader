// routes/referral.ts
// مسارات نظام الإحالة والدعوات

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  getOrCreateReferralCode,
  validateAndCalculateDiscount,
  getReferralDashboard,
} from '../services/referralService';

const router = Router();

// ===================== الحصول على كود الدعوة الخاص بالمستخدم =====================
router.get('/my-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const code = await getOrCreateReferralCode(userId);

    if (!code) {
      return res.status(500).json({
        success: false,
        error: 'فشل في إنشاء كود الدعوة'
      });
    }

    res.json({
      success: true,
      referralCode: code,
      discountPercent: 15,
      rewardAmount: 5,
      message: 'شارك هذا الكود مع أصدقائك! سيحصلون على خصم 15% وستحصل أنت على 5 عملات مكافأة.'
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب كود الدعوة'
    });
  }
});

// ===================== التحقق من كود الدعوة =====================
router.post('/validate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { referralCode, packageId } = req.body;

    if (!referralCode || !packageId) {
      return res.status(400).json({
        success: false,
        error: 'كود الدعوة ومعرف الباقة مطلوبان'
      });
    }

    const result = await validateAndCalculateDiscount(
      referralCode.toUpperCase().trim(),
      userId,
      packageId
    );

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      message: result.message,
      discount: {
        percent: result.discountPercent,
        amount: result.discountAmount,
        originalPrice: result.originalPrice,
        finalPrice: result.finalPrice,
      }
    });
  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من كود الدعوة'
    });
  }
});

// ===================== لوحة إحصائيات الإحالة =====================
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const dashboard = await getReferralDashboard(userId);

    if (!dashboard) {
      return res.status(500).json({
        success: false,
        error: 'فشل في جلب بيانات الإحالة'
      });
    }

    res.json({
      success: true,
      ...dashboard
    });
  } catch (error) {
    console.error('Error getting referral dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب بيانات الإحالة'
    });
  }
});

export default router;
