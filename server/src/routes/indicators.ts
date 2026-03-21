// routes/indicators.ts
// مسارات المؤشرات المخصصة - نظام إنشاء وإدارة المؤشرات بالذكاء الاصطناعي

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ===================== AI Config =====================
const API_KEY = process?.env?.OLLAMA_API_KEY || process?.env?.AI_API_KEY || '';
const BASE_URL = process?.env?.OLLAMA_BASE_URL || process?.env?.AI_BASE_URL || 'https://api.openai.com';
const MODEL = process?.env?.OLLAMA_MODEL || process?.env?.AI_MODEL || 'llama3.2-vision';

async function callAI(messages: any[], temperature = 0.3, max_tokens = 4000): Promise<string> {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

// ===================== System Prompt للمؤشرات =====================
const INDICATOR_SYSTEM_PROMPT = `أنت مبرمج مؤشرات تداول محترف. تقوم بإنشاء مؤشرات فنية تعمل على مكتبة lightweight-charts في JavaScript.

**قواعد صارمة لكتابة الكود:**
1. الكود يجب أن يكون دالة واحدة اسمها calculate تستقبل candles
2. candles هي مصفوفة: [{time: number, open: number, high: number, low: number, close: number}]
3. الدالة ترجع كائن: { series: [...], separate: boolean }
4. أنواع series المدعومة:
   - line: { type: 'line', data: [{time, value}], options: {color, lineWidth, title} }
   - histogram: { type: 'histogram', data: [{time, value, color}], options: {title} }
   - markers: { type: 'markers', data: [{time, position, color, shape, text}] }
5. يجب أن يكون الكود كاملاً وقابلاً للتنفيذ مباشرة - لا تستخدم ... أو تعليقات بدل كود
6. لا تستخدم import أو require
7. كل data array يجب أن يكون مرتباً حسب time

**مثال كامل 1 - SMA:**
\`\`\`javascript
function calculate(candles) {
  var period = 20;
  var smaData = [];
  for (var i = period - 1; i < candles.length; i++) {
    var sum = 0;
    for (var j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    smaData.push({ time: candles[i].time, value: sum / period });
  }
  return {
    series: [
      { type: 'line', data: smaData, options: { color: '#2962FF', lineWidth: 2, title: 'SMA 20' } }
    ]
  };
}
\`\`\`

**مثال كامل 2 - EMA:**
\`\`\`javascript
function calculate(candles) {
  var period = 21;
  var k = 2 / (period + 1);
  var emaData = [];
  var ema = candles[0].close;
  for (var i = 0; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    if (i >= period - 1) {
      emaData.push({ time: candles[i].time, value: ema });
    }
  }
  return {
    series: [
      { type: 'line', data: emaData, options: { color: '#FF6D00', lineWidth: 2, title: 'EMA 21' } }
    ]
  };
}
\`\`\`

**مثال كامل 3 - RSI:**
\`\`\`javascript
function calculate(candles) {
  var period = 14;
  var gains = 0, losses = 0;
  var rsiData = [];
  for (var i = 1; i < candles.length; i++) {
    var change = candles[i].close - candles[i-1].close;
    if (i <= period) {
      if (change > 0) gains += change; else losses -= change;
      if (i === period) {
        var avgGain = gains / period;
        var avgLoss = losses / period;
        var rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsiData.push({ time: candles[i].time, value: 100 - (100 / (1 + rs)) });
      }
    } else {
      var avgGain2 = ((rsiData.length > 0 ? gains / period : 0) * (period - 1) + (change > 0 ? change : 0)) / period;
      var avgLoss2 = ((rsiData.length > 0 ? losses / period : 0) * (period - 1) + (change < 0 ? -change : 0)) / period;
      gains = avgGain2 * period;
      losses = avgLoss2 * period;
      var rs2 = avgLoss2 === 0 ? 100 : avgGain2 / avgLoss2;
      rsiData.push({ time: candles[i].time, value: 100 - (100 / (1 + rs2)) });
    }
  }
  return {
    series: [
      { type: 'line', data: rsiData, options: { color: '#E91E63', lineWidth: 1, title: 'RSI 14' } }
    ],
    separate: true
  };
}
\`\`\`

**تعليمات الرد:**
1. أعد أولاً block json ثم block javascript
2. استخدم var بدل const/let لتوافق أوسع
3. الكود يجب أن يكون كاملاً 100% بدون أي اختصارات
4. تأكد الحسابات الرياضية صحيحة

**صيغة الرد:**
\`\`\`json
{
  "name": "Indicator Name",
  "nameAr": "اسم المؤشر",
  "description": "وصف مختصر",
  "type": "overlay"
}
\`\`\`
\`\`\`javascript
function calculate(candles) {
  // كود كامل هنا
  return { series: [...] };
}
\`\`\``;

// ===================== Helper Functions =====================
function extractCodeAndMeta(response: string): { code: string; name: string; nameAr: string; description: string; type: string } {
  let code = '';
  let name = 'Custom Indicator';
  let nameAr = 'مؤشر مخصص';
  let description = '';
  let type = 'overlay';

  // استخراج JSON metadata
  const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const meta = JSON.parse(jsonMatch[1].trim());
      name = meta.name || name;
      nameAr = meta.nameAr || nameAr;
      description = meta.description || description;
      type = meta.type || type;
    } catch {}
  }

  // استخراج كود JavaScript
  const codeMatch = response.match(/```(?:javascript|js)\s*([\s\S]*?)```/);
  if (codeMatch) {
    code = codeMatch[1].trim();
  }

  // إذا لم يتم العثور على كود في block، ابحث عن function calculate
  if (!code) {
    const funcMatch = response.match(/(function\s+calculate\s*\([\s\S]*?\n\})/);
    if (funcMatch) {
      code = funcMatch[1].trim();
    }
  }

  return { code, name, nameAr, description, type };
}

