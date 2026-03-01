// services/telegramBotService.ts
// خدمة بوت تليجرام للتفاعل مع المستخدمين

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  getUserById,
  getUserByEmail,
  createUser,
  getUserActiveSubscription
} from '../db/index';
import { purchaseSubscription, getAvailablePackages } from './subscriptionService';

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
 * إرسال صورة الرسم البياني
 */
async function sendChartPhoto(chatId: number, imageBase64: string, caption: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    // إزالة البادئة data:image/png;base64, إذا كانت موجودة
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await fetchFn(`${TELEGRAM_API_URL}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: cleanBase64,
        caption: caption,
        parse_mode: 'HTML'
      })
    });

    const data: any = await response.json();
    return data.ok;
  } catch (error) {
    console.error('❌ Error sending chart photo:', error);
    return false;
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
            text: '📋 تفاصيل اشتراكي',
            callback_data: 'subscription_details'
          }],
          [{
            text: '💎 الباقات',
            callback_data: 'show_packages'
          }],
          [{
            text: '📅 التقويم الاقتصادي',
            callback_data: 'economic_calendar'
          }],
          [{
            text: '💬 الدعم الفني',
            url: 'https://t.me/iqbotict'
          } as any]
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
    // استخدام نفس مصدر الباقات الموحد مع التطبيق
    const packages = await getAvailablePackages();
    
    if (packages.length === 0) {
      console.log(`⚠️ No packages available`);
      await sendMessage(chatId, '❌ لا توجد باقات متاحة حالياً.');
      return;
    }

    console.log(`✅ Found ${packages.length} packages`);

    let message = `🎁 <b>الباقات المتاحة</b>\n\n`;
    message += `💰 رصيدك الحالي: <b>${user.coins || 0} عملة</b>\n\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    packages.forEach((pkg: any) => {
      const coinPrice = Math.round(pkg.price * 1); // 1 دولار = 1 عملة (موحد مع التطبيق)
      message += `📦 <b>${pkg.nameAr}</b>\n`;
      message += `💎 السعر: <b>${coinPrice} عملة</b> ($${pkg.price})\n`;
      message += `⏰ المدة: ${pkg.durationDays} يوم\n`;
      message += `🎁 عملات مجانية: +${pkg.coinsIncluded} عملة\n`;
      message += `📊 التحليلات: ${pkg.analysisLimit === -1 ? 'غير محدودة' : pkg.analysisLimit + ' تحليل'}\n`;
      message += `\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `👇 اختر الباقة المناسبة لك:`;

    // إنشاء الأزرار (استخدام نفس الأسعار الموحدة)
    const buttons = packages.map((pkg: any) => {
      const coinPrice = Math.round(pkg.price * 1); // 1 دولار = 1 عملة (موحد مع التطبيق)
      return [{
        text: `💎 ${pkg.nameAr} - ${coinPrice} عملة`,
        callback_data: `buy_${pkg.id}`
      }];
    });
    
    // إضافة أزرار التنقل
    buttons.push([
      {
        text: '🏠 الرئيسية',
        callback_data: 'back_to_main'
      } as any,
      {
        text: '💬 الدعم الفني',
        url: 'https://t.me/iqbotict'
      } as any
    ]);
    
    const keyboard = {
      inline_keyboard: buttons
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

  // التحقق من وجود الباقة المطلوبة
  const { getVipPackageById, addCoins } = await import('../db/index');
  const vipPackage = await getVipPackageById(packageId);
  
  if (!vipPackage) {
    await answerCallbackQuery(callbackQueryId, '❌ الباقة غير موجودة');
    await sendMessage(chatId, '❌ الباقة المطلوبة غير موجودة.');
    return;
  }

  // حساب سعر الباقة بالعملات (1 دولار = 1 عملة)
  const coinPrice = Math.round(vipPackage.price * 1);

  // التحقق من وجود اشتراك نشط
  const activeSubscription = await getUserActiveSubscription(user.id);
  
  if (activeSubscription) {
    // التحقق من إمكانية الترقية (شهري → سنوي فقط)
    const currentDuration = activeSubscription.plan_name.includes('شهر') ? 30 :
      activeSubscription.plan_name.includes('أسبوع') ? 7 : 365;
    const newDuration = vipPackage.duration_days;
    const isUpgrade = currentDuration === 30 && newDuration === 365;

    if (!isUpgrade) {
      await answerCallbackQuery(callbackQueryId, '⚠️ لديك اشتراك نشط بالفعل');
      await sendMessage(
        chatId,
        `⚠️ <b>لديك اشتراك نشط بالفعل</b>\n\n` +
        `📦 الباقة الحالية: <b>${activeSubscription.plan_name}</b>\n` +
        `📅 ينتهي في: ${new Date(activeSubscription.expires_at).toLocaleDateString('ar-SA')}\n\n` +
        `💡 يمكنك فقط الترقية من الباقة الشهرية إلى السنوية.`
      );
      return;
    }
    console.log(`✅ Telegram: Upgrade allowed for user ${telegramUser.id}: Monthly → Yearly`);
  }

  // التحقق من رصيد المستخدم
  const userCoins = user.coins || 0;
  if (userCoins < coinPrice) {
    await answerCallbackQuery(callbackQueryId, '❌ رصيدك غير كافٍ');
    await sendMessage(
      chatId,
      `❌ <b>رصيدك غير كافٍ</b>\n\n` +
      `💰 رصيدك الحالي: <b>${userCoins} عملة</b>\n` +
      `💎 سعر الباقة: <b>${coinPrice} عملة</b>\n` +
      `📊 ينقصك: <b>${coinPrice - userCoins} عملة</b>\n\n` +
      `يرجى شحن رصيدك أولاً ثم المحاولة مرة أخرى.`
    );
    return;
  }

  // خصم العملات من المستخدم أولاً
  console.log(`💰 Telegram: Deducting ${coinPrice} coins from user ${telegramUser.id}`);
  const deductSuccess = await addCoins(user.id, -coinPrice);
  
  if (!deductSuccess) {
    await answerCallbackQuery(callbackQueryId, '❌ فشل في خصم العملات');
    await sendMessage(chatId, '❌ فشل في خصم العملات. يرجى المحاولة لاحقاً.');
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
    const newBalance = userCoins - coinPrice + (vipPackage.coins_included || 0);
    
    // إنشاء زر التحليل التلقائي
    const keyboard = {
      inline_keyboard: [
        [{
          text: '▶️ تفعيل التحليل التلقائي',
          callback_data: 'toggle_auto'
        }],
        [{
          text: '🏠 الرئيسية',
          callback_data: 'back_to_main'
        }]
      ]
    };
    
    await sendMessage(
      chatId,
      `🎉 <b>تم تفعيل اشتراكك بنجاح!</b>\n\n` +
      `✅ ${result.message}\n` +
      `📅 ينتهي في: ${expiryDate}\n` +
      `💰 تم خصم: ${coinPrice} عملة\n` +
      `💎 رصيدك الجديد: ${newBalance} عملة\n\n` +
      `يمكنك الآن تفعيل التحليل التلقائي لاستلام إشارات التداول:`,
      keyboard
    );

    // إرسال إشعار نظام بنجاح الشراء
    try {
      const { notifySubscriptionPurchased } = await import('./systemNotificationService');
      const expiryDateObj = new Date(result.expiresAt!);
      await notifySubscriptionPurchased(user.id, vipPackage.name_ar, expiryDateObj);
    } catch (notifError) {
      console.error('Failed to send subscription purchase notification:', notifError);
    }
  } else {
    // إرجاع العملات في حالة الفشل
    console.log(`🔄 Telegram: Refunding ${coinPrice} coins to user ${telegramUser.id}`);
    await addCoins(user.id, coinPrice);
    
    await answerCallbackQuery(callbackQueryId, '❌ فشل التفعيل');
    await sendMessage(chatId, `❌ ${result.message}\n\n💰 تم إرجاع ${coinPrice} عملة إلى رصيدك.\n\nيرجى التواصل مع الدعم الفني.`);
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
  
  let message = `📊 <b>حالة حسابك</b>\n\n`;
  message += `👤 الاسم: ${telegramUser.first_name}\n`;
  message += `💰 الرصيد: ${user.coins} عملة\n\n`;
  
  const keyboard = {
    inline_keyboard: [[{
      text: '🏠 الرئيسية',
      callback_data: 'back_to_main'
    }]]
  };
  
  if (activeSubscription) {
    const expiryDate = new Date(activeSubscription.expires_at).toLocaleDateString('ar-SA');
    message += `✅ <b>الاشتراك النشط</b>\n`;
    message += `📦 الباقة: ${activeSubscription.plan_name}\n`;
    message += `📅 ينتهي في: ${expiryDate}\n`;
    message += `📊 الإشارات: غير محدودة\n`;
  } else {
    message += `⚠️ <b>لا يوجد اشتراك نشط</b>\n`;
    message += `استخدم /packages لعرض الباقات المتاحة`;
  }

  await sendMessage(chatId, message, keyboard);
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
      inline_keyboard: [
        [{
          text: '🔙 رجوع',
          callback_data: 'back_to_main'
        }],
        [{
          text: '💬 الدعم الفني',
          url: 'https://t.me/iqbotict'
        } as any]
      ]
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
      inline_keyboard: [
        [{
          text: `${autoStatus} التحليل التلقائي`,
          callback_data: 'toggle_auto'
        }],
        [{
          text: '🏠 الرئيسية',
          callback_data: 'back_to_main'
        }]
      ]
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
 * معالج زر التقويم الاقتصادي
 */
async function handleEconomicCalendar(chatId: number, telegramUser: TelegramUser, callbackQueryId: string): Promise<void> {
  try {
    // التحقق من وجود اشتراك نشط - التقويم الاقتصادي لأصحاب الباقات فقط
    const user = await getOrCreateUser(telegramUser);
    if (!user) {
      await answerCallbackQuery(callbackQueryId, '❌ خطأ في الحساب');
      return;
    }

    const activeSubscription = await getUserActiveSubscription(user.id);
    if (!activeSubscription) {
      await answerCallbackQuery(callbackQueryId, '🔒 هذه الميزة لأصحاب الباقات فقط');
      await sendMessage(
        chatId,
        `🔒 <b>ميزة حصرية لأصحاب الباقات</b>\n\n` +
        `📅 التقويم الاقتصادي وتحليل الأخبار متاح فقط للمشتركين في إحدى الباقات.\n\n` +
        `💡 اشترك الآن للحصول على:\n` +
        `• 📅 التقويم الاقتصادي مع تحليل AI\n` +
        `• 📊 تحليلات تداول غير محدودة\n` +
        `• 🔔 إشعارات فورية\n\n` +
        `👇 اختر باقة للاشتراك:`,
        {
          inline_keyboard: [
            [{ text: '💎 عرض الباقات', callback_data: 'show_packages' }],
            [{ text: '🏠 الرئيسية', callback_data: 'back_to_main' }]
          ]
        }
      );
      return;
    }

    await answerCallbackQuery(callbackQueryId, '📅 جاري تحميل التقويم...');
    
    // استيراد خدمة التقويم الاقتصادي
    const { getEconomicCalendar } = await import('./economicCalendarService');
    
    // جلب الأحداث
    const calendar = await getEconomicCalendar();
    const events = calendar.events;
    
    if (!events || events.length === 0) {
      await sendMessage(
        chatId,
        '⚠️ <b>لا توجد أحداث اقتصادية متاحة حالياً</b>\n\n' +
        'يرجى المحاولة لاحقاً.'
      );
      return;
    }
    
    // فلترة الأحداث المهمة (high impact) والقادمة
    const now = new Date();
    const upcomingEvents = events.filter((event: any) => {
      const eventDate = new Date(`${event.date}T${event.time}`);
      return eventDate > now && event.impact === 'high';
    }).slice(0, 10); // أول 10 أحداث
    
    if (upcomingEvents.length === 0) {
      await sendMessage(
        chatId,
        '📅 <b>التقويم الاقتصادي</b>\n\n' +
        '✅ لا توجد أحداث مهمة قادمة في الوقت الحالي.\n\n' +
        'سيتم إشعارك تلقائياً قبل 5 دقائق من أي حدث مهم.'
      );
      return;
    }
    
    // بناء رسالة الأحداث
    let message = '📅 <b>الأحداث الاقتصادية المهمة القادمة</b>\n\n';
    
    upcomingEvents.forEach((event: any, index: number) => {
      const eventDate = new Date(`${event.date}T${event.time}`);
      const timeUntil = Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60)); // بالدقائق
      
      let timeText = '';
      if (timeUntil < 60) {
        timeText = `⏰ خلال ${timeUntil} دقيقة`;
      } else if (timeUntil < 1440) {
        timeText = `⏰ خلال ${Math.round(timeUntil / 60)} ساعة`;
      } else {
        timeText = `📅 ${eventDate.toLocaleDateString('ar-SA')}`;
      }
      
      message += `${index + 1}. <b>${event.event}</b>\n`;
      message += `   🌍 ${event.countryName}\n`;
      message += `   ${timeText}\n`;
      message += `   🔴 تأثير عالي\n`;
      
      if (event.forecast) {
        message += `   📊 التوقع: ${event.forecast}\n`;
      }
      if (event.previous) {
        message += `   📈 السابق: ${event.previous}\n`;
      }
      if (event.actual) {
        message += `   ✅ الفعلي: ${event.actual}\n`;
      }
      
      message += '\n';
    });
    
    message += '💡 <b>ملاحظة:</b> سيتم إشعارك تلقائياً قبل 5 دقائق من كل حدث مهم.';
    
    const keyboard = {
      inline_keyboard: [
        [{
          text: '🔄 تحديث',
          callback_data: 'economic_calendar'
        }],
        [{
          text: '🏠 الرئيسية',
          callback_data: 'back_to_main'
        }]
      ]
    };
    
    await sendMessage(chatId, message, keyboard);
    console.log(`✅ Sent economic calendar to user: ${telegramUser.id}`);
    
  } catch (error) {
    console.error(`❌ Error in handleEconomicCalendar:`, error);
    await answerCallbackQuery(callbackQueryId, '❌ حدث خطأ');
    await sendMessage(
      chatId,
      '❌ <b>حدث خطأ في تحميل التقويم الاقتصادي</b>\n\n' +
      'يرجى المحاولة لاحقاً.'
    );
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

      console.log(`🔘 Processing callback query: ${data} from user ${user.id}`);

      if (data.startsWith('buy_')) {
        const packageId = data.replace('buy_', '');
        console.log(`💰 Handling package purchase: ${packageId}`);
        await handlePackagePurchase(chatId, user, packageId, callbackQuery.id);
      } else if (data === 'toggle_auto') {
        console.log(`🤖 Toggling auto analysis for user ${user.id}`);
        await handleAutoToggle(chatId, user, callbackQuery.id);
      } else if (data === 'subscription_details') {
        console.log(`📊 Showing subscription details for user ${user.id}`);
        await handleSubscriptionDetails(chatId, user, callbackQuery.id);
      } else if (data === 'show_packages') {
        console.log(`💎 Showing packages for user ${user.id}`);
        await answerCallbackQuery(callbackQuery.id, '💎 عرض الباقات');
        await showPackages(chatId, user);
      } else if (data === 'economic_calendar') {
        console.log(`📅 Showing economic calendar for user ${user.id}`);
        await handleEconomicCalendar(chatId, user, callbackQuery.id);
      } else if (data === 'back_to_main' || data === 'main_menu') {
        console.log(`🏠 Going back to main menu for user ${user.id}`);
        await handleBackToMain(chatId, user, callbackQuery.id);
      } else if (data === 'test_button_1') {
        console.log(`✅ Test button 1 clicked by user ${user.id}`);
        await answerCallbackQuery(callbackQuery.id, '✅ الزر 1 يعمل بنجاح!');
        await sendMessage(chatId, '✅ <b>الزر 1 يعمل!</b>\n\nWebhook يعمل بشكل صحيح.');
      } else if (data === 'test_button_2') {
        console.log(`🔘 Test button 2 clicked by user ${user.id}`);
        await answerCallbackQuery(callbackQuery.id, '🔘 الزر 2 يعمل بنجاح!');
        await sendMessage(chatId, '🔘 <b>الزر 2 يعمل!</b>\n\nجميع الأزرار تعمل بشكل صحيح.');
      } else {
        console.log(`⚠️ Unknown callback data: ${data}`);
        await answerCallbackQuery(callbackQuery.id, 'غير معروف');
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
