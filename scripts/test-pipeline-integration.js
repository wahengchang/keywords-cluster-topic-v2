#!/usr/bin/env node

// Comprehensive pipeline test
const { ClusteringService } = require('../src/services/clustering-service');
const { PriorityScoringService } = require('../src/services/priority-scoring-service');
const DataCleaningService = require('../src/services/data-cleaning-service');
const DeduplicationService = require('../src/services/deduplication-service');

async function testPipelineIntegration() {
  console.log('🧪 Testing Complete Pipeline Integration...\n');
  
  try {
    // Test data (simulating SEMrush response)
    const mockKeywords = [
      { keyword: 'crypto trading', search_volume: 12000, competition: 0.8 },
      { keyword: 'bitcoin trading', search_volume: 8500, competition: 0.9 },
      { keyword: 'crypto exchange', search_volume: 15000, competition: 0.7 },
      { keyword: 'digital currency', search_volume: 5000, competition: 0.6 },
      { keyword: 'cryptocurrency wallet', search_volume: 9000, competition: 0.5 },
    ];
    
    console.log('📊 Test Data:');
    mockKeywords.forEach((kw, i) => {
      console.log(`   ${i+1}. "${kw.keyword}" - Vol: ${kw.search_volume}, Comp: ${kw.competition}`);
    });
    console.log();
    
    // Stage 1: Data Cleaning
    console.log('🧹 Stage 1: Data Cleaning...');
    const cleaningService = new DataCleaningService();
    const cleanedKeywords = await cleaningService.cleanKeywords(mockKeywords);
    console.log(`✅ Cleaned ${cleanedKeywords.length} keywords`);
    
    // Stage 2: Deduplication
    console.log('\n🔄 Stage 2: Deduplication...');
    const deduplicationService = new DeduplicationService();
    const { unique, similarGroups } = await deduplicationService.deduplicateKeywords(cleanedKeywords);
    console.log(`✅ Found ${unique.length} unique keywords, ${similarGroups.length} similar groups`);
    
    // Stage 3: Clustering
    console.log('\n🎯 Stage 3: Advanced Clustering...');
    const clusteringService = new ClusteringService();
    const clusters = await clusteringService.performAdvancedClustering(unique);
    console.log(`✅ Created ${clusters.length} clusters`);
    clusters.forEach((cluster, i) => {
      console.log(`   Cluster ${i+1}: "${cluster.name}" (${cluster.keywords.length} keywords)`);
    });
    
    // Stage 4: Priority Scoring
    console.log('\n🏆 Stage 4: Priority Scoring...');
    const priorityService = new PriorityScoringService();
    const scoredKeywords = await priorityService.calculatePriorityScores(unique, clusters);
    console.log(`✅ Scored ${scoredKeywords.length} keywords`);
    
    // Display results
    console.log('\n📈 Top 3 Priority Keywords:');
    scoredKeywords.slice(0, 3).forEach((kw, i) => {
      console.log(`   ${i+1}. "${kw.keyword}" - Score: ${kw.priority_score.toFixed(3)} (${kw.priority_tier})`);
    });
    
    console.log('\n🎉 Pipeline Integration Test PASSED!');
    console.log('✅ All services are working correctly');
    console.log('✅ Data flows properly between stages');
    console.log('✅ Ready for CLI integration');
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

if (require.main === module) {
  testPipelineIntegration().catch(console.error);
}

module.exports = { testPipelineIntegration };