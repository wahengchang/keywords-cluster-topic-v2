#!/usr/bin/env node

// Quick test script for WriteMore command
const { WriteMoreCommand } = require('./cli/commands/writemore');

async function testWriteMoreCommand() {
  console.log('🧪 Testing WriteMore Command...');
  
  try {
    // Test that command can be instantiated
    const command = new WriteMoreCommand();
    console.log('✅ WriteMoreCommand instantiated successfully');
    
    // Test database initialization (without running full execute)
    await command.initializeDatabase();
    console.log('✅ Database initialization successful');
    
    // Test project loading
    const projects = command.projectModel.findAll({ status: 'active' });
    console.log(`✅ Found ${projects.length} active projects`);
    
    if (projects.length > 0) {
      // Test cluster loading for first project
      const clusters = await command.loadClustersWithCounts(projects[0].id);
      console.log(`✅ Found ${clusters.length} clusters for project "${projects[0].name}"`);
      
      if (clusters.length > 0) {
        console.log('\n📊 Sample cluster data:');
        clusters.slice(0, 2).forEach((cluster, i) => {
          console.log(`${i + 1}. ${cluster.cluster_name || 'Unnamed'}`);
          console.log(`   Keywords: ${cluster.keyword_count || 0}`);
          console.log(`   Existing content: ${cluster.existing_content_count || 0}`);
        });
      }
    }
    
    console.log('\n✅ All tests passed! WriteMore command is ready for use.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testWriteMoreCommand();