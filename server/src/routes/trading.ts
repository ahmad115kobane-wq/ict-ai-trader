// routes/trading.ts
// ═══════════════════════════════════════════════════════════════════════════════
// نظام التداول الاحترافي - Professional Trading System
// ═══════════════════════════════════════════════════════════════════════════════

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  getUserById,
  openPositionInDb,
  closePositionInDb,
  getUserOpenPositions,
  getUserClosedPositions,
  getPositionById,
  updatePositionSlTp,
  updateUserBalance,
  updateUserTradingStatsDb,
  resetUserTradingStatsDb,
} from '../db/index';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// ثوابت التداول
// ═══════════════════════════════════════════════════════════════════
const CONTRACT_SIZE = 100; // حجم العقد للذهب
const MAX_LOT_SIZE = 50;
const MIN_LOT_SIZE = 0.01;
const MAX_POSITIONS = 50; // أقصى عدد صفقات مفتوحة
const RATE_LIMIT_MS = 500; // حد أدنى بين العمليات

// تخزين آخر وقت عملية لكل مستخدم (حماية من التلاعب)
const lastActionTime: Record<string, number> = {};

// ═══════════════════════════════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════════════════════════════
const round2 = (v: number) => Number(v.toFixed(2));

const calculateMargin = (price: number, lotSize: number, leverage: number): number => {
  return round2((price * lotSize * CONTRACT_SIZE) / leverage);
};

const calculatePnl = (
  side: 'BUY' | 'SELL',
  entryPrice: number,
  currentPrice: number,
  lotSize: number
): number => {
  const direction = side === 'BUY' ? 1 : -1;
  return round2((currentPrice - entryPrice) * direction * lotSize * CONTRACT_SIZE);
};

const getUsedMargin = (positions: any[], leverage: number): number => {
  return round2(
    positions.reduce((total: number, p: any) => {
      return total + calculateMargin(p.entry_price, p.lot_size, leverage);
    }, 0)
  );
};

const getFloatingPnl = (positions: any[], currentPrice: number): number => {
  return round2(
    positions.reduce((total: number, p: any) => {
      return total + calculatePnl(p.side, p.entry_price, currentPrice, p.lot_size);
    }, 0)
  );
};

// التحقق من معدل الطلبات (حماية من التلاعب)
const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const last = lastActionTime[userId] || 0;
  if (now - last < RATE_LIMIT_MS) {
    return false;
  }
  lastActionTime[userId] = now;
  return true;
};

// التحقق من صحة السعر (حماية من التلاعب)
const validatePrice = (price: number): boolean => {
  return typeof price === 'number' && Number.isFinite(price) && price > 0 && price < 100000;
};

const validateLotSize = (lotSize: number): boolean => {
  return (
    typeof lotSize === 'number' &&
    Number.isFinite(lotSize) &&
    lotSize >= MIN_LOT_SIZE &&
    lotSize <= MAX_LOT_SIZE
  );
};

