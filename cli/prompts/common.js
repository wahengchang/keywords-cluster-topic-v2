const prompts = require('prompts');

// Common prompt utilities
class CommonPrompts {
  static async cancelOnExit(response, key) {
    if (!response[key]) {
      return null;
    }
    return response[key];
  }

  static async singlePrompt(config) {
    const response = await prompts(config);
    return this.cancelOnExit(response, config.name);
  }

  static async multiplePrompts(configs) {
    const response = await prompts(configs);
    
    // Check if any required field is missing (user cancelled)
    for (const config of configs) {
      if (!response[config.name]) {
        return null;
      }
    }
    
    return response;
  }
}

module.exports = { CommonPrompts };