// routes/telegram.ts
// مسارات بوت تليجرام

import express from 'express';
import { handleTelegramUpdate, setupTelegramWebhook, getWebhookInfo } from '../services/telegramBotService';

const router = express.Router();

/**
 * POST /api/telegram/webhook
 * استقبال التحديثات من تليجرام
 */
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('📨 Received Telegram update:', JSON.stringify(update, null, 2));
    
    // تسجيل نوع التحديث
    if (update.message) {
      console.log('💬 Message received:', update.message.text);
    }
    if (update.callback_query) {
      console.log('🔘 Button clicked:', update.callback_query.data);
      console.log('👤 User:', update.callback_query.from.id, update.callback_query.from.first_name);
    }
    
    // معالجة التحديث بشكل غير متزامن
    handleTelegramUpdate(update).catch(error => {
      console.error('❌ Error processing Telegram update:', error);
    });
    
    // الرد فوراً لتليجرام
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/telegram/setup-webhook
 * إعداد webhook URL
 */
router.post('/setup-webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }
    
    const success = await setupTelegramWebhook(webhookUrl);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Webhook set successfully',
        webhookUrl 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to set webhook' 
      });
    }
  } catch (error) {
    console.error('❌ Setup webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/telegram/webhook-info
 * الحصول على معلومات webhook الحالي
 */
router.get('/webhook-info', async (req, res) => {
  try {
    const info = await getWebhookInfo();
    
    if (info) {
      res.json({ 
        success: true, 
        info,
        status: info.url ? '✅ Webhook configured' : '❌ Webhook not configured',
        pendingUpdates: info.pending_update_count || 0
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to get webhook info' });
    }
  } catch (error) {
    console.error('❌ Get webhook info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/telegram/test-webhook
 * اختبار webhook - يرسل رسالة تجريبية
 */
router.get('/test-webhook', async (req, res) => {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    
    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(400).json({ 
        success: false, 
        error: 'TELEGRAM_BOT_TOKEN not configured' 
      });
    }
    
    if (!TELEGRAM_CHAT_ID) {
      return res.status(400).json({ 
        success: false, 
        error: 'TELEGRAM_CHAT_ID not configured',
        note: 'Set TELEGRAM_CHAT_ID in environment variables'
      });
    }
    
    // إرسال رسالة تجريبية مع أزرار
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: '🧪 <b>اختبار Webhook</b>\n\nاضغط على الأزرار أدناه لاختبار عمل الـ webhook:',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{
              text: '✅ اختبار زر 1',
              callback_data: 'test_button_1'
            }],
            [{
              text: '🔘 اختبار زر 2',
              callback_data: 'test_button_2'
            }],
            [{
              text: '🏠 القائمة الرئيسية',
              callback_data: 'back_to_main'
            }]
          ]
        }
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      res.json({ 
        success: true, 
        message: 'Test message sent! Check your Telegram and click the buttons.',
        note: 'Watch server logs for webhook activity'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send test message',
        details: data
      });
    }
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
