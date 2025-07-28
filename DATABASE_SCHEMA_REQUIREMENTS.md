# Database Schema Requirements Document

## Document Information
- **Version**: 1.0.0
- **Date**: 2025-07-28
- **Status**: Draft
- **Purpose**: Define comprehensive database schema for Keywords Cluster Topic Automation V2

---

## 1. Schema Overview

### 1.1 Data Flow Analysis
Based on the sample CSV and processing pipeline, the system handles:
1. **Raw SEMrush Data**: Keywords with position, volume, competition metrics
2. **Processed Data**: Cleaned, deduplicated, and classified keywords
3. **Analysis Results**: Clusters, priorities, and AI-generated content
4. **Historical Tracking**: Multiple data collections per project with dates

### 1.2 Core Tables Design

#### 1.2.1 Projects Table (Enhanced)
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domain TEXT, -- For domain-level projects
  url TEXT, -- For subfolder-level projects  
  project_type TEXT CHECK(project_type IN ('domain', 'subfolder')),
  slug TEXT UNIQUE NOT NULL,
  configuration TEXT, -- JSON: clustering params, AI settings, filters
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
  tags TEXT, -- JSON array for categorization
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_processed DATETIME,
  
  -- Indexes
  INDEX idx_projects_slug (slug),
  INDEX idx_projects_domain (domain),
  INDEX idx_projects_status (status),
  INDEX idx_projects_type (project_type)
);
```

#### 1.2.2 Processing Runs Table (Enhanced)
```sql
CREATE TABLE processing_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  run_type TEXT NOT NULL CHECK(run_type IN ('create', 'rescrape', 'writemore', 'analyze')),
  scrape_date DATE NOT NULL, -- The date for this data collection
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  current_stage TEXT, -- Current pipeline stage
  total_stages INTEGER DEFAULT 8,
  completed_stages INTEGER DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  processing_stats TEXT, -- JSON: timing, counts, API usage
  semrush_api_calls INTEGER DEFAULT 0,
  openai_api_calls INTEGER DEFAULT 0,
  
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_runs_project (project_id),
  INDEX idx_runs_date (scrape_date),
  INDEX idx_runs_type (run_type),
  INDEX idx_runs_status (status)
);
```

#### 1.2.3 Raw Keywords Table (New - for SEMrush data)
```sql
CREATE TABLE raw_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  run_id INTEGER NOT NULL,
  
  -- SEMrush CSV columns
  keyword TEXT NOT NULL,
  position INTEGER,
  previous_position INTEGER,
  position_difference INTEGER,
  search_volume INTEGER,
  cpc REAL,
  url TEXT,
  traffic_percent REAL,
  traffic_cost_percent REAL,
  competition REAL,
  number_of_results INTEGER,
  trends TEXT, -- JSON array of trend values
  
  -- Processing metadata
  is_processed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_raw_keywords_project (project_id),
  INDEX idx_raw_keywords_run (run_id),
  INDEX idx_raw_keywords_keyword (keyword),
  INDEX idx_raw_keywords_volume (search_volume),
  INDEX idx_raw_keywords_processed (is_processed)
);
```

#### 1.2.4 Processed Keywords Table (Enhanced)
```sql
CREATE TABLE keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  run_id INTEGER NOT NULL,
  raw_keyword_id INTEGER, -- Link to original raw data
  
  -- Processed keyword data
  keyword TEXT NOT NULL, -- Original keyword
  cleaned_keyword TEXT, -- Normalized/cleaned version
  
  -- SEMrush metrics (copied from raw)
  search_volume INTEGER,
  competition REAL,
  cpc REAL,
  position INTEGER,
  traffic_percent REAL,
  trends TEXT, -- JSON array
  
  -- AI Analysis results
  intent TEXT CHECK(intent IN ('informational', 'navigational', 'commercial', 'transactional')),
  intent_confidence REAL,
  
  -- Clustering results
  cluster_id INTEGER,
  cluster_name TEXT,
  cluster_center_distance REAL,
  
  -- Prioritization
  priority_score REAL,
  priority_rank INTEGER,
  priority_tier TEXT CHECK(priority_tier IN ('high', 'medium', 'low')),
  
  -- Additional metadata
  word_count INTEGER,
  character_count INTEGER,
  contains_brand BOOLEAN DEFAULT FALSE,
  is_question BOOLEAN DEFAULT FALSE,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_id INTEGER, -- References another keyword id
  
  metadata TEXT, -- JSON blob for extensibility
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE,
  FOREIGN KEY (raw_keyword_id) REFERENCES raw_keywords (id),
  FOREIGN KEY (duplicate_of_id) REFERENCES keywords (id),
  
  -- Indexes
  INDEX idx_keywords_project (project_id),
  INDEX idx_keywords_run (run_id),
  INDEX idx_keywords_cluster (cluster_id),
  INDEX idx_keywords_intent (intent),
  INDEX idx_keywords_priority (priority_score),
  INDEX idx_keywords_volume (search_volume),
  INDEX idx_keywords_cleaned (cleaned_keyword)
);
```

#### 1.2.5 Keyword Clusters Table (New)
```sql
CREATE TABLE keyword_clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  run_id INTEGER NOT NULL,
  
  cluster_id INTEGER NOT NULL, -- Cluster identifier within the run
  cluster_name TEXT,
  cluster_theme TEXT, -- AI-generated theme description
  
  -- Cluster statistics
  keyword_count INTEGER DEFAULT 0,
  total_search_volume INTEGER DEFAULT 0,
  avg_competition REAL,
  avg_cpc REAL,
  
  -- Cluster center (for K-means)
  center_vector TEXT, -- JSON array of cluster center coordinates
  
  -- Analysis metrics
  coherence_score REAL, -- How well keywords fit together
  commercial_intent_ratio REAL, -- Percentage of commercial keywords
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_clusters_project (project_id),
  INDEX idx_clusters_run (run_id),
  INDEX idx_clusters_id (cluster_id),
  INDEX idx_clusters_volume (total_search_volume)
);
```

#### 1.2.6 Generated Content Table (Enhanced)
```sql
CREATE TABLE generated_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  run_id INTEGER NOT NULL,
  
  content_type TEXT NOT NULL CHECK(content_type IN ('title', 'topic', 'meta_description', 'outline')),
  content TEXT NOT NULL,
  
  -- Source keywords
  primary_keyword_id INTEGER, -- Main keyword for this content
  related_keywords TEXT, -- JSON array of keyword IDs
  cluster_id INTEGER,
  
  -- AI generation metadata
  ai_model TEXT, -- Which model generated this
  prompt_used TEXT, -- The prompt that generated this content
  generation_params TEXT, -- JSON: temperature, max_tokens, etc.
  
  -- Quality metrics
  quality_score REAL,
  relevance_score REAL,
  uniqueness_score REAL,
  
  -- Content analysis
  word_count INTEGER,
  character_count INTEGER,
  readability_score REAL,
  
  -- Usage tracking
  is_approved BOOLEAN DEFAULT FALSE,
  is_used BOOLEAN DEFAULT FALSE,
  usage_notes TEXT,
  
  metadata TEXT, -- JSON blob for extensibility
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE,
  FOREIGN KEY (primary_keyword_id) REFERENCES keywords (id),
  
  -- Indexes
  INDEX idx_content_project (project_id),
  INDEX idx_content_run (run_id),
  INDEX idx_content_type (content_type),
  INDEX idx_content_cluster (cluster_id),
  INDEX idx_content_quality (quality_score),
  INDEX idx_content_approved (is_approved)
);
```

#### 1.2.7 Processing Logs Table (New)
```sql
CREATE TABLE processing_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  
  stage TEXT NOT NULL, -- Which pipeline stage
  level TEXT NOT NULL CHECK(level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  details TEXT, -- JSON blob with additional context
  duration_ms INTEGER, -- How long this step took
  
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_logs_run (run_id),
  INDEX idx_logs_level (level),
  INDEX idx_logs_timestamp (timestamp)
);
```

#### 1.2.8 API Usage Tracking Table (New)
```sql
CREATE TABLE api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER,
  
  api_provider TEXT NOT NULL CHECK(api_provider IN ('semrush', 'openai')),
  endpoint TEXT,
  method TEXT,
  request_size INTEGER,
  response_size INTEGER,
  duration_ms INTEGER,
  cost_estimate REAL,
  status_code INTEGER,
  error_message TEXT,
  
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_api_usage_run (run_id),
  INDEX idx_api_usage_provider (api_provider),
  INDEX idx_api_usage_timestamp (timestamp)
);
```

### 1.3 Data Relationships

#### 1.3.1 Core Relationships
- **Project → Processing Runs**: One-to-many (historical tracking)
- **Processing Run → Raw Keywords**: One-to-many (SEMrush data per run)
- **Processing Run → Keywords**: One-to-many (processed data per run)
- **Processing Run → Clusters**: One-to-many (cluster analysis per run)
- **Processing Run → Generated Content**: One-to-many (AI content per run)
- **Raw Keywords → Keywords**: One-to-one (processing pipeline)
- **Keywords → Clusters**: Many-to-one (clustering assignment)

#### 1.3.2 Advanced Relationships
- **Keywords → Keywords**: Self-referencing for duplicates
- **Keywords → Generated Content**: One-to-many for content generation
- **Clusters → Generated Content**: One-to-many for cluster-based content

### 1.4 Data Migration Strategy

#### 1.4.1 From File-Based System
1. **Project Discovery**: Scan existing project directories
2. **Data Parsing**: Parse CSV files and extract metadata
3. **Date Inference**: Use file timestamps for scrape dates
4. **Data Import**: Import into new schema with preserved history
5. **Validation**: Verify data integrity and relationships

#### 1.4.2 Migration Script Requirements
```sql
-- Migration tracking
CREATE TABLE migration_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_path TEXT NOT NULL,
  project_id INTEGER,
  status TEXT CHECK(status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  migrated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 1.5 Performance Considerations

#### 1.5.1 Indexing Strategy
- **Primary Keys**: All tables have auto-increment primary keys
- **Foreign Keys**: Indexed for join performance
- **Query Patterns**: Indexes on frequently filtered columns
- **Composite Indexes**: For complex query patterns

#### 1.5.2 Storage Optimization
- **Data Types**: Appropriate SQLite types for space efficiency
- **JSON Fields**: For flexible metadata storage
- **Normalization**: Balance between normalization and query performance

### 1.6 Data Integrity Rules

#### 1.6.1 Constraints
- **Check Constraints**: Validate enum values
- **Foreign Key Constraints**: Maintain referential integrity
- **Unique Constraints**: Prevent duplicate data
- **NOT NULL**: Required fields enforced

#### 1.6.2 Business Rules
- **Project Uniqueness**: Project slugs must be unique
- **Run Dating**: Each run must have a valid scrape date
- **Keyword Processing**: Raw keywords must be processed in order
- **Content Generation**: Content must reference valid keywords/clusters

---

## 2. Implementation Phases

### Phase 1: Core Schema
- Projects, Processing Runs, Raw Keywords, Keywords tables
- Basic CLI operations for project management
- Data import from CSV files

### Phase 2: Analysis Features
- Clusters, Generated Content tables
- Processing pipeline implementation
- API usage tracking

### Phase 3: Advanced Features
- Processing logs for debugging
- Migration tools for existing data
- Performance optimization

### Phase 4: Web Interface
- Additional tables for UI state management
- User preferences and settings
- Export/import functionality

---

## 3. Success Metrics

### 3.1 Data Integrity
- Zero data loss during migration
- Consistent relationships across all tables
- Proper handling of concurrent operations

### 3.2 Performance Targets
- Project listing: < 100ms
- Keyword search: < 200ms
- Full processing run: Within historical benchmarks
- Database size: Efficient storage utilization

### 3.3 Usability Goals
- Simple migration from file-based system
- Clear data lineage and history tracking
- Easy data export and analysis capabilities