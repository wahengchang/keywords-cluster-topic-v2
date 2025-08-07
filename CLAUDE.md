# Keywords Cluster Topic Tool V2 - Batch Processing Architecture

A CLI tool for keyword clustering and topic analysis using optimized K-means clustering with batch processing capabilities and natural language processing.

## Do and Don't
Dev Language: Node.js only (no TypeScript)
Don't use: TypeScript, complex queuing systems, distributed architectures

## Common Use Commands
Check `package.json` for available commands:
- `npm start` - Run CLI interface
- `npm run dev` - Start web server with nodemon
- `npm test` - Run test suite

## Key Files & Documentation
- `PRODUCT_REQUIREMENTS.md` - Product specifications with batch processing requirements
- `USER_STORIES.md` - User stories and requirements
- `dev.md` - Technical architecture for batch processing implementation
- `./src/database/schema.js` - Database schema with batch tracking extensions

## Agent Architecture
The project uses a surgical team model:
- **generalize-engine-agent** - Master prompt optimizer and primary implementation agent
- **surgeon-agent** - Lead architect and core logic implementer
- **copilot-agent** - Supporting implementation and detailing
- **reviewer-agent** - Quality control and validation
- **doc-agent** - Documentation generation

For this batch processing feature, all tasks will be primarily handled by **generalize-engine-agent** as the most suitable agent for the current project needs.

## Project Context
Currently implementing batch processing optimization to transform clustering from 1-hour monolithic process to 5-minute initial results with resume capability.

# Important Instruction Reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
