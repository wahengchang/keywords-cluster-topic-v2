// src/services/keyword-expansion-service.js
// Service for expanding keyword coverage using AI and semantic analysis
const { chatgptStructuredArray } = require('../chatgpt/index');

class KeywordExpansionService {
  constructor({ config = {} } = {}) {
    this.config = Object.assign({
      systemMessage: 'Generate SEO keywords with types, intents, and confidence scores.',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1500
    }, config);
    
    // Reusable prompt templates for different expansion types
    this.promptTemplates = {
      cluster: (theme, seeds, count) => `Expand "${theme}" with ${count} keywords. Seeds: ${seeds}`,
      theme: (theme, count) => `Generate ${count} diverse keywords for "${theme}" theme`,
      variations: (base, count) => `Create ${count} variations of: ${base}`
    };
    
    this.functionSchema = {
      name: "expand_keywords",
      description: "Generate expanded keyword variations and related terms for better content coverage",
      parameters: {
        type: "object",
        properties: {
          keywords: {
            type: "array",
            description: "Array of expanded and related keywords",
            items: { 
              type: "object",
              properties: {
                keyword: {
                  type: "string",
                  description: "The expanded keyword phrase"
                },
                type: {
                  type: "string",
                  enum: ["long-tail", "semantic", "synonym", "related", "question", "modifier"],
                  description: "Type of keyword expansion"
                },
                intent: {
                  type: "string",
                  enum: ["informational", "transactional", "navigational", "commercial"],
                  description: "Search intent of the keyword"
                },
                confidence: {
                  type: "number",
                  description: "Confidence score 0-1 for keyword relevance"
                }
              },
              required: ["keyword", "type", "intent", "confidence"]
            }
          }
        },
        required: ["keywords"]
      }
    };
  }

  /**
   * Build a concise prompt for keyword expansion
   * @param {string} type - Type of expansion (cluster, theme, variations)
   * @param {Object} params - Parameters for prompt building
   * @returns {string} Optimized prompt
   */
  buildPrompt(type, params) {
    const basePrompt = this.promptTemplates[type] || this.promptTemplates.theme;
    const theme = params.theme || params.name || 'keywords';
    const seedsOrBase = params.seeds || params.base || '';
    const count = params.count || 10;
    
    const prompt = basePrompt(theme, seedsOrBase, count);
    
    // Add concise expansion instructions
    const instructions = [
      'Include: long-tail, semantic, questions, commercial keywords',
      'Mix intents: informational, transactional, commercial, navigational',
      'Confidence 0.6+ required, 2-8 words each'
    ].join('. ');
    
    return `${prompt}. ${instructions}.`;
  }

  /**
   * Execute keyword expansion with error handling and result validation
   * @param {string} prompt - The prompt to send
   * @param {Object} metadata - Metadata to add to results
   * @param {number} maxResults - Maximum results to return
   * @returns {Array} Processed keyword results
   */
  async executeExpansion(prompt, metadata, maxResults) {
    try {
      const result = await chatgptStructuredArray(prompt, this.functionSchema, this.config);

      if (!result) {
        console.warn('API returned null/undefined result');
        return [];
      }
      
      if (!Array.isArray(result)) {
        console.warn('API returned non-array result:', typeof result, result);
        return [];
      }
      
      return result
        .filter(kw => kw && kw.keyword && kw.confidence >= 0.6)
        .map(kw => ({
          ...kw,
          ...metadata,
          search_volume: this.estimateSearchVolume(kw.keyword, kw.type),
          priority_score: this.calculateExpansionPriority(kw),
          created_at: new Date().toISOString()
        }))
        .slice(0, maxResults);
        
    } catch (err) {
      console.error('Expansion failed:', err.message);
      if (err.message.includes('JSON')) {
        console.warn('JSON parsing error - likely due to large response');
      }
      throw new Error(`Keyword expansion failed: ${err.message}`);
    }
  }

