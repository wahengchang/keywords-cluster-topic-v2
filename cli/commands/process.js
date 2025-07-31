const prompts = require('prompts');
const { Output } = require('../utils/output');
const { getDatabase, closeDatabase } = require('../../src/database/connection');
const ProjectModel = require('../../src/database/models/project');
const RawKeywordModel = require('../../src/database/models/raw-keyword');
const KeywordModel = require('../../src/database/models/keyword');
const DataCleaningService = require('../../src/services/data-cleaning-service');
const DeduplicationService = require('../../src/services/deduplication-service');
const ProcessingService = require('../../src/services/processing-service');

class ProcessCommand {
  constructor() {
    this.cleaner = new DataCleaningService();
    this.deduper = new DeduplicationService();
    this.pipeline = new ProcessingService();
  }

  async execute() {
    const action = await prompts({
      type: 'select',
      name: 'action',
      message: 'Select processing type:',
      choices: [
        { title: 'Clean Raw Data', value: 'clean' },
        { title: 'Remove Duplicates', value: 'dedupe' },
        { title: 'Full Data Processing', value: 'full' }
      ]
    });

    if (!action.action) {
      Output.showInfo('No action selected.');
      return;
    }

    const { project, db } = await this.selectProject();
    if (!project) {
      Output.showCancellation();
      return;
    }

    try {
      const rawModel = new RawKeywordModel(db);
      const keywordModel = new KeywordModel(db);
      const rawKeywords = rawModel.getByProject(project.id);
      if (rawKeywords.length === 0) {
        Output.showInfo('No raw keywords found.');
        return;
      }
      let cleaned = rawKeywords;
      if (action.action === 'clean') {
        Output.showProgress('Cleaning keywords');
        cleaned = await this.cleaner.cleanKeywords(rawKeywords, {});
        cleaned.forEach(k => keywordModel.createFromRaw(k, { cleaned_keyword: k.cleaned_keyword }));
      }
      if (action.action === 'dedupe') {
        Output.showProgress('Deduplicating keywords');
        const result = await this.deduper.deduplicateKeywords(cleaned);
        Output.showInfo(`Unique keywords: ${result.unique.length}`);
        Output.showInfo(`Similar groups: ${result.similarGroups.length}`);
      }

      if (action.action === 'full') {
        Output.showProgress('Running full pipeline');
        const result = await this.pipeline.run(rawKeywords, { clustering: { clusterCount: 3 } });
        Output.showInfo(`Clusters created: ${result.clusters.length}`);
        Output.showInfo(`Keywords scored: ${result.keywords.length}`);
      }
    } finally {
      closeDatabase();
    }
  }

  async selectProject() {
    const db = await getDatabase();
    const projectModel = new ProjectModel(db);
    const projects = projectModel.findActive();
    const choices = projects.map(p => ({ title: p.name, value: p.id }));
    if (choices.length === 0) {
      Output.showInfo('No projects available');
      return { project: null, db };
    }
    const res = await prompts({
      type: 'select',
      name: 'projectId',
      message: 'Select project:',
      choices
    });
    const project = projectModel.findById(res.projectId);
    return { project, db };
  }
}

module.exports = { ProcessCommand };
