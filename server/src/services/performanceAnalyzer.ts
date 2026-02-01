// services/performanceAnalyzer.ts
// تحليل شامل لأداء نظام التداول

import { TradeOutcome } from './tradeSimulator';
import { BacktestAnalysis, BacktestResult } from './backtestingService';

export interface PerformanceMetrics {
    // إحصائيات عامة
    totalAnalyses: number;
    tradesGenerated: number;
    tradesExecuted: number;
    executionRate: number;

    // نسب النجاح
    winRate: number;                      // نسبة الصفقات الرابحة
    lossRate: number;                     // نسبة الصفقات الخاسرة
    profitFactor: number;                 // إجمالي الأرباح / إجمالي الخسائر
    avgRR: number;                        // متوسط Risk/Reward
    sharpeRatio: number;                  // Sharpe Ratio (للأداء المعدل بالمخاطر)

    // التفاصيل المالية
    totalProfitPips: number;
    totalLossPips: number;
    netProfitPips: number;
    avgWinPips: number;
    avgLossPips: number;
    largestWin: number;
    largestLoss: number;

    // معدلات الهدف
    tp1HitRate: number;
    tp2HitRate: number;
    tp3HitRate: number;
    slHitRate: number;
    expiredRate: number;

    // التوزيع
    wins: number;
    losses: number;
    breakeven: number;

    // الوقت
    avgTradeDuration: number;
    longestTrade: number;
    shortestTrade: number;

    // حسب الفئات
    byKillzone: Record<string, KillzoneStats>;
    byDirection: Record<string, DirectionStats>;
    byScoreRange: Record<string, ScoreStats>;
    byConfidenceRange: Record<string, ConfidenceStats>;

    // سلسلة الانتصارات/الخسائر
    longestWinStreak: number;
    longestLossStreak: number;
    currentStreak: { type: 'win' | 'loss'; count: number };

    // الرسم البياني (للمستقبل)
    equityCurve?: Array<{ time: string; equity: number }>;
    drawdownCurve?: Array<{ time: string; drawdown: number }>;
}

export interface KillzoneStats {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
}

export interface DirectionStats {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
}

export interface ScoreStats {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
    avgScore: number;
}

export interface ConfidenceStats {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
    avgConfidence: number;
}

/**
 * تحليل شامل للأداء
 */
