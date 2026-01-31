// routes/economicAnalysis.ts
// مسارات التحليل الاقتصادي

import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  analyzeEconomicEvent,
  getAnalysis,
  getUserTodayAnalyses,
  analyzeTodayEvents,
  searchTodayEconomicAnalysis
} from '../services/economicAnalysisService';
import { getEconomicCalendar } from '../services/economicCalendarService';

const router = express.Router();

/**
 * GET /api/economic-analysis/today
 * تحليل جميع أحداث اليوم
 */
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    console.log(`📊 Analyzing today's events for user: ${userId}`);
    
    const result = await analyzeTodayEvents(userId);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('❌ Failed to analyze today events:', error);
    res.status(500).json({
      success: false,
      error: 'فشل تحليل أحداث اليوم'
    });
  }
});

/**
 * GET /api/economic-analysis/event/:eventId
 * تحليل حدث محدد
 */
router.get('/event/:eventId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { eventId } = req.params;
    
    // البحث عن تحليل موجود
    let analysis = await getAnalysis(eventId, userId);
    
    if (!analysis) {
      // إنشاء تحليل جديد
      const calendar = await getEconomicCalendar();
      const event = calendar.events.find(e => e.id === eventId);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'الحدث غير موجود'
        });
      }
      
      analysis = await analyzeEconomicEvent(event, userId);
    }
    
    res.json({
      success: true,
      analysis
    });
    
  } catch (error) {
    console.error('❌ Failed to analyze event:', error);
    res.status(500).json({
      success: false,
      error: 'فشل تحليل الحدث'
    });
  }
});

/**
 * GET /api/economic-analysis/my-analyses
 * الحصول على تحليلات المستخدم لليوم
 */
router.get('/my-analyses', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    const analyses = await getUserTodayAnalyses(userId);
    
    res.json({
      success: true,
      analyses,
      count: analyses.length
    });
    
  } catch (error) {
    console.error('❌ Failed to get user analyses:', error);
    res.status(500).json({
      success: false,
      error: 'فشل جلب التحليلات'
    });
  }
});

/**
 * POST /api/economic-analysis/search
 * البحث عن تحليلات اقتصادية من الإنترنت
 */
router.post('/search', authMiddleware, async (req, res) => {
  try {
    const { eventName } = req.body;
    
    if (!eventName) {
      return res.status(400).json({
        success: false,
        error: 'اسم الحدث مطلوب'
      });
    }
    
    const result = await searchTodayEconomicAnalysis(eventName);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('❌ Failed to search analysis:', error);
    res.status(500).json({
      success: false,
      error: 'فشل البحث عن التحليلات'
    });
  }
});

/**
 * GET /api/economic-analysis/calendar-with-analysis
 * التقويم الاقتصادي مع التحليلات
 */
router.get('/calendar-with-analysis', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    // جلب التقويم
    const calendar = await getEconomicCalendar();
    const today = new Date().toISOString().split('T')[0];
    
    // جلب تحليلات المستخدم
    const userAnalyses = await getUserTodayAnalyses(userId);
    
    // دمج التحليلات مع الأحداث
    const eventsWithAnalysis = calendar.events
      .filter(event => event.date === today)
      .map(event => {
        const analysis = userAnalyses.find(a => a.eventId === event.id);
        return {
          ...event,
          hasAnalysis: !!analysis,
          analysis: analysis || null
        };
      });
    
    res.json({
      success: true,
      events: eventsWithAnalysis,
      totalEvents: eventsWithAnalysis.length,
      analyzedEvents: userAnalyses.length
    });
    
  } catch (error) {
    console.error('❌ Failed to get calendar with analysis:', error);
    res.status(500).json({
      success: false,
      error: 'فشل جلب التقويم مع التحليلات'
    });
  }
});

export default router;
