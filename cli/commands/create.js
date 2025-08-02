const { ProjectTypePrompts } = require('../prompts/project-type');
const { DatabasePrompts } = require('../prompts/database-selection');
const { KeywordService } = require('../../src/services/keyword-service');
const { Settings } = require('../config/settings');
const { Output } = require('../utils/output');
const { getDatabase, closeDatabase } = require('../../src/database/connection');
const ProjectModel = require('../../src/database/models/project');
const ProcessingRunModel = require('../../src/database/models/processing-run');
const DatabaseMigration = require('../../src/database/migration');
const { FAQTitleGenerator } = require('../../src/generators/faq-title-generator');
const { KeywordExpansionService } = require('../../src/services/keyword-expansion-service');

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
      Output.showInfo('4. Expand keyword coverage with AI discovery');
      Output.showInfo('5. Generate comprehensive FAQ titles for ALL clusters');
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

      // Helper function to normalize URL
      const normalizeUrl = (url) => {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return 'https://' + url;
        }
        return url;
      };

      // Generate project name from target
      const projectName = projectDetails.method === 'Domain' 
        ? projectDetails.target.replace(/[^a-zA-Z0-9]/g, '_')
        : new URL(normalizeUrl(projectDetails.target)).hostname.replace(/[^a-zA-Z0-9]/g, '_');

      // Combine parameters
      const params = {
        name: projectName,
        method: projectDetails.method,
        target: projectDetails.method === 'URL' ? normalizeUrl(projectDetails.target) : projectDetails.target,
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
      
      // Step 4: Auto-expand keyword coverage
      Output.showInfo('\n🔍 Auto-expanding keyword coverage for comprehensive content...');
      const expandedKeywordsData = await this.expandAllClusters(result.project, result.clusters);
      
      // Step 5: Auto-generate FAQ titles for ALL clusters (with expanded keywords)
      Output.showInfo('\n🎯 Auto-generating comprehensive FAQ titles for all clusters...');
      await this.generateComprehensiveFAQTitles(result.project, result.clusters, expandedKeywordsData);
      
      Output.showSummary({
        'Method': result.method,
        'Target': result.target,
        'Database': result.database,
        'Keywords fetched': result.keywordCount,
        'Keywords processed': result.processedKeywordCount,
        'Clusters found': result.clusterCount,
        'Duplicate groups': result.duplicateGroupCount,
        'Pipeline status': '✅ Completed successfully',
        'Keyword Expansion': `✅ ${expandedKeywordsData?.totalExpandedKeywords || 0} new keywords discovered`,
        'FAQ Generation': '✅ Completed for all clusters',
        'Database project': result.project.name
      });

    } catch (error) {
      Output.showError(error.message);
      process.exit(1);
    }
  }

  async expandAllClusters(project, clusters) {
    try {
      const expansionService = new KeywordExpansionService();
      let totalExpandedKeywords = 0;
      let successfulExpansions = 0;
      const expandedData = {};

      Output.showInfo(`Expanding keyword coverage for ${clusters.length} clusters...`);
      
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        
        try {
          Output.showProgress(`Expanding cluster ${i + 1}/${clusters.length}: ${cluster.cluster_name || `Cluster ${cluster.id}`}`);
          
          // Get existing cluster keywords from the processing results
          const existingKeywords = this.getClusterKeywords(await getDatabase(), cluster.id);
          if (!existingKeywords || existingKeywords.length === 0) {
            continue;
          }
          
          // Prepare cluster data for expansion
          const clusterData = {
            id: cluster.id,
            name: cluster.cluster_name || `Cluster ${cluster.id}`,
            keywords: existingKeywords
          };
          
          // Expand keywords using AI (12 keywords per cluster for comprehensive coverage)
          const expandedKeywords = await expansionService.expandClusterKeywords(clusterData, 12);
          
          if (expandedKeywords && expandedKeywords.length > 0) {
            // Save expanded keywords to database
            const db = await getDatabase();
            // Create a run for saving expanded keywords
            const processingRunModel = new ProcessingRunModel(db);
            const run = processingRunModel.startRun(project.id, 'create');
            await this.saveExpandedKeywords(db, project.id, cluster.id, expandedKeywords, run.id);
            
            expandedData[cluster.id] = expandedKeywords;
            totalExpandedKeywords += expandedKeywords.length;
            successfulExpansions++;
            
            Output.showSuccess(`   ✅ Added ${expandedKeywords.length} keywords`);
          }
          
        } catch (expansionError) {
          Output.showError(`   ❌ Failed to expand cluster ${cluster.id}: ${expansionError.message}`);
        }
      }
      
      Output.showInfo('\n📊 Keyword Expansion Results:');
      Output.showSuccess(`✅ Expanded ${successfulExpansions}/${clusters.length} clusters`);
      Output.showSuccess(`✅ Discovered ${totalExpandedKeywords} new related keywords`);
      
      return {
        totalExpandedKeywords,
        successfulExpansions,
        expandedData
      };
      
    } catch (error) {
      Output.showError(`Keyword expansion failed: ${error.message}`);
      return { totalExpandedKeywords: 0, successfulExpansions: 0, expandedData: {} };
    }
  }

  async generateComprehensiveFAQTitles(project, clusters, expandedKeywordsData = null) {
    try {
      const db = await getDatabase();
      const processingRunModel = new ProcessingRunModel(db);
      
      // Create a new processing run for title generation
      const run = processingRunModel.startRun(project.id, 'faq_generation');
      
      // Initialize FAQ title generator with higher count for comprehensive coverage
      const generator = new FAQTitleGenerator({ titlesPerCluster: 10 });
      
      let totalGenerated = 0;
      let successfulClusters = 0;
      
      Output.showInfo(`Processing ${clusters.length} clusters for comprehensive FAQ title generation...`);
      
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        const progress = Math.round(((i + 1) / clusters.length) * 100);
        
        try {
          Output.showProgress(`Cluster ${i + 1}/${clusters.length}: ${cluster.cluster_name || `Cluster ${cluster.id}`}`);
          
          // Get cluster keywords (original + expanded)
          const originalKeywords = this.getClusterKeywords(db, cluster.id);
          const expandedKeywords = expandedKeywordsData?.expandedData?.[cluster.id] || [];
          const allKeywords = [...(originalKeywords || []), ...expandedKeywords];
          
          if (!allKeywords || allKeywords.length === 0) {
            Output.showInfo(`   ⚠️  No keywords found for cluster ${cluster.id}`);
            continue;
          }
          
          // Prepare cluster data for generator
          const clusterData = {
            name: cluster.cluster_name || `Cluster ${cluster.id}`,
            keywords: allKeywords
          };
          
          const keywordInfo = expandedKeywords.length > 0 ? 
            ` (${originalKeywords?.length || 0} + ${expandedKeywords.length} expanded)` : 
            ` (${originalKeywords?.length || 0} keywords)`;
          Output.showInfo(`   📝 Using ${allKeywords.length} keywords${keywordInfo}`);
          
          // Generate comprehensive FAQ titles (10 per cluster)
          const newTitles = await generator.generateFAQTitles(clusterData, []);
          
          if (newTitles && newTitles.length > 0) {
            // Save generated titles to database
            await this.saveGeneratedTitles(db, run.id, project.id, cluster.id, newTitles);
            
            totalGenerated += newTitles.length;
            successfulClusters++;
            
            Output.showSuccess(`   ✅ Generated ${newTitles.length} FAQ titles`);
            // Show first few titles as preview
            newTitles.slice(0, 2).forEach(title => {
              Output.showInfo(`      • ${title}`);
            });
            if (newTitles.length > 2) {
              Output.showInfo(`      ... and ${newTitles.length - 2} more`);
            }
          } else {
            Output.showInfo(`   ⚠️  No titles generated for this cluster`);
          }
          
        } catch (clusterError) {
          Output.showError(`   ❌ Failed to generate titles for cluster ${cluster.id}: ${clusterError.message}`);
          console.error('Cluster generation error:', clusterError);
        }
        
        await processingRunModel.updateProgress(run.id, 'generating_titles', i + 1, progress);
      }
      
      // Complete the run
      await processingRunModel.completeRun(run.id, { totalGenerated, successfulClusters });
      
      // Show comprehensive summary
      Output.showInfo('\n📊 FAQ Title Generation Summary:');
      Output.showSuccess(`✅ Successfully processed ${successfulClusters}/${clusters.length} clusters`);
      Output.showSuccess(`✅ Generated ${totalGenerated} comprehensive FAQ titles`);
      Output.showInfo(`📝 All titles saved to database for project "${project.name}"`);
      Output.showInfo(`🌐 View generated titles at: http://localhost:3000/titles/${project.name}`);
      
      closeDatabase();
      
    } catch (error) {
      Output.showError(`FAQ title generation failed: ${error.message}`);
      console.error('FAQ generation error:', error);
    }
  }
  
  getClusterKeywords(db, clusterId) {
    try {
      const query = `
        SELECT keyword, intent, priority_score, search_volume
        FROM keywords 
        WHERE cluster_id = ? 
        ORDER BY priority_score DESC, search_volume DESC 
        LIMIT 15
      `;
      const keywords = db.prepare(query).all(clusterId);
      
      // If no keywords with cluster_id, try fallback approach
      if (!keywords || keywords.length === 0) {
        const cluster = db.prepare('SELECT * FROM keyword_clusters WHERE id = ?').get(clusterId);
        if (cluster) {
          const fallbackQuery = `
            SELECT keyword, search_volume as intent, search_volume as priority_score, search_volume
            FROM keywords 
            WHERE project_id = ? 
            ORDER BY search_volume DESC 
            LIMIT 10
          `;
          const fallbackKeywords = db.prepare(fallbackQuery).all(cluster.project_id);
          return fallbackKeywords || [];
        }
      }
      
      return keywords || [];
    } catch (error) {
      console.error('Error getting cluster keywords:', error);
      return [];
    }
  }
  
  async saveGeneratedTitles(db, runId, projectId, clusterId, titles) {
    try {
      const insertQuery = `
        INSERT INTO generated_content (
          project_id, run_id, content_type, content, cluster_id,
          ai_model, word_count, character_count, is_approved, created_at
        ) VALUES (?, ?, 'title', ?, ?, 'gpt-4o-mini', ?, ?, 0, datetime('now'))
      `;
      
      const insertStmt = db.prepare(insertQuery);
      
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

  async saveExpandedKeywords(db, projectId, clusterId, expandedKeywords, runId) {
    try {
      const insertQuery = `
        INSERT INTO keywords (
          project_id, run_id, cluster_id, keyword, search_volume, intent, priority_score,
          difficulty_score, competition, cpc, trends, 
          cleaned_keyword, expansion_type, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, '', ?, ?, 'expansion', datetime('now'))
      `;
      
      const insertStmt = db.prepare(insertQuery);
      
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
    } catch (error) {
      console.error('Error saving expanded keywords:', error);
      throw new Error(`Failed to save expanded keywords to database: ${error.message}`);
    }
  }
}

module.exports = { CreateCommand };