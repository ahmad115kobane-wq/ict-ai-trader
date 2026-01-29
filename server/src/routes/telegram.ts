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
      res.json({ success: true, info });
    } else {
      res.status(500).json({ success: false, error: 'Failed to get webhook info' });
    }
  } catch (error) {
    console.error('❌ Get webhook info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
