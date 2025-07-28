CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domain TEXT,
  url TEXT,
  project_type TEXT,
  slug TEXT UNIQUE,
  configuration TEXT,
  status TEXT DEFAULT 'active',
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_processed DATETIME
);

CREATE TABLE IF NOT EXISTS processing_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  run_type TEXT,
  scrape_date DATE,
  status TEXT DEFAULT 'pending',
  stage TEXT,
  progress INTEGER DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  processing_stats TEXT,
  FOREIGN KEY (project_id) REFERENCES projects (id)
);

CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  run_id INTEGER,
  keyword TEXT,
  cleaned_keyword TEXT,
  search_volume INTEGER,
  competition REAL,
  intent TEXT,
  cluster_id INTEGER,
  priority_score REAL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects (id),
  FOREIGN KEY (run_id) REFERENCES processing_runs (id)
);

CREATE TABLE IF NOT EXISTS generated_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  run_id INTEGER,
  content_type TEXT,
  content TEXT,
  keywords TEXT,
  cluster_id INTEGER,
  quality_score REAL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects (id),
  FOREIGN KEY (run_id) REFERENCES processing_runs (id)
);
