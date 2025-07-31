# Backend Requirements - Keywords Cluster Web Interface

## Document Information
- **Version**: 1.0.0
- **Date**: 2025-07-31
- **Project**: Keywords Cluster Topic Tool - Backend API
- **Status**: Development Specification

---

## Overview

This document outlines the backend requirements for the Keywords Cluster Topic Tool web interface. The backend is designed as a minimal Express.js server with only 3 API endpoints, focusing on simplicity and leveraging the existing SQLite database.

---

## Architecture Principles

### Minimal Backend Philosophy
- **Single file server**: All backend logic in one `server.js` file
- **Read-only operations**: No database writes from web interface
- **Direct SQLite queries**: Minimal abstraction, direct SQL queries
- **Client-side processing**: Heavy logic moved to frontend JavaScript

### Technology Stack
```
Runtime: Node.js 18+
Framework: Express.js (minimal setup)
Database: SQLite with better-sqlite3
Dependencies: express, better-sqlite3, cors, path
```

---

## Server Implementation

### Complete Server.js File
**Location**: `/server.js` (project root)

```javascript
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection (read-only)
const db = new Database('./data/keywords-cluster.db', { readonly: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Endpoints (Only 3 needed)

// 1. GET /api/data - Get ALL dashboard data in one call
app.get('/api/data', (req, res) => {
  try {
    // Get all projects with keyword counts
    const projects = db.prepare(`
      SELECT p.*, 
             COUNT(k.id) as keyword_count,
             MAX(pr.created_at) as last_processed
      FROM projects p
      LEFT JOIN keywords k ON p.id = k.project_id
      LEFT JOIN processing_runs pr ON p.id = pr.project_id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();

    // Get overview stats
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM projects WHERE status = 'active') as total_projects,
        (SELECT COUNT(*) FROM keywords) as total_keywords,
        (SELECT COUNT(*) FROM keyword_clusters) as total_clusters
    `).get();

    res.json({ projects, stats });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// 2. GET /api/keywords/:projectId - Get ALL keywords for a project
app.get('/api/keywords/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate projectId
    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    // Get ALL keywords for the project (no server-side filtering)
    const keywords = db.prepare(`
      SELECT k.*, 
             kc.cluster_name,
             gc.title as faq_title
      FROM keywords k
      LEFT JOIN keyword_clusters kc ON k.cluster_id = kc.id
      LEFT JOIN generated_content gc ON k.id = gc.keyword_id
      WHERE k.project_id = ?
      ORDER BY k.search_volume DESC
    `).all(projectId);

    res.json({ keywords });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// 3. GET /api/export/:projectId - Export keywords as CSV
app.get('/api/export/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate projectId
    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    // Get project name for filename
    const project = db.prepare(`
      SELECT name FROM projects WHERE id = ? AND status = 'active'
    `).get(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const keywords = db.prepare(`
      SELECT k.keyword, k.search_volume, k.competition, k.cpc, 
             kc.cluster_name, gc.title as faq_title
      FROM keywords k
      LEFT JOIN keyword_clusters kc ON k.cluster_id = kc.id
      LEFT JOIN generated_content gc ON k.id = gc.keyword_id
      WHERE k.project_id = ?
      ORDER BY k.search_volume DESC
    `).all(projectId);

    // Convert to CSV
    const csvHeaders = 'Keyword,Search Volume,Competition,CPC,Cluster,FAQ Title';
    const csvRows = keywords.map(k => 
      `"${k.keyword.replace(/"/g, '""')}",${k.search_volume},${k.competition},${k.cpc},"${(k.cluster_name || '').replace(/"/g, '""')}","${(k.faq_title || '').replace(/"/g, '""')}"`
    );
    const csv = [csvHeaders, ...csvRows].join('\n');

    // Set response headers
    const filename = `keywords-${project.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    // Test database connection
    const result = db.prepare('SELECT COUNT(*) as count FROM projects').get();
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      projects_count: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message 
    });
  }
});

// Serve static files and handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Keywords Cluster Web Interface running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${path.resolve('./data/keywords-cluster.db')}`);
  console.log(`📁 Static files: ${path.resolve('./public')}`);
});
```

---

## API Specification

### Base URL
- **Local Development**: `http://localhost:3000/api`
- **Production**: `{domain}/api`

### Endpoints

