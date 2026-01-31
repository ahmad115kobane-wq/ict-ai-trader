// index.ts
// الملف الرئيسي للسيرفر

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'path';
import { getCandles, getCurrentPrice } from './services/oandaService';
import { renderDualCharts } from './services/chartService';
import { analyzeMultiTimeframe } from './services/aiService';

// ===== Database helpers =====
import { saveAutoAnalysis, saveEnhancedAnalysis } from './db/index';

// ===== Utils =====
import { v4 as uuidv4 } from 'uuid';

// تحميل المتغيرات البيئية
dotenv.config();

// تحديد المسار الأساسي للملفات الثابتة
const SERVER_ROOT = path.join(__dirname, '..');

// Imports
import { initDatabase } from './db/index';
import authRoutes from './routes/auth';
import analysisRoutes from './routes/analysis';
import subscriptionRoutes from './routes/subscription';
import telegramRoutes from './routes/telegram';
import manualTradeRoutes from './routes/manualTrade';

import {
  initializeDefaultPackages,
  checkAndExpireSubscriptions,
} from './services/subscriptionService';

import { setupTelegramWebhook } from './services/telegramBotService';

// App init
const app = express();
const PORT = process.env.PORT || 3001;

// ===== Middleware =====
app.set('trust proxy', 1); // مهم لـ Railway

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Static files
app.use(express.static(path.join(SERVER_ROOT, 'public')));

// ===== Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api', manualTradeRoutes);

// صفحات HTML
app.get('/setup-telegram', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'public', 'setup-telegram.html'));
});

app.get('/manual-trade', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'public', 'manual-trade.html'));
});

app.get('/economic-calendar', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'public', 'economic-calendar.html'));
});

// ===== Startup Logic =====
(async () => {
  try {
    // Database
    await initDatabase();
    console.log('✅ Database initialized');

    // Default packages
    await initializeDefaultPackages();
    console.log('✅ Default packages initialized');

    // Telegram Webhook (يعمل تلقائيًا عند التشغيل)
    const TELEGRAM_WEBHOOK_URL =
      'https://ict-ai-trader-production.up.railway.app/api/telegram/webhook';

    const ok = await setupTelegramWebhook(TELEGRAM_WEBHOOK_URL);
    if (ok) {
      console.log('✅ Telegram webhook initialized on startup');
    } else {
      console.error('❌ Telegram webhook setup failed');
    }

    // Cron: فحص الاشتراكات
    cron.schedule('0 * * * *', async () => {
      try {
        await checkAndExpireSubscriptions();
        console.log('⏱️ Subscription check completed');
      } catch (err) {
        console.error('❌ Subscription cron error:', err);
      }
    });
  } catch (error) {
    console.error('❌ Startup error:', error);
  }
})();

