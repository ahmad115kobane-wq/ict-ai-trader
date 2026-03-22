// routes/analysis.ts
// مسارات التحليل

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { analysisPermissionMiddleware, chatPermissionMiddleware, AnalysisRequest } from '../middleware/subscriptionAuth';
import { analyzeMultiTimeframe, chatWithAI, followUpTrade } from '../services/aiService';
import { getCandles, getCurrentPrice } from '../services/oandaService';
import { renderDualCharts } from '../services/chartService';
import { saveAnalysis, getAnalysisHistory, saveEnhancedAnalysis, getEnhancedAnalysisHistory, getTradeHistory, getNoTradeAnalysis } from '../db/index';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// مجلد حفظ صور التحليل
const ANALYSIS_IMAGES_DIR = path.join(__dirname, '../../analysis-images');
if (!fs.existsSync(ANALYSIS_IMAGES_DIR)) {
  fs.mkdirSync(ANALYSIS_IMAGES_DIR, { recursive: true });
}

// دالة حفظ صور التحليل
function saveAnalysisImages(h1Image: string, m5Image: string, analysisId: string): { h1Path: string; m5Path: string } {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const h1FileName = `${analysisId}_H1_${timestamp}.png`;
    const m5FileName = `${analysisId}_M5_${timestamp}.png`;
    
    const h1Path = path.join(ANALYSIS_IMAGES_DIR, h1FileName);
    const m5Path = path.join(ANALYSIS_IMAGES_DIR, m5FileName);
    
    // تحويل base64 إلى buffer وحفظ
    const h1Buffer = Buffer.from(h1Image.replace('data:image/png;base64,', ''), 'base64');
    const m5Buffer = Buffer.from(m5Image.replace('data:image/png;base64,', ''), 'base64');
    
    fs.writeFileSync(h1Path, h1Buffer);
    fs.writeFileSync(m5Path, m5Buffer);
    
    console.log(`💾 Analysis images saved: ${h1FileName}, ${m5FileName}`);
    
    return { 
      h1Path: h1FileName, 
      m5Path: m5FileName 
    };
  } catch (error) {
    console.error('❌ Failed to save analysis images:', error);
    return { h1Path: '', m5Path: '' };
  }
}

