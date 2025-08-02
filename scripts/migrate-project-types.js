#!/usr/bin/env node

/**
 * Migration script to update project_type constraint in SQLite database
 * This migrates from ('domain', 'subfolder') to ('domain', 'subdomain', 'subfolder', 'url')
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'keywords-cluster.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'keywords-cluster.db.backup');

console.log('🔄 Starting database migration for project_type constraint...');

try {
  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.log('❌ Database not found at:', DB_PATH);
    process.exit(1);
  }

  // Create backup if not exists
  if (!fs.existsSync(BACKUP_PATH)) {
    console.log('📦 Creating backup...');
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log('✅ Backup created at:', BACKUP_PATH);
  }

  const db = new Database(DB_PATH);

  // Check current schema
  const currentSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  console.log('📋 Current schema:', currentSchema.sql);

  // Check if migration is needed
  if (currentSchema.sql.includes("('domain', 'subdomain', 'subfolder', 'url')")) {
    console.log('✅ Database already has the correct constraint. No migration needed.');
    db.close();
    process.exit(0);
  }

  console.log('🔄 Starting migration...');

  // Disable foreign key constraints during migration
  db.pragma('foreign_keys = OFF');

  // Step 1: Create new table with correct constraint
  db.exec(`
    CREATE TABLE projects_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT,
      url TEXT,
      project_type TEXT CHECK(project_type IN ('domain', 'subdomain', 'subfolder', 'url')),
      slug TEXT UNIQUE NOT NULL,
      configuration TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_processed DATETIME
    )
  `);

  // Step 2: Copy data from old table to new table
  db.exec(`
    INSERT INTO projects_new (
      id, name, domain, url, project_type, slug, configuration, 
      status, tags, created_at, updated_at, last_processed
    )
    SELECT 
      id, name, domain, url, project_type, slug, configuration,
      status, tags, created_at, updated_at, last_processed
    FROM projects
  `);

  // Step 3: Drop old table and rename new table
  db.exec('DROP TABLE projects');
  db.exec('ALTER TABLE projects_new RENAME TO projects');

  // Step 4: Recreate indexes
  db.exec('CREATE INDEX idx_projects_slug ON projects (slug)');
  db.exec('CREATE INDEX idx_projects_domain ON projects (domain)');
  db.exec('CREATE INDEX idx_projects_status ON projects (status)');

  // Verify migration
  const newSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  console.log('✅ New schema:', newSchema.sql);

  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  console.log(`✅ Migrated ${projectCount.count} projects successfully`);

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