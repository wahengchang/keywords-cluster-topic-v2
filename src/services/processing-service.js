const DataCleaningService = require('./data-cleaning-service');
const DeduplicationService = require('./deduplication-service');
const { ClusteringService } = require('./clustering-service');
const { PriorityScoringService } = require('./priority-scoring-service');
const { BatchProcessor } = require('../clustering/batch-processor');
const { CheckpointManager } = require('../persistence/checkpoint-manager');

class ProcessingService {
  constructor(config = {}) {
    this.cleaner = new DataCleaningService();
    this.deduper = new DeduplicationService();
    this.clusterer = new ClusteringService(config.clustering || {});
    this.scorer = new PriorityScoringService(config.scoring || {});
    
    // Batch processing components
    this.batchProcessor = null;
    this.checkpointManager = null;
    this.config = config;
  }

  async run(rawKeywords, options = {}) {
    // Check if batch processing is requested
    if (options.batch && options.batch.enabled) {
      return await this.runBatch(rawKeywords, options);
    }

    // Original processing pipeline (maintained for backward compatibility)
    const cleaned = await this.cleaner.cleanKeywords(rawKeywords, options.cleaning);
    const { unique } = await this.deduper.deduplicateKeywords(cleaned, options.deduplication);
    const clusters = await this.clusterer.performAdvancedClustering(unique, options.clustering);
    clusters.forEach((cluster, cid) => {
      cluster.keywords.forEach(k => {
        k.cluster_id = cid;
        k.cluster_name = cluster.name;
      });
    });
    const scored = await this.scorer.calculatePriorityScores(unique, clusters, options.scoring);
    return { keywords: scored, clusters };
  }

  /**
   * Run batch processing pipeline
   */
  async runBatch(rawKeywords, options = {}) {
    try {
      // Initialize batch processor with configuration
      this.batchProcessor = new BatchProcessor({
        batchSize: options.batch.batchSize || 100,
        fastSamplePercentage: options.batch.fastSamplePercentage || 0.1,
        maxMemoryUsageMB: options.batch.maxMemoryUsageMB || 512,
        checkpointInterval: options.batch.checkpointInterval || 50,
        enableProgressLogging: options.batch.enableProgressLogging !== false,
        clustering: options.clustering,
        scoring: options.scoring
      });

      // Initialize checkpoint manager if database provided
      if (options.batch.database) {
        this.checkpointManager = new CheckpointManager(options.batch.database);
      }

      // Check for existing batch run to resume
      if (options.batch.resumeBatchRunId && this.checkpointManager) {
        return await this.resumeBatch(options.batch.resumeBatchRunId, rawKeywords, options);
      }

      // Initialize new batch processing session
      const initResult = await this.batchProcessor.initialize(rawKeywords, {
        batchMode: options.batch.mode || 'fast',
        ...options
      });

      console.log('Batch Processing Configuration:');
      console.log(`  Mode: ${initResult.batchMode}`);
      console.log(`  Keywords: ${initResult.totalKeywords}`);
      console.log(`  Batches: ${initResult.totalBatches}`);
      console.log(`  Estimated time: ${initResult.estimatedTimeMinutes} minutes`);

      // Start batch processing
      const result = await this.batchProcessor.start(options);

      // Add batch processing metadata to result
      result.batchProcessing = {
        mode: initResult.batchMode,
        totalBatches: initResult.totalBatches,
        batchSize: initResult.batchSize,
        processingTime: result.stats.totalTime,
        keywordsSampled: result.stats.totalKeywords
      };

      return result;

    } catch (error) {
      throw new Error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Resume batch processing from checkpoint
   */
  async resumeBatch(batchRunId, rawKeywords, options) {
    try {
      if (!this.checkpointManager) {
        throw new Error('Checkpoint manager not initialized');
      }

      // Load latest checkpoint
      const checkpoint = await this.checkpointManager.loadLatestCheckpoint(batchRunId);
      if (!checkpoint) {
        throw new Error('No recoverable checkpoint found for batch run');
      }

      console.log(`Resuming batch processing from ${checkpoint.stage_name} stage`);
      console.log(`Progress: ${checkpoint.keywords_processed} keywords processed`);

      // Prepare recovery state
      const recoveryState = await this.checkpointManager.recoverProcessingState(checkpoint, rawKeywords);

      // Initialize batch processor with recovery state
      this.batchProcessor = new BatchProcessor({
        ...this.config,
        recoveryState
      });

      // Resume processing
      const result = await this.batchProcessor.resume();

      // Add batch processing metadata
      result.batchProcessing = {
        resumed: true,
        resumedFrom: checkpoint.stage_name,
        resumedAt: new Date().toISOString(),
        checkpointId: checkpoint.id
      };

      return result;

    } catch (error) {
      throw new Error(`Batch resume failed: ${error.message}`);
    }
  }

  /**
   * Pause current batch processing
   */
  async pauseBatch() {
    if (!this.batchProcessor) {
      throw new Error('No batch processing session active');
    }

    return await this.batchProcessor.pause();
  }

  /**
   * Get batch processing progress
   */
  getBatchProgress() {
    if (!this.batchProcessor) {
      return null;
    }

    return this.batchProcessor.getProgress();
  }

  /**
   * Get batch processing performance analysis
   */
  async getBatchPerformanceAnalysis(batchRunId) {
    if (!this.checkpointManager) {
      throw new Error('Checkpoint manager not initialized');
    }

    return await this.checkpointManager.getPerformanceAnalysis(batchRunId);
  }
}

module.exports = ProcessingService;
