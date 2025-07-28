const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const dbFile = path.join(__dirname, '..', 'kwt.db');
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');

function init() {
  if (!fs.existsSync(schemaPath)) {
    console.error('Schema file not found:', schemaPath);
    process.exit(1);
  }

  const command = `sqlite3 "${dbFile}" < "${schemaPath}"`;
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('Database initialized at', dbFile);
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  init();
}

module.exports = { init };
