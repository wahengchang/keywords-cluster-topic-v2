const { CommonPrompts } = require('./common');
const { validateProjectType } = require('../utils/validation');

// Project type selection prompts
class ProjectTypePrompts {
  static async selectMethod() {
    return await CommonPrompts.singlePrompt({
      type: 'select',
      name: 'method',
      message: 'Create project by:',
      choices: [
        { title: 'Domain', value: 'Domain' },
        { title: 'URL', value: 'URL' }
      ]
    });
  }

  static async getTarget(method) {
    return await CommonPrompts.singlePrompt({
      type: 'text',
      name: 'value',
      message: `Enter ${method}:`,
      validate: (input) => validateProjectType(method, input)
    });
  }

  static async getProjectDetails() {
    const method = await this.selectMethod();
    if (!method) return null;

    const target = await this.getTarget(method);
    if (!target) return null;

    return { method, target };
  }
}

module.exports = { ProjectTypePrompts };