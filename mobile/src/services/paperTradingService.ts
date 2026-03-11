import * as SecureStore from 'expo-secure-store';
import { PaperPosition, PaperTradingAccount, PositionSide } from '../types';

const STORAGE_KEY = 'paper_trading_state_v1';
const DEFAULT_INITIAL_BALANCE = 10000;
const CONTRACT_SIZE = 100;
const LEVERAGE = 500; // رافعة مالية 500
const MARGIN_CALL_PERCENT = 0.20; // 20% من الرصيد

interface PaperTradingState {
  initialBalance: number;
  balance: number;
  nextId: number;
  openPositions: PaperPosition[];
  closedPositions: PaperPosition[];
}

const defaultState = (): PaperTradingState => ({
  initialBalance: DEFAULT_INITIAL_BALANCE,
  balance: DEFAULT_INITIAL_BALANCE,
  nextId: 1,
  openPositions: [],
  closedPositions: [],
});

const round2 = (value: number) => Number(value.toFixed(2));

const getDirectionMultiplier = (side: PositionSide) => (side === 'BUY' ? 1 : -1);

const calculatePnl = (position: PaperPosition, currentPrice: number): number => {
  const delta = (currentPrice - position.entryPrice) * getDirectionMultiplier(position.side);
  return round2(delta * position.lotSize * CONTRACT_SIZE);
};

const calculateUsedMargin = (positions: PaperPosition[]): number => {
  return round2(
    positions.reduce((total, position) => {
      const margin = (position.entryPrice * position.lotSize * CONTRACT_SIZE) / LEVERAGE;
      return total + margin;
    }, 0)
  );
};

const loadState = async (): Promise<PaperTradingState> => {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }

    const parsed = JSON.parse(raw) as PaperTradingState;
    if (
      typeof parsed.balance !== 'number' ||
      typeof parsed.initialBalance !== 'number' ||
      !Array.isArray(parsed.openPositions) ||
      !Array.isArray(parsed.closedPositions)
    ) {
      return defaultState();
    }

    return parsed;
  } catch {
    return defaultState();
  }
};

const saveState = async (state: PaperTradingState): Promise<void> => {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
};

const buildAccountSnapshot = (state: PaperTradingState, marketPrice: number): PaperTradingAccount => {
  const floatingPnl = round2(
    state.openPositions.reduce((total, position) => total + calculatePnl(position, marketPrice), 0)
  );
  const usedMargin = calculateUsedMargin(state.openPositions);
  const equity = round2(state.balance + floatingPnl);
  const freeMargin = round2(equity - usedMargin);
  const closedPnl = round2(state.balance - state.initialBalance);

  return {
    initialBalance: state.initialBalance,
    balance: round2(state.balance),
    equity,
    floatingPnl,
    closedPnl,
    usedMargin,
    freeMargin,
    openPositionsCount: state.openPositions.length,
  };
};

interface OpenPositionInput {
  symbol: string;
  side: PositionSide;
  lotSize: number;
  marketPrice: number;
  stopLoss: number;
  takeProfit: number;
}

const openPosition = async (input: OpenPositionInput): Promise<PaperPosition> => {
  const state = await loadState();
  
  // حساب الـ equity الحالي
  const account = buildAccountSnapshot(state, input.marketPrice);
  
  // حساب الهامش المطلوب للصفقة الجديدة
  const requiredMargin = (input.marketPrice * input.lotSize * CONTRACT_SIZE) / LEVERAGE;
  
  // التحقق من توفر الهامش الكافي
  if (requiredMargin > account.freeMargin) {
    throw new Error('الهامش غير كافٍ لفتح هذه الصفقة');
  }

  const position: PaperPosition = {
    id: `pos_${Date.now()}_${state.nextId}`,
    symbol: input.symbol,
    side: input.side,
    lotSize: input.lotSize,
    entryPrice: round2(input.marketPrice),
    stopLoss: round2(input.stopLoss),
    takeProfit: round2(input.takeProfit),
    openedAt: new Date().toISOString(),
    status: 'open',
  };

  state.nextId += 1;
  state.openPositions = [position, ...state.openPositions];

  await saveState(state);
  return position;
};

const closePosition = async (positionId: string, marketPrice: number): Promise<PaperPosition | null> => {
  const state = await loadState();
  const index = state.openPositions.findIndex((p) => p.id === positionId);

  if (index === -1) {
    return null;
  }

  const position = state.openPositions[index];
  const realizedPnl = calculatePnl(position, marketPrice);

  const closedPosition: PaperPosition = {
    ...position,
    status: 'closed',
    closePrice: round2(marketPrice),
    closedAt: new Date().toISOString(),
    realizedPnl,
  };

  state.balance = round2(state.balance + realizedPnl);
  state.openPositions.splice(index, 1);
  state.closedPositions = [closedPosition, ...state.closedPositions].slice(0, 100);

  await saveState(state);
  return closedPosition;
};