export function analyzePerformance(
    backtest: BacktestResult
): PerformanceMetrics {
    const executedTrades = backtest.trades.filter(t => t.outcome.executed);
    const total = executedTrades.length;

    if (total === 0) {
        return createEmptyMetrics();
    }

    const wins = executedTrades.filter(t => t.outcome.profitPips > 0);
    const losses = executedTrades.filter(t => t.outcome.profitPips < 0);
    const breakeven = executedTrades.filter(t => t.outcome.profitPips === 0);

    // حسابات أساسية
    const totalProfitPips = wins.reduce((sum, t) => sum + t.outcome.profitPips, 0);
    const totalLossPips = Math.abs(losses.reduce((sum, t) => sum + t.outcome.profitPips, 0));
    const netProfitPips = totalProfitPips - totalLossPips;

    const avgWinPips = wins.length > 0 ? totalProfitPips / wins.length : 0;
    const avgLossPips = losses.length > 0 ? totalLossPips / losses.length : 0;

    const profitFactor = totalLossPips > 0 ? totalProfitPips / totalLossPips : totalProfitPips > 0 ? 999 : 0;

    // معدلات الأهداف
    const tp1Hits = executedTrades.filter(t => t.outcome.outcome === 'TP1').length;
    const tp2Hits = executedTrades.filter(t => t.outcome.outcome === 'TP2').length;
    const tp3Hits = executedTrades.filter(t => t.outcome.outcome === 'TP3').length;
    const slHits = executedTrades.filter(t => t.outcome.outcome === 'SL').length;
    const expired = executedTrades.filter(t => t.outcome.outcome === 'EXPIRED').length;

    // الوقت
    const durations = executedTrades.map(t => t.outcome.durationHours);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / total;
    const longestTrade = Math.max(...durations);
    const shortestTrade = Math.min(...durations);

    // أكبر ربح/خسارة
    const allProfits = executedTrades.map(t => t.outcome.profitPips);
    const largestWin = Math.max(...allProfits, 0);
    const largestLoss = Math.min(...allProfits, 0);

    // حساب Sharpe Ratio (مبسط)
    const returns = executedTrades.map(t => t.outcome.profitPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / total;
    const stdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / total
    );
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // حساب Streaks
    const streaks = calculateStreaks(executedTrades);

    return {
        totalAnalyses: backtest.statistics.totalAnalyses,
        tradesGenerated: backtest.statistics.tradesGenerated,
        tradesExecuted: total,
        executionRate: (total / backtest.statistics.tradesGenerated) * 100,

        winRate: (wins.length / total) * 100,
        lossRate: (losses.length / total) * 100,
        profitFactor,
        avgRR: avgLossPips > 0 ? avgWinPips / avgLossPips : avgWinPips > 0 ? 999 : 0,
        sharpeRatio,

        totalProfitPips,
        totalLossPips,
        netProfitPips,
        avgWinPips,
        avgLossPips,
        largestWin,
        largestLoss,

        tp1HitRate: (tp1Hits / total) * 100,
        tp2HitRate: (tp2Hits / total) * 100,
        tp3HitRate: (tp3Hits / total) * 100,
        slHitRate: (slHits / total) * 100,
        expiredRate: (expired / total) * 100,

        wins: wins.length,
        losses: losses.length,
        breakeven: breakeven.length,

        avgTradeDuration: avgDuration,
        longestTrade,
        shortestTrade,

        byKillzone: analyzeByKillzone(executedTrades),
        byDirection: analyzeByDirection(executedTrades),
        byScoreRange: analyzeByScoreRange(executedTrades),
        byConfidenceRange: analyzeByConfidenceRange(executedTrades),

        ...streaks
    };
}

/**
 * تحليل حسب Killzone
 */
function analyzeByKillzone(
    trades: Array<{ analysis: BacktestAnalysis; outcome: TradeOutcome }>
): Record<string, KillzoneStats> {
    const groups: Record<string, TradeOutcome[]> = {};

    trades.forEach(({ analysis, outcome }) => {
        const zone = analysis.killzone || 'Unknown';
        if (!groups[zone]) groups[zone] = [];
        groups[zone].push(outcome);
    });

    const result: Record<string, KillzoneStats> = {};

    Object.entries(groups).forEach(([zone, outcomes]) => {
        const wins = outcomes.filter(o => o.profitPips > 0);
        const total = outcomes.length;
        const totalProfit = outcomes.reduce((sum, o) => sum + o.profitPips, 0);

        result[zone] = {
            total,
            wins: wins.length,
            losses: total - wins.length,
            winRate: (wins.length / total) * 100,
            totalProfit,
            avgProfit: totalProfit / total
        };
    });

    return result;
}

/**
 * تحليل حسب الاتجاه
 */
function analyzeByDirection(
    trades: Array<{ analysis: BacktestAnalysis; outcome: TradeOutcome }>
): Record<string, DirectionStats> {
    const groups: Record<string, TradeOutcome[]> = { BUY: [], SELL: [] };

    trades.forEach(({ analysis, outcome }) => {
        const direction = analysis.suggestedTrade?.type.includes('BUY') ? 'BUY' : 'SELL';
        groups[direction].push(outcome);
    });

    const result: Record<string, DirectionStats> = {};

    Object.entries(groups).forEach(([dir, outcomes]) => {
        if (outcomes.length === 0) return;

        const wins = outcomes.filter(o => o.profitPips > 0);
        const total = outcomes.length;
        const totalProfit = outcomes.reduce((sum, o) => sum + o.profitPips, 0);

        result[dir] = {
            total,
            wins: wins.length,
            losses: total - wins.length,
            winRate: (wins.length / total) * 100,
            totalProfit,
            avgProfit: totalProfit / total
        };
    });

    return result;
}

/**
 * تحليل حسب Score
 */
