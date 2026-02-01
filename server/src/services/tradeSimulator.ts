// services/tradeSimulator.ts
// محاكي دقيق لتنفيذ الصفقات على البيانات التاريخية

export interface Candle {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface SuggestedTrade {
    type: 'BUY_LIMIT' | 'SELL_LIMIT';
    entry: number;
    sl: number;
    tp1: number;
    tp2: number;
    tp3: number;
    rrRatio?: string;
}

export interface TradeOutcome {
    executed: boolean;                    // هل تم تنفيذ الصفقة؟
    executionTime?: string;               // وقت التنفيذ
    executionPrice?: number;              // سعر التنفيذ
    outcome?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'EXPIRED';
    exitTime?: string;                    // وقت الخروج
    exitPrice?: number;                   // سعر الخروج
    profitPips: number;                   // الربح/الخسارة بالنقاط
    profitPercent: number;                // الربح/الخسارة بالنسبة المئوية
    durationHours: number;                // مدة الصفقة بالساعات
    durationCandles: number;              // عدد الشموع
    partialTPs?: {                        // إذا تم ضرب أكثر من TP
        tp1?: boolean;
        tp2?: boolean;
        tp3?: boolean;
    };
}

export interface SimulationConfig {
    maxDurationHours: number;             // أقصى مدة للصفقة (default: 72)
    slippage: number;                     // انزلاق السعر بالنقاط (default: 0.5)
    partialCloseEnabled: boolean;         // إغلاق جزئي عند TP1/TP2 (default: true)
}

const DEFAULT_CONFIG: SimulationConfig = {
    maxDurationHours: 72,
    slippage: 0.5,
    partialCloseEnabled: true
};

/**
 * محاكاة صفقة واحدة على البيانات التاريخية
 */
export function simulateSingleTrade(
    trade: SuggestedTrade,
    entryTime: Date,
    futureCandles: Candle[],
    config: Partial<SimulationConfig> = {}
): TradeOutcome {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    console.log(`\n🔍 محاكاة صفقة ${trade.type} @ ${trade.entry}`);

    // التحقق من البيانات
    if (!futureCandles || futureCandles.length === 0) {
        return {
            executed: false,
            profitPips: 0,
            profitPercent: 0,
            durationHours: 0,
            durationCandles: 0
        };
    }

    const isBuy = trade.type.includes('BUY');
    const entryTimestamp = entryTime.getTime();
    const maxEndTime = entryTimestamp + (cfg.maxDurationHours * 60 * 60 * 1000);

    let executed = false;
    let executionCandle: Candle | null = null;
    let executionIndex = -1;

    // المرحلة 1: البحث عن تنفيذ الدخول
    for (let i = 0; i < futureCandles.length; i++) {
        const candle = futureCandles[i];
        const candleTime = new Date(candle.time).getTime();

        // تجاوز وقت الانتهاء
        if (candleTime > maxEndTime) {
            break;
        }

        // تحقق من تنفيذ Entry
        if (isBuy) {
            // BUY_LIMIT: يتم التنفيذ إذا وصل السعر أو أقل
            if (candle.low <= trade.entry) {
                executed = true;
                executionCandle = candle;
                executionIndex = i;
                console.log(`   ✅ تم التنفيذ عند شمعة #${i} - السعر: ${trade.entry}`);
                break;
            }
        } else {
            // SELL_LIMIT: يتم التنفيذ إذا وصل السعر أو أعلى
            if (candle.high >= trade.entry) {
                executed = true;
                executionCandle = candle;
                executionIndex = i;
                console.log(`   ✅ تم التنفيذ عند شمعة #${i} - السعر: ${trade.entry}`);
                break;
            }
        }
    }

    // إذا لم يتم التنفيذ
    if (!executed || executionCandle === null) {
        console.log(`   ⏳ لم يتم الوصول لسعر الدخول`);
        return {
            executed: false,
            outcome: 'EXPIRED',
            profitPips: 0,
            profitPercent: 0,
            durationHours: 0,
            durationCandles: futureCandles.length
        };
    }

    // المرحلة 2: تتبع الصفقة بعد التنفيذ
    const executionPrice = trade.entry + (Math.random() > 0.5 ? cfg.slippage : -cfg.slippage) * 0.01;
    const remainingCandles = futureCandles.slice(executionIndex + 1);

    let tp1Hit = false;
    let tp2Hit = false;
    let tp3Hit = false;
    let slHit = false;
    let exitCandle: Candle | null = null;
    let exitIndex = -1;

    for (let i = 0; i < remainingCandles.length; i++) {
        const candle = remainingCandles[i];
        const candleTime = new Date(candle.time).getTime();

        if (candleTime > maxEndTime) {
            break;
        }

        if (isBuy) {
            // تحقق من SL أولاً
            if (candle.low <= trade.sl) {
                slHit = true;
                exitCandle = candle;
                exitIndex = i;
                console.log(`   ❌ ضرب SL عند شمعة #${executionIndex + i + 1}`);
                break;
            }

            // تحقق من TPs
            if (!tp1Hit && candle.high >= trade.tp1) {
                tp1Hit = true;
                console.log(`   ✅ ضرب TP1 عند شمعة #${executionIndex + i + 1}`);
            }

            if (!tp2Hit && candle.high >= trade.tp2) {
                tp2Hit = true;
                console.log(`   ✅ ضرب TP2 عند شمعة #${executionIndex + i + 1}`);
            }

            if (!tp3Hit && candle.high >= trade.tp3) {
                tp3Hit = true;
                exitCandle = candle;
                exitIndex = i;
                console.log(`   🎯 ضرب TP3 عند شمعة #${executionIndex + i + 1}`);
                break;
            }

            // إذا وصل TP1 أو TP2 ولم يصل للتالي، نعتبره خروج
            if (tp2Hit && !tp3Hit && i > 10) {
                exitCandle = candle;
                exitIndex = i;
                console.log(`   ✅ خروج عند TP2`);
                break;
            }

            if (tp1Hit && !tp2Hit && i > 20) {
                exitCandle = candle;
                exitIndex = i;
                console.log(`   ✅ خروج عند TP1`);
                break;
            }

        } else {
            // SELL - نفس المنطق معكوس
            if (candle.high >= trade.sl) {
                slHit = true;
                exitCandle = candle;
                exitIndex = i;
                console.log(`   ❌ ضرب SL عند شمعة #${executionIndex + i + 1}`);
                break;
            }

            if (!tp1Hit && candle.low <= trade.tp1) {
                tp1Hit = true;
                console.log(`   ✅ ضرب TP1 عند شمعة #${executionIndex + i + 1}`);
            }

            if (!tp2Hit && candle.low <= trade.tp2) {
                tp2Hit = true;
                console.log(`   ✅ ضرب TP2 عند شمعة #${executionIndex + i + 1}`);
            }

            if (!tp3Hit && candle.low <= trade.tp3) {
                tp3Hit = true;
                exitCandle = candle;
                exitIndex = i;
                console.log(`   🎯 ضرب TP3 عند شمعة #${executionIndex + i + 1}`);
                break;
            }

            if (tp2Hit && !tp3Hit && i > 10) {
                exitCandle = candle;
                exitIndex = i;
                console.log(`   ✅ خروج عند TP2`);
                break;
            }

            if (tp1Hit && !tp2Hit && i > 20) {
                exitCandle = candle;
                exitIndex = i;
                console.log(`   ✅ خروج عند TP1`);
                break;
            }
        }
    }

    // تحديد النتيجة النهائية
    let outcome: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'EXPIRED';
    let exitPrice: number;

    if (slHit) {
        outcome = 'SL';
        exitPrice = trade.sl;
    } else if (tp3Hit) {
        outcome = 'TP3';
        exitPrice = trade.tp3;
    } else if (tp2Hit) {
        outcome = 'TP2';
        exitPrice = trade.tp2;
    } else if (tp1Hit) {
        outcome = 'TP1';
        exitPrice = trade.tp1;
    } else {
        outcome = 'EXPIRED';
        exitPrice = exitCandle?.close || executionCandle.close;
    }

    // حساب الأرباح
    const profitPips = isBuy
        ? (exitPrice - executionPrice) * 100  // لـ XAUUSD (1 pip = 0.01)
        : (executionPrice - exitPrice) * 100;

    // تصحيح: حساب النسبة المئوية بناءً على فرق السعر وليس النقاط
    const profitPrice = isBuy ? (exitPrice - executionPrice) : (executionPrice - exitPrice);
    const profitPercent = (profitPrice / executionPrice) * 100;

    // حساب المدة
    const exitTime = exitCandle ? new Date(exitCandle.time) : new Date(remainingCandles[remainingCandles.length - 1].time);
    const durationMs = exitTime.getTime() - new Date(executionCandle.time).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    console.log(`   📊 النتيجة: ${outcome} | الربح: ${profitPips.toFixed(1)} نقطة | المدة: ${durationHours.toFixed(1)}h`);

    return {
        executed: true,
        executionTime: executionCandle.time,
        executionPrice,
        outcome,
        exitTime: exitCandle?.time || remainingCandles[remainingCandles.length - 1].time,
        exitPrice,
        profitPips,
        profitPercent,
        durationHours,
        durationCandles: exitIndex >= 0 ? exitIndex + 1 : remainingCandles.length,
        partialTPs: {
            tp1: tp1Hit,
            tp2: tp2Hit,
            tp3: tp3Hit
        }
    };
}

/**
 * محاكاة عدة صفقات دفعة واحدة
 */
export function simulateMultipleTrades(
    trades: Array<{ trade: SuggestedTrade; entryTime: Date }>,
    allCandles: Candle[],
    config: Partial<SimulationConfig> = {}
): TradeOutcome[] {
    console.log(`\n📊 محاكاة ${trades.length} صفقة...`);

    return trades.map(({ trade, entryTime }, index) => {
        console.log(`\n[${index + 1}/${trades.length}]`);

        // إيجاد الشموع المستقبلية بعد وقت الدخول
        const entryIndex = allCandles.findIndex(c => new Date(c.time) >= entryTime);

        if (entryIndex === -1 || entryIndex >= allCandles.length - 1) {
            return {
                executed: false,
                profitPips: 0,
                profitPercent: 0,
                durationHours: 0,
                durationCandles: 0
            };
        }

        const futureCandles = allCandles.slice(entryIndex);
        return simulateSingleTrade(trade, entryTime, futureCandles, config);
    });
}

/**
 * حساب إحصائيات سريعة للنتائج
 */
export function calculateQuickStats(results: TradeOutcome[]) {
    const executed = results.filter(r => r.executed);
    const total = executed.length;

    if (total === 0) {
        return {
            total: 0,
            executed: 0,
            winRate: 0,
            avgProfit: 0,
            totalProfit: 0
        };
    }

    const wins = executed.filter(r => r.profitPips > 0);
    const losses = executed.filter(r => r.profitPips < 0);

    const totalProfit = executed.reduce((sum, r) => sum + r.profitPips, 0);
    const avgProfit = totalProfit / total;

    const tp1Count = executed.filter(r => r.outcome === 'TP1').length;
    const tp2Count = executed.filter(r => r.outcome === 'TP2').length;
    const tp3Count = executed.filter(r => r.outcome === 'TP3').length;
    const slCount = executed.filter(r => r.outcome === 'SL').length;

    return {
        total: results.length,
        executed: total,
        executionRate: (total / results.length) * 100,
        wins: wins.length,
        losses: losses.length,
        winRate: (wins.length / total) * 100,
        avgProfit: avgProfit,
        totalProfit: totalProfit,
        avgDuration: executed.reduce((sum, r) => sum + r.durationHours, 0) / total,
        outcomes: {
            TP1: tp1Count,
            TP2: tp2Count,
            TP3: tp3Count,
            SL: slCount,
            EXPIRED: executed.filter(r => r.outcome === 'EXPIRED').length
        }
    };
}

export default {
    simulateSingleTrade,
    simulateMultipleTrades,
    calculateQuickStats
};
