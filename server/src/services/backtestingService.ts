// services/backtesting Service.ts
// المحرك الرئيسي لاختبار أداء AI على البيانات التاريخية

import { getCandles } from './oandaService';
import { renderDualCharts } from './chartService';
import { analyzeMultiTimeframe } from './aiService';
import {
    simulateMultipleTrades,
    calculateQuickStats,
    type Candle,
    type SuggestedTrade,
    type TradeOutcome
} from './tradeSimulator';
import { v4 as uuidv4 } from 'uuid';

export interface BacktestParams {
    symbol: string;                    // 'XAUUSD'
    startDate: Date;                   // تاريخ البداية
    endDate: Date;                     // تاريخ النهاية
    analysisInterval: number;          // كل كم ساعة نحلل (default: 4)
    useAI: boolean;                    // استخدام AI أو بيانات محفوظة (default: false)
    saveToDatabase: boolean;           // حفظ النتائج (default: true)
}

export interface BacktestAnalysis {
    id: string;
    timestamp: Date;
    currentPrice: number;
    decision: string;
    score: number;
    confidence: number;
    suggestedTrade?: SuggestedTrade;
    reasoning?: string;
    killzone?: string;
}

export interface BacktestResult {
    id: string;
    params: BacktestParams;
    executionTime: number;             // مدة التنفيذ بالثواني
    analyses: BacktestAnalysis[];
    trades: Array<{
        analysis: BacktestAnalysis;
        outcome: TradeOutcome;
    }>;
    statistics: {
        totalAnalyses: number;
        tradesGenerated: number;
        tradesExecuted: number;
        executionRate: number;
        winRate: number;
        avgProfit: number;
        totalProfit: number;
        avgDuration: number;
        outcomes: {
            TP1: number;
            TP2: number;
            TP3: number;
            SL: number;
            EXPIRED: number;
        };
        byScore?: Record<string, any>;
        byKillzone?: Record<string, any>;
    };
    createdAt: Date;
}

/**
 * تشغيل Backtesting على فترة محددة
 */
