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

      // Process keywords through complete pipeline
      Output.showProgress('Processing keywords through complete pipeline...');
      console.log('  → Fetching SEMrush data');
      console.log('  → Cleaning and deduplicating keywords');
      console.log('  → Performing clustering analysis');
      console.log('  → Calculating priority scores');
      console.log('  → Saving processed results');
      
      const result = await this.keywordService.processKeywordRequest(params);
      
      // Show results
      Output.showSuccess(`Project created successfully!`);
      Output.showSuccess(`SEMrush data saved: ${result.filePath}`);
      Output.showSuccess(`Pipeline processing completed successfully!`);
      
      // Display processing results
      if (result.clusters && result.clusters.length > 0) {
        console.log('\n🎯 Clustering Results:');
        result.clusters.slice(0, 5).forEach((cluster, index) => {
          console.log(`  ${index + 1}. ${cluster.cluster_name || `Cluster ${cluster.id}`}`);
          console.log(`     Keywords: ${cluster.keyword_count}, Volume: ${cluster.total_search_volume || 0}`);
        });
      }
      
      if (result.scoredKeywords && result.scoredKeywords.length > 0) {
        console.log('\n⭐ Top Priority Keywords:');
        result.scoredKeywords.slice(0, 5).forEach((keyword, index) => {
          console.log(`  ${index + 1}. ${keyword.keyword || keyword.cleaned_keyword} (${keyword.priority_tier || 'unknown'})`);
          console.log(`     Score: ${(keyword.priority_score || 0).toFixed(3)}, Volume: ${keyword.search_volume || 0}`);
        });
      }
      
      Output.showSummary({
        'Method': result.method,
        'Target': result.target,
        'Database': result.database,
        'Keywords fetched': result.keywordCount,
        'Keywords processed': result.processedKeywordCount,
        'Clusters found': result.clusterCount,
        'Duplicate groups': result.duplicateGroupCount,
        'Pipeline status': '✅ Completed successfully',
        'Database project': result.project.name
      });

    } catch (error) {
      Output.showError(error.message);
      process.exit(1);
    }
  }
}

module.exports = { CreateCommand };