const CLUSTERING_DEFAULTS = {
  kmeans: {
    minClusters: 3,
    maxClusters: 100,  // Increased for very large datasets (3000+ keywords)
    maxIterations: 150, // Increased for better convergence
    tolerance: 0.0005,  // Tighter tolerance for better clusters
    initMethod: 'kmeans++'
  },
  semantic: {
    useWordEmbeddings: true,
    semanticWeight: 0.4,    // Increased weight for semantic similarity
    similarityThreshold: 0.6, // Lowered threshold for more nuanced grouping
    embeddingDimensions: 150,  // Increased dimensions for better representation
    useStopwordFiltering: true,
    enhancedTokenization: true
  },
  quality: {
    minSilhouetteScore: 0.2,  // Lowered to allow more clusters
    minCoherenceScore: 0.3,   // Lowered for more granular clustering
    minClusterSize: 3,        // Smaller minimum for more granular clusters
    requireClusterNames: true,
    balanceClusterSizes: true,
    preferSemanticCoherence: true
  },
  optimization: {
    useElbowMethod: true,
    combinedScoring: true,
    businessLogicMinimum: true,  // Ensure minimum clusters for content strategy
    performanceLimit: 50,       // Limit cluster evaluation for performance
    earlyStoppingThreshold: 0.1
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
