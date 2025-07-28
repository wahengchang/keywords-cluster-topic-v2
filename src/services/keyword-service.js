const { fetchSemrushKeywordsDomain, fetchSemrushKeywordsSubfolder } = require('../semrush-api');
const { getDatabase } = require('../database/connection');
const ProjectModel = require('../database/models/project');
const ProcessingRunModel = require('../database/models/processing-run');
const RawKeywordModel = require('../database/models/raw-keyword');

// Business logic for keyword operations
class KeywordService {
  constructor(settings) {
    this.settings = settings;
    this.db = null;
    this.projectModel = null;
    this.processingRunModel = null;
    this.rawKeywordModel = null;
  }

  async initialize() {
    this.db = await getDatabase();
    this.projectModel = new ProjectModel(this.db);
    this.processingRunModel = new ProcessingRunModel(this.db);
    this.rawKeywordModel = new RawKeywordModel(this.db);
  }

  async createProject({ name, method, target, database }) {
    if (!this.db) await this.initialize();

    const projectData = {
      name,
      projectType: method.toLowerCase(),
      domain: method === 'Domain' ? target : null,
      url: method === 'Subfolder' ? target : null,
      configuration: { database }
    };

    return this.projectModel.createProject(projectData);
  }

  async startProcessingRun(projectId, runType = 'create') {
    if (!this.db) await this.initialize();

    return this.processingRunModel.startRun(projectId, runType);
  }

  async saveRawKeywords(runId, projectId, csvData) {
    if (!this.db) await this.initialize();

    const keywords = this.rawKeywordModel.saveFromCSV(projectId, runId, csvData);
    return keywords;
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

  async processKeywordRequest(params) {
    if (!this.db) await this.initialize();

    // Create project
    const project = await this.createProject(params);
    
    // Start processing run
    const run = await this.startProcessingRun(project.id, 'create');
    
    try {
      // Update progress
      await this.processingRunModel.updateProgress(run.id, 'fetching_data', 1, 12);
      
      // Fetch keywords from SEMrush
      const csvData = await this.fetchKeywords(params);
      
      // Increment API usage counter
      await this.processingRunModel.incrementApiUsage(run.id, 'semrush');
      
      // Update progress
      await this.processingRunModel.updateProgress(run.id, 'saving_raw_data', 2, 25);
      
      // Save raw keywords to database
      const keywords = await this.saveRawKeywords(run.id, project.id, csvData);
      
      // Update progress
      await this.processingRunModel.updateProgress(run.id, 'data_saved', 3, 37);
      
      // Complete the run
      const stats = {
        keywords_fetched: keywords.length,
        api_calls: 1,
        data_size: csvData.length
      };
      
      await this.processingRunModel.completeRun(run.id, stats);
      
      // Update project last processed time
      await this.projectModel.updateLastProcessed(project.id);

      return {
        project,
        run,
        keywordCount: keywords.length,
        method: params.method,
        target: params.target,
        database: params.database,
        csvData
      };
    } catch (error) {
      // Mark run as failed
      await this.processingRunModel.markFailed(run.id, error.message);
      throw error;
    }
  }

  // Get project by slug
  async getProject(slug) {
    if (!this.db) await this.initialize();
    return this.projectModel.findBySlug(slug);
  }

  // List all active projects
  async listProjects() {
    if (!this.db) await this.initialize();
    return this.projectModel.findActive();
  }

  // Get project statistics
  async getProjectStats(projectId) {
    if (!this.db) await this.initialize();
    return this.projectModel.getProjectStats(projectId);
  }
}

module.exports = { KeywordService };