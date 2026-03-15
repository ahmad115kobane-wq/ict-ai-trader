// routes/profile.ts
// ═══════════════════════════════════════════════════════════════════════════════
// الملف الشخصي للمستخدم - User Profile
// ═══════════════════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getUserById, updateUserProfile, updateUserPassword, getUserClosedPositions } from '../db/index';
import bcrypt from 'bcryptjs';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// GET / - الحصول على الملف الشخصي الكامل
// ═══════════════════════════════════════════════════════════════════
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    res.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        fullName: user.full_name || '',
        phone: user.phone || '',
        country: user.country || '',
        avatarUrl: user.avatar_url || '',
        bio: user.bio || '',
        dateOfBirth: user.date_of_birth || '',
        preferredLanguage: user.preferred_language || 'ar',
        tradingExperience: user.trading_experience || 'beginner',
        isVerified: user.is_verified === 1 || user.is_verified === true,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        // معلومات الحساب
        coins: user.coins || 0,
        subscription: user.subscription || 'free',
        subscriptionExpiry: user.subscription_expiry,
        // إحصائيات التداول
        tradingStats: {
          balance: user.balance ?? 10000,
          initialBalance: user.initial_balance ?? 10000,
          leverage: user.leverage || 500,
          currency: user.account_currency || 'USD',
          totalProfit: user.total_profit || 0,
          totalLoss: user.total_loss || 0,
          totalTrades: user.total_trades || 0,
          winningTrades: user.winning_trades || 0,
          losingTrades: user.losing_trades || 0,
          winRate: user.total_trades > 0
            ? Number(((user.winning_trades / user.total_trades) * 100).toFixed(1))
            : 0,
          netPnl: Number(((user.total_profit || 0) - (user.total_loss || 0)).toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب الملف الشخصي' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUT /update - تحديث الملف الشخصي
// ═══════════════════════════════════════════════════════════════════
router.put('/update', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const { fullName, phone, country, bio, dateOfBirth, preferredLanguage, tradingExperience } = req.body;

    // التحقق من المدخلات
    if (fullName !== undefined && typeof fullName !== 'string') {
      return res.status(400).json({ success: false, error: 'الاسم يجب أن يكون نص' });
    }
    if (fullName && fullName.length > 100) {
      return res.status(400).json({ success: false, error: 'الاسم طويل جداً (الحد الأقصى 100 حرف)' });
    }
    if (phone !== undefined && typeof phone !== 'string') {
      return res.status(400).json({ success: false, error: 'رقم الهاتف يجب أن يكون نص' });
    }
    if (phone && phone.length > 20) {
      return res.status(400).json({ success: false, error: 'رقم الهاتف طويل جداً' });
    }
    if (bio && bio.length > 500) {
      return res.status(400).json({ success: false, error: 'النبذة طويلة جداً (الحد الأقصى 500 حرف)' });
    }

    const validExperiences = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (tradingExperience && !validExperiences.includes(tradingExperience)) {
      return res.status(400).json({ success: false, error: 'مستوى الخبرة غير صحيح' });
    }

    const validLanguages = ['ar', 'en'];
    if (preferredLanguage && !validLanguages.includes(preferredLanguage)) {
      return res.status(400).json({ success: false, error: 'اللغة غير مدعومة' });
    }

    // تحديث الملف الشخصي عبر الدالة الموحدة
    const profileData: Record<string, any> = {};
    if (fullName !== undefined) profileData.fullName = fullName;
    if (phone !== undefined) profileData.phone = phone;
    if (country !== undefined) profileData.country = country;
    if (bio !== undefined) profileData.bio = bio;
    if (dateOfBirth !== undefined) profileData.dateOfBirth = dateOfBirth;
    if (preferredLanguage !== undefined) profileData.preferredLanguage = preferredLanguage;
    if (tradingExperience !== undefined) profileData.tradingExperience = tradingExperience;

    if (Object.keys(profileData).length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد بيانات لتحديثها' });
    }

    const success = await updateUserProfile(userId, profileData);
    if (!success) {
      return res.status(500).json({ success: false, error: 'فشل في تحديث الملف الشخصي' });
    }

    console.log(`👤 Profile updated for user ${userId}`);

    // إرجاع البيانات المحدثة
    const updatedUser = await getUserById(userId);
    
    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      profile: {
        fullName: updatedUser.full_name || '',
        phone: updatedUser.phone || '',
        country: updatedUser.country || '',
        bio: updatedUser.bio || '',
        dateOfBirth: updatedUser.date_of_birth || '',
        preferredLanguage: updatedUser.preferred_language || 'ar',
        tradingExperience: updatedUser.trading_experience || 'beginner',
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'خطأ في تحديث الملف الشخصي' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUT /change-password - تغيير كلمة المرور
// ═══════════════════════════════════════════════════════════════════
router.put('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الحالية والجديدة مطلوبة' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    // التحقق من كلمة المرور الحالية
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' });
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const success = await updateUserPassword(userId, hashedPassword);

    if (!success) {
      return res.status(500).json({ success: false, error: 'فشل في تغيير كلمة المرور' });
    }

    console.log(`🔒 Password changed for user ${userId}`);

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'خطأ في تغيير كلمة المرور' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /trading-stats - إحصائيات التداول المفصلة
// ═══════════════════════════════════════════════════════════════════
router.get('/trading-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    const closedPositions = await getUserClosedPositions(userId, 200);

    // حساب إحصائيات مفصلة
    let bestTrade = 0;
    let worstTrade = 0;
    let totalPips = 0;
    let avgHoldTime = 0;
    let totalHoldTime = 0;

    for (const p of closedPositions) {
      const pnl = p.realized_pnl || 0;
      if (pnl > bestTrade) bestTrade = pnl;
      if (pnl < worstTrade) worstTrade = pnl;

      // حساب النقاط
      if (p.entry_price && p.close_price) {
        const pips = Math.abs(p.close_price - p.entry_price) * (pnl >= 0 ? 1 : -1);
        totalPips += pips;
      }

      // حساب وقت الاحتفاظ
      if (p.opened_at && p.closed_at) {
        const openTime = new Date(p.opened_at).getTime();
        const closeTime = new Date(p.closed_at).getTime();
        if (!isNaN(openTime) && !isNaN(closeTime)) {
          totalHoldTime += closeTime - openTime;
        }
      }
    }

    if (closedPositions.length > 0) {
      avgHoldTime = totalHoldTime / closedPositions.length;
    }

    res.json({
      success: true,
      stats: {
        balance: user.balance ?? 10000,
        initialBalance: user.initial_balance ?? 10000,
        totalProfit: user.total_profit || 0,
        totalLoss: user.total_loss || 0,
        netPnl: Number(((user.total_profit || 0) - (user.total_loss || 0)).toFixed(2)),
        totalTrades: user.total_trades || 0,
        winningTrades: user.winning_trades || 0,
        losingTrades: user.losing_trades || 0,
        winRate: user.total_trades > 0
          ? Number(((user.winning_trades / user.total_trades) * 100).toFixed(1))
          : 0,
        bestTrade: Number(bestTrade.toFixed(2)),
        worstTrade: Number(worstTrade.toFixed(2)),
        avgHoldTimeMinutes: Math.round(avgHoldTime / (1000 * 60)),
        profitFactor: (user.total_loss || 0) > 0
          ? Number(((user.total_profit || 0) / (user.total_loss || 1)).toFixed(2))
          : 0,
      },
    });
  } catch (error) {
    console.error('Get trading stats error:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب الإحصائيات' });
  }
});

export default router;
