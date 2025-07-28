const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '..', 'kwt.db');
const script = path.join(__dirname, '..', 'scripts', 'init-db.js');

afterAll(() => {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});

test('database initialization script creates sqlite file', () => {
  execSync(`node ${script}`);
  expect(fs.existsSync(dbPath)).toBe(true);
});
