const BaseModel = require('./base');

class RawKeywordModel extends BaseModel {
  constructor(db) {
    super(db, 'raw_keywords');
  }

  // Parse and save keywords from CSV data
  saveFromCSV(projectId, runId, csvData) {
    const lines = csvData.split('\n');
    if (lines.length < 2) return [];

    // Parse header to understand structure
    const header = lines[0].split(';');
    const keywords = [];

    // Process each line (skip header and empty lines)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(';');
      if (values.length < header.length) continue;

      // Map CSV columns to database fields based on sample structure
      const keywordData = {
        project_id: projectId,
        run_id: runId,
        keyword: values[0] || '',
        position: this.parseInteger(values[1]),
        previous_position: this.parseInteger(values[2]),
        position_difference: this.parseInteger(values[3]),
        search_volume: this.parseInteger(values[4]),
        cpc: this.parseFloat(values[5]),
        url: values[6] || '',
        traffic_percent: this.parseFloat(values[7]),
        traffic_cost_percent: this.parseFloat(values[8]),
        competition: this.parseFloat(values[9]),
        number_of_results: this.parseInteger(values[10]),
        trends: values[11] || ''
      };

      const savedKeyword = this.create(keywordData);
      keywords.push(savedKeyword);
    }

    return keywords;
  }

  // Get unprocessed keywords for a run
  getUnprocessed(runId) {
    return this.findAll({ 
      run_id: runId,
      is_processed: false 
    });
  }

  // Mark keywords as processed
  markProcessed(keywordIds) {
    if (!Array.isArray(keywordIds)) {
      keywordIds = [keywordIds];
    }

    const placeholders = keywordIds.map(() => '?').join(',');
    const query = `UPDATE ${this.tableName} SET is_processed = TRUE WHERE id IN (${placeholders})`;
    return this.db.prepare(query).run(keywordIds);
  }

  // Get keywords by project
  getByProject(projectId) {
    return this.findAll({ project_id: projectId });
  }

  // Get keywords by run
  getByRun(runId) {
    return this.findAll({ run_id: runId });
  }

  // Get keyword statistics for a run
  getRunStats(runId) {
    const query = `
      SELECT 
        COUNT(*) as total_keywords,
        SUM(search_volume) as total_search_volume,
        AVG(search_volume) as avg_search_volume,
        AVG(competition) as avg_competition,
        AVG(cpc) as avg_cpc,
        COUNT(CASE WHEN is_processed = 1 THEN 1 END) as processed_count
      FROM ${this.tableName}
      WHERE run_id = ?
    `;
    
    return this.db.prepare(query).get(runId);
  }

  // Helper methods for parsing
  parseInteger(value) {
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
  }

  parseFloat(value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
}

module.exports = RawKeywordModel;