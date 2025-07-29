const { ProjectTypePrompts } = require('../prompts/project-type');
const { DatabasePrompts } = require('../prompts/database-selection');
const { KeywordService } = require('../../src/services/keyword-service');
const { Settings } = require('../config/settings');
const { Output } = require('../utils/output');
const DatabaseMigration = require('../../src/database/migration');

// Main fetch command
class FetchCommand {
  constructor() {
    this.settings = new Settings();
    this.keywordService = new KeywordService(this.settings);
    this.migration = new DatabaseMigration();
  }

  async validateEnvironment() {
    const errors = this.settings.validateRequired();
    if (errors.length > 0) {
      Output.showError(errors[0]);
      Output.showInfo('Set it in your environment variables or use: export SEMRUSH_API_KEY=your_key');
      process.exit(1);
    }
  }

  async execute() {
    try {
      // Validate environment first
      await this.validateEnvironment();

      // Get project details
      const projectDetails = await ProjectTypePrompts.getProjectDetails();
      if (!projectDetails) {
        Output.showCancellation();
        return;
      }

      // Get database configuration
      const dbConfig = await DatabasePrompts.getDatabaseConfig();
      if (!dbConfig) {
        Output.showCancellation();
        return;
      }

      // Combine parameters
      const params = {
        method: projectDetails.method,
        target: projectDetails.target,
        database: dbConfig.database,
        limit: dbConfig.limit
      };

      // Fetch and process keywords
      Output.showProgress('Fetching SEMrush data');
      const result = await this.keywordService.processKeywordRequest(params);

      // Automatically save to database
      Output.showProgress('Saving to database');
      const dbResult = await this.migration.migrateSingleCSV(result.filePath);
      
      // Show results
      Output.showSuccess(`SEMrush data saved: ${result.filePath}`);
      Output.showSuccess(`Database project created: ${dbResult.project.name}`);
      Output.showSummary({
        'Method': result.method,
        'Target': result.target,
        'Database': result.database,
        'Keywords fetched': result.keywordCount,
        'Output file': result.filename,
        'Database project': dbResult.project.name,
        'Database keywords': dbResult.keywordCount
      });

    } catch (error) {
      Output.showError(error.message);
      process.exit(1);
    }
  }
}

module.exports = { FetchCommand };