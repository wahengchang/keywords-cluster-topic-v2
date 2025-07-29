const { ClusteringService } = require('../src/services/clustering-service');

describe('ClusteringService', () => {
  test('k-means groups similar keywords', async () => {
    const service = new ClusteringService();
    const keywords = [
      { keyword: 'apple pie recipe', search_volume: 1000, competition: 0.2 },
      { keyword: 'banana bread recipe', search_volume: 800, competition: 0.25 },
      { keyword: 'buy used car', search_volume: 900, competition: 0.4 },
      { keyword: 'car dealer near me', search_volume: 700, competition: 0.35 }
    ];

    const clusters = await service.performAdvancedClustering(keywords, { clusterCount: 2 });

    expect(clusters.length).toBe(2);
    const totalKeywords = clusters.reduce((acc, c) => acc + c.keywords.length, 0);
    expect(totalKeywords).toBe(keywords.length);
    clusters.forEach(c => {
      expect(typeof c.name).toBe('string');
    });
  });
});
