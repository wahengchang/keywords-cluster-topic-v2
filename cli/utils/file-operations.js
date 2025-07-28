const fs = require('fs');
const path = require('path');

// File operation utilities
class FileOperations {
  static generateFilename(value, method = 'semrush') {
    const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${method}_${sanitizedValue}_${timestamp}.csv`;
  }

  static ensureOutputDirectory(outputDir = 'output') {
    const fullPath = path.join(process.cwd(), outputDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
  }

  static saveData(data, filename, outputDir = 'output') {
    const outputPath = this.ensureOutputDirectory(outputDir);
    const filePath = path.join(outputPath, filename);
    fs.writeFileSync(filePath, data, 'utf8');
    return filePath;
  }

  static getFileStats(data) {
    const lines = data.split('\n').filter(Boolean);
    return {
      totalLines: lines.length,
      dataRows: lines.length - 1, // Subtract header
      hasHeader: lines.length > 0 && lines[0].includes(';')
    };
  }
}

module.exports = { FileOperations };