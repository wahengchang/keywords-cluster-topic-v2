let _;
let validator;
try {
  _ = require('lodash');
} catch {
  _ = { clamp: (v, a, b) => Math.min(b, Math.max(a, v)) };
}
try {
  validator = require('validator');
} catch {
  validator = null;
}

class DataCleaningService {
  sanitizeKeyword(keyword) {
    if (!keyword) return '';
    let clean = keyword;
    if (validator && typeof validator.blacklist === 'function') {
      clean = validator.blacklist(clean, '\\n\\r\\t');
    }
    clean = clean
      .replace(/[^\w\s-]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return clean;
  }

  validateSearchVolume(volume) {
    const num = parseInt(volume, 10);
    if (isNaN(num) || num < 0) return null;
    return num;
  }

  validateCompetitionScore(score) {
    const num = parseFloat(score);
    if (isNaN(num) || num < 0 || num > 1) return null;
    return num;
  }

  standardizeFormat(keyword) {
    return this.sanitizeKeyword(keyword);
  }

  assessKeywordQuality(keyword) {
    if (!keyword || keyword.length < 2 || keyword.length > 100) return 0;
    const alphaRatio = keyword.replace(/[^a-z0-9]/g, '').length / keyword.length;
    return _.clamp(alphaRatio, 0, 1);
  }

  filterLowQualityKeywords(keywords, threshold = 0.3) {
    return keywords.filter(k => k.quality_score >= threshold);
  }

  async cleanKeywords(rawKeywords, options = {}) {
    const qualityThreshold = options.qualityThreshold || 0.3;
    const cleaned = rawKeywords.map(k => {
      const original = k.keyword || k;
      const cleanedKeyword = this.standardizeFormat(original);
      return {
        ...k,
        original_keyword: original,
        cleaned_keyword: cleanedKeyword,
        search_volume: this.validateSearchVolume(k.search_volume),
        competition: this.validateCompetitionScore(k.competition),
        is_cleaned: true,
        quality_score: this.assessKeywordQuality(cleanedKeyword)
      };
    });
    return this.filterLowQualityKeywords(cleaned, qualityThreshold);
  }
}

module.exports = DataCleaningService;
