// src/generators/faq-title-generator.js
// FAQ title generation for keyword clusters
const { chatgptStructuredArray } = require('../chatgpt/index');

class FAQTitleGenerator {
  constructor({ titlesPerCluster = 5, config = {} } = {}) {
    this.titlesPerCluster = titlesPerCluster;
    this.config = Object.assign({
      systemMessage: 'You are an expert SEO content strategist specializing in FAQ content. Generate FAQ-style titles that answer common user questions.',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1500
    }, config);
    
    this.functionSchema = {
      name: "generate_faq_titles",
      description: "Generate FAQ-style article titles for a keyword cluster",
      parameters: {
        type: "object",
        properties: {
          titles: {
            type: "array",
            description: "Array of FAQ-style titles that answer common questions",
            items: { 
              type: "string",
              description: "FAQ title starting with How, What, Why, When, Where, etc."
            }
          }
        },
        required: ["titles"]
      }
    };
  }

  /**
   * Generate FAQ titles for a keyword cluster
   * @param {Object} cluster - Cluster information with keywords
   * @param {string} cluster.name - Cluster name/theme
   * @param {Array} cluster.keywords - Array of keyword objects with .keyword property
   * @param {Array} existingTitles - Existing titles to avoid duplicates
   * @returns {Array} Generated FAQ titles
   */
  async generateFAQTitles(cluster, existingTitles = []) {
    if (!cluster.keywords || cluster.keywords.length === 0) {
      throw new Error('Cluster must have keywords');
    }

    // Extract top keywords (limit to prevent token overflow)
    const topKeywords = cluster.keywords
      .slice(0, 15) // Limit keywords to prevent prompt bloat
      .map(k => k.keyword || k)
      .join(', ');

    // Build deduplication context
    const existingContext = existingTitles.length > 0 
      ? `\n\nAvoid creating titles similar to these existing ones:\n${existingTitles.slice(0, 10).join('\n')}`
      : '';

    const prompt = `Generate ${this.titlesPerCluster} unique and comprehensive FAQ-style article titles for the "${cluster.name}" topic cluster.

Keywords in this cluster: ${topKeywords}

Requirements:
- Create diverse title types: "How to", "What is", "Why", "When", "Where", "Best", "Top", "Complete Guide to", "Ultimate", "Beginner's Guide", "Advanced", "Step-by-Step"
- Cover different user intents: informational, transactional, navigational, commercial
- Mix difficulty levels: beginner, intermediate, advanced
- Include comparison titles: "X vs Y", "X or Y", "Difference between X and Y"
- Add year-specific titles: "Best X in 2024", "Latest X Trends"
- Keep most titles under 60 characters but allow some longer comprehensive titles up to 80 characters
- Make them specific, actionable, and valuable
- Cover problems, solutions, benefits, features, and comparisons${existingContext}

Examples of comprehensive FAQ titles:
- "How to Start Crypto Trading for Beginners"
- "What Are the Best Bitcoin Trading Strategies?"
- "Complete Guide to Cryptocurrency Investment 2024"
- "Bitcoin vs Ethereum: Which Should You Choose?"
- "Top 10 Crypto Trading Mistakes to Avoid"
- "Advanced DeFi Strategies for Experienced Traders"
- "Why Do Cryptocurrency Prices Fluctuate So Much?"
- "Step-by-Step Guide to Setting Up a Crypto Wallet"`;

    try {
      const result = await chatgptStructuredArray(prompt, this.functionSchema, this.config);
      
      // Filter out any titles that might be duplicates (basic similarity check)
      const filteredTitles = this.removeSimilarTitles(result, existingTitles);
      
      return filteredTitles.slice(0, this.titlesPerCluster);
    } catch (err) {
      console.error('FAQ title generation error for cluster:', cluster.name, err);
      throw new Error(`Failed to generate FAQ titles: ${err.message}`);
    }
  }

  /**
   * Basic duplicate/similarity removal
   * @param {Array} newTitles - Newly generated titles
   * @param {Array} existingTitles - Existing titles to compare against
   * @returns {Array} Filtered titles
   */
  removeSimilarTitles(newTitles, existingTitles) {
    if (!existingTitles.length) return newTitles;
    
    return newTitles.filter(newTitle => {
      const newWords = this.extractKeyWords(newTitle.toLowerCase());
      
      return !existingTitles.some(existingTitle => {
        const existingWords = this.extractKeyWords(existingTitle.toLowerCase());
        const commonWords = newWords.filter(word => existingWords.includes(word));
        // Consider similar if >60% words overlap
        return commonWords.length / Math.max(newWords.length, existingWords.length) > 0.6;
      });
    });
  }

  /**
   * Extract meaningful words from title (excluding common words)
   * @param {string} title - Title to analyze
   * @returns {Array} Array of meaningful words
   */
  extractKeyWords(title) {
    const stopWords = ['how', 'to', 'what', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'with', 'by'];
    return title
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  /**
   * Validate generated titles meet FAQ criteria
   * @param {Array} titles - Titles to validate
   * @returns {Array} Valid FAQ titles only
   */
  validateFAQTitles(titles) {
    const faqStarters = ['how', 'what', 'why', 'when', 'where', 'which', 'who', 'best', 'top', 'complete', 'ultimate', 'beginner', 'advanced', 'step'];
    
    return titles.filter(title => {
      const firstWords = title.toLowerCase().split(' ').slice(0, 2).join(' ');
      const firstWord = title.toLowerCase().split(' ')[0];
      const isQuestion = faqStarters.includes(firstWord) || 
                        firstWords.includes('complete guide') ||
                        firstWords.includes('ultimate guide') ||
                        firstWords.includes('step-by-step') ||
                        firstWords.includes('beginner guide') ||
                        firstWords.includes('advanced guide');
      const isReasonableLength = title.length >= 15 && title.length <= 100;
      
      return isQuestion && isReasonableLength;
    });
  }
}

module.exports = { FAQTitleGenerator };