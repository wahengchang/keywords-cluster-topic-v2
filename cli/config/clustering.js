const CLUSTERING_DEFAULTS = {
  kmeans: {
    minClusters: 3,
    maxClusters: 50,  // Increased for larger datasets
    maxIterations: 100,
    tolerance: 0.001,
    initMethod: 'kmeans++'
  },
  semantic: {
    useWordEmbeddings: true,
    semanticWeight: 0.3,
    similarityThreshold: 0.7,
    embeddingDimensions: 100
  },
  quality: {
    minSilhouetteScore: 0.3,
    minCoherenceScore: 0.4,
    minClusterSize: 5,
    requireClusterNames: true
  }
};

const PRIORITY_SCORING_DEFAULTS = {
  weights: {
    searchVolume: 0.35,
    competition: 0.25,
    relevance: 0.25,
    clusterCoherence: 0.15
  },
  thresholds: {
    highPriority: 0.8,
    mediumPriority: 0.5,
    quickWinVolume: 1000,
    quickWinCompetition: 0.3
  }
};

module.exports = {
  CLUSTERING_DEFAULTS,
  PRIORITY_SCORING_DEFAULTS
};
