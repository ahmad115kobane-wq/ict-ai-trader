// run-migration.js
// تنفيذ migration لإنشاء جدول system_notifications

const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('🔄 Running system notifications migration...\n');

  try {
    const { query } = require('./dist/db/postgresAdapter');
    
    // قراءة ملف SQL
    const sqlFile = path.join(__dirname, 'create-system-notifications-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    
    // تنفيذ SQL
    await query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 System notifications table is ready');
    console.log('📱 You can now send system notifications');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
