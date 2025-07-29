const chalk = require('chalk');
const { CLIPrompts } = require('../utils/prompts');
const { CLIHeader } = require('../utils/header');

class MainMenu {
  static async show() {
    const choices = [
      { title: '🆕 Create Project', value: 'create' },
      { title: '📋 List Projects', value: 'list' },
      { title: '📊 Process Project', value: 'process' },
      { title: '📑 Duplicate Project', value: 'duplicate' },
      { title: '🗄️  Database Management', value: 'database' },
      { title: '⚙️  Settings', value: 'settings' },
      { title: '❌ Exit', value: 'exit' }
    ];

    const selection = await CLIPrompts.selectFromList(
      'What would you like to do?',
      choices
    );

    return selection;
  }

  static async showCreateProjectMenu() {
    const choices = [
      { title: '🌐 Domain Project', value: 'domain' },
      { title: '🔗 URL Project', value: 'url' },
      { title: '📁 Subfolder Project', value: 'subfolder' },
      { title: '⬅️  Back to Main Menu', value: 'back' }
    ];

    const selection = await CLIPrompts.selectFromList(
      'Select project type:',
      choices
    );

    return selection;
  }

  static async showListProjectsMenu() {
    const choices = [
      { title: '📊 All Projects', value: 'all' },
      { title: '✅ Active Projects', value: 'active' },
      { title: '📦 Archived Projects', value: 'archived' },
      { title: '🔍 Search Projects', value: 'search' },
      { title: '⬅️  Back to Main Menu', value: 'back' }
    ];

    const selection = await CLIPrompts.selectFromList(
      'What projects would you like to see?',
      choices
    );

    return selection;
  }

  static async showProcessProjectMenu() {
    const choices = [
      { title: '🚀 Initial Processing', value: 'initial' },
      { title: '🔄 Update Data (Rescrape)', value: 'update' },
      { title: '📝 Generate More Content', value: 'generate' },
      { title: '⬅️  Back to Main Menu', value: 'back' }
    ];

    const selection = await CLIPrompts.selectFromList(
      'Select processing type:',
      choices
    );

    return selection;
  }

  static async showDatabaseMenu() {
    const choices = [
      { title: '📊 Show Database Status', value: 'status' },
      { title: '📋 List All Projects', value: 'list' },
      { title: '💾 Backup Database', value: 'backup' },
      { title: '🔄 Migrate CSV Files', value: 'migrate' },
      { title: '📤 Export Project to CSV', value: 'export' },
      { title: '🗑️  Clear Database (Dangerous)', value: 'clear' },
      { title: '⬅️  Back to Main Menu', value: 'back' }
    ];

    const selection = await CLIPrompts.selectFromList(
      'Database Management:',
      choices
    );

    return selection;
  }

  static async showSettingsMenu() {
    const choices = [
      { title: '🔧 Configure API Keys', value: 'api' },
      { title: '🌍 Set Default Database', value: 'database' },
      { title: '📂 Set Output Directory', value: 'output' },
      { title: '🔢 Set Default Limits', value: 'limits' },
      { title: '👀 View Current Settings', value: 'view' },
      { title: '⬅️  Back to Main Menu', value: 'back' }
    ];

    const selection = await CLIPrompts.selectFromList(
      'Settings:',
      choices
    );

    return selection;
  }

  static displayGoodbye() {
    console.log();
    console.log(chalk.cyan('👋 Thank you for using Keywords Cluster Topic Tool!'));
    console.log(chalk.gray('Have a great day! 🌟'));
    console.log();
  }
}

module.exports = { MainMenu };