// routes/backtesting.ts
// API Endpoints لنظام Backtesting

import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { runBacktest, BacktestParams } from '../services/backtestingService';
import { analyzePerformance, generateMarkdownReport } from '../services/performanceAnalyzer';

const router = express.Router();

/**
 * POST /api/backtesting/run
 * تشغيل backtesting جديد
 */
router.post('/run', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const {
            symbol = 'XAUUSD',
            startDate,
            endDate,
            analysisInterval = 4,
            useAI = false,
            saveToDatabase = false
        } = req.body;

        // التحقق من المدخلات
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate و endDate مطلوبان'
            });
        }

        const params: BacktestParams = {
            symbol,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            analysisInterval: parseInt(analysisInterval),
            useAI: Boolean(useAI),
            saveToDatabase: Boolean(saveToDatabase)
        };

        console.log(`🚀 بدء Backtesting للمستخدم: ${req.userId}`);

        // تشغيل الـ Backtesting
        const result = await runBacktest(params);

        // حساب المقاييس المتقدمة
        const metrics = analyzePerformance(result);

        res.json({
            success: true,
            result: {
                id: result.id,
                params: result.params,
                executionTime: result.executionTime,
                statistics: result.statistics,
                metrics,
                totalAnalyses: result.analyses.length,
                totalTrades: result.trades.length,
                createdAt: result.createdAt
            }
        });

    } catch (error) {
        console.error('❌ خطأ في Backtesting:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في تشغيل Backtesting',
            details: (error as Error).message
        });
    }
});

/**
 * POST /api/backtesting/quick-test
 * اختبار سريع على فترة قصيرة (أسبوع واحد)
 */
router.post('/quick-test', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { symbol = 'XAUUSD', useAI = false } = req.body;

        // اختبار على آخر 7 أيام
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const params: BacktestParams = {
            symbol,
            startDate,
            endDate,
            analysisInterval: 6, // كل 6 ساعات
            useAI: Boolean(useAI),
            saveToDatabase: false
        };

        console.log(`⚡ اختبار سريع للمستخدم: ${req.userId}`);

        const result = await runBacktest(params);
        const metrics = analyzePerformance(result);

        res.json({
            success: true,
            result: {
                id: result.id,
                statistics: result.statistics,
                metrics,
                executionTime: result.executionTime
            }
        });

    } catch (error) {
        console.error('❌ خطأ في الاختبار السريع:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في الاختبار السريع',
            details: (error as Error).message
        });
    }
});

/**
 * POST /api/backtesting/report
 * إنشاء تقرير مفصل من نتائج موجودة
 */
router.post('/report', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { backtestResult, format = 'markdown' } = req.body;

        if (!backtestResult) {
            return res.status(400).json({
                success: false,
                error: 'backtestResult مطلوب'
            });
        }

        const metrics = analyzePerformance(backtestResult);

        let report;
        if (format === 'markdown') {
            report = generateMarkdownReport(metrics, backtestResult);
        } else {
            report = { metrics, result: backtestResult };
        }

        res.json({
            success: true,
            report,
            format
        });

    } catch (error) {
        console.error('❌ خطأ في إنشاء التقرير:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في إنشاء التقرير',
            details: (error as Error).message
        });
    }
});

/**
 * GET /api/backtesting/stats-summary
 * ملخص إحصائيات سريع (للواجهة)
 */
router.get('/stats-summary', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        // TODO: جلب من قاعدة البيانات عند تنفيذ الحفظ

        res.json({
            success: true,
            summary: {
                totalRuns: 0,
                lastRun: null,
                avgWinRate: 0,
                message: 'لم يتم تشغيل أي backtesting بعد. استخدم POST /run أو /quick-test'
            }
        });

    } catch (error) {
        console.error('❌ خطأ في جلب الملخص:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في جلب الملخص'
        });
    }
});

/**
 * POST /api/backtesting/demo
 * تشغيل تجريبي بدون AI (سريع)
 */
router.post('/demo', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        // اختبار تجريبي على 3 أيام بدون AI
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 3);

        const params: BacktestParams = {
            symbol: 'XAUUSD',
            startDate,
            endDate,
            analysisInterval: 12, // كل 12 ساعة
            useAI: false,
            saveToDatabase: false
        };

        console.log(`🎮 تجريبي للمستخدم: ${req.userId}`);

        const result = await runBacktest(params);

        res.json({
            success: true,
            message: 'تم تشغيل Backtesting تجريبي (بدون AI)',
            result: {
                totalAnalyses: result.analyses.length,
                executionTime: result.executionTime,
                note: 'للحصول على نتائج واقعية، استخدم useAI: true'
            }
        });

    } catch (error) {
        console.error('❌ خطأ في التشغيل التجريبي:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في التشغيل التجريبي',
            details: (error as Error).message
        });
    }
});

export default router;
