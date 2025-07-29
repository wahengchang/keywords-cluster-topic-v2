#!/usr/bin/env node

const { FetchCommand } = require('./commands/fetch');
const { DatabaseCommand } = require('./commands/database');
const { Output } = require('./utils/output');
const prompts = require('prompts');

async function main() {
  Output.showHeader();
  
  // Check if database command is requested via CLI args
  const args = process.argv.slice(2);
  if (args.includes('--database') || args.includes('--db')) {
    const databaseCommand = new DatabaseCommand();
    await databaseCommand.execute();
    return;
  }
  
  // Show main menu
  const response = await prompts({
    type: 'select',
    name: 'command',
    message: 'What would you like to do?',
    choices: [
      { title: 'Fetch Keywords (Original)', value: 'fetch' },
      { title: 'Database Management', value: 'database' }
    ]
  });

  switch (response.command) {
    case 'fetch':
      const fetchCommand = new FetchCommand();
      await fetchCommand.execute();
      break;
    case 'database':
      const databaseCommand = new DatabaseCommand();
      await databaseCommand.execute();
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