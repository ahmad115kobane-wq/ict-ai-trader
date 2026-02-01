
import { simulateSingleTrade, SuggestedTrade, Candle } from './server/src/services/tradeSimulator';

const mockCandle = (time: string, open: number, high: number, low: number, close: number): Candle => ({
    time, open, high, low, close
});

// Test Case 1: XAUUSD Buy
// Entry: 2000.00, Exit: 2010.00. Profit: $10.
// Expected Profit Pips (if 1 pip = 0.01): 10 / 0.01 = 1000 pips.
// Expected Profit %: (10 / 2000) * 100 = 0.5%.

const trade1: SuggestedTrade = {
    type: 'BUY_LIMIT',
    entry: 2000.00,
    sl: 1990.00,
    tp1: 2005.00,
    tp2: 2010.00,
    tp3: 2020.00
};

const candles1: Candle[] = [
    mockCandle("2023-01-01T10:00:00Z", 2000, 2000, 1999, 2000), // Trigger Entry
    mockCandle("2023-01-01T11:00:00Z", 2005, 2012, 2005, 2012)  // Hit TP2 (2010)
];

const result1 = simulateSingleTrade(trade1, new Date("2023-01-01T09:00:00Z"), candles1, { slippage: 0 });

console.log("--- Test Case 1: XAUUSD Buy ---");
console.log(`Entry: ${result1.executionPrice}`);
console.log(`Exit: ${result1.exitPrice}`);
console.log(`Outcome: ${result1.outcome}`);
console.log(`Profit Pips: ${result1.profitPips}`);
console.log(`Profit Percent: ${result1.profitPercent}%`);


// Test Case 2: EURUSD Buy (to check pip calc assumption)
// Entry: 1.1000, Exit: 1.1010. Profit: 0.0010.
// Standard Pip for EURUSD is 0.0001. So 10 pips.
// Current code uses * 100. So 0.0010 * 100 = 0.1. << This confirms code is XAUUSD/JPY specific or hardcoded.

const trade2: SuggestedTrade = {
    type: 'BUY_LIMIT',
    entry: 1.1000,
    sl: 1.0900,
    tp1: 1.1010,
    tp2: 1.1020,
    tp3: 1.1030
};

const candles2: Candle[] = [
    mockCandle("2023-01-01T10:00:00Z", 1.1000, 1.1000, 1.0990, 1.1000), // Trigger Entry
    mockCandle("2023-01-01T11:00:00Z", 1.1010, 1.1025, 1.1010, 1.1015)  // Hit TP2
];

const result2 = simulateSingleTrade(trade2, new Date("2023-01-01T09:00:00Z"), candles2, { slippage: 0 });

console.log("\n--- Test Case 2: EURUSD Buy ---");
console.log(`Entry: ${result2.executionPrice}`);
console.log(`Exit: ${result2.exitPrice}`);
console.log(`Outcome: ${result2.outcome}`);
console.log(`Profit Pips: ${result2.profitPips}`);
console.log(`Profit Percent: ${result2.profitPercent}%`);