#### 1. Dashboard Data
```
GET /api/data
```
**Description**: Get all projects and overview statistics for dashboard
**Response**:
```json
{
  "projects": [
    {
      "id": 1,
      "name": "example.com",
      "project_type": "domain",
      "domain": "example.com",
      "url": null,
      "status": "active",
      "keyword_count": 2341,
      "last_processed": "2025-07-31T10:30:00Z",
      "created_at": "2025-07-28T14:20:00Z"
    }
  ],
  "stats": {
    "total_projects": 12,
    "total_keywords": 45230,
    "total_clusters": 567
  }
}
```

#### 2. Project Keywords
```
GET /api/keywords/:projectId
```
**Description**: Get all keywords for a specific project
**Parameters**:
- `projectId` (integer): Project ID

**Response**:
```json
{
  "keywords": [
    {
      "id": 1,
      "keyword": "example keyword",
      "search_volume": 1200,
      "competition": 0.65,
      "cpc": 2.45,
      "position": 15,
      "cluster_id": 12,
      "cluster_name": "Product Keywords",
      "faq_title": "How to use example keyword effectively",
      "created_at": "2025-07-31T10:30:00Z"
    }
  ]
}
```

#### 3. Export Keywords
```
GET /api/export/:projectId
```
**Description**: Export project keywords as CSV file
**Parameters**:
- `projectId` (integer): Project ID

**Response**: CSV file download
**Content-Type**: `text/csv`
**Filename**: `keywords-{project_name}-{date}.csv`

#### 4. Health Check
```
GET /api/health
```
**Description**: Server and database health status
**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "projects_count": 12,
  "timestamp": "2025-07-31T12:00:00Z"
}
```

---

## Database Integration

### Database Schema Requirements
The server assumes the following SQLite tables exist:

#### Projects Table
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  project_type TEXT CHECK(project_type IN ('domain', 'subfolder')),
  domain TEXT,
  url TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Keywords Table
```sql
CREATE TABLE keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  competition REAL,
  cpc REAL,
  position INTEGER,
  cluster_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

#### Supporting Tables
- `keyword_clusters`: For cluster names
- `generated_content`: For FAQ titles
- `processing_runs`: For last processed dates

### Database Connection
- **File**: `./data/keywords-cluster.db`
- **Mode**: Read-only (`{ readonly: true }`)
- **Driver**: `better-sqlite3`
- **Connection**: Single persistent connection

---

## Dependencies

### Package.json
```json
{
  "name": "keywords-cluster-web",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.6.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### Installation
```bash
npm install express better-sqlite3 cors
npm install --save-dev nodemon
```

---

## Development Workflow

### Setup Steps
1. **Install dependencies**: `npm install`
2. **Verify database**: Ensure `./data/keywords-cluster.db` exists
3. **Start server**: `npm run dev` (with nodemon) or `npm start`
4. **Test endpoints**: Visit `http://localhost:3000/api/health`

### Testing Endpoints
```bash
# Test dashboard data
curl http://localhost:3000/api/data

# Test keywords for project ID 1
curl http://localhost:3000/api/keywords/1

# Test export (downloads CSV)
curl http://localhost:3000/api/export/1 -o keywords.csv

# Test health check
curl http://localhost:3000/api/health
```

---

## Error Handling

### HTTP Status Codes
- **200**: Success
- **400**: Bad request (invalid parameters)
- **404**: Resource not found
- **500**: Server error

### Error Response Format
```json
{
  "error": "Error message description"
}
```

### Logging
- All errors logged to console with `console.error()`
- Database errors include full stack trace in development
- No sensitive information in error responses

---

## Security Considerations

### Read-Only Access
- Database opened in read-only mode
- No write operations possible from web interface
- All mutations happen through CLI tools only

### Input Validation
- Project ID parameters validated as integers
- SQL injection prevented by prepared statements
- CSV export filenames sanitized

### CORS Configuration
- CORS enabled for local development
- Production should restrict to specific origins

---

## Performance Considerations

### Database Queries
- All queries use prepared statements for performance
- Indexes assumed on frequently queried columns
- No pagination - all data loaded at once for client-side processing

### Memory Usage
- Single persistent database connection
- No caching layer needed (SQLite is fast enough)
- Graceful shutdown closes database connection

### Scaling Limitations
- Single-threaded Node.js suitable for personal use
- For high concurrency, consider connection pooling
- Large datasets (>10k keywords) may require pagination

---

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper PORT environment variable
- [ ] Ensure database file exists and is readable
- [ ] Set up proper CORS origins
- [ ] Configure reverse proxy (nginx) if needed
- [ ] Set up process management (PM2)

### Environment Variables
```bash
PORT=3000                    # Server port
NODE_ENV=production          # Environment mode
DATABASE_PATH=./data/keywords-cluster.db  # Database file path
```

This minimal backend design ensures simplicity while providing all necessary data for the frontend interface.