function analyzeByScoreRange(
    trades: Array<{ analysis: BacktestAnalysis; outcome: TradeOutcome }>
): Record<string, ScoreStats> {
    const ranges: Record<string, Array<{ outcome: TradeOutcome; score: number }>> = {
        '5-6': [],
        '6-7': [],
        '7-8': [],
        '8-9': [],
        '9-10': []
    };

    trades.forEach(({ analysis, outcome }) => {
        const score = analysis.score || 0;
        if (score >= 5 && score < 6) ranges['5-6'].push({ outcome, score });
        else if (score >= 6 && score < 7) ranges['6-7'].push({ outcome, score });
        else if (score >= 7 && score < 8) ranges['7-8'].push({ outcome, score });
        else if (score >= 8 && score < 9) ranges['8-9'].push({ outcome, score });
        else if (score >= 9) ranges['9-10'].push({ outcome, score });
    });

    const result: Record<string, ScoreStats> = {};

    Object.entries(ranges).forEach(([range, items]) => {
        if (items.length === 0) return;

        const outcomes = items.map(i => i.outcome);
        const scores = items.map(i => i.score);
        const wins = outcomes.filter(o => o.profitPips > 0);
        const total = outcomes.length;
        const totalProfit = outcomes.reduce((sum, o) => sum + o.profitPips, 0);
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / total;

        result[range] = {
            total,
            wins: wins.length,
            losses: total - wins.length,
            winRate: (wins.length / total) * 100,
            totalProfit,
            avgProfit: totalProfit / total,
            avgScore
        };
    });

    return result;
}

/**
 * تحليل حسب Confidence
 */
function analyzeByConfidenceRange(
    trades: Array<{ analysis: BacktestAnalysis; outcome: TradeOutcome }>
): Record<string, ConfidenceStats> {
    const ranges: Record<string, Array<{ outcome: TradeOutcome; confidence: number }>> = {
        '50-60': [],
        '60-70': [],
        '70-80': [],
        '80-90': [],
        '90-100': []
    };

    trades.forEach(({ analysis, outcome }) => {
        const conf = analysis.confidence || 0;
        if (conf >= 50 && conf < 60) ranges['50-60'].push({ outcome, confidence: conf });
        else if (conf >= 60 && conf < 70) ranges['60-70'].push({ outcome, confidence: conf });
        else if (conf >= 70 && conf < 80) ranges['70-80'].push({ outcome, confidence: conf });
        else if (conf >= 80 && conf < 90) ranges['80-90'].push({ outcome, confidence: conf });
        else if (conf >= 90) ranges['90-100'].push({ outcome, confidence: conf });
    });

    const result: Record<string, ConfidenceStats> = {};

    Object.entries(ranges).forEach(([range, items]) => {
        if (items.length === 0) return;

        const outcomes = items.map(i => i.outcome);
        const confidences = items.map(i => i.confidence);
        const wins = outcomes.filter(o => o.profitPips > 0);
        const total = outcomes.length;
        const totalProfit = outcomes.reduce((sum, o) => sum + o.profitPips, 0);
        const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / total;

        result[range] = {
            total,
            wins: wins.length,
            losses: total - wins.length,
            winRate: (wins.length / total) * 100,
            totalProfit,
            avgProfit: totalProfit / total,
            avgConfidence
        };
    });

    return result;
}

/**
 * حساب سلاسل الانتصارات/الخسائر
 */
function calculateStreaks(
    trades: Array<{ outcome: TradeOutcome }>
): {
    longestWinStreak: number;
    longestLossStreak: number;
    currentStreak: { type: 'win' | 'loss'; count: number };
} {
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    trades.forEach(({ outcome }) => {
        if (outcome.profitPips > 0) {
            currentWinStreak++;
            currentLossStreak = 0;
            longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
        } else if (outcome.profitPips < 0) {
            currentLossStreak++;
            currentWinStreak = 0;
            longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
        }
    });

    return {
        longestWinStreak,
        longestLossStreak,
        currentStreak: currentWinStreak > 0
            ? { type: 'win', count: currentWinStreak }
            : { type: 'loss', count: currentLossStreak }
    };
}

