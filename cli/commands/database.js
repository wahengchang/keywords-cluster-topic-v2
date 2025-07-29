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
        case 'remove-project':
          await this.removeSelectedProject();
          break;
        case 'clear-all':
          await this.clearEntireDatabase();
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
        { title: 'List all projects', value: 'list-projects' },
        { title: '⚠️  Remove selected project', value: 'remove-project' },
        { title: '🚨 Clear entire database', value: 'clear-all' }
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

  async removeSelectedProject() {
    try {
      const db = await getDatabase();
      const projectModel = new ProjectModel(db);
      const projects = projectModel.findActive();
      
      if (projects.length === 0) {
        Output.showInfo('No projects found to remove.');
        return;
      }

      // Show projects with details
      const choices = projects.map(p => {
        const stats = projectModel.getProjectStats(p.id);
        const target = p.domain || p.url || 'Unknown';
        return {
          title: `${p.name} (${p.project_type}: ${target}) - ${stats.totalKeywords} keywords`,
          value: p
        };
      });

      const projectResponse = await prompts({
        type: 'select',
        name: 'project',
        message: 'Select project to remove:',
        choices
      });

      if (!projectResponse.project) {
        Output.showInfo('No project selected.');
        return;
      }

      const selectedProject = projectResponse.project;
      const stats = projectModel.getProjectStats(selectedProject.id);

      // Safety confirmation
      Output.showInfo(`\n⚠️  WARNING: This will permanently delete:`);
      Output.showInfo(`   • Project: ${selectedProject.name}`);
      Output.showInfo(`   • Target: ${selectedProject.domain || selectedProject.url}`);
      Output.showInfo(`   • Keywords: ${stats.totalKeywords}`);
      Output.showInfo(`   • Processing runs: ${stats.totalRuns}`);
      Output.showInfo(`   • All related data will be lost forever!\n`);

      const confirmResponse = await prompts({
        type: 'text',
        name: 'confirmation',
        message: `Type "DELETE ${selectedProject.name}" to confirm removal:`,
        validate: (input) => {
          if (input === `DELETE ${selectedProject.name}`) {
            return true;
          }
          return 'Please type the exact confirmation text';
        }
      });

      if (!confirmResponse.confirmation) {
        Output.showInfo('Project removal cancelled.');
        return;
      }

      // Perform deletion
      Output.showProgress('Removing project and all related data');
      projectModel.deleteProjectCompletely(selectedProject.id);
      
      Output.showSuccess(`Project "${selectedProject.name}" has been permanently deleted.`);
      Output.showInfo(`Freed database space from ${stats.totalKeywords} keywords and ${stats.totalRuns} processing runs.`);

    } catch (error) {
      Output.showError(`Failed to remove project: ${error.message}`);
    }
  }

  async clearEntireDatabase() {
    try {
      const db = await getDatabase();
      const projectModel = new ProjectModel(db);
      
      // Get current stats
      const totalProjects = projectModel.count();
      const allProjects = projectModel.findAll();
      let totalKeywords = 0;
      let totalRuns = 0;
      
      for (const project of allProjects) {
        const stats = projectModel.getProjectStats(project.id);
        totalKeywords += stats.totalKeywords;
        totalRuns += stats.totalRuns;
      }

      if (totalProjects === 0) {
        Output.showInfo('Database is already empty.');
        return;
      }

      // Show what will be deleted
      Output.showInfo(`\n🚨 DANGER: This will permanently delete EVERYTHING:`);
      Output.showInfo(`   • ${totalProjects} projects`);
      Output.showInfo(`   • ${totalKeywords} keywords`);
      Output.showInfo(`   • ${totalRuns} processing runs`);
      Output.showInfo(`   • All generated content`);
      Output.showInfo(`   • All processing logs`);
      Output.showInfo(`   • All API usage data`);
      Output.showInfo(`   • This action CANNOT be undone!\n`);

      // Double confirmation
      const warningResponse = await prompts({
        type: 'confirm',
        name: 'understood',
        message: 'Do you understand this will delete ALL data permanently?',
        initial: false
      });

      if (!warningResponse.understood) {
        Output.showInfo('Database clear cancelled.');
        return;
      }

      const confirmResponse = await prompts({
        type: 'text',
        name: 'confirmation',
        message: 'Type "CLEAR ALL DATABASE" to confirm complete deletion:',
        validate: (input) => {
          if (input === 'CLEAR ALL DATABASE') {
            return true;
          }
          return 'Please type the exact confirmation text';
        }
      });

      if (!confirmResponse.confirmation) {
        Output.showInfo('Database clear cancelled.');
        return;
      }

      // Final confirmation
      const finalResponse = await prompts({
        type: 'confirm',
        name: 'final',
        message: 'This is your LAST CHANCE. Are you absolutely sure?',
        initial: false
      });

      if (!finalResponse.final) {
        Output.showInfo('Database clear cancelled.');
        return;
      }

      // Perform complete database clear
      Output.showProgress('Clearing entire database');
      projectModel.clearAllProjects();
      
      Output.showSuccess('Database has been completely cleared.');
      Output.showInfo(`Removed ${totalProjects} projects, ${totalKeywords} keywords, and all related data.`);
      Output.showInfo('Database is now empty and ready for new projects.');

    } catch (error) {
      Output.showError(`Failed to clear database: ${error.message}`);
    }
  }

}

module.exports = { DatabaseCommand };