// routes/auth.ts
// مسارات المصادقة مع نظام الجلسات

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createUser, getUserByEmail, getUserById, createSession, terminateAllUserSessions, getUserActiveSessions } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getUserSubscriptionStatus, purchaseSubscription } from '../services/subscriptionService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// دالة مساعدة للحصول على معلومات الجهاز
const getDeviceInfo = (req: Request): string => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  // استخراج معلومات بسيطة عن الجهاز
  if (userAgent.includes('Mobile')) return 'Mobile Device';
  if (userAgent.includes('Tablet')) return 'Tablet';
  return 'Desktop/Web';
};

// دالة مساعدة للحصول على IP
const getClientIP = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.socket.remoteAddress || 
         'Unknown';
};

// تسجيل مستخدم جديد
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبة' });
    }

    // التحقق من عدم وجود المستخدم
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // إنشاء المستخدم
    createUser(userId, email, hashedPassword);

    // إنشاء التوكن
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
    
    // إنشاء جلسة
    const deviceInfo = getDeviceInfo(req);
    const ipAddress = getClientIP(req);
    createSession(userId, token, deviceInfo, ipAddress);

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: {
        id: userId,
        email,
        coins: 100,
        subscription: 'free'
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// تسجيل الدخول
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبة' });
    }

    // البحث عن المستخدم
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    // التحقق من كلمة المرور
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    // إنشاء التوكن
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    
    // إنشاء جلسة جديدة (سيتم إنهاء الجلسات القديمة تلقائياً)
    const deviceInfo = getDeviceInfo(req);
    const ipAddress = getClientIP(req);
    createSession(user.id, token, deviceInfo, ipAddress);

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        email: user.email,
        coins: user.coins,
        subscription: user.subscription,
        subscriptionExpiry: user.subscription_expiry
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// تجديد التوكن
router.post('/refresh-token', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    // إنشاء توكن جديد
    const newToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'تم تجديد التوكن بنجاح',
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'خطأ في تجديد التوكن' });
  }
});

// التحقق من صحة التوكن
router.get('/verify-token', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      coins: req.user.coins
    }
  });
});

// الحصول على بيانات المستخدم الحالي مع معلومات الاشتراك
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  // جلب بيانات المستخدم المحدثة من قاعدة البيانات
  const { getUserById } = require('../db/database');
  const freshUser = getUserById(req.user.id);
  
  if (!freshUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const subscriptionStatus = getUserSubscriptionStatus(freshUser.id);
  
  res.json({
    id: freshUser.id,
    email: freshUser.email,
    coins: freshUser.coins || 0,
    subscription: freshUser.subscription,
    subscriptionExpiry: freshUser.subscription_expiry,
    createdAt: freshUser.created_at,
    autoAnalysisEnabled: freshUser.auto_analysis_enabled === 1,
    subscriptionStatus: {
      hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
      canAnalyze: subscriptionStatus.canAnalyze,
      subscription: subscriptionStatus.subscription,
      analysisInfo: subscriptionStatus.analysisInfo
    }
  });
});

// التحقق من حالة الاشتراك - محدث مع النظام الجديد
router.get('/subscription-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const subscriptionStatus = getUserSubscriptionStatus(userId);
    
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        coins: req.user.coins,
        subscription: req.user.subscription,
        subscriptionExpiry: req.user.subscription_expiry
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
    console.error('Subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب حالة الاشتراك'
    });
  }
});

// تسجيل دخول سريع للاختبار (بدون كلمة مرور)
router.post('/quick-login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    }

    // البحث عن المستخدم أو إنشاؤه
    let user = getUserByEmail(email);
    
    if (!user) {
      // إنشاء مستخدم جديد
      const userId = uuidv4();
      const defaultPassword = await bcrypt.hash('123456', 10);
      createUser(userId, email, defaultPassword);
      user = getUserByEmail(email);
    }

    if (!user) {
      return res.status(500).json({ error: 'فشل في إنشاء المستخدم' });
    }

    // إنشاء التوكن
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    console.log('🚀 Quick login successful for:', email);

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        email: user.email,
        coins: user.coins,
        subscription: user.subscription,
        subscriptionExpiry: user.subscription_expiry
      }
    });
  } catch (error) {
    console.error('Quick login error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// إنشاء اشتراك تجريبي للاختبار
router.post('/create-test-subscription', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // إنشاء اشتراك تجريبي لمدة 30 يوم
    const result = await purchaseSubscription({
      packageId: 'monthly-premium',
      userId: userId,
      paymentMethod: 'test',
      autoRenew: false
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'تم إنشاء اشتراك تجريبي بنجاح',
        subscription: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }

  } catch (error) {
    console.error('Create test subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إنشاء الاشتراك التجريبي'
    });
  }
});

// تسجيل الخروج (إنهاء الجلسة الحالية)
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { terminateSession } = require('../db/database');
    
    if (req.sessionId) {
      terminateSession(req.sessionId);
    }
    
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'خطأ في تسجيل الخروج' });
  }
});

// الحصول على الجلسات النشطة
router.get('/sessions', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    
    const sessions = getUserActiveSessions(userId);
    
    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        deviceInfo: s.device_info,
        ipAddress: s.ip_address,
        createdAt: s.created_at,
        lastActivity: s.last_activity,
        isCurrent: s.id === req.sessionId
      }))
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'خطأ في جلب الجلسات' });
  }
});

// إنهاء جميع الجلسات الأخرى
router.post('/terminate-other-sessions', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const currentSessionId = req.sessionId;
    
    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    
    // الحصول على جميع الجلسات
    const sessions = getUserActiveSessions(userId);
    
    // إنهاء جميع الجلسات ماعدا الحالية
    const { terminateSession } = require('../db/database');
    let terminatedCount = 0;
    
    sessions.forEach(session => {
      if (session.id !== currentSessionId) {
        terminateSession(session.id);
        terminatedCount++;
      }
    });
    
    res.json({
      success: true,
      message: `تم إنهاء ${terminatedCount} جلسة أخرى`,
      terminatedCount
    });
  } catch (error) {
    console.error('Terminate sessions error:', error);
    res.status(500).json({ error: 'خطأ في إنهاء الجلسات' });
  }
});

export default router;