// ===== Listen =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Test screenshot route
app.get('/test-screenshot', async (req, res) => {
  try {
    console.log('🧪 Testing screenshot capture...');
    const { testScreenshotCapture } = await import('./services/screenshotService');
    const testImage = await testScreenshotCapture();

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Screenshot Test</title>
        <style>
            body { margin: 0; padding: 20px; background: #0d1117; color: white; font-family: Arial; }
            img { max-width: 100%; border: 1px solid #333; border-radius: 8px; }
        </style>
    </head>
    <body>
        <h1>📸 Screenshot Test Result</h1>
        <p>Image length: ${testImage.length} characters</p>
        <img src="${testImage}" alt="Test Screenshot" />
    </body>
    </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Screenshot test failed:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Test parallel screenshot capture
app.get('/test-parallel', async (req, res) => {
  try {
    console.log('🧪 Testing parallel screenshot capture...');
    const { getCandles, getCurrentPrice } = await import('./services/oandaService');
    const { captureRealChartScreenshots } = await import('./services/screenshotService');

    const symbol = 'XAUUSD';

    // جلب البيانات
    const [h1Candles, m5Candles, currentPrice] = await Promise.all([
      getCandles(symbol, '1h', 100),  // 100 شمعة للساعة
      getCandles(symbol, '5m', 220),  // 220 شمعة لـ5 دقائق
      getCurrentPrice(symbol)
    ]);

    if (!h1Candles.length || !m5Candles.length || !currentPrice) {
      return res.status(500).json({ error: 'Failed to fetch test data' });
    }

    // التقاط الصور المتوازي
    const startTime = Date.now();
    const { h1Image, m5Image } = await captureRealChartScreenshots(h1Candles, m5Candles, currentPrice, 100, 220);
    const endTime = Date.now();

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Parallel Screenshot Test</title>
        <style>
            body { margin: 0; padding: 20px; background: #0d1117; color: white; font-family: Arial; }
            .chart { margin: 20px 0; }
            img { max-width: 100%; border: 1px solid #333; border-radius: 8px; }
            .stats { background: #1a1a2e; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>🚀 Parallel Screenshot Test Results</h1>
        
        <div class="stats">
            <h3>📊 Performance Stats</h3>
            <p><strong>Capture Time:</strong> ${endTime - startTime}ms</p>
            <p><strong>Current Price:</strong> ${currentPrice.toFixed(2)}</p>
            <p><strong>H1 Image Size:</strong> ${h1Image.length} characters</p>
            <p><strong>M5 Image Size:</strong> ${m5Image.length} characters</p>
        </div>
        
        <div class="chart">
            <h3>📈 H1 Chart (1 Hour)</h3>
            <img src="${h1Image}" alt="H1 Chart" />
        </div>
        
        <div class="chart">
            <h3>⚡ M5 Chart (5 Minutes)</h3>
            <img src="${m5Image}" alt="M5 Chart" />
        </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Parallel screenshot test failed:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Save charts to files endpoint
app.get('/save-charts', async (req, res) => {
  try {
    console.log('💾 Saving charts to files...');
    const { getCandles, getCurrentPrice } = await import('./services/oandaService');
    const { saveChartsToFiles } = await import('./services/screenshotService');

    const symbol = 'XAUUSD';

    // جلب البيانات
    const [h1Candles, m5Candles, currentPrice] = await Promise.all([
      getCandles(symbol, '1h', 100),  // 100 شمعة للساعة
      getCandles(symbol, '5m', 220),  // 220 شمعة لـ 5 دقائق
      getCurrentPrice(symbol)
    ]);

    if (!h1Candles.length || !m5Candles.length || !currentPrice) {
      return res.status(500).json({ error: 'Failed to fetch data for saving' });
    }

    // حفظ الصور في ملفات
    const { h1Path, m5Path } = await saveChartsToFiles(h1Candles, m5Candles, currentPrice);

    res.json({
      success: true,
      message: 'Charts saved successfully',
      files: {
        h1Chart: h1Path,
        m5Chart: m5Path
      },
      timestamp: new Date().toISOString(),
      price: currentPrice
    });

  } catch (error) {
    console.error('Save charts failed:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Test notification endpoint
app.get('/test-notification', async (req, res) => {
  try {
    console.log('🧪 Testing notification system...');

    const { notifyTradeOpportunity, sendDailyStats, notifySystemError } = await import('./services/notificationService');

    // Test trade notification
    const mockAnalysis = {
      decision: 'PLACE_PENDING',
      score: 8,
      confidence: 85,
      reasoning: 'Strong liquidity sweep detected on H1 with M5 confirmation',
      bias: 'Bullish momentum with clear entry setup',
      suggestedTrade: {
        type: 'BUY_LIMIT',
        entry: 2685.50,
        sl: 2680.00,
        tp1: 2690.00,
        tp2: 2695.00,
        tp3: 2705.00,
        rrRatio: 'TP1: 1:0.8 | TP2: 1:1.7 | TP3: 1:3.5',
        expiryMinutes: 60
      }
    };

    const currentPrice = 2687.25;

    // Send test notifications
    await notifyTradeOpportunity(mockAnalysis, currentPrice);
    await sendDailyStats();
    await notifySystemError('Test system notification - all systems operational');

    res.json({
      success: true,
      message: 'Test notifications sent successfully',
      testData: {
        analysis: mockAnalysis,
        currentPrice,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Test notification failed:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      message: 'Test notification failed'
    });
  }
});

// Send test trade endpoint - لاختبار الإشعارات من التطبيق
app.get('/send-test-trade', async (req, res) => {
  try {
    console.log('🧪 Sending test trade for notification testing...');

    // الحصول على السعر الحالي
    const symbol = 'XAUUSD';
    let currentPrice = 2687.25; // قيمة افتراضية

    try {
      currentPrice = await getCurrentPrice(symbol);
      console.log(`💰 Current price fetched: ${currentPrice}`);
    } catch (priceError) {
      console.log('⚠️ Could not fetch current price, using default');
    }

    // إنشاء صفقة تجريبية واقعية
    const isBuy = Math.random() > 0.5;
    const entryOffset = isBuy ? -2.5 : 2.5; // دخول أقل للشراء، أعلى للبيع
    const slOffset = isBuy ? -7.5 : 7.5; // وقف خسارة أبعد
    const tp1Offset = isBuy ? 5.0 : -5.0; // هدف أول
    const tp2Offset = isBuy ? 12.5 : -12.5; // هدف ثاني
    const tp3Offset = isBuy ? 22.5 : -22.5; // هدف ثالث

    const mockAnalysis = {
      decision: 'PLACE_PENDING',
      score: 9,
      confidence: 88,
      reasoning: '🧪 صفقة تجريبية لاختبار نظام الإشعارات - تم اكتشاف liquidity sweep قوي مع تأكيد من الإطارين الزمنيين',
      bias: isBuy ? 'Bullish momentum with clear buy setup' : 'Bearish momentum with clear sell setup',
      suggestedTrade: {
        type: isBuy ? 'BUY_LIMIT' : 'SELL_LIMIT',
        entry: parseFloat((currentPrice + entryOffset).toFixed(2)),
        sl: parseFloat((currentPrice + slOffset).toFixed(2)),
        tp1: parseFloat((currentPrice + tp1Offset).toFixed(2)),
        tp2: parseFloat((currentPrice + tp2Offset).toFixed(2)),
        tp3: parseFloat((currentPrice + tp3Offset).toFixed(2)),
        rrRatio: 'TP1: 1:1.5 | TP2: 1:3.0 | TP3: 1:6.0',
        expiryMinutes: 60
      },
      reasons: []
    };

    // تحديث lastAnalysisResult و lastAnalysisTime
    lastAnalysisResult = {
      decision: mockAnalysis.decision,
      score: mockAnalysis.score,
      confidence: mockAnalysis.confidence,
      price: currentPrice,
      suggestedTrade: mockAnalysis.suggestedTrade,
      reasoning: mockAnalysis.reasoning
    };
    lastAnalysisTime = new Date();

    // تحديث المتغيرات المصدرة
    module.exports.lastAnalysisResult = lastAnalysisResult;
    module.exports.lastAnalysisTime = lastAnalysisTime;

    console.log('✅ Test trade created and stored in lastAnalysisResult');
    console.log(`📊 Type: ${mockAnalysis.suggestedTrade.type}`);
    console.log(`💰 Entry: ${mockAnalysis.suggestedTrade.entry}`);
    console.log(`🛑 SL: ${mockAnalysis.suggestedTrade.sl}`);
    console.log(`✅ TP1: ${mockAnalysis.suggestedTrade.tp1}`);
    console.log(`✅ TP2: ${mockAnalysis.suggestedTrade.tp2}`);
    console.log(`✅ TP3: ${mockAnalysis.suggestedTrade.tp3}`);
    console.log(`⏰ Mobile app will receive this in next poll (within 10 seconds)`);

    // حفظ في قاعدة البيانات لجميع المستخدمين المشتركين
    try {
      const { getUsersWithAutoAnalysisEnabled } = await import('./db/index');
      const usersWithAutoAnalysis = await getUsersWithAutoAnalysisEnabled();

      for (const user of usersWithAutoAnalysis) {
        const testAnalysisId = uuidv4();
        saveEnhancedAnalysis(
          testAnalysisId,
          user.id,
          symbol,
          currentPrice,
          mockAnalysis,
          'auto' // نوع التحليل: auto لتظهر في السجلات
        );
      }
      console.log(`💾 Test trade saved for ${usersWithAutoAnalysis.length} users`);
    } catch (saveError) {
      console.error('❌ Failed to save test trade:', saveError);
    }

    // إرسال إشعار Telegram أيضاً (اختياري)
    try {
      const { notifyTradeOpportunity } = await import('./services/notificationService');
      await notifyTradeOpportunity(mockAnalysis, currentPrice);
      console.log('📱 Telegram notification sent');
    } catch (notificationError) {
      console.log('⚠️ Telegram notification skipped (not configured)');
    }

    // إرسال Push Notifications مباشرة للتطبيق (يعمل حتى لو التطبيق مغلق)
    let pushSent = 0;
    try {
      const { getUsersWithPushTokens } = await import('./db/index');
      const { sendFirebaseTradeNotification } = await import('./services/firebasePushService');

      const usersWithTokens = await getUsersWithPushTokens();
      const pushTokens = usersWithTokens.map((u: any) => u.push_token).filter(Boolean);

      if (pushTokens.length > 0) {
        const success = await sendFirebaseTradeNotification(
          pushTokens,
          { ...mockAnalysis.suggestedTrade, rrRatio: String(mockAnalysis.suggestedTrade.rrRatio) },
          mockAnalysis.score,
          currentPrice
        );
        if (success) {
          pushSent = pushTokens.length;
          console.log(`📱 Firebase push notifications sent to ${pushTokens.length} devices`);
        }
      } else {
        console.log('📱 No push tokens registered');
      }
    } catch (pushError) {
      console.error('❌ Push notification failed:', pushError);
    }

    res.json({
      success: true,
      message: `Test trade created! Push sent to ${pushSent} devices.`,
      testTrade: {
        analysis: mockAnalysis,
        currentPrice,
        timestamp: lastAnalysisTime.toISOString(),
        note: 'This trade is now stored in lastAnalysisResult and will be picked up by mobile app'
      }
    });

  } catch (error) {
    console.error('❌ Send test trade failed:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      message: 'Failed to send test trade'
    });
  }
});

// Send manual trade - مع مصادقة adminKey
app.post('/send-manual-trade', async (req, res) => {
  try {
    console.log('📝 Sending manual trade...');

    const {
      type,
      entry,
      sl,
      tp1,
      tp2,
      tp3,
      score,
      confidence,
      reasoning,
      adminKey
    } = req.body;

    // التحقق من المفتاح الإداري
    const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';
    if (adminKey !== ADMIN_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin key'
      });
    }

    // التحقق من البيانات فقط
    if (!type || !entry || !sl || !tp1 || !tp2 || !tp3) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // الحصول على السعر الحالي
    const symbol = 'XAUUSD';
    let currentPrice = 2687.25;

    try {
      currentPrice = await getCurrentPrice(symbol);
      console.log(`💰 Current price fetched: ${currentPrice}`);
    } catch (priceError) {
      console.log('⚠️ Could not fetch current price, using default');
    }

    // حساب RR
    const risk = Math.abs(entry - sl);
    const rr1 = Math.abs(tp1 - entry) / risk;
    const rr2 = Math.abs(tp2 - entry) / risk;
    const rr3 = Math.abs(tp3 - entry) / risk;
    const rrRatio = `TP1: 1:${rr1.toFixed(1)} | TP2: 1:${rr2.toFixed(1)} | TP3: 1:${rr3.toFixed(1)}`;

    // إنشاء الصفقة
    const manualAnalysis = {
      decision: 'PLACE_PENDING',
      score: score || 8,
      confidence: confidence || 80,
      reasoning: reasoning || 'صفقة يدوية من الإدارة',
      bias: type.includes('BUY') ? 'Bullish setup' : 'Bearish setup',
      suggestedTrade: {
        type,
        entry: parseFloat(entry),
        sl: parseFloat(sl),
        tp1: parseFloat(tp1),
        tp2: parseFloat(tp2),
        tp3: parseFloat(tp3),
        rrRatio,
        expiryMinutes: 60
      },
      reasons: []
    };

    // تحديث lastAnalysisResult و lastAnalysisTime
    lastAnalysisResult = {
      decision: manualAnalysis.decision,
      score: manualAnalysis.score,
      confidence: manualAnalysis.confidence,
      price: currentPrice,
      suggestedTrade: manualAnalysis.suggestedTrade,
      reasoning: manualAnalysis.reasoning
    };
    lastAnalysisTime = new Date();

    // تحديث المتغيرات المصدرة
    module.exports.lastAnalysisResult = lastAnalysisResult;
    module.exports.lastAnalysisTime = lastAnalysisTime;

    console.log('✅ Manual trade created and stored in lastAnalysisResult');
    console.log(`📊 Type: ${manualAnalysis.suggestedTrade.type}`);
    console.log(`💰 Entry: ${manualAnalysis.suggestedTrade.entry}`);
    console.log(`🛑 SL: ${manualAnalysis.suggestedTrade.sl}`);
    console.log(`✅ TP1: ${manualAnalysis.suggestedTrade.tp1}`);
    console.log(`✅ TP2: ${manualAnalysis.suggestedTrade.tp2}`);
    console.log(`✅ TP3: ${manualAnalysis.suggestedTrade.tp3}`);
    console.log(`⏰ Mobile app will receive this in next poll (within 10 seconds)`);

    // حفظ في قاعدة البيانات لجميع المستخدمين المشتركين
    let savedCount = 0;
    try {
      const { getUsersWithAutoAnalysisEnabled } = await import('./db/index');
      const usersWithAutoAnalysis = await getUsersWithAutoAnalysisEnabled();

      for (const user of usersWithAutoAnalysis) {
        const manualAnalysisId = uuidv4();
        saveEnhancedAnalysis(
          manualAnalysisId,
          user.id,
          symbol,
          currentPrice,
          manualAnalysis,
          'auto'
        );
        savedCount++;
      }
      console.log(`💾 Manual trade saved for ${savedCount} users`);
    } catch (saveError) {
      console.error('❌ Failed to save manual trade:', saveError);
    }

    // إرسال إشعار Telegram
    try {
      const { notifyTradeOpportunity } = await import('./services/notificationService');
      await notifyTradeOpportunity(manualAnalysis, currentPrice);
      console.log('📱 Telegram notification sent');
    } catch (notificationError) {
      console.log('⚠️ Telegram notification skipped (not configured)');
    }

    // إرسال Push Notifications
    let pushSent = 0;
    try {
      const { getUsersWithPushTokens } = await import('./db/index');
      const { sendFirebaseTradeNotification } = await import('./services/firebasePushService');

      const usersWithTokens = await getUsersWithPushTokens();
      const pushTokens = usersWithTokens.map((u: any) => u.push_token).filter(Boolean);

      if (pushTokens.length > 0) {
        const success = await sendFirebaseTradeNotification(
          pushTokens,
          { ...manualAnalysis.suggestedTrade, rrRatio: String(manualAnalysis.suggestedTrade.rrRatio) },
          manualAnalysis.score,
          currentPrice
        );
        if (success) {
          pushSent = pushTokens.length;
          console.log(`📱 Firebase push notifications sent to ${pushTokens.length} devices`);
        }
      } else {
        console.log('📱 No push tokens registered');
      }
    } catch (pushError) {
      console.error('❌ Push notification failed:', pushError);
    }

    res.json({
      success: true,
      message: `Manual trade sent! Push sent to ${pushSent} devices.`,
      trade: {
        analysis: manualAnalysis,
        currentPrice,
        timestamp: lastAnalysisTime.toISOString(),
        userCount: savedCount,
        pushSent,
        note: 'This trade is now stored in lastAnalysisResult and will be picked up by mobile app'
      }
    });

  } catch (error) {
    console.error('❌ Send manual trade failed:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      message: 'Failed to send manual trade'
    });
  }
});

// Debug endpoint - لفحص المستخدمين في قاعدة البيانات
app.get('/debug-users', async (req, res) => {
  try {
    const { query } = await import('./db/postgresAdapter');

    // جلب جميع المستخدمين مع معلوماتهم
    const allUsers = await query(`
      SELECT id, email, subscription, subscription_expiry, auto_analysis_enabled, 
             push_token IS NOT NULL as has_push_token,
             LEFT(push_token, 30) as push_token_preview
      FROM users
    `);

    // جلب المستخدمين المؤهلين للإشعارات
    const eligibleUsers = await query(`
      SELECT u.id, u.email, u.subscription, u.auto_analysis_enabled
      FROM users u
      WHERE u.push_token IS NOT NULL 
        AND u.push_token != '' 
        AND u.auto_analysis_enabled = TRUE
    `);

    res.json({
      totalUsers: allUsers.rows.length,
      users: allUsers.rows,
      eligibleForPush: eligibleUsers.rows.length,
      eligibleUsers: eligibleUsers.rows,
      note: 'لتلقي الإشعارات: يجب أن يكون push_token موجود + auto_analysis_enabled = true + اشتراك نشط'
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// تسجيل push token يدوياً للاختبار
app.get('/set-push-token', async (req, res) => {
  try {
    const { email, token } = req.query;
    if (!email || !token) {
      return res.status(400).json({ error: 'email and token required. Usage: /set-push-token?email=a@a.a&token=ExponentPushToken[xxx]' });
    }

    // تنظيف وتصحيح تنسيق التوكن
    const cleanToken = (token as string).trim().replace('ExponentPushToken[ ', 'ExponentPushToken[');

    const { query } = await import('./db/postgresAdapter');
    await query(
      'UPDATE users SET push_token = $1, push_token_updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [cleanToken, email]
    );

    res.json({ success: true, message: `Push token set for ${email}` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Debug notifications endpoint - للتحقق من حالة الإشعارات لكل مستخدم
app.get('/debug-notifications', async (req, res) => {
  try {
    const { query } = await import('./db/postgresAdapter');

    // جلب جميع المستخدمين مع تفاصيل كاملة
    const allUsers = await query(`
      SELECT 
        id, 
        email, 
        subscription, 
        subscription_expiry,
        auto_analysis_enabled,
        push_token IS NOT NULL AND push_token != '' as has_push_token,
        CASE WHEN push_token IS NOT NULL THEN LEFT(push_token, 40) || '...' ELSE NULL END as push_token_preview,
        push_token_updated_at
      FROM users
      ORDER BY push_token_updated_at DESC NULLS LAST
    `);

    // تحليل كل مستخدم وتحديد المشاكل
    const usersAnalysis = allUsers.rows.map((user: any) => {
      const issues: string[] = [];
      const now = new Date();

      // 1. فحص push_token
      if (!user.has_push_token) {
        issues.push('❌ push_token غير مسجل');
      }

      // 2. فحص auto_analysis_enabled
      if (!user.auto_analysis_enabled) {
        issues.push('❌ التحليل التلقائي معطل');
      }

      // 3. فحص الاشتراك
      if (!user.subscription || user.subscription === '' || user.subscription === 'free') {
        issues.push('❌ الاشتراك مجاني أو غير موجود');
      }

      // 4. فحص انتهاء الاشتراك
      if (user.subscription_expiry) {
        const expiryDate = new Date(user.subscription_expiry);
        if (expiryDate <= now) {
          issues.push(`❌ الاشتراك منتهي منذ ${expiryDate.toLocaleDateString('ar-EG')}`);
        }
      } else if (user.subscription && user.subscription !== 'free') {
        // اشتراك بدون تاريخ انتهاء (هذا قد يكون مشكلة)
        issues.push('⚠️ الاشتراك بدون تاريخ انتهاء');
      }

      const canReceiveNotifications = issues.length === 0;

      return {
        email: user.email,
        subscription: user.subscription || 'غير محدد',
        subscriptionExpiry: user.subscription_expiry,
        autoAnalysisEnabled: user.auto_analysis_enabled,
        hasPushToken: user.has_push_token,
        pushTokenPreview: user.push_token_preview,
        pushTokenUpdatedAt: user.push_token_updated_at,
        canReceiveNotifications,
        issues: issues.length > 0 ? issues : ['✅ جاهز لاستقبال الإشعارات'],
        status: canReceiveNotifications ? '🟢 نشط' : '🔴 غير نشط'
      };
    });

    // جلب المستخدمين المؤهلين فقط
    const { getUsersWithPushTokens } = await import('./db/index');
    const eligibleUsers = await getUsersWithPushTokens();

    res.json({
      totalUsers: allUsers.rows.length,
      eligibleForNotifications: eligibleUsers.length,
      summary: {
        withPushToken: usersAnalysis.filter((u: any) => u.hasPushToken).length,
        withAutoAnalysis: usersAnalysis.filter((u: any) => u.autoAnalysisEnabled).length,
        withPaidSubscription: usersAnalysis.filter((u: any) => u.subscription && u.subscription !== 'free').length,
        fullyEligible: eligibleUsers.length
      },
      users: usersAnalysis,
      eligibleEmails: eligibleUsers.map((u: any) => u.email),
      help: {
        note: 'لتفعيل الإشعارات، يجب أن يملك المستخدم:',
        requirements: [
          '1. push_token مسجل (يتم عند تفعيل الإشعارات في التطبيق)',
          '2. auto_analysis_enabled = true (يتفعل عند تشغيل التحليل التلقائي)',
          '3. اشتراك مدفوع (subscription != free)',
          '4. اشتراك غير منتهي (subscription_expiry > now)'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// إرسال إشعار تجريبي لمستخدم محدد
app.get('/send-test-notification', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({
        error: 'email required. Usage: /send-test-notification?email=user@example.com'
      });
    }

    const { query } = await import('./db/postgresAdapter');
    const { sendTradeNotification } = await import('./services/expoPushService');

    // جلب بيانات المستخدم
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.push_token) {
      return res.status(400).json({
        error: 'User has no push token registered',
        solution: 'User must enable notifications in the app first'
      });
    }

    // إرسال إشعار تجريبي
    const testTrade = {
      type: 'BUY_LIMIT',
      entry: 2750.00,
      sl: 2745.00,
      tp1: 2758.00,
      tp2: 2765.00,
      tp3: 2775.00,
      rrRatio: 'TP1: 1:1.6 | TP2: 1:3.0 | TP3: 1:5.0'
    };

    const success = await sendTradeNotification(
      [user.push_token],
      testTrade,
      9,
      2752.50
    );

    if (success) {
      res.json({
        success: true,
        message: `✅ Test notification sent to ${email}`,
        pushToken: user.push_token.substring(0, 40) + '...',
        note: 'Check your phone for the notification'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send notification',
        pushToken: user.push_token.substring(0, 40) + '...'
      });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Test page
app.get('/test', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'test-api.html'));
});

// Test analysis endpoint - للاختبار
app.get('/test-analysis', async (req, res) => {
  try {
    console.log('🧪 Test analysis endpoint called...');

    const symbol = 'XAUUSD';

    // جلب البيانات
    const [h1Candles, m5Candles, currentPrice] = await Promise.all([
      getCandles(symbol, '1h', 100),  // 100 شمعة للساعة
      getCandles(symbol, '5m', 220),  // 220 شمعة لـ5 دقائق
      getCurrentPrice(symbol)
    ]);

    if (!h1Candles.length || !m5Candles.length || !currentPrice) {
      return res.status(500).json({ error: 'Failed to fetch data' });
    }

    console.log(`📈 Test Data fetched: ${h1Candles.length} H1, ${m5Candles.length} M5, Price: ${currentPrice}`);

    // رسم الشارتات
    const { h1Image, m5Image } = await renderDualCharts(h1Candles, m5Candles, currentPrice, 100, 140);

    console.log(`🖼️ Test Charts rendered: H1=${h1Image.length} chars, M5=${m5Image.length} chars`);

    // التحليل مع بيانات الشموع
    const analysis = await analyzeMultiTimeframe(h1Image, m5Image, currentPrice, h1Candles, m5Candles);

    console.log(`🤖 Test Analysis result: ${analysis.decision}, Score: ${analysis.score}`);

    // إرجاع النتيجة
    res.json({
      success: true,
      message: 'Screenshot capture and analysis working!',
      analysis,
      currentPrice,
      chartSizes: {
        h1ImageSize: h1Image.length,
        m5ImageSize: m5Image.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test analysis error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      message: 'Test analysis failed'
    });
  }
});

// Chart route - عرض الرسم البياني
app.get('/chart', async (req, res) => {
  try {
    const symbol = 'XAUUSD';

    // جلب البيانات بالعدد المطلوب
    const [h1Candles, m5Candles, currentPrice] = await Promise.all([
      getCandles(symbol, '1h', 100),  // 100 شمعة للساعة
      getCandles(symbol, '5m', 220),  // 220 شمعة لـ 5 دقائق
      getCurrentPrice(symbol)
    ]);

    if (!h1Candles.length || !m5Candles.length || !currentPrice) {
      return res.status(500).json({ error: 'Failed to fetch chart data' });
    }

    // رسم الشارتات باستخدام التقاط الصور الفعلية
    const { h1Image, m5Image } = await renderDualCharts(h1Candles, m5Candles, currentPrice, 100, 140);

    // إنشاء صفحة HTML لعرض الشارتات
    const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ICT Trading Charts - XAUUSD</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #0d1117 0%, #0a0e14 50%, #06080c 100%);
                color: #fff;
                margin: 0;
                padding: 20px;
                min-height: 100vh;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.1);
            }
            .price {
                font-size: 2.5em;
                font-weight: bold;
                color: #10b981;
                margin: 10px 0;
            }
            .charts {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 30px;
            }
            .chart-container {
                background: rgba(255,255,255,0.02);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(255,255,255,0.08);
            }
            .chart-title {
                font-size: 1.2em;
                font-weight: bold;
                margin-bottom: 15px;
                text-align: center;
                color: #10b981;
            }
            .chart-image {
                width: 100%;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            .info {
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(255,255,255,0.1);
            }
            .refresh-btn {
                background: #10b981;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                margin: 10px;
                transition: background 0.3s;
            }
            .refresh-btn:hover {
                background: #059669;
            }
            @media (max-width: 768px) {
                .charts {
                    grid-template-columns: 1fr;
                }
                .price {
                    font-size: 2em;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 ICT Trading Charts</h1>
                <div class="price">$${currentPrice.toFixed(2)}</div>
                <p>XAUUSD - Gold Spot Price</p>
                <button class="refresh-btn" onclick="location.reload()">🔄 تحديث</button>
                <button class="refresh-btn" onclick="window.open('/api/analysis/latest', '_blank')">📈 آخر تحليل</button>
                <button class="refresh-btn" onclick="window.open('/auto-analysis', '_blank')">🤖 التحليل التلقائي</button>
            </div>
            
            <div class="charts">
                <div class="chart-container">
                    <div class="chart-title">📈 H1 Chart (1 Hour)</div>
                    <img src="${h1Image}" alt="H1 Chart" class="chart-image">
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">⚡ M5 Chart (5 Minutes)</div>
                    <img src="${m5Image}" alt="M5 Chart" class="chart-image">
                </div>
            </div>
            
            <div class="info">
                <h3>📋 معلومات الرسم البياني</h3>
                <p><strong>الرمز:</strong> XAUUSD (الذهب مقابل الدولار)</p>
                <p><strong>السعر الحالي:</strong> $${currentPrice.toFixed(2)}</p>
                <p><strong>آخر تحديث:</strong> ${new Date().toLocaleString('ar-EG')}</p>
                <p><strong>عدد الشموع:</strong> H1 = 100 شمعة، M5 = 140 شمعة</p>
                <p><strong>H1:</strong> إطار الساعة - للسياق العام والاتجاه</p>
                <p><strong>M5:</strong> إطار 5 دقائق - للدخول والتوقيت</p>
            </div>
        </div>
        
        <script>
            // تحديث تلقائي كل دقيقة
            setTimeout(() => {
                location.reload();
            }, 60000);
        </script>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Chart error:', error);
    res.status(500).json({ error: 'Failed to generate chart' });
  }
});

// Subscription management endpoint
app.get('/subscription-dashboard', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>لوحة إدارة الاشتراكات - ICT Trader</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #0d1117 0%, #0a0e14 50%, #06080c 100%);
              color: #fff;
              margin: 0;
              padding: 20px;
              min-height: 100vh;
          }
          .container {
              max-width: 1200px;
              margin: 0 auto;
          }
          .header {
              text-align: center;
              margin-bottom: 30px;
              padding: 20px;
              background: rgba(255,255,255,0.05);
              border-radius: 12px;
              border: 1px solid rgba(255,255,255,0.1);
          }
          .section {
              background: rgba(255,255,255,0.02);
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 20px;
              border: 1px solid rgba(255,255,255,0.08);
          }
          .btn {
              background: #10b981;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              margin: 5px;
              text-decoration: none;
              display: inline-block;
              transition: background 0.3s;
          }
          .btn:hover {
              background: #059669;
          }
          .btn-danger {
              background: #ef4444;
          }
          .btn-danger:hover {
              background: #dc2626;
          }
          .grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 20px 0;
          }
          .card {
              background: rgba(255,255,255,0.05);
              border-radius: 8px;
              padding: 15px;
              border: 1px solid rgba(255,255,255,0.1);
          }
          .status {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
          }
          .status.active {
              background: #10b981;
              color: white;
          }
          .status.expired {
              background: #ef4444;
              color: white;
          }
          .status.free {
              background: #6b7280;
              color: white;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>💎 لوحة إدارة الاشتراكات</h1>
              <p>نظام إدارة الباقات والاشتراكات المتقدم</p>
          </div>
          
          <div class="section">
              <h2>🎁 الباقات المتاحة</h2>
              <a href="/api/subscription/packages" class="btn" target="_blank">عرض جميع الباقات</a>
              <a href="#" class="btn" onclick="testPurchase()">اختبار شراء باقة</a>
          </div>
          
          <div class="section">
              <h2>👥 إدارة المستخدمين</h2>
              <a href="#" class="btn" onclick="checkExpiredSubscriptions()">فحص الاشتراكات المنتهية</a>
              <a href="#" class="btn" onclick="addTestCoins()">إضافة عملات تجريبية</a>
              <div id="userManagement" style="margin-top: 15px;"></div>
          </div>
          
          <div class="section">
              <h2>📊 الإحصائيات</h2>
              <div class="grid">
                  <div class="card">
                      <h3>الاشتراكات النشطة</h3>
                      <p id="activeSubscriptions">جاري التحميل...</p>
                  </div>
                  <div class="card">
                      <h3>إجمالي الإيرادات</h3>
                      <p id="totalRevenue">جاري التحميل...</p>
                  </div>
                  <div class="card">
                      <h3>المستخدمين المجانيين</h3>
                      <p id="freeUsers">جاري التحميل...</p>
                  </div>
              </div>
          </div>
          
          <div class="section">
              <h2>🔧 أدوات الاختبار</h2>
              <a href="/api/subscription/packages" class="btn" target="_blank">API: الباقات</a>
              <a href="/test-subscription" class="btn" target="_blank">اختبار نظام الاشتراك</a>
              <a href="/api/analysis/analyze" class="btn" target="_blank">اختبار التحليل</a>
              <button class="btn btn-danger" onclick="resetTestData()">إعادة تعيين البيانات التجريبية</button>
          </div>
      </div>
      
      <script>
          async function testPurchase() {
              try {
                  // محاكاة شراء باقة شهرية
                  const response = await fetch('/api/subscription/purchase', {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                          'Authorization': 'Bearer test-token' // يحتاج token حقيقي
                      },
                      body: JSON.stringify({
                          packageId: 'monthly-premium',
                          paymentMethod: 'test'
                      })
                  });
                  
                  const result = await response.json();
                  alert('نتيجة الشراء: ' + JSON.stringify(result, null, 2));
              } catch (error) {
                  alert('خطأ في الشراء: ' + error.message);
              }
          }
          
          async function checkExpiredSubscriptions() {
              try {
                  const response = await fetch('/check-expired-subscriptions');
                  const result = await response.json();
                  
                  document.getElementById('userManagement').innerHTML = 
                      '<h4>نتيجة فحص الاشتراكات:</h4>' +
                      '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
              } catch (error) {
                  alert('خطأ في فحص الاشتراكات: ' + error.message);
              }
          }
          
          function addTestCoins() {
              const userId = prompt('أدخل معرف المستخدم:');
              const amount = prompt('أدخل كمية العملات:');
              
              if (userId && amount) {
                  alert('سيتم إضافة ' + amount + ' عملة للمستخدم ' + userId);
                  // هنا يمكن إضافة API call
              }
          }
          
          function resetTestData() {
              if (confirm('هل أنت متأكد من إعادة تعيين البيانات التجريبية؟')) {
                  alert('تم إعادة تعيين البيانات التجريبية');
                  // هنا يمكن إضافة API call
              }
          }
          
          // تحميل الإحصائيات
          async function loadStats() {
              try {
                  // محاكاة البيانات
                  document.getElementById('activeSubscriptions').textContent = '12 اشتراك نشط';
                  document.getElementById('totalRevenue').textContent = '$1,234.56';
                  document.getElementById('freeUsers').textContent = '45 مستخدم مجاني';
              } catch (error) {
                  console.error('خطأ في تحميل الإحصائيات:', error);
              }
          }
          
          // تحميل الإحصائيات عند تحميل الصفحة
          loadStats();
      </script>
  </body>
  </html>
  `;

  res.send(html);
});

// Notification configuration endpoint
app.get('/notification-config', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>إعداد الإشعارات - ICT Trader</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #0d1117 0%, #0a0e14 50%, #06080c 100%);
              color: #fff;
              margin: 0;
              padding: 20px;
              min-height: 100vh;
          }
          .container {
              max-width: 800px;
              margin: 0 auto;
          }
          .header {
              text-align: center;
              margin-bottom: 30px;
              padding: 20px;
              background: rgba(255,255,255,0.05);
              border-radius: 12px;
              border: 1px solid rgba(255,255,255,0.1);
          }
          .section {
              background: rgba(255,255,255,0.02);
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 20px;
              border: 1px solid rgba(255,255,255,0.08);
          }
          .btn {
              background: #10b981;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              margin: 5px;
              text-decoration: none;
              display: inline-block;
              transition: background 0.3s;
          }
          .btn:hover {
              background: #059669;
          }
          .config-item {
              margin: 15px 0;
              padding: 15px;
              background: rgba(255,255,255,0.05);
              border-radius: 8px;
          }
          .status {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
          }
          .status.enabled {
              background: #10b981;
              color: white;
          }
          .status.disabled {
              background: #ef4444;
              color: white;
          }
          code {
              background: rgba(255,255,255,0.1);
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>📱 إعداد نظام الإشعارات</h1>
              <p>تكوين إشعارات Telegram للتحليل التلقائي</p>
          </div>
          
          <div class="section">
              <h2>📊 حالة النظام الحالية</h2>
              <div class="config-item">
                  <h3>🤖 Telegram Bot</h3>
                  <span class="status ${process.env.TELEGRAM_BOT_TOKEN ? 'enabled' : 'disabled'}">
                      ${process.env.TELEGRAM_BOT_TOKEN ? 'مُفعل' : 'غير مُفعل'}
                  </span>
                  <p>Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ تم تعيينه' : '❌ غير محدد'}</p>
                  <p>Chat ID: ${process.env.TELEGRAM_CHAT_ID ? '✅ تم تعيينه' : '❌ غير محدد'}</p>
              </div>
              
              <div class="config-item">
                  <h3>⚡ التحليل التلقائي</h3>
                  <span class="status enabled">نشط</span>
                  <p>يعمل كل 5 دقائق عند إغلاق شمعة M5</p>
              </div>
          </div>
          
          <div class="section">
              <h2>🔧 إعداد Telegram Bot</h2>
              <div class="config-item">
                  <h3>الخطوة 1: إنشاء Bot</h3>
                  <p>1. ابحث عن <code>@BotFather</code> في Telegram</p>
                  <p>2. أرسل <code>/newbot</code></p>
                  <p>3. اتبع التعليمات واحصل على Token</p>
                  <p>4. أضف Token إلى متغير البيئة <code>TELEGRAM_BOT_TOKEN</code></p>
              </div>
              
              <div class="config-item">
                  <h3>الخطوة 2: الحصول على Chat ID</h3>
                  <p>1. أرسل رسالة لـ Bot الخاص بك</p>
                  <p>2. افتح: <code>https://api.telegram.org/bot[TOKEN]/getUpdates</code></p>
                  <p>3. ابحث عن <code>chat.id</code> في الاستجابة</p>
                  <p>4. أضف Chat ID إلى متغير البيئة <code>TELEGRAM_CHAT_ID</code></p>
              </div>
          </div>
          
          <div class="section">
              <h2>🧪 اختبار الإشعارات</h2>
              <a href="/test-notification" class="btn" target="_blank">اختبار إرسال الإشعارات</a>
              <p>سيرسل إشعارات تجريبية لاختبار النظام</p>
          </div>
          
          <div class="section">
              <h2>📋 أنواع الإشعارات</h2>
              <div class="config-item">
                  <h3>🚨 فرص التداول</h3>
                  <p>إشعار فوري عند اكتشاف فرصة تداول جديدة</p>
                  <p>يتضمن: نوع الصفقة، الدخول، SL، TP، التقييم</p>
              </div>
              
              <div class="config-item">
                  <h3>📊 الإحصائيات اليومية</h3>
                  <p>ملخص يومي في الساعة 8:00 صباحاً</p>
                  <p>حالة النظام والإحصائيات العامة</p>
              </div>
              
              <div class="config-item">
                  <h3>⚠️ تنبيهات النظام</h3>
                  <p>إشعارات الأخطاء والمشاكل التقنية</p>
                  <p>للمراقبة والصيانة</p>
              </div>
          </div>
          
          <div class="section">
              <h2>🔗 روابط مفيدة</h2>
              <a href="/auto-analysis-status" class="btn" target="_blank">حالة التحليل التلقائي</a>
              <a href="/chart" class="btn" target="_blank">الرسوم البيانية المباشرة</a>
              <a href="/subscription-dashboard" class="btn" target="_blank">لوحة الاشتراكات</a>
          </div>
      </div>
  </body>
  </html>
  `;

  res.send(html);
});

// Test auth page
app.get('/test-auth', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'test-auth.html'));
});

// Test notifications page
app.get('/test-notifications', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'test-notifications.html'));
});

// Test send trade page - لاختبار إرسال صفقة تجريبية
app.get('/test-send-trade', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'test-send-trade.html'));
});

// Test send trade page (simple version) - نسخة مبسطة للاختبار
app.get('/test-send-trade-simple', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'test-send-trade-simple.html'));
});

// Test subscription endpoint
app.get('/test-subscription', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'test-subscription.html'));
});

// Delete old push tokens page
app.get('/delete-old-tokens', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>حذف Push Tokens القديمة</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0d1117 0%, #0a0e14 50%, #06080c 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container { max-width: 700px; width: 100%; }
        .card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 30px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
        h1 {
            text-align: center;
            margin-bottom: 10px;
            font-size: 2em;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle {
            text-align: center;
            color: #9ca3af;
            margin-bottom: 30px;
            font-size: 0.95em;
        }
        .warning-box {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .warning-box h3 {
            color: #ef4444;
            margin-bottom: 12px;
            font-size: 1.1em;
        }
        .warning-box p {
            color: #fca5a5;
            line-height: 1.6;
            font-size: 0.95em;
        }
        .quick-delete {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .quick-delete h4 {
            color: #fca5a5;
            margin-bottom: 10px;
            font-size: 0.95em;
        }
        .quick-delete button {
            padding: 10px 15px;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 6px;
            color: #fca5a5;
            cursor: pointer;
            font-size: 0.85em;
            margin: 5px;
            transition: all 0.2s;
        }
        .quick-delete button:hover {
            background: rgba(239, 68, 68, 0.3);
            color: #fff;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            color: #d1d5db;
            margin-bottom: 8px;
            font-size: 0.95em;
        }
        .form-group input {
            width: 100%;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #fff;
            font-size: 0.95em;
            font-family: 'Courier New', monospace;
        }
        .form-group input:focus {
            outline: none;
            border-color: #ef4444;
            background: rgba(255, 255, 255, 0.08);
        }
        .btn {
            width: 100%;
            padding: 16px;
            font-size: 1.1em;
            font-weight: bold;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 15px;
        }
        .btn-danger {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }
        .btn-danger:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
        }
        .btn-danger:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .result {
            margin-top: 20px;
            padding: 20px;
            border-radius: 12px;
            display: none;
        }
        .result.success {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            display: block;
        }
        .result.error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            display: block;
        }
        .result h3 { margin-bottom: 12px; font-size: 1.1em; }
        .result.success h3 { color: #10b981; }
        .result.error h3 { color: #ef4444; }
        .result pre {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.85em;
            line-height: 1.5;
            color: #e5e7eb;
        }
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        .loading.active { display: block; }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid #ef4444;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🗑️ حذف Push Tokens القديمة</h1>
            <p class="subtitle">إزالة Push Tokens الخاطئة من قاعدة البيانات</p>

            <div class="warning-box">
                <h3>⚠️ تحذير</h3>
                <p>
                    هذه الأداة تحذف Push Tokens من قاعدة البيانات بشكل نهائي.
                    استخدمها فقط لحذف Tokens الخاطئة أو القديمة.
                </p>
            </div>

            <div class="quick-delete">
                <h4>🚀 حذف سريع للـ Token الخاطئ المعروف:</h4>
                <button onclick="deleteKnownToken()">
                    حذف ExponentPushToken[0471f47f-fc62-4b7d-9d62-853231493d73]
                </button>
            </div>

            <div class="form-group">
                <label>🔑 Push Token المراد حذفه:</label>
                <input 
                    type="text" 
                    id="pushToken" 
                    placeholder="ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
                    value=""
                />
            </div>

            <button class="btn btn-danger" onclick="deleteToken()" id="deleteBtn">
                🗑️ حذف Push Token
            </button>

            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>جاري حذف Push Token...</p>
            </div>

            <div class="result" id="result"></div>
        </div>
    </div>

    <script>
        async function deleteKnownToken() {
            document.getElementById('pushToken').value = 'ExponentPushToken[0471f47f-fc62-4b7d-9d62-853231493d73]';
            await deleteToken();
        }

        async function deleteToken() {
            const pushToken = document.getElementById('pushToken').value.trim();
            const btn = document.getElementById('deleteBtn');
            const loading = document.getElementById('loading');
            const result = document.getElementById('result');

            if (!pushToken) {
                result.className = 'result error';
                result.innerHTML = '<h3>❌ خطأ</h3><p style="color: #fca5a5;">الرجاء إدخال Push Token</p>';
                return;
            }

            result.style.display = 'none';
            result.className = 'result';
            loading.classList.add('active');
            btn.disabled = true;

            try {
                const response = await fetch('/api/auth/delete-push-token-by-value', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pushToken })
                });

                const data = await response.json();
                loading.classList.remove('active');
                btn.disabled = false;

                if (data.success) {
                    result.className = 'result success';
                    result.innerHTML = \`
                        <h3>✅ تم الحذف بنجاح!</h3>
                        <p style="color: #6ee7b7; margin: 15px 0;">تم حذف Push Token من قاعدة البيانات.</p>
                        <pre>\${JSON.stringify(data, null, 2)}</pre>
                    \`;
                    document.getElementById('pushToken').value = '';
                } else {
                    result.className = 'result error';
                    result.innerHTML = \`<h3>❌ فشل الحذف</h3><pre>\${JSON.stringify(data, null, 2)}</pre>\`;
                }
            } catch (error) {
                loading.classList.remove('active');
                btn.disabled = false;
                result.className = 'result error';
                result.innerHTML = \`<h3>❌ خطأ في الاتصال</h3><p style="color: #fca5a5; margin-top: 10px;">\${error.message}</p>\`;
            }
        }

        document.getElementById('pushToken').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') deleteToken();
        });
    </script>
</body>
</html>
  `;
  res.send(html);
});

// Manual subscription expiry check endpoint
app.get('/check-expired-subscriptions', async (req, res) => {
  try {
    const result = await checkAndExpireSubscriptions();

    res.json({
      success: true,
      message: 'Subscription expiry check completed',
      result: {
        expiredCount: result.expiredCount,
        expiredUsers: result.expiredUsers,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Manual subscription check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check expired subscriptions',
      message: (error as Error).message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Current price endpoint
app.get('/api/analysis/current-price', async (req, res) => {
  try {
    const currentPrice = await getCurrentPrice('XAUUSD');
    res.json({
      success: true,
      price: currentPrice,
      symbol: 'XAUUSD',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current price'
    });
  }
});

// ===================== Economic Calendar Endpoints =====================
// جلب التقويم الاقتصادي الكامل
app.get('/api/economic-calendar', async (req, res) => {
  try {
    const { getEconomicCalendar } = await import('./services/economicCalendarService');
    const forceRefresh = req.query.refresh === 'true';
    const calendar = await getEconomicCalendar(forceRefresh);
    res.json(calendar);
  } catch (error) {
    console.error('❌ Failed to get economic calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch economic calendar'
    });
  }
});

// جلب الأحداث ذات التأثير العالي فقط
app.get('/api/economic-calendar/high-impact', async (req, res) => {
  try {
    const { getHighImpactEvents } = await import('./services/economicCalendarService');
    const events = await getHighImpactEvents();
    res.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    console.error('❌ Failed to get high impact events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch high impact events'
    });
  }
});

// جلب أحداث اليوم
app.get('/api/economic-calendar/today', async (req, res) => {
  try {
    const { getTodayEvents } = await import('./services/economicCalendarService');
    const events = await getTodayEvents();
    res.json({
      success: true,
      events,
      count: events.length,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('❌ Failed to get today events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today events'
    });
  }
});

// جلب الأحداث القادمة
app.get('/api/economic-calendar/upcoming', async (req, res) => {
  try {
    const { getUpcomingEvents } = await import('./services/economicCalendarService');
    const hours = parseInt(req.query.hours as string) || 24;
    const events = await getUpcomingEvents(hours);
    res.json({
      success: true,
      events,
      count: events.length,
      hoursAhead: hours
    });
  } catch (error) {
    console.error('❌ Failed to get upcoming events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming events'
    });
  }
});

// التحقق من وجود أحداث عالية التأثير قريبة
app.get('/api/economic-calendar/check-upcoming', async (req, res) => {
  try {
    const { hasHighImpactEventSoon } = await import('./services/economicCalendarService');
    const minutes = parseInt(req.query.minutes as string) || 30;
    const hasEvent = await hasHighImpactEventSoon(minutes);
    res.json({
      success: true,
      hasHighImpactEventSoon: hasEvent,
      minutesAhead: minutes
    });
  } catch (error) {
    console.error('❌ Failed to check upcoming events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check upcoming events'
    });
  }
});

// إرسال إشعار تجريبي للأحداث الاقتصادية
app.get('/send-test-economic-notification', async (req, res) => {
  try {
    const { sendTestEconomicEventNotification } = await import('./services/economicEventNotificationService');
    const result = await sendTestEconomicEventNotification();
    res.json(result);
  } catch (error) {
    console.error('❌ Failed to send test economic notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

// الحصول على إحصائيات إشعارات الأحداث الاقتصادية
app.get('/api/economic-calendar/notification-stats', async (req, res) => {
  try {
    const { getNotificationStats } = await import('./services/economicEventNotificationService');
    const stats = getNotificationStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Failed to get notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification stats'
    });
  }
});

// اختبار البيانات الخام من Forex Factory
app.get('/api/economic-calendar/test-raw-data', async (req, res) => {
  try {
    const axios = await import('axios');
    const response = await axios.default.get('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // عرض أول 5 أحداث فقط للاختبار
    const sample = Array.isArray(response.data) ? response.data.slice(0, 5) : [];
    
    res.json({
      success: true,
      totalEvents: Array.isArray(response.data) ? response.data.length : 0,
      sampleEvents: sample,
      note: 'Showing first 5 events from Forex Factory API'
    });
  } catch (error) {
    console.error('❌ Failed to fetch raw data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch raw data'
    });
  }
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'ICT AI Trader API',
    version: '1.0.0',
    features: {
      autoAnalysis: 'Smart M5 candle close analysis',
      notifications: 'Telegram notifications for trade opportunities',
      subscriptions: 'VIP package system with unlimited access',
      realTimeData: 'Live OANDA price feeds',
      chartCapture: 'Real browser screenshot analysis'
    },
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      analysis: {
        analyze: 'POST /api/analysis/analyze',
        analyzeImages: 'POST /api/analysis/analyze-images',
        chat: 'POST /api/analysis/chat',
        followUp: 'POST /api/analysis/follow-up',
        history: 'GET /api/analysis/history',
        enhancedHistory: 'GET /api/analysis/enhanced-history',
        tradesHistory: 'GET /api/analysis/trades-history',
        noTradesHistory: 'GET /api/analysis/no-trades-history',
        price: 'GET /api/analysis/price/:symbol'
      },
      subscription: {
        packages: 'GET /api/subscription/packages',
        purchase: 'POST /api/subscription/purchase',
        status: 'GET /api/subscription/status'
      },
      notifications: {
        test: 'GET /test-notification',
        config: 'GET /notification-config'
      },
      monitoring: {
        autoAnalysisStatus: 'GET /auto-analysis-status',
        health: 'GET /health',
        charts: 'GET /chart'
      }
    }
  });
});

// Auto Analysis Status endpoint
app.get('/auto-analysis-status', (req, res) => {
  const closeInfo = getNextCandleCloseInfo();

  const response: any = {
    status: 'active',
    message: 'Smart auto analysis is running',
    nextAnalysis: {
      timeUntilNext: Math.round(closeInfo.millisecondsUntil / 1000), // seconds
      nextCloseTime: closeInfo.nextCloseTime.toISOString(),
      nextCloseTimeLocal: closeInfo.nextCloseTime.toLocaleString('ar-EG'),
      currentTime: closeInfo.currentTime.toISOString(),
      currentTimeLocal: closeInfo.currentTime.toLocaleString('ar-EG')
    },
    schedule: 'At every M5 candle close (0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 minutes)',
    symbol: 'XAUUSD',
    timestamp: closeInfo.currentTime.toISOString()
  };

  // إضافة معلومات آخر تحليل إذا كانت متوفرة
  if (lastAnalysisResult && lastAnalysisTime) {
    response.lastAnalysis = {
      ...lastAnalysisResult,
      timestamp: lastAnalysisTime.toISOString(),
      timestampLocal: lastAnalysisTime.toLocaleString('ar-EG'),
      minutesAgo: Math.round((closeInfo.currentTime.getTime() - lastAnalysisTime.getTime()) / 60000)
    };
  }

  res.json(response);
});

// Auto Analysis Status Page
app.get('/auto-analysis', (req, res) => {
  res.sendFile(path.join(SERVER_ROOT, 'test-auto-analysis.html'));
});

// ===================== Daily Subscription Expiry Check (12 AM) =====================
// فحص انتهاء الاشتراكات يومياً في الساعة 12 صباحاً
cron.schedule('0 0 * * *', async () => {
  console.log('🕐 Daily subscription expiry check started at 12:00 AM...');

  try {
    const result = await checkAndExpireSubscriptions();

    if (result.expiredCount > 0) {
      console.log(`⏰ Expired ${result.expiredCount} subscriptions:`);
      result.expiredUsers.forEach(userId => {
        console.log(`   - User: ${userId}`);
      });

      // هنا يمكن إرسال إشعارات للمستخدمين المنتهية اشتراكاتهم
      // TODO: Send notifications to expired users
    } else {
      console.log('✅ No expired subscriptions found');
    }

  } catch (error) {
    console.error('❌ Daily subscription check failed:', error);
  }
}, {
  timezone: 'Asia/Riyadh' // توقيت السعودية
});

// فحص إضافي كل 6 ساعات للتأكد
cron.schedule('0 */6 * * *', async () => {
  console.log('🔄 Additional subscription check (every 6 hours)...');

  try {
    const result = await checkAndExpireSubscriptions();
    if (result.expiredCount > 0) {
      console.log(`⚠️ Found ${result.expiredCount} expired subscriptions during additional check`);
    }
  } catch (error) {
    console.error('❌ Additional subscription check failed:', error);
  }
});

// إرسال إحصائيات يومية في الساعة 8 صباحاً
cron.schedule('0 8 * * *', async () => {
  console.log('📊 Sending daily statistics...');

  try {
    const { sendDailyStats } = await import('./services/notificationService');
    await sendDailyStats();
    console.log('✅ Daily statistics sent successfully');
  } catch (error) {
    console.error('❌ Failed to send daily statistics:', error);
  }
}, {
  timezone: 'Asia/Riyadh'
});

// تنظيف الجلسات المنتهية كل ساعة
cron.schedule('0 * * * *', async () => {
  console.log('🧹 Cleaning up expired sessions...');

  try {
    const { cleanupExpiredSessions } = await import('./db/index');
    const cleanedCount = await cleanupExpiredSessions();

    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} expired sessions`);
    } else {
      console.log('✅ No expired sessions to clean');
    }
  } catch (error) {
    console.error('❌ Failed to cleanup sessions:', error);
  }
});

// ===================== Smart Auto Analysis (عند إغلاق شمعة M5) =====================
let autoAnalysisInterval: NodeJS.Timeout | null = null;
let lastAnalysisResult: any = null;
let lastAnalysisTime: Date | null = null;

// تصدير المتغيرات للاستخدام في routes أخرى
module.exports.lastAnalysisResult = lastAnalysisResult;
module.exports.lastAnalysisTime = lastAnalysisTime;

const calculateNextCandleClose = (): number => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();

  // حساب الدقائق حتى إغلاق الشمعة القادمة (0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
  const nextCloseMinute = Math.ceil(minutes / 5) * 5;
  const minutesUntilClose = nextCloseMinute - minutes;
  const secondsUntilClose = (minutesUntilClose * 60) - seconds;
  const millisecondsUntilClose = (secondsUntilClose * 1000) - milliseconds;

  return millisecondsUntilClose > 0 ? millisecondsUntilClose : 5 * 60 * 1000; // 5 دقائق بالميلي ثانية
};

const getNextCandleCloseInfo = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const nextCloseMinute = Math.ceil(minutes / 5) * 5;
  const nextCloseTime = new Date(now);
  nextCloseTime.setMinutes(nextCloseMinute, 0, 0); // تعيين الثواني والميلي ثانية إلى 0

  if (nextCloseTime <= now) {
    nextCloseTime.setMinutes(nextCloseTime.getMinutes() + 5);
  }

  return {
    currentTime: now,
    nextCloseTime,
    millisecondsUntil: nextCloseTime.getTime() - now.getTime()
  };
};

const scheduleNextAnalysis = () => {
  if (autoAnalysisInterval) {
    clearTimeout(autoAnalysisInterval);
  }

  const closeInfo = getNextCandleCloseInfo();
  const secondsUntilClose = Math.round(closeInfo.millisecondsUntil / 1000);

  console.log(`⏰ Next auto analysis scheduled in ${secondsUntilClose} seconds (at ${closeInfo.nextCloseTime.toLocaleTimeString('ar-EG')})`);

  autoAnalysisInterval = setTimeout(async () => {
    console.log('🕐 M5 Candle closed - triggering auto analysis...');
    await runAutoAnalysis();
    // جدولة التحليل التالي
    scheduleNextAnalysis();
  }, closeInfo.millisecondsUntil);
};

const runAutoAnalysis = async (retryCount: number = 0) => {
  console.log('🔄 Auto Analysis: Starting at M5 candle close...');

  try {
    const symbol = 'XAUUSD';

    // انتظار ثانية واحدة للتأكد من تحديث البيانات
    await new Promise(resolve => setTimeout(resolve, 1000));

    // جلب البيانات بالعدد المطلوب مع إعادة المحاولة
    let h1Candles, m5Candles, currentPrice;

    try {
      [h1Candles, m5Candles, currentPrice] = await Promise.all([
        getCandles(symbol, '1h', 100),  // 100 شمعة للساعة
        getCandles(symbol, '5m', 220),  // 220 شمعة لـ 5 دقائق
        getCurrentPrice(symbol)
      ]);
    } catch (dataError) {
      console.log(`❌ Auto Analysis: Data fetch failed (attempt ${retryCount + 1}/3)`);

      // إعادة المحاولة حتى 3 مرات مع تأخير متزايد
      if (retryCount < 2) {
        const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s
        console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
        setTimeout(() => runAutoAnalysis(retryCount + 1), delay);
        return;
      } else {
        console.log('❌ Auto Analysis: All retry attempts failed - OANDA API may be down');
        return;
      }
    }

    if (!h1Candles.length || !m5Candles.length || !currentPrice) {
      console.log('❌ Auto Analysis: Invalid data received');
      return;
    }

    console.log(`📈 Auto Analysis: Data fetched successfully, Price: ${currentPrice}`);
    console.log(`📊 Auto Analysis: H1 candles: ${h1Candles.length}, M5 candles: ${m5Candles.length}`);

    // رسم الشارتات باستخدام التقاط الصور الفعلية
    const { h1Image, m5Image } = await renderDualCharts(h1Candles, m5Candles, currentPrice, 100, 140);

    // التحليل مع بيانات الشموع
    const analysis = await analyzeMultiTimeframe(h1Image, m5Image, currentPrice, h1Candles, m5Candles);

    console.log(`🤖 Auto Analysis: ${analysis.decision}, Score: ${analysis.score}, Confidence: ${analysis.confidence}%`);

    // حفظ نتيجة آخر تحليل
    lastAnalysisResult = {
      decision: analysis.decision,
      score: analysis.score,
      confidence: analysis.confidence,
      price: currentPrice,
      suggestedTrade: analysis.suggestedTrade,
      reasoning: analysis.reasoning || analysis.bias
    };
    lastAnalysisTime = new Date();

    // تحديث المتغيرات المصدرة
    module.exports.lastAnalysisResult = lastAnalysisResult;
    module.exports.lastAnalysisTime = lastAnalysisTime;

    // حفظ في قاعدة البيانات لكل مستخدم مفعل التحليل التلقائي
    const { getUsersWithAutoAnalysisEnabled } = await import('./db/index');
    const usersWithAutoAnalysis = await getUsersWithAutoAnalysisEnabled();

    console.log(`👥 Found ${usersWithAutoAnalysis.length} users with auto analysis enabled`);

    // حفظ التحليل لكل مستخدم مفعل التحليل التلقائي
    for (const user of usersWithAutoAnalysis) {
      const userAnalysisId = uuidv4();

      saveEnhancedAnalysis(
        userAnalysisId,
        user.id, // حفظ لكل مستخدم على حدة
        symbol,
        currentPrice,
        analysis,
        'auto'
      );

      console.log(`✅ Auto analysis saved for user: ${user.email}`);
    }

    // حفظ نسخة عامة أيضاً للتوافق
    const autoAnalysisId = uuidv4();

    // حفظ في الجدول القديم للتوافق
    saveAutoAnalysis(
      autoAnalysisId,
      symbol,
      '', // لا نحفظ الصور لتوفير المساحة
      '',
      currentPrice,
      analysis.decision,
      analysis.score,
      analysis.confidence,
      analysis.suggestedTrade ? JSON.stringify(analysis.suggestedTrade) : null
    );

    // إذا وجدت صفقة - عرض التفاصيل وإرسال إشعارات
    if (analysis.decision === 'PLACE_PENDING' && analysis.suggestedTrade) {
      console.log('🎯 Auto Analysis: Trade opportunity found!');
      console.log(`   📊 Type: ${analysis.suggestedTrade.type}`);
      console.log(`   💰 Entry: ${analysis.suggestedTrade.entry}`);
      console.log(`   🛑 SL: ${analysis.suggestedTrade.sl}`);
      console.log(`   ✅ TP1: ${analysis.suggestedTrade.tp1}`);
      console.log(`   ✅ TP2: ${analysis.suggestedTrade.tp2}`);
      console.log(`   ✅ TP3: ${analysis.suggestedTrade.tp3}`);
      console.log(`   📈 RR: ${analysis.suggestedTrade.rrRatio || 'N/A'}`);
      console.log(`   ⏰ Expiry: ${analysis.suggestedTrade.expiryMinutes || 60} minutes`);
      console.log(`   📝 Reasoning: ${analysis.reasoning || analysis.bias}`);

      // إرسال إشعارات للمستخدمين المشتركين
      try {
        const { notifyTradeOpportunity } = await import('./services/notificationService');
        await notifyTradeOpportunity(analysis, currentPrice);
        console.log('📱 Telegram notification sent to subscribers');
      } catch (notificationError) {
        console.error('❌ Failed to send Telegram notification:', notificationError);
      }

      // إرسال Push Notifications للتطبيق
      try {
        const { getUsersWithPushTokens } = await import('./db/index');
        const { sendTradeNotification } = await import('./services/expoPushService');

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
        } else {
          console.log('📱 No push tokens registered for notifications');
        }
      } catch (pushError) {
        console.error('❌ Failed to send push notifications:', pushError);
      }

    } else {
      // ✅ عرض الأسباب التفصيلية
      const mainReasons = analysis.reasons?.filter(r => r.startsWith("❌")).slice(0, 3) || [];
      const reasonsText = mainReasons.length > 0 
        ? mainReasons.join(' | ') 
        : 'لا يوجد setup صالح';
      
      console.log(`📋 Auto Analysis: No trade`);
      console.log(`   الأسباب: ${reasonsText}`);

      // إرسال إشعار بعدم وجود فرصة (اختياري)
      try {
        const { notifyNoTrade } = await import('./services/notificationService');
        await notifyNoTrade(analysis, currentPrice);
      } catch (notificationError) {
        console.error('❌ Failed to send no-trade notification:', notificationError);
      }
    }

  } catch (error) {
    console.error('❌ Auto Analysis Error:', error);

    // إرسال إشعار بالخطأ
    try {
      const { notifySystemError } = await import('./services/notificationService');
      await notifySystemError(`Auto Analysis failed: ${(error as Error).message}`);
    } catch (notificationError) {
      console.error('❌ Failed to send error notification:', notificationError);
    }
  }
};

// ===================== AUTO ANALYSIS - ENABLED =====================
// بدء جدولة التحليل التلقائي الذكي
scheduleNextAnalysis(); // ✅ مفعّل

// ===================== Start Server =====================
const startServer = async () => {
  try {
    // تهيئة قاعدة البيانات
    await initDatabase();

    // تهيئة الباقات الافتراضية
    await initializeDefaultPackages();

    // فحص الاشتراكات المنتهية عند بدء التشغيل
    console.log('🔄 Checking for expired subscriptions on startup...');
    const initialCheck = await checkAndExpireSubscriptions();
    if (initialCheck.expiredCount > 0) {
      console.log(`⚠️ Found and processed ${initialCheck.expiredCount} expired subscriptions on startup`);
    }

    // تشغيل الخادم
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════╗
║         ICT AI Trader Server with VIP System      ║
╠════════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}                   ║
║  📊 Smart auto analysis at M5 candle close        ║
║  💎 VIP subscription system active                ║
║  🕐 Daily expiry check at 12:00 AM                ║
║  💾 Database initialized                           ║
╚════════════════════════════════════════════════════╝
      `);

      // ✅ التحليل التلقائي مفعّل
      console.log('✅ Auto analysis is ENABLED - AI will analyze every 5 minutes');
      scheduleNextAnalysis(); // مفعّل

      // ✅ بدء مراقبة الأحداث الاقتصادية
      const { startEconomicEventMonitoring } = require('./services/economicEventNotificationService');
      startEconomicEventMonitoring();
      console.log('✅ Economic event monitoring is ENABLED - Will notify 5 min before and at release');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ===================== Graceful Shutdown =====================
const gracefulShutdown = () => {
  console.log('🔄 Shutting down server...');
  if (autoAnalysisInterval) {
    clearTimeout(autoAnalysisInterval);
    console.log('⏹️ Auto analysis stopped');
  }

  // إيقاف مراقبة الأحداث الاقتصادية
  try {
    const { stopEconomicEventMonitoring } = require('./services/economicEventNotificationService');
    stopEconomicEventMonitoring();
    console.log('⏹️ Economic event monitoring stopped');
  } catch (error) {
    console.error('❌ Failed to stop economic event monitoring:', error);
  }
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