// تحليل تجريبي عام (للاختبار فقط - بدون حفظ أو خصم)
router.post('/analyze-demo', async (req: any, res: Response) => {
  try {
    const { symbol = 'XAUUSD' } = req.body;

    console.log(`🧪 Demo analysis for ${symbol} (no authentication required)...`);

    // 1. جلب بيانات الشموع من OANDA
    const [h1Candles, m5Candles, currentPrice] = await Promise.all([
      getCandles(symbol, '1h', 200),
      getCandles(symbol, '5m', 250),
      getCurrentPrice(symbol)
    ]);

    if (!h1Candles.length || !m5Candles.length || !currentPrice) {
      return res.status(500).json({ error: 'فشل في جلب البيانات من OANDA' });
    }

    console.log(`📈 Demo data fetched: ${h1Candles.length} H1, ${m5Candles.length} M5, Price: ${currentPrice}`);

    // 2. رسم الشارتات وتحويلها لصور فعلية
    const { h1Image, m5Image } = await renderDualCharts(h1Candles, m5Candles, currentPrice);
    
    console.log(`🖼️ Demo charts rendered: H1=${h1Image.length} chars, M5=${m5Image.length} chars`);

    // 3. إرسال للـ AI للتحليل مع بيانات الشموع
    const analysis = await analyzeMultiTimeframe(h1Image, m5Image, currentPrice, h1Candles, m5Candles);
    
    console.log(`🤖 Demo analysis result: ${analysis.decision}, Score: ${analysis.score}`);

    // إرجاع النتيجة مع تحذير
    res.json({
      success: true,
      analysis,
      currentPrice,
      demo: true,
      warning: 'هذا تحليل تجريبي - للحصول على التحليل الكامل وحفظ النتائج، يرجى تسجيل الدخول والاشتراك',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Demo analysis error:', error);
    res.status(500).json({ error: 'خطأ في التحليل التجريبي' });
  }
});

// تحليل ICT كامل - مع التحقق من الاشتراك والمصادقة
// ❌ تم إلغاء التحليل اليدوي - التحليل متاح فقط تلقائياً للمشتركين

// المحادثة مع AI - مع التحقق من العملات
router.post('/chat', authMiddleware, chatPermissionMiddleware, async (req: AnalysisRequest, res: Response) => {
  try {
    const { message, analysis, currentPrice } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }

    const response = await chatWithAI(message, analysis || null, currentPrice || 0);

    // جلب العملات المحدثة
    const { getUserById } = await import('../db/index');
    const updatedUser = await getUserById(req.userId!);

    res.json({
      success: true,
      response,
      subscriptionInfo: req.subscriptionInfo,
      updatedCoins: updatedUser?.coins || 0
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'خطأ في المحادثة' });
  }
});

// متابعة الصفقة - مع التحقق من العملات
router.post('/follow-up', authMiddleware, chatPermissionMiddleware, async (req: AnalysisRequest, res: Response) => {
  try {
    const { originalAnalysis, tradeTimestamp, symbol = 'XAUUSD' } = req.body;

    if (!originalAnalysis || !tradeTimestamp) {
      return res.status(400).json({ error: 'بيانات الصفقة الأصلية مطلوبة' });
    }

    // جلب البيانات الحالية
    const [h1Candles, m5Candles, currentPrice] = await Promise.all([
      getCandles(symbol, '1h', 200),
      getCandles(symbol, '5m', 250),
      getCurrentPrice(symbol)
    ]);

    // رسم الشارتات باستخدام التقاط الصور الفعلية
    const { h1Image, m5Image } = await renderDualCharts(h1Candles, m5Candles, currentPrice);

    // المتابعة مع بيانات الشموع
    const result = await followUpTrade(
      h1Image,
      m5Image,
      originalAnalysis,
      currentPrice,
      new Date(tradeTimestamp),
      h1Candles,
      m5Candles
    );

    // جلب العملات المحدثة
    const { getUserById } = await import('../db/index');
    const updatedUser = await getUserById(req.userId!);

    res.json({
      success: true,
      ...result,
      currentPrice,
      subscriptionInfo: req.subscriptionInfo,
      updatedCoins: updatedUser?.coins || 0
    });

  } catch (error) {
    console.error('Follow-up error:', error);
    res.status(500).json({ error: 'خطأ في المتابعة' });
  }
});

// سجل التحليلات المحسن - مجاني للجميع
router.get('/enhanced-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;

    console.log(`📊 Enhanced history request: userId=${userId}, limit=${limit}`);
    
    const history = await getEnhancedAnalysisHistory(userId, limit);
    
    console.log(`📊 Enhanced history result: ${history.length} records for user ${userId}`);

    res.json({
      success: true,
      history: history.map((h: any) => ({
        ...h,
        suggestedTrade: h.suggested_trade,
        keyLevels: h.key_levels,
        waitingFor: h.waiting_for,
        liquiditySweepDetected: h.liquidity_sweep_detected === 1
      }))
    });

  } catch (error) {
    console.error('Enhanced history error:', error);
    res.status(500).json({ error: 'خطأ في جلب السجل المحسن' });
  }
});

// سجل الصفقات فقط - مجاني للجميع
router.get('/trades-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log(`💼 Trades history request: userId=${userId}, limit=${limit}`);
    
    const trades = await getTradeHistory(userId, limit);
    
    console.log(`💼 Trades history result: ${trades.length} trades for user ${userId}`);

    res.json({
      success: true,
      trades: trades.map((t: any) => {
        let suggestedTrade = null;
        try {
          suggestedTrade = t.suggested_trade
            ? (typeof t.suggested_trade === 'string' ? JSON.parse(t.suggested_trade) : t.suggested_trade)
            : null;
        } catch {}
        return {
          ...t,
          suggestedTrade,
          isTradeExecuted: t.is_trade_executed === 1
        };
      })
    });

  } catch (error) {
    console.error('Trades history error:', error);
    res.status(500).json({ error: 'خطأ في جلب سجل الصفقات' });
  }
});

