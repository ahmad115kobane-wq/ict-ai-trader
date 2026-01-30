// routes/manualTrade.ts - Manual Trade Entry
import express, { Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ===================== Manual Trade Entry =====================
// إدخال صفقة يدوياً وإرسالها كأنها من AI
router.post('/manual-trade', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      type,        // "BUY_LIMIT" | "SELL_LIMIT"
      entry,       // سعر الدخول
      sl,          // وقف الخسارة
      tp1,         // الهدف الأول
      tp2,         // الهدف الثاني
      tp3,         // الهدف الثالث
      reasoning,   // سبب الصفقة (اختياري)
      score,       // التقييم (اختياري، افتراضي 8)
      confidence   // الثقة (اختياري، افتراضي 80)
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!type || !entry || !sl || !tp1 || !tp2 || !tp3) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, entry, sl, tp1, tp2, tp3'
      });
    }

    // التحقق من نوع الصفقة
    if (type !== 'BUY_LIMIT' && type !== 'SELL_LIMIT') {
      return res.status(400).json({
        success: false,
        error: 'Invalid trade type. Must be BUY_LIMIT or SELL_LIMIT'
      });
    }

    const { getCurrentPrice } = await import('../services/oandaService');
    const currentPrice = await getCurrentPrice('XAUUSD');

    // إنشاء كائن التحليل كأنه من AI
    const analysis = {
      decision: 'PLACE_PENDING',
      score: score || 8,
      confidence: confidence || 80,
      sentiment: type.includes('BUY') ? 'BULLISH' : 'BEARISH',
      bias: reasoning || 'صفقة يدوية',
      reasoning: reasoning || 'تم إدخال الصفقة يدوياً',
      confluences: ['إدخال يدوي'],
      reasons: ['صفقة يدوية من المستخدم'],
      suggestedTrade: {
        type,
        entry: Number(entry),
        sl: Number(sl),
        tp1: Number(tp1),
        tp2: Number(tp2),
        tp3: Number(tp3),
        rrRatio: calculateRR(Number(entry), Number(sl), Number(tp1), Number(tp2), Number(tp3)),
        expiryMinutes: 60
      }
    };

    // حفظ في قاعدة البيانات
    const { saveEnhancedAnalysis } = await import('../db/index');
    const analysisId = uuidv4();
    
    await saveEnhancedAnalysis(
      analysisId,
      req.user!.id,
      'XAUUSD',
      currentPrice,
      analysis,
      'manual'
    );

    console.log(`✅ Manual trade saved for user: ${req.user!.email}`);

    // إرسال إشعارات Telegram
    try {
      const { notifyTradeOpportunity } = await import('../services/notificationService');
      await notifyTradeOpportunity(analysis, currentPrice);
      console.log('📱 Telegram notification sent');
    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error);
    }

    // إرسال Push Notifications
    try {
      const { getUsersWithPushTokens } = await import('../db/index');
      const { sendTradeNotification } = await import('../services/expoPushService');

      const usersWithTokens = await getUsersWithPushTokens();
      const pushTokens = usersWithTokens.map((u: any) => u.push_token).filter(Boolean);

      if (pushTokens.length > 0) {
        await sendTradeNotification(
          pushTokens,
          analysis.suggestedTrade,
          analysis.score,
          currentPrice
        );
        console.log(`📱 Push notifications sent to ${pushTokens.length} devices`);
      }
    } catch (error) {
      console.error('❌ Failed to send push notifications:', error);
    }

    res.json({
      success: true,
      message: 'Manual trade sent successfully',
      analysis,
      currentPrice
    });

  } catch (error) {
    console.error('❌ Manual trade error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send manual trade'
    });
  }
});

// ===================== Helper Function =====================
function calculateRR(entry: number, sl: number, tp1: number, tp2: number, tp3: number): string {
  const risk = Math.abs(entry - sl);
  const rr1 = Math.abs(tp1 - entry) / risk;
  const rr2 = Math.abs(tp2 - entry) / risk;
  const rr3 = Math.abs(tp3 - entry) / risk;
  return `TP1: 1:${rr1.toFixed(1)} | TP2: 1:${rr2.toFixed(1)} | TP3: 1:${rr3.toFixed(1)}`;
}

export default router;
