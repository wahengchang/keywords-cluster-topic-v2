const { ProjectTypePrompts } = require('../prompts/project-type');
const { DatabasePrompts } = require('../prompts/database-selection');
const { KeywordService } = require('../../src/services/keyword-service');
const { Settings } = require('../config/settings');
const { Output } = require('../utils/output');
const { getDatabase, closeDatabase } = require('../../src/database/connection');
const ProjectModel = require('../../src/database/models/project');
const DatabaseMigration = require('../../src/database/migration');

// Create new project command with full automation
class CreateCommand {
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

  async checkDomainExists(method, target) {
    try {
      const db = await getDatabase();
      const projectModel = new ProjectModel(db);
      
      let existingProject;
      if (method === 'Domain') {
        existingProject = projectModel.findByDomain(target);
      } else {
        existingProject = projectModel.findByUrl(target);
      }
      
      if (existingProject) {
        Output.showError(`${method} already exists: ${existingProject.name}`);
        Output.showInfo('Use "Rescrape Existing Project" to update this project with fresh data');
        return true;
      }
      
      return false;
    } catch (error) {
      Output.showError(`Failed to check existing projects: ${error.message}`);
      return true;
    } finally {
      closeDatabase();
    }
  }

  async execute() {
    try {
      // Validate environment first
      await this.validateEnvironment();

      Output.showInfo('Creating new project with full automation:');
      Output.showInfo('1. Check domain/URL existence');
      Output.showInfo('2. Download SEMrush data');
      Output.showInfo('3. Run processing pipeline');
      Output.showInfo('4. Generate FAQ titles (limited clusters)');
      console.log();

      // Get project details
      const projectDetails = await ProjectTypePrompts.getProjectDetails();
      if (!projectDetails) {
        Output.showCancellation();
        return;
      }

      // Check if domain/URL already exists
      const exists = await this.checkDomainExists(projectDetails.method, projectDetails.target);
      if (exists) {
        return;
      }

      // Get database configuration
      const dbConfig = await DatabasePrompts.getDatabaseConfig();
      if (!dbConfig) {
        Output.showCancellation();
        return;
      }

      // Generate project name from target
      const projectName = projectDetails.method === 'Domain' 
        ? projectDetails.target.replace(/[^a-zA-Z0-9]/g, '_')
        : new URL(projectDetails.target).hostname.replace(/[^a-zA-Z0-9]/g, '_');

      // Combine parameters
      const params = {
        name: projectName,
        method: projectDetails.method,
        target: projectDetails.target,
        database: dbConfig.database,
        limit: dbConfig.limit
      };

      Output.showProcessingHeader(projectDetails.target);

      // Fetch and process keywords
      Output.showProgress('Downloading SEMrush data');
      const result = await this.keywordService.processKeywordRequest(params);

      // Automatically save to database
      Output.showProgress('Inserting data to database');
      const dbResult = await this.migration.migrateSingleCSV(result.filePath);
      
      // TODO: Run processing pipeline automatically
      Output.showProgress('Running processing pipeline (TODO: Implementation needed)');
      
      // TODO: Generate FAQ titles for limited clusters
      Output.showProgress('Generating FAQ titles (TODO: Implementation needed)');
      
      // Show results
      Output.showSuccess(`Project created successfully!`);
      Output.showSuccess(`SEMrush data saved: ${result.filePath}`);
      Output.showSuccess(`Database project created: ${dbResult.project.name}`);
      Output.showSummary({
        'Method': result.method,
        'Target': result.target,
        'Database': result.database,
        'Keywords fetched': result.keywordCount,
        'Database project': dbResult.project.name,
        'Database keywords': dbResult.keywordCount,
        'Pipeline status': 'TODO: Not implemented yet',
        'FAQ generation': 'TODO: Not implemented yet'
      });

    } catch (error) {
      Output.showError(error.message);
      process.exit(1);
    }
  }
}

module.exports = { CreateCommand };