// سجل التحليلات بدون صفقات - مجاني للجميع
router.get('/no-trades-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 20;

    const noTrades = await getNoTradeAnalysis(userId, limit);
    
    console.log(`📋 No-trades history result: ${noTrades.length} analyses for user ${userId}`);

    res.json({
      success: true,
      analyses: noTrades
    });

  } catch (error) {
    console.error('No-trades history error:', error);
    res.status(500).json({ error: 'خطأ في جلب سجل التحليلات' });
  }
});

// سجل التحليلات التلقائية من النظام (للمشتركين فقط)
router.get('/auto-history', authMiddleware, analysisPermissionMiddleware, async (req: AnalysisRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 20;

    // جلب التحليلات التلقائية الخاصة بالمستخدم فقط
    const autoAnalyses = await getEnhancedAnalysisHistory(userId, limit);
    
    // فلترة التحليلات التلقائية فقط
    const autoOnly = autoAnalyses.filter((h: any) => h.analysis_type === 'auto');

    res.json({
      success: true,
      history: autoOnly.map((h: any) => ({
        ...h,
        suggestedTrade: h.suggested_trade,
        keyLevels: h.key_levels,
        waitingFor: h.waiting_for,
        liquiditySweepDetected: h.liquidity_sweep_detected === 1,
        isAutoAnalysis: true
      }))
    });

  } catch (error) {
    console.error('Auto analysis history error:', error);
    res.status(500).json({ error: 'خطأ في جلب سجل التحليلات التلقائية' });
  }
});

// سجل التحليلات
router.get('/history', authMiddleware, analysisPermissionMiddleware, async (req: AnalysisRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await getAnalysisHistory(userId, limit);

    res.json({
      success: true,
      history: history.map(h => ({
        ...h,
        suggestedTrade: h.suggested_trade ? JSON.parse(h.suggested_trade) : null
      }))
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'خطأ في جلب السجل' });
  }
});

// جلب السعر الحالي
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await getCurrentPrice(symbol);
    
    res.json({
      success: true,
      symbol,
      price,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Price error:', error);
    res.status(500).json({ error: 'خطأ في جلب السعر' });
  }
});

// جلب بيانات الشموع
router.get('/candles/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const count = parseInt(req.query.count as string) || 200;

    const [candles, currentPrice] = await Promise.all([
      getCandles(symbol, timeframe, count),
      getCurrentPrice(symbol)
    ]);

    res.json({
      success: true,
      candles,
      currentPrice,
      symbol,
      timeframe,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Candles error:', error);
    res.status(500).json({ error: 'خطأ في جلب البيانات' });
  }
});

// ===================== Auto Analysis Endpoints =====================

// الحصول على آخر تحليل تلقائي للمستخدم الحالي
router.get('/latest-auto', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // جلب آخر تحليل تلقائي من قاعدة البيانات للمستخدم الحالي فقط
    const { getEnhancedAnalysisHistory } = await import('../db/index');
    const userAnalyses = await getEnhancedAnalysisHistory(userId, 1); // جلب آخر تحليل فقط
    
    if (userAnalyses && userAnalyses.length > 0) {
      const latestAnalysis = userAnalyses[0];
      
      // تحويل البيانات للصيغة المتوقعة
      const analysis = {
        decision: latestAnalysis.decision,
        score: latestAnalysis.score,
        confidence: latestAnalysis.confidence,
        price: latestAnalysis.price,
        suggestedTrade: latestAnalysis.suggested_trade,
        reasoning: latestAnalysis.reasoning || latestAnalysis.bias,
        keyLevels: latestAnalysis.key_levels,
        waitingFor: latestAnalysis.waiting_for
      };
      
      res.json({
        success: true,
        analysis: analysis,
        timestamp: latestAnalysis.created_at,
        price: latestAnalysis.price
      });
    } else {
      res.json({
        success: true,
        analysis: null,
        message: 'No recent auto analysis available for this user'
      });
    }
  } catch (error) {
    console.error('Latest auto analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get latest auto analysis'
    });
  }
});