/**
 * إنشاء metrics فارغة
 */
function createEmptyMetrics(): PerformanceMetrics {
    return {
        totalAnalyses: 0,
        tradesGenerated: 0,
        tradesExecuted: 0,
        executionRate: 0,
        winRate: 0,
        lossRate: 0,
        profitFactor: 0,
        avgRR: 0,
        sharpeRatio: 0,
        totalProfitPips: 0,
        totalLossPips: 0,
        netProfitPips: 0,
        avgWinPips: 0,
        avgLossPips: 0,
        largestWin: 0,
        largestLoss: 0,
        tp1HitRate: 0,
        tp2HitRate: 0,
        tp3HitRate: 0,
        slHitRate: 0,
        expiredRate: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
        avgTradeDuration: 0,
        longestTrade: 0,
        shortestTrade: 0,
        byKillzone: {},
        byDirection: {},
        byScoreRange: {},
        byConfidenceRange: {},
        longestWinStreak: 0,
        longestLossStreak: 0,
        currentStreak: { type: 'win', count: 0 }
    };
}

/**
 * توليد تقرير بصيغة Markdown
 */
export function generateMarkdownReport(metrics: PerformanceMetrics, backtest: BacktestResult): string {
    return `
# 📊 Backtesting Report

**Period:** ${backtest.params.startDate.toISOString().split('T')[0]} to ${backtest.params.endDate.toISOString().split('T')[0]}  
**Symbol:** ${backtest.params.symbol}  
**Analysis Interval:** Every ${backtest.params.analysisInterval} hours  
**Execution Time:** ${backtest.executionTime.toFixed(2)}s

---

## 📈 Summary

-**Total Analyses:** ${metrics.totalAnalyses}  
- **Trades Generated:** ${metrics.tradesGenerated}  
- **Trades Executed:** ${metrics.tradesExecuted} (${metrics.executionRate.toFixed(1)}%)

### Performance
- **Win Rate:** ${metrics.winRate.toFixed(1)}%  
- **Profit Factor:** ${metrics.profitFactor.toFixed(2)}  
- **Net Profit:** ${metrics.netProfitPips > 0 ? '+' : ''}${metrics.netProfitPips.toFixed(1)} pips  
- **Average Profit per Trade:** ${metrics.avgWinPips > 0 || metrics.avgLossPips > 0 ? ((metrics.totalProfitPips - metrics.totalLossPips) / metrics.tradesExecuted).toFixed(1) : '0'} pips  
- **Sharpe Ratio:** ${metrics.sharpeRatio.toFixed(2)}

---

## 🎯 Outcomes

| Outcome | Count | Percentage |
|---------|-------|------------|
| TP1 | ${backtest.statistics.outcomes.TP1} | ${metrics.tp1HitRate.toFixed(1)}% |
| TP2 | ${backtest.statistics.outcomes.TP2} | ${metrics.tp2HitRate.toFixed(1)}% |
| TP3 | ${backtest.statistics.outcomes.TP3} | ${metrics.tp3HitRate.toFixed(1)}% |
| SL | ${backtest.statistics.outcomes.SL} | ${metrics.slHitRate.toFixed(1)}% |
| EXPIRED | ${backtest.statistics.outcomes.EXPIRED} | ${metrics.expiredRate.toFixed(1)}% |

---

## 💰 Profit/Loss Analysis

- **Total Profit:** +${metrics.totalProfitPips.toFixed(1)} pips (${metrics.wins} wins)  
- **Total Loss:** -${metrics.totalLossPips.toFixed(1)} pips (${metrics.losses} losses)  
- **Average Win:** +${metrics.avgWinPips.toFixed(1)} pips  
- **Average Loss:** -${metrics.avgLossPips.toFixed(1)} pips  
- **Largest Win:** +${metrics.largestWin.toFixed(1)} pips  
- **Largest Loss:** ${metrics.largestLoss.toFixed(1)} pips

---

## ⏱️ Trade Duration

- **Average:** ${metrics.avgTradeDuration.toFixed(1)} hours  
- **Longest:** ${metrics.longestTrade.toFixed(1)} hours  
- **Shortest:** ${metrics.shortestTrade.toFixed(1)} hours

---

## 📊 Performance by Killzone

${Object.entries(metrics.byKillzone).map(([zone, stats]) => `
### ${zone}
- Total: ${stats.total} trades  
- Win Rate: ${stats.winRate.toFixed(1)}%  
- Total Profit: ${stats.totalProfit > 0 ? '+' : ''}${stats.totalProfit.toFixed(1)} pips  
- Avg Profit: ${stats.avgProfit.toFixed(1)} pips
`).join('\n')}

---

## 📊 Performance by Direction

${Object.entries(metrics.byDirection).map(([dir, stats]) => `
### ${dir}
- Total: ${stats.total} trades  
- Win Rate: ${stats.winRate.toFixed(1)}%  
- Total Profit: ${stats.totalProfit > 0 ? '+' : ''}${stats.totalProfit.toFixed(1)} pips
`).join('\n')}

---

## 📊 Performance by Score Range

${Object.entries(metrics.byScoreRange).map(([range, stats]) => `
### Score ${range}
- Total: ${stats.total} trades  
- Win Rate: ${stats.winRate.toFixed(1)}%  
- Avg Score: ${stats.avgScore.toFixed(1)}  
- Total Profit: ${stats.totalProfit > 0 ? '+' : ''}${stats.totalProfit.toFixed(1)} pips
`).join('\n')}

---

## 🔥 Streaks

- **Longest Win Streak:** ${metrics.longestWinStreak} trades  
- **Longest Loss Streak:** ${metrics.longestLossStreak} trades  
- **Current Streak:** ${metrics.currentStreak.count} ${metrics.currentStreak.type === 'win' ? 'wins' : 'losses'}

---

## 💡 Recommendations

${generateRecommendations(metrics)}

---

*Report generated on ${new Date().toISOString()}*
`;
}

