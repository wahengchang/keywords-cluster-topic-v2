#!/usr/bin/env node

const { CreateCommand } = require('./commands/create');
const { RescrapeCommand } = require('./commands/rescrape');
const { DatabaseCommand } = require('./commands/database');
const { WriteMoreCommand } = require('./commands/writemore');
const { Output } = require('./utils/output');
const prompts = require('prompts');

async function main() {
  Output.showHeader();
  
  // Show main menu
  const response = await prompts({
    type: 'select',
    name: 'command',
    message: 'What would you like to do?',
    choices: [
      { title: 'Create New Project (Domain/Subfolder)', value: 'create' },
      { title: 'Rescrape Existing Project', value: 'rescrape' },
      { title: 'Database Management', value: 'database' },
      { title: 'Generate More Content', value: 'writemore' },
      { title: 'Cross-Project Analysis (Coming Soon)', value: 'analyze', disabled: true }
    ]
  });

  switch (response.command) {
    case 'create':
      const createCommand = new CreateCommand();
      await createCommand.execute();
      break;
    case 'rescrape':
      const rescrapeCommand = new RescrapeCommand();
      await rescrapeCommand.execute();
      break;
    case 'database':
      const databaseCommand = new DatabaseCommand();
      await databaseCommand.execute();
      break;
    case 'writemore':
      const writeMoreCommand = new WriteMoreCommand();
      await writeMoreCommand.execute();
      break;
    case 'analyze':
      Output.showInfo('This feature is coming soon!');
      break;
    default:
      Output.showInfo('No command selected. Exiting...');
  }
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  Output.showGoodbye();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  Output.showError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  Output.showError(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { main };