// Configuration management
class Settings {
  constructor() {
    // No dotenv loading - use environment variables directly
  }

  get semrushApiKey() {
    return process.env.SEMRUSH_API_KEY;
  }

  get openaiApiKey() {
    return process.env.OPENAI_API_KEY;
  }

  get perplexityApiKey() {
    return process.env.PERPLEXITY_API_KEY;
  }

  validateRequired() {
    const errors = [];
    
    if (!this.semrushApiKey) {
      errors.push('SEMRUSH_API_KEY environment variable is required');
    }

    return errors;
  }

  getDefaults() {
    return {
      limit: 10000,
      database: 'us',
      outputDir: 'output'
    };
  }
}

module.exports = { Settings };