export async function runBacktest(params: BacktestParams): Promise<BacktestResult> {
    const startTime = Date.now();
    const backtestId = uuidv4();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🚀 بدء Backtesting');
    console.log(`📅 الفترة: ${params.startDate.toISOString()} - ${params.endDate.toISOString()}`);
    console.log(`📊 الرمز: ${params.symbol}`);
    console.log(`⏱️  التحليل كل: ${params.analysisInterval} ساعة`);
    console.log(`🤖 استخدام AI: ${params.useAI ? 'نعم' : 'لا (بيانات محفوظة فقط)'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        // الخطوة 1: جلب البيانات التاريخية
        console.log('📥 جلب البيانات التاريخية...');
        const h1Candles = await getHistoricalCandles(
            params.symbol,
            'H1',
            params.startDate,
            params.endDate
        );

        const m5Candles = await getHistoricalCandles(
            params.symbol,
            'M5',
            params.startDate,
            params.endDate
        );

        console.log(`   ✅ H1: ${h1Candles.length} شمعة`);
        console.log(`   ✅ M5: ${m5Candles.length} شمعة\n`);

        // الخطوة 2: تحديد نقاط التحليل
        const analysisPoints = generateAnalysisPoints(
            h1Candles,
            params.analysisInterval
        );

        console.log(`📍 نقاط التحليل: ${analysisPoints.length}\n`);

        // الخطوة 3: تشغيل التحليلات
        const analyses: BacktestAnalysis[] = [];

        for (let i = 0; i < analysisPoints.length; i++) {
            const point = analysisPoints[i];
            const progress = ((i + 1) / analysisPoints.length * 100).toFixed(1);

            console.log(`\n[${i + 1}/${analysisPoints.length}] (${progress}%) - ${new Date(point.time).toISOString()}`);

            try {
                const analysis = await performAnalysis(
                    point,
                    h1Candles,
                    m5Candles,
                    params.useAI
                );

                analyses.push(analysis);

                if (analysis.decision === 'PLACE_PENDING') {
                    console.log(`   ✅ صفقة مقترحة: ${analysis.suggestedTrade?.type} @ ${analysis.suggestedTrade?.entry}`);
                } else {
                    console.log(`   ⏭️  NO_TRADE`);
                }

            } catch (error) {
                console.error(`   ❌ خطأ في التحليل:`, error);
            }
        }

        console.log(`\n✅ اكتمل التحليل: ${analyses.length} تحليل\n`);

        // الخطوة 4: استخراج الصفقات
        const trades = analyses
            .filter(a => a.decision === 'PLACE_PENDING' && a.suggestedTrade)
            .map(a => ({
                trade: a.suggestedTrade!,
                entryTime: a.timestamp
            }));

        console.log(`💼 صفقات مقترحة: ${trades.length}\n`);

        // الخطوة 5: محاكاة الصفقات
        console.log('🎮 محاكاة تنفيذ الصفقات...');
        const allCandles = m5Candles; // نستخدم M5 للدقة
        const outcomes = simulateMultipleTrades(trades, allCandles);

        // دمج النتائج
        const tradesWithOutcomes = trades.map((t, i) => ({
            analysis: analyses.find(a => a.timestamp === t.entryTime)!,
            outcome: outcomes[i]
        }));

        // الخطوة 6: حساب الإحصائيات
        const quickStats = calculateQuickStats(outcomes);

        // Calculate additional stats not in quickStats
        const totalLoss = Math.abs(outcomes.filter(r => r.profitPips < 0).reduce((sum, r) => sum + r.profitPips, 0));
        const totalWin = outcomes.filter(r => r.profitPips > 0).reduce((sum, r) => sum + r.profitPips, 0);
        const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 999 : 0;

        const statistics = {
            totalAnalyses: analyses.length,
            tradesGenerated: trades.length,
            tradesExecuted: quickStats.executed,
            executionRate: quickStats.executionRate || 0,
            winRate: quickStats.winRate || 0,
            avgProfit: quickStats.avgProfit || 0,
            totalProfit: quickStats.totalProfit || 0,
            profitFactor,
            avgDuration: quickStats.avgDuration || 0,
            outcomes: quickStats.outcomes || { TP1: 0, TP2: 0, TP3: 0, SL: 0, EXPIRED: 0 },
            byScore: calculateStatsByScore(tradesWithOutcomes),
            byKillzone: calculateStatsByKillzone(tradesWithOutcomes)
        };

        const result: BacktestResult = {
            id: backtestId,
            params,
            executionTime: (Date.now() - startTime) / 1000,
            analyses,
            trades: tradesWithOutcomes,
            statistics,
            createdAt: new Date()
        };

        // طباعة النتائج
        printResults(result);

        // حفظ في قاعدة البيانات (اختياري)
        if (params.saveToDatabase) {
            await saveBacktestResults(result);
        }

        return result;

    } catch (error) {
        console.error('\n❌ خطأ في Backtesting:', error);
        throw error;
    }
}

/**
 * جلب بيانات تاريخية من OANDA
 */
async function getHistoricalCandles(
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date
): Promise<Candle[]> {
    // حساب عدد الشموع المطلوبة
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let candleCount: number;
    if (timeframe === 'H1') {
        candleCount = Math.ceil(diffHours);
    } else if (timeframe === 'M5') {
        candleCount = Math.ceil(diffHours * 12); // 12 شمعة M5 في الساعة
    } else {
        throw new Error(`Unsupported timeframe: ${timeframe}`);
    }

    // OANDA يحد من 5000 شمعة في طلب واحد
    const maxCount = 5000;
    if (candleCount > maxCount) {
        // نحتاج لعدة طلبات
        const batches = Math.ceil(candleCount / maxCount);
        const allCandles: Candle[] = [];

        for (let i = 0; i < batches; i++) {
            const count = Math.min(maxCount, candleCount - (i * maxCount));
            const candles = await getCandles(symbol, timeframe, count);
            allCandles.push(...candles);
        }

        return allCandles;
    }

    return await getCandles(symbol, timeframe, candleCount);
}

/**
 * توليد نقاط التحليل بناءً على الفاصل الزمني
 */
function generateAnalysisPoints(
    h1Candles: Candle[],
    intervalHours: number
): Array<{ time: string; index: number }> {
    const points: Array<{ time: string; index: number }> = [];

    for (let i = 100; i < h1Candles.length; i += intervalHours) {
        points.push({
            time: h1Candles[i].time,
            index: i
        });
    }

    return points;
}

/**
 * تنفيذ تحليل واحد
 */
async function performAnalysis(
    point: { time: string; index: number },
    h1Candles: Candle[],
    m5Candles: Candle[],
    useAI: boolean
): Promise<BacktestAnalysis> {
    const currentCandle = h1Candles[point.index];
    const currentPrice = currentCandle.close;

    // استخراج آخر 100 شمعة H1
    const h1Slice = h1Candles.slice(Math.max(0, point.index - 100), point.index);

    // إيجاد index المقابل في M5
    const m5Index = m5Candles.findIndex(c => c.time === point.time);
    const m5Slice = m5Candles.slice(Math.max(0, m5Index - 220), m5Index);

    if (useAI) {
        // استخدام AI للتحليل (أبطأ ولكن واقعي)
        const charts = await renderDualCharts(h1Slice, m5Slice, currentPrice, 100, 220);
        const h1Image = charts.h1Image || charts;
        const m5Image = charts.m5Image || h1Image;

        const analysis = await analyzeMultiTimeframe(
            h1Image as string,
            m5Image as string,
            currentPrice,
            h1Slice,
            m5Slice
        );

        return {
            id: uuidv4(),
            timestamp: new Date(point.time),
            currentPrice,
            decision: analysis.decision,
            score: analysis.score || 0,
            confidence: analysis.confidence || 0,
            suggestedTrade: analysis.suggestedTrade as any,
            reasoning: analysis.reasoning,
            killzone: analysis.killzoneInfo?.session
        };
    } else {
        // استخدام منطق مبسط بدون AI (أسرع للاختبار)
        // يمكن تطوير هذا لاحقاً
        return {
            id: uuidv4(),
            timestamp: new Date(point.time),
            currentPrice,
            decision: 'NO_TRADE',
            score: 0,
            confidence: 0
        };
    }
}

/**
 * حساب إحصائيات حسب Score
 */
function calculateStatsByScore(trades: Array<{ analysis: BacktestAnalysis; outcome: TradeOutcome }>) {
    const ranges = {
        '5-6': [] as TradeOutcome[],
        '6-7': [] as TradeOutcome[],
        '7-8': [] as TradeOutcome[],
        '8-9': [] as TradeOutcome[],
        '9-10': [] as TradeOutcome[]
    };

    trades.forEach(({ analysis, outcome }) => {
        const score = analysis.score || 0;
        if (score >= 5 && score < 6) ranges['5-6'].push(outcome);
        else if (score >= 6 && score < 7) ranges['6-7'].push(outcome);
        else if (score >= 7 && score < 8) ranges['7-8'].push(outcome);
        else if (score >= 8 && score < 9) ranges['8-9'].push(outcome);
        else if (score >= 9) ranges['9-10'].push(outcome);
    });

    const result: Record<string, any> = {};
    Object.entries(ranges).forEach(([range, outcomes]) => {
        if (outcomes.length > 0) {
            result[range] = calculateQuickStats(outcomes);
        }
    });

    return result;
}

/**
 * حساب إحصائيات حسب Killzone
 */
function calculateStatsByKillzone(trades: Array<{ analysis: BacktestAnalysis; outcome: TradeOutcome }>) {
    const zones: Record<string, TradeOutcome[]> = {
        'London': [],
        'NewYork': [],
        'Asian': [],
        'Other': []
    };

    trades.forEach(({ analysis, outcome }) => {
        const zone = analysis.killzone || 'Other';
        if (!zones[zone]) zones[zone] = [];
        zones[zone].push(outcome);
    });

    const result: Record<string, any> = {};
    Object.entries(zones).forEach(([zone, outcomes]) => {
        if (outcomes.length > 0) {
            result[zone] = calculateQuickStats(outcomes);
        }
    });

    return result;
}

/**
 * طباعة النتائج
 */
function printResults(result: BacktestResult) {
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('📊 نتائج Backtesting');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n⏱️  وقت التنفيذ: ${result.executionTime.toFixed(2)} ثانية`);
    console.log(`\n📈 الإحصائيات العامة:`);
    console.log(`   - إجمالي التحليلات: ${result.statistics.totalAnalyses}`);
    console.log(`   - صفقات مقترحة: ${result.statistics.tradesGenerated}`);
    console.log(`   - صفقات مُنفذة: ${result.statistics.tradesExecuted}`);
    console.log(`   - معدل التنفيذ: ${result.statistics.executionRate.toFixed(1)}%`);
    console.log(`\n💰 الأداء:`);
    console.log(`   - نسبة النجاح: ${result.statistics.winRate.toFixed(1)}%`);
    console.log(`   - إجمالي الربح: ${result.statistics.totalProfit.toFixed(1)} نقطة`);
    console.log(`   - متوسط الربح: ${result.statistics.avgProfit.toFixed(1)} نقطة`);
    console.log(`   - متوسط المدة: ${result.statistics.avgDuration.toFixed(1)} ساعة`);
    console.log(`\n🎯 النتائج:`);
    console.log(`   - TP1: ${result.statistics.outcomes.TP1} (${((result.statistics.outcomes.TP1 / result.statistics.tradesExecuted) * 100).toFixed(1)}%)`);
    console.log(`   - TP2: ${result.statistics.outcomes.TP2} (${((result.statistics.outcomes.TP2 / result.statistics.tradesExecuted) * 100).toFixed(1)}%)`);
    console.log(`   - TP3: ${result.statistics.outcomes.TP3} (${((result.statistics.outcomes.TP3 / result.statistics.tradesExecuted) * 100).toFixed(1)}%)`);
    console.log(`   - SL: ${result.statistics.outcomes.SL} (${((result.statistics.outcomes.SL / result.statistics.tradesExecuted) * 100).toFixed(1)}%)`);
    console.log(`   - EXPIRED: ${result.statistics.outcomes.EXPIRED}`);
    console.log('\n═══════════════════════════════════════════════════════════════\n');
}

