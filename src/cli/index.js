#!/usr/bin/env node

const chalk = require('chalk');
const { CLIHeader } = require('./utils/header');
const { CLIPrompts } = require('./utils/prompts');
const { MainMenu } = require('./menus/main');
const { CreateProjectFlow } = require('./flows/createProject');

class KeywordsClusterCLI {
  constructor() {
    this.running = true;
  }

  async start() {
    try {
      this.displayWelcome();
      
      while (this.running) {
        await this.showMainMenu();
      }
      
    } catch (error) {
      CLIHeader.displayError(`CLI Error: ${error.message}`);
      process.exit(1);
    }
  }

  displayWelcome() {
    console.clear();
    CLIHeader.display();
    CLIHeader.displayWelcome();
  }

  async showMainMenu() {
    const selection = await MainMenu.show();
    
    switch (selection) {
      case 'create':
        await this.handleCreateProject();
        break;
        
      case 'list':
        await this.handleListProjects();
        break;
        
      case 'process':
        await this.handleProcessProject();
        break;
        
      case 'duplicate':
        await this.handleDuplicateProject();
        break;
        
      case 'database':
        await this.handleDatabaseManagement();
        break;
        
      case 'settings':
        await this.handleSettings();
        break;
        
      case 'exit':
        this.handleExit();
        break;
        
      default:
        CLIHeader.displayError('Invalid selection');
        await CLIPrompts.continuePrompt();
    }
  }

  async handleCreateProject() {
    const projectType = await MainMenu.showCreateProjectMenu();
    
    switch (projectType) {
      case 'domain':
        await CreateProjectFlow.execute('domain');
        break;
        
      case 'url':
        await CreateProjectFlow.execute('url');
        break;
        
      case 'subfolder':
        await CreateProjectFlow.executeSubfolderProject();
        break;
        
      case 'back':
        return;
        
      default:
        CLIHeader.displayError('Invalid project type');
        await CLIPrompts.continuePrompt();
    }
  }

  async handleListProjects() {
    const listType = await MainMenu.showListProjectsMenu();
    
    switch (listType) {
      case 'all':
        await this.showAllProjects();
        break;
        
      case 'active':
        await this.showActiveProjects();
        break;
        
      case 'archived':
        await this.showArchivedProjects();
        break;
        
      case 'search':
        await this.searchProjects();
        break;
        
      case 'back':
        return;
        
      default:
        CLIHeader.displayError('Invalid list type');
        await CLIPrompts.continuePrompt();
    }
  }

  async handleProcessProject() {
    const processType = await MainMenu.showProcessProjectMenu();
    
    switch (processType) {
      case 'initial':
        await this.runInitialProcessing();
        break;
        
      case 'update':
        await this.updateProjectData();
        break;
        
      case 'generate':
        await this.generateMoreContent();
        break;
        
      case 'back':
        return;
        
      default:
        CLIHeader.displayError('Invalid process type');
        await CLIPrompts.continuePrompt();
    }
  }

  async handleDatabaseManagement() {
    const dbAction = await MainMenu.showDatabaseMenu();
    
    switch (dbAction) {
      case 'status':
        await this.showDatabaseStatus();
        break;
        
      case 'list':
        await this.listDatabaseProjects();
        break;
        
      case 'backup':
        await this.backupDatabase();
        break;
        
      case 'migrate':
        await this.migrateCSVFiles();
        break;
        
      case 'export':
        await this.exportProjectToCSV();
        break;
        
      case 'clear':
        await this.clearDatabase();
        break;
        
      case 'back':
        return;
        
      default:
        CLIHeader.displayError('Invalid database action');
        await CLIPrompts.continuePrompt();
    }
  }

  async handleSettings() {
    const settingAction = await MainMenu.showSettingsMenu();
    
    switch (settingAction) {
      case 'api':
        await this.configureAPIKeys();
        break;
        
      case 'database':
        await this.setDefaultDatabase();
        break;
        
      case 'output':
        await this.setOutputDirectory();
        break;
        
      case 'limits':
        await this.setDefaultLimits();
        break;
        
      case 'view':
        await this.viewCurrentSettings();
        break;
        
      case 'back':
        return;
        
      default:
        CLIHeader.displayError('Invalid setting action');
        await CLIPrompts.continuePrompt();
    }
  }

  handleExit() {
    this.running = false;
    MainMenu.displayGoodbye();
  }

  async showAllProjects() {
    CLIHeader.displayInfo('Feature coming soon: List all projects');
    await CLIPrompts.continuePrompt();
  }

  async showActiveProjects() {
    CLIHeader.displayInfo('Feature coming soon: List active projects');
    await CLIPrompts.continuePrompt();
  }

  async showArchivedProjects() {
    CLIHeader.displayInfo('Feature coming soon: List archived projects');
    await CLIPrompts.continuePrompt();
  }

  async searchProjects() {
    CLIHeader.displayInfo('Feature coming soon: Search projects');
    await CLIPrompts.continuePrompt();
  }

  async runInitialProcessing() {
    CLIHeader.displayInfo('Feature coming soon: Initial processing');
    await CLIPrompts.continuePrompt();
  }

  async updateProjectData() {
    CLIHeader.displayInfo('Feature coming soon: Update project data');
    await CLIPrompts.continuePrompt();
  }

  async generateMoreContent() {
    CLIHeader.displayInfo('Feature coming soon: Generate more content');
    await CLIPrompts.continuePrompt();
  }

  async handleDuplicateProject() {
    CLIHeader.displayInfo('Feature coming soon: Duplicate project');
    await CLIPrompts.continuePrompt();
  }

  async showDatabaseStatus() {
    CLIHeader.displayInfo('Feature coming soon: Database status');
    await CLIPrompts.continuePrompt();
  }

  async listDatabaseProjects() {
    CLIHeader.displayInfo('Feature coming soon: List database projects');
    await CLIPrompts.continuePrompt();
  }

  async backupDatabase() {
    CLIHeader.displayInfo('Feature coming soon: Backup database');
    await CLIPrompts.continuePrompt();
  }

  async migrateCSVFiles() {
    CLIHeader.displayInfo('Feature coming soon: Migrate CSV files');
    await CLIPrompts.continuePrompt();
  }

  async exportProjectToCSV() {
    CLIHeader.displayInfo('Feature coming soon: Export project to CSV');
    await CLIPrompts.continuePrompt();
  }

  async clearDatabase() {
    CLIHeader.displayInfo('Feature coming soon: Clear database');
    await CLIPrompts.continuePrompt();
  }

  async configureAPIKeys() {
    CLIHeader.displayInfo('Feature coming soon: Configure API keys');
    await CLIPrompts.continuePrompt();
  }

  async setDefaultDatabase() {
    CLIHeader.displayInfo('Feature coming soon: Set default database');
    await CLIPrompts.continuePrompt();
  }

  async setOutputDirectory() {
    CLIHeader.displayInfo('Feature coming soon: Set output directory');
    await CLIPrompts.continuePrompt();
  }

  async setDefaultLimits() {
    CLIHeader.displayInfo('Feature coming soon: Set default limits');
    await CLIPrompts.continuePrompt();
  }

  async viewCurrentSettings() {
    CLIHeader.displayInfo('Feature coming soon: View current settings');
    await CLIPrompts.continuePrompt();
  }
}

if (require.main === module) {
  const cli = new KeywordsClusterCLI();
  cli.start().catch(error => {
    console.error(chalk.red('Fatal error:', error.message));
    process.exit(1);
  });
}

module.exports = { KeywordsClusterCLI };