async function getDbQuery() {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
  if (isProduction) {
    const { query } = await import('../db/postgresAdapter');
    return query;
  }
  return null;
}

// ===================== Routes =====================

// جلب جميع مؤشرات المستخدم
router.get('/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const dbQuery = await getDbQuery();
    
    if (!dbQuery) {
      return res.json({ success: true, indicators: [] });
    }

    const result = await dbQuery(
      'SELECT id, name, name_ar, description, indicator_type, config, is_active, version, created_at, updated_at FROM user_indicators WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      indicators: result.rows || [],
    });
  } catch (error) {
    console.error('List indicators error:', error);
    res.status(500).json({ success: false, error: 'فشل في جلب المؤشرات' });
  }
});

// جلب مؤشر واحد مع الكود
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const dbQuery = await getDbQuery();

    if (!dbQuery) {
      return res.status(404).json({ success: false, error: 'المؤشر غير موجود' });
    }

    const result = await dbQuery(
      'SELECT * FROM user_indicators WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!result.rows?.[0]) {
      return res.status(404).json({ success: false, error: 'المؤشر غير موجود' });
    }

    res.json({ success: true, indicator: result.rows[0] });
  } catch (error) {
    console.error('Get indicator error:', error);
    res.status(500).json({ success: false, error: 'فشل في جلب المؤشر' });
  }
});

// جلب المؤشرات النشطة (مع الكود - للرسم البياني)
router.get('/active/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const dbQuery = await getDbQuery();

    if (!dbQuery) {
      return res.json({ success: true, indicators: [] });
    }

    const result = await dbQuery(
      'SELECT id, name, name_ar, indicator_type, code, config, is_active FROM user_indicators WHERE user_id = $1 AND is_active = true ORDER BY created_at ASC',
      [userId]
    );

    res.json({
      success: true,
      indicators: result.rows || [],
    });
  } catch (error) {
    console.error('Active indicators error:', error);
    res.status(500).json({ success: false, error: 'فشل في جلب المؤشرات النشطة' });
  }
});

// تفعيل/إلغاء تفعيل مؤشر
router.post('/:id/toggle', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const dbQuery = await getDbQuery();

    if (!dbQuery) {
      return res.status(400).json({ success: false, error: 'قاعدة البيانات غير متوفرة' });
    }

    const existing = await dbQuery(
      'SELECT is_active FROM user_indicators WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!existing.rows?.[0]) {
      return res.status(404).json({ success: false, error: 'المؤشر غير موجود' });
    }

    const newState = !existing.rows[0].is_active;
    await dbQuery(
      'UPDATE user_indicators SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newState, id]
    );

    res.json({ success: true, isActive: newState, message: newState ? 'تم تفعيل المؤشر' : 'تم إلغاء تفعيل المؤشر' });
  } catch (error) {
    console.error('Toggle indicator error:', error);
    res.status(500).json({ success: false, error: 'فشل في تبديل حالة المؤشر' });
  }
});

// حذف مؤشر
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const dbQuery = await getDbQuery();

    if (!dbQuery) {
      return res.status(400).json({ success: false, error: 'قاعدة البيانات غير متوفرة' });
    }

    await dbQuery('DELETE FROM indicator_chat_history WHERE indicator_id = $1 AND user_id = $2', [id, userId]);
    const result = await dbQuery('DELETE FROM user_indicators WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);

    if (!result.rows?.[0]) {
      return res.status(404).json({ success: false, error: 'المؤشر غير موجود' });
    }

    res.json({ success: true, message: 'تم حذف المؤشر بنجاح' });
  } catch (error) {
    console.error('Delete indicator error:', error);
    res.status(500).json({ success: false, error: 'فشل في حذف المؤشر' });
  }
});

