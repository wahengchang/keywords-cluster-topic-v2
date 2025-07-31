# Web Interface Development Requirements (Simplified)

## Document Information
- **Version**: 2.0.0
- **Date**: 2025-07-31
- **Project**: Keywords Cluster Topic Tool - Web Interface
- **Status**: Simplified Development Specification

---

## Overview

This document outlines the simplified development requirements for creating a read-only web interface for the Keywords Cluster Topic tool. The design focuses on minimal backend API with a single Express.js file, while most logic resides in the frontend static files.

---

## Architecture Overview

### Technology Stack
```
Frontend: HTML5 + Vanilla JavaScript + CSS3 (Static Files)
Backend: Single Express.js file + better-sqlite3
Database: SQLite (existing keywords-cluster.db)
Models: Direct database queries (minimal ORM usage)
```

### Simplified System Architecture
```
Web Browser → Static Files (public/) → Simple Express API → Direct SQLite Queries
```

---

## Backend API Requirements (Simplified)

### 1. Single Express.js File Setup

#### Server Configuration
- **File**: `/server.js` (single file at project root)
- **Port**: 3000 (configurable via environment)
- **Static Files**: Serve `/public` directory
- **Minimal Dependencies**: express, better-sqlite3, cors

#### Single File Structure
```
/server.js                 # Complete Express server in one file
/public/                   # Static frontend files (existing structure)
```

### 2. Minimal API Endpoints (Only 3 endpoints)

#### Complete Server.js Example
```javascript
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const db = new Database('./data/keywords-cluster.db', { readonly: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Endpoints (Only 3 needed)

// 1. GET /api/data - Get ALL data in one call
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
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/keywords/:projectId - Get all keywords for a project
app.get('/api/keywords/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    
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
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/export/:projectId - Export keywords as CSV
app.get('/api/export/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    
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
    const csv = [
      'Keyword,Search Volume,Competition,CPC,Cluster,FAQ Title',
      ...keywords.map(k => 
        `"${k.keyword}",${k.search_volume},${k.competition},${k.cpc},"${k.cluster_name || ''}","${k.faq_title || ''}"`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="keywords.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files and handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## Frontend Requirements (Static Files with Heavy Logic)

### 1. Application Structure (Leveraging Existing public/ Structure)

#### Current Structure Analysis
```
/public/
├── index.html              # Will be modified for dashboard
├── css/
│   ├── main.css           # Base styles (existing)
│   └── components.css     # Component styles (existing)
├── js/
│   ├── store.js           # State management (existing)
│   ├── theme-handler.js   # Theme handling (existing)
│   ├── components/        # Component system (existing structure)
│   └── utils/             # Utilities (existing)
└── guide-to-develop.md    # Development guide (existing)
```

#### Enhanced Structure (Build on Existing)
```
/public/
├── index.html              # Enhanced dashboard page
├── project.html            # New project keywords page
├── css/
│   ├── main.css           # Enhanced base styles
│   ├── components.css     # Enhanced component styles  
│   └── dashboard.css      # New dashboard-specific styles
├── js/
│   ├── app.js             # New main application controller
│   ├── store.js           # Enhanced for keywords data
│   ├── api.js             # New API client (simple)
│   ├── filters.js         # New filtering logic
│   ├── components/
│   │   ├── dashboard.js   # New dashboard components
│   │   ├── keywords.js    # New keywords table component
│   │   └── modal.js       # New keyword detail modal
│   └── utils/
│       ├── search.js      # Client-side search logic
│       ├── sort.js        # Client-side sorting logic
│       └── export.js      # CSV export utility
```

### 2. Simple Frontend Logic (Client-Side Heavy)

#### Key Principles
- **Load once**: Fetch all data on page load, cache in memory
- **Client-side filtering**: All search, filter, sort happens in JavaScript
- **No pagination**: Handle large datasets with virtual scrolling
- **Simple state**: Use existing store.js pattern for state management

#### Enhanced index.html (Dashboard)
```html
<!DOCTYPE html>
<html>
<head>
    <title>Keywords Cluster - Dashboard</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/dashboard.css">
