// services/referralService.ts
// خدمة نظام الإحالة والدعوات

import { v4 as uuidv4 } from 'uuid';
import {
  getUserById,
  setUserReferralCode,
  getUserReferralCode,
  getUserByReferralCode,
  createReferralUsage,
  addReferralReward,
  getUserReferralStats,
  hasUsedReferralForPackage,
  getUserReferralHistory,
  validateReferralCode,
  getVipPackageById,
} from '../db/index';

// ثوابت النظام
const DISCOUNT_PERCENT = 15; // نسبة الخصم 15%
const REWARD_AMOUNT = 5;     // مكافأة صاحب الكود 5 عملات (دولار)

/**
 * توليد كود دعوة فريد (6 أحرف وأرقام)
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون حروف متشابهة
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ICT-${code}`;
}

/**
 * الحصول على أو إنشاء كود دعوة للمستخدم
 */
export async function getOrCreateReferralCode(userId: string): Promise<string | null> {
  try {
    // التحقق من وجود كود مسبق
    let code = await getUserReferralCode(userId);
    if (code) return code;

    // إنشاء كود جديد (محاولة عدة مرات لتجنب التكرار)
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateReferralCode();
      const existing = await getUserByReferralCode(code);
      if (!existing) {
        const success = await setUserReferralCode(userId, code);
        if (success) {
          console.log(`🎫 Referral code created for user ${userId}: ${code}`);
          return code;
        }
      }
    }

    console.error('❌ Failed to generate unique referral code after 5 attempts');
    return null;
  } catch (error) {
    console.error('❌ Error in getOrCreateReferralCode:', error);
    return null;
  }
}

/**
 * التحقق من كود الدعوة وحساب الخصم
 */
export async function validateAndCalculateDiscount(
  referralCode: string,
  userId: string,
  packageId: string
): Promise<{
  valid: boolean;
  message: string;
  discountPercent?: number;
  discountAmount?: number;
  finalPrice?: number;
  originalPrice?: number;
  referrerId?: string;
  referrerEmail?: string;
}> {
  try {
    // التحقق من صلاحية الكود
    const validation = await validateReferralCode(referralCode, userId);
    if (!validation.valid) {
      return { valid: false, message: validation.message };
    }

    // التحقق من الباقة
    const pkg = await getVipPackageById(packageId);
    if (!pkg) {
      return { valid: false, message: 'الباقة غير موجودة' };
    }

    // التحقق من عدم استخدام كود سابقاً لنفس الباقة
    const alreadyUsed = await hasUsedReferralForPackage(userId, packageId);
    if (alreadyUsed) {
      return { valid: false, message: 'لقد استخدمت كود دعوة مسبقاً لهذه الباقة' };
    }

    const originalPrice = pkg.price;
    const discountAmount = Math.round(originalPrice * DISCOUNT_PERCENT / 100);
    const finalPrice = originalPrice - discountAmount;

    return {
      valid: true,
      message: `خصم ${DISCOUNT_PERCENT}% (${discountAmount} عملة) على باقة ${pkg.name_ar}`,
      discountPercent: DISCOUNT_PERCENT,
      discountAmount,
      finalPrice,
      originalPrice,
      referrerId: validation.referrer.id,
      referrerEmail: validation.referrer.email,
    };
  } catch (error) {
    console.error('❌ Error validating referral discount:', error);
    return { valid: false, message: 'خطأ في التحقق من كود الدعوة' };
  }
}

/**
 * معالجة الإحالة عند الشراء (خصم + مكافأة + إشعارات)
 */
export async function processReferralOnPurchase(
  referralCode: string,
  referrerId: string,
  referredId: string,
  packageId: string,
  packageName: string,
  originalPrice: number,
  discountAmount: number,
  finalPrice: number
): Promise<boolean> {
  try {
    const usageId = uuidv4();

    // 1. تسجيل استخدام كود الدعوة
    await createReferralUsage(
      usageId,
      referralCode,
      referrerId,
      referredId,
      packageId,
      packageName,
      originalPrice,
      DISCOUNT_PERCENT,
      discountAmount,
      finalPrice,
      REWARD_AMOUNT
    );

    // 2. إضافة المكافأة لصاحب الكود (5 عملات)
    await addReferralReward(referrerId, REWARD_AMOUNT);

    // 3. إرسال إشعارات
    try {
      const { sendSystemNotification } = await import('./systemNotificationService');

      // إشعار لصاحب كود الدعوة
      await sendSystemNotification(referrerId, {
        type: 'system_update',
        title: '🎁 مكافأة إحالة!',
        message: `تم استخدام كود الدعوة الخاص بك وحصلت على ${REWARD_AMOUNT} عملات كمكافأة! شكراً لمشاركتك.`,
        priority: 'high',
        data: {
          action: 'referral_reward',
          rewardAmount: REWARD_AMOUNT,
          referralCode,
        }
      });

      // إشعار للمستخدم الذي استخدم الكود
      await sendSystemNotification(referredId, {
        type: 'system_update',
        title: '🎉 تم تطبيق كود الخصم!',
        message: `حصلت على خصم ${DISCOUNT_PERCENT}% (${discountAmount} عملة) على باقة ${packageName} باستخدام كود الدعوة.`,
        priority: 'normal',
        data: {
          action: 'referral_discount',
          discountPercent: DISCOUNT_PERCENT,
          discountAmount,
        }
      });
    } catch (notifError) {
      console.error('Failed to send referral notifications:', notifError);
    }

    console.log(`✅ Referral processed: code=${referralCode}, discount=${discountAmount}, reward=${REWARD_AMOUNT}`);
    return true;
  } catch (error) {
    console.error('❌ Error processing referral:', error);
    return false;
  }
}

/**
 * الحصول على إحصائيات الإحالة الكاملة للمستخدم
 */
export async function getReferralDashboard(userId: string) {
  try {
    const code = await getOrCreateReferralCode(userId);
    const stats = await getUserReferralStats(userId);
    const history = await getUserReferralHistory(userId, 20);

    return {
      referralCode: code,
      discountPercent: DISCOUNT_PERCENT,
      rewardAmount: REWARD_AMOUNT,
      stats: {
        totalReferrals: stats?.totalReferrals || 0,
        totalEarnings: stats?.totalEarnings || 0,
        currentBalance: stats?.referralBalance || 0,
      },
      history: history.map(h => ({
        id: h.id,
        referredEmail: h.referred_email ? maskEmail(h.referred_email) : 'مستخدم',
        packageName: h.package_name,
        discountAmount: h.discount_amount,
        rewardAmount: h.reward_amount,
        createdAt: h.created_at,
      })),
    };
  } catch (error) {
    console.error('❌ Error getting referral dashboard:', error);
    return null;
  }
}

/**
 * إخفاء البريد الإلكتروني جزئياً للخصوصية
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'مستخدم';
  const [name, domain] = email.split('@');
  if (name.length <= 3) return `${name[0]}***@${domain}`;
  return `${name.substring(0, 3)}***@${domain}`;
}

export default {
  getOrCreateReferralCode,
  validateAndCalculateDiscount,
  processReferralOnPurchase,
  getReferralDashboard,
  DISCOUNT_PERCENT,
  REWARD_AMOUNT,
};
