const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

class DatabaseConnection {
  constructor(dbPath = './data/keywords-cluster.db') {
    this.dbPath = path.resolve(dbPath);
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      await fs.ensureDir(dbDir);

      // Create database connection
      this.db = new Database(this.dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Set WAL mode for better performance
      this.db.pragma('journal_mode = WAL');
      
      // Create tables if they don't exist
      await this.createTables();
      
      this.isInitialized = true;
      console.log(`Database initialized at: ${this.dbPath}`);
      
      return this.db;
    } catch (error) {
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  async createTables() {
    const schema = require('./schema');
    
    // Execute schema creation in transaction
    const transaction = this.db.transaction(() => {
      schema.createTables(this.db);
      schema.createIndexes(this.db);
      schema.insertDefaults(this.db);
    });
    
    transaction();
  }

  getConnection() {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  // Backup functionality
  async backup(backupPath) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    await this.db.backup(backupPath);
    console.log(`Database backed up to: ${backupPath}`);
  }
}

// Singleton instance
let dbInstance = null;

module.exports = {
  DatabaseConnection,
  getDatabase: async () => {
    if (!dbInstance) {
      dbInstance = new DatabaseConnection();
      await dbInstance.initialize();
    }
    return dbInstance.getConnection();
  },
  closeDatabase: () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  }
};