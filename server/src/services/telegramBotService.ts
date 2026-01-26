// services/telegramBotService.ts
// خدمة بوت تليجرام للتفاعل مع المستخدمين

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  getUserById,
  getUserByEmail,
  createUser,
  getUserActiveSubscription,
  getAllVipPackages
} from '../db/index';
import { purchaseSubscription } from './subscriptionService';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const fetchFn = globalThis.fetch;

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message: TelegramMessage;
    data: string;
  };
}

/**
 * إرسال رسالة نصية
 */
async function sendMessage(chatId: number, text: string, replyMarkup?: any): Promise<boolean> {
  try {
    const response = await fetchFn(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      })
    });

    const data: any = await response.json();
    return data.ok;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return false;
  }
}

/**
 * الرد على callback query
 */
async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
  try {
    const response = await fetchFn(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || 'تم!'
      })
    });

    const data: any = await response.json();
    return data.ok;
  } catch (error) {
    console.error('❌ Error answering callback:', error);
    return false;
  }
}

/**
 * البحث عن مستخدم بواسطة Telegram ID أو إنشاء حساب جديد
 */
async function getOrCreateUser(telegramUser: TelegramUser): Promise<any> {
  // البحث عن المستخدم باستخدام telegram_id كـ email مؤقت
  const telegramEmail = `telegram_${telegramUser.id}@ict-trader.local`;
  
  // البحث بالـ email
  let user = await getUserByEmail(telegramEmail);
  
  if (!user) {
    // إنشاء مستخدم جديد
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(`telegram_${telegramUser.id}`, 10);
    
    await createUser(userId, telegramEmail, hashedPassword);
    user = await getUserByEmail(telegramEmail);
    
    console.log(`✅ Created new user for Telegram ID: ${telegramUser.id}`);
  }
  
  return user;
}

/**
 * معالج أمر /start
 */
async function handleStartCommand(chatId: number, telegramUser: TelegramUser): Promise<void> {
  // الحصول على المستخدم أو إنشاء حساب جديد
  const user = await getOrCreateUser(telegramUser);
  
  if (!user) {
    await sendMessage(chatId, '❌ حدث خطأ في إنشاء الحساب. يرجى المحاولة لاحقاً.');
    return;
  }

  // التحقق من الاشتراك
  const activeSubscription = await getUserActiveSubscription(user.id);
  
  if (activeSubscription) {
    // المستخدم لديه اشتراك نشط
    const expiryDate = new Date(activeSubscription.expires_at).toLocaleDateString('ar-SA');
    
    await sendMessage(
      chatId,
      `🎉 *مرحباً ${telegramUser.first_name}!*\n\n` +
      `✅ لديك اشتراك نشط: *${activeSubscription.plan_name}*\n` +
      `📅 ينتهي في: ${expiryDate}\n` +
      `💰 رصيدك: ${user.coins} عملة\n\n` +
      `استخدم الأوامر التالية:\n` +
      `/analyze - طلب تحليل جديد\n` +
      `/status - عرض حالة الاشتراك\n` +
      `/packages - عرض الباقات المتاحة`
    );
  } else {
    // المستخدم ليس لديه اشتراك - عرض الباقات
    await showPackages(chatId, user);
  }
}

/**
 * عرض الباقات المتاحة
 */
async function showPackages(chatId: number, user: any): Promise<void> {
  const packages = await getAllVipPackages();
  
  if (packages.length === 0) {
    await sendMessage(chatId, '❌ لا توجد باقات متاحة حالياً.');
    return;
  }

  let message = `🎁 *الباقات المتاحة*\n\n`;
  message += `💰 رصيدك الحالي: ${user.coins} عملة\n\n`;
  
  const keyboard = {
    inline_keyboard: packages.map((pkg: any) => [{
      text: `${pkg.name_ar} - ${pkg.price}`,
      callback_data: `buy_${pkg.id}`
    }])
  };

  packages.forEach((pkg: any) => {
    message += `📦 *${pkg.name_ar}*\n`;
    message += `💵 السعر: ${pkg.price}\n`;
    message += `⏰ المدة: ${pkg.duration_days} يوم\n`;
    message += `💎 عملات مجانية: ${pkg.coins_included}\n`;
    
    if (pkg.analysis_limit === -1) {
      message += `📊 التحليلات: غير محدودة\n`;
    } else {
      message += `📊 التحليلات: ${pkg.analysis_limit} يومياً\n`;
    }
    
    message += `\n`;
  });

  message += `\n👇 اختر الباقة المناسبة لك:`;

  await sendMessage(chatId, message, keyboard);
}

/**
 * معالج شراء الباقة
 */
