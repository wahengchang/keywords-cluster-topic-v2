const { fetchSemrushKeywordsDomain, fetchSemrushKeywordsSubfolder } = require('../semrush-api');
const { FileOperations } = require('../../cli/utils/file-operations');

// Business logic for keyword operations
class KeywordService {
  constructor(settings) {
    this.settings = settings;
  }

  async fetchKeywords({ method, target, database, limit }) {
    const apiKey = this.settings.semrushApiKey;
    
    if (!apiKey) {
      throw new Error('SEMrush API key not found in environment variables');
    }

    let csvData;
    if (method === 'Domain') {
      csvData = await fetchSemrushKeywordsDomain({
        target,
        database,
        limit
      });
    } else {
      csvData = await fetchSemrushKeywordsSubfolder({
        apiKey,
        subfolder: target,
        database,
        limit
      });
    }

    return csvData;
  }

  saveKeywords(csvData, target) {
    const filename = FileOperations.generateFilename(target);
    const filePath = FileOperations.saveData(csvData, filename);
    const stats = FileOperations.getFileStats(csvData);
    
    return {
      filename,
      filePath,
      keywordCount: stats.dataRows,
      stats
    };
  }

  async processKeywordRequest(params) {
    const csvData = await this.fetchKeywords(params);
    const result = this.saveKeywords(csvData, params.target);
    
    return {
      ...result,
      method: params.method,
      target: params.target,
      database: params.database,
      csvData
    };
  }
}

module.exports = { KeywordService };