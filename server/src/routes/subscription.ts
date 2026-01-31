// routes/subscription.ts
// مسارات إدارة الاشتراكات والباقات - نظام الدفع بالعملات

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { activeSubscriptionMiddleware } from '../middleware/subscriptionAuth';
import {
  getAvailablePackages,
  getPackageDetails,
  purchaseSubscription,
  getUserSubscriptionStatus,
  getUserSubscriptions,
  addCoinsToUser,
  getSubscriptionStats
} from '../services/subscriptionService';

const router = Router();

// ===================== Public Routes (لا تحتاج تسجيل دخول) =====================

// الحصول على جميع الباقات المتاحة
router.get('/packages', async (req, res) => {
  try {
    const packages = await getAvailablePackages();
    
    res.json({
      success: true,
      packages: packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        nameAr: pkg.nameAr,
        description: pkg.description,
        descriptionAr: pkg.descriptionAr,
        durationType: pkg.durationType,
        durationDays: pkg.durationDays,
        price: pkg.price,
        coinPrice: Math.round(pkg.price * 100), // 1 دولار = 100 عملة
        coinsIncluded: pkg.coinsIncluded,
        analysisLimit: pkg.analysisLimit,
        features: pkg.features,
        isUnlimited: pkg.analysisLimit === -1
      })),
      message: 'تم جلب الباقات بنجاح'
    });

  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب الباقات'
    });
  }
});

// الحصول على تفاصيل باقة محددة
router.get('/packages/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;
    const packageDetails = await getPackageDetails(packageId);
    
    if (!packageDetails) {
      return res.status(404).json({
        success: false,
        error: 'الباقة غير موجودة'
      });
    }

    res.json({
      success: true,
      package: {
        id: packageDetails.id,
        name: packageDetails.name,
        nameAr: packageDetails.nameAr,
        description: packageDetails.description,
        descriptionAr: packageDetails.descriptionAr,
        durationType: packageDetails.durationType,
        durationDays: packageDetails.durationDays,
        price: packageDetails.price,
        coinPrice: Math.round(packageDetails.price * 100), // 1 دولار = 100 عملة
        coinsIncluded: packageDetails.coinsIncluded,
        analysisLimit: packageDetails.analysisLimit,
        features: packageDetails.features,
        isUnlimited: packageDetails.analysisLimit === -1
      }
    });

  } catch (error) {
    console.error('Get package details error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب تفاصيل الباقة'
    });
  }
});

// ===================== Protected Routes (تحتاج تسجيل دخول) =====================

// شراء اشتراك جديد (بالعملات)
router.post('/purchase', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { packageId } = req.body;
    const userId = req.userId!;
    const user = req.user;

    if (!packageId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الباقة مطلوب'
      });
    }

    // التحقق من وجود الباقة
    const packageDetails = await getPackageDetails(packageId);
    if (!packageDetails) {
      return res.status(404).json({
        success: false,
        error: 'الباقة المطلوبة غير موجودة'
      });
    }

    // حساب سعر الباقة بالعملات (1 دولار = 100 عملة)
    const coinPrice = Math.round(packageDetails.price * 100);
    
    console.log(`💰 User ${userId} attempting to purchase package ${packageId}`);
    console.log(`💵 Package price: $${packageDetails.price} = ${coinPrice} coins`);
    console.log(`🪙 User current balance: ${user?.coins || 0} coins`);

    // التحقق من رصيد المستخدم
    if (!user || (user.coins || 0) < coinPrice) {
      return res.status(400).json({
        success: false,
        error: `رصيدك غير كافٍ. تحتاج إلى ${coinPrice} عملة، ولديك ${user?.coins || 0} عملة فقط.`,
        required: coinPrice,
        current: user?.coins || 0,
        shortage: coinPrice - (user?.coins || 0)
      });
    }

    // خصم العملات من المستخدم
    const newBalance = (user.coins || 0) - coinPrice;
    const deductSuccess = addCoinsToUser(userId, -coinPrice, `شراء باقة ${packageDetails.nameAr}`);
    
    if (!deductSuccess) {
      return res.status(500).json({
        success: false,
        error: 'فشل في خصم العملات'
      });
    }

    console.log(`✅ Deducted ${coinPrice} coins. New balance: ${newBalance}`);

    // شراء الاشتراك
    const result = await purchaseSubscription({
      packageId,
      userId,
      paymentMethod: 'coins',
      autoRenew: false
    });

    if (!result.success) {
      // إرجاع العملات في حالة الفشل
      addCoinsToUser(userId, coinPrice, `إرجاع عملات - فشل شراء باقة ${packageDetails.nameAr}`);
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    // الحصول على حالة الاشتراك الجديدة
    const subscriptionStatus = await getUserSubscriptionStatus(userId);

    res.json({
      success: true,
      message: `تم شراء باقة ${packageDetails.nameAr} بنجاح! تم خصم ${coinPrice} عملة من رصيدك.`,
      subscription: {
        id: result.subscriptionId,
        packageName: packageDetails.nameAr,
        expiresAt: result.expiresAt,
        coinsAdded: packageDetails.coinsIncluded,
        analysisLimit: packageDetails.analysisLimit,
        isUnlimited: packageDetails.analysisLimit === -1
      },
      payment: {
        method: 'coins',
        amount: coinPrice,
        previousBalance: user.coins,
        newBalance: newBalance
      },
      subscriptionStatus
    });

  } catch (error) {
    console.error('Purchase subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في شراء الاشتراك'
    });
  }
});

// الحصول على حالة اشتراك المستخدم الحالي
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const subscriptionStatus = await getUserSubscriptionStatus(userId);
    const user = req.user;

    res.json({
      success: true,
      user: {
        id: user?.id,
        email: user?.email,
        coins: user?.coins,
        subscription: user?.subscription,
        subscriptionExpiry: user?.subscription_expiry
      },
      subscriptionStatus: {
        hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
        canAnalyze: subscriptionStatus.canAnalyze,
        subscription: subscriptionStatus.subscription ? {
          id: subscriptionStatus.subscription.id,
          planName: subscriptionStatus.subscription.plan_name,
          packageNameAr: subscriptionStatus.subscription.package_name_ar,
          analysisLimit: subscriptionStatus.subscription.analysis_limit,
          isUnlimited: subscriptionStatus.subscription.analysis_limit === -1,
          expiresAt: subscriptionStatus.subscription.expires_at,
          status: subscriptionStatus.subscription.status,
          features: subscriptionStatus.subscription.features || []
        } : null,
        analysisInfo: subscriptionStatus.analysisInfo
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب حالة الاشتراك'
    });
  }
});

// الحصول على سجل اشتراكات المستخدم
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const subscriptions = await getUserSubscriptions(userId, limit);

    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        planName: sub.plan_name,
        packageNameAr: sub.package_name_ar,
        coinsAdded: sub.coins_added,
        price: sub.price,
        analysisLimit: sub.analysis_limit,
        isUnlimited: sub.analysis_limit === -1,
        status: sub.status,
        startedAt: sub.started_at,
        expiresAt: sub.expires_at,
        autoRenew: sub.auto_renew === 1
      })),
      total: subscriptions.length
    });

  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب سجل الاشتراكات'
    });
  }
});

export default router;