</head>
<body>
    <div id="loading" class="loading">Loading...</div>
    
    <header class="header">
        <h1>Keywords Cluster Topic Tool</h1>
        <div class="stats" id="stats"></div>
    </header>
    
    <main class="dashboard" id="dashboard" style="display: none;">
        <div class="search-bar">
            <input type="text" id="search" placeholder="Search projects..." />
            <select id="type-filter">
                <option value="">All Types</option>
                <option value="domain">Domain</option>
                <option value="subfolder">Subfolder</option>
            </select>
        </div>
        
        <div class="projects-grid" id="projects"></div>
    </main>
    
    <script src="js/store.js"></script>
    <script src="js/api.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
```

#### Simple API Client (js/api.js)
```javascript
// Simple API client - only 3 calls needed
class API {
  static BASE_URL = '/api';
  
  // Load all dashboard data at once
  static async loadDashboard() {
    const response = await fetch(`${this.BASE_URL}/data`);
    return response.json();
  }
  
  // Load all keywords for a project at once
  static async loadKeywords(projectId) {
    const response = await fetch(`${this.BASE_URL}/keywords/${projectId}`);
    return response.json();
  }
  
  // Export keywords as CSV
  static exportCSV(projectId) {
    window.location.href = `${this.BASE_URL}/export/${projectId}`;
  }
}
```

#### Enhanced Store (js/store.js)
```javascript
// Enhanced store for keywords data
const Store = {
  data: {
    projects: [],
    stats: {},
    currentProject: null,
    keywords: [],
    filteredKeywords: [],
    filters: {
      search: '',
      kdMin: 0,
      kdMax: 100,
      volumeMin: 0,
      volumeMax: null,
      competition: '',
      hasFaq: null
    },
    sort: { field: 'search_volume', order: 'desc' }
  },
  
  // Load dashboard data
  async loadDashboard() {
    const data = await API.loadDashboard();
    this.data.projects = data.projects;
    this.data.stats = data.stats;
    this.notify('dashboard-loaded');
  },
  
  // Load keywords for project
  async loadKeywords(projectId) {
    const data = await API.loadKeywords(projectId);
    this.data.keywords = data.keywords;
    this.data.currentProject = this.data.projects.find(p => p.id == projectId);
    this.applyFilters();
    this.notify('keywords-loaded');
  },
  
  // Client-side filtering (all in memory)
  applyFilters() {
    let filtered = [...this.data.keywords];
    const f = this.data.filters;
    
    // Text search
    if (f.search) {
      const search = f.search.toLowerCase();
      filtered = filtered.filter(k => 
        k.keyword.toLowerCase().includes(search)
      );
    }
    
    // KD range
    filtered = filtered.filter(k => 
      k.kd >= f.kdMin && k.kd <= f.kdMax
    );
    
    // Volume range
    if (f.volumeMax) {
      filtered = filtered.filter(k => 
        k.search_volume >= f.volumeMin && k.search_volume <= f.volumeMax
      );
    }
    
    // Competition level
    if (f.competition) {
      filtered = filtered.filter(k => 
        this.getCompetitionLevel(k.competition) === f.competition
      );
    }
    
    // Has FAQ
    if (f.hasFaq !== null) {
      filtered = filtered.filter(k => 
        f.hasFaq ? k.faq_title : !k.faq_title
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      const aVal = a[this.data.sort.field];
      const bVal = b[this.data.sort.field];
      const modifier = this.data.sort.order === 'desc' ? -1 : 1;
      return (aVal > bVal ? 1 : -1) * modifier;
    });
    
    this.data.filteredKeywords = filtered;
    this.notify('keywords-filtered');
  },
  
  // Update filters and re-apply
  updateFilters(newFilters) {
    this.data.filters = { ...this.data.filters, ...newFilters };
    this.applyFilters();
  },
  
  // Update sort and re-apply
  updateSort(field, order) {
    this.data.sort = { field, order };
    this.applyFilters();
  },
  
  // Simple competition level mapping
  getCompetitionLevel(value) {
    if (value < 0.33) return 'low';
    if (value < 0.66) return 'medium';
    return 'high';
  },
  
  // Simple observer pattern
  observers: [],
  subscribe(callback) {
    this.observers.push(callback);
  },
  notify(event) {
    this.observers.forEach(callback => callback(event, this.data));
  }
};
```

#### Project Card Component
```javascript
// /public/js/components/dashboard/project-card.js
class ProjectCard {
  constructor(project) {
    this.project = project;
  }
  
