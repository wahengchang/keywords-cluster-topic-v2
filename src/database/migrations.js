const Database = require('better-sqlite3');
const path = require('path');

class DatabaseMigrations {
  constructor(dbPath) {
    this.db = new Database(dbPath);
  }

  /**
   * Get current schema version
   */
  getCurrentVersion() {
    try {
      const row = this.db.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get();
      return row ? parseInt(row.value) : 0;
    } catch (error) {
      // If metadata table doesn't exist, create it and return version 0
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return 0;
    }
  }

  /**
   * Set schema version
   */
  setVersion(version) {
    this.db.prepare(`
      INSERT OR REPLACE INTO metadata (key, value, updated_at)
      VALUES ('schema_version', ?, CURRENT_TIMESTAMP)
    `).run(version.toString());
  }

  /**
   * Check if column exists in table
   */
  columnExists(tableName, columnName) {
    try {
      const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
      return columns.some(col => col.name === columnName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Run all pending migrations
   */
  migrate() {
    const currentVersion = this.getCurrentVersion();
    console.log(`Current database schema version: ${currentVersion}`);

    // Migration 1: Add expansion_type and source columns to keywords table
    if (currentVersion < 1) {
      console.log('Running migration 1: Adding expansion_type and source columns...');
      
      try {
        // Check if columns already exist
        if (!this.columnExists('keywords', 'expansion_type')) {
          this.db.exec(`
            ALTER TABLE keywords 
            ADD COLUMN expansion_type TEXT CHECK(expansion_type IN ('original', 'related', 'semantic', 'competitor', 'long_tail'))
          `);
          console.log('✅ Added expansion_type column to keywords table');
        } else {
          console.log('✅ expansion_type column already exists');
        }

        if (!this.columnExists('keywords', 'source')) {
          this.db.exec(`
            ALTER TABLE keywords 
            ADD COLUMN source TEXT
          `);
          console.log('✅ Added source column to keywords table');
        } else {
          console.log('✅ source column already exists');
        }

        this.setVersion(1);
        console.log('✅ Migration 1 completed successfully');
      } catch (error) {
        console.error('❌ Migration 1 failed:', error.message);
        throw error;
      }
    }

    // Future migrations can be added here
    // if (currentVersion < 2) { ... }

    console.log('✅ All migrations completed');
  }

  /**
   * Static method to run migrations on default database
   */
  static runMigrations() {
    const DB_PATH = path.join(__dirname, '..', '..', 'data', 'keywords-cluster.db');
    const migrations = new DatabaseMigrations(DB_PATH);
    migrations.migrate();
    migrations.db.close();
  }
}

module.exports = DatabaseMigrations;

// If run directly, execute migrations
if (require.main === module) {
  try {
    DatabaseMigrations.runMigrations();
    console.log('🎉 Database migrations completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}