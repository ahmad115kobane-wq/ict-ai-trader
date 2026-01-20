// middleware/subscriptionAuth.ts
// Middleware للتحقق من صلاحيات الاشتراك والتحليل

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getUserSubscriptionStatus, processAnalysisRequest } from '../services/subscriptionService';
import { deductCoins, getUserById } from '../db/index';

// Interface لطلبات التحليل
export interface AnalysisRequest extends AuthRequest {
  subscriptionInfo?: {
    hasActiveSubscription: boolean;
    canAnalyze: boolean;
    costDeducted?: number;
    remainingAnalyses?: number;
    remainingCoins?: number;
    reason?: string;
  };
}

// Middleware للتحقق من إمكانية التحليل
export const analysisPermissionMiddleware = (req: AnalysisRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير مصرح له',
        code: 'UNAUTHORIZED'
      });
    }

    // التحقق من حالة الاشتراك وإمكانية التحليل
    const subscriptionStatus = getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.canAnalyze) {
      return res.status(403).json({
        success: false,
        error: subscriptionStatus.analysisInfo.reason || 'غير مسموح بالتحليل',
        code: 'ANALYSIS_NOT_ALLOWED',
        subscriptionInfo: {
          hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
          canAnalyze: false,
          reason: subscriptionStatus.analysisInfo.reason
        }
      });
    }

    // معالجة طلب التحليل (خصم العملات أو تسجيل الاستخدام)
    const analysisResult = processAnalysisRequest(userId);
    
    if (!analysisResult.allowed) {
      return res.status(403).json({
        success: false,
        error: analysisResult.reason || 'فشل في معالجة طلب التحليل',
        code: 'ANALYSIS_PROCESSING_FAILED'
      });
    }

    // خصم العملات إذا كان مستخدم مجاني
    if (analysisResult.costDeducted) {
      const deductionSuccess = deductCoins(userId, analysisResult.costDeducted);
      if (!deductionSuccess) {
        return res.status(403).json({
          success: false,
          error: 'فشل في خصم العملات',
          code: 'COIN_DEDUCTION_FAILED'
        });
      }
    }

    // إضافة معلومات الاشتراك للطلب
    req.subscriptionInfo = {
      hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
      canAnalyze: true,
      costDeducted: analysisResult.costDeducted,
      remainingAnalyses: analysisResult.remainingAnalyses,
      reason: analysisResult.reason
    };

    console.log(`✅ Analysis permission granted for user ${userId}: ${analysisResult.reason}`);
    
    next();

  } catch (error) {
    console.error('❌ Analysis permission middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من صلاحيات التحليل',
      code: 'PERMISSION_CHECK_ERROR'
    });
  }
};

// Middleware للتحقق من رصيد العملات للمحادثة والمتابعة (50 عملة)
export const chatPermissionMiddleware = (req: AnalysisRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير مصرح له',
        code: 'UNAUTHORIZED'
      });
    }

    // التحقق من حالة الاشتراك
    const subscriptionStatus = getUserSubscriptionStatus(userId);
    
    // إذا كان لديه اشتراك نشط، السماح بدون خصم
    if (subscriptionStatus.hasActiveSubscription) {
      req.subscriptionInfo = {
        hasActiveSubscription: true,
        canAnalyze: true,
        costDeducted: 0,
        reason: 'Active subscription - no cost'
      };
      console.log(`✅ Chat/Follow-up permission granted for subscriber ${userId}`);
      next();
      return;
    }

    // للمستخدمين المجانيين: التحقق من رصيد العملات
    const user = getUserById(userId);
    const CHAT_COST = 50; // تكلفة المحادثة أو المتابعة
    
    if (!user || user.coins < CHAT_COST) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_COINS',
        message: `رصيد العملات غير كافٍ. مطلوب ${CHAT_COST} عملة`,
        code: 'INSUFFICIENT_COINS',
        required: CHAT_COST,
        current: user?.coins || 0
      });
    }

    // خصم العملات
    const deductionSuccess = deductCoins(userId, CHAT_COST);
    if (!deductionSuccess) {
      return res.status(403).json({
        success: false,
        error: 'فشل في خصم العملات',
        code: 'COIN_DEDUCTION_FAILED'
      });
    }

    req.subscriptionInfo = {
      hasActiveSubscription: false,
      canAnalyze: true,
      costDeducted: CHAT_COST,
      remainingCoins: user.coins - CHAT_COST,
      reason: `Deducted ${CHAT_COST} coins`
    };

    console.log(`✅ Chat/Follow-up permission granted for free user ${userId}: ${CHAT_COST} coins deducted`);
    
    next();

  } catch (error) {
    console.error('❌ Chat permission middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من صلاحيات المحادثة',
      code: 'PERMISSION_CHECK_ERROR'
    });
  }
};

