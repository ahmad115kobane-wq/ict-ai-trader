// services/oandaService.ts
// خدمة جلب بيانات الشموع من OANDA

import { Candle } from '../types';

const API_KEY = process.env.OANDA_API_KEY || '531b3cfe32a6e44f9b31c69734f85558-b8f3b06be8ebf821597510767d6bcf6d';
const BASE_URL = process.env.OANDA_BASE_URL || 'https://api-fxpractice.oanda.com';
const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID || '101-001-30294518-001';

// تحويل الرموز
const convertSymbol = (symbol: string): string => {
  const map: Record<string, string> = {
    'XAUUSD': 'XAU_USD',
    'XAU_USD': 'XAU_USD',
    'BTCUSD': 'BTC_USD',
    'BTC_USD': 'BTC_USD',
    'EURUSD': 'EUR_USD',
    'EUR_USD': 'EUR_USD',
    'GBPUSD': 'GBP_USD',
    'GBP_USD': 'GBP_USD',
  };
  return map[symbol] || symbol.replace('/', '_');
};

// تحويل الفريمات
const convertTimeframe = (tf: string): string => {
  const map: Record<string, string> = {
    '1m': 'M1',
    '5m': 'M5',
    '15m': 'M15',
    '30m': 'M30',
    '1h': 'H1',
    '4h': 'H4',
    '1d': 'D',
    'D': 'D',
  };
  return map[tf] || tf;
};

// جلب السعر الحالي
export const getCurrentPrice = async (symbol: string): Promise<number> => {
  try {
    const instrument = convertSymbol(symbol);
    const response = await fetch(
      `${BASE_URL}/v3/instruments/${instrument}/candles?count=1&granularity=M1`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OANDA Error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    const candle = data.candles?.[0];
    return parseFloat(candle?.mid?.c || '0');
  } catch (error) {
    console.error('OANDA getCurrentPrice error:', error);
    return 0;
  }
};

// جلب الشموع التاريخية
export const getCandles = async (
  symbol: string,
  timeframe: string,
  count: number = 200
): Promise<Candle[]> => {
  try {
    const instrument = convertSymbol(symbol);
    const granularity = convertTimeframe(timeframe);
    
    const response = await fetch(
      `${BASE_URL}/v3/instruments/${instrument}/candles?count=${count}&granularity=${granularity}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OANDA API Error:', response.status, errorText);
      throw new Error(`OANDA Error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    
    // إرجاع جميع الشموع بما فيها الشمعة الحالية (غير المكتملة)
    return (data.candles || [])
      .map((c: any) => ({
        time: c.time,
        open: parseFloat(c.mid.o),
        high: parseFloat(c.mid.h),
        low: parseFloat(c.mid.l),
        close: parseFloat(c.mid.c),
        volume: c.volume,
        complete: c.complete // حفظ حالة الاكتمال
      }));
  } catch (error) {
    console.error('OANDA getCandles error:', error);
    return [];
  }
};

// جلب أسعار متعددة
export const getPrices = async (symbols: string[]): Promise<Record<string, number>> => {
  try {
    const instruments = symbols.map(convertSymbol).join(',');
    const response = await fetch(
      `${BASE_URL}/v3/accounts/${ACCOUNT_ID}/pricing?instruments=${instruments}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OANDA Error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    const prices: Record<string, number> = {};
    
    for (const price of data.prices || []) {
      const symbol = price.instrument.replace('_', '');
      const mid = (parseFloat(price.bids?.[0]?.price || '0') + parseFloat(price.asks?.[0]?.price || '0')) / 2;
      prices[symbol] = mid;
    }
    
    return prices;
  } catch (error) {
    console.error('OANDA getPrices error:', error);
    return {};
  }
};
