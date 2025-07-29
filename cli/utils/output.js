const chalk = require('chalk');

class Output {
  static showHeader() {
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

  static showWelcome() {
    console.log(chalk.green('Welcome to Keywords Cluster Topic Tool!'));
    console.log(chalk.gray('Use arrow keys to navigate, Enter to select, Ctrl+C to exit'));
    console.log();
  }

  static showProcessingHeader(target) {
    console.log();
    console.log(chalk.yellow.bold(`🚀 Processing: ${target}`));
    console.log(chalk.gray('━'.repeat(50)));
    console.log();
  }

  static showProgress(message) {
    console.log(`\n🚀 ${message}...`);
  }

  static showSuccess(message) {
    console.log(`✅ ${message}`);
  }

  static showError(message) {
    console.error(`❌ Error: ${message}`);
  }

  static showInfo(message) {
    console.log(`💡 ${message}`);
  }

  static showSummary(data) {
    console.log('\n📊 Summary:');
    Object.entries(data).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }

  static showCancellation() {
    console.log('Operation cancelled');
  }

  static showGoodbye() {
    console.log('\n👋 Goodbye!');
  }
}

module.exports = { Output };