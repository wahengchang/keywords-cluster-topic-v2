const BaseModel = require('./base');

class KeywordModel extends BaseModel {
  constructor(db) {
    super(db, 'keywords');
  }

  // Create processed keyword from raw keyword
  createFromRaw(rawKeyword, processingData = {}) {
    const data = {
      project_id: rawKeyword.project_id,
      run_id: rawKeyword.run_id,
      raw_keyword_id: rawKeyword.id,
      keyword: rawKeyword.keyword,
      cleaned_keyword: processingData.cleaned_keyword || rawKeyword.keyword,
      search_volume: rawKeyword.search_volume,
      competition: rawKeyword.competition,
      cpc: rawKeyword.cpc,
      position: rawKeyword.position,
      traffic_percent: rawKeyword.traffic_percent,
      trends: rawKeyword.trends,
      intent: processingData.intent,
      intent_confidence: processingData.intent_confidence,
      cluster_id: processingData.cluster_id,
      cluster_name: processingData.cluster_name,
      cluster_center_distance: processingData.cluster_center_distance,
      priority_score: processingData.priority_score,
      priority_rank: processingData.priority_rank,
      priority_tier: processingData.priority_tier,
      word_count: rawKeyword.keyword.split(' ').length,
      character_count: rawKeyword.keyword.length,
      contains_brand: processingData.contains_brand || false,
      is_question: rawKeyword.keyword.match(/^(who|what|when|where|why|how|is|are|can|could|would|should|will|do|does|did)/i) !== null,
      metadata: JSON.stringify(processingData.metadata || {})
    };

    return this.create(data);
  }

  // Update clustering information
  updateClustering(keywordId, clusterData) {
    return this.update(keywordId, {
      cluster_id: clusterData.cluster_id,
      cluster_name: clusterData.cluster_name,
      cluster_center_distance: clusterData.distance
    });
  }

  // Update intent classification
  updateIntent(keywordId, intent, confidence) {
    return this.update(keywordId, {
      intent,
      intent_confidence: confidence
    });
  }

  // Update priority scoring
  updatePriority(keywordId, score, rank, tier) {
    return this.update(keywordId, {
      priority_score: score,
      priority_rank: rank,
      priority_tier: tier
    });
  }

  // Mark as duplicate
  markDuplicate(keywordId, duplicateOfId) {
    return this.update(keywordId, {
      is_duplicate: true,
      duplicate_of_id: duplicateOfId
    });
  }

  // Get keywords by cluster
  getByCluster(projectId, runId, clusterId) {
    return this.findAll({
      project_id: projectId,
      run_id: runId,
      cluster_id: clusterId
    });
  }

  // Get keywords by intent
  getByIntent(projectId, runId, intent) {
    return this.findAll({
      project_id: projectId,
      run_id: runId,
      intent
    });
  }

  // Get high priority keywords
  getHighPriority(projectId, runId, limit = 50) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = ? AND run_id = ? AND priority_tier = 'high'
      ORDER BY priority_score DESC
      LIMIT ?
    `;
    return this.db.prepare(query).all(projectId, runId, limit);
  }

  // Get keyword statistics for a run
  getRunStats(runId) {
    const query = `
      SELECT 
        COUNT(*) as total_keywords,
        SUM(search_volume) as total_search_volume,
        AVG(search_volume) as avg_search_volume,
        AVG(competition) as avg_competition,
        COUNT(CASE WHEN intent = 'commercial' THEN 1 END) as commercial_count,
        COUNT(CASE WHEN intent = 'informational' THEN 1 END) as informational_count,
        COUNT(CASE WHEN intent = 'navigational' THEN 1 END) as navigational_count,
        COUNT(CASE WHEN intent = 'transactional' THEN 1 END) as transactional_count,
        COUNT(CASE WHEN priority_tier = 'high' THEN 1 END) as high_priority_count,
        COUNT(CASE WHEN is_duplicate = 1 THEN 1 END) as duplicate_count
      FROM ${this.tableName}
      WHERE run_id = ?
    `;
    
    return this.db.prepare(query).get(runId);
  }

  // Search keywords
  search(projectId, searchTerm, limit = 100) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = ? AND (
        keyword LIKE ? OR 
        cleaned_keyword LIKE ?
      )
      ORDER BY search_volume DESC
      LIMIT ?
    `;
    
    const searchPattern = `%${searchTerm}%`;
    return this.db.prepare(query).all(projectId, searchPattern, searchPattern, limit);
  }

  // Get top keywords by search volume
  getTopByVolume(projectId, runId, limit = 50) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = ? AND run_id = ?
      ORDER BY search_volume DESC
      LIMIT ?
    `;
    return this.db.prepare(query).all(projectId, runId, limit);
  }
}

module.exports = KeywordModel;