// routes/mt5.ts
// API routes لإدارة حسابات MT5

import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { mt5Manager, encryptPassword, decryptPassword } from '../services/mt5Manager';
import type { MT5AccountConfig } from '../services/mt5Manager';

const router = express.Router();

// جميع المسارات تتطلب مصادقة
router.use(authMiddleware);

// ===================== اتصال بحساب MT5 =====================
router.post('/connect', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { brokerServer, accountLogin, accountPassword } = req.body;

    if (!brokerServer || !accountLogin || !accountPassword) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال جميع البيانات: سيرفر الوسيط، رقم الحساب، كلمة المرور',
      });
    }

    // تنظيف المدخلات
    const config: MT5AccountConfig = {
      brokerServer: brokerServer.trim(),
      accountLogin: String(accountLogin).trim(),
      accountPassword: accountPassword,
    };

    console.log(`🔌 MT5 connect request: user=${userId}, server=${config.brokerServer}, login=${config.accountLogin}`);

    // الاتصال عبر MT5 Manager
    const status = await mt5Manager.connect(userId, config.accountLogin, config);

    // حفظ بيانات الحساب (كلمة المرور مشفرة)
    // يمكن حفظها في قاعدة البيانات لاحقاً
    const accountData = {
      userId,
      brokerServer: config.brokerServer,
      accountLogin: config.accountLogin,
      encryptedPassword: encryptPassword(config.accountPassword),
      status: status.status,
      connectedAt: status.status === 'connected' ? new Date().toISOString() : null,
    };

    console.log(`📊 MT5 connect result: ${status.status}${status.errorMessage ? ' - ' + status.errorMessage : ''}`);

    res.json({
      success: status.status === 'connected',
      data: {
        status: status.status,
        errorMessage: status.errorMessage,
        accountLogin: status.accountLogin,
        brokerServer: status.brokerServer,
        uptime: status.uptime,
      },
      message: status.status === 'connected'
        ? `✅ تم الاتصال بنجاح بحساب ${config.accountLogin}`
        : status.errorMessage || 'فشل الاتصال',
    });
  } catch (error: any) {
    console.error('MT5 connect error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الاتصال بـ MT5',
    });
  }
});

// ===================== قطع الاتصال =====================
router.post('/disconnect', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { accountLogin } = req.body;

    if (!accountLogin) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد رقم الحساب' });
    }

    await mt5Manager.disconnect(userId, String(accountLogin).trim());

    res.json({
      success: true,
      message: 'تم قطع الاتصال بنجاح',
      data: { status: 'disconnected' },
    });
  } catch (error: any) {
    console.error('MT5 disconnect error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== حالة الاتصال =====================
router.get('/status/:accountLogin', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { accountLogin } = req.params;

    const status = mt5Manager.getStatus(userId, accountLogin);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('MT5 status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== جميع حسابات المستخدم =====================
router.get('/accounts', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const instances = mt5Manager.getUserInstances(userId);

    res.json({
      success: true,
      data: instances,
      count: instances.length,
    });
  } catch (error: any) {
    console.error('MT5 accounts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== إحصائيات النظام (admin) =====================
router.get('/system-stats', async (req, res) => {
  try {
    const stats = mt5Manager.getSystemStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
