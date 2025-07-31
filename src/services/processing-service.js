const DataCleaningService = require('./data-cleaning-service');
const DeduplicationService = require('./deduplication-service');
const { ClusteringService } = require('./clustering-service');
const { PriorityScoringService } = require('./priority-scoring-service');

class ProcessingService {
  constructor(config = {}) {
    this.cleaner = new DataCleaningService();
    this.deduper = new DeduplicationService();
    this.clusterer = new ClusteringService(config.clustering || {});
    this.scorer = new PriorityScoringService(config.scoring || {});
  }

  async run(rawKeywords, options = {}) {
    const cleaned = await this.cleaner.cleanKeywords(rawKeywords, options.cleaning);
    const { unique } = await this.deduper.deduplicateKeywords(cleaned, options.deduplication);
    const clusters = await this.clusterer.performAdvancedClustering(unique, options.clustering);
    clusters.forEach((cluster, cid) => {
      cluster.keywords.forEach(k => {
        k.cluster_id = cid;
        k.cluster_name = cluster.name;
      });
    });
    const scored = await this.scorer.calculatePriorityScores(unique, clusters, options.scoring);
    return { keywords: scored, clusters };
  }
}

module.exports = ProcessingService;
