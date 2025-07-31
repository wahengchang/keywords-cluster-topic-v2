const BaseModel = require('./base');

class DeduplicationModel extends BaseModel {
  constructor(db) {
    super(db, 'deduplication_groups');
  }

  // Save deduplication groups
  saveDeduplicationGroups(runId, projectId, groupsData) {
    const results = [];
    
    for (const group of groupsData) {
      const data = {
        project_id: projectId,
        run_id: runId,
        group_type: group.type || 'similarity',
        master_keyword_id: group.master_keyword_id,
        keyword_count: group.keywords ? group.keywords.length : 0,
        similarity_threshold: group.similarity_threshold || 0.8
      };
      
      const savedGroup = this.create(data);
      results.push(savedGroup);
    }
    
    return results;
  }

  // Get deduplication groups for a run
  getGroups(projectId, runId) {
    return this.findAll({
      project_id: projectId,
      run_id: runId
    });
  }

  // Get group with all duplicate keywords
  getGroupWithKeywords(groupId) {
    const group = this.findById(groupId);
    if (!group) return null;

    // Get keywords that are duplicates in this group
    const KeywordModel = require('./keyword');
    const keywordModel = new KeywordModel(this.db);
    
    const query = `
      SELECT * FROM keywords 
      WHERE project_id = ? AND run_id = ? AND 
            (master_keyword_id = ? OR id = ?)
      ORDER BY search_volume DESC
    `;
    
    const keywords = this.db.prepare(query).all(
      group.project_id,
      group.run_id,
      group.master_keyword_id,
      group.master_keyword_id
    );
    
    return {
      ...group,
      keywords
    };
  }

  // Get deduplication statistics for a run
  getRunDeduplicationStats(runId) {
    const query = `
      SELECT 
        COUNT(*) as total_groups,
        SUM(keyword_count) as total_duplicates,
        AVG(keyword_count) as avg_group_size,
        AVG(similarity_threshold) as avg_threshold,
        MAX(keyword_count) as largest_group_size
      FROM ${this.tableName}
      WHERE run_id = ?
    `;
    
    return this.db.prepare(query).get(runId);
  }

  // Get largest deduplication groups
  getLargestGroups(projectId, runId, limit = 10) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = ? AND run_id = ?
      ORDER BY keyword_count DESC
      LIMIT ?
    `;
    return this.db.prepare(query).all(projectId, runId, limit);
  }

  // Delete groups for a run (cleanup)
  deleteByRun(runId) {
    const query = `DELETE FROM ${this.tableName} WHERE run_id = ?`;
    return this.db.prepare(query).run(runId);
  }
}

module.exports = DeduplicationModel;