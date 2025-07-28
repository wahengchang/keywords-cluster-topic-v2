const { KeywordService } = require('../src/services/keyword-service');
const { fetchSemrushKeywordsDomain } = require('../src/semrush-api');

jest.mock('../src/semrush-api');
jest.mock('../cli/utils/file-operations');

describe('KeywordService', () => {
  let keywordService;
  
  beforeEach(() => {
    keywordService = new KeywordService({ semrushApiKey: 'test-api-key' });
  });

  test('should create instance with settings', () => {
    expect(keywordService.settings.semrushApiKey).toBe('test-api-key');
  });

  test('should throw error when API key is missing', async () => {
    const serviceWithoutKey = new KeywordService({});
    
    await expect(serviceWithoutKey.fetchKeywords({
      method: 'Domain',
      target: 'example.com',
      database: 'us',
      limit: 100
    })).rejects.toThrow('SEMrush API key not found in environment variables');
  });
});