  /**
   * Expand keywords for a cluster using AI-powered semantic analysis
   * @param {Object} cluster - Cluster information with existing keywords
   * @param {string} cluster.name - Cluster name/theme
   * @param {Array} cluster.keywords - Array of existing keyword objects
   * @param {number} expansionCount - Number of new keywords to generate
   * @returns {Array} Expanded keywords with metadata
   */
  async expandClusterKeywords(cluster, expansionCount = 20) {
    if (!cluster.keywords || cluster.keywords.length === 0) {
      throw new Error('Cluster must have existing keywords for expansion');
    }

    const seedKeywords = cluster.keywords
      .slice(0, 8) // Reduced from 10 to 8 to keep prompt shorter
      .map(k => k.keyword || k)
      .join(', ');

    const prompt = this.buildPrompt('cluster', {
      name: cluster.name,
      seeds: seedKeywords,
      count: expansionCount
    });

    const metadata = {
      cluster_name: cluster.name,
      source: 'ai_expansion',
      expansion_type: 'cluster'
    };

    return await this.executeExpansion(prompt, metadata, expansionCount);
  }

  /**
   * Estimate search volume based on keyword characteristics
   * @param {string} keyword - The keyword to analyze
   * @param {string} type - Type of keyword expansion
   * @returns {number} Estimated search volume
   */
  estimateSearchVolume(keyword, type) {
    const baseVolume = {
      'long-tail': 100,
      'semantic': 500,
      'synonym': 300,
      'related': 400,
      'question': 200,
      'modifier': 150
    };

    const wordCount = keyword.split(' ').length;
    const volumeMultiplier = Math.max(0.1, 1 - (wordCount - 2) * 0.15); // Decrease with length
    
    return Math.round((baseVolume[type] || 250) * volumeMultiplier);
  }

  /**
   * Calculate priority score for expanded keywords
   * @param {Object} keyword - Keyword object with metadata
   * @returns {number} Priority score 0-1
   */
  calculateExpansionPriority(keyword) {
    let score = keyword.confidence;
    
    // Boost commercial intent keywords
    if (keyword.intent === 'commercial' || keyword.intent === 'transactional') {
      score += 0.1;
    }
    
    // Boost question-based keywords (good for FAQ content)
    if (keyword.type === 'question') {
      score += 0.1;
    }
    
    // Boost long-tail keywords (less competition)
    if (keyword.type === 'long-tail') {
      score += 0.05;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Expand keywords for multiple clusters in batch
   * @param {Array} clusters - Array of cluster objects
   * @param {number} keywordsPerCluster - Keywords to generate per cluster
   * @returns {Object} Expansion results with statistics
   */
  async expandMultipleClusters(clusters, keywordsPerCluster = 15) {
    const results = {
      totalClusters: clusters.length,
      successfulExpansions: 0,
      totalKeywordsGenerated: 0,
      expandedKeywords: [],
      errors: []
    };

    for (const cluster of clusters) {
      try {
        const expandedKeywords = await this.expandClusterKeywords(cluster, keywordsPerCluster);
        
        results.expandedKeywords.push({
          clusterId: cluster.id,
          clusterName: cluster.name || cluster.cluster_name,
          keywords: expandedKeywords
        });
        
        results.successfulExpansions++;
        results.totalKeywordsGenerated += expandedKeywords.length;
        
      } catch (error) {
        results.errors.push({
          clusterId: cluster.id,
          clusterName: cluster.name || cluster.cluster_name,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Generate keyword variations for a specific theme or topic
   * @param {string} theme - Main theme or topic
   * @param {Array} existingKeywords - Keywords to avoid duplicating
   * @param {number} count - Number of variations to generate
   * @returns {Array} Generated keyword variations
   */
  async generateThemeVariations(theme, existingKeywords = [], count = 25) {
    let prompt = this.buildPrompt('theme', { theme, count });
    
    // Add existing keywords context if provided (but keep it concise)
    if (existingKeywords.length > 0) {
      const existing = existingKeywords.slice(0, 8).join(', '); // Reduced from 15 to 8
      prompt += ` Avoid: ${existing}.`;
    }

    const metadata = {
      theme: theme,
      source: 'theme_expansion',
      expansion_type: 'theme'
    };

    return await this.executeExpansion(prompt, metadata, count);
  }
}

module.exports = { KeywordExpansionService };