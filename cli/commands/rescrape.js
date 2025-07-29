const prompts = require('prompts');
const { DatabasePrompts } = require('../prompts/database-selection');
const { KeywordService } = require('../../src/services/keyword-service');
const { Settings } = require('../config/settings');
const { Output } = require('../utils/output');
const { getDatabase, closeDatabase } = require('../../src/database/connection');
const ProjectModel = require('../../src/database/models/project');
const DatabaseMigration = require('../../src/database/migration');

// Rescrape existing project command with full automation
class RescrapeCommand {
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

  async selectExistingProject() {
    try {
      const db = await getDatabase();
      const projectModel = new ProjectModel(db);
      const projects = projectModel.findActive();
      
      if (projects.length === 0) {
        Output.showInfo('No existing projects found. Create a new project first.');
        return null;
      }

      const choices = projects.map(p => ({
        title: `${p.name} (${p.project_type}: ${p.domain || p.url})`,
        value: p
      }));

      const response = await prompts({
        type: 'select',
        name: 'project',
        message: 'Select project to rescrape:',
        choices
      });

      return response.project;
    } catch (error) {
      Output.showError(`Failed to load projects: ${error.message}`);
      return null;
    } finally {
      closeDatabase();
    }
  }

  async execute() {
    try {
      // Validate environment first
      await this.validateEnvironment();

      Output.showInfo('Rescraping existing project with full automation:');
      Output.showInfo('1. Select existing project');
      Output.showInfo('2. Download fresh SEMrush data');
      Output.showInfo('3. Update/insert data with timestamps');
      Output.showInfo('4. Run processing pipeline');
      Output.showInfo('5. Generate FAQ titles (limited clusters)');
      console.log();

      // Select existing project
      const project = await this.selectExistingProject();
      if (!project) {
        Output.showCancellation();
        return;
      }

      Output.showInfo(`Selected project: ${project.name}`);
      Output.showInfo(`Target: ${project.domain || project.url}`);
      console.log();

      // Get database configuration for this rescrape
      const dbConfig = await DatabasePrompts.getDatabaseConfig();
      if (!dbConfig) {
        Output.showCancellation();
        return;
      }

      // Determine method and target from project
      const method = project.project_type === 'domain' ? 'Domain' : 'URL';
      const target = project.domain || project.url;

      // Combine parameters
      const params = {
        method: method,
        target: target,
        database: dbConfig.database,
        limit: dbConfig.limit
      };

      Output.showProcessingHeader(`${project.name} - Rescrape`);

      // Fetch fresh data
      Output.showProgress('Downloading fresh SEMrush data');
      const result = await this.keywordService.processKeywordRequest(params);

      // TODO: Check if data exists for today and update/insert accordingly
      Output.showProgress('Checking existing data and updating/inserting (TODO: Smart update logic needed)');
      const dbResult = await this.migration.migrateSingleCSV(result.filePath);
      
      // TODO: Run processing pipeline automatically
      Output.showProgress('Running processing pipeline (TODO: Implementation needed)');
      
      // TODO: Generate FAQ titles for limited clusters (skip existing)
      Output.showProgress('Generating FAQ titles for new clusters (TODO: Implementation needed)');
      
      // Show results
      Output.showSuccess(`Project rescraping completed!`);
      Output.showSuccess(`Fresh data saved: ${result.filePath}`);
      Output.showSummary({
        'Project': project.name,
        'Method': result.method,
        'Target': result.target,
        'Database': result.database,
        'Keywords fetched': result.keywordCount,
        'Data operation': 'TODO: Update vs Insert logic needed',
        'Pipeline status': 'TODO: Not implemented yet',
        'FAQ generation': 'TODO: Skip existing clusters logic needed'
      });

    } catch (error) {
      Output.showError(error.message);
      process.exit(1);
    }
  }
}

module.exports = { RescrapeCommand };