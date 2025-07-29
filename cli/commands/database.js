const prompts = require('prompts');
const { Output } = require('../utils/output');
const DatabaseMigration = require('../../src/database/migration');
const { getDatabase, closeDatabase } = require('../../src/database/connection');
const ProjectModel = require('../../src/database/models/project');
const ProcessingRunModel = require('../../src/database/models/processing-run');

class DatabaseCommand {
  constructor() {
    this.migration = new DatabaseMigration();
  }

  async execute() {
    try {
      const action = await this.promptForAction();
      
      switch (action) {
        case 'migrate':
          await this.handleMigration();
          break;
        case 'status':
          await this.showDatabaseStatus();
          break;
        case 'list-projects':
          await this.listProjects();
          break;
        case 'export':
          await this.handleExport();
          break;
        case 'clear':
          await this.handleClear();
          break;
        case 'backup':
          await this.handleBackup();
          break;
        default:
          Output.showInfo('No action selected. Exiting...');
      }
    } catch (error) {
      Output.showError(`Database operation failed: ${error.message}`);
    } finally {
      closeDatabase();
    }
  }

  async promptForAction() {
    const response = await prompts({
      type: 'select',
      name: 'action',
      message: 'What database operation would you like to perform?',
      choices: [
        { title: 'Migrate CSV files to database', value: 'migrate' },
        { title: 'Show database status', value: 'status' },
        { title: 'List all projects', value: 'list-projects' },
        { title: 'Export project to CSV', value: 'export' },
        { title: 'Backup database', value: 'backup' },
        { title: 'Clear database (⚠️  Dangerous)', value: 'clear' }
      ]
    });

    return response.action;
  }

  async handleMigration() {
    Output.showInfo('Starting CSV migration to database...');
    
    const pathResponse = await prompts({
      type: 'text',
      name: 'outputPath',
      message: 'Enter the path to your CSV output directory:',
      initial: './output'
    });

    if (!pathResponse.outputPath) {
      Output.showWarning('Migration cancelled - no path provided');
      return;
    }

    try {
      const results = await this.migration.migrateFromOutputDirectory(pathResponse.outputPath);
      
      Output.showSuccess(`Migration completed!`);
      Output.showInfo(`✓ ${results.migrated} files migrated successfully`);
      
      if (results.errors.length > 0) {
        Output.showWarning(`✗ ${results.errors.length} files failed to migrate:`);
        results.errors.forEach(error => {
          Output.showError(`  - ${error.file}: ${error.error}`);
        });
      }

      // Show summary of created projects
      if (results.projects.length > 0) {
        Output.showInfo('\nCreated projects:');
        results.projects.forEach(project => {
          Output.showInfo(`  - ${project.project.name} (${project.keywordCount} keywords)`);
        });
      }
      
    } catch (error) {
      Output.showError(`Migration failed: ${error.message}`);
    }
  }

  async showDatabaseStatus() {
    try {
      const db = await getDatabase();
      const projectModel = new ProjectModel(db);
      const runModel = new ProcessingRunModel(db);

      const totalProjects = projectModel.count();
      const activeProjects = projectModel.count({ status: 'active' });
      const totalRuns = runModel.count();
      const completedRuns = runModel.count({ status: 'completed' });

      Output.showInfo('Database Status:');
      Output.showInfo(`  Total Projects: ${totalProjects}`);
      Output.showInfo(`  Active Projects: ${activeProjects}`);
      Output.showInfo(`  Total Processing Runs: ${totalRuns}`);
      Output.showInfo(`  Completed Runs: ${completedRuns}`);

      // Show recent activity
      const recentRuns = runModel.getRecentRuns(5);
      if (recentRuns.length > 0) {
        Output.showInfo('\nRecent Activity:');
        recentRuns.forEach(run => {
          const status = run.status === 'completed' ? '✓' : run.status === 'failed' ? '✗' : '⏳';
          Output.showInfo(`  ${status} ${run.run_type} - ${run.scrape_date} (${run.status})`);
        });
      }

    } catch (error) {
      Output.showError(`Failed to get database status: ${error.message}`);
    }
  }

