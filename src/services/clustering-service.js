const { kmeans } = require('ml-kmeans');
const natural = require('natural');
const { Matrix } = require('ml-matrix');
const { CLUSTERING_DEFAULTS } = require('../../cli/config/clustering');

class ClusteringService {
  constructor(config = {}) {
    this.config = { ...CLUSTERING_DEFAULTS, ...config };
  }

  async performAdvancedClustering(keywords, options = {}) {
    if (!keywords || keywords.length === 0) {
      return [];
    }
    
    // Handle single keyword case
    if (keywords.length === 1) {
      return [{
        id: 0,
        name: keywords[0].keyword,
        keywords: keywords,
        embeddings: [],
        center: [],
        silhouette: 1.0,
        coherence: 1.0
      }];
    }

    const { embeddings, vocabulary } = this.generateSemanticEmbeddings(keywords);
    const features = this.buildFeatureMatrix(keywords, embeddings);

    const k = options.clusterCount || await this.optimizeClusterCount(features, this.config.kmeans?.maxClusters);
    
    // Handle case where we need only 1 cluster
    if (k === 1) {
      return [{
        id: 0,
        name: this.generateSimpleClusterName(keywords),
        keywords: keywords,
        embeddings: embeddings,
        center: [],
        silhouette: 1.0,
        coherence: this.analyzeClusterCoherence({ keywords })
      }];
    }
    
    const result = await this.kMeansClustering(features, k);
    const clusters = this.buildClusters(result, keywords, embeddings, vocabulary);
    await this.generateClusterNames(clusters);
    this.assessClusterQuality(clusters, features, result.clusters);
    return clusters;
  }

  buildFeatureMatrix(keywords, embeddings) {
    const semanticWeight = this.config.semantic?.semanticWeight || 0.4;
    const maxSearchVolume = Math.max(...keywords.map(k => k.search_volume || 0));
    const maxCompetition = Math.max(...keywords.map(k => k.competition || 0));
    
    return keywords.map((kw, i) => {
      const semantic = embeddings[i];
      
      // Normalize search volume and competition for better clustering
      const normalizedSearchVol = maxSearchVolume > 0 ? (kw.search_volume || 0) / maxSearchVolume : 0;
      const normalizedCompetition = maxCompetition > 0 ? (kw.competition || 0) / maxCompetition : 0;
      
      // Additional features for better clustering
      const wordCount = kw.keyword.split(' ').length;
      const normalizedWordCount = Math.min(wordCount / 5, 1); // Normalize to 0-1 range
      
      const hasQuestionWords = /\b(what|how|why|when|where|who|which|can|should|will|is|are|does|do)\b/i.test(kw.keyword);
      const questionIndicator = hasQuestionWords ? 1 : 0;
      
      const hasBrandTerms = /\b(buy|purchase|price|cost|deal|sale|discount|cheap|best|top|review)\b/i.test(kw.keyword);
      const commercialIndicator = hasBrandTerms ? 1 : 0;
      
      // Build weighted feature vector
      const features = [
        normalizedSearchVol * (1 - semanticWeight) * 0.4,  // Search volume weight
        normalizedCompetition * (1 - semanticWeight) * 0.3, // Competition weight
        normalizedWordCount * (1 - semanticWeight) * 0.1,   // Word count weight
        questionIndicator * (1 - semanticWeight) * 0.1,     // Question intent weight
        commercialIndicator * (1 - semanticWeight) * 0.1,   // Commercial intent weight
        ...semantic.map(v => v * semanticWeight)             // Semantic embeddings
      ];
      
      return features;
    });
  }

  async kMeansClustering(features, clusterCount) {
    return kmeans(features, clusterCount, {
      initialization: 'kmeans++'
    });
  }

