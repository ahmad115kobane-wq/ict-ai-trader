// services/positionMonitorService.ts - Position Monitoring Service
// ═══════════════════════════════════════════════════════════════════════════════
// ✅ مراقبة الصفقات المفتوحة وإغلاقها عند SL/TP
// ✅ يعمل على الخادم بشكل مستمر
// ✅ يتحقق من الأسعار كل 5 ثوان
// ═══════════════════════════════════════════════════════════════════════════════

import { getCurrentPrice } from './oandaService';
import { 
  getAllOpenPositions, 
  closePositionInDb, 
  updateUserBalance 
} from '../db/index';

console.log("🔍 Position Monitor Service v1.0 - Server-Side SL/TP");

// ===================== Configuration =====================
const CHECK_INTERVAL = 5000; // 5 ثوان
const CONTRACT_SIZE = 100;
const LEVERAGE = 500;
const MARGIN_CALL_PERCENT = 0.20; // 20%

let isMonitoring = false;
let monitoringInterval: NodeJS.Timeout | null = null;

// ═══════════════════════════════════════════════════════════════════════════════
// 🧮 حساب الربح/الخسارة
// ═══════════════════════════════════════════════════════════════════════════════

function calculatePnl(
  entryPrice: number,
  currentPrice: number,
  lotSize: number,
  side: 'BUY' | 'SELL'
): number {
  const direction = side === 'BUY' ? 1 : -1;
  const delta = (currentPrice - entryPrice) * direction;
  return Number((delta * lotSize * CONTRACT_SIZE).toFixed(2));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 فحص صفقة واحدة
// ═══════════════════════════════════════════════════════════════════════════════

function shouldClosePosition(
  position: any,
  currentPrice: number
): { shouldClose: boolean; reason: string } {
  const { side, stop_loss, take_profit } = position;

  if (side === 'BUY') {
    if (currentPrice <= stop_loss) {
      return { shouldClose: true, reason: 'Stop Loss' };
    }
    if (currentPrice >= take_profit) {
      return { shouldClose: true, reason: 'Take Profit' };
    }
  } else if (side === 'SELL') {
    if (currentPrice >= stop_loss) {
      return { shouldClose: true, reason: 'Stop Loss' };
    }
    if (currentPrice <= take_profit) {
      return { shouldClose: true, reason: 'Take Profit' };
    }
  }

  return { shouldClose: false, reason: '' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 فحص Margin Call
// ═══════════════════════════════════════════════════════════════════════════════

function checkMarginCall(
  balance: number,
  openPositions: any[],
  currentPrice: number
): boolean {
  // حساب الـ floating PnL
  let floatingPnl = 0;
  let usedMargin = 0;

  for (const position of openPositions) {
    const pnl = calculatePnl(
      position.entry_price,
      currentPrice,
      position.lot_size,
      position.side
    );
    floatingPnl += pnl;

    // حساب الهامش المستخدم
    const margin = (position.entry_price * position.lot_size * CONTRACT_SIZE) / LEVERAGE;
    usedMargin += margin;
  }

  const equity = balance + floatingPnl;
  const marginLevel = usedMargin > 0 ? equity / usedMargin : Infinity;

  return marginLevel <= MARGIN_CALL_PERCENT;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 مراقبة جميع الصفقات
// ═══════════════════════════════════════════════════════════════════════════════

async function monitorAllPositions() {
  try {
    // 1. جلب جميع الصفقات المفتوحة
    const openPositions = await getAllOpenPositions();

    if (!openPositions || openPositions.length === 0) {
      return;
    }

    console.log(`\n🔍 فحص ${openPositions.length} صفقة مفتوحة...`);

    // 2. جلب السعر الحالي
    const currentPrice = await getCurrentPrice('XAUUSD');

    if (!currentPrice || typeof currentPrice !== 'number') {
      console.error('❌ فشل جلب السعر الحالي');
      return;
    }

    console.log(`💰 السعر الحالي: ${currentPrice.toFixed(2)}`);

    // 3. تجميع الصفقات حسب المستخدم
    const userPositions = new Map<string, any[]>();
    for (const position of openPositions) {
      const userId = position.user_id;
      if (!userPositions.has(userId)) {
        userPositions.set(userId, []);
      }
      userPositions.get(userId)!.push(position);
    }

    // 4. فحص كل مستخدم
    for (const [userId, positions] of userPositions.entries()) {
      const userBalance = positions[0].balance || 10000; // الرصيد من أول صفقة

      // فحص Margin Call
      const isMarginCall = checkMarginCall(userBalance, positions, currentPrice);

      if (isMarginCall) {
        console.log(`\n⚠️ Margin Call للمستخدم ${userId} - إغلاق جميع الصفقات`);
        
        // إغلاق جميع صفقات المستخدم
        let totalPnl = 0;
        for (const position of positions) {
          const pnl = calculatePnl(
            position.entry_price,
            currentPrice,
            position.lot_size,
            position.side
          );
          totalPnl += pnl;

          await closePositionInDb(
            position.id,
            currentPrice,
            pnl,
            'Margin Call'
          );

          console.log(`   ✅ أغلقت ${position.id}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}$`);
        }

        // تحديث رصيد المستخدم
        const newBalance = userBalance + totalPnl;
        await updateUserBalance(userId, newBalance);
        
        console.log(`   💰 الرصيد الجديد: ${newBalance.toFixed(2)}$`);
        continue;
      }

      // فحص SL/TP لكل صفقة
      for (const position of positions) {
        const check = shouldClosePosition(position, currentPrice);

        if (check.shouldClose) {
          const pnl = calculatePnl(
            position.entry_price,
            currentPrice,
            position.lot_size,
            position.side
          );

          await closePositionInDb(
            position.id,
            currentPrice,
            pnl,
            check.reason
          );

          // تحديث رصيد المستخدم
          const newBalance = userBalance + pnl;
          await updateUserBalance(userId, newBalance);

          console.log(
            `✅ ${check.reason}: ${position.symbol} ${position.side} ` +
            `${position.lot_size} lots | PnL: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}$ | ` +
            `الرصيد: ${newBalance.toFixed(2)}$`
          );
        }
      }
    }

  } catch (error: any) {
    console.error('❌ خطأ في مراقبة الصفقات:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 بدء المراقبة
// ═══════════════════════════════════════════════════════════════════════════════

export function startPositionMonitoring() {
  if (isMonitoring) {
    console.log('⚠️ المراقبة تعمل بالفعل');
    return;
  }

  console.log('\n🚀 بدء مراقبة الصفقات على الخادم...');
  console.log(`⏰ فحص كل ${CHECK_INTERVAL / 1000} ثانية\n`);

  isMonitoring = true;

  // تشغيل الفحص الأول فوراً
  monitorAllPositions().catch(err => {
    console.error('❌ خطأ في الفحص الأول:', err);
  });

  // جدولة الفحص الدوري
  monitoringInterval = setInterval(() => {
    monitorAllPositions().catch(err => {
      console.error('❌ خطأ في الفحص الدوري:', err);
    });
  }, CHECK_INTERVAL);

  console.log('✅ نظام مراقبة الصفقات يعمل الآن! 🎯\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛑 إيقاف المراقبة
// ═══════════════════════════════════════════════════════════════════════════════

export function stopPositionMonitoring() {
  if (!isMonitoring) {
    console.log('⚠️ المراقبة غير مفعلة');
    return;
  }

  console.log('🛑 إيقاف مراقبة الصفقات...');

  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  isMonitoring = false;
  console.log('✅ تم إيقاف المراقبة');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 حالة المراقبة
// ═══════════════════════════════════════════════════════════════════════════════

export function getMonitoringStatus() {
  return {
    isMonitoring,
    checkInterval: CHECK_INTERVAL,
    leverage: LEVERAGE,
    marginCallPercent: MARGIN_CALL_PERCENT
  };
}
