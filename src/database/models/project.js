const BaseModel = require('./base');

class ProjectModel extends BaseModel {
  constructor(db) {
    super(db, 'projects');
  }

  findBySlug(slug) {
    const query = `SELECT * FROM ${this.tableName} WHERE slug = ?`;
    return this.db.prepare(query).get(slug);
  }

  findActive() {
    return this.findAll({ status: 'active' });
  }

  createProject({ name, domain, url, projectType, configuration = {}, tags = [] }) {
    const slug = this.generateSlug(name);
    
    const data = {
      name,
      domain,
      url,
      project_type: projectType,
      slug,
      configuration: JSON.stringify(configuration),
      tags: JSON.stringify(tags),
      status: 'active'
    };

    return this.create(data);
  }

  updateConfiguration(id, configuration) {
    return this.update(id, {
      configuration: JSON.stringify(configuration)
    });
  }

  archiveProject(id) {
    return this.update(id, { status: 'archived' });
  }

  deleteProject(id) {
    return this.update(id, { status: 'deleted' });
  }

  updateLastProcessed(id) {
    return this.update(id, { last_processed: new Date().toISOString() });
  }

  findByDomain(domain) {
    const query = `SELECT * FROM ${this.tableName} WHERE domain = ? AND status = 'active'`;
    return this.db.prepare(query).get(domain);
  }

  findByUrl(url) {
    const query = `SELECT * FROM ${this.tableName} WHERE url = ? AND status = 'active'`;
    return this.db.prepare(query).get(url);
  }

  // Dangerous operations - use with caution
  deleteProjectCompletely(id) {
    // This will cascade delete all related data due to foreign key constraints
    return this.delete(id);
  }

  clearAllProjects() {
    // Delete all projects and related data
    const transaction = this.db.transaction(() => {
      // Order matters due to foreign key constraints
      this.db.prepare('DELETE FROM api_usage').run();
      this.db.prepare('DELETE FROM processing_logs').run();
      this.db.prepare('DELETE FROM generated_content').run();
      this.db.prepare('DELETE FROM priority_analysis').run();
      this.db.prepare('DELETE FROM deduplication_groups').run();
      this.db.prepare('DELETE FROM keyword_clusters').run();
      this.db.prepare('DELETE FROM keywords').run();
      this.db.prepare('DELETE FROM raw_keywords').run();
      this.db.prepare('DELETE FROM processing_runs').run();
      this.db.prepare('DELETE FROM projects').run();
      
      // Reset auto-increment counters
      this.db.prepare('DELETE FROM sqlite_sequence').run();
    });
    
    return transaction();
  }

  getProjectWithStats(id) {
    const project = this.findById(id);
    if (!project) return null;
    
    const stats = this.getProjectStats(id);
    return { ...project, stats };
  }

  getProjectStats(id) {
    const queries = {
      totalRuns: 'SELECT COUNT(*) as count FROM processing_runs WHERE project_id = ?',
      totalKeywords: 'SELECT COUNT(*) as count FROM keywords WHERE project_id = ?',
      lastRun: 'SELECT * FROM processing_runs WHERE project_id = ? ORDER BY started_at DESC LIMIT 1'
    };

    const stats = {};
    for (const [key, query] of Object.entries(queries)) {
      if (key === 'lastRun') {
        stats[key] = this.db.prepare(query).get(id);
      } else {
        const result = this.db.prepare(query).get(id);
        stats[key] = result.count;
      }
    }

    return stats;
  }

  generateSlug(name) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (this.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }
}

module.exports = ProjectModel;