const autoCloseTriggeredPositions = async (marketPrice: number): Promise<PaperPosition[]> => {
  const state = await loadState();
  
  // فحص نظام الهامش - إغلاق جميع المراكز عند 20%
  const account = buildAccountSnapshot(state, marketPrice);
  const marginLevel = account.usedMargin > 0 ? (account.equity / account.usedMargin) : Infinity;
  
  if (marginLevel <= MARGIN_CALL_PERCENT && state.openPositions.length > 0) {
    // إغلاق جميع المراكز بسبب Margin Call
    const closedPositions: PaperPosition[] = [];
    for (const position of state.openPositions) {
      const realizedPnl = calculatePnl(position, marketPrice);
      const closedPosition: PaperPosition = {
        ...position,
        status: 'closed',
        closePrice: round2(marketPrice),
        closedAt: new Date().toISOString(),
        realizedPnl,
      };
      closedPositions.push(closedPosition);
    }
    
    state.openPositions = [];
    state.closedPositions = [...closedPositions, ...state.closedPositions].slice(0, 100);
    state.balance = round2(
      state.balance + closedPositions.reduce((sum, position) => sum + (position.realizedPnl || 0), 0)
    );
    
    await saveState(state);
    return closedPositions;
  }
  
  // الإغلاق العادي عند SL/TP
  const toClose = state.openPositions.filter((position) => {
    if (position.side === 'BUY') {
      return marketPrice <= position.stopLoss || marketPrice >= position.takeProfit;
    }
    return marketPrice >= position.stopLoss || marketPrice <= position.takeProfit;
  });

  if (toClose.length === 0) {
    return [];
  }

  const closedPositions: PaperPosition[] = [];
  for (const position of toClose) {
    const realizedPnl = calculatePnl(position, marketPrice);
    const closedPosition: PaperPosition = {
      ...position,
      status: 'closed',
      closePrice: round2(marketPrice),
      closedAt: new Date().toISOString(),
      realizedPnl,
    };

    closedPositions.push(closedPosition);
  }

  const closingIds = new Set(closedPositions.map((position) => position.id));
  state.openPositions = state.openPositions.filter((position) => !closingIds.has(position.id));
  state.closedPositions = [...closedPositions, ...state.closedPositions].slice(0, 100);
  state.balance = round2(
    state.balance + closedPositions.reduce((sum, position) => sum + (position.realizedPnl || 0), 0)
  );

  await saveState(state);
  return closedPositions;
};

const resetAccount = async (initialBalance: number = DEFAULT_INITIAL_BALANCE): Promise<void> => {
  const state: PaperTradingState = {
    initialBalance: round2(initialBalance),
    balance: round2(initialBalance),
    nextId: 1,
    openPositions: [],
    closedPositions: [],
  };

  await saveState(state);
};

const getSnapshot = async (marketPrice: number): Promise<{
  account: PaperTradingAccount;
  openPositions: PaperPosition[];
  closedPositions: PaperPosition[];
}> => {
  const state = await loadState();
  const account = buildAccountSnapshot(state, marketPrice);

  return {
    account,
    openPositions: state.openPositions,
    closedPositions: state.closedPositions,
  };
};

const getPositionFloatingPnl = (position: PaperPosition, marketPrice: number): number => {
  return calculatePnl(position, marketPrice);
};

// حساب حجم اللوت الأمثل بناءً على الـ equity والرافعة المالية
const calculateOptimalLotSize = (equity: number, marketPrice: number, riskPercent: number = 0.02): number => {
  // استخدام 2% من الـ equity كحد أقصى للمخاطرة
  const maxRisk = equity * riskPercent;
  
  // حساب الهامش المتاح مع الرافعة
  const availableMargin = equity / LEVERAGE;
  
  // حساب حجم اللوت بناءً على الهامش المتاح
  const lotSize = (availableMargin * LEVERAGE) / (marketPrice * CONTRACT_SIZE);
  
  // تقريب إلى رقمين عشريين
  return Math.min(round2(lotSize), 50); // حد أقصى 50 لوت
};

// إغلاق جميع المراكز الرابحة
const closeProfitablePositions = async (marketPrice: number): Promise<PaperPosition[]> => {
  const state = await loadState();
  const profitablePositions = state.openPositions.filter((position) => {
    const pnl = calculatePnl(position, marketPrice);
    return pnl > 0;
  });

  if (profitablePositions.length === 0) {
    return [];
  }

  const closedPositions: PaperPosition[] = [];
  for (const position of profitablePositions) {
    const realizedPnl = calculatePnl(position, marketPrice);
    const closedPosition: PaperPosition = {
      ...position,
      status: 'closed',
      closePrice: round2(marketPrice),
      closedAt: new Date().toISOString(),
      realizedPnl,
    };
    closedPositions.push(closedPosition);
  }

  const closingIds = new Set(closedPositions.map((p) => p.id));
  state.openPositions = state.openPositions.filter((p) => !closingIds.has(p.id));
  state.closedPositions = [...closedPositions, ...state.closedPositions].slice(0, 100);
  state.balance = round2(
    state.balance + closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0)
  );

  await saveState(state);
  return closedPositions;
};

