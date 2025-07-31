const { KeywordService } = require('../src/services/keyword-service');

async function testIntegratedWorkflow() {
  console.log('🚀 Testing Integrated Keyword Processing Pipeline...\n');

  try {
    // Initialize service
    const settings = {
      semrushApiKey: process.env.SEMRUSH_API_KEY
    };
    
    const keywordService = new KeywordService(settings);
    
    // Test with a small dataset
    const testParams = {
      name: 'integration_test',
      method: 'Domain',
      target: 'htx.com',
      database: 'us',
      limit: 50  // Small test dataset
    };
    
    console.log('📊 Processing Parameters:');
    console.log(`  - Method: ${testParams.method}`);
    console.log(`  - Target: ${testParams.target}`);
    console.log(`  - Database: ${testParams.database}`);
    console.log(`  - Limit: ${testParams.limit}\n`);
    
    // Execute full pipeline
    const startTime = Date.now();
    const result = await keywordService.processKeywordRequest(testParams);
    const endTime = Date.now();
    
    // Display results
    console.log('✅ Pipeline Processing Complete!\n');
    console.log('📈 Results Summary:');
    console.log(`  - Processing Time: ${(endTime - startTime) / 1000}s`);
    console.log(`  - Raw Keywords Fetched: ${result.keywordCount}`);
    console.log(`  - Processed Keywords: ${result.processedKeywordCount}`);
    console.log(`  - Clusters Found: ${result.clusterCount}`);
    console.log(`  - Duplicate Groups: ${result.duplicateGroupCount}\n`);
    
    // Verify stages completed
    console.log('🔍 Pipeline Stages Validation:');
    if (result.stats) {
      console.log(`  ✓ Keywords Fetched: ${result.stats.keywords_fetched}`);
      console.log(`  ✓ Keywords Cleaned: ${result.stats.keywords_cleaned}`);
      console.log(`  ✓ Keywords Unique: ${result.stats.keywords_unique}`);
      console.log(`  ✓ Keywords Scored: ${result.stats.keywords_scored}`);
      console.log(`  ✓ Clusters Found: ${result.stats.clusters_found}`);
      console.log(`  ✓ Duplicate Groups: ${result.stats.duplicate_groups}\n`);
    }
    
    // Verify clusters exist
    if (result.clusters && result.clusters.length > 0) {
      console.log('🎯 Sample Clusters:');
      result.clusters.slice(0, 3).forEach((cluster, index) => {
        console.log(`  ${index + 1}. ${cluster.name || `Cluster ${cluster.id}`}`);
        console.log(`     - Keywords: ${cluster.keyword_count}`);
        console.log(`     - Coherence: ${(cluster.coherence_score || 0).toFixed(3)}`);
        console.log(`     - Search Volume: ${cluster.total_search_volume || 0}`);
      });
      console.log();
    }
    
    // Verify scored keywords exist
    if (result.scoredKeywords && result.scoredKeywords.length > 0) {
      console.log('⭐ Top Scored Keywords:');
      result.scoredKeywords.slice(0, 5).forEach((keyword, index) => {
        console.log(`  ${index + 1}. ${keyword.keyword || keyword.cleaned_keyword}`);
        console.log(`     - Priority Score: ${(keyword.priority_score || 0).toFixed(3)}`);
        console.log(`     - Priority Tier: ${keyword.priority_tier || 'unknown'}`);
        console.log(`     - Search Volume: ${keyword.search_volume || 0}`);
      });
      console.log();
    }
    
    console.log('🎉 Integration Test PASSED! All pipeline stages executed successfully.');
    
    return {
      success: true,
      processingTime: endTime - startTime,
      ...result.stats
    };
    
  } catch (error) {
    console.error('❌ Integration Test FAILED:', error.message);
    console.error('Full error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run test if called directly
if (require.main === module) {
  testIntegratedWorkflow()
    .then(result => {
      console.log('\n📋 Test Summary:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testIntegratedWorkflow };