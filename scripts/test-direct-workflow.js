#!/usr/bin/env node

const { KeywordService } = require('../src/services/keyword-service');

async function testDirectIntegration() {
  console.log('🧪 Testing Direct KeywordService Integration...\n');
  
  try {
    // Initialize service with environment variables
    const settings = {
      semrushApiKey: process.env.SEMRUSH_API_KEY || '5806aa83374cf4d26fb4f5506fe88f01'
    };
    
    const keywordService = new KeywordService(settings);
    
    // Test parameters - use a small limit for testing
    const testParams = {
      name: 'direct_test_google',
      method: 'Domain',
      target: 'google.com',
      database: 'us',
      limit: 25  // Small test dataset
    };
    
    console.log('📊 Processing Parameters:');
    console.log(`  - Method: ${testParams.method}`);
    console.log(`  - Target: ${testParams.target}`);
    console.log(`  - Database: ${testParams.database}`);
    console.log(`  - Limit: ${testParams.limit}\n`);
    
    // Execute the complete pipeline
    console.log('🚀 Starting complete pipeline processing...\n');
    const startTime = Date.now();
    
    const result = await keywordService.processKeywordRequest(testParams);
    
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    
    // Display success results
    console.log('✅ Pipeline Processing COMPLETED Successfully!\n');
    console.log('📈 Results Summary:');
    console.log(`  - Processing Time: ${processingTime}s`);
    console.log(`  - Raw Keywords Fetched: ${result.keywordCount}`);
    console.log(`  - Processed Keywords: ${result.processedKeywordCount}`);
    console.log(`  - Clusters Found: ${result.clusterCount}`);
    console.log(`  - Duplicate Groups: ${result.duplicateGroupCount}\n`);
    
    // Show sample clusters
    if (result.clusters && result.clusters.length > 0) {
      console.log('🎯 Sample Clusters:');
      result.clusters.slice(0, 3).forEach((cluster, index) => {
        console.log(`  ${index + 1}. ${cluster.cluster_name}`);
        console.log(`     - Keywords: ${cluster.keyword_count}`);
        console.log(`     - Search Volume: ${cluster.total_search_volume}`);
        console.log(`     - Coherence: ${(cluster.coherence_score || 0).toFixed(3)}`);
      });
      console.log();
    }
    
    // Show top scored keywords
    if (result.scoredKeywords && result.scoredKeywords.length > 0) {
      console.log('⭐ Top Priority Keywords:');
      result.scoredKeywords.slice(0, 5).forEach((keyword, index) => {
        console.log(`  ${index + 1}. ${keyword.keyword || keyword.cleaned_keyword}`);
        console.log(`     - Priority: ${keyword.priority_tier} (${(keyword.priority_score || 0).toFixed(3)})`);
        console.log(`     - Volume: ${keyword.search_volume || 0}`);
      });
      console.log();
    }
    
    console.log('🎉 INTEGRATION TEST PASSED! ✅');
    return true;
    
  } catch (error) {
    console.error('❌ INTEGRATION TEST FAILED:');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

// Set environment variables and run test
process.env.SEMRUSH_API_KEY = '5806aa83374cf4d26fb4f5506fe88f01';
process.env.NODE_ENV = 'prod';

testDirectIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });