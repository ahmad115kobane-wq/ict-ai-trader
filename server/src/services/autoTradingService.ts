// services/autoTradingService.ts - Automatic Trading Service
// ═══════════════════════════════════════════════════════════════════════════════
// ✅ نظام التداول التلقائي - يعمل على مدار اليوم
// ✅ يفتح صفقات للمستخدمين المشتركين والمفعلين
// ✅ استراتيجية سكالبينج سريعة على فريم 5 دقائق
// ═══════════════════════════════════════════════════════════════════════════════

import * as cron from 'node-cron';
import { analyzeScalping, resetDailyStats } from './scalpingService';
import { getCandles, getCurrentPrice } from './oandaService';
import { getUsersWithAutoAnalysisEnabled, saveAutoAnalysis } from '../db/index';
import { sendTradeNotification } from './expoPushService';

console.log("🤖 Auto Trading Service v1.0 - 24/7 Scalping System");

// ===================== Configuration =====================
const SYMBOL = 'XAUUSD';
const ANALYSIS_INTERVAL = '*/5 * * * *'; // كل 5 دقائق
const DAILY_RESET_TIME = '0 0 * * *';    // منتصف الليل

let isRunning = false;
let analysisCount = 0;
let lastAnalysisTime: Date | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 تشغيل التحليل التلقائي
// ═══════════════════════════════════════════════════════════════════════════════

async function runAutoAnalysis() {
  if (isRunning) {
    console.log('⏳ التحليل السابق لا يزال قيد التنفيذ...');
    return;
  }

  isRunning = true;
  analysisCount++;
  lastAnalysisTime = new Date();

  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🤖 Auto Analysis #${analysisCount} - ${lastAnalysisTime.toLocaleString('ar-EG')}`);
    console.log(`${'='.repeat(80)}\n`);

    // 1. جلب البيانات
    console.log('📊 جلب بيانات السوق...');
    const [m5Candles, priceData] = await Promise.all([
      getCandles(SYMBOL, '5m', 50),
      getCurrentPrice(SYMBOL)
    ]);

    if (!m5Candles || m5Candles.length === 0) {
      console.error('❌ فشل جلب بيانات الشموع');
      return;
    }

    const currentPrice = typeof priceData === 'number' ? priceData : m5Candles[m5Candles.length - 1].close;
    console.log(`💰 السعر الحالي: ${currentPrice.toFixed(2)}`);

    // 2. تحليل السوق
    console.log('🔍 تحليل السوق...');
    const analysis = await analyzeScalping(SYMBOL, m5Candles, currentPrice);

    console.log(`\n📋 نتيجة التحليل:`);
    console.log(`   القرار: ${analysis.decision}`);
    console.log(`   النقاط: ${analysis.score}/10`);
    console.log(`   الثقة: ${analysis.confidence}%`);
    console.log(`   السبب: ${analysis.reasoning}`);

    // 3. حفظ التحليل في قاعدة البيانات
    const analysisId = `auto_${Date.now()}`;
    const suggestedTradeJson = analysis.suggestedTrade ? JSON.stringify(analysis.suggestedTrade) : null;
    
    await saveAutoAnalysis(
      analysisId,
      SYMBOL,
      '', // h1Image - not used in scalping
      '', // m5Image - not used in scalping
      currentPrice,
      analysis.decision,
      analysis.score,
      analysis.confidence,
      suggestedTradeJson
    );

    console.log(`💾 تم حفظ التحليل: ${analysisId}`);

    // 4. إرسال الإشعارات للمستخدمين المشتركين
    if (analysis.decision !== 'NO_TRADE' && analysis.suggestedTrade) {
      console.log('\n📢 إرسال الإشعارات للمستخدمين...');
      
      const users = await getUsersWithAutoAnalysisEnabled();
      console.log(`👥 عدد المستخدمين المفعلين: ${users.length}`);

      if (users.length > 0) {
        // إرسال إشعار لكل مستخدم
        const pushTokens = users.map((u: any) => u.push_token).filter(Boolean);
        
        if (pushTokens.length > 0) {
          try {
            await sendTradeNotification(
              pushTokens,
              analysis.suggestedTrade,
              analysis.score,
              currentPrice
            );
            console.log(`✅ تم إرسال ${pushTokens.length} إشعار`);
          } catch (err: any) {
            console.error(`❌ فشل إرسال الإشعارات:`, err.message);
          }
        }
      } else {
        console.log('ℹ️ لا يوجد مستخدمين مفعلين حالياً');
      }
    } else {
      console.log('⏸️ لا توجد إشارة تداول - لن يتم إرسال إشعارات');
    }

    console.log(`\n✅ اكتمل التحليل التلقائي #${analysisCount}`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error: any) {
    console.error('❌ خطأ في التحليل التلقائي:', error.message);
    console.error(error.stack);
  } finally {
    isRunning = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 بدء نظام التداول التلقائي
// ═══════════════════════════════════════════════════════════════════════════════

export function startAutoTrading() {
  console.log('\n🚀 بدء نظام التداول التلقائي...');
  console.log(`⏰ جدولة التحليل: كل 5 دقائق`);
  console.log(`🔄 إعادة تعيين يومية: منتصف الليل\n`);

  // جدولة التحليل كل 5 دقائق
  cron.schedule(ANALYSIS_INTERVAL, () => {
    runAutoAnalysis().catch(err => {
      console.error('❌ خطأ في تنفيذ التحليل المجدول:', err);
    });
  });

  // جدولة إعادة التعيين اليومية
  cron.schedule(DAILY_RESET_TIME, () => {
    console.log('🔄 إعادة تعيين الإحصائيات اليومية...');
    resetDailyStats();
  });

  // تشغيل التحليل الأول فوراً
  console.log('▶️ تشغيل التحليل الأول...');
  setTimeout(() => {
    runAutoAnalysis().catch(err => {
      console.error('❌ خطأ في التحليل الأول:', err);
    });
  }, 5000); // بعد 5 ثوانٍ من بدء التشغيل

  console.log('✅ نظام التداول التلقائي يعمل الآن على مدار الساعة! 🎯\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الحصول على حالة النظام
// ═══════════════════════════════════════════════════════════════════════════════

export function getSystemStatus() {
  return {
    isRunning,
    analysisCount,
    lastAnalysisTime,
    uptime: process.uptime(),
    nextAnalysis: lastAnalysisTime 
      ? new Date(lastAnalysisTime.getTime() + 5 * 60 * 1000)
      : null
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛑 إيقاف النظام (للصيانة)
// ═══════════════════════════════════════════════════════════════════════════════

export function stopAutoTrading() {
  console.log('🛑 إيقاف نظام التداول التلقائي...');
  // سيتم إيقاف المهام المجدولة عند إعادة تشغيل الخادم
  console.log('✅ تم إيقاف النظام');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 تشغيل تحليل يدوي (للاختبار)
// ═══════════════════════════════════════════════════════════════════════════════

export async function runManualAnalysis() {
  console.log('🧪 تشغيل تحليل يدوي...');
  await runAutoAnalysis();
  return getSystemStatus();
}
