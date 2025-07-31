const ProcessingService = require('../src/services/processing-service');

describe('ProcessingService', () => {
  test('runs full pipeline and scores keywords', async () => {
    const service = new ProcessingService();
    const rawKeywords = [
      { keyword: 'apple pie recipe', search_volume: 1000, competition: 0.2 },
      { keyword: 'banana bread recipe', search_volume: 800, competition: 0.25 },
      { keyword: 'buy used car', search_volume: 900, competition: 0.4 },
      { keyword: 'car dealer near me', search_volume: 700, competition: 0.35 }
    ];

    const result = await service.run(rawKeywords, { clustering: { clusterCount: 2 } });

    expect(result.clusters.length).toBe(2);
    expect(result.keywords.every(k => k.priority_score !== undefined)).toBe(true);
  });
});