async function handlePackagePurchase(chatId: number, telegramUser: TelegramUser, packageId: string, callbackQueryId: string): Promise<void> {
  const user = await getOrCreateUser(telegramUser);
  
  if (!user) {
    await answerCallbackQuery(callbackQueryId, '❌ خطأ في الحساب');
    return;
  }

  // محاولة شراء الباقة
  const result = await purchaseSubscription({
    packageId,
    userId: user.id,
    autoRenew: false
  });

  if (result.success) {
    await answerCallbackQuery(callbackQueryId, '✅ تم تفعيل الاشتراك!');
    
    const expiryDate = result.expiresAt ? new Date(result.expiresAt).toLocaleDateString('ar-SA') : '';
    
    await sendMessage(
      chatId,
      `🎉 *تم تفعيل اشتراكك بنجاح!*\n\n` +
      `✅ ${result.message}\n` +
      `📅 ينتهي في: ${expiryDate}\n\n` +
      `يمكنك الآن استخدام:\n` +
      `/analyze - طلب تحليل\n` +
      `/status - عرض حالة الاشتراك`
    );
  } else {
    await answerCallbackQuery(callbackQueryId, '❌ فشل التفعيل');
    await sendMessage(chatId, `❌ ${result.message}\n\nيرجى التواصل مع الدعم الفني.`);
  }
}

/**
 * معالج أمر /status
 */
async function handleStatusCommand(chatId: number, telegramUser: TelegramUser): Promise<void> {
  const user = await getOrCreateUser(telegramUser);
  
  if (!user) {
    await sendMessage(chatId, '❌ حدث خطأ. يرجى المحاولة لاحقاً.');
    return;
  }

  const activeSubscription = await getUserActiveSubscription(user.id);
  
  let message = `📊 *حالة حسابك*\n\n`;
  message += `👤 الاسم: ${telegramUser.first_name}\n`;
  message += `💰 الرصيد: ${user.coins} عملة\n\n`;
  
  if (activeSubscription) {
    const expiryDate = new Date(activeSubscription.expires_at).toLocaleDateString('ar-SA');
    message += `✅ *الاشتراك النشط*\n`;
    message += `📦 الباقة: ${activeSubscription.plan_name}\n`;
    message += `📅 ينتهي في: ${expiryDate}\n`;
    
    if (activeSubscription.analysis_limit === -1) {
      message += `📊 التحليلات: غير محدودة\n`;
    } else {
      message += `📊 التحليلات: ${activeSubscription.analysis_limit} يومياً\n`;
    }
  } else {
    message += `⚠️ *لا يوجد اشتراك نشط*\n`;
    message += `استخدم /packages لعرض الباقات المتاحة`;
  }

  await sendMessage(chatId, message);
}

/**
 * معالج أمر /packages
 */
async function handlePackagesCommand(chatId: number, telegramUser: TelegramUser): Promise<void> {
  const user = await getOrCreateUser(telegramUser);
  
  if (!user) {
    await sendMessage(chatId, '❌ حدث خطأ. يرجى المحاولة لاحقاً.');
    return;
  }

  await showPackages(chatId, user);
}

/**
 * معالج التحديثات من تليجرام
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  try {
    // معالجة الرسائل النصية
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const user = update.message.from;

      if (text === '/start') {
        await handleStartCommand(chatId, user);
      } else if (text === '/status') {
        await handleStatusCommand(chatId, user);
      } else if (text === '/packages') {
        await handlePackagesCommand(chatId, user);
      } else {
        await sendMessage(chatId, 'استخدم /start للبدء');
      }
    }

    // معالجة callback queries (أزرار inline)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      const user = callbackQuery.from;

      if (data.startsWith('buy_')) {
        const packageId = data.replace('buy_', '');
        await handlePackagePurchase(chatId, user, packageId, callbackQuery.id);
      }
    }
  } catch (error) {
    console.error('❌ Error handling Telegram update:', error);
  }
}

/**
 * إعداد webhook للبوت
 */
export async function setupTelegramWebhook(webhookUrl: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetchFn(`${TELEGRAM_API_URL}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });

    const data: any = await response.json();
    
    if (data.ok) {
      console.log('✅ Telegram webhook set successfully:', webhookUrl);
      return true;
    } else {
      console.error('❌ Failed to set webhook:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
    return false;
  }
}

/**
 * الحصول على معلومات webhook
 */
export async function getWebhookInfo(): Promise<any> {
  if (!TELEGRAM_BOT_TOKEN) {
    return null;
  }

  try {
    const response = await fetchFn(`${TELEGRAM_API_URL}/getWebhookInfo`);
    const data: any = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('❌ Error getting webhook info:', error);
    return null;
  }
}

export default {
  handleTelegramUpdate,
  setupTelegramWebhook,
  getWebhookInfo
};