/**
 * حفظ النتائج في قاعدة البيانات
 */
async function saveBacktestResults(result: BacktestResult): Promise<void> {
    try {
        console.log(`💾 Saving backtest results... (ID: ${result.id})`);

        // Import query function dynamically or from top level if available
        // Assuming we can import it at the top, but let's check if we need to add import
        // For now, let's assume we need to import it. Since this is a service file, 
        // it might be better to pass the db adapter or import it.
        // Let's rely on a dynamic import or assuming 'query' is available if I added it detailed below.

        // Actually, let's look at the file imports. I need to add `import { query } from '../db/postgresAdapter';` at the top.
        // But here I am replacing the function. I will write the implementation assuming `query` is imported.
        // I will add the import in a separate step or assume I can add it here if I replace the whole file or use multi_replace.

        // Let's write the code assuming `query` is available. I will add the import in the next tool call.

        const { query } = require('../db/postgresAdapter');

        // 1. Save main result
        await query(
            `INSERT INTO backtest_results (
                id, symbol, start_date, end_date, analysis_interval,
                total_analyses, trades_generated, trades_executed,
                win_rate, profit_factor, total_profit_pips,
                metrics, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
            [
                result.id,
                result.params.symbol,
                result.params.startDate,
                result.params.endDate,
                result.params.analysisInterval,
                result.statistics.totalAnalyses,
                result.statistics.tradesGenerated,
                result.statistics.tradesExecuted,
                result.statistics.winRate,
                result.statistics.profitFactor,
                result.statistics.totalProfit,
                JSON.stringify(result.statistics)
            ]
        );

        // 2. Save individual trades (batch insert for performance)
        if (result.trades.length > 0) {
            const trades = result.trades;
            // Split into chunks if too many trades
            const chunkSize = 50;

            for (let i = 0; i < trades.length; i += chunkSize) {
                const chunk = trades.slice(i, i + chunkSize);

                // Construct values string
                const placeholders: string[] = [];
                const values: any[] = [];
                let paramIndex = 1;

                chunk.forEach(t => {
                    placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12})`);

                    values.push(
                        uuidv4(), // id
                        result.id, // backtest_id
                        t.analysis.timestamp, // entry_time
                        t.analysis.suggestedTrade?.type, // trade_type
                        t.analysis.suggestedTrade?.entry, // entry_price
                        t.analysis.suggestedTrade?.sl, // sl
                        t.analysis.suggestedTrade?.tp1, // tp1
                        t.analysis.suggestedTrade?.tp2, // tp2
                        t.analysis.suggestedTrade?.tp3, // tp3
                        t.outcome.outcome, // outcome
                        t.outcome.profitPips, // profit_pips
                        t.outcome.durationHours, // duration_hours
                        JSON.stringify(t.analysis) // analysis_data
                    );

                    paramIndex += 13;
                });

                const queryText = `
                    INSERT INTO backtest_trades (
                        id, backtest_id, entry_time, trade_type, entry_price, 
                        sl, tp1, tp2, tp3, outcome, profit_pips, duration_hours, analysis_data
                    ) VALUES ${placeholders.join(', ')}
                `;

                await query(queryText, values);
            }
        }

        console.log('✅ Results saved to database successfully');

    } catch (error) {
        console.error('❌ Failed to save backtest results:', error);
        // Don't throw, just log error so we don't fail the response
    }
}

export default {
    runBacktest
};
