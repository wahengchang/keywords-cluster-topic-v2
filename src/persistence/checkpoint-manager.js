const crypto = require('crypto');

class CheckpointManager {
  constructor(database) {
    this.db = database;
    this.compressionEnabled = true;
  }

  /**
   * Save a checkpoint to the database
   */
  async saveCheckpoint(batchRunId, checkpointData) {
    try {
      const {
        checkpointType = 'stage',
        stageName,
        batchNumber = 1,
        keywordsProcessed = 0,
        clusterState = null,
        processingState = null,
        intermediateResults = null,
        performanceData = null
      } = checkpointData;

      // Serialize complex objects
      const serializedClusterState = clusterState ? this.serializeState(clusterState) : null;
      const serializedProcessingState = processingState ? this.serializeState(processingState) : null;
      const serializedResults = intermediateResults ? this.serializeState(intermediateResults) : null;
      const serializedPerformance = performanceData ? JSON.stringify(performanceData) : null;

      // Generate validation hash for integrity checking
      const validationHash = this.generateValidationHash({
        stageName,
        batchNumber,
        keywordsProcessed,
        serializedProcessingState
      });

      // Memory usage tracking
      const memoryUsage = Math.round(process.memoryUsage().rss / 1024 / 1024); // MB

      // Recovery instructions based on checkpoint type and stage
      const recoveryInstructions = this.generateRecoveryInstructions(checkpointType, stageName, checkpointData);

      const insertQuery = `
        INSERT INTO batch_checkpoints (
          batch_run_id,
          checkpoint_type,
          stage_name,
          batch_number,
          keywords_processed,
          cluster_state,
          processing_state,
          intermediate_results,
          performance_data,
          memory_usage,
          validation_hash,
          is_recoverable,
          recovery_instructions,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      const result = this.db.prepare(insertQuery).run(
        batchRunId,
        checkpointType,
        stageName,
        batchNumber,
        keywordsProcessed,
        serializedClusterState,
        serializedProcessingState,
        serializedResults,
        serializedPerformance,
        memoryUsage,
        validationHash,
        this.isRecoverable(stageName, checkpointData) ? 1 : 0,
        recoveryInstructions
      );

      // Clean up old checkpoints to prevent database bloat
      await this.cleanupOldCheckpoints(batchRunId);

      return {
        checkpointId: result.lastInsertRowid,
        validationHash,
        memoryUsage,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Failed to save checkpoint: ${error.message}`);
    }
  }

  /**
   * Load the latest checkpoint for a batch run
   */
  async loadLatestCheckpoint(batchRunId) {
    try {
      const query = `
        SELECT * FROM batch_checkpoints 
        WHERE batch_run_id = ? AND is_recoverable = 1
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const checkpoint = this.db.prepare(query).get(batchRunId);
      
      if (!checkpoint) {
        return null;
      }

      // Validate checkpoint integrity
      const isValid = await this.validateCheckpoint(checkpoint);
      if (!isValid) {
        throw new Error('Checkpoint validation failed - data may be corrupted');
      }

      // Deserialize state objects
      const deserializedCheckpoint = {
        ...checkpoint,
        cluster_state: checkpoint.cluster_state ? this.deserializeState(checkpoint.cluster_state) : null,
        processing_state: checkpoint.processing_state ? this.deserializeState(checkpoint.processing_state) : null,
        intermediate_results: checkpoint.intermediate_results ? this.deserializeState(checkpoint.intermediate_results) : null,
        performance_data: checkpoint.performance_data ? JSON.parse(checkpoint.performance_data) : null
      };

      return deserializedCheckpoint;

    } catch (error) {
      throw new Error(`Failed to load checkpoint: ${error.message}`);
    }
  }

  /**
   * Load all checkpoints for a batch run (for debugging/analysis)
   */
  async loadAllCheckpoints(batchRunId) {
    try {
      const query = `
        SELECT id, checkpoint_type, stage_name, batch_number, keywords_processed, 
               memory_usage, created_at, is_recoverable
        FROM batch_checkpoints 
        WHERE batch_run_id = ?
        ORDER BY created_at ASC
      `;

      return this.db.prepare(query).all(batchRunId);

    } catch (error) {
      throw new Error(`Failed to load checkpoints: ${error.message}`);
    }
  }

  /**
   * Serialize state objects with optional compression
   */
  serializeState(state) {
    try {
      const jsonString = JSON.stringify(state);
      
      if (this.compressionEnabled && jsonString.length > 1000) {
        // For large objects, use simple base64 encoding (Node.js built-in)
        // In a production environment, you might want to use gzip compression
        return Buffer.from(jsonString, 'utf8').toString('base64');
      }
      
      return jsonString;

    } catch (error) {
      throw new Error(`State serialization failed: ${error.message}`);
    }
  }

  /**
   * Deserialize state objects
   */
  deserializeState(serializedState) {
    try {
      // Check if it's base64 encoded (compressed)
      let jsonString = serializedState;
      
      try {
        // Try to decode as base64 first
        const decoded = Buffer.from(serializedState, 'base64').toString('utf8');
        // If it's valid JSON after decoding, it was compressed
        JSON.parse(decoded);
        jsonString = decoded;
      } catch (e) {
        // Not base64 encoded or not valid JSON after decoding, use as-is
      }

      return JSON.parse(jsonString);

    } catch (error) {
      throw new Error(`State deserialization failed: ${error.message}`);
    }
  }

  /**
   * Generate validation hash for checkpoint integrity
   */
  generateValidationHash(data) {
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Validate checkpoint integrity
   */
  async validateCheckpoint(checkpoint) {
    try {
      const validationData = {
        stageName: checkpoint.stage_name,
        batchNumber: checkpoint.batch_number,
        keywordsProcessed: checkpoint.keywords_processed,
        serializedProcessingState: checkpoint.processing_state
      };

      const expectedHash = this.generateValidationHash(validationData);
      return expectedHash === checkpoint.validation_hash;

    } catch (error) {
      console.error('Checkpoint validation error:', error);
      return false;
    }
  }

  /**
   * Determine if a checkpoint is recoverable based on stage and state
   */
  isRecoverable(stageName, checkpointData) {
    // Define which stages can be safely recovered from
    const recoverableStages = [
      'cleaning', 'deduplication', 'clustering', 'scoring', 'completed'
    ];

    if (!recoverableStages.includes(stageName)) {
      return false;
    }

    // Additional checks based on data completeness
    if (stageName === 'cleaning' && !checkpointData.intermediateResults?.cleaned) {
      return false;
    }

    if (stageName === 'clustering' && !checkpointData.intermediateResults?.unique) {
      return false;
    }

    return true;
  }

  /**
   * Generate recovery instructions based on checkpoint type and stage
   */
  generateRecoveryInstructions(checkpointType, stageName, checkpointData) {
    const instructions = [];

    switch (stageName) {
      case 'cleaning':
        instructions.push('Resume from data cleaning stage');
        instructions.push(`Continue processing from batch ${checkpointData.batchNumber || 1}`);
        break;

      case 'deduplication':
        instructions.push('Resume from deduplication stage');
        instructions.push('Cleaned data available in intermediate results');
        break;

      case 'clustering':
        instructions.push('Resume from clustering stage');
        instructions.push('Deduplicated data ready for clustering');
        break;

      case 'scoring':
        instructions.push('Resume from priority scoring stage');
        instructions.push('Clusters available for scoring');
        break;

      case 'completed':
        instructions.push('Processing completed successfully');
        instructions.push('All results available');
        break;

      default:
        instructions.push(`Resume from ${stageName} stage`);
    }

    if (checkpointData.keywordsProcessed) {
      instructions.push(`Progress: ${checkpointData.keywordsProcessed} keywords processed`);
    }

    return JSON.stringify(instructions);
  }

  /**
   * Clean up old checkpoints to prevent database bloat
   */
  async cleanupOldCheckpoints(batchRunId, keepCount = 5) {
    try {
      // Keep only the latest N checkpoints per batch run
      const deleteQuery = `
        DELETE FROM batch_checkpoints 
        WHERE batch_run_id = ? AND id NOT IN (
          SELECT id FROM batch_checkpoints 
          WHERE batch_run_id = ?
          ORDER BY created_at DESC 
          LIMIT ?
        )
      `;

      this.db.prepare(deleteQuery).run(batchRunId, batchRunId, keepCount);

    } catch (error) {
      // Non-critical error - log but don't throw
      console.warn('Checkpoint cleanup warning:', error.message);
    }
  }

  /**
   * Recovery helper: Rebuild processing state from checkpoint
   */
  async recoverProcessingState(checkpoint, rawKeywords) {
    try {
      const recoveryState = {
        canRecover: checkpoint.is_recoverable === 1,
        stageName: checkpoint.stage_name,
        batchNumber: checkpoint.batch_number,
        keywordsProcessed: checkpoint.keywords_processed,
        intermediateResults: checkpoint.intermediate_results || {},
        nextSteps: JSON.parse(checkpoint.recovery_instructions || '[]')
      };

      // Validate that we have the necessary data to recover
      if (!recoveryState.canRecover) {
        throw new Error(`Cannot recover from checkpoint: ${checkpoint.stage_name} is not a recoverable stage`);
      }

      // Ensure we have the original raw keywords
      if (!rawKeywords || rawKeywords.length === 0) {
        throw new Error('Original raw keywords required for recovery');
      }

      recoveryState.rawKeywords = rawKeywords;
      return recoveryState;

    } catch (error) {
      throw new Error(`Recovery state preparation failed: ${error.message}`);
    }
  }

  /**
   * Performance analysis from checkpoints
   */
  async getPerformanceAnalysis(batchRunId) {
    try {
      const query = `
        SELECT stage_name, keywords_processed, memory_usage, created_at,
               performance_data
        FROM batch_checkpoints 
        WHERE batch_run_id = ?
        ORDER BY created_at ASC
      `;

      const checkpoints = this.db.prepare(query).all(batchRunId);
      
      if (checkpoints.length === 0) {
        return null;
      }

      const analysis = {
        totalCheckpoints: checkpoints.length,
        stages: {},
        memoryProfile: {
          min: Math.min(...checkpoints.map(c => c.memory_usage)),
          max: Math.max(...checkpoints.map(c => c.memory_usage)),
          avg: Math.round(checkpoints.reduce((sum, c) => sum + c.memory_usage, 0) / checkpoints.length)
        },
        timeline: []
      };

      // Analyze each stage
      checkpoints.forEach((checkpoint, index) => {
        const stage = checkpoint.stage_name;
        
        if (!analysis.stages[stage]) {
          analysis.stages[stage] = {
            checkpoints: 0,
            keywordsProcessed: 0,
            memoryUsage: []
          };
        }

        analysis.stages[stage].checkpoints++;
        analysis.stages[stage].keywordsProcessed = Math.max(
          analysis.stages[stage].keywordsProcessed,
          checkpoint.keywords_processed
        );
        analysis.stages[stage].memoryUsage.push(checkpoint.memory_usage);

        analysis.timeline.push({
          timestamp: checkpoint.created_at,
          stage,
          keywordsProcessed: checkpoint.keywords_processed,
          memoryUsage: checkpoint.memory_usage
        });
      });

      return analysis;

    } catch (error) {
      throw new Error(`Performance analysis failed: ${error.message}`);
    }
  }
}

module.exports = { CheckpointManager };