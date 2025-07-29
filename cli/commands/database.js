const prompts = require('prompts');
const { Output } = require('../utils/output');
const { getDatabase, closeDatabase } = require('../../src/database/connection');
const ProjectModel = require('../../src/database/models/project');
const ProcessingRunModel = require('../../src/database/models/processing-run');

class DatabaseCommand {
  constructor() {
  }

  async execute() {
    try {
      const action = await this.promptForAction();
      
      switch (action) {
        case 'status':
          await this.showDatabaseStatus();
          break;
        case 'list-projects':
          await this.listProjects();
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
        { title: 'Show database status', value: 'status' },
        { title: 'List all projects', value: 'list-projects' }
      ]
    });

    return response.action;
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

}

module.exports = { DatabaseCommand };