// Middleware للتحقق من الاشتراك النشط فقط (بدون خصم)
export const activeSubscriptionMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'المستخدم غير مصرح له',
        code: 'UNAUTHORIZED'
      });
    }

    const subscriptionStatus = getUserSubscriptionStatus(userId);
    
    if (!subscriptionStatus.hasActiveSubscription) {
      return res.status(403).json({
        success: false,
        error: 'يتطلب اشتراك نشط للوصول لهذه الميزة',
        code: 'ACTIVE_SUBSCRIPTION_REQUIRED',
        subscriptionInfo: {
          hasActiveSubscription: false,
          canAnalyze: subscriptionStatus.canAnalyze
        }
      });
    }

    console.log(`✅ Active subscription verified for user ${userId}`);
    next();

  } catch (error) {
    console.error('❌ Active subscription middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من الاشتراك',
      code: 'SUBSCRIPTION_CHECK_ERROR'
    });
  }
};

// Middleware للتحقق من رصيد العملات (للمستخدمين المجانيين)
export const coinsBalanceMiddleware = (requiredCoins: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'المستخدم غير مصرح له',
          code: 'UNAUTHORIZED'
        });
      }

      const subscriptionStatus = getUserSubscriptionStatus(userId);
      
      // إذا كان لديه اشتراك نشط، لا نحتاج للتحقق من العملات
      if (subscriptionStatus.hasActiveSubscription) {
        console.log(`✅ User ${userId} has active subscription, skipping coins check`);
        next();
        return;
      }

      // التحقق من رصيد العملات للمستخدمين المجانيين
      const user = req.user;
      if (!user || user.coins < requiredCoins) {
        return res.status(403).json({
          success: false,
          error: `رصيد العملات غير كافٍ. مطلوب: ${requiredCoins}، المتوفر: ${user?.coins || 0}`,
          code: 'INSUFFICIENT_COINS',
          requiredCoins,
          availableCoins: user?.coins || 0
        });
      }

      console.log(`✅ Sufficient coins verified for user ${userId}: ${user.coins}/${requiredCoins}`);
      next();

    } catch (error) {
      console.error('❌ Coins balance middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من رصيد العملات',
        code: 'COINS_CHECK_ERROR'
      });
    }
  };
};

// Middleware للتحقق من نوع الاشتراك المطلوب
export const subscriptionTypeMiddleware = (requiredTypes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'المستخدم غير مصرح له',
          code: 'UNAUTHORIZED'
        });
      }

      const subscriptionStatus = getUserSubscriptionStatus(userId);
      
      if (!subscriptionStatus.hasActiveSubscription) {
        return res.status(403).json({
          success: false,
          error: 'يتطلب اشتراك نشط للوصول لهذه الميزة',
          code: 'SUBSCRIPTION_REQUIRED',
          requiredTypes
        });
      }

      const userSubscriptionType = subscriptionStatus.subscription?.plan_name || '';
      const hasRequiredType = requiredTypes.some(type => 
        userSubscriptionType.toLowerCase().includes(type.toLowerCase())
      );

      if (!hasRequiredType) {
        return res.status(403).json({
          success: false,
          error: `يتطلب نوع اشتراك محدد للوصول لهذه الميزة`,
          code: 'SUBSCRIPTION_TYPE_REQUIRED',
          requiredTypes,
          currentType: userSubscriptionType
        });
      }

      console.log(`✅ Subscription type verified for user ${userId}: ${userSubscriptionType}`);
      next();

    } catch (error) {
      console.error('❌ Subscription type middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من نوع الاشتراك',
        code: 'SUBSCRIPTION_TYPE_CHECK_ERROR'
      });
    }
  };
};

export default {
  analysisPermissionMiddleware,
  chatPermissionMiddleware,
  activeSubscriptionMiddleware,
  coinsBalanceMiddleware,
  subscriptionTypeMiddleware
};