// إغلاق جميع مراكز الشراء
const closeAllBuyPositions = async (marketPrice: number): Promise<PaperPosition[]> => {
  const state = await loadState();
  const buyPositions = state.openPositions.filter((p) => p.side === 'BUY');

  if (buyPositions.length === 0) {
    return [];
  }

  const closedPositions: PaperPosition[] = [];
  for (const position of buyPositions) {
    const realizedPnl = calculatePnl(position, marketPrice);
    const closedPosition: PaperPosition = {
      ...position,
      status: 'closed',
      closePrice: round2(marketPrice),
      closedAt: new Date().toISOString(),
      realizedPnl,
    };
    closedPositions.push(closedPosition);
  }

  state.openPositions = state.openPositions.filter((p) => p.side !== 'BUY');
  state.closedPositions = [...closedPositions, ...state.closedPositions].slice(0, 100);
  state.balance = round2(
    state.balance + closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0)
  );

  await saveState(state);
  return closedPositions;
};

// إغلاق جميع مراكز البيع
const closeAllSellPositions = async (marketPrice: number): Promise<PaperPosition[]> => {
  const state = await loadState();
  const sellPositions = state.openPositions.filter((p) => p.side === 'SELL');

  if (sellPositions.length === 0) {
    return [];
  }

  const closedPositions: PaperPosition[] = [];
  for (const position of sellPositions) {
    const realizedPnl = calculatePnl(position, marketPrice);
    const closedPosition: PaperPosition = {
      ...position,
      status: 'closed',
      closePrice: round2(marketPrice),
      closedAt: new Date().toISOString(),
      realizedPnl,
    };
    closedPositions.push(closedPosition);
  }

  state.openPositions = state.openPositions.filter((p) => p.side !== 'SELL');
  state.closedPositions = [...closedPositions, ...state.closedPositions].slice(0, 100);
  state.balance = round2(
    state.balance + closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0)
  );

  await saveState(state);
  return closedPositions;
};

// تعديل SL/TP لصفقة موجودة
const updatePosition = async (
  positionId: string,
  updates: { stopLoss?: number; takeProfit?: number }
): Promise<PaperPosition | null> => {
  const state = await loadState();
  const index = state.openPositions.findIndex((p) => p.id === positionId);

  if (index === -1) {
    return null;
  }

  const position = state.openPositions[index];
  
  if (updates.stopLoss !== undefined) {
    position.stopLoss = round2(updates.stopLoss);
  }
  
  if (updates.takeProfit !== undefined) {
    position.takeProfit = round2(updates.takeProfit);
  }

  state.openPositions[index] = position;
  await saveState(state);
  
  return position;
};

// إغلاق جزئي للصفقة
const partialClosePosition = async (
  positionId: string,
  closeLotSize: number,
  marketPrice: number
): Promise<{ closedPosition: PaperPosition; remainingPosition: PaperPosition | null } | null> => {
  const state = await loadState();
  const index = state.openPositions.findIndex((p) => p.id === positionId);

  if (index === -1) {
    return null;
  }

  const position = state.openPositions[index];
  
  // التحقق من أن حجم الإغلاق أقل من حجم الصفقة
  if (closeLotSize >= position.lotSize) {
    throw new Error('حجم الإغلاق يجب أن يكون أقل من حجم الصفقة الكلي');
  }
  
  if (closeLotSize <= 0) {
    throw new Error('حجم الإغلاق يجب أن يكون أكبر من صفر');
  }

  // حساب الربح/الخسارة للجزء المغلق
  const delta = (marketPrice - position.entryPrice) * getDirectionMultiplier(position.side);
  const partialPnl = round2(delta * closeLotSize * CONTRACT_SIZE);

  // إنشاء صفقة مغلقة للجزء المغلق
  const closedPosition: PaperPosition = {
    ...position,
    id: `${position.id}_partial_${Date.now()}`,
    lotSize: round2(closeLotSize),
    status: 'closed',
    closePrice: round2(marketPrice),
    closedAt: new Date().toISOString(),
    realizedPnl: partialPnl,
  };

  // تحديث الصفقة المتبقية
  const remainingLotSize = round2(position.lotSize - closeLotSize);
  
  if (remainingLotSize > 0) {
    position.lotSize = remainingLotSize;
    state.openPositions[index] = position;
  } else {
    // إذا لم يتبق شيء، احذف الصفقة
    state.openPositions.splice(index, 1);
  }

  // تحديث الرصيد
  state.balance = round2(state.balance + partialPnl);
  state.closedPositions = [closedPosition, ...state.closedPositions].slice(0, 100);

  await saveState(state);
  
  return {
    closedPosition,
    remainingPosition: remainingLotSize > 0 ? position : null,
  };
};

export const paperTradingService = {
  getSnapshot,
  openPosition,
  closePosition,
  updatePosition,
  partialClosePosition,
  autoCloseTriggeredPositions,
  resetAccount,
  getPositionFloatingPnl,
  calculateOptimalLotSize,
  closeProfitablePositions,
  closeAllBuyPositions,
  closeAllSellPositions,
  loadState,
  saveState,
};
