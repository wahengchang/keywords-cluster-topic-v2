const { PriorityScoringService } = require('../src/services/priority-scoring-service');

describe('PriorityScoringService', () => {
  test('assigns priority tiers', async () => {
    const service = new PriorityScoringService();
    const clusters = [
      { name: 'recipe', coherence: 0.7 },
      { name: 'car', coherence: 0.6 }
    ];
    const keywords = [
      { keyword: 'apple pie recipe', search_volume: 1000, competition: 0.2, cluster_id: 0 },
      { keyword: 'car dealer', search_volume: 500, competition: 0.7, cluster_id: 1 }
    ];
    const result = await service.calculatePriorityScores(keywords, clusters);
    expect(result[0]).toHaveProperty('priority_tier');
    const tiers = result.map(k => k.priority_tier);
    expect(tiers).toContain('medium');
    expect(tiers).toContain('low');
  });
});
