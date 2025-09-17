# Database Module Documentation

SQLite-based data layer for keyword clustering with 13 interconnected tables, batch processing, and transaction safety.

## Database Architecture Overview

```plantuml
@startuml Database_Schema
!define ENTITY class
!define PK <<PK>>
!define FK <<FK>>

ENTITY projects {
  + id PK
  --
  name : TEXT NOT NULL
  domain : TEXT
  url : TEXT
  project_type : TEXT
  slug : TEXT UNIQUE
  configuration : TEXT
  status : TEXT
  tags : TEXT
  created_at : DATETIME
  updated_at : DATETIME
  last_processed : DATETIME
}

ENTITY processing_runs {
  + id PK
  --
  project_id : INTEGER FK
  run_type : TEXT
  scrape_date : DATE
  status : TEXT
  current_stage : TEXT
  total_stages : INTEGER
  completed_stages : INTEGER
  progress_percent : INTEGER
  started_at : DATETIME
  completed_at : DATETIME
  error_message : TEXT
  processing_stats : TEXT
  semrush_api_calls : INTEGER
  openai_api_calls : INTEGER
}

ENTITY batch_runs {
  + id PK
  --
  project_id : INTEGER FK
  run_id : INTEGER FK
  batch_mode : TEXT
  total_keywords : INTEGER
  processed_keywords : INTEGER
  current_batch : INTEGER
  total_batches : INTEGER
  batch_size : INTEGER
  status : TEXT
  can_resume : BOOLEAN
  resume_data : TEXT
  configuration : TEXT
}

ENTITY raw_keywords {
  + id PK
  --
  project_id : INTEGER FK
  run_id : INTEGER FK
  keyword : TEXT NOT NULL
  position : INTEGER
  previous_position : INTEGER
  search_volume : INTEGER
  cpc : REAL
  url : TEXT
  traffic_percent : REAL
  competition : REAL
  number_of_results : INTEGER
  trends : TEXT
  is_processed : BOOLEAN
}

ENTITY keywords {
  + id PK
  --
  project_id : INTEGER FK
  run_id : INTEGER FK
  raw_keyword_id : INTEGER FK
  keyword : TEXT NOT NULL
  cleaned_keyword : TEXT
  is_cleaned : BOOLEAN
  quality_score : REAL
  search_volume : INTEGER
  competition : REAL
  duplicate_group_id : INTEGER
  master_keyword_id : INTEGER FK
  intent : TEXT
  intent_confidence : REAL
  cluster_id : INTEGER
  cluster_name : TEXT
  priority_score : REAL
  priority_rank : INTEGER
  priority_tier : TEXT
}

ENTITY keyword_clusters {
  + id PK
  --
  project_id : INTEGER FK
  run_id : INTEGER FK
  cluster_name : TEXT
  cluster_theme : TEXT
  keyword_count : INTEGER
  total_search_volume : INTEGER
  avg_competition : REAL
  coherence_score : REAL
  center_vector : TEXT
}

ENTITY generated_content {
  + id PK
  --
  project_id : INTEGER FK
  run_id : INTEGER FK
  content_type : TEXT
  content : TEXT NOT NULL
  primary_keyword_id : INTEGER FK
  related_keywords : TEXT
  cluster_id : INTEGER
  quality_score : REAL
  is_approved : BOOLEAN
  is_used : BOOLEAN
}

ENTITY batch_checkpoints {
  + id PK
  --
  batch_run_id : INTEGER FK
  checkpoint_type : TEXT
  stage_name : TEXT
  batch_number : INTEGER
  keywords_processed : INTEGER
  cluster_state : TEXT
  processing_state : TEXT
  validation_hash : TEXT
  is_recoverable : BOOLEAN
}

ENTITY deduplication_groups {
  + id PK
  --
  project_id : INTEGER FK
  run_id : INTEGER FK
  group_type : TEXT
  master_keyword_id : INTEGER FK
  keyword_count : INTEGER
  similarity_threshold : REAL
}

ENTITY processing_logs {
  + id PK
  --
  run_id : INTEGER FK
  stage : TEXT
  level : TEXT
  message : TEXT
  details : TEXT
  duration_ms : INTEGER
  timestamp : DATETIME
}

ENTITY api_usage {
  + id PK
  --
  run_id : INTEGER FK
  api_provider : TEXT
  endpoint : TEXT
  method : TEXT
  duration_ms : INTEGER
  cost_estimate : REAL
  status_code : INTEGER
  timestamp : DATETIME
}

ENTITY priority_analysis {
  + id PK
  --
  project_id : INTEGER FK
  run_id : INTEGER FK
  high_priority_count : INTEGER
  medium_priority_count : INTEGER
  low_priority_count : INTEGER
  top_opportunities : TEXT
  scoring_weights : TEXT
}

ENTITY metadata {
  + key PK
  --
  value : TEXT
  updated_at : DATETIME
}

projects ||--o{ processing_runs : "has many"
projects ||--o{ batch_runs : "has many"
projects ||--o{ raw_keywords : "has many"
projects ||--o{ keywords : "has many"
projects ||--o{ keyword_clusters : "has many"
projects ||--o{ generated_content : "has many"
projects ||--o{ deduplication_groups : "has many"
projects ||--o{ priority_analysis : "has many"

processing_runs ||--o{ raw_keywords : "has many"
processing_runs ||--o{ keywords : "has many"
processing_runs ||--o{ keyword_clusters : "has many"
processing_runs ||--o{ generated_content : "has many"
processing_runs ||--o{ deduplication_groups : "has many"
processing_runs ||--o{ processing_logs : "has many"
processing_runs ||--o{ api_usage : "has many"
processing_runs ||--o{ priority_analysis : "has many"
processing_runs ||--o{ batch_runs : "has many"

batch_runs ||--o{ batch_checkpoints : "has many"

raw_keywords ||--|| keywords : "processed into"
keywords ||--o{ deduplication_groups : "master of"
keywords ||--|| generated_content : "generates"

@enduml
```

## Database Location & Safety
- **File**: `data/keywords-cluster.db` (18MB+ active)
- **Mode**: SQLite WAL (write-ahead logging)
- **Safety**: Foreign key constraints, ACID transactions

## Core Components

- **connection.js** - SQLite connection with WAL mode and foreign keys
- **schema.js** - 13 tables, 20+ indexes, foreign key constraints
- **models/** - Base CRUD + specialized models (Project, Keyword, ProcessingRun, etc.)
- **migration.js** - CSV import/export and legacy data migration

## Essential Usage

```javascript
// Initialize
const db = await getDatabase();
const projectModel = new ProjectModel(db);

// Safe operations with transactions
projectModel.transaction(() => {
  const project = projectModel.create(projectData);
  const run = processingRunModel.startRun(project.id);
  return { project, run };
});
```

## Critical Safety Rules

⚠️ **Always use model layer** - Never raw SQL
⚠️ **Wrap multi-operations in transactions** - Use `model.transaction()`
⚠️ **Foreign key cascades** - Deletion removes ALL related data
⚠️ **Backup before destructive ops** - Database has 18MB+ of data