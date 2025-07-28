#!/usr/bin/env node

const { FetchCommand } = require('./commands/fetch');
const { Output } = require('./utils/output');

async function main() {
  Output.showHeader();
  
  const fetchCommand = new FetchCommand();
  await fetchCommand.execute();
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