// إنشاء مؤشر بالذكاء الاصطناعي
router.post('/ai/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { message, indicatorId } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'الرسالة مطلوبة' });
    }

    const dbQuery = await getDbQuery();
    if (!dbQuery) {
      return res.status(400).json({ success: false, error: 'قاعدة البيانات غير متوفرة' });
    }

    // جلب سجل المحادثة السابقة لهذا المؤشر
    let chatHistory: any[] = [];
    if (indicatorId) {
      const histResult = await dbQuery(
        'SELECT role, content FROM indicator_chat_history WHERE user_id = $1 AND indicator_id = $2 ORDER BY created_at ASC LIMIT 20',
        [userId, indicatorId]
      );
      chatHistory = histResult.rows || [];
    }

    // بناء الرسائل للـ AI
    const messages: any[] = [
      { role: 'system', content: INDICATOR_SYSTEM_PROMPT },
    ];

    // إضافة سجل المحادثة
    for (const msg of chatHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // إذا كان تعديل مؤشر موجود، أضف الكود الحالي
    if (indicatorId) {
      const existingInd = await dbQuery(
        'SELECT name, code, description FROM user_indicators WHERE id = $1 AND user_id = $2',
        [indicatorId, userId]
      );
      if (existingInd.rows?.[0]) {
        const ind = existingInd.rows[0];
        messages.push({
          role: 'user',
          content: `المؤشر الحالي "${ind.name}":\n\`\`\`javascript\n${ind.code}\n\`\`\`\n\nالمستخدم يطلب التعديل التالي: ${message}`
        });
      } else {
        messages.push({ role: 'user', content: message });
      }
    } else {
      messages.push({ role: 'user', content: `أنشئ مؤشر تداول: ${message}` });
    }

    // استدعاء AI
    const aiResponse = await callAI(messages, 0.3, 4000);

    // استخراج الكود والبيانات الوصفية
    const { code, name, nameAr, description, type } = extractCodeAndMeta(aiResponse);

    if (!code) {
      // حفظ رسالة المحادثة بدون كود
      const chatId = uuidv4();
      await dbQuery(
        'INSERT INTO indicator_chat_history (id, user_id, indicator_id, role, content) VALUES ($1, $2, $3, $4, $5)',
        [chatId, userId, indicatorId || null, 'user', message]
      );
      const aiChatId = uuidv4();
      await dbQuery(
        'INSERT INTO indicator_chat_history (id, user_id, indicator_id, role, content) VALUES ($1, $2, $3, $4, $5)',
        [aiChatId, userId, indicatorId || null, 'assistant', aiResponse]
      );

      return res.json({
        success: true,
        hasCode: false,
        message: aiResponse,
      });
    }

    // إذا كان تعديل لمؤشر موجود
    if (indicatorId) {
      await dbQuery(
        'UPDATE user_indicators SET name = $1, name_ar = $2, description = $3, code = $4, indicator_type = $5, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND user_id = $7',
        [name, nameAr, description, code, type, indicatorId, userId]
      );

      // حفظ سجل المحادثة
      await dbQuery(
        'INSERT INTO indicator_chat_history (id, user_id, indicator_id, role, content) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), userId, indicatorId, 'user', message]
      );
      await dbQuery(
        'INSERT INTO indicator_chat_history (id, user_id, indicator_id, role, content) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), userId, indicatorId, 'assistant', aiResponse]
      );

      const updated = await dbQuery('SELECT * FROM user_indicators WHERE id = $1', [indicatorId]);

      return res.json({
        success: true,
        hasCode: true,
        indicator: updated.rows[0],
        message: `تم تحديث المؤشر "${nameAr}" بنجاح`,
      });
    }

    // إنشاء مؤشر جديد
    const newId = uuidv4();
    await dbQuery(
      'INSERT INTO user_indicators (id, user_id, name, name_ar, description, indicator_type, code, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, false)',
      [newId, userId, name, nameAr, description, type, code]
    );

    // حفظ سجل المحادثة
    await dbQuery(
      'INSERT INTO indicator_chat_history (id, user_id, indicator_id, role, content) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), userId, newId, 'user', message]
    );
    await dbQuery(
      'INSERT INTO indicator_chat_history (id, user_id, indicator_id, role, content) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), userId, newId, 'assistant', aiResponse]
    );

    const newIndicator = await dbQuery('SELECT * FROM user_indicators WHERE id = $1', [newId]);

    res.json({
      success: true,
      hasCode: true,
      indicator: newIndicator.rows[0],
      message: `تم إنشاء المؤشر "${nameAr}" بنجاح`,
    });
  } catch (error) {
    console.error('AI create indicator error:', error);
    res.status(500).json({ success: false, error: 'فشل في إنشاء المؤشر' });
  }
});

// جلب سجل المحادثة لمؤشر
router.get('/:id/chat', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const dbQuery = await getDbQuery();

    if (!dbQuery) {
      return res.json({ success: true, messages: [] });
    }

    const result = await dbQuery(
      'SELECT role, content, created_at FROM indicator_chat_history WHERE user_id = $1 AND indicator_id = $2 ORDER BY created_at ASC',
      [userId, id]
    );

    res.json({ success: true, messages: result.rows || [] });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ success: false, error: 'فشل في جلب سجل المحادثة' });
  }
});

export default router;
