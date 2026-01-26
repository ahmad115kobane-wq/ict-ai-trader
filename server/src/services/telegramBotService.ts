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
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });

    const data: any = await response.json();
    
    if (!data.ok) {
      console.error('❌ Telegram API error:', data);
    }
    
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
  try {
    // البحث عن المستخدم باستخدام telegram_id كـ email مؤقت
    const telegramEmail = `telegram_${telegramUser.id}@ict-trader.local`;
    
    // البحث بالـ email
    let user = await getUserByEmail(telegramEmail);
    
    if (!user) {
      // إنشاء مستخدم جديد
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(`telegram_${telegramUser.id}`, 10);
      
      try {
        await createUser(userId, telegramEmail, hashedPassword);
        user = await getUserByEmail(telegramEmail);
        console.log(`✅ Created new user for Telegram ID: ${telegramUser.id}`);
      } catch (createError: any) {
        // إذا كان الخطأ هو duplicate key، نحاول جلب المستخدم مرة أخرى
        if (createError.code === '23505') {
          console.log(`⚠️ User already exists, fetching: ${telegramEmail}`);
          user = await getUserByEmail(telegramEmail);
        } else {
          throw createError;
        }
      }
    }
    
    return user;
  } catch (error) {
    console.error('❌ Error in getOrCreateUser:', error);
    throw error;
  }
}

/**
 * معالج أمر /start
 */
async function handleStartCommand(chatId: number, telegramUser: TelegramUser): Promise<void> {
  try {
    console.log(`🔄 Processing /start for user: ${telegramUser.id}`);
    
    // الحصول على المستخدم أو إنشاء حساب جديد
    const user = await getOrCreateUser(telegramUser);
    
    if (!user) {
      console.log(`❌ Failed to get/create user for: ${telegramUser.id}`);
      await sendMessage(chatId, '❌ حدث خطأ في إنشاء الحساب. يرجى المحاولة لاحقاً.');
      return;
    }

    console.log(`✅ User found/created: ${user.email}`);

    // التحقق من الاشتراك
    const activeSubscription = await getUserActiveSubscription(user.id);
    
    if (activeSubscription) {
      console.log(`✅ User has active subscription: ${activeSubscription.plan_name}`);
      // المستخدم لديه اشتراك نشط
      const expiryDate = new Date(activeSubscription.expires_at).toLocaleDateString('ar-SA');
      
      // إنشاء أزرار
      const autoStatus = user.auto_analysis_enabled ? '⏸️ إيقاف' : '▶️ تفعيل';
      const keyboard = {
        inline_keyboard: [
          [{
            text: `${autoStatus} التحليل التلقائي`,
            callback_data: 'toggle_auto'
          }],
          [{
            text: '📊 تفاصيل اشتراكي',
            callback_data: 'subscription_details'
          }]
        ]
      };
      
      await sendMessage(
        chatId,
        `🎉 <b>مرحباً ${telegramUser.first_name}!</b>\n\n` +
        `✅ لديك اشتراك نشط: <b>${activeSubscription.plan_name}</b>\n` +
        `📅 ينتهي في: ${expiryDate}\n` +
        `💰 رصيدك: ${user.coins} عملة\n\n` +
        `🤖 التحليل التلقائي: ${user.auto_analysis_enabled ? '✅ مفعّل' : '⏸️ متوقف'}\n\n` +
        `استخدم الأزرار أدناه للتحكم في حسابك:`,
        keyboard
      );
      console.log(`✅ Sent subscription info to user: ${telegramUser.id}`);
    } else {
      console.log(`ℹ️ User has no subscription, showing packages`);
      // المستخدم ليس لديه اشتراك - عرض الباقات
      await showPackages(chatId, user);
      console.log(`✅ Sent packages to user: ${telegramUser.id}`);
    }
  } catch (error) {
    console.error(`❌ Error in handleStartCommand:`, error);
    await sendMessage(chatId, '❌ حدث خطأ. يرجى المحاولة لاحقاً.');
  }
}

/**
 * عرض الباقات المتاحة
 */
