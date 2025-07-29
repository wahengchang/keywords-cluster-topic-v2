const chalk = require('chalk');
const { CLIPrompts } = require('../utils/prompts');
const { CLIHeader } = require('../utils/header');
const { MockProcessor } = require('../utils/mockProcess');
const { ProjectTypePrompts } = require('../../../cli/prompts/project-type');
const { DatabasePrompts } = require('../../../cli/prompts/database-selection');

class CreateProjectFlow {
  static async execute(projectType = null) {
    CLIHeader.displayProcessingHeader('Create New Project');
    
    try {
      let projectDetails;
      
      if (projectType === 'domain' || projectType === 'url') {
        projectDetails = await this.getProjectDetailsForType(projectType);
      } else {
        projectDetails = await ProjectTypePrompts.getProjectDetails();
      }
      
      if (!projectDetails) {
        CLIHeader.displayError('Project creation cancelled');
        return false;
      }

      const databaseConfig = await DatabasePrompts.getDatabaseConfig();
      if (!databaseConfig) {
        CLIHeader.displayError('Database configuration cancelled');
        return false;
      }

      const processingParams = {
        method: projectDetails.method,
        target: projectDetails.target,
        database: databaseConfig.database,
        limit: databaseConfig.limit
      };

      console.log();
      console.log(chalk.yellow('📋 Project Summary:'));
      console.log(chalk.gray('━'.repeat(30)));
      console.log(chalk.cyan(`Method: ${processingParams.method}`));
      console.log(chalk.cyan(`Target: ${processingParams.target}`));
      console.log(chalk.cyan(`Database: ${processingParams.database}`));
      console.log(chalk.cyan(`Keywords Limit: ${processingParams.limit}`));
      console.log();

      const confirm = await CLIPrompts.confirm('Proceed with project creation?', true);
      if (!confirm) {
        CLIHeader.displayInfo('Project creation cancelled');
        return false;
      }

      CLIHeader.displayProcessingHeader(processingParams.target);
      
      const results = await MockProcessor.process(processingParams);
      
      MockProcessor.displayResults(results);
      CLIHeader.displaySuccess(`Project created successfully for ${processingParams.target}!`);
      
      await CLIPrompts.continuePrompt();
      return true;
      
    } catch (error) {
      CLIHeader.displayError(`Project creation failed: ${error.message}`);
      await CLIPrompts.continuePrompt();
      return false;
    }
  }

  static async getProjectDetailsForType(type) {
    const method = type === 'domain' ? 'Domain' : 'URL';
    const target = await ProjectTypePrompts.getTarget(method);
    
    if (!target) return null;
    
    return { method, target };
  }

  static async executeSubfolderProject() {
    CLIHeader.displayProcessingHeader('Create Subfolder Project');
    
    const parentDomain = await CLIPrompts.textInput(
      'Enter parent domain:',
      '',
      (input) => {
        if (!input || input.trim().length === 0) {
          return 'Domain is required';
        }
        if (!input.includes('.')) {
          return 'Please enter a valid domain';
        }
        return true;
      }
    );

    if (!parentDomain) return false;

    const subfolder = await CLIPrompts.textInput(
      'Enter subfolder path (e.g., /blog, /products):',
      '/',
      (input) => {
        if (!input || input.trim().length === 0) {
          return 'Subfolder path is required';
        }
        if (!input.startsWith('/')) {
          return 'Subfolder path must start with /';
        }
        return true;
      }
    );

    if (!subfolder) return false;

    const target = parentDomain + subfolder;
    
    const databaseConfig = await DatabasePrompts.getDatabaseConfig();
    if (!databaseConfig) return false;

    const processingParams = {
      method: 'Subfolder',
      target,
      database: databaseConfig.database,
      limit: databaseConfig.limit
    };

    console.log();
    console.log(chalk.yellow('📋 Subfolder Project Summary:'));
    console.log(chalk.gray('━'.repeat(35)));
    console.log(chalk.cyan(`Parent Domain: ${parentDomain}`));
    console.log(chalk.cyan(`Subfolder: ${subfolder}`));
    console.log(chalk.cyan(`Full Target: ${target}`));
    console.log(chalk.cyan(`Database: ${processingParams.database}`));
    console.log(chalk.cyan(`Keywords Limit: ${processingParams.limit}`));
    console.log();

    const confirm = await CLIPrompts.confirm('Proceed with subfolder project creation?', true);
    if (!confirm) return false;

    try {
      CLIHeader.displayProcessingHeader(target);
      const results = await MockProcessor.process(processingParams);
      MockProcessor.displayResults(results);
      CLIHeader.displaySuccess(`Subfolder project created successfully for ${target}!`);
      await CLIPrompts.continuePrompt();
      return true;
    } catch (error) {
      CLIHeader.displayError(`Subfolder project creation failed: ${error.message}`);
      await CLIPrompts.continuePrompt();
      return false;
    }
  }
}

module.exports = { CreateProjectFlow };