// إصلاح مشكلة إشعارات النظام - إنشاء الجدول وإرسال إشعار تجريبي
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:BQaYqmOpBsLgATFrbTpBxMGvHDNqjLsb@shortline.proxy.rlwy.net:56702/railway';

async function fixNotifications() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔧 بدء إصلاح نظام الإشعارات...\n');
        console.log('🔌 الاتصال بقاعدة البيانات...');
        await client.connect();
        console.log('✅ تم الاتصال بنجاح\n');

        // الخطوة 1: التحقق من وجود الجدول
        console.log('📋 الخطوة 1: التحقق من جدول system_notifications...');
        const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_notifications'
      );
    `);

        const tableExists = tableCheckResult.rows[0].exists;

        if (!tableExists) {
            console.log('⚠️  الجدول غير موجود - سيتم إنشاؤه الآن...\n');

            // إنشاء الجدول
            console.log('🔨 إنشاء جدول system_notifications...');
            await client.query(`
        CREATE TABLE system_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'normal',
          data JSONB,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
            console.log('✅ تم إنشاء الجدول بنجاح');

            // إنشاء الفهارس
            console.log('🔨 إنشاء الفهارس...');
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_system_notifications_user 
        ON system_notifications(user_id, created_at DESC);
      `);

            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_system_notifications_read 
        ON system_notifications(user_id, read);
      `);

            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_system_notifications_type 
        ON system_notifications(type);
      `);
            console.log('✅ تم إنشاء الفهارس بنجاح');

            // إضافة أعمدة للمستخدمين
            console.log('🔨 إضافة أعمدة لجدول users...');
            try {
                await client.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS subscription_expiry_notified BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS subscription_expiring_notified BOOLEAN DEFAULT false;
        `);
                console.log('✅ تم إضافة الأعمدة بنجاح');
            } catch (err) {
                console.log('⚠️  الأعمدة موجودة مسبقاً (تخطي)');
            }

            console.log('\n🎉 تم إنشاء نظام الإشعارات بنجاح!\n');
        } else {
            console.log('✅ جدول system_notifications موجود\n');
        }

        // الخطوة 2: التحقق من عدد الإشعارات
        console.log('📋 الخطوة 2: التحقق من الإشعارات الموجودة...');
        const countResult = await client.query('SELECT COUNT(*) FROM system_notifications');
        const totalCount = parseInt(countResult.rows[0].count);
        console.log(`📊 عدد الإشعارات الحالية: ${totalCount}\n`);

        // الخطوة 3: إرسال إشعار تجريبي لجميع المستخدمين
        console.log('📋 الخطوة 3: إرسال إشعار تجريبي...');

        // جلب جميع المستخدمين
        const usersResult = await client.query('SELECT id, email FROM users LIMIT 10');

        if (usersResult.rows.length === 0) {
            console.log('⚠️  لا يوجد مستخدمون في قاعدة البيانات');
            console.log('💡 قم بإنشاء حساب في التطبيق أولاً\n');
        } else {
            console.log(`👥 وجدنا ${usersResult.rows.length} مستخدمين`);
            console.log('📨 إرسال إشعار تجريبي لكل مستخدم...\n');

            let sentCount = 0;
            for (const user of usersResult.rows) {
                try {
                    await client.query(`
            INSERT INTO system_notifications (user_id, type, title, message, priority, read, created_at)
            VALUES ($1, $2, $3, $4, $5, false, NOW())
          `, [
                        user.id,
                        'system_update',
                        '🎉 نظام الإشعارات يعمل الآن!',
                        'تم إصلاح مشكلة الإشعارات. ستتلقى من الآن إشعارات حول اشتراكك، العملات، والتحديثات الجديدة.',
                        'normal'
                    ]);
                    sentCount++;
                    console.log(`✅ تم إرسال إشعار لـ ${user.email}`);
                } catch (err) {
                    console.log(`❌ فشل إرسال إشعار لـ ${user.email}: ${err.message}`);
                }
            }

            console.log(`\n🎊 تم إرسال ${sentCount} إشعار تجريبي بنجاح!\n`);
        }

        // الخطوة 4: عرض النتائج النهائية
        console.log('📋 الخطوة 4: التحقق النهائي...');
        const finalCountResult = await client.query('SELECT COUNT(*) FROM system_notifications');
        const finalCount = parseInt(finalCountResult.rows[0].count);
        console.log(`📊 إجمالي الإشعارات الآن: ${finalCount}\n`);

        console.log('═'.repeat(60));
        console.log('✨ تم الإصلاح بنجاح!');
        console.log('═'.repeat(60));
        console.log('\n📱 الخطوات التالية:');
        console.log('  1. افتح التطبيق المحمول');
        console.log('  2. انتقل إلى صفحة الإشعارات');
        console.log('  3. يجب أن ترى الإشعار التجريبي الآن! 🎉\n');

    } catch (error) {
        console.error('\n❌ حدث خطأ:', error.message);
        console.error('\n💡 نصائح لحل المشكلة:');
        console.error('  1. تأكد من صحة DATABASE_URL');
        console.error('  2. تأكد من صلاحيات قاعدة البيانات');
        console.error('  3. تأكد من الاتصال بالإنترنت\n');
    } finally {
        await client.end();
        console.log('🔌 تم إغلاق الاتصال');
    }
}

fixNotifications();