async function showPackages(chatId: number, user: any): Promise<void> {
  try {
    console.log(`🔄 Fetching packages for user: ${user.email}`);
    const packages = await getAllVipPackages();
    
    if (packages.length === 0) {
      console.log(`⚠️ No packages available`);
      await sendMessage(chatId, '❌ لا توجد باقات متاحة حالياً.');
      return;
    }

    console.log(`✅ Found ${packages.length} packages`);

    let message = `🎁 <b>الباقات المتاحة</b>\n\n`;
    message += `💰 رصيدك الحالي: ${user.coins} عملة\n\n`;
    
    packages.forEach((pkg: any) => {
      message += `📦 <b>${pkg.name_ar}</b>\n`;
      message += `💵 السعر: ${pkg.price} عملة\n`;
      message += `⏰ المدة: ${pkg.duration_days} يوم\n`;
      message += `💎 عملات مجانية: ${pkg.coins_included}\n`;
      
      if (pkg.analysis_limit === -1) {
        message += `📊 التحليلات: غير محدودة\n`;
      } else {
        message += `📊 التحليلات: ${pkg.analysis_limit} يومياً\n`;
      }
      
      message += `\n`;
    });

    message += `👇 اختر الباقة المناسبة لك:`;

    // إنشاء الأزرار
    const keyboard = {
      inline_keyboard: packages.map((pkg: any) => [{
        text: `${pkg.name_ar} - ${pkg.price} عملة`,
        callback_data: `buy_${pkg.id}`
      }])
    };

    console.log(`📤 Sending packages message with keyboard to chat: ${chatId}`);
    const result = await sendMessage(chatId, message, keyboard);
    console.log(`✅ Message send result: ${result}`);
  } catch (error) {
    console.error(`❌ Error in showPackages:`, error);
    await sendMessage(chatId, '❌ حدث خطأ في عرض الباقات.');
  }
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

  // التحقق من وجود اشتراك نشط
  const activeSubscription = await getUserActiveSubscription(user.id);
  
  if (activeSubscription) {
    await answerCallbackQuery(callbackQueryId, '⚠️ لديك اشتراك نشط بالفعل');
    await sendMessage(
      chatId,
      `⚠️ <b>لديك اشتراك نشط بالفعل</b>\n\n` +
      `📦 الباقة الحالية: <b>${activeSubscription.plan_name}</b>\n` +
      `📅 ينتهي في: ${new Date(activeSubscription.expires_at).toLocaleDateString('ar-SA')}\n\n` +
      `لا يمكنك شراء باقة جديدة حتى تنتهي الباقة الحالية.`
    );
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
    
    // إنشاء زر التحليل التلقائي
    const keyboard = {
      inline_keyboard: [[
        {
          text: '▶️ تفعيل التحليل التلقائي',
          callback_data: 'toggle_auto'
        }
      ]]
    };
    
    await sendMessage(
      chatId,
      `🎉 <b>تم تفعيل اشتراكك بنجاح!</b>\n\n` +
      `✅ ${result.message}\n` +
      `📅 ينتهي في: ${expiryDate}\n\n` +
      `يمكنك الآن تفعيل التحليل التلقائي لاستلام إشارات التداول:`,
      keyboard
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
 * معالج زر تفاصيل الاشتراك
 */
async function handleSubscriptionDetails(chatId: number, telegramUser: TelegramUser, callbackQueryId: string): Promise<void> {
  try {
    const user = await getOrCreateUser(telegramUser);
    
    if (!user) {
      await answerCallbackQuery(callbackQueryId, '❌ خطأ في الحساب');
      return;
    }

    const activeSubscription = await getUserActiveSubscription(user.id);
    
    if (!activeSubscription) {
      await answerCallbackQuery(callbackQueryId, '⚠️ لا يوجد اشتراك نشط');
      await sendMessage(
        chatId,
        '⚠️ <b>لا يوجد اشتراك نشط</b>\n\n' +
        'للحصول على اشتراك، استخدم /packages لعرض الباقات المتاحة.'
      );
      return;
    }

    await answerCallbackQuery(callbackQueryId, '📊 تفاصيل الاشتراك');

    const expiryDate = new Date(activeSubscription.expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const keyboard = {
      inline_keyboard: [[
        {
          text: '🔙 رجوع',
          callback_data: 'back_to_main'
        }
      ]]
    };

    await sendMessage(
      chatId,
      `📊 <b>تفاصيل اشتراكك</b>\n\n` +
      `📦 <b>الباقة:</b> ${activeSubscription.plan_name}\n` +
      `💰 <b>السعر المدفوع:</b> ${activeSubscription.price} عملة\n` +
      `📅 <b>تاريخ البدء:</b> ${new Date(activeSubscription.created_at).toLocaleDateString('ar-SA')}\n` +
      `⏰ <b>تاريخ الانتهاء:</b> ${expiryDate.toLocaleDateString('ar-SA')}\n` +
      `⏳ <b>الأيام المتبقية:</b> ${daysRemaining} يوم\n\n` +
      `💎 <b>رصيدك الحالي:</b> ${user.coins} عملة\n` +
      `🤖 <b>التحليل التلقائي:</b> ${user.auto_analysis_enabled ? '✅ مفعّل' : '⏸️ متوقف'}\n\n` +
      `📈 <b>الميزات:</b>\n` +
      `✅ استلام إشارات تداول غير محدودة\n` +
      `✅ تحليل ICT متقدم\n` +
      `✅ إشعارات فورية عبر تليجرام\n` +
      `✅ دعم فني مميز`,
      keyboard
    );
  } catch (error) {
    console.error(`❌ Error in handleSubscriptionDetails:`, error);
    await answerCallbackQuery(callbackQueryId, '❌ حدث خطأ');
  }
}

/**
 * معالج زر الرجوع للقائمة الرئيسية
 */
async function handleBackToMain(chatId: number, telegramUser: TelegramUser, callbackQueryId: string): Promise<void> {
  await answerCallbackQuery(callbackQueryId, '🏠 القائمة الرئيسية');
  await handleStartCommand(chatId, telegramUser);
}

/**
 * معالج زر التحليل التلقائي
 */
async function handleAutoToggle(chatId: number, telegramUser: TelegramUser, callbackQueryId: string): Promise<void> {
  try {
    const user = await getOrCreateUser(telegramUser);
    
    if (!user) {
      await answerCallbackQuery(callbackQueryId, '❌ خطأ في الحساب');
      return;
    }

    // التحقق من الاشتراك
    const activeSubscription = await getUserActiveSubscription(user.id);
    
    if (!activeSubscription) {
      await answerCallbackQuery(callbackQueryId, '⚠️ يجب أن يكون لديك اشتراك نشط');
      return;
    }

    // تبديل حالة التحليل التلقائي
    const { setUserAutoAnalysis } = await import('../db/index');
    const newStatus = !user.auto_analysis_enabled;
    
    await setUserAutoAnalysis(user.id, newStatus);
    
    // تحديث الزر
    const autoStatus = newStatus ? '⏸️ إيقاف' : '▶️ تفعيل';
    const keyboard = {
      inline_keyboard: [[
        {
          text: `${autoStatus} التحليل التلقائي`,
          callback_data: 'toggle_auto'
        }
      ]]
    };
    
    if (newStatus) {
      await answerCallbackQuery(callbackQueryId, '✅ تم تفعيل التحليل التلقائي');
      await sendMessage(
        chatId,
        `✅ <b>تم تفعيل التحليل التلقائي!</b>\n\n` +
        `🤖 سيتم إرسال إشارات التداول تلقائياً إلى حسابك على تليجرام كل 5 دقائق.\n\n` +
        `📊 ستستلم فقط الصفقات ذات الجودة العالية (Score ≥ 7)`,
        keyboard
      );
    } else {
      await answerCallbackQuery(callbackQueryId, '⏸️ تم إيقاف التحليل التلقائي');
      await sendMessage(
        chatId,
        `⏸️ <b>تم إيقاف التحليل التلقائي</b>\n\n` +
        `لن تستلم إشارات التداول التلقائية بعد الآن.`,
        keyboard
      );
    }
  } catch (error) {
    console.error(`❌ Error in handleAutoToggle:`, error);
    await answerCallbackQuery(callbackQueryId, '❌ حدث خطأ');
  }
}

/**
 * معالج أمر /auto - تفعيل/إيقاف التحليل التلقائي
 */
async function handleAutoCommand(chatId: number, telegramUser: TelegramUser): Promise<void> {
  try {
    console.log(`🔄 Processing /auto for user: ${telegramUser.id}`);
    
    const user = await getOrCreateUser(telegramUser);
    
    if (!user) {
      await sendMessage(chatId, '❌ حدث خطأ. يرجى المحاولة لاحقاً.');
      return;
    }

    // التحقق من الاشتراك
    const activeSubscription = await getUserActiveSubscription(user.id);
    
    if (!activeSubscription) {
      await sendMessage(
        chatId,
        '⚠️ <b>يجب أن يكون لديك اشتراك نشط</b>\n\n' +
        'للحصول على التحليلات التلقائية، يرجى الاشتراك في إحدى الباقات.\n\n' +
        'استخدم /packages لعرض الباقات المتاحة.'
      );
      return;
    }

    // تبديل حالة التحليل التلقائي
    const { setUserAutoAnalysis } = await import('../db/index');
    const newStatus = !user.auto_analysis_enabled;
    
    await setUserAutoAnalysis(user.id, newStatus);
    
    if (newStatus) {
      await sendMessage(
        chatId,
        `✅ <b>تم تفعيل التحليل التلقائي!</b>\n\n` +
        `🤖 سيتم إرسال إشارات التداول تلقائياً إلى حسابك على تليجرام كل 5 دقائق.\n\n` +
        `📊 ستستلم فقط الصفقات ذات الجودة العالية (Score ≥ 7)\n\n` +
        `لإيقاف التحليل التلقائي، أرسل /auto مرة أخرى.`
      );
      console.log(`✅ Auto analysis enabled for user: ${telegramUser.id}`);
    } else {
      await sendMessage(
        chatId,
        `⏸️ <b>تم إيقاف التحليل التلقائي</b>\n\n` +
        `لن تستلم إشارات التداول التلقائية بعد الآن.\n\n` +
        `لإعادة التفعيل، أرسل /auto`
      );
      console.log(`⏸️ Auto analysis disabled for user: ${telegramUser.id}`);
    }
  } catch (error) {
    console.error(`❌ Error in handleAutoCommand:`, error);
    await sendMessage(chatId, '❌ حدث خطأ. يرجى المحاولة لاحقاً.');
  }
}
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
      } else if (text === '/auto') {
        await handleAutoCommand(chatId, user);
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
      } else if (data === 'toggle_auto') {
        await handleAutoToggle(chatId, user, callbackQuery.id);
      } else if (data === 'subscription_details') {
        await handleSubscriptionDetails(chatId, user, callbackQuery.id);
      } else if (data === 'back_to_main') {
        await handleBackToMain(chatId, user, callbackQuery.id);
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
