class PriorityScoringService {
  constructor(config = {}) {
    this.config = config;
  }

  async calculatePriorityScores(keywords, clusters, options = {}) {
    const weights = options.weights || {
      searchVolume: 0.35,
      competition: 0.25,
      relevance: 0.25,
      clusterCoherence: 0.15
    };

    const scores = keywords.map(kw => {
      const cluster = clusters[kw.cluster_id] || {};
      const volumeScore = this.calculateVolumeScore(kw.search_volume);
      const competitionScore = this.calculateCompetitionScore(kw.competition);
      const relevanceScore = this.calculateRelevanceScore(kw.keyword, cluster);
      const clusterScore = cluster.coherence || 0;
      const base = volumeScore * weights.searchVolume +
        competitionScore * weights.competition +
        relevanceScore * weights.relevance +
        clusterScore * weights.clusterCoherence;
      const difficulty = this.calculateDifficultyScore(kw.keyword, kw.competition);
      const finalScore = base * (1 - difficulty);
      const businessValue = this.assessBusinessValue(kw, cluster);
      const opportunity = this.calculateOpportunityScore(kw);
      return {
        ...kw,
        priority_score: finalScore,
        difficulty_score: difficulty,
        business_value_score: businessValue,
        opportunity_score: opportunity
      };
    });

    const ranked = this.rankKeywordsByPriority(scores);
    this.assignPriorityTiers(ranked, options.thresholds);
    return ranked;
  }

  calculateVolumeScore(searchVolume) {
    if (!searchVolume) return 0;
    return Math.log10(searchVolume + 1) / 5; // simple normalization
  }

  calculateCompetitionScore(competition) {
    if (competition === undefined) return 0;
    return 1 - competition; // lower competition is better
  }

  calculateRelevanceScore(keyword, cluster) {
    if (!cluster.name) return 0;
    const words = cluster.name.split(' ');
    let score = 0;
    words.forEach(w => {
      if (keyword.toLowerCase().includes(w)) score += 1;
    });
    return words.length ? score / words.length : 0;
  }

  calculateDifficultyScore(keyword, competition) {
    return competition || 0;
  }

  assessBusinessValue(keyword, cluster) {
    return (keyword.search_volume || 0) * (1 - (keyword.competition || 0));
  }

  calculateOpportunityScore(keyword) {
    const vol = keyword.search_volume || 0;
    const comp = keyword.competition || 0;
    return vol * (1 - comp);
  }

  rankKeywordsByPriority(keywords) {
    return keywords.sort((a, b) => b.priority_score - a.priority_score);
  }

  assignPriorityTiers(keywords, thresholds = { highPriority: 0.8, mediumPriority: 0.5 }) {
    keywords.forEach(kw => {
      if (kw.priority_score >= thresholds.highPriority) {
        kw.priority_tier = 'high';
      } else if (kw.priority_score >= thresholds.mediumPriority) {
        kw.priority_tier = 'medium';
      } else {
        kw.priority_tier = 'low';
      }
    });
  }
}

module.exports = { PriorityScoringService };
