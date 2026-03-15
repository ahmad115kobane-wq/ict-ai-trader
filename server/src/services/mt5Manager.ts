// services/mt5Manager.ts
// MT5 Instance Manager - يدير نسخ MT5 عبر Wine على Linux
// كل مستخدم يحصل على نسخة MT5 خاصة به مع أقل موارد ممكنة

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ===================== Configuration =====================
const MT5_BASE_DIR = process.env.MT5_BASE_DIR || '/opt/mt5/base';
const MT5_INSTANCES_DIR = process.env.MT5_INSTANCES_DIR || '/opt/mt5/instances';
const WINE_PREFIX = process.env.WINE_PREFIX || '/opt/mt5/wineprefix';
const MAX_INSTANCES = parseInt(process.env.MT5_MAX_INSTANCES || '20');
const IDLE_TIMEOUT_MS = parseInt(process.env.MT5_IDLE_TIMEOUT || '3600000'); // 1 hour
const CONNECTION_TIMEOUT_MS = 30000; // 30 seconds
const DISPLAY = process.env.DISPLAY || ':99';
const ENCRYPTION_KEY = process.env.MT5_ENCRYPTION_KEY || 'change-this-key-in-production-32c!';

// ===================== Types =====================
export interface MT5AccountConfig {
  brokerServer: string;
  accountLogin: string;
  accountPassword: string;
}

export interface MT5Status {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'stopped';
  errorMessage: string | null;
  pid: number | null;
  accountLogin: string;
  brokerServer: string;
  uptime: number | null;
}

interface MT5Instance {
  userId: string;
  accountId: string;
  process: ChildProcess | null;
  pid: number | null;
  status: MT5Status['status'];
  errorMessage: string | null;
  instancePath: string;
  config: MT5AccountConfig;
  startedAt: Date | null;
  lastActivityAt: Date;
}

