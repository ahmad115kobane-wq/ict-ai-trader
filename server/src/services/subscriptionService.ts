// services/subscriptionService.ts
// خدمة إدارة الاشتراكات والباقات

import { v4 as uuidv4 } from 'uuid';
import {
  createVipPackage,
  getAllVipPackages,
  getVipPackageById,
  createUserSubscription,
  getUserActiveSubscription,
  getUserSubscriptionHistory,
  expireUserSubscription,
  getExpiredSubscriptions,
  canUserAnalyze,
  incrementAnalysisUsage,
  getUserById,
  addCoins
} from '../db/index';

// Types
interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription?: any;
  canAnalyze: boolean;
  analysisInfo: {
    canAnalyze: boolean;
    reason?: string;
    remainingAnalyses?: number;
  };
}

interface AnalysisPermissionResult {
  allowed: boolean;
  reason?: string;
  costDeducted?: number;
  remainingAnalyses?: number;
}

// ===================== VIP Package Management =====================

export interface VipPackage {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  durationType: 'weekly' | 'monthly' | 'yearly';
  durationDays: number;
  price: number;
  coinsIncluded: number;
  analysisLimit: number; // -1 = unlimited
  features: string[];
  isActive: boolean;
}

export interface SubscriptionPurchase {
  packageId: string;
  userId: string;
  paymentMethod?: string;
  autoRenew?: boolean;
}

// إنشاء الباقات الافتراضية
export const initializeDefaultPackages = async (): Promise<void> => {
  console.log('🎁 Initializing default VIP packages...');
  
  try {
    const existingPackages = await getAllVipPackages();
    if (existingPackages.length > 0) {
      console.log('✅ VIP packages already exist, skipping initialization');
      return;
    }

    // الباقة الأسبوعية
    createVipPackage(
      'weekly-basic',
      'Weekly Basic',
      'الباقة الأسبوعية الأساسية',
      'Basic weekly subscription with limited analyses',
      'باقة أسبوعية أساسية مع تحليلات محدودة',
      'weekly',
      7,
      9.99,
      200, // 200 عملة
      10,  // 10 تحليلات يومياً
      ['تحليل ICT متقدم', 'دعم فني أولوية', '10 تحليلات يومياً', 'إشعارات فورية']
    );

    // الباقة الشهرية
    createVipPackage(
      'monthly-premium',
      'Monthly Premium',
      'الباقة الشهرية المميزة',
      'Premium monthly subscription with more analyses',
      'باقة شهرية مميزة مع تحليلات أكثر',
      'monthly',
      30,
      29.99,
      1000, // 1000 عملة
      25,   // 25 تحليل يومياً
      ['تحليل ICT متقدم', 'دعم فني VIP', '25 تحليل يومياً', 'إشعارات فورية', 'تحليل متعدد الأزواج', 'تقارير أسبوعية']
    );

    // الباقة السنوية
    createVipPackage(
      'yearly-ultimate',
      'Yearly Ultimate',
      'الباقة السنوية المطلقة',
      'Ultimate yearly subscription with unlimited analyses',
      'باقة سنوية مطلقة مع تحليلات غير محدودة',
      'yearly',
      365,
      199.99,
      5000, // 5000 عملة
      -1,   // تحليلات غير محدودة
      ['تحليل ICT متقدم', 'دعم فني VIP', 'تحليلات غير محدودة', 'إشعارات فورية', 'تحليل متعدد الأزواج', 'تقارير أسبوعية', 'استشارات شخصية', 'وصول مبكر للميزات الجديدة']
    );

    // باقة العملات فقط
    createVipPackage(
      'coins-pack-500',
      'Coins Pack 500',
      'حزمة 500 عملة',
      '500 coins pack for pay-per-use',
      'حزمة 500 عملة للاستخدام حسب الحاجة',
      'monthly',
      30,
      4.99,
      500,  // 500 عملة
      0,    // بدون تحليلات مجانية
      ['500 عملة إضافية', 'صالحة لمدة شهر', 'استخدام حسب الحاجة']
    );

    console.log('✅ Default VIP packages created successfully');
  } catch (error) {
    console.error('❌ Failed to initialize default packages:', error);
  }
};

