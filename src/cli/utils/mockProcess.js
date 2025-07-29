const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

class MockProcessor {
  static async process(params) {
    const { method, target, database, limit } = params;
    
    console.log(chalk.blue('Starting mock processing...'));
    console.log(chalk.gray(`Method: ${method}`));
    console.log(chalk.gray(`Target: ${target}`));
    console.log(chalk.gray(`Database: ${database}`));
    console.log(chalk.gray(`Limit: ${limit} keywords`));
    console.log();

    const spinner = ora('Simulating SEMrush API connection...').start();
    
    try {
      await this.simulateDelay(1000);
      spinner.text = 'Fetching keywords data...';
      
      await this.simulateDelay(1500);
      spinner.text = 'Processing keywords...';
      
      await this.simulateDelay(1000);
      spinner.text = 'Clustering keywords...';
      
      await this.simulateDelay(800);
      spinner.text = 'Generating output file...';
      
      const outputFile = await this.generateMockOutput(target, limit);
      
      await this.simulateDelay(500);
      spinner.succeed('Processing completed successfully!');
      
      return {
        filePath: outputFile,
        keywordCount: limit,
        clusters: Math.floor(limit / 10),
        processingTime: '4.8 seconds'
      };
      
    } catch (error) {
      spinner.fail('Processing failed');
      throw error;
    }
  }

  static async generateMockOutput(target, limit) {
    const outputDir = path.join(process.cwd(), 'output');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `semrush_${target.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.csv`;
    const filePath = path.join(outputDir, fileName);
    
    const headers = 'Keyword,Volume,CPC,Competition,Cluster,Topic\n';
    let csvContent = headers;
    
    for (let i = 1; i <= Math.min(limit, 100); i++) {
      const keyword = `${target} keyword ${i}`;
      const volume = Math.floor(Math.random() * 10000) + 100;
      const cpc = (Math.random() * 5 + 0.1).toFixed(2);
      const competition = (Math.random()).toFixed(2);
      const cluster = Math.floor(i / 10) + 1;
      const topic = `Topic ${cluster}`;
      
      csvContent += `"${keyword}",${volume},${cpc},${competition},${cluster},"${topic}"\n`;
    }
    
    await fs.writeFile(filePath, csvContent);
    return filePath;
  }

  static simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static displayResults(results) {
    console.log();
    console.log(chalk.green.bold('🎉 Processing Results:'));
    console.log(chalk.gray('━'.repeat(40)));
    console.log(chalk.cyan(`📁 Output File: ${results.filePath}`));
    console.log(chalk.cyan(`📊 Keywords Processed: ${results.keywordCount}`));
    console.log(chalk.cyan(`🔗 Clusters Generated: ${results.clusters}`));
    console.log(chalk.cyan(`⏱️  Processing Time: ${results.processingTime}`));
    console.log();
  }
}

module.exports = { MockProcessor };