// ═══════════════════════════════════════════════════════════════════
// GET /account - الحصول على معلومات حساب التداول
// ═══════════════════════════════════════════════════════════════════
router.get('/account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    const openPositions = await getUserOpenPositions(userId);
    const leverage = user.leverage || 500;
    const balance = user.balance ?? 10000;
    const initialBalance = user.initial_balance ?? 10000;

    // نحتاج السعر الحالي لحساب الـ equity
    let currentPrice = 0;
    try {
      const { getCurrentPrice } = await import('../services/oandaService');
      currentPrice = await getCurrentPrice('XAUUSD');
    } catch (e) {
      currentPrice = 0;
    }

    const floatingPnl = currentPrice > 0 ? getFloatingPnl(openPositions, currentPrice) : 0;
    const usedMargin = getUsedMargin(openPositions, leverage);
    const equity = round2(balance + floatingPnl);
    const freeMargin = round2(equity - usedMargin);
    const marginLevel = usedMargin > 0 ? round2((equity / usedMargin) * 100) : 0;

    res.json({
      success: true,
      account: {
        balance: round2(balance),
        equity,
        floatingPnl,
        usedMargin,
        freeMargin,
        marginLevel,
        leverage,
        currency: user.account_currency || 'USD',
        initialBalance: round2(initialBalance),
        openPositionsCount: openPositions.length,
        totalProfit: user.total_profit || 0,
        totalLoss: user.total_loss || 0,
        totalTrades: user.total_trades || 0,
        winningTrades: user.winning_trades || 0,
        losingTrades: user.losing_trades || 0,
        winRate: user.total_trades > 0
          ? round2((user.winning_trades / user.total_trades) * 100)
          : 0,
      },
      currentPrice,
    });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب بيانات الحساب' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /open - فتح صفقة جديدة
// ═══════════════════════════════════════════════════════════════════
router.post('/open', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    // حماية من التلاعب بالمعدل
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, error: 'انتظر قليلاً قبل إجراء عملية أخرى' });
    }

    const { symbol, side, lotSize, stopLoss, takeProfit } = req.body;

    // التحقق من المدخلات
    if (!symbol || !side || !lotSize) {
      return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
    }

    if (side !== 'BUY' && side !== 'SELL') {
      return res.status(400).json({ success: false, error: 'اتجاه الصفقة غير صحيح' });
    }

    if (!validateLotSize(lotSize)) {
      return res.status(400).json({
        success: false,
        error: `حجم اللوت يجب أن يكون بين ${MIN_LOT_SIZE} و ${MAX_LOT_SIZE}`,
      });
    }

    if (stopLoss !== undefined && stopLoss !== null && !validatePrice(stopLoss)) {
      return res.status(400).json({ success: false, error: 'قيمة وقف الخسارة غير صحيحة' });
    }

    if (takeProfit !== undefined && takeProfit !== null && !validatePrice(takeProfit)) {
      return res.status(400).json({ success: false, error: 'قيمة الهدف غير صحيحة' });
    }

    // جلب السعر الحالي من الخادم (لا نثق بسعر العميل)
    let currentPrice: number;
    try {
      const { getCurrentPrice } = await import('../services/oandaService');
      currentPrice = await getCurrentPrice(symbol);
    } catch (e) {
      return res.status(503).json({ success: false, error: 'لا يمكن جلب السعر الحالي' });
    }

    if (!currentPrice || currentPrice <= 0) {
      return res.status(503).json({ success: false, error: 'السعر غير متاح حالياً' });
    }

    // التحقق من صحة SL/TP بالنسبة للاتجاه
    const sl = stopLoss ?? (side === 'BUY' ? currentPrice - 5 : currentPrice + 5);
    const tp = takeProfit ?? (side === 'BUY' ? currentPrice + 10 : currentPrice - 10);

    if (side === 'BUY') {
      if (sl >= currentPrice) {
        return res.status(400).json({ success: false, error: 'وقف الخسارة يجب أن يكون أقل من السعر الحالي لصفقة الشراء' });
      }
      if (tp <= currentPrice) {
        return res.status(400).json({ success: false, error: 'الهدف يجب أن يكون أعلى من السعر الحالي لصفقة الشراء' });
      }
    } else {
      if (sl <= currentPrice) {
        return res.status(400).json({ success: false, error: 'وقف الخسارة يجب أن يكون أعلى من السعر الحالي لصفقة البيع' });
      }
      if (tp >= currentPrice) {
        return res.status(400).json({ success: false, error: 'الهدف يجب أن يكون أقل من السعر الحالي لصفقة البيع' });
      }
    }

    // جلب بيانات المستخدم
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    const balance = user.balance ?? 10000;
    const leverage = user.leverage || 500;

    // التحقق من عدد الصفقات المفتوحة
    const openPositions = await getUserOpenPositions(userId);
    if (openPositions.length >= MAX_POSITIONS) {
      return res.status(400).json({
        success: false,
        error: `تجاوزت الحد الأقصى للصفقات المفتوحة (${MAX_POSITIONS})`,
      });
    }

    // حساب الهوامش
    const requiredMargin = calculateMargin(currentPrice, lotSize, leverage);
    const floatingPnl = getFloatingPnl(openPositions, currentPrice);
    const usedMargin = getUsedMargin(openPositions, leverage);
    const equity = round2(balance + floatingPnl);
    const freeMargin = round2(equity - usedMargin);

    if (requiredMargin > freeMargin) {
      return res.status(400).json({
        success: false,
        error: `الهامش غير كافٍ. المطلوب: $${requiredMargin.toFixed(2)}، المتاح: $${freeMargin.toFixed(2)}`,
      });
    }

    // فتح الصفقة في قاعدة البيانات
    const positionId = await openPositionInDb(
      userId,
      symbol,
      side,
      round2(lotSize),
      round2(currentPrice),
      round2(sl),
      round2(tp)
    );

    console.log(`📊 Position opened: ${positionId} | ${side} ${lotSize} LOT @ ${currentPrice} | User: ${userId}`);

    res.json({
      success: true,
      message: 'تم فتح الصفقة بنجاح',
      position: {
        id: positionId,
        symbol,
        side,
        lotSize: round2(lotSize),
        entryPrice: round2(currentPrice),
        stopLoss: round2(sl),
        takeProfit: round2(tp),
        margin: requiredMargin,
      },
    });
  } catch (error) {
    console.error('Open position error:', error);
    res.status(500).json({ success: false, error: 'خطأ في فتح الصفقة' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /close - إغلاق صفقة كاملة
// ═══════════════════════════════════════════════════════════════════
router.post('/close', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, error: 'انتظر قليلاً' });
    }

    const { positionId } = req.body;
    if (!positionId) {
      return res.status(400).json({ success: false, error: 'معرف الصفقة مطلوب' });
    }

    // جلب الصفقة والتحقق من الملكية
    const position = await getPositionById(positionId);
    if (!position) {
      return res.status(404).json({ success: false, error: 'الصفقة غير موجودة' });
    }
    if (position.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'لا يمكنك إغلاق صفقة لا تملكها' });
    }
    if (position.status !== 'open') {
      return res.status(400).json({ success: false, error: 'الصفقة مغلقة بالفعل' });
    }

    // جلب السعر الحالي من الخادم
    let currentPrice: number;
    try {
      const { getCurrentPrice } = await import('../services/oandaService');
      currentPrice = await getCurrentPrice(position.symbol);
    } catch (e) {
      return res.status(503).json({ success: false, error: 'لا يمكن جلب السعر الحالي' });
    }

    // حساب الربح/الخسارة
    const pnl = calculatePnl(position.side, position.entry_price, currentPrice, position.lot_size);

    // إغلاق الصفقة في DB
    await closePositionInDb(positionId, round2(currentPrice), pnl, 'manual_close');

    // تحديث رصيد المستخدم وإحصائياته
    const user = await getUserById(userId);
    const newBalance = round2((user.balance ?? 10000) + pnl);
    await updateUserBalance(userId, newBalance);

    // تحديث الإحصائيات
    await updateUserTradingStatsDb(userId, pnl);

    console.log(`📊 Position closed: ${positionId} | PnL: ${pnl} | User: ${userId}`);

    res.json({
      success: true,
      message: 'تم إغلاق الصفقة بنجاح',
      closePrice: round2(currentPrice),
      pnl,
      newBalance,
    });
  } catch (error) {
    console.error('Close position error:', error);
    res.status(500).json({ success: false, error: 'خطأ في إغلاق الصفقة' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /partial-close - إغلاق جزئي للصفقة
// ═══════════════════════════════════════════════════════════════════
router.post('/partial-close', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, error: 'انتظر قليلاً' });
    }

    const { positionId, closeLotSize } = req.body;
    if (!positionId || !closeLotSize) {
      return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
    }

    if (!validateLotSize(closeLotSize)) {
      return res.status(400).json({ success: false, error: 'حجم اللوت غير صحيح' });
    }

    // جلب الصفقة والتحقق من الملكية
    const position = await getPositionById(positionId);
    if (!position) {
      return res.status(404).json({ success: false, error: 'الصفقة غير موجودة' });
    }
    if (position.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'لا يمكنك تعديل صفقة لا تملكها' });
    }
    if (position.status !== 'open') {
      return res.status(400).json({ success: false, error: 'الصفقة مغلقة بالفعل' });
    }

    if (closeLotSize >= position.lot_size) {
      return res.status(400).json({
        success: false,
        error: `حجم الإغلاق يجب أن يكون أقل من ${position.lot_size} LOT`,
      });
    }

    // جلب السعر الحالي
    let currentPrice: number;
    try {
      const { getCurrentPrice } = await import('../services/oandaService');
      currentPrice = await getCurrentPrice(position.symbol);
    } catch (e) {
      return res.status(503).json({ success: false, error: 'لا يمكن جلب السعر الحالي' });
    }

    // حساب PnL للجزء المغلق
    const partialPnl = calculatePnl(position.side, position.entry_price, currentPrice, closeLotSize);

    // إغلاق الصفقة الأصلية
    await closePositionInDb(positionId, round2(currentPrice), partialPnl, 'partial_close');

    // فتح صفقة جديدة بالحجم المتبقي
    const remainingLotSize = round2(position.lot_size - closeLotSize);
    let remainingPositionId: string | null = null;

    if (remainingLotSize >= MIN_LOT_SIZE) {
      remainingPositionId = await openPositionInDb(
        userId,
        position.symbol,
        position.side,
        remainingLotSize,
        position.entry_price,
        position.stop_loss,
        position.take_profit
      );
    }

    // تحديث الرصيد
    const user = await getUserById(userId);
    const newBalance = round2((user.balance ?? 10000) + partialPnl);
    await updateUserBalance(userId, newBalance);

    // تحديث الإحصائيات
    await updateUserTradingStatsDb(userId, partialPnl);

    console.log(`📊 Partial close: ${positionId} | ${closeLotSize} LOT | PnL: ${partialPnl} | Remaining: ${remainingLotSize}`);

    res.json({
      success: true,
      message: 'تم الإغلاق الجزئي بنجاح',
      closePrice: round2(currentPrice),
      closedLotSize: round2(closeLotSize),
      pnl: partialPnl,
      remainingLotSize,
      remainingPositionId,
      newBalance,
    });
  } catch (error) {
    console.error('Partial close error:', error);
    res.status(500).json({ success: false, error: 'خطأ في الإغلاق الجزئي' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUT /update-sl-tp - تعديل وقف الخسارة والهدف
// ═══════════════════════════════════════════════════════════════════
router.put('/update-sl-tp', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const { positionId, stopLoss, takeProfit } = req.body;
    if (!positionId) {
      return res.status(400).json({ success: false, error: 'معرف الصفقة مطلوب' });
    }

    if (stopLoss === undefined && takeProfit === undefined) {
      return res.status(400).json({ success: false, error: 'يجب تقديم SL أو TP على الأقل' });
    }

    // التحقق من القيم
    if (stopLoss !== undefined && !validatePrice(stopLoss)) {
      return res.status(400).json({ success: false, error: 'قيمة وقف الخسارة غير صحيحة' });
    }
    if (takeProfit !== undefined && !validatePrice(takeProfit)) {
      return res.status(400).json({ success: false, error: 'قيمة الهدف غير صحيحة' });
    }

    // جلب الصفقة والتحقق من الملكية
    const position = await getPositionById(positionId);
    if (!position) {
      return res.status(404).json({ success: false, error: 'الصفقة غير موجودة' });
    }
    if (position.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'لا يمكنك تعديل صفقة لا تملكها' });
    }
    if (position.status !== 'open') {
      return res.status(400).json({ success: false, error: 'الصفقة مغلقة بالفعل' });
    }

    // التحقق من صحة SL/TP بالنسبة للاتجاه
    if (position.side === 'BUY') {
      if (stopLoss !== undefined && stopLoss >= position.entry_price) {
        // السماح بنقل SL فوق سعر الدخول (breakeven)
        // لكن يجب ألا يكون فوق الهدف
        const targetTp = takeProfit ?? position.take_profit;
        if (stopLoss >= targetTp) {
          return res.status(400).json({ success: false, error: 'وقف الخسارة يجب أن يكون أقل من الهدف' });
        }
      }
    } else {
      if (stopLoss !== undefined && stopLoss <= position.entry_price) {
        const targetTp = takeProfit ?? position.take_profit;
        if (stopLoss <= targetTp) {
          return res.status(400).json({ success: false, error: 'وقف الخسارة يجب أن يكون أعلى من الهدف' });
        }
      }
    }

    await updatePositionSlTp(
      positionId,
      stopLoss !== undefined ? round2(stopLoss) : undefined,
      takeProfit !== undefined ? round2(takeProfit) : undefined
    );

    console.log(`📊 SL/TP updated: ${positionId} | SL: ${stopLoss} | TP: ${takeProfit}`);

    res.json({
      success: true,
      message: 'تم تحديث SL/TP بنجاح',
      stopLoss: stopLoss !== undefined ? round2(stopLoss) : position.stop_loss,
      takeProfit: takeProfit !== undefined ? round2(takeProfit) : position.take_profit,
    });
  } catch (error) {
    console.error('Update SL/TP error:', error);
    res.status(500).json({ success: false, error: 'خطأ في تعديل SL/TP' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /positions/open - الحصول على الصفقات المفتوحة
// ═══════════════════════════════════════════════════════════════════
router.get('/positions/open', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const positions = await getUserOpenPositions(userId);

    // جلب السعر الحالي
    let currentPrice = 0;
    try {
      const { getCurrentPrice } = await import('../services/oandaService');
      currentPrice = await getCurrentPrice('XAUUSD');
    } catch (e) { /* ignore */ }

    const positionsWithPnl = positions.map((p: any) => ({
      id: p.id,
      symbol: p.symbol,
      side: p.side,
      lotSize: p.lot_size,
      entryPrice: p.entry_price,
      stopLoss: p.stop_loss,
      takeProfit: p.take_profit,
      openedAt: p.opened_at,
      floatingPnl: currentPrice > 0 ? calculatePnl(p.side, p.entry_price, currentPrice, p.lot_size) : 0,
      margin: calculateMargin(p.entry_price, p.lot_size, 500),
    }));

    res.json({
      success: true,
      positions: positionsWithPnl,
      currentPrice,
    });
  } catch (error) {
    console.error('Get open positions error:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب الصفقات المفتوحة' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /positions/closed - الحصول على الصفقات المغلقة
// ═══════════════════════════════════════════════════════════════════
router.get('/positions/closed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const positions = await getUserClosedPositions(userId, limit);

    const formattedPositions = positions.map((p: any) => ({
      id: p.id,
      symbol: p.symbol,
      side: p.side,
      lotSize: p.lot_size,
      entryPrice: p.entry_price,
      closePrice: p.close_price,
      stopLoss: p.stop_loss,
      takeProfit: p.take_profit,
      openedAt: p.opened_at,
      closedAt: p.closed_at,
      pnl: p.realized_pnl,
      closeReason: p.close_reason,
    }));

    res.json({
      success: true,
      positions: formattedPositions,
    });
  } catch (error) {
    console.error('Get closed positions error:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب الصفقات المغلقة' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /close-all-buy - إغلاق جميع صفقات الشراء
// ═══════════════════════════════════════════════════════════════════
router.post('/close-all-buy', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, error: 'انتظر قليلاً' });
    }

    const positions = await getUserOpenPositions(userId);
    const buyPositions = positions.filter((p: any) => p.side === 'BUY');

    if (buyPositions.length === 0) {
      return res.json({ success: true, message: 'لا توجد صفقات شراء مفتوحة', closedCount: 0 });
    }

    let currentPrice: number;
    try {
      const { getCurrentPrice } = await import('../services/oandaService');
      currentPrice = await getCurrentPrice('XAUUSD');
    } catch (e) {
      return res.status(503).json({ success: false, error: 'لا يمكن جلب السعر الحالي' });
    }

    let totalPnl = 0;
    for (const p of buyPositions) {
      const pnl = calculatePnl('BUY', p.entry_price, currentPrice, p.lot_size);
      await closePositionInDb(p.id, round2(currentPrice), pnl, 'close_all_buy');
      totalPnl += pnl;
      await updateUserTradingStatsDb(userId, pnl);
    }

    const user = await getUserById(userId);
    const newBalance = round2((user.balance ?? 10000) + totalPnl);
    await updateUserBalance(userId, newBalance);

    res.json({
      success: true,
      message: `تم إغلاق ${buyPositions.length} صفقة شراء`,
      closedCount: buyPositions.length,
      totalPnl: round2(totalPnl),
      newBalance,
    });
  } catch (error) {
    console.error('Close all buy error:', error);
    res.status(500).json({ success: false, error: 'خطأ في إغلاق الصفقات' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /close-all-sell - إغلاق جميع صفقات البيع
// ═══════════════════════════════════════════════════════════════════
router.post('/close-all-sell', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, error: 'انتظر قليلاً' });
    }

    const positions = await getUserOpenPositions(userId);
    const sellPositions = positions.filter((p: any) => p.side === 'SELL');

    if (sellPositions.length === 0) {
      return res.json({ success: true, message: 'لا توجد صفقات بيع مفتوحة', closedCount: 0 });
    }

    let currentPrice: number;
    try {
      const { getCurrentPrice } = await import('../services/oandaService');
      currentPrice = await getCurrentPrice('XAUUSD');
    } catch (e) {
      return res.status(503).json({ success: false, error: 'لا يمكن جلب السعر الحالي' });
    }

    let totalPnl = 0;
    for (const p of sellPositions) {
      const pnl = calculatePnl('SELL', p.entry_price, currentPrice, p.lot_size);
      await closePositionInDb(p.id, round2(currentPrice), pnl, 'close_all_sell');
      totalPnl += pnl;
      await updateUserTradingStatsDb(userId, pnl);
    }

    const user = await getUserById(userId);
    const newBalance = round2((user.balance ?? 10000) + totalPnl);
    await updateUserBalance(userId, newBalance);

    res.json({
      success: true,
      message: `تم إغلاق ${sellPositions.length} صفقة بيع`,
      closedCount: sellPositions.length,
      totalPnl: round2(totalPnl),
      newBalance,
    });
  } catch (error) {
    console.error('Close all sell error:', error);
    res.status(500).json({ success: false, error: 'خطأ في إغلاق الصفقات' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /close-profitable - إغلاق جميع الصفقات الرابحة
// ═══════════════════════════════════════════════════════════════════
router.post('/close-profitable', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, error: 'انتظر قليلاً' });
    }

    const positions = await getUserOpenPositions(userId);

    let currentPrice: number;
    try {
      const { getCurrentPrice } = await import('../services/oandaService');
      currentPrice = await getCurrentPrice('XAUUSD');
    } catch (e) {
      return res.status(503).json({ success: false, error: 'لا يمكن جلب السعر الحالي' });
    }

    const profitablePositions = positions.filter((p: any) => {
      const pnl = calculatePnl(p.side, p.entry_price, currentPrice, p.lot_size);
      return pnl > 0;
    });

    if (profitablePositions.length === 0) {
      return res.json({ success: true, message: 'لا توجد صفقات رابحة', closedCount: 0 });
    }

    let totalPnl = 0;
    for (const p of profitablePositions) {
      const pnl = calculatePnl(p.side, p.entry_price, currentPrice, p.lot_size);
      await closePositionInDb(p.id, round2(currentPrice), pnl, 'close_profitable');
      totalPnl += pnl;
      await updateUserTradingStatsDb(userId, pnl);
    }

    const user = await getUserById(userId);
    const newBalance = round2((user.balance ?? 10000) + totalPnl);
    await updateUserBalance(userId, newBalance);

    res.json({
      success: true,
      message: `تم إغلاق ${profitablePositions.length} صفقة رابحة`,
      closedCount: profitablePositions.length,
      totalPnl: round2(totalPnl),
      newBalance,
    });
  } catch (error) {
    console.error('Close profitable error:', error);
    res.status(500).json({ success: false, error: 'خطأ في إغلاق الصفقات' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /close-all - إغلاق جميع الصفقات
// ═══════════════════════════════════════════════════════════════════
router.post('/close-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, error: 'انتظر قليلاً' });
    }

    const positions = await getUserOpenPositions(userId);

    if (positions.length === 0) {
      return res.json({ success: true, message: 'لا توجد صفقات مفتوحة', closedCount: 0 });
    }

    let currentPrice: number;
    try {
      const { getCurrentPrice } = await import('../services/oandaService');
      currentPrice = await getCurrentPrice('XAUUSD');
    } catch (e) {
      return res.status(503).json({ success: false, error: 'لا يمكن جلب السعر الحالي' });
    }

    let totalPnl = 0;
    for (const p of positions) {
      const pnl = calculatePnl(p.side, p.entry_price, currentPrice, p.lot_size);
      await closePositionInDb(p.id, round2(currentPrice), pnl, 'close_all');
      totalPnl += pnl;
      await updateUserTradingStatsDb(userId, pnl);
    }

    const user = await getUserById(userId);
    const newBalance = round2((user.balance ?? 10000) + totalPnl);
    await updateUserBalance(userId, newBalance);

    res.json({
      success: true,
      message: `تم إغلاق ${positions.length} صفقة`,
      closedCount: positions.length,
      totalPnl: round2(totalPnl),
      newBalance,
    });
  } catch (error) {
    console.error('Close all error:', error);
    res.status(500).json({ success: false, error: 'خطأ في إغلاق الصفقات' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /reset - إعادة تعيين حساب التداول
// ═══════════════════════════════════════════════════════════════════
router.post('/reset', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const initialBalance = req.body.initialBalance || 10000;

    if (typeof initialBalance !== 'number' || initialBalance < 100 || initialBalance > 1000000) {
      return res.status(400).json({ success: false, error: 'الرصيد الابتدائي يجب أن يكون بين 100 و 1,000,000' });
    }

    // إغلاق جميع الصفقات المفتوحة بدون تأثير على الرصيد
    const positions = await getUserOpenPositions(userId);
    for (const p of positions) {
      await closePositionInDb(p.id, p.entry_price, 0, 'account_reset');
    }

    // إعادة تعيين الرصيد والإحصائيات
    await updateUserBalance(userId, round2(initialBalance));
    await resetUserTradingStatsDb(userId, round2(initialBalance));

    console.log(`🔄 Account reset for user ${userId}: $${initialBalance}`);

    res.json({
      success: true,
      message: 'تم إعادة تعيين الحساب بنجاح',
      balance: round2(initialBalance),
    });
  } catch (error) {
    console.error('Reset account error:', error);
    res.status(500).json({ success: false, error: 'خطأ في إعادة تعيين الحساب' });
  }
});

export default router;