// الحصول على جميع الباقات المتاحة
export const getAvailablePackages = async (): Promise<VipPackage[]> => {
  const packages = await getAllVipPackages();
  return packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    nameAr: pkg.name_ar,
    description: pkg.description,
    descriptionAr: pkg.description_ar,
    durationType: pkg.duration_type as 'weekly' | 'monthly' | 'yearly',
    durationDays: pkg.duration_days,
    price: pkg.price,
    coinsIncluded: pkg.coins_included,
    analysisLimit: pkg.analysis_limit,
    features: pkg.features || [],
    isActive: pkg.is_active === true || pkg.is_active === 1
  }));
};

// الحصول على باقة محددة
export const getPackageDetails = async (packageId: string): Promise<VipPackage | null> => {
  const pkg = await getVipPackageById(packageId);
  if (!pkg) return null;
  
  return {
    id: pkg.id,
    name: pkg.name,
    nameAr: pkg.name_ar,
    description: pkg.description,
    descriptionAr: pkg.description_ar,
    durationType: pkg.duration_type as 'weekly' | 'monthly' | 'yearly',
    durationDays: pkg.duration_days,
    price: pkg.price,
    coinsIncluded: pkg.coins_included,
    analysisLimit: pkg.analysis_limit,
    features: pkg.features || [],
    isActive: pkg.is_active === true || pkg.is_active === 1
  };
};

// ===================== Subscription Management =====================

// شراء اشتراك جديد
export const purchaseSubscription = async (purchase: SubscriptionPurchase): Promise<{
  success: boolean;
  subscriptionId?: string;
  message: string;
  expiresAt?: string;
}> => {
  try {
    const { packageId, userId, autoRenew = false } = purchase;

    console.log(`🛒 Purchasing subscription: packageId=${packageId}, userId=${userId}`);

    // التحقق من وجود الباقة
    const vipPackage = await getVipPackageById(packageId);
    console.log(`📦 VIP Package found:`, vipPackage ? 'Yes' : 'No');
    
    if (!vipPackage) {
      return {
        success: false,
        message: 'الباقة المطلوبة غير موجودة'
      };
    }

    // التحقق من وجود المستخدم
    const user = await getUserById(userId);
    console.log(`👤 User found:`, user ? 'Yes' : 'No');
    
    if (!user) {
      return {
        success: false,
        message: 'المستخدم غير موجود'
      };
    }

    // حساب تاريخ انتهاء الاشتراك
    const now = new Date();
    const durationDays = vipPackage.durationDays || 30; // fallback to 30 days
    console.log(`📅 Duration days: ${durationDays}`);
    
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const expiresAtString = expiresAt.toISOString();
    
    console.log(`⏰ Expires at: ${expiresAtString}`);

    // إنشاء الاشتراك
    const subscriptionId = uuidv4();
    createUserSubscription(
      subscriptionId,
      userId,
      packageId,
      vipPackage.nameAr || vipPackage.name,
      vipPackage.coinsIncluded || 0,
      vipPackage.price || 0,
      vipPackage.analysisLimit || -1,
      expiresAtString,
      autoRenew
    );

    console.log(`✅ Subscription created: ${vipPackage.nameAr} for user ${userId}`);

    return {
      success: true,
      subscriptionId,
      message: `تم تفعيل اشتراك ${vipPackage.nameAr || vipPackage.name} بنجاح`,
      expiresAt: expiresAtString
    };

  } catch (error) {
    console.error('❌ Purchase subscription error:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تفعيل الاشتراك'
    };
  }
};

// الحصول على حالة اشتراك المستخدم
export const getUserSubscriptionStatus = async (userId: string): Promise<SubscriptionStatus> => {
  const activeSubscription = await getUserActiveSubscription(userId);
  const analysisInfo = await canUserAnalyze(userId);

  return {
    hasActiveSubscription: !!activeSubscription,
    subscription: activeSubscription,
    canAnalyze: analysisInfo.canAnalyze,
    analysisInfo
  };
};

// الحصول على سجل اشتراكات المستخدم
export const getUserSubscriptions = (userId: string, limit: number = 10) => {
  return getUserSubscriptionHistory(userId, limit);
};