  async listProjects() {
    try {
      const db = await getDatabase();
      const projectModel = new ProjectModel(db);

      const projects = projectModel.findActive();
      
      if (projects.length === 0) {
        Output.showInfo('No active projects found.');
        return;
      }

      Output.showInfo(`Found ${projects.length} active projects:\n`);
      
      for (const project of projects) {
        const stats = projectModel.getProjectStats(project.id);
        const target = project.domain || project.url || 'Unknown';
        
        Output.showInfo(`📊 ${project.name}`);
        Output.showInfo(`   Type: ${project.project_type}`);
        Output.showInfo(`   Target: ${target}`);
        Output.showInfo(`   Slug: ${project.slug}`);
        Output.showInfo(`   Keywords: ${stats.totalKeywords}`);
        Output.showInfo(`   Runs: ${stats.totalRuns}`);
        Output.showInfo(`   Created: ${new Date(project.created_at).toLocaleDateString()}`);
        if (project.last_processed) {
          Output.showInfo(`   Last Processed: ${new Date(project.last_processed).toLocaleDateString()}`);
        }
        Output.showInfo('');
      }
      
    } catch (error) {
      Output.showError(`Failed to list projects: ${error.message}`);
    }
  }

  async handleExport() {
    try {
      const db = await getDatabase();
      const projectModel = new ProjectModel(db);

      const projects = projectModel.findActive();
      
      if (projects.length === 0) {
        Output.showInfo('No projects found to export.');
        return;
      }

      const projectChoices = projects.map(project => ({
        title: `${project.name} (${project.project_type})`,
        value: project.id,
        description: project.domain || project.url
      }));

      const projectResponse = await prompts({
        type: 'select',
        name: 'projectId',
        message: 'Select a project to export:',
        choices: projectChoices
      });

      if (!projectResponse.projectId) {
        Output.showWarning('Export cancelled - no project selected');
        return;
      }

      const pathResponse = await prompts({
        type: 'text',
        name: 'outputPath',
        message: 'Enter the output file path:',
        initial: `./exports/project_${projectResponse.projectId}_${new Date().toISOString().split('T')[0]}.csv`
      });

      if (!pathResponse.outputPath) {
        Output.showWarning('Export cancelled - no output path provided');
        return;
      }

      const result = await this.migration.exportProjectToCSV(projectResponse.projectId, pathResponse.outputPath);
      
      Output.showSuccess(`Project exported successfully!`);
      Output.showInfo(`  Project: ${result.project.name}`);
      Output.showInfo(`  Keywords: ${result.keywordCount}`);
      Output.showInfo(`  File: ${result.filePath}`);

    } catch (error) {
      Output.showError(`Export failed: ${error.message}`);
    }
  }

  async handleBackup() {
    try {
      const pathResponse = await prompts({
        type: 'text',
        name: 'backupPath',
        message: 'Enter the backup file path:',
        initial: `./backups/keywords-cluster-backup-${new Date().toISOString().split('T')[0]}.db`
      });

      if (!pathResponse.backupPath) {
        Output.showWarning('Backup cancelled - no path provided');
        return;
      }

      const db = await getDatabase();
      await db.backup(pathResponse.backupPath);
      
      Output.showSuccess(`Database backed up successfully to: ${pathResponse.backupPath}`);

    } catch (error) {
      Output.showError(`Backup failed: ${error.message}`);
    }
  }

  async handleClear() {
    Output.showWarning('⚠️  This will permanently delete ALL data in the database!');
    
    const confirmResponse = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: 'Are you absolutely sure you want to clear the database?',
      initial: false
    });

    if (!confirmResponse.confirmed) {
      Output.showInfo('Clear operation cancelled.');
      return;
    }

    const doubleConfirmResponse = await prompts({
      type: 'text',
      name: 'confirmation',
      message: 'Type "CLEAR DATABASE" to confirm:',
      validate: value => value === 'CLEAR DATABASE' ? true : 'Please type exactly "CLEAR DATABASE" to confirm'
    });

    if (doubleConfirmResponse.confirmation !== 'CLEAR DATABASE') {
      Output.showInfo('Clear operation cancelled - confirmation failed.');
      return;
    }

    try {
      await this.migration.clearDatabase();
      Output.showSuccess('Database cleared successfully.');
    } catch (error) {
      Output.showError(`Failed to clear database: ${error.message}`);
    }
  }
}

module.exports = { DatabaseCommand };