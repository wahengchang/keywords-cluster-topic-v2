const chalk = require('chalk');

class CLIHeader {
  static display() {
    console.log();
    console.log(chalk.blue.bold('██╗  ██╗███████╗██╗   ██╗██╗    ██╗ ██████╗ ██████╗ ██████╗ '));
    console.log(chalk.blue.bold('██║ ██╔╝██╔════╝╚██╗ ██╔╝██║    ██║██╔═══██╗██╔══██╗██╔══██╗'));
    console.log(chalk.blue.bold('█████╔╝ █████╗   ╚████╔╝ ██║ █╗ ██║██║   ██║██████╔╝██║  ██║'));
    console.log(chalk.blue.bold('██╔═██╗ ██╔══╝    ╚██╔╝  ██║███╗██║██║   ██║██╔══██╗██║  ██║'));
    console.log(chalk.blue.bold('██║  ██╗███████╗   ██║   ╚███╔███╔╝╚██████╔╝██║  ██║██████╔╝'));
    console.log(chalk.blue.bold('╚═╝  ╚═╝╚══════╝   ╚═╝    ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝ '));
    console.log();
    console.log(chalk.cyan.bold('    Keywords Cluster Topic Tool - Interactive CLI'));
    console.log(chalk.gray('    Keyword clustering and topic analysis with SEMrush integration'));
    console.log();
  }

  static displayWelcome() {
    console.log(chalk.green('Welcome to Keywords Cluster Topic Tool!'));
    console.log(chalk.gray('Use arrow keys to navigate, Enter to select, Ctrl+C to exit'));
    console.log();
  }

  static displayProcessingHeader(target) {
    console.log();
    console.log(chalk.yellow.bold(`🚀 Processing: ${target}`));
    console.log(chalk.gray('━'.repeat(50)));
    console.log();
  }

  static displaySuccess(message) {
    console.log();
    console.log(chalk.green.bold('✅ ' + message));
    console.log();
  }

  static displayError(message) {
    console.log();
    console.log(chalk.red.bold('❌ ' + message));
    console.log();
  }

  static displayInfo(message) {
    console.log(chalk.blue('ℹ️  ' + message));
  }
}

module.exports = { CLIHeader };