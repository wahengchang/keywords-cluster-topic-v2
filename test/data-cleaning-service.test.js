const DataCleaningService = require('../src/services/data-cleaning-service');

describe('DataCleaningService', () => {
  let service;
  beforeEach(() => {
    service = new DataCleaningService();
  });

  test('sanitizeKeyword removes special characters and lowercases', () => {
    const result = service.sanitizeKeyword('  Hello WORLD!!! ');
    expect(result).toBe('hello world');
  });
});
