const { fetchSemrushKeywordsDomain, fetchSemrushKeywordsSubfolder } = require('../semrush-api');
const { getDatabase } = require('../database/connection');
const ProjectModel = require('../database/models/project');
const ProcessingRunModel = require('../database/models/processing-run');
const RawKeywordModel = require('../database/models/raw-keyword');
const KeywordModel = require('../database/models/keyword');
const ClusterModel = require('../database/models/cluster');
const DeduplicationModel = require('../database/models/deduplication');
const { FileOperations } = require('../../cli/utils/file-operations');

// Processing services
const DataCleaningService = require('./data-cleaning-service');
const DeduplicationService = require('./deduplication-service');
const { ClusteringService } = require('./clustering-service');
const { PriorityScoringService } = require('./priority-scoring-service');

// Business logic for keyword operations
class KeywordService {
  constructor(settings) {
    this.settings = settings;
    this.db = null;
    this.projectModel = null;
    this.processingRunModel = null;
    this.rawKeywordModel = null;
    this.keywordModel = null;
    this.clusterModel = null;
    this.deduplicationModel = null;
    
    // Initialize processing services
    this.cleaningService = new DataCleaningService();
    this.deduplicationService = new DeduplicationService();
    this.clusteringService = new ClusteringService();
    this.priorityService = new PriorityScoringService();
  }

  async initialize() {
    this.db = await getDatabase();
    this.projectModel = new ProjectModel(this.db);
    this.processingRunModel = new ProcessingRunModel(this.db);
    this.rawKeywordModel = new RawKeywordModel(this.db);
    this.keywordModel = new KeywordModel(this.db);
    this.clusterModel = new ClusterModel(this.db);
    this.deduplicationModel = new DeduplicationModel(this.db);
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
    console.log(`✓ Saved ${keywords.length} raw keywords to database`);
    return keywords;
  }

  async saveProcessedResults(runId, projectId, processedData) {
    if (!this.db) await this.initialize();

    const { cleanedKeywords, clusters, scoredKeywords, similarGroups } = processedData;
    
    // Save cleaned and processed keywords
    const savedKeywords = [];
    for (const keyword of scoredKeywords) {
      // The scoredKeywords should have the raw keyword data, since they went through the pipeline
      const keywordData = this.keywordModel.createFromRaw(keyword, {
        cleaned_keyword: keyword.cleaned_keyword || keyword.keyword,
        intent: keyword.intent,
        intent_confidence: keyword.intent_confidence,
        cluster_id: keyword.cluster_id,
        cluster_name: keyword.cluster_name,
        cluster_center_distance: keyword.cluster_distance,
        priority_score: keyword.priority_score,
        priority_rank: keyword.priority_rank,
        priority_tier: keyword.priority_tier,
        difficulty_score: keyword.difficulty_score,
        opportunity_score: keyword.opportunity_score,
        business_value_score: keyword.business_value_score,
        contains_brand: keyword.contains_brand || false,
        metadata: keyword.metadata || {}
      });
      savedKeywords.push(keywordData);
    }

    // Save clusters
    const savedClusters = this.clusterModel.saveClusters(runId, projectId, clusters);
    console.log(`✓ Saved ${savedClusters.length} clusters to database`);

    // Save deduplication groups
    let savedGroups = [];
    if (similarGroups && similarGroups.length > 0) {
      savedGroups = this.deduplicationModel.saveDeduplicationGroups(runId, projectId, similarGroups);
      console.log(`✓ Saved ${savedGroups.length} deduplication groups to database`);
    }

    console.log(`✓ Saved ${savedKeywords.length} processed keywords to database`);

    return {
      keywords: savedKeywords,
      clusters: savedClusters,
      deduplicationGroups: savedGroups
    };
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
      // STAGE 1: Fetch data from SEMrush
      await this.processingRunModel.updateProgress(run.id, 'fetching_data', 1, 12);
      const csvData = await this.fetchKeywords(params);
      await this.processingRunModel.incrementApiUsage(run.id, 'semrush');
      
      // STAGE 2: Save raw keywords to database
      await this.processingRunModel.updateProgress(run.id, 'saving_raw_data', 2, 25);
      const rawKeywords = await this.saveRawKeywords(run.id, project.id, csvData);
      
      // STAGE 3: Data Cleaning
      console.log('[STAGE]3: Data Cleaning')
      await this.processingRunModel.updateProgress(run.id, 'cleaning_data', 3, 37);
      const cleanedKeywords = await this.cleaningService.cleanKeywords(rawKeywords);
      
      // STAGE 4: Deduplication
      console.log('[STAGE]4: Deduplication')
      await this.processingRunModel.updateProgress(run.id, 'deduplicating', 4, 50);
      const deduplicationResult = await this.deduplicationService.deduplicateKeywords(cleanedKeywords);
      const { unique: uniqueKeywords, similarGroups } = deduplicationResult;
      
      // STAGE 5: Clustering Analysis
      console.log('[STAGE]5: Clustering Analysis')
      await this.processingRunModel.updateProgress(run.id, 'clustering', 5, 62);
      const clusters = await this.clusteringService.performAdvancedClustering(uniqueKeywords);
      
      // Assign cluster IDs and names to keywords
      clusters.forEach((cluster, cid) => {
        cluster.keywords.forEach(k => {
          k.cluster_id = cid;
          k.cluster_name = cluster.name;
        });
      });
      
      // STAGE 6: Priority Scoring
      await this.processingRunModel.updateProgress(run.id, 'scoring', 6, 75);
      const scoredKeywords = await this.priorityService.calculatePriorityScores(uniqueKeywords, clusters);
      
      // STAGE 7: Save processed results to database
      await this.processingRunModel.updateProgress(run.id, 'saving_processed_data', 7, 87);
      const processedData = {
        cleanedKeywords,
        clusters,
        scoredKeywords,
        similarGroups
      };
      const savedResults = await this.saveProcessedResults(run.id, project.id, processedData);
      
      // STAGE 8: Complete processing
      await this.processingRunModel.updateProgress(run.id, 'completed', 8, 100);
      
      // Compile final statistics
      const stats = {
        keywords_fetched: rawKeywords.length,
        keywords_cleaned: cleanedKeywords.length,
        keywords_unique: uniqueKeywords.length,
        keywords_scored: scoredKeywords.length,
        clusters_found: clusters.length,
        duplicate_groups: similarGroups.length,
        api_calls: 1,
        data_size: csvData.length
      };
      
      await this.processingRunModel.completeRun(run.id, stats);
      await this.projectModel.updateLastProcessed(project.id);

      // Save CSV file for migration compatibility
      const filename = FileOperations.generateFilename(params.target, 'semrush');
      const filePath = FileOperations.saveData(csvData, filename);

      return {
        project,
        run,
        keywordCount: rawKeywords.length,
        processedKeywordCount: scoredKeywords.length,
        clusterCount: clusters.length,
        duplicateGroupCount: similarGroups.length,
        method: params.method,
        target: params.target,
        database: params.database,
        filename,
        filePath,
        csvData,
        clusters,
        scoredKeywords: scoredKeywords.slice(0, 50), // Return top 50 for display
        stats
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