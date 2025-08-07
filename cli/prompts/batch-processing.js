const { CommonPrompts } = require('./common');

// Batch processing configuration prompts
class BatchProcessingPrompts {
  static async selectProcessingMode() {
    return await CommonPrompts.singlePrompt({
      type: 'select',
      name: 'processingMode',
      message: 'Select processing mode:',
      choices: [
        { 
          title: 'Standard Processing (Original)', 
          value: 'standard',
          description: 'Full processing pipeline - may take 1+ hours for large datasets'
        },
        { 
          title: 'Fast Batch Processing (Recommended)', 
          value: 'fast',
          description: 'Quick results in ~5 minutes using smart sampling'
        },
        { 
          title: 'Full Batch Processing', 
          value: 'full',
          description: 'Process all keywords with batch optimization'
        }
      ],
      initial: 1, // Default to fast batch processing
      hint: 'Fast mode processes 10% of keywords for quick insights'
    });
  }

  static async getBatchConfiguration(mode) {
    if (mode === 'standard') {
      return { 
        enabled: false,
        mode: 'standard'
      };
    }

    const configs = [];

    // For fast mode, allow customization of sample percentage
    if (mode === 'fast') {
      configs.push({
        type: 'number',
        name: 'samplePercentage',
        message: 'Sample percentage for fast processing:',
        initial: 10,
        min: 5,
        max: 50,
        format: (val) => `${val}%`,
        hint: 'Higher percentage = more comprehensive but slower'
      });
    }

    // Batch size configuration for all batch modes
    configs.push({
      type: 'number',
      name: 'batchSize',
      message: 'Batch size for processing:',
      initial: mode === 'fast' ? 50 : 100,
      min: 25,
      max: 500,
      hint: 'Smaller batches use less memory but may be slower'
    });

    // Advanced options prompt
    const showAdvanced = await CommonPrompts.singlePrompt({
      type: 'confirm',
      name: 'showAdvanced',
      message: 'Configure advanced batch settings?',
      initial: false
    });

    if (showAdvanced) {
      configs.push({
        type: 'number',
        name: 'memoryLimit',
        message: 'Memory limit (MB):',
        initial: 512,
        min: 256,
        max: 2048,
        hint: 'Higher limits allow larger batches'
      });

      configs.push({
        type: 'number',
        name: 'checkpointInterval',
        message: 'Checkpoint every N keywords:',
        initial: 100,
        min: 50,
        max: 500,
        hint: 'More frequent checkpoints enable better recovery'
      });
    }

    const batchConfig = await CommonPrompts.multiplePrompts(configs);
    
    return {
      enabled: true,
      mode: mode,
      fastSamplePercentage: (batchConfig.samplePercentage || 10) / 100,
      batchSize: batchConfig.batchSize || (mode === 'fast' ? 50 : 100),
      maxMemoryUsageMB: batchConfig.memoryLimit || 512,
      checkpointInterval: batchConfig.checkpointInterval || 100,
      enableProgressLogging: true
    };
  }

  static async getProcessingConfiguration() {
    const mode = await this.selectProcessingMode();
    if (!mode) return null;

    const batchConfig = await this.getBatchConfiguration(mode);
    if (!batchConfig) return null;

    return batchConfig;
  }

  static async confirmFastProcessing(keywordCount) {
    if (keywordCount <= 500) {
      return true; // No need to confirm for small datasets
    }

    const sampleSize = Math.ceil(keywordCount * 0.1);
    
    return await CommonPrompts.singlePrompt({
      type: 'confirm',
      name: 'confirm',
      message: `Fast mode will process ~${sampleSize} of ${keywordCount} keywords. Continue?`,
      initial: true,
      hint: 'You can always run full processing later if needed'
    });
  }

  static async askResumeProcessing(availableBatchRuns) {
    if (!availableBatchRuns || availableBatchRuns.length === 0) {
      return null;
    }

    const choices = availableBatchRuns.map(run => ({
      title: `Resume: ${run.project_name} (${run.status} - ${run.progress}%)`,
      value: run.id,
      description: `Started: ${run.started_at}, Stage: ${run.current_stage}`
    }));

    choices.push({
      title: 'Start new processing',
      value: 'new',
      description: 'Begin fresh processing session'
    });

    return await CommonPrompts.singlePrompt({
      type: 'select',
      name: 'resumeChoice',
      message: 'Found paused batch runs. What would you like to do?',
      choices: choices,
      initial: 0
    });
  }
}

module.exports = { BatchProcessingPrompts };