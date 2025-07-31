const BaseModel = require('./base');

class ClusterModel extends BaseModel {
  constructor(db) {
    super(db, 'keyword_clusters');
  }

  // Save clustering results
  saveClusters(runId, projectId, clustersData) {
    const results = [];
    
    for (const cluster of clustersData) {
      const data = {
        project_id: projectId,
        run_id: runId,
        cluster_name: cluster.name || `Cluster ${cluster.id || results.length + 1}`,
        cluster_theme: cluster.theme,
        cluster_description: cluster.description,
        keyword_count: cluster.keywords ? cluster.keywords.length : 0,
        total_search_volume: cluster.total_search_volume || 0,
        avg_competition: cluster.avg_competition || 0,
        avg_cpc: cluster.avg_cpc || 0,
        coherence_score: cluster.coherence_score,
        silhouette_score: cluster.silhouette_score,
        business_value_score: cluster.business_value_score,
        center_vector: JSON.stringify(cluster.center || []),
        semantic_center: cluster.semantic_center
      };
      
      const savedCluster = this.create(data);
      results.push(savedCluster);
    }
    
    return results;
  }

  // Get clusters for a project run
  getClusters(projectId, runId) {
    return this.findAll({
      project_id: projectId,
      run_id: runId
    });
  }

  // Get cluster by ID with keywords
  getClusterWithKeywords(clusterId) {
    const cluster = this.findById(clusterId);
    if (!cluster) return null;

    // Get keywords in this cluster
    const KeywordModel = require('./keyword');
    const keywordModel = new KeywordModel(this.db);
    
    const keywords = keywordModel.getByCluster(
      cluster.project_id, 
      cluster.run_id, 
      clusterId
    );
    
    return {
      ...cluster,
      keywords,
      center: cluster.center_vector ? JSON.parse(cluster.center_vector) : []
    };
  }

  // Get cluster statistics for a run
  getRunClusterStats(runId) {
    const query = `
      SELECT 
        COUNT(*) as total_clusters,
        AVG(keyword_count) as avg_keywords_per_cluster,
        AVG(coherence_score) as avg_coherence_score,
        AVG(silhouette_score) as avg_silhouette_score,
        SUM(total_search_volume) as total_clustered_volume,
        MAX(keyword_count) as largest_cluster_size,
        MIN(keyword_count) as smallest_cluster_size
      FROM ${this.tableName}
      WHERE run_id = ?
    `;
    
    return this.db.prepare(query).get(runId);
  }

  // Get top clusters by search volume
  getTopClustersByVolume(projectId, runId, limit = 10) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = ? AND run_id = ?
      ORDER BY total_search_volume DESC
      LIMIT ?
    `;
    return this.db.prepare(query).all(projectId, runId, limit);
  }

  // Get clusters by business value score
  getTopClustersByValue(projectId, runId, limit = 10) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = ? AND run_id = ?
      ORDER BY business_value_score DESC
      LIMIT ?
    `;
    return this.db.prepare(query).all(projectId, runId, limit);
  }

  // Update cluster theme and description
  updateClusterInfo(clusterId, theme, description) {
    return this.update(clusterId, {
      cluster_theme: theme,
      cluster_description: description
    });
  }

  // Delete clusters for a run (cleanup)
  deleteByRun(runId) {
    const query = `DELETE FROM ${this.tableName} WHERE run_id = ?`;
    return this.db.prepare(query).run(runId);
  }
}

module.exports = ClusterModel;