// جلب آخر التحليلات التلقائية من الخادم (لزر استلام التحليلات في صفحة السجلات)
router.get('/server-analyses', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
    
    let analyses: any[] = [];
    
    if (isProduction) {
      const { query } = await import('../db/postgresAdapter');
      const result = await query(
        `SELECT * FROM auto_analysis ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      analyses = result.rows || [];
    } else {
      // في التطوير، جلب آخر تحليل فقط
      const { getLatestAutoAnalysis } = await import('../db/index');
      const latest = await getLatestAutoAnalysis('XAUUSD');
      if (latest) analyses = [latest];
    }
    
    if (analyses.length === 0) {
      return res.json({
        success: true,
        analyses: [],
        message: 'لا توجد تحليلات حالياً'
      });
    }

    // تنسيق البيانات
    const formatted = analyses.map((a: any) => {
      let suggestedTrade = null;
      try {
        suggestedTrade = a.suggested_trade 
          ? (typeof a.suggested_trade === 'string' ? JSON.parse(a.suggested_trade) : a.suggested_trade) 
          : null;
      } catch {}
      
      return {
        id: a.id,
        symbol: a.symbol || 'XAUUSD',
        decision: a.decision,
        score: a.score,
        confidence: a.confidence,
        price: a.current_price || a.price,
        suggestedTrade,
        // حقول مباشرة للتوافق مع التطبيق
        tradeType: suggestedTrade?.type || null,
        entry: suggestedTrade?.entry || a.current_price || a.price || null,
        sl: suggestedTrade?.sl || null,
        tp1: suggestedTrade?.tp1 || null,
        tp2: suggestedTrade?.tp2 || null,
        tp3: suggestedTrade?.tp3 || null,
        reasoning: a.reasoning || null,
        createdAt: a.created_at,
      };
    });

    res.json({
      success: true,
      analyses: formatted,
      count: formatted.length,
      message: `تم جلب ${formatted.length} تحليلات من الخادم`
    });
  } catch (error) {
    console.error('Server analyses error:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب التحليلات من الخادم'
    });
  }
});

// تفعيل/إلغاء تفعيل التحليل التلقائي للمستخدم
router.post('/toggle-auto', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { enabled } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    console.log(`🔧 Toggle auto analysis request: userId=${userId}, enabled=${enabled}`);

    // إذا كان المستخدم يريد تفعيل التحليل التلقائي، نتحقق من الاشتراك
    if (enabled) {
      const { getUserSubscriptionStatus } = await import('../services/subscriptionService');
      const subscriptionCheck = await getUserSubscriptionStatus(userId);
      
      if (!subscriptionCheck.hasActiveSubscription) {
        return res.status(403).json({
          success: false,
          error: 'SUBSCRIPTION_REQUIRED',
          message: 'يجب أن يكون لديك اشتراك نشط لتفعيل التحليل التلقائي',
          messageEn: 'Active subscription required to enable auto analysis',
          subscriptionStatus: subscriptionCheck
        });
      }
      
      console.log(`✅ User ${userId} has active subscription: ${subscriptionCheck.subscription?.planName}`);
    }

    // حفظ إعدادات التحليل التلقائي في قاعدة البيانات
    const { setUserAutoAnalysis } = await import('../db/index');
    console.log(`🔧 Calling setUserAutoAnalysis for user ${userId}, enabled: ${enabled}`);
    
    const success = await setUserAutoAnalysis(userId, enabled);
    console.log(`🔧 setUserAutoAnalysis result: ${success}`);
    
    if (!success) {
      console.error(`❌ setUserAutoAnalysis returned false for user ${userId}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to update auto analysis setting'
      });
    }
    
    console.log(`📡 User ${userId} ${enabled ? 'enabled' : 'disabled'} auto analysis reception`);

    res.json({
      success: true,
      message: `Auto analysis ${enabled ? 'enabled' : 'disabled'} successfully`,
      autoAnalysisEnabled: enabled
    });
  } catch (error) {
    console.error('Toggle auto analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle auto analysis'
    });
  }
});

export default router;
