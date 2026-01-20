// middleware/auth.ts
// Middleware للمصادقة مع نظام الجلسات

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserById, validateSession } from '../db/index';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
  sessionId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth: No authorization header or invalid format');
      return res.status(401).json({ 
        error: 'غير مصرح - يرجى تسجيل الدخول',
        code: 'NO_AUTH_HEADER'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Auth: Verifying token...');
    
    // التحقق من JWT
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    console.log('✅ Auth: Token verified for user:', decoded.userId);
    
    // التحقق من صلاحية الجلسة
    const sessionValidation = validateSession(token);
    
    if (!sessionValidation.valid) {
      console.log('❌ Auth: Session invalid or expired');
      return res.status(401).json({ 
        error: 'انتهت صلاحية الجلسة - تم تسجيل الدخول من جهاز آخر',
        code: 'SESSION_INVALID'
      });
    }
    
    // التحقق من وجود المستخدم
    const user = getUserById(decoded.userId);
    if (!user) {
      console.log('❌ Auth: User not found in database:', decoded.userId);
      return res.status(401).json({ 
        error: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log('✅ Auth: User found:', user.email);
    req.userId = decoded.userId;
    req.user = user;
    req.sessionId = sessionValidation.sessionId;
    next();
  } catch (error) {
    console.log('❌ Auth: Token verification failed:', (error as Error).message);
    if ((error as Error).name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'انتهت صلاحية الرمز - يرجى تسجيل الدخول مرة أخرى',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      error: 'رمز غير صالح',
      code: 'INVALID_TOKEN'
    });
  }
};

// التحقق من وجود عملات كافية
export const coinsMiddleware = (requiredCoins: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.coins < requiredCoins) {
      return res.status(402).json({ 
        error: 'عملات غير كافية',
        required: requiredCoins,
        current: req.user?.coins || 0
      });
    }
    next();
  };
};
