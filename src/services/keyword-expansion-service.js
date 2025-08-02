// src/services/keyword-expansion-service.js
// Service for expanding keyword coverage using AI and semantic analysis
const { chatgptStructuredArray } = require('../chatgpt/index');

class KeywordExpansionService {
  constructor({ config = {} } = {}) {
    this.config = Object.assign({
      systemMessage: 'You are an expert SEO keyword researcher specializing in finding semantically related keywords and long-tail variations.',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2000
    }, config);
    
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

    // Extract top keywords for analysis
    const seedKeywords = cluster.keywords
      .slice(0, 10) // Use top 10 keywords as seed
      .map(k => k.keyword || k)
      .join(', ');

    const prompt = `Expand the keyword coverage for the "${cluster.name}" topic cluster by generating ${expansionCount} new related keywords.

Existing seed keywords: ${seedKeywords}

Generate diverse keyword expansions:

1. **Long-tail variations** (3-6 words):
   - Add modifiers: "best", "top", "how to", "guide", "tips", "2024"
   - Location-based: "near me", "in [city]", "local"
   - Time-based: "quick", "fast", "instant", "step by step"

2. **Semantic variations**:
   - Synonyms and related terms
   - Industry-specific terminology
   - Alternative phrasings

3. **Question-based keywords**:
   - "How to [action]", "What is [term]", "Why [situation]"
   - "Can you [action]", "Should I [decision]"

4. **Commercial intent keywords**:
   - "Buy", "price", "cost", "review", "comparison"
   - "vs", "alternative", "substitute"

5. **Problem-solution keywords**:
   - "Fix", "solve", "troubleshoot", "error", "problem"
   - "Not working", "failed", "issues"

Requirements:
- Each keyword should be 2-8 words long
- Mix different search intents (informational, transactional, commercial, navigational)
- Ensure high relevance to the cluster theme
- Include confidence scores (0.7+ for high relevance)
- Avoid exact duplicates of seed keywords`;

    try {
      const result = await chatgptStructuredArray(prompt, this.functionSchema, this.config);
      
      // Filter and enhance results
      const expandedKeywords = result
        .filter(kw => kw.confidence >= 0.6) // Only keep reasonably confident suggestions
        .map(kw => ({
          ...kw,
          cluster_name: cluster.name,
          source: 'ai_expansion',
          expansion_type: kw.type,
          search_volume: this.estimateSearchVolume(kw.keyword, kw.type),
          priority_score: this.calculateExpansionPriority(kw),
          created_at: new Date().toISOString()
        }));

      return expandedKeywords.slice(0, expansionCount);
    } catch (err) {
      console.error('Keyword expansion error for cluster:', cluster.name, err);
      throw new Error(`Failed to expand keywords: ${err.message}`);
    }
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
    const existingContext = existingKeywords.length > 0 
      ? `\n\nAvoid these existing keywords:\n${existingKeywords.slice(0, 15).join(', ')}`
      : '';

    const prompt = `Generate ${count} diverse keyword variations for the theme: "${theme}"

Create comprehensive keyword coverage including:
- Different search intents and user goals
- Various difficulty levels (beginner to advanced)
- Commercial and informational keywords
- Long-tail and short-tail variations
- Problem-solving and solution-oriented terms${existingContext}

Focus on keywords that would be valuable for content creation and SEO.`;

    try {
      const result = await chatgptStructuredArray(prompt, this.functionSchema, this.config);
      
      return result
        .filter(kw => kw.confidence >= 0.6)
        .map(kw => ({
          ...kw,
          theme: theme,
          source: 'theme_expansion',
          search_volume: this.estimateSearchVolume(kw.keyword, kw.type),
          priority_score: this.calculateExpansionPriority(kw)
        }))
        .slice(0, count);
        
    } catch (err) {
      console.error('Theme variation generation error:', err);
      throw new Error(`Failed to generate theme variations: ${err.message}`);
    }
  }
}

module.exports = { KeywordExpansionService };