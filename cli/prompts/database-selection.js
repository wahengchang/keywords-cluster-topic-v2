const { CommonPrompts } = require('./common');
const { COUNTRIES } = require('../config/countries');
const { validateLimit } = require('../utils/validation');

// Database and parameters selection prompts
class DatabasePrompts {
  static async selectDatabase() {
    return await CommonPrompts.singlePrompt({
      type: 'select',
      name: 'database',
      message: 'Select SEMrush database:',
      choices: COUNTRIES,
      initial: 127 // Default to US (index of 'United States (us)')
    });
  }

  static async getLimit() {
    return await CommonPrompts.singlePrompt({
      type: 'number',
      name: 'limit',
      message: 'Number of keywords to fetch:',
      initial: 10000,
      validate: validateLimit
    });
  }

  static async getDatabaseConfig() {
    const configs = [
      {
        type: 'select',
        name: 'database',
        message: 'Select SEMrush database:',
        choices: COUNTRIES,
        initial: 127 // Default to US
      },
      {
        type: 'number',
        name: 'limit',
        message: 'Number of keywords to fetch:',
        initial: 10000,
        validate: validateLimit
      }
    ];

    return await CommonPrompts.multiplePrompts(configs);
  }
}

module.exports = { DatabasePrompts };