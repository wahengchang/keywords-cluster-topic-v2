const prompts = require('prompts');
const { Output } = require('../utils/output');
const { getDatabase, closeDatabase } = require('../../src/database/connection');
const ProjectModel = require('../../src/database/models/project');
const ProcessingRunModel = require('../../src/database/models/processing-run');
const KeywordModel = require('../../src/database/models/keyword');
const ClusterModel = require('../../src/database/models/cluster');
const { FAQTitleGenerator } = require('../../src/generators/faq-title-generator');

class WriteMoreCommand {
  constructor() {
    this.db = null;
    this.projectModel = null;
    this.processingRunModel = null;
    this.keywordModel = null;
    this.clusterModel = null;
  }

  async execute() {
    try {
      Output.showInfo('🎯 Generate More Content - FAQ Title Generation');
      Output.showInfo('Generate FAQ titles from your existing keyword clusters using AI');

      // Initialize database connection
      await this.initializeDatabase();

      // Step 1: Select project
      const project = await this.selectProject();
      if (!project) {
        Output.showInfo('No project selected. Exiting...');
        return;
      }

      // Step 2: Load and display clusters
      const clusters = await this.loadClustersWithCounts(project.id);
      if (!clusters || clusters.length === 0) {
        Output.showWarning(`No keyword clusters found for project "${project.name}".`);
        Output.showInfo('Please run processing on this project first to create clusters.');
        return;
      }

      // Step 3: Select clusters for content generation
      const selectedClusters = await this.selectClusters(clusters);
      if (!selectedClusters || selectedClusters.length === 0) {
        Output.showInfo('No clusters selected. Exiting...');
        return;
      }

      // Step 4: Configure generation settings
      const settings = await this.configureGenerationSettings();
      if (!settings) {
        Output.showInfo('Configuration cancelled. Exiting...');
        return;
      }

      // Step 5: Generate FAQ titles
      await this.generateFAQTitles(project, selectedClusters, settings);

    } catch (error) {
      Output.showError(`Content generation failed: ${error.message}`);
      console.error('WriteMore error:', error);
    } finally {
      if (this.db) {
        closeDatabase();
      }
    }
  }

  async initializeDatabase() {
    this.db = await getDatabase();
    this.projectModel = new ProjectModel(this.db);
    this.processingRunModel = new ProcessingRunModel(this.db);
    this.keywordModel = new KeywordModel(this.db);
    this.clusterModel = new ClusterModel(this.db);
  }

  async selectProject() {
    // Get all active projects
    const projects = this.projectModel.findAll({ status: 'active' });
    
    if (!projects || projects.length === 0) {
      Output.showWarning('No active projects found.');
      Output.showInfo('Please create a project first using "Create New Project".');
      return null;
    }

    // Show project selection
    const choices = projects.map(project => ({
      title: `${project.name} (${project.project_type})`,
      description: `Domain: ${project.domain || project.url} | Last processed: ${project.last_processed || 'Never'}`,
      value: project
    }));

    const response = await prompts({
      type: 'select',
      name: 'project',
      message: 'Select a project to generate content for:',
      choices: choices
    });

    return response.project;
  }

  async loadClustersWithCounts(projectId) {
    try {
      // Get clusters for this project (latest run)
      const clusters = this.clusterModel.findAll({ project_id: projectId });
      
      if (!clusters || clusters.length === 0) {
        return [];
      }

      // Get existing content counts for each cluster
      const clustersWithCounts = await Promise.all(
        clusters.map(async (cluster) => {
          const existingCount = await this.getExistingContentCount(cluster.id);
          return {
            ...cluster,
            existing_content_count: existingCount
          };
        })
      );

      return clustersWithCounts;
    } catch (error) {
      Output.showError(`Failed to load clusters: ${error.message}`);
      return [];
    }
  }

