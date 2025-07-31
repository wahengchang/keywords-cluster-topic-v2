class BaseModel {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
  }

  // Generic CRUD operations
  findAll(conditions = {}) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }
    
    return this.db.prepare(query).all(params);
  }

  findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return this.db.prepare(query).get(id);
  }

  findOne(conditions) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }
    
    query += ' LIMIT 1';
    return this.db.prepare(query).get(params);
  }

  create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data).map(value => {
      // Ensure SQLite-compatible values
      if (value === undefined) return null;
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
        return JSON.stringify(value);
      }
      return value;
    });
    const placeholders = keys.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const result = this.db.prepare(query).run(values);
      return this.findById(result.lastInsertRowid);
    } catch (error) {
      console.error(`Database error in ${this.tableName}:`, error.message);
      console.error('Data:', { keys, values });
      throw error;
    }
  }

  update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data).map(value => {
      // Ensure SQLite-compatible values
      if (value === undefined) return null;
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
        return JSON.stringify(value);
      }
      return value;
    });
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    // Check if table has updated_at column
    const hasUpdatedAt = this.hasColumn('updated_at');
    const updateClause = hasUpdatedAt ? 
      `${setClause}, updated_at = CURRENT_TIMESTAMP` : 
      setClause;
    
    const query = `UPDATE ${this.tableName} SET ${updateClause} WHERE id = ?`;
    
    try {
      this.db.prepare(query).run([...values, id]);
      return this.findById(id);
    } catch (error) {
      console.error(`Database error in ${this.tableName}:`, error.message);
      console.error('Update data:', { keys, values, id });
      throw error;
    }
  }

  delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    return this.db.prepare(query).run(id);
  }

  count(conditions = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }
    
    const result = this.db.prepare(query).get(params);
    return result.count;
  }

  // Check if table has a specific column
  hasColumn(columnName) {
    try {
      const query = `PRAGMA table_info(${this.tableName})`;
      const columns = this.db.prepare(query).all();
      return columns.some(col => col.name === columnName);
    } catch (error) {
      return false;
    }
  }

  // Transaction support
  transaction(callback) {
    const transaction = this.db.transaction(callback);
    return transaction();
  }
}

module.exports = BaseModel;