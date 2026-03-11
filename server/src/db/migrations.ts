// db/migrations.ts - Database Migrations
// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 تحديثات قاعدة البيانات للنظام الجديد
// ═══════════════════════════════════════════════════════════════════════════════

import { getPool } from './postgresAdapter';

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    throw new Error('PostgreSQL not initialized');
  }

  const client = await pool.connect();
  
  try {
    console.log('🔄 Running database migrations...');
    
    await client.query('BEGIN');

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. إضافة حقل balance في جدول users
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('📊 Adding balance column to users table...');
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='balance'
        ) THEN
          ALTER TABLE users ADD COLUMN balance REAL DEFAULT 10000;
          UPDATE users SET balance = 10000 WHERE balance IS NULL;
          RAISE NOTICE 'Added balance column to users table';
        ELSE
          RAISE NOTICE 'Balance column already exists';
        END IF;
      END $$;
    `);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. إنشاء جدول paper_positions
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('📊 Creating paper_positions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS paper_positions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        lot_size REAL NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        close_price REAL,
        realized_pnl REAL,
        status TEXT DEFAULT 'open',
        close_reason TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. إنشاء الفهارس
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('📊 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_user 
      ON paper_positions(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_status 
      ON paper_positions(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_user_status 
      ON paper_positions(user_id, status);
    `);

    await client.query('COMMIT');
    
    console.log('✅ All migrations completed successfully!');
    
    // عرض إحصائيات
    const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
    const positionsResult = await client.query('SELECT COUNT(*) as count FROM paper_positions');
    
    console.log(`📊 Database Statistics:`);
    console.log(`   Users: ${usersResult.rows[0].count}`);
    console.log(`   Positions: ${positionsResult.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 التحقق من حالة قاعدة البيانات
// ═══════════════════════════════════════════════════════════════════════════════

export async function checkDatabaseStatus(): Promise<any> {
  const pool = getPool();
  if (!pool) {
    throw new Error('PostgreSQL not initialized');
  }

  const client = await pool.connect();
  
  try {
    // التحقق من وجود حقل balance
    const balanceCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='balance'
      ) as has_balance;
    `);

    // التحقق من وجود جدول paper_positions
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name='paper_positions'
      ) as has_table;
    `);

    // عدد المستخدمين
    const usersCount = await client.query('SELECT COUNT(*) as count FROM users');
    
    // عدد الصفقات
    let positionsCount = { rows: [{ count: 0 }] };
    if (tableCheck.rows[0].has_table) {
      positionsCount = await client.query('SELECT COUNT(*) as count FROM paper_positions');
    }

    // عدد الصفقات المفتوحة
    let openPositionsCount = { rows: [{ count: 0 }] };
    if (tableCheck.rows[0].has_table) {
      openPositionsCount = await client.query(`
        SELECT COUNT(*) as count FROM paper_positions WHERE status = 'open'
      `);
    }

    return {
      hasBalanceColumn: balanceCheck.rows[0].has_balance,
      hasPositionsTable: tableCheck.rows[0].has_table,
      usersCount: usersCount.rows[0].count,
      totalPositions: positionsCount.rows[0].count,
      openPositions: openPositionsCount.rows[0].count,
      needsMigration: !balanceCheck.rows[0].has_balance || !tableCheck.rows[0].has_table
    };
    
  } catch (error) {
    console.error('❌ Error checking database status:', error);
    throw error;
  } finally {
    client.release();
  }
}
