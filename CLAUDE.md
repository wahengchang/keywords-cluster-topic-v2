# Keywords Cluster Topic Tool

A CLI tool for keyword clustering and topic analysis using K-means clustering and natural language processing.

## Development Guidelines
- Language: Node.js only (no TypeScript)
- Check `package.json` for available commands

## Git Operations
Follow `git-workflow.md` for GitHub operations

## Key Files
- `PRODUCT_REQUIREMENTS.md` - Product specifications
- `USER_STORIES.md` - User stories and requirements
- `./src/database/schema.js` - Database schema details

## Agent Architecture (MVP)

### Three-Agent System
- **CLI & Database**: Command execution in `/cli/commands/` and database operations (general-purpose agent)
- **Web Interface**: Frontend in `/public/` and server routes (web-interface-agent)  
- **Core Clustering**: Clustering algorithms in `/src/services/` (core-clustering-specialist)

### Agent Activation Guidelines
- **core-clustering-specialist**: Use for K-means clustering optimization, semantic analysis, feature engineering, cluster quality improvements, or performance tuning for large datasets in `/src/services/clustering-service.js`
- **web-interface-agent**: Use for Express.js server routes, frontend components in `/public/`, API endpoints, dashboard development, or data visualization features
- **general-purpose**: Use for CLI commands, database operations, file management, or tasks not covered by specialized agents

### Database Architecture Decision
**No dedicated database agent** - SQLite operations are simple enough to be handled by existing agents:
- **CLI operations**: general-purpose agent handles database management commands
- **Data persistence**: each service handles its own database operations  
- **Web queries**: web-interface-agent handles display and API data retrieval

See `database-architecture-decision.md` for complete rationale and future considerations.
