const DeduplicationService = require('../src/services/deduplication-service');

describe('DeduplicationService', () => {
  let service;
  beforeEach(() => {
    service = new DeduplicationService();
  });

  test('removeExactDuplicates removes duplicate keywords', () => {
    const keywords = [
      { cleaned_keyword: 'test' },
      { cleaned_keyword: 'Test' },
      { cleaned_keyword: 'other' }
    ];
    const result = service.removeExactDuplicates(keywords);
    expect(result.length).toBe(2);
  });
});