  async optimizeClusterCount(features, maxClusters = null) {
    const dataSize = features.length;
    
    // Use configuration or calculate based on data size with improved scaling
    if (!maxClusters) {
      if (dataSize > 2000) {
        // For very large datasets (3000+ keywords): allow more granular clustering
        maxClusters = Math.min(150, Math.floor(dataSize / 20)); // ~150-400 clusters for 3000-8000 keywords
      } else if (dataSize > 1000) {
        // Large datasets: more granular clustering for better content strategy
        maxClusters = Math.min(80, Math.floor(dataSize / 12)); // ~80+ clusters for 1000-2000 keywords
      } else if (dataSize > 100) {
        maxClusters = Math.min(35, Math.floor(dataSize / 6)); // ~16-35 clusters for 100-1000 keywords
      } else {
        maxClusters = Math.min(15, Math.floor(dataSize / 3)); // ~5-15 clusters for small datasets
      }
    }
    
    const min = Math.max(2, Math.floor(Math.sqrt(dataSize / 100))); // Dynamic minimum based on data size
    const maxPossible = Math.min(maxClusters, features.length - 1);
    
    // If we have too few data points for clustering, return 1
    if (features.length < 2) {
      return 1;
    }
    
    // Use a combined approach: elbow method + silhouette + business logic
    const scores = [];
    let prevInertia = Infinity;
    
    for (let k = min; k <= maxPossible && k <= 50; k++) { // Limit evaluation range for performance
      const res = await this.kMeansClustering(features, k);
      const silhouette = this.calculateSilhouetteScore(features, res.clusters, k);
      const inertia = this.calculateInertia(features, res);
      
      // Calculate elbow score (rate of inertia decrease)
      const elbowScore = prevInertia === Infinity ? 0 : (prevInertia - inertia) / prevInertia;
      prevInertia = inertia;
      
      // Combined score favoring balanced cluster count and quality
      const balanceBonus = k > (dataSize / 150) ? 0.15 : 0; // Bonus for reasonable cluster count
      const granularityBonus = k > (dataSize / 100) ? 0.1 : 0; // Extra bonus for granular clustering
      const combinedScore = (silhouette * 0.5) + (elbowScore * 0.3) + balanceBonus + granularityBonus;
      
      scores.push({ k, silhouette, elbowScore, combinedScore, inertia });
      
      // Early stopping if silhouette score drops significantly and we have enough clusters
      if (k > min + 5 && silhouette < 0.1 && k > dataSize / 150) {
        break;
      }
    }
    
    // Find best k based on combined score, but ensure minimum cluster count for large datasets
    const bestResult = scores.reduce((best, current) => 
      current.combinedScore > best.combinedScore ? current : best
    );
    
    let bestK = bestResult.k;
    
    // Business logic: ensure minimum cluster count for content strategy
    const minClustersForStrategy = Math.max(
      Math.floor(dataSize / 100), // At least 1 cluster per 100 keywords for granular content strategy
      dataSize > 2000 ? 25 : dataSize > 1000 ? 15 : 8 // Minimum clusters based on dataset size
    );
    
    if (dataSize > 500 && bestK < minClustersForStrategy) {
      bestK = Math.min(minClustersForStrategy, maxPossible);
    }
    
    return bestK;
  }

  calculateInertia(features, clusterResult) {
    let inertia = 0;
    clusterResult.clusters.forEach((clusterId, pointIndex) => {
      const point = features[pointIndex];
      const centroid = clusterResult.centroids[clusterId]; // Remove .centroid - it's already the centroid array
      let distance = 0;
      for (let i = 0; i < point.length; i++) {
        distance += Math.pow(point[i] - centroid[i], 2);
      }
      inertia += distance;
    });
    return inertia;
  }

  generateSemanticEmbeddings(keywords) {
    const tokenizer = new natural.WordTokenizer();
    const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    const vocab = new Map();
    let index = 0;
    
    // Enhanced tokenization with stopword filtering and stemming
    const documents = keywords.map(k => {
      let tokens = tokenizer.tokenize(k.keyword.toLowerCase());
      
      // Filter stopwords if enabled in config
      if (this.config.semantic?.useStopwordFiltering) {
        tokens = tokens.filter(t => !stopwords.has(t) && t.length > 2);
      }
      
      // Apply stemming for better semantic grouping
      if (this.config.semantic?.enhancedTokenization) {
        tokens = tokens.map(t => natural.PorterStemmer.stem(t));
      }
      
      tokens.forEach(t => {
        if (!vocab.has(t)) {
          vocab.set(t, index++);
        }
      });
      return tokens;
    });
    
    // Generate TF-IDF weighted embeddings instead of simple term frequency
    const documentFreq = new Map(); // How many documents contain each term
    documents.forEach(tokens => {
      const uniqueTokens = new Set(tokens);
      uniqueTokens.forEach(token => {
        documentFreq.set(token, (documentFreq.get(token) || 0) + 1);
      });
    });
    
    const embeddings = documents.map(tokens => {
      const vector = new Array(vocab.size).fill(0);
      const termFreq = new Map();
      
      // Calculate term frequency for this document
      tokens.forEach(t => {
        termFreq.set(t, (termFreq.get(t) || 0) + 1);
      });
      
      // Apply TF-IDF weighting
      tokens.forEach(t => {
        const i = vocab.get(t);
        const tf = termFreq.get(t) / tokens.length; // Term frequency
        const idf = Math.log(documents.length / (documentFreq.get(t) || 1)); // Inverse document frequency
        vector[i] = tf * idf;
      });
      
      // Normalize vector to unit length for better clustering
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      if (magnitude > 0) {
        for (let i = 0; i < vector.length; i++) {
          vector[i] /= magnitude;
        }
      }
      
      return vector;
    });
    
    return { embeddings, vocabulary: Array.from(vocab.keys()) };
  }