  render() {
    return `
      <div class="project-card" data-project-id="${this.project.id}">
        <div class="project-header">
          <h3 class="project-name">${this.project.name}</h3>
          <span class="project-type ${this.project.project_type}">${this.project.project_type}</span>
        </div>
        <div class="project-stats">
          <div class="stat">
            <span class="stat-value">${this.project.total_keywords.toLocaleString()}</span>
            <span class="stat-label">keywords</span>
          </div>
          <div class="stat">
            <span class="stat-value">${this.project.total_clusters}</span>
            <span class="stat-label">clusters</span>
          </div>
        </div>
        <div class="project-meta">
          <span class="last-processed">Updated: ${this.formatDate(this.project.last_processed)}</span>
        </div>
      </div>
    `;
  }
  
  formatDate(dateString) {
    // Format relative date (e.g., "2 hours ago")
  }
}
```

### 3. Project Keywords Page Requirements

#### Keywords Page Layout (project.html)
```html
<!DOCTYPE html>
<html>
<head>
    <title>Keywords - {Project Name}</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/components/keywords.css">
</head>
<body>
    <header class="main-header">
        <nav class="breadcrumb">
            <a href="/">Dashboard</a> > 
            <span id="project-name">Project Name</span>
        </nav>
        <div class="project-stats" id="project-stats"></div>
    </header>
    
    <main class="keywords-page">
        <aside class="filters-panel" id="filters-panel">
            <!-- Filter components -->
        </aside>
        
        <section class="keywords-content">
            <div class="keywords-toolbar">
                <div class="search-box">
                    <input type="text" id="keyword-search" placeholder="Search keywords...">
                </div>
                <div class="toolbar-actions">
                    <button id="export-btn">Export CSV</button>
                    <select id="sort-select">
                        <option value="volume-desc">Volume (High to Low)</option>
                        <option value="kd-asc">KD (Low to High)</option>
                        <option value="keyword-asc">Alphabetical</option>
                    </select>
                </div>
            </div>
            
            <div class="keywords-table-container">
                <table class="keywords-table" id="keywords-table">
                    <thead>
                        <tr>
                            <th data-sort="keyword">Keyword</th>
                            <th data-sort="volume">Volume</th>
                            <th data-sort="kd">KD</th>
                            <th data-sort="competition">Competition</th>
                            <th data-sort="cpc">CPC</th>
                            <th data-sort="cluster">Cluster</th>
                            <th>FAQ</th>
                        </tr>
                    </thead>
                    <tbody id="keywords-tbody">
                        <!-- Keywords will be populated here -->
                    </tbody>
                </table>
            </div>
            
            <div class="pagination" id="pagination">
                <!-- Pagination controls -->
            </div>
        </section>
    </main>
    
    <!-- Keyword Detail Modal -->
    <div class="modal" id="keyword-modal">
        <div class="modal-content" id="keyword-modal-content">
            <!-- Modal content will be populated -->
        </div>
    </div>
    
    <script src="js/app.js"></script>
    <script src="js/pages/project.js"></script>
