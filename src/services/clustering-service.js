const { kmeans } = require('ml-kmeans');
const natural = require('natural');
const { Matrix } = require('ml-matrix');

class ClusteringService {
  constructor(config = {}) {
    this.config = config;
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

    const k = options.clusterCount || await this.optimizeClusterCount(features);
    
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
    return keywords.map((kw, i) => {
      const semantic = embeddings[i];
      const searchVol = kw.search_volume || 0;
      const competition = kw.competition || 0;
      const weighted = [
        searchVol * 0.4,
        competition * 0.3,
        ...semantic.map(v => v * 0.3)
      ];
      return weighted;
    });
  }

  async kMeansClustering(features, clusterCount) {
    return kmeans(features, clusterCount, {
      initialization: 'kmeans++'
    });
  }

  async optimizeClusterCount(features, maxClusters = 10) {
    const min = 2;
    const maxPossible = Math.min(maxClusters, features.length - 1);
    
    // If we have too few data points for clustering, return 1
    if (features.length < min) {
      return 1;
    }
    
    let bestScore = -1;
    let bestK = min;
    for (let k = min; k <= maxPossible; k++) {
      const res = await this.kMeansClustering(features, k);
      const score = this.calculateSilhouetteScore(features, res.clusters, k);
      if (score > bestScore) {
        bestScore = score;
        bestK = k;
      }
    }
    return bestK;
  }

  generateSemanticEmbeddings(keywords) {
    const tokenizer = new natural.WordTokenizer();
    const vocab = new Map();
    let index = 0;
    const documents = keywords.map(k => {
      const tokens = tokenizer.tokenize(k.keyword.toLowerCase());
      tokens.forEach(t => {
        if (!vocab.has(t)) {
          vocab.set(t, index++);
        }
      });
      return tokens;
    });
    const embeddings = documents.map(tokens => {
      const vector = new Array(vocab.size).fill(0);
      tokens.forEach(t => {
        const i = vocab.get(t);
        vector[i] += 1;
      });
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
        clusters[cid] = { id: cid, keywords: [], embeddings: [], center: result.centroids[cid].centroid };
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
