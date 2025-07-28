// Display formatting utilities

class Output {
  static showHeader() {
    console.log('🔍 Keywords Cluster Topic Automation CLI\n');
  }

  static showProgress(message) {
    console.log(`\n🚀 ${message}...`);
  }

  static showSuccess(message) {
    console.log(`✅ ${message}`);
  }

  static showError(message) {
    console.error(`❌ Error: ${message}`);
  }

  static showInfo(message) {
    console.log(`💡 ${message}`);
  }

  static showSummary(data) {
    console.log('\n📊 Summary:');
    Object.entries(data).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }

  static showCancellation() {
    console.log('Operation cancelled');
  }

  static showGoodbye() {
    console.log('\n👋 Goodbye!');
  }
}

module.exports = { Output };