  calculateSemanticSimilarity(a, b) {
    return natural.JaroWinklerDistance(a, b);
  }

  buildClusters(result, keywords, embeddings, vocabulary) {
    const clusters = [];
    result.clusters.forEach((cid, idx) => {
      if (!clusters[cid]) {
        clusters[cid] = { id: cid, keywords: [], embeddings: [], center: result.centroids[cid] };
      }
      clusters[cid].keywords.push(keywords[idx]);
      clusters[cid].embeddings.push(embeddings[idx]);
    });
    return clusters;
  }

  generateSimpleClusterName(keywords) {
    const tokenizer = new natural.WordTokenizer();
    const freq = {};
    keywords.forEach(k => {
      tokenizer.tokenize(k.keyword.toLowerCase()).forEach(t => {
        freq[t] = (freq[t] || 0) + 1;
      });
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 3).map(e => e[0]).join(' ');
  }

  async generateClusterNames(clusters) {
    const tokenizer = new natural.WordTokenizer();
    clusters.forEach(cluster => {
      const freq = {};
      cluster.keywords.forEach(k => {
        tokenizer.tokenize(k.keyword.toLowerCase()).forEach(t => {
          freq[t] = (freq[t] || 0) + 1;
        });
      });
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      cluster.name = sorted.slice(0, 3).map(e => e[0]).join(' ');
    });
  }

  assessClusterQuality(clusters, features, assignments) {
    const silhouette = this.calculateSilhouetteScore(features, assignments, clusters.length);
    clusters.forEach(cluster => {
      cluster.silhouette = silhouette;
      cluster.coherence = this.analyzeClusterCoherence(cluster);
    });
  }

  analyzeClusterCoherence(cluster) {
    if (cluster.keywords.length < 2) return 0;
    let total = 0;
    let count = 0;
    for (let i = 0; i < cluster.keywords.length; i++) {
      for (let j = i + 1; j < cluster.keywords.length; j++) {
        total += this.calculateSemanticSimilarity(cluster.keywords[i].keyword, cluster.keywords[j].keyword);
        count++;
      }
    }
    return count === 0 ? 0 : total / count;
  }

  calculateSilhouetteScore(features, assignments, clusterCount) {
    const n = features.length;
    const distances = (a, b) => {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        sum += d * d;
      }
      return Math.sqrt(sum);
    };

    const clusters = Array.from({ length: clusterCount }, () => []);
    features.forEach((f, i) => {
      clusters[assignments[i]].push(i);
    });

    const s = [];
    for (let i = 0; i < n; i++) {
      if(i%13===0) {
        process.stdout.write(`\rcalculateSilhouetteScore: ${i}/${n}`);
      }
      const ownCluster = assignments[i];
      const a = clusters[ownCluster].reduce((acc, idx) => acc + distances(features[i], features[idx]), 0) / Math.max(clusters[ownCluster].length - 1, 1);
      let b = Infinity;
      for (let c = 0; c < clusterCount; c++) {
        if (c === ownCluster || clusters[c].length === 0) continue;
        const dist = clusters[c].reduce((acc, idx) => acc + distances(features[i], features[idx]), 0) / clusters[c].length;
        if (dist < b) b = dist;
      }
      const score = (b - a) / Math.max(a, b);
      s.push(score);
    }
    const mean = s.reduce((acc, val) => acc + val, 0) / s.length;
    return mean;
  }
}

module.exports = { ClusteringService };
