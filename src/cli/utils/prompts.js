const prompts = require('prompts');
const chalk = require('chalk');

class CLIPrompts {
  static async singlePrompt(config) {
    try {
      const response = await prompts(config, {
        onCancel: () => {
          console.log(chalk.yellow('\n👋 Operation cancelled by user'));
          process.exit(0);
        }
      });
      return response[config.name];
    } catch (error) {
      console.log(chalk.red('❌ Prompt error:', error.message));
      return null;
    }
  }

  static async multiplePrompts(configs) {
    try {
      const responses = await prompts(configs, {
        onCancel: () => {
          console.log(chalk.yellow('\n👋 Operation cancelled by user'));
          process.exit(0);
        }
      });
      return responses;
    } catch (error) {
      console.log(chalk.red('❌ Prompt error:', error.message));
      return null;
    }
  }

  static async confirm(message, initial = false) {
    return await this.singlePrompt({
      type: 'confirm',
      name: 'confirmed',
      message,
      initial
    });
  }

  static async selectFromList(message, choices, initial = 0) {
    return await this.singlePrompt({
      type: 'select',
      name: 'selection',
      message,
      choices,
      initial
    });
  }

  static async textInput(message, initial = '', validate = null) {
    return await this.singlePrompt({
      type: 'text',
      name: 'input',
      message,
      initial,
      validate
    });
  }

  static async numberInput(message, initial = 0, validate = null) {
    return await this.singlePrompt({
      type: 'number',
      name: 'number',
      message,
      initial,
      validate
    });
  }

  static async multiSelect(message, choices) {
    return await this.singlePrompt({
      type: 'multiselect',
      name: 'selections',
      message,
      choices
    });
  }

  static async continuePrompt(message = 'Press Enter to continue...') {
    await this.singlePrompt({
      type: 'invisible',
      name: 'continue',
      message: chalk.gray(message)
    });
  }
}

module.exports = { CLIPrompts };