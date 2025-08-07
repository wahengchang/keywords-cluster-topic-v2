const { ClusteringService } = require('../services/clustering-service');
const DataCleaningService = require('../services/data-cleaning-service');
const DeduplicationService = require('../services/deduplication-service');
const { PriorityScoringService } = require('../services/priority-scoring-service');

class BatchProcessor {
  constructor(config = {}) {
    this.config = {
      batchSize: 100,
      fastSamplePercentage: 0.1,
      maxMemoryUsageMB: 512,
      checkpointInterval: 50, // Save checkpoint every N keywords
      enableProgressLogging: true,
      ...config
    };

    // Initialize services
    this.cleaner = new DataCleaningService();
    this.deduper = new DeduplicationService();
    this.clusterer = new ClusteringService(config.clustering || {});
    this.scorer = new PriorityScoringService(config.scoring || {});

    // Processing state
    this.batchRun = null;
    this.processingState = {
      currentStage: 'initializing',
      currentBatch: 0,
      totalBatches: 0,
      processedKeywords: 0,
      totalKeywords: 0,
      startTime: null,
      pauseTime: null,
      lastCheckpoint: null
    };

    // Intermediate results storage
    this.intermediateResults = {
      cleaned: [],
      unique: [],
      clusters: [],
      scored: []
    };

    this.isPaused = false;
    this.isRunning = false;
  }

  /**
   * Initialize batch processing session
   */
  async initialize(rawKeywords, options = {}) {
    try {
      if (!rawKeywords || rawKeywords.length === 0) {
        throw new Error('No keywords provided for batch processing');
      }

      // Setup batch configuration
      const batchMode = options.batchMode || 'fast';
      let processKeywords = rawKeywords;

      // For fast mode, take a sample first
      if (batchMode === 'fast') {
        const sampleSize = Math.max(
          Math.ceil(rawKeywords.length * this.config.fastSamplePercentage),
          50 // Minimum sample size
        );
        processKeywords = this.selectFastSample(rawKeywords, sampleSize);
      }

      // Calculate batch configuration
      const totalKeywords = processKeywords.length;
      const batchSize = Math.min(this.config.batchSize, Math.ceil(totalKeywords / 10));
      const totalBatches = Math.ceil(totalKeywords / batchSize);

      // Update processing state
      this.processingState = {
        currentStage: 'initialized',
        currentBatch: 0,
        totalBatches,
        processedKeywords: 0,
        totalKeywords,
        batchSize,
        startTime: null,
        pauseTime: null,
        lastCheckpoint: null
      };

      // Store keywords for processing
      this.rawKeywords = processKeywords;
      this.batchMode = batchMode;

      return {
        totalKeywords,
        totalBatches,
        batchSize,
        batchMode,
        estimatedTimeMinutes: this.estimateProcessingTime(totalKeywords)
      };

    } catch (error) {
      throw new Error(`Batch initialization failed: ${error.message}`);
    }
  }

  /**
   * Start batch processing
   */
  async start(options = {}) {
    try {
      if (!this.rawKeywords) {
        throw new Error('Batch processing not initialized. Call initialize() first.');
      }

      this.isRunning = true;
      this.isPaused = false;
      this.processingState.startTime = Date.now();
      this.processingState.currentStage = 'running';

      this.log('info', `Starting batch processing of ${this.processingState.totalKeywords} keywords`);
      this.log('info', `Mode: ${this.batchMode}, Batches: ${this.processingState.totalBatches}, Batch size: ${this.processingState.batchSize}`);

      // Stage 1: Data Cleaning (batch processing)
      await this.runStage('cleaning', async () => {
        this.intermediateResults.cleaned = await this.processCleaningInBatches();
      });

      // Stage 2: Deduplication 
      await this.runStage('deduplication', async () => {
        const { unique } = await this.deduper.deduplicateKeywords(this.intermediateResults.cleaned, options.deduplication);
        this.intermediateResults.unique = unique;
      });

      // Stage 3: Clustering (can be memory intensive, so batch if needed)
      await this.runStage('clustering', async () => {
        this.intermediateResults.clusters = await this.processClusteringOptimized();
      });

      // Stage 4: Priority Scoring
      await this.runStage('scoring', async () => {
        this.intermediateResults.scored = await this.scorer.calculatePriorityScores(
          this.intermediateResults.unique, 
          this.intermediateResults.clusters, 
          options.scoring
        );
      });

      // Stage 5: Finalization
      await this.runStage('finalizing', async () => {
        this.assignClusterIds();
      });

      // Mark as completed
      this.isRunning = false;
      this.processingState.currentStage = 'completed';
      
      const totalTime = Date.now() - this.processingState.startTime;
      this.log('info', `Batch processing completed in ${Math.round(totalTime / 1000)} seconds`);

      return {
        keywords: this.intermediateResults.scored,
        clusters: this.intermediateResults.clusters,
        stats: {
          totalKeywords: this.processingState.totalKeywords,
          processedKeywords: this.processingState.processedKeywords,
          totalTime,
          batchMode: this.batchMode
        }
      };

    } catch (error) {
      this.isRunning = false;
      this.processingState.currentStage = 'failed';
      throw new Error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Pause batch processing
   */
  async pause() {
    if (!this.isRunning) {
      throw new Error('No batch processing session is currently running');
    }

    this.isPaused = true;
    this.processingState.pauseTime = Date.now();
    this.processingState.currentStage = 'paused';
    
    this.log('info', 'Batch processing paused');

    return {
      pausedAt: this.processingState.pauseTime,
      progress: this.getProgress(),
      canResume: true
    };
  }

  /**
   * Resume batch processing
   */
  async resume() {
    if (!this.isPaused) {
      throw new Error('No paused batch processing session found');
    }

    const pauseDuration = Date.now() - this.processingState.pauseTime;
    this.isPaused = false;
    this.processingState.pauseTime = null;
    this.processingState.currentStage = 'running';

    this.log('info', `Batch processing resumed after ${Math.round(pauseDuration / 1000)} seconds`);

    // Continue from where we left off
    return await this.start();
  }

  /**
   * Get current progress
   */
  getProgress() {
    const progress = {
      stage: this.processingState.currentStage,
      totalKeywords: this.processingState.totalKeywords,
      processedKeywords: this.processingState.processedKeywords,
      currentBatch: this.processingState.currentBatch,
      totalBatches: this.processingState.totalBatches,
      progressPercent: Math.round((this.processingState.processedKeywords / this.processingState.totalKeywords) * 100),
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      batchMode: this.batchMode
    };

    if (this.processingState.startTime) {
      progress.elapsedTime = Date.now() - this.processingState.startTime;
      progress.estimatedTimeRemaining = this.estimateTimeRemaining();
    }

    return progress;
  }

  /**
   * Select fast sample for quick results
   */
  selectFastSample(keywords, sampleSize) {
    // Sort by search volume (descending) and take top keywords plus random sampling
    const sorted = [...keywords].sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0));
    
    // Take top 50% of sample from high-volume keywords
    const topKeywordsCount = Math.ceil(sampleSize * 0.5);
    const topKeywords = sorted.slice(0, topKeywordsCount);
    
    // Take remaining from random sampling of the rest
    const remainingKeywords = sorted.slice(topKeywordsCount);
    const randomSample = this.randomSample(remainingKeywords, sampleSize - topKeywordsCount);
    
    return [...topKeywords, ...randomSample];
  }

  /**
   * Process data cleaning in batches
   */
  async processCleaningInBatches() {
    const cleaned = [];
    const batchSize = this.processingState.batchSize;
    
    for (let i = 0; i < this.rawKeywords.length; i += batchSize) {
      if (this.isPaused) {
        this.log('info', 'Cleaning paused');
        return cleaned;
      }

      const batch = this.rawKeywords.slice(i, i + batchSize);
      const batchCleaned = await this.cleaner.cleanKeywords(batch);
      cleaned.push(...batchCleaned);
      
      this.processingState.processedKeywords = Math.min(i + batchSize, this.rawKeywords.length);
      this.processingState.currentBatch = Math.floor(i / batchSize) + 1;
      
      // Periodic checkpoint and progress logging
      if ((i + batchSize) % (this.config.checkpointInterval * 2) === 0) {
        this.log('info', `Cleaned ${this.processingState.processedKeywords}/${this.processingState.totalKeywords} keywords`);
        await this.createCheckpoint('cleaning');
      }
    }
    
    return cleaned;
  }

  /**
   * Process clustering with memory optimization
   */
  async processClusteringOptimized() {
    const keywords = this.intermediateResults.unique;
    
    if (keywords.length <= 1000) {
      // Small dataset - process normally
      return await this.clusterer.performAdvancedClustering(keywords);
    } else {
      // Large dataset - use optimized clustering approach
      this.log('info', `Large dataset detected (${keywords.length} keywords). Using optimized clustering.`);
      
      // For batch mode, reduce cluster granularity to improve performance
      const clusteringOptions = {
        clusterCount: Math.min(50, Math.ceil(keywords.length / 60)) // Limit clusters for faster processing
      };
      
      return await this.clusterer.performAdvancedClustering(keywords, clusteringOptions);
    }
  }

  /**
   * Assign cluster IDs to keywords
   */
  assignClusterIds() {
    this.intermediateResults.clusters.forEach((cluster, cid) => {
      cluster.keywords.forEach(k => {
        k.cluster_id = cid;
        k.cluster_name = cluster.name;
      });
    });
  }

  /**
   * Run a processing stage with error handling and checkpointing
   */
  async runStage(stageName, stageFunction) {
    if (this.isPaused) return;

    this.processingState.currentStage = stageName;
    this.log('info', `Starting stage: ${stageName}`);
    
    try {
      await stageFunction();
      await this.createCheckpoint(stageName);
      this.log('info', `Completed stage: ${stageName}`);
    } catch (error) {
      this.log('error', `Stage ${stageName} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a checkpoint for recovery
   */
  async createCheckpoint(stageName) {
    this.processingState.lastCheckpoint = {
      stage: stageName,
      timestamp: Date.now(),
      processedKeywords: this.processingState.processedKeywords,
      currentBatch: this.processingState.currentBatch,
      memoryUsage: process.memoryUsage().rss / 1024 / 1024 // MB
    };
  }

  /**
   * Random sample utility
   */
  randomSample(array, sampleSize) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, sampleSize);
  }

  /**
   * Estimate processing time based on keyword count
   */
  estimateProcessingTime(keywordCount) {
    // Base estimates in seconds per keyword (rough approximations)
    const timePerKeyword = this.batchMode === 'fast' ? 0.02 : 0.05;
    return Math.ceil((keywordCount * timePerKeyword) / 60); // Return in minutes
  }

  /**
   * Estimate remaining time
   */
  estimateTimeRemaining() {
    if (!this.processingState.startTime || this.processingState.processedKeywords === 0) {
      return null;
    }

    const elapsed = Date.now() - this.processingState.startTime;
    const rate = this.processingState.processedKeywords / elapsed;
    const remaining = this.processingState.totalKeywords - this.processingState.processedKeywords;
    
    return Math.ceil(remaining / rate);
  }

  /**
   * Logging utility
   */
  log(level, message) {
    if (this.config.enableProgressLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] BatchProcessor: ${message}`);
    }
  }
}

module.exports = { BatchProcessor };