  async getExistingContentCount(clusterId) {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM generated_content 
        WHERE cluster_id = ? AND content_type = 'title'
      `;
      const result = this.db.prepare(query).get(clusterId);
      return result ? result.count : 0;
    } catch (error) {
      console.error('Error getting content count:', error);
      return 0;
    }
  }

  async selectClusters(clusters) {
    Output.showInfo('\n📊 Available Clusters:');
    
    // Display clusters with stats
    clusters.forEach((cluster, index) => {
      Output.showInfo(`${index + 1}. ${cluster.cluster_name || `Cluster ${cluster.id}`}`);
      Output.showInfo(`   Keywords: ${cluster.keyword_count || 0} | Existing FAQ titles: ${cluster.existing_content_count || 0}`);
      if (cluster.cluster_description) {
        Output.showInfo(`   Theme: ${cluster.cluster_description}`);
      }
      Output.showInfo('');
    });

    const choices = clusters.map((cluster, index) => ({
      title: `${cluster.cluster_name || `Cluster ${cluster.id}`} (${cluster.keyword_count || 0} keywords, ${cluster.existing_content_count || 0} existing titles)`,
      value: cluster,
      selected: false
    }));

    const response = await prompts({
      type: 'multiselect',
      name: 'clusters',
      message: 'Select clusters to generate FAQ titles for:',
      choices: choices,
      hint: '- Space to select. Return to submit'
    });

    return response.clusters;
  }

  async configureGenerationSettings() {
    const response = await prompts([
      {
        type: 'number',
        name: 'titlesPerCluster',
        message: 'How many FAQ titles to generate per cluster?',
        initial: 5,
        min: 1,
        max: 20,
        validate: value => value > 0 && value <= 20 ? true : 'Please enter a number between 1 and 20'
      },
      {
        type: 'confirm',
        name: 'avoidDuplicates',
        message: 'Skip generation if cluster already has many titles?',
        initial: true
      }
    ]);

    if (response.titlesPerCluster === undefined) {
      return null; // User cancelled
    }

    return response;
  }

  async generateFAQTitles(project, selectedClusters, settings) {
    Output.showInfo(`\n🚀 Starting FAQ title generation for ${selectedClusters.length} clusters...`);
    
    // Create processing run
    const run = await this.processingRunModel.createRun({
      project_id: project.id,
      run_type: 'writemore',
      scrape_date: new Date().toISOString().split('T')[0]
    });

    let totalGenerated = 0;
    let successfulClusters = 0;
    const generator = new FAQTitleGenerator({ titlesPerCluster: settings.titlesPerCluster });

    try {
      await this.processingRunModel.updateProgress(run.id, 'generating_content', 1, 10);

      for (let i = 0; i < selectedClusters.length; i++) {
        const cluster = selectedClusters[i];
        const progress = Math.round(((i + 1) / selectedClusters.length) * 90) + 10;

        Output.showInfo(`\n📝 Processing cluster: ${cluster.cluster_name || `Cluster ${cluster.id}`} (${i + 1}/${selectedClusters.length})`);

        try {
          // Check if we should skip due to existing content
          if (settings.avoidDuplicates && cluster.existing_content_count >= settings.titlesPerCluster) {
            Output.showInfo(`   ⏭️  Skipping - already has ${cluster.existing_content_count} titles`);
            continue;
          }

          // Get cluster keywords
          const keywords = await this.getClusterKeywords(cluster.id);
          if (!keywords || keywords.length === 0) {
            Output.showWarning(`   ⚠️  No keywords found for this cluster`);
            continue;
          }

          // Get existing titles to avoid duplicates
          const existingTitles = await this.getExistingTitles(cluster.id);

          // Prepare cluster data for generator
          const clusterData = {
            name: cluster.cluster_name || `Cluster ${cluster.id}`,
            keywords: keywords
          };

          // Generate FAQ titles
          Output.showInfo(`   🤖 Generating ${settings.titlesPerCluster} FAQ titles...`);
          const newTitles = await generator.generateFAQTitles(clusterData, existingTitles);

          if (newTitles && newTitles.length > 0) {
            // Save generated titles to database
            await this.saveGeneratedTitles(run.id, project.id, cluster.id, newTitles);
            
            totalGenerated += newTitles.length;
            successfulClusters++;

            Output.showSuccess(`   ✅ Generated ${newTitles.length} titles:`);
            newTitles.slice(0, 3).forEach(title => {
              Output.showInfo(`      • ${title}`);
            });
            if (newTitles.length > 3) {
              Output.showInfo(`      ... and ${newTitles.length - 3} more`);
            }
          } else {
            Output.showWarning(`   ⚠️  No new titles generated`);
          }

        } catch (clusterError) {
          Output.showError(`   ❌ Failed to generate titles: ${clusterError.message}`);
          console.error('Cluster generation error:', clusterError);
        }

        await this.processingRunModel.updateProgress(run.id, 'generating_content', i + 2, progress);
      }

      // Complete the run
      await this.processingRunModel.updateProgress(run.id, 'completed', selectedClusters.length + 1, 100);
      await this.processingRunModel.completeRun(run.id, 'completed');

      // Show summary
      Output.showInfo('\n📊 Generation Summary:');
      Output.showSuccess(`✅ Successfully processed ${successfulClusters}/${selectedClusters.length} clusters`);
      Output.showSuccess(`✅ Generated ${totalGenerated} new FAQ titles`);
      Output.showInfo(`📝 All titles saved to database for project "${project.name}"`);

    } catch (error) {
      await this.processingRunModel.completeRun(run.id, 'failed', error.message);
      throw error;
    }
  }

  async getClusterKeywords(clusterId) {
    try {
      const query = `
        SELECT keyword, intent, priority_score 
        FROM keywords 
        WHERE cluster_id = ? 
        ORDER BY priority_score DESC, search_volume DESC 
        LIMIT 15
      `;
      const keywords = this.db.prepare(query).all(clusterId);
      return keywords || [];
    } catch (error) {
      console.error('Error getting cluster keywords:', error);
      return [];
    }
  }

  async getExistingTitles(clusterId) {
    try {
      const query = `
        SELECT content 
        FROM generated_content 
        WHERE cluster_id = ? AND content_type = 'title'
      `;
      const results = this.db.prepare(query).all(clusterId);
      return results.map(r => r.content);
    } catch (error) {
      console.error('Error getting existing titles:', error);
      return [];
    }
  }

  async saveGeneratedTitles(runId, projectId, clusterId, titles) {
    try {
      const insertQuery = `
        INSERT INTO generated_content (
          project_id, run_id, content_type, content, cluster_id,
          ai_model, word_count, character_count, is_approved, created_at
        ) VALUES (?, ?, 'title', ?, ?, 'gpt-3.5-turbo', ?, ?, 0, datetime('now'))
      `;
      
      const insertStmt = this.db.prepare(insertQuery);
      
      for (const title of titles) {
        insertStmt.run(
          projectId,
          runId,
          title,
          clusterId,
          title.split(' ').length, // word_count
          title.length // character_count
        );
      }
    } catch (error) {
      console.error('Error saving generated titles:', error);
      throw new Error(`Failed to save titles to database: ${error.message}`);
    }
  }
}

module.exports = { WriteMoreCommand };