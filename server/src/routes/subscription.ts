// routes/subscription.ts
// مسارات إدارة الاشتراكات والباقات

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

// شراء اشتراك جديد
router.post('/purchase', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { packageId, paymentMethod, autoRenew = false } = req.body;
    const userId = req.userId!;

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

    // محاكاة عملية الدفع (في التطبيق الحقيقي، يجب التكامل مع بوابة دفع)
    console.log(`💳 Processing payment for package ${packageId} by user ${userId}`);
    console.log(`💰 Amount: $${packageDetails.price}, Method: ${paymentMethod || 'default'}`);

    // شراء الاشتراك
    const result = await purchaseSubscription({
      packageId,
      userId,
      paymentMethod,
      autoRenew
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    // الحصول على حالة الاشتراك الجديدة
    const subscriptionStatus = await getUserSubscriptionStatus(userId);

    res.json({
      success: true,
      message: result.message,
      subscription: {
        id: result.subscriptionId,
        packageName: packageDetails.nameAr,
        expiresAt: result.expiresAt,
        coinsAdded: packageDetails.coinsIncluded,
        analysisLimit: packageDetails.analysisLimit,
        isUnlimited: packageDetails.analysisLimit === -1
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

// شراء عملات إضافية
router.post('/buy-coins', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, paymentMethod } = req.body;
    const userId = req.userId!;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'كمية العملات يجب أن تكون أكبر من صفر'
      });
    }

    // حساب السعر (مثال: 1 دولار = 100 عملة)
    const pricePerCoin = 0.01; // 1 سنت لكل عملة
    const totalPrice = amount * pricePerCoin;

    // محاكاة عملية الدفع
    console.log(`💳 Processing coins purchase: ${amount} coins for $${totalPrice.toFixed(2)} by user ${userId}`);

    // إضافة العملات
    const success = addCoinsToUser(userId, amount, `شراء ${amount} عملة`);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'فشل في إضافة العملات'
      });
    }

    // الحصول على الرصيد الجديد
    const subscriptionStatus = await getUserSubscriptionStatus(userId);

    res.json({
      success: true,
      message: `تم شراء ${amount} عملة بنجاح`,
      purchase: {
        amount,
        price: totalPrice,
        paymentMethod: paymentMethod || 'default'
      },
      newBalance: req.user?.coins + amount
    });

  } catch (error) {
    console.error('Buy coins error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في شراء العملات'
    });
  }
});

// ===================== VIP Routes (تحتاج اشتراك نشط) =====================

// إحصائيات الاشتراك (للمشتركين فقط)
router.get('/stats', authMiddleware, activeSubscriptionMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const subscriptionStatus = await getUserSubscriptionStatus(userId);
    
    // إحصائيات مخصصة للمستخدم المشترك
    const stats = {
      subscription: subscriptionStatus.subscription,
      analysisUsage: {
        dailyLimit: subscriptionStatus.subscription?.analysis_limit || 0,
        dailyUsed: 0, // يمكن حسابها من قاعدة البيانات
        remainingToday: subscriptionStatus.analysisInfo.remainingAnalyses || 0
      },
      features: subscriptionStatus.subscription?.features || [],
      expiryInfo: {
        expiresAt: subscriptionStatus.subscription?.expires_at,
        daysRemaining: subscriptionStatus.subscription?.expires_at ? 
          Math.ceil((new Date(subscriptionStatus.subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب إحصائيات الاشتراك'
    });
  }
});

// تجديد الاشتراك تلقائياً
router.post('/renew', authMiddleware, activeSubscriptionMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { autoRenew } = req.body;

    // هنا يمكن تحديث إعدادات التجديد التلقائي
    // للبساطة، سنرجع رسالة نجاح
    
    res.json({
      success: true,
      message: `تم ${autoRenew ? 'تفعيل' : 'إلغاء'} التجديد التلقائي`,
      autoRenew: autoRenew
    });

  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تجديد الاشتراك'
    });
  }
});

// إلغاء الاشتراك
router.post('/cancel', authMiddleware, activeSubscriptionMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // هنا يمكن تنفيذ منطق إلغاء الاشتراك
    // للبساطة، سنرجع رسالة تأكيد
    
    res.json({
      success: true,
      message: 'تم طلب إلغاء الاشتراك. سيتم إلغاؤه عند انتهاء الفترة الحالية.',
      note: 'يمكنك الاستمرار في استخدام الخدمة حتى تاريخ انتهاء الاشتراك'
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إلغاء الاشتراك'
    });
  }
});

export default router;