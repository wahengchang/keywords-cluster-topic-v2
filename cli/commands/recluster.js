const prompts = require('prompts');
const { DatabasePrompts } = require('../prompts/database-selection');
const { ClusteringService } = require('../../src/services/clustering-service');
const { Output } = require('../utils/output');
const { getDatabase, closeDatabase } = require('../../src/database/connection');
const ProjectModel = require('../../src/database/models/project');
const KeywordModel = require('../../src/database/models/keyword');
const ClusterModel = require('../../src/database/models/cluster');
const ProcessingRunModel = require('../../src/database/models/processing-run');

// Re-cluster existing keywords with different parameters
class ReclusterCommand {
  constructor() {
    this.clusteringService = new ClusteringService();
  }

  async selectExistingProject() {
    try {
      const db = await getDatabase();
      const projectModel = new ProjectModel(db);
      const projects = projectModel.findActive();
      
      if (projects.length === 0) {
        Output.showError('No projects found. Create a project first.');
        process.exit(1);
      }

      // Get keyword and cluster counts for each project
      const projectsWithCounts = projects.map(p => {
        const keywordCount = db.prepare('SELECT COUNT(*) as count FROM keywords WHERE project_id = ?').get(p.id).count;
        const clusterCount = db.prepare('SELECT COUNT(*) as count FROM keyword_clusters WHERE project_id = ?').get(p.id).count;
        return {
          ...p,
          keyword_count: keywordCount,
          cluster_count: clusterCount
        };
      });

      const response = await prompts({
        type: 'select',
        name: 'projectId',
        message: 'Select project to re-cluster:',
        choices: projectsWithCounts.map(p => ({
          title: `${p.name} (${p.keyword_count} keywords, ${p.cluster_count} clusters)`,
          value: p.id
        }))
      });

      if (!response.projectId) {
        Output.showInfo('No project selected. Exiting...');
        process.exit(0);
      }

      return projectsWithCounts.find(p => p.id === response.projectId);
    } catch (error) {
      Output.showError(`Error selecting project: ${error.message}`);
      process.exit(1);
    }
  }

  async getClusteringOptions(currentClusterCount) {
    Output.showInfo(`Current project has ${currentClusterCount} clusters`);
    
    const response = await prompts([
      {
        type: 'number',
        name: 'targetClusters',
        message: 'How many clusters would you like? (0 = auto-optimize)',
        initial: Math.max(10, Math.ceil(currentClusterCount * 1.5)),
        min: 0,
        max: 100
      },
      {
        type: 'confirm',
        name: 'deleteExisting',
        message: 'Delete existing clusters and generated content?',
        initial: true
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with re-clustering?',
        initial: true
      }
    ]);

    if (!response.confirm) {
      Output.showInfo('Re-clustering cancelled.');
      process.exit(0);
    }

    return response;
  }

  async execute() {
    try {
      Output.showInfo('🔄 Re-cluster Keywords - Adjust clustering parameters for existing project');

      // Select project
      const project = await this.selectExistingProject();
      Output.showSuccess(`Selected project: ${project.name}`);

      // Get keywords from database
      const db = await getDatabase();
      const keywordModel = new KeywordModel(db);
      const keywords = keywordModel.findAll({ project_id: project.id });
      
      // Get the run_id from the existing keywords (they should all have the same run_id)
      let runId = null;
      if (keywords.length > 0) {
        runId = keywords[0].run_id;
      } else {
        // If no keywords, create a new processing run
        const processingRunModel = new ProcessingRunModel(db);
        const newRun = processingRunModel.create({
          project_id: project.id,
          run_type: 'recluster',
          scrape_date: new Date().toISOString().split('T')[0],
          status: 'running',
          current_stage: 'clustering',
          started_at: new Date().toISOString()
        });
        runId = newRun.id;
      }

      if (keywords.length === 0) {
        Output.showError('No keywords found for this project.');
        process.exit(1);
      }

      Output.showInfo(`Found ${keywords.length} keywords to re-cluster`);

      // Get clustering options
      const clusteringOptions = await this.getClusteringOptions(project.cluster_count || 0);

      // Delete existing clusters if requested
      if (clusteringOptions.deleteExisting) {
        Output.showInfo('🗑️ Removing existing clusters and generated content...');
        const clusterModel = new ClusterModel(db);
        await clusterModel.deleteByProject(project.id);
        
        // Also delete generated content
        const deleteGenerated = db.prepare('DELETE FROM generated_content WHERE project_id = ?');
        deleteGenerated.run(project.id);
        
        Output.showSuccess('Existing clusters and content removed');
      }

      // Perform clustering
      Output.showInfo('🤖 Running clustering algorithm...');
      const clusterOptions = {};
      
      if (clusteringOptions.targetClusters > 0) {
        clusterOptions.clusterCount = clusteringOptions.targetClusters;
        Output.showInfo(`Using fixed cluster count: ${clusteringOptions.targetClusters}`);
      } else {
        Output.showInfo('Using automatic cluster optimization');
      }

      const clusters = await this.clusteringService.performAdvancedClustering(keywords, clusterOptions);
      
      Output.showSuccess(`✅ Generated ${clusters.length} clusters`);

      // Save clusters to database
      Output.showInfo('💾 Saving clusters to database...');
      const clusterModel = new ClusterModel(db);
      
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        
        // Save cluster
        const clusterRecord = clusterModel.create({
          project_id: project.id,
          run_id: runId,
          cluster_name: cluster.name,
          cluster_description: cluster.description || `Cluster containing ${cluster.keywords.length} keywords`,
          keyword_count: cluster.keywords.length,
          total_search_volume: cluster.keywords.reduce((sum, k) => sum + (k.search_volume || 0), 0),
          avg_competition: cluster.keywords.reduce((sum, k) => sum + (k.competition || 0), 0) / cluster.keywords.length,
          avg_cpc: cluster.keywords.reduce((sum, k) => sum + (k.cpc || 0), 0) / cluster.keywords.length,
          coherence_score: cluster.coherence_score || cluster.coherence || 0,
          silhouette_score: cluster.silhouette_score || cluster.silhouette || 0,
          business_value_score: cluster.business_value_score || 0
        });

        // Update keywords with cluster assignment
        const updateKeyword = db.prepare('UPDATE keywords SET cluster_id = ? WHERE id = ?');
        cluster.keywords.forEach(keyword => {
          updateKeyword.run(clusterRecord.id, keyword.id);
        });
      }

      // Update project last processed time
      const updateProject = db.prepare('UPDATE projects SET last_processed = ? WHERE id = ?');
      updateProject.run(new Date().toISOString(), project.id);

      Output.showSuccess(`🎉 Re-clustering complete!`);
      Output.showInfo(`Generated ${clusters.length} clusters for ${keywords.length} keywords`);
      Output.showInfo('You can now view the results in the web interface or generate new content.');

      await closeDatabase();
    } catch (error) {
      Output.showError(`Re-clustering failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }
}

module.exports = { ReclusterCommand };