const fs = require('fs-extra');
const path = require('path');
const { getDatabase } = require('./connection');
const ProjectModel = require('./models/project');
const ProcessingRunModel = require('./models/processing-run');
const RawKeywordModel = require('./models/raw-keyword');

class DatabaseMigration {
  constructor() {
    this.db = null;
    this.projectModel = null;
    this.processingRunModel = null;
    this.rawKeywordModel = null;
  }

  async initialize() {
    this.db = await getDatabase();
    this.projectModel = new ProjectModel(this.db);
    this.processingRunModel = new ProcessingRunModel(this.db);
    this.rawKeywordModel = new RawKeywordModel(this.db);
  }

  // Migrate existing CSV files from output directory
  async migrateFromOutputDirectory(outputDir = './output') {
    if (!this.db) await this.initialize();

    console.log(`Starting migration from ${outputDir}...`);
    
    if (!await fs.pathExists(outputDir)) {
      console.log(`Output directory ${outputDir} does not exist. Skipping migration.`);
      return { migrated: 0, errors: [] };
    }

    const files = await fs.readdir(outputDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));

    console.log(`Found ${csvFiles.length} CSV files to migrate`);

    const results = {
      migrated: 0,
      errors: [],
      projects: []
    };

    for (const csvFile of csvFiles) {
      try {
        const result = await this.migrateSingleCSV(path.join(outputDir, csvFile));
        results.migrated++;
        results.projects.push(result);
        console.log(`✓ Migrated: ${csvFile} -> Project: ${result.project.name}`);
      } catch (error) {
        console.error(`✗ Failed to migrate ${csvFile}:`, error.message);
        results.errors.push({ file: csvFile, error: error.message });
      }
    }

    console.log(`Migration completed: ${results.migrated} files migrated, ${results.errors.length} errors`);
    return results;
  }

  // Migrate a single CSV file
  async migrateSingleCSV(csvFilePath) {
    if (!this.db) await this.initialize();

    const csvContent = await fs.readFile(csvFilePath, 'utf-8');
    const fileName = path.basename(csvFilePath, '.csv');
    const stats = await fs.stat(csvFilePath);

    // Parse filename to extract domain/project info
    const projectInfo = this.parseFilename(fileName);

    // Create project
    const project = await this.projectModel.createProject({
      name: projectInfo.name,
      projectType: projectInfo.type,
      domain: projectInfo.domain,
      url: projectInfo.url,
      configuration: { 
        migrated: true,
        original_file: csvFilePath
      },
      tags: ['migrated']
    });

    // Create processing run
    const run = await this.processingRunModel.create({
      project_id: project.id,
      run_type: 'create',
      scrape_date: stats.mtime.toISOString().split('T')[0], // Use file modification date
      status: 'completed',
      current_stage: 'migration_complete',
      total_stages: 1,
      completed_stages: 1,
      progress_percent: 100,
      started_at: stats.birthtime.toISOString(),
      completed_at: stats.mtime.toISOString(),
      processing_stats: JSON.stringify({
        migrated: true,
        original_file: csvFilePath,
        file_size: stats.size
      })
    });

    // Save raw keywords
    const keywords = this.rawKeywordModel.saveFromCSV(project.id, run.id, csvContent);

    // Update project last processed
    await this.projectModel.updateLastProcessed(project.id);

    return {
      project,
      run,
      keywords,
      keywordCount: keywords.length
    };
  }

  // Parse filename to extract project information
  parseFilename(fileName) {
    // Examples: "semrush_example_com_2025-07-28.csv", "subfolder_example_com_blog_2025-07-28.csv"
    
    const parts = fileName.split('_');
    const date = parts[parts.length - 1]; // Last part is usually date
    
    if (fileName.includes('semrush_')) {
      // Domain-based project
      const domain = parts.slice(1, -1).join('_').replace(/_/g, '.');
      return {
        name: `${domain} - Migrated`,
        type: 'domain',
        domain: domain,
        url: null
      };
    } else if (fileName.includes('subfolder_')) {
      // Subfolder-based project
      const urlParts = parts.slice(1, -1);
      const domain = urlParts[0].replace(/_/g, '.');
      const subfolder = urlParts.slice(1).join('/');
      return {
        name: `${domain}/${subfolder} - Migrated`,
        type: 'subfolder',
        domain: null,
        url: `https://${domain}/${subfolder}`
      };
    } else {
      // Generic project
      const name = parts.slice(0, -1).join('_').replace(/_/g, ' ');
      return {
        name: `${name} - Migrated`,
        type: 'domain',
        domain: name.replace(/\s/g, '.'),
        url: null
      };
    }
  }

  // Export data back to CSV format
  async exportProjectToCSV(projectId, outputPath) {
    if (!this.db) await this.initialize();

    const project = this.projectModel.findById(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    const runs = this.processingRunModel.getRunsByProject(projectId);
    const allKeywords = [];

    // Get keywords from all runs
    for (const run of runs) {
      const runKeywords = this.rawKeywordModel.getByRun(run.id);
      allKeywords.push(...runKeywords);
    }

    // Convert to CSV format
    const csvHeader = 'Keyword;Position;Previous Position;Position Difference;Search Volume;CPC;Url;Traffic (%);Traffic Cost (%);Competition;Number of Results;Trends';
    const csvRows = allKeywords.map(keyword => {
      return [
        keyword.keyword || '',
        keyword.position || '',
        keyword.previous_position || '',
        keyword.position_difference || '',
        keyword.search_volume || '',
        keyword.cpc || '',
        keyword.url || '',
        keyword.traffic_percent || '',
        keyword.traffic_cost_percent || '',
        keyword.competition || '',
        keyword.number_of_results || '',
        keyword.trends || ''
      ].join(';');
    });

    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    // Write CSV file
    await fs.writeFile(outputPath, csvContent);

    return {
      project,
      filePath: outputPath,
      keywordCount: allKeywords.length
    };
  }

  // Get migration status
  async getMigrationStatus() {
    if (!this.db) await this.initialize();

    const totalProjects = this.projectModel.count();
    const migratedProjects = this.projectModel.count({ 
      configuration: '%"migrated":true%' 
    });

    return {
      totalProjects,
      migratedProjects,
      nativeDatabaseProjects: totalProjects - migratedProjects
    };
  }

  // Clean up database (for testing purposes)
  async clearDatabase() {
    if (!this.db) await this.initialize();

    console.log('⚠️  Clearing all database data...');
    
    const tables = [
      'api_usage',
      'processing_logs', 
      'generated_content',
      'keyword_clusters',
      'keywords',
      'raw_keywords',
      'processing_runs',
      'projects'
    ];

    // Delete in reverse dependency order
    for (const table of tables) {
      this.db.prepare(`DELETE FROM ${table}`).run();
    }

    console.log('Database cleared successfully');
  }
}

module.exports = DatabaseMigration;