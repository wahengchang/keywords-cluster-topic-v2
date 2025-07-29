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