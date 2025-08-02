const levenshtein = require('fast-levenshtein');

class DeduplicationService {
  removeExactDuplicates(keywords) {
    const seen = new Map();
    const unique = [];
    for (const k of keywords) {
      const key = (k.cleaned_keyword || k.keyword || '').toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, k);
        unique.push(k);
      }
    }
    return unique;
  }

  calculateLevenshteinDistance(a, b) {
    return levenshtein.get(a, b);
  }

  findSimilarKeywords(keywords, threshold = 0.8) {
    const groups = [];
    const used = new Set();
    for (let i = 0; i < keywords.length; i++) {
      if (used.has(i)) continue;
      const base = keywords[i];
      const group = [base];
      used.add(i);
      for (let j = i + 1; j < keywords.length; j++) {
        if (used.has(j)) continue;
        const other = keywords[j];
        const dist = this.calculateLevenshteinDistance(
          base.cleaned_keyword,
          other.cleaned_keyword
        );
        const maxLen = Math.max(
          base.cleaned_keyword.length,
          other.cleaned_keyword.length
        );
        const similarity = 1 - dist / maxLen;
        if (similarity >= threshold) {
          group.push(other);
          used.add(j);
        }
      }
      if (group.length > 1) groups.push(group);
    }
    return groups;
  }

  async deduplicateKeywords(cleanedKeywords, options = {}) {
    const threshold = options.similarityThreshold || 0.8;
    const initialCount = cleanedKeywords.length;
    const unique = this.removeExactDuplicates(cleanedKeywords);
    const similarGroups = this.findSimilarKeywords(unique, threshold);
    const finalCount = unique.length;
    
    console.log(`✓ Deduplication: ${initialCount} → ${finalCount} keywords (removed ${initialCount - finalCount} duplicates)`);
    
    return { unique, similarGroups };
  }
}

module.exports = DeduplicationService;