/**
 * توليد توصيات بناءً على النتائج
 */
function generateRecommendations(metrics: PerformanceMetrics): string {
    const recommendations: string[] = [];

    // تحليل Win Rate
    if (metrics.winRate >= 70) {
        recommendations.push('✅ **Excellent win rate!** The system is performing very well.');
    } else if (metrics.winRate >= 60) {
        recommendations.push('✅ **Good win rate.** Consider optimizing entry conditions for better results.');
    } else {
        recommendations.push('⚠️ **Win rate below target.** Review and adjust the AI system instructions.');
    }

    // تحليل Killzones
    const bestKillzone = Object.entries(metrics.byKillzone)
        .sort((a, b) => b[1].winRate - a[1].winRate)[0];
    if (bestKillzone) {
        recommendations.push(`📍 **Best performing killzone:** ${bestKillzone[0]} (${bestKillzone[1].winRate.toFixed(1)}% win rate)`);
    }

    // تحليل Score
    const bestScoreRange = Object.entries(metrics.byScoreRange)
        .sort((a, b) => b[1].winRate - a[1].winRate)[0];
    if (bestScoreRange) {
        recommendations.push(`🎯 **Best score range:** ${bestScoreRange[0]} (${bestScoreRange[1].winRate.toFixed(1)}% win rate)`);
        recommendations.push(`💡 Consider filtering trades to scores ${bestScoreRange[0].split('-')[0]}+ for higher success rate.`);
    }

    // تحليل TP rates
    if (metrics.tp3HitRate > 20) {
        recommendations.push(`🎯 **TP3 hit rate is strong** (${metrics.tp3HitRate.toFixed(1)}%). Consider increasing TP3 targets.`);
    } else if (metrics.tp1HitRate > 70) {
        recommendations.push(`⚠️ **Most trades hit TP1 only.** Consider adjusting TP2/TP3 targets closer to price.`);
    }

    // تحليل SL rate
    if (metrics.slHitRate > 40) {
        recommendations.push(`⚠️ **High SL hit rate** (${metrics.slHitRate.toFixed(1)}%). Review stop loss placement strategy.`);
    }

    return recommendations.join('\n\n');
}

export default {
    analyzePerformance,
    generateMarkdownReport
};