</body>
</html>
```

#### Keywords Table Component
```javascript
// /public/js/components/keywords/keywords-table.js
class KeywordsTable {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentSort = { field: 'volume', order: 'desc' };
    this.currentFilters = {};
  }
  
  async loadKeywords(projectId, filters = {}, sort = null) {
    // Fetch keywords from API
    // Update table content
    // Handle pagination
  }
  
  renderKeywordRow(keyword) {
    return `
      <tr class="keyword-row" data-keyword-id="${keyword.id}">
        <td class="keyword-text">
          <span class="keyword-highlight">${keyword.keyword}</span>
        </td>
        <td class="volume-cell">
          <div class="volume-bar" style="width: ${this.getVolumeBarWidth(keyword.search_volume)}%"></div>
          <span class="volume-text">${keyword.search_volume.toLocaleString()}</span>
        </td>
        <td class="kd-cell">
          <span class="kd-badge kd-${this.getKDClass(keyword.kd)}">${keyword.kd}</span>
        </td>
        <td class="competition-cell">
          <span class="competition-level">${this.getCompetitionLevel(keyword.competition)}</span>
        </td>
        <td class="cpc-cell">$${keyword.cpc.toFixed(2)}</td>
        <td class="cluster-cell">
          <span class="cluster-name">${keyword.cluster_name || '-'}</span>
        </td>
        <td class="faq-cell">
          ${keyword.faq_title ? '<span class="faq-indicator">✓</span>' : '-'}
        </td>
      </tr>
    `;
  }
  
  getKDClass(kd) {
    if (kd <= 30) return 'easy';
    if (kd <= 60) return 'medium'; 
    return 'hard';
  }
}
```

### 4. Filter Components

#### Keyword Filters Panel
```javascript
// /public/js/components/keywords/keyword-filters.js
class KeywordFilters {
  constructor(containerId, onFilterChange) {
    this.container = document.getElementById(containerId);
    this.onFilterChange = onFilterChange;
    this.filters = {
      search: '',
      kd_min: 0,
      kd_max: 100,
      volume_min: 0,
      volume_max: null,
      competition: 'all',
      has_faq: null
    };
  }
  
  render() {
    this.container.innerHTML = `
      <div class="filters-section">
        <h3>Filters</h3>
        
        <div class="filter-group">
          <label>Keyword Difficulty</label>
          <div class="range-slider" id="kd-slider">
            <input type="range" min="0" max="100" value="0" id="kd-min">
            <input type="range" min="0" max="100" value="100" id="kd-max">
            <div class="range-display">
              <span id="kd-range-display">0 - 100</span>
            </div>
          </div>
        </div>
        
        <div class="filter-group">
          <label>Search Volume</label>
          <div class="range-inputs">
            <input type="number" placeholder="Min" id="volume-min">
            <input type="number" placeholder="Max" id="volume-max">
          </div>
        </div>
        
        <div class="filter-group">
          <label>Competition</label>
          <select id="competition-filter">
            <option value="all">All Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="checkbox-label">
            <input type="checkbox" id="has-faq-filter">
            Has FAQ Title
          </label>
        </div>
        
        <div class="filter-actions">
          <button id="apply-filters" class="btn-primary">Apply Filters</button>
          <button id="clear-filters" class="btn-secondary">Clear All</button>
        </div>
      </div>
    `;
    
    this.bindEvents();
  }
  
  bindEvents() {
    // Bind filter change events
    // Update filters object
    // Call onFilterChange callback
  }
}
```

---

## CSS Styling Requirements

### 1. Enhanced Main Styles
```css
/* /public/css/components/dashboard.css */
.dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.project-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

### 2. Keywords Table Styles
```css
/* /public/css/components/keywords.css */
.keywords-page {
  display: flex;
  height: calc(100vh - 80px);
}

.filters-panel {
  width: 280px;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  padding: 1rem;
  overflow-y: auto;
}

.keywords-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.keywords-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.keywords-table th {
  background: #f8f9fa;
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
  cursor: pointer;
}

.keywords-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #dee2e6;
}

.volume-bar {
  height: 4px;
  background: #007bff;
  border-radius: 2px;
  margin-bottom: 2px;
}

.kd-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.kd-easy { background: #d4edda; color: #155724; }
.kd-medium { background: #fff3cd; color: #856404; }
.kd-hard { background: #f8d7da; color: #721c24; }
```

---