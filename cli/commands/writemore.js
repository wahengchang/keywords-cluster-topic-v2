const prompts = require('prompts');
const { Output } = require('../utils/output');
const { getDatabase, closeDatabase } = require('../../src/database/connection');
const ProjectModel = require('../../src/database/models/project');
const ProcessingRunModel = require('../../src/database/models/processing-run');
const KeywordModel = require('../../src/database/models/keyword');
const ClusterModel = require('../../src/database/models/cluster');
const { FAQTitleGenerator } = require('../../src/generators/faq-title-generator');
const { KeywordExpansionService } = require('../../src/services/keyword-expansion-service');

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
      Output.showInfo('🎯 Generate More Content - Keyword Expansion + FAQ Title Generation');
      Output.showInfo('Discover new related keywords and generate comprehensive FAQ titles using AI');

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
        Output.showInfo(`⚠️  No keyword clusters found for project "${project.name}".`);
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

      // Step 5: Expand keywords if requested
      let expandedKeywordsData = null;
      if (settings.expandKeywords) {
        expandedKeywordsData = await this.expandClusterKeywords(project, selectedClusters, settings);
      }

      // Step 6: Generate FAQ titles with expanded keyword coverage
      await this.generateFAQTitles(project, selectedClusters, settings, expandedKeywordsData);

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
      Output.showInfo('⚠️  No active projects found.');
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
        type: 'confirm',
        name: 'expandKeywords',
        message: 'Discover additional related keywords for each cluster?',
        initial: true
      },
      {
        type: 'number',
        name: 'keywordsPerCluster',
        message: 'How many new keywords to discover per cluster?',
        initial: 15,
        min: 5,
        max: 30,
        validate: value => value >= 5 && value <= 30 ? true : 'Please enter a number between 5 and 30'
      },
      {
        type: 'number',
        name: 'titlesPerCluster',
        message: 'How many FAQ titles to generate per cluster?',
        initial: 8,
        min: 1,
        max: 25,
        validate: value => value > 0 && value <= 25 ? true : 'Please enter a number between 1 and 25'
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

  async expandClusterKeywords(project, selectedClusters, settings) {
    Output.showInfo(`\n🔍 Expanding keyword coverage for ${selectedClusters.length} clusters...`);
    
    // Create processing run for keyword expansion
    const run = this.processingRunModel.startRun(project.id, 'writemore');
    
    const expansionService = new KeywordExpansionService();
    let totalExpandedKeywords = 0;
    let successfulExpansions = 0;
    const expandedData = {};

    try {
      for (let i = 0; i < selectedClusters.length; i++) {
        const cluster = selectedClusters[i];
        const progress = Math.round(((i + 1) / selectedClusters.length) * 100);
        
        try {
          Output.showProgress(`Expanding cluster ${i + 1}/${selectedClusters.length}: ${cluster.cluster_name || `Cluster ${cluster.id}`}`);
          
          // Get existing cluster keywords
          const existingKeywords = await this.getClusterKeywords(cluster.id);
          if (!existingKeywords || existingKeywords.length === 0) {
            Output.showInfo(`   ⚠️  No existing keywords found for expansion`);
            continue;
          }
          
          // Prepare cluster data for expansion
          const clusterData = {
            id: cluster.id,
            name: cluster.cluster_name || `Cluster ${cluster.id}`,
            keywords: existingKeywords
          };
          
          // Expand keywords using AI
          const expandedKeywords = await expansionService.expandClusterKeywords(
            clusterData, 
            settings.keywordsPerCluster
          );
          
          if (expandedKeywords && expandedKeywords.length > 0) {
            // Save expanded keywords to database
            await this.saveExpandedKeywords(run.id, project.id, cluster.id, expandedKeywords);
            
            expandedData[cluster.id] = expandedKeywords;
            totalExpandedKeywords += expandedKeywords.length;
            successfulExpansions++;
            
            Output.showSuccess(`   ✅ Discovered ${expandedKeywords.length} new keywords`);
            // Show preview of expansion types
            const typeCounts = expandedKeywords.reduce((acc, kw) => {
              acc[kw.type] = (acc[kw.type] || 0) + 1;
              return acc;
            }, {});
            Output.showInfo(`      Types: ${Object.entries(typeCounts).map(([type, count]) => `${type}(${count})`).join(', ')}`);
          } else {
            Output.showInfo(`   ⚠️  No new keywords discovered`);
          }
          
        } catch (expansionError) {
          Output.showError(`   ❌ Failed to expand keywords: ${expansionError.message}`);
          console.error('Keyword expansion error:', expansionError);
        }
      }
      
      // Show expansion summary
      Output.showInfo('\n📊 Keyword Expansion Summary:');
      Output.showSuccess(`✅ Successfully expanded ${successfulExpansions}/${selectedClusters.length} clusters`);
      Output.showSuccess(`✅ Discovered ${totalExpandedKeywords} new related keywords`);
      
      return {
        totalExpandedKeywords,
        successfulExpansions,
        expandedData
      };
      
    } catch (error) {
      Output.showError(`Keyword expansion failed: ${error.message}`);
      throw error;
    }
  }

  async generateFAQTitles(project, selectedClusters, settings, expandedKeywordsData = null) {
    const expansionInfo = expandedKeywordsData ? 
      ` (including ${expandedKeywordsData.totalExpandedKeywords} newly discovered keywords)` : '';
    Output.showInfo(`\n🚀 Starting comprehensive FAQ title generation for ${selectedClusters.length} clusters${expansionInfo}...`);
    
    // Create processing run
    const run = this.processingRunModel.startRun(project.id, 'writemore');

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

          // Get cluster keywords (original + expanded)
          const originalKeywords = await this.getClusterKeywords(cluster.id);
          const expandedKeywords = expandedKeywordsData?.expandedData?.[cluster.id] || [];
          const allKeywords = [...(originalKeywords || []), ...expandedKeywords];
          
          if (!allKeywords || allKeywords.length === 0) {
            Output.showInfo(`   ⚠️  No keywords found for this cluster`);
            continue;
          }

          // Get existing titles to avoid duplicates
          const existingTitles = await this.getExistingTitles(cluster.id);

          // Prepare cluster data for generator
          const clusterData = {
            name: cluster.cluster_name || `Cluster ${cluster.id}`,
            keywords: allKeywords
          };
          
          const keywordInfo = expandedKeywords.length > 0 ? 
            ` (${originalKeywords?.length || 0} original + ${expandedKeywords.length} expanded)` : 
            ` (${originalKeywords?.length || 0} keywords)`;
          Output.showInfo(`   📝 Using ${allKeywords.length} keywords for title generation${keywordInfo}`);

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
            Output.showInfo(`   ⚠️  No new titles generated`);
          }

        } catch (clusterError) {
          Output.showError(`   ❌ Failed to generate titles: ${clusterError.message}`);
          console.error('Cluster generation error:', clusterError);
        }

        await this.processingRunModel.updateProgress(run.id, 'generating_content', i + 2, progress);
      }

      // Complete the run
      await this.processingRunModel.updateProgress(run.id, 'completed', selectedClusters.length + 1, 100);
      await this.processingRunModel.completeRun(run.id, { totalGenerated, successfulClusters });

      // Show summary
      Output.showInfo('\n📊 Generation Summary:');
      Output.showSuccess(`✅ Successfully processed ${successfulClusters}/${selectedClusters.length} clusters`);
      Output.showSuccess(`✅ Generated ${totalGenerated} new FAQ titles`);
      Output.showInfo(`📝 All titles saved to database for project "${project.name}"`);

    } catch (error) {
      await this.processingRunModel.markFailed(run.id, error.message);
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
      
      // Debug: Check if keywords have cluster assignments
      if (!keywords || keywords.length === 0) {
        const totalKeywords = this.db.prepare('SELECT COUNT(*) as count FROM keywords WHERE cluster_id IS NOT NULL').get();
        Output.showInfo(`   🔍 Debug: ${totalKeywords.count} total keywords have cluster assignments`);
        
        // Fallback: Get some keywords from the same project for testing
        const cluster = this.clusterModel.findById(clusterId);
        if (cluster) {
          const fallbackQuery = `
            SELECT keyword, search_volume as intent, search_volume as priority_score 
            FROM keywords 
            WHERE project_id = ? 
            ORDER BY search_volume DESC 
            LIMIT 5
          `;
          const fallbackKeywords = this.db.prepare(fallbackQuery).all(cluster.project_id);
          Output.showInfo(`   🔄 Using ${fallbackKeywords.length} fallback keywords from project for testing`);
          return fallbackKeywords || [];
        }
      }
      
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
        ) VALUES (?, ?, 'title', ?, ?, 'gpt-4o-mini', ?, ?, 0, datetime('now'))
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

  // Map expansion types from the service to database schema values
  mapExpansionType(type) {
    const typeMapping = {
      'long-tail': 'long_tail',
      'semantic': 'semantic', 
      'synonym': 'related',
      'related': 'related',
      'question': 'related',
      'modifier': 'related'
    };
    
    return typeMapping[type] || 'related';
  }

  // Map intent values from the service to database schema values
  mapIntent(intent) {
    const intentMapping = {
      'informational': 'informational',
      'navigational': 'navigational', 
      'commercial': 'commercial',
      'transactional': 'transactional'
    };
    
    return intentMapping[intent] || 'informational';
  }

  async saveExpandedKeywords(runId, projectId, clusterId, expandedKeywords) {
    try {
      const insertQuery = `
        INSERT INTO keywords (
          project_id, run_id, cluster_id, keyword, search_volume, intent, priority_score,
          difficulty_score, competition, cpc, trends, 
          cleaned_keyword, expansion_type, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, '', ?, ?, 'expansion', datetime('now'))
      `;
      
      const insertStmt = this.db.prepare(insertQuery);
      
      for (const keyword of expandedKeywords) {
        const expansionType = this.mapExpansionType(keyword.expansion_type || keyword.type);
        const intent = this.mapIntent(keyword.intent);
        insertStmt.run(
          projectId,
          runId,
          clusterId,
          keyword.keyword,
          keyword.search_volume || 0,
          intent,
          keyword.priority_score || 0.5,
          keyword.keyword, // cleaned_keyword same as keyword for expanded ones
          expansionType
        );
      }
      
      Output.showInfo(`   📊 Saved ${expandedKeywords.length} expanded keywords to database`);
    } catch (error) {
      console.error('Error saving expanded keywords:', error);
      throw new Error(`Failed to save expanded keywords to database: ${error.message}`);
    }
  }
}

module.exports = { WriteMoreCommand };