// ===================== Password Encryption =====================
export function encryptPassword(password: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'mt5salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptPassword(encrypted: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'mt5salt', 32);
  const [ivHex, data] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ===================== MT5 Manager Class =====================
class MT5Manager {
  private instances: Map<string, MT5Instance> = new Map();
  private idleTimer: NodeJS.Timeout | null = null;

  // تهيئة المجلدات
  async init(): Promise<void> {
    for (const dir of [MT5_INSTANCES_DIR, WINE_PREFIX]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const baseInstalled = this.isBaseInstalled();
    console.log(`🖥️ MT5 Manager initialized`);
    console.log(`   Base installed: ${baseInstalled ? '✅' : '❌ (run setup-mt5.sh)'}`);
    console.log(`   Instances dir: ${MT5_INSTANCES_DIR}`);
    console.log(`   Max instances: ${MAX_INSTANCES}`);

    // مراقبة الخمول كل دقيقة
    this.idleTimer = setInterval(() => this.stopIdleInstances(), 60000);
  }

  isBaseInstalled(): boolean {
    return fs.existsSync(path.join(MT5_BASE_DIR, 'terminal64.exe'));
  }

  getActiveCount(): number {
    let count = 0;
    this.instances.forEach(i => {
      if (i.status === 'connected' || i.status === 'connecting') count++;
    });
    return count;
  }

  // ===================== إنشاء مجلد المستخدم =====================
  private prepareInstanceDir(userId: string, accountId: string): string {
    const dirName = `u${userId}_${accountId}`;
    const instancePath = path.join(MT5_INSTANCES_DIR, dirName);

    if (fs.existsSync(instancePath)) return instancePath;

    fs.mkdirSync(instancePath, { recursive: true });
    fs.mkdirSync(path.join(instancePath, 'config'), { recursive: true });
    fs.mkdirSync(path.join(instancePath, 'Logs'), { recursive: true });
    fs.mkdirSync(path.join(instancePath, 'MQL5', 'Experts'), { recursive: true });
    fs.mkdirSync(path.join(instancePath, 'MQL5', 'Indicators'), { recursive: true });

    // ربط الملفات التنفيذية (symlinks لتوفير المساحة)
    const baseFiles = fs.readdirSync(MT5_BASE_DIR);
    for (const file of baseFiles) {
      const src = path.join(MT5_BASE_DIR, file);
      const dest = path.join(instancePath, file);
      const stat = fs.statSync(src);

      if (stat.isFile() && !fs.existsSync(dest)) {
        try {
          fs.symlinkSync(src, dest);
        } catch {
          // fallback: hardlink or copy
          try { fs.linkSync(src, dest); } catch { fs.copyFileSync(src, dest); }
        }
      } else if (stat.isDirectory() && !['config', 'Logs', 'MQL5'].includes(file)) {
        if (!fs.existsSync(dest)) {
          try { fs.symlinkSync(src, dest); } catch { /* skip */ }
        }
      }
    }

    return instancePath;
  }

  // ===================== كتابة إعدادات MT5 =====================
  private writeConfig(instancePath: string, config: MT5AccountConfig): void {
    const ini = `; MT5 Auto Config
[Common]
Login=${config.accountLogin}
Server=${config.brokerServer}
KeepPrivate=1
AutoUpdate=0
CertInstall=0
[Charts]
ProfileLast=Default
MaxBars=5000
`;
    fs.writeFileSync(path.join(instancePath, 'config', 'common.ini'), ini, 'utf-8');
  }

  // ===================== الاتصال =====================
  async connect(userId: string, accountId: string, config: MT5AccountConfig): Promise<MT5Status> {
    const key = `${userId}_${accountId}`;

    // هل يعمل بالفعل؟
    const existing = this.instances.get(key);
    if (existing && (existing.status === 'connected' || existing.status === 'connecting')) {
      existing.lastActivityAt = new Date();
      return this.buildStatus(existing);
    }

    // التحقق من الحد الأقصى
    if (this.getActiveCount() >= MAX_INSTANCES) {
      return {
        status: 'error',
        errorMessage: 'الحد الأقصى للحسابات المتصلة. حاول لاحقاً.',
        pid: null, accountLogin: config.accountLogin,
        brokerServer: config.brokerServer, uptime: null,
      };
    }

    // التحقق من تثبيت MT5
    if (!this.isBaseInstalled()) {
      return {
        status: 'error',
        errorMessage: 'MT5 غير مثبت على السيرفر. تواصل مع المسؤول.',
        pid: null, accountLogin: config.accountLogin,
        brokerServer: config.brokerServer, uptime: null,
      };
    }

    // إعداد المجلد والإعدادات
    const instancePath = this.prepareInstanceDir(userId, accountId);
    this.writeConfig(instancePath, config);

    // إنشاء كائن المثيل
    const instance: MT5Instance = {
      userId, accountId,
      process: null, pid: null,
      status: 'connecting', errorMessage: null,
      instancePath, config,
      startedAt: new Date(),
      lastActivityAt: new Date(),
    };

    try {
      // تشغيل MT5 عبر Wine64
      const child = spawn('wine64', [
        path.join(instancePath, 'terminal64.exe'),
        '/portable',
        `/login:${config.accountLogin}`,
        `/server:${config.brokerServer}`,
        `/password:${config.accountPassword}`,
      ], {
        env: {
          ...process.env,
          WINEPREFIX: WINE_PREFIX,
          DISPLAY: DISPLAY,
          WINEDEBUG: '-all', // إسكات مخرجات Wine
        },
        cwd: instancePath,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      });

      instance.process = child;
      instance.pid = child.pid || null;

      child.on('error', (err) => {
        console.error(`❌ MT5 [${key}] error:`, err.message);
        instance.status = 'error';
        instance.errorMessage = `خطأ Wine: ${err.message}`;
      });

      child.on('exit', (code) => {
        console.log(`🛑 MT5 [${key}] exited (code ${code})`);
        instance.status = 'stopped';
        instance.process = null;
        instance.pid = null;
      });

      // لا نستهلك ذاكرة بتخزين stdout/stderr
      child.stdout?.resume();
      child.stderr?.resume();
      child.unref(); // لا يمنع إغلاق Node

      this.instances.set(key, instance);

      // انتظار الاتصال
      await this.waitForConnection(key);
      return this.buildStatus(this.instances.get(key)!);

    } catch (error: any) {
      instance.status = 'error';
      instance.errorMessage = `فشل تشغيل MT5: ${error.message}`;
      this.instances.set(key, instance);
      return this.buildStatus(instance);
    }
  }

  // ===================== انتظار الاتصال =====================
  private async waitForConnection(key: string): Promise<void> {
    const instance = this.instances.get(key);
    if (!instance) return;

    const logDir = path.join(instance.instancePath, 'Logs');
    let waited = 0;
    const interval = 2000;

    while (waited < CONNECTION_TIMEOUT_MS) {
      await new Promise(r => setTimeout(r, interval));
      waited += interval;

      // هل العملية لا تزال تعمل؟
      if (!instance.process || instance.status === 'error') return;

      // فحص ملفات السجل
      const result = this.checkLogs(logDir);

      if (result.connected) {
        instance.status = 'connected';
        instance.errorMessage = null;
        console.log(`✅ MT5 [${key}] connected to ${instance.config.brokerServer}`);
        return;
      }

      if (result.failed) {
        instance.status = 'error';
        instance.errorMessage = result.reason || 'فشل الاتصال';
        this.killInstance(instance);
        return;
      }
    }

    // انتهى الوقت - نعتبره متصلاً إن لم يكن هناك خطأ
    if (instance.status === 'connecting') {
      instance.status = 'connected';
      console.log(`⏰ MT5 [${key}] connection timeout, assuming connected`);
    }
  }

  // ===================== فحص السجلات =====================
  private checkLogs(logDir: string): { connected: boolean; failed: boolean; reason?: string } {
    try {
      if (!fs.existsSync(logDir)) return { connected: false, failed: false };

      const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log')).sort().reverse();
      if (files.length === 0) return { connected: false, failed: false };

      const content = fs.readFileSync(path.join(logDir, files[0]), 'utf-8');

      // مؤشرات النجاح
      if (/authorized|connection established|connected to/i.test(content)) {
        return { connected: true, failed: false };
      }

      // مؤشرات الفشل
      if (/invalid account|invalid password|account disabled/i.test(content)) {
        return { connected: false, failed: true, reason: 'بيانات الحساب غير صحيحة (Login أو Password خاطئ)' };
      }
      if (/no connection|connection failed|network is down/i.test(content)) {
        return { connected: false, failed: true, reason: 'تعذر الاتصال بسيرفر الوسيط. تحقق من اسم السيرفر.' };
      }
      if (/server not found|unknown server/i.test(content)) {
        return { connected: false, failed: true, reason: 'سيرفر الوسيط غير موجود. تحقق من الاسم.' };
      }

      return { connected: false, failed: false };
    } catch {
      return { connected: false, failed: false };
    }
  }

  // ===================== إيقاف مثيل =====================
  private killInstance(instance: MT5Instance): void {
    try {
      if (instance.process && !instance.process.killed) {
        instance.process.kill('SIGTERM');
        setTimeout(() => {
          try { instance.process?.kill('SIGKILL'); } catch { /* already dead */ }
        }, 3000);
      }
    } catch { /* process already dead */ }
    instance.process = null;
    instance.pid = null;
  }

  // ===================== قطع الاتصال =====================
  async disconnect(userId: string, accountId: string): Promise<void> {
    const key = `${userId}_${accountId}`;
    const instance = this.instances.get(key);
    if (!instance) return;

    this.killInstance(instance);
    instance.status = 'disconnected';
    instance.errorMessage = null;
    this.instances.delete(key);
    console.log(`🔌 MT5 [${key}] disconnected`);
  }

  // ===================== الحالة =====================
  getStatus(userId: string, accountId: string): MT5Status {
    const instance = this.instances.get(`${userId}_${accountId}`);
    if (!instance) {
      return { status: 'disconnected', errorMessage: null, pid: null, accountLogin: '', brokerServer: '', uptime: null };
    }
    instance.lastActivityAt = new Date();
    return this.buildStatus(instance);
  }

  private buildStatus(instance: MT5Instance): MT5Status {
    return {
      status: instance.status,
      errorMessage: instance.errorMessage,
      pid: instance.pid,
      accountLogin: instance.config.accountLogin,
      brokerServer: instance.config.brokerServer,
      uptime: instance.startedAt ? Math.floor((Date.now() - instance.startedAt.getTime()) / 1000) : null,
    };
  }

  // حسابات المستخدم
  getUserInstances(userId: string): MT5Status[] {
    const results: MT5Status[] = [];
    this.instances.forEach((inst) => {
      if (inst.userId === userId) results.push(this.buildStatus(inst));
    });
    return results;
  }

  // ===================== إيقاف الخمول =====================
  private stopIdleInstances(): void {
    const now = Date.now();
    this.instances.forEach((inst, key) => {
      if (
        (inst.status === 'connected' || inst.status === 'connecting') &&
        now - inst.lastActivityAt.getTime() > IDLE_TIMEOUT_MS
      ) {
        console.log(`💤 Stopping idle MT5: ${key}`);
        this.killInstance(inst);
        inst.status = 'stopped';
      }
    });
  }

  // إحصائيات النظام
  getSystemStats() {
    return {
      activeInstances: this.getActiveCount(),
      maxInstances: MAX_INSTANCES,
      baseInstalled: this.isBaseInstalled(),
      instancesDir: MT5_INSTANCES_DIR,
    };
  }

  // إيقاف الكل عند الإغلاق
  async shutdown(): Promise<void> {
    if (this.idleTimer) clearInterval(this.idleTimer);
    for (const [key, inst] of this.instances) {
      console.log(`🛑 Shutting down MT5: ${key}`);
      this.killInstance(inst);
    }
    this.instances.clear();
  }
}

// Singleton
export const mt5Manager = new MT5Manager();
