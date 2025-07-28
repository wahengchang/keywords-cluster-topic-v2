const BaseModel = require('./base');

class ProcessingRunModel extends BaseModel {
  constructor(db) {
    super(db, 'processing_runs');
  }

  startRun(projectId, runType = 'create') {
    const data = {
      project_id: projectId,
      run_type: runType,
      scrape_date: new Date().toISOString().split('T')[0],
      status: 'running',
      started_at: new Date().toISOString(),
      current_stage: 'initialization'
    };

    return this.create(data);
  }

  updateProgress(runId, stage, completedStages, progressPercent) {
    return this.update(runId, {
      current_stage: stage,
      completed_stages: completedStages,
      progress_percent: progressPercent
    });
  }

  completeRun(runId, stats = {}) {
    return this.update(runId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress_percent: 100,
      processing_stats: JSON.stringify(stats)
    });
  }

  markFailed(runId, errorMessage) {
    return this.update(runId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage
    });
  }

  incrementApiUsage(runId, provider) {
    const column = provider === 'semrush' ? 'semrush_api_calls' : 'openai_api_calls';
    const current = this.findById(runId);
    const newCount = (current[column] || 0) + 1;
    
    return this.update(runId, { [column]: newCount });
  }

  getRunsByProject(projectId) {
    return this.findAll({ project_id: projectId });
  }

  getRecentRuns(limit = 10) {
    const query = `SELECT * FROM ${this.tableName} ORDER BY started_at DESC LIMIT ?`;
    return this.db.prepare(query).all(limit);
  }

  getRunHistory(projectId, limit = 5) {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE project_id = ? 
      ORDER BY scrape_date DESC 
      LIMIT ?
    `;
    return this.db.prepare(query).all(projectId, limit);
  }
}

module.exports = ProcessingRunModel;