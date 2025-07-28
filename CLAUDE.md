# Keywords Cluster Topic Tool

A CLI tool for keyword clustering and topic analysis using K-means clustering and natural language processing.
this project use javascript , typescript is not allowed
## Quick Start

```bash
# Install dependencies
npm install

# Run the CLI tool
npm start

# Run tests
npm test
```
## git workflow
for implement task on github issue, please follow `git-workflow.md`

## Frequent Commands

```bash
# Start the interactive CLI
npm start

# Install dependencies
npm install

# Run tests
npm test
```

## Key Files & Documentation
all the github issue/task related files are in ./issues folder
all the draft/communication files are in ./draft folder
- `README.md` - Main project documentation
- `PRODUCT_REQUIREMENTS.md` - Product specifications
- `DATABASE_SCHEMA_REQUIREMENTS.md` - Database schema details
- `USER_STORIES.md` - User stories and requirements

## Dependencies

- **axios**: HTTP client for API requests
- **ml-kmeans**: K-means clustering algorithm
- **natural**: Natural language processing toolkit
- **fast-levenshtein**: String similarity calculations
- **stopword**: Stop word removal
- **prompts**: Interactive CLI prompts
- **better-sqlite3**: SQLite database driver
- **fs-extra**: Enhanced file system operations

## Database Implementation

The project now uses SQLite database instead of file-based CSV storage:

- **Database Location**: `./data/keywords-cluster.db`
- **Migration Support**: Automatically migrate existing CSV files to database
- **CLI Commands**: Use `npm start` and select "Database Management" for database operations
- **Direct Access**: Use `node cli/index-new.js --database` for direct database CLI access

### Database Commands
```bash
# Access database management CLI
npm start  # Select "Database Management"

# Or directly
node cli/index-new.js --database

# Available operations:
# - Migrate CSV files to database
# - Show database status  
# - List all projects
# - Export project to CSV
# - Backup database
# - Clear database (dangerous)
```