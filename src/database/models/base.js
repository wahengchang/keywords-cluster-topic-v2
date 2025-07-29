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
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = this.db.prepare(query).run(values);
    
    return this.findById(result.lastInsertRowid);
  }

  update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const query = `UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(query).run([...values, id]);
    
    return this.findById(id);
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

  // Transaction support
  transaction(callback) {
    const transaction = this.db.transaction(callback);
    return transaction();
  }
}

module.exports = BaseModel;