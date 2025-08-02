#!/usr/bin/env node

/**
 * Migration script to update run_type constraint in processing_runs table
 * Adds 'faq_generation' to allowed run types
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'keywords-cluster.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'keywords-cluster.db.backup-run-types');

console.log('🔄 Starting database migration for run_type constraint...');

try {
  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.log('❌ Database not found at:', DB_PATH);
    process.exit(1);
  }

  // Create backup
  console.log('📦 Creating backup...');
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log('✅ Backup created at:', BACKUP_PATH);

  const db = new Database(DB_PATH);

  // Check current schema
  const currentSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='processing_runs'").get();
  console.log('📋 Current schema:', currentSchema.sql);

  // Check if migration is needed
  if (currentSchema.sql.includes("'faq_generation'")) {
    console.log('✅ Database already has the correct constraint. No migration needed.');
    db.close();
    process.exit(0);
  }

  console.log('🔄 Starting migration...');

  // Disable foreign key constraints during migration
  db.pragma('foreign_keys = OFF');

  // Step 1: Create new table with correct constraint
  db.exec(`
    CREATE TABLE processing_runs_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      run_type TEXT NOT NULL CHECK(run_type IN ('create', 'rescrape', 'writemore', 'analyze', 'faq_generation')),
      scrape_date DATE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
      current_stage TEXT,
      total_stages INTEGER DEFAULT 8,
      completed_stages INTEGER DEFAULT 0,
      progress_percent INTEGER DEFAULT 0,
      started_at DATETIME,
      completed_at DATETIME,
      error_message TEXT,
      processing_stats TEXT,
      semrush_api_calls INTEGER DEFAULT 0,
      openai_api_calls INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
  `);

  // Step 2: Copy data from old table to new table
  db.exec(`
    INSERT INTO processing_runs_new (
      id, project_id, run_type, scrape_date, status, current_stage, 
      total_stages, completed_stages, progress_percent, started_at, 
      completed_at, error_message, processing_stats, semrush_api_calls, openai_api_calls
    )
    SELECT 
      id, project_id, run_type, scrape_date, status, current_stage,
      total_stages, completed_stages, progress_percent, started_at,
      completed_at, error_message, processing_stats, semrush_api_calls, openai_api_calls
    FROM processing_runs
  `);

  // Step 3: Drop old table and rename new table
  db.exec('DROP TABLE processing_runs');
  db.exec('ALTER TABLE processing_runs_new RENAME TO processing_runs');

  // Step 4: Recreate indexes to match existing ones
  try {
    db.exec('CREATE INDEX idx_runs_project ON processing_runs (project_id)');
    db.exec('CREATE INDEX idx_runs_date ON processing_runs (scrape_date)');
    db.exec('CREATE INDEX idx_runs_status ON processing_runs (status)');
  } catch (indexError) {
    console.log('⚠️  Some indexes may not have existed, skipping...');
  }

  // Verify migration
  const newSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='processing_runs'").get();
  console.log('✅ New schema:', newSchema.sql);

  const runCount = db.prepare('SELECT COUNT(*) as count FROM processing_runs').get();
  console.log(`✅ Migrated ${runCount.count} processing runs successfully`);

  // Re-enable foreign key constraints
  db.pragma('foreign_keys = ON');

  db.close();
  console.log('🎉 Migration completed successfully!');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  
  // Restore backup if migration failed
  if (fs.existsSync(BACKUP_PATH)) {
    console.log('🔄 Restoring from backup...');
    fs.copyFileSync(BACKUP_PATH, DB_PATH);
    console.log('✅ Database restored from backup');
  }
  
  process.exit(1);
}