// ===================== Analysis Permission & Usage =====================

// التحقق من إمكانية التحليل وخصم التكلفة
export const processAnalysisRequest = async (userId: string): Promise<AnalysisPermissionResult> => {
  const analysisCheck = await canUserAnalyze(userId);
  
  if (!analysisCheck.canAnalyze) {
    return {
      allowed: false,
      reason: analysisCheck.reason
    };
  }

  // تسجيل استخدام التحليل
  const usageRecorded = await incrementAnalysisUsage(userId);
  if (!usageRecorded) {
    console.error('Failed to record analysis usage for user:', userId);
  }

  const activeSubscription = await getUserActiveSubscription(userId);
  
  if (!activeSubscription) {
    // مستخدم مجاني - خصم العملات
    const user = await getUserById(userId);
    const costDeducted = 50;
    
    return {
      allowed: true,
      costDeducted,
      reason: `تم خصم ${costDeducted} عملة من رصيدك`
    };
  } else {
    // مستخدم مشترك
    if (activeSubscription.analysis_limit === -1) {
      return {
        allowed: true,
        reason: 'تحليل مجاني ضمن الاشتراك (غير محدود)'
      };
    } else {
      const remaining = analysisCheck.remainingAnalyses! - 1;
      return {
        allowed: true,
        remainingAnalyses: remaining,
        reason: `تحليل مجاني ضمن الاشتراك (متبقي: ${remaining})`
      };
    }
  }
};

// ===================== Subscription Expiry Management =====================

// فحص وإنهاء الاشتراكات المنتهية الصلاحية
export const checkAndExpireSubscriptions = async (): Promise<{
  expiredCount: number;
  expiredUsers: string[];
}> => {
  console.log('🕐 Checking for expired subscriptions...');
  
  try {
    const expiredSubscriptions = await getExpiredSubscriptions();
    
    if (expiredSubscriptions.length === 0) {
      console.log('✅ No expired subscriptions found');
      return { expiredCount: 0, expiredUsers: [] };
    }

    const expiredUsers: string[] = [];
    
    expiredSubscriptions.forEach(subscription => {
      try {
        expireUserSubscription(subscription.user_id);
        expiredUsers.push(subscription.user_id);
        console.log(`⏰ Expired subscription: ${subscription.plan_name} for user ${subscription.user_id}`);
      } catch (error) {
        console.error(`❌ Failed to expire subscription for user ${subscription.user_id}:`, error);
      }
    });

    console.log(`✅ Processed ${expiredUsers.length} expired subscriptions`);
    
    return {
      expiredCount: expiredUsers.length,
      expiredUsers
    };

  } catch (error) {
    console.error('❌ Error checking expired subscriptions:', error);
    return { expiredCount: 0, expiredUsers: [] };
  }
};

// ===================== Coins Management =====================

// إضافة عملات للمستخدم
export const addCoinsToUser = async (userId: string, amount: number, reason: string = 'إضافة عملات'): Promise<boolean> => {
  try {
    const success = await addCoins(userId, amount);
    if (success) {
      console.log(`💰 Added ${amount} coins to user ${userId}: ${reason}`);
    }
    return success;
  } catch (error) {
    console.error('❌ Failed to add coins:', error);
    return false;
  }
};

// ===================== Statistics & Analytics =====================

// إحصائيات الاشتراكات
export const getSubscriptionStats = async (): Promise<{
  totalActiveSubscriptions: number;
  packageBreakdown: { [key: string]: number };
  totalRevenue: number;
}> => {
  // هذه دالة مبسطة - يمكن توسيعها لاحقاً
  const packages = await getAllVipPackages();
  
  return {
    totalActiveSubscriptions: 0, // يحتاج استعلام قاعدة بيانات
    packageBreakdown: {},
    totalRevenue: 0
  };
};

export default {
  initializeDefaultPackages,
  getAvailablePackages,
  getPackageDetails,
  purchaseSubscription,
  getUserSubscriptionStatus,
  getUserSubscriptions,
  processAnalysisRequest,
  checkAndExpireSubscriptions,
  addCoinsToUser,
  getSubscriptionStats
};