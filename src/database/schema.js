class DatabaseSchema {
  static createTables(db) {
    // Projects table
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        domain TEXT,
        url TEXT,
        project_type TEXT CHECK(project_type IN ('domain', 'subfolder')),
        slug TEXT UNIQUE NOT NULL,
        configuration TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_processed DATETIME
      )
    `);

    // Processing runs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS processing_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        run_type TEXT NOT NULL CHECK(run_type IN ('create', 'rescrape', 'writemore', 'analyze')),
        scrape_date DATE NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        current_stage TEXT,
        total_stages INTEGER DEFAULT 8,
        completed_stages INTEGER DEFAULT 0,
        progress_percent INTEGER DEFAULT 0,
        started_at DATETIME,
        completed_at DATETIME,
        error_message TEXT,
        processing_stats TEXT,
        semrush_api_calls INTEGER DEFAULT 0,
        openai_api_calls INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // Raw keywords table - based on CSV structure
    db.exec(`
      CREATE TABLE IF NOT EXISTS raw_keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        run_id INTEGER NOT NULL,
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
        trends TEXT,
        is_processed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE
      )
    `);

    // Processed keywords table
    db.exec(`
      CREATE TABLE IF NOT EXISTS keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        run_id INTEGER NOT NULL,
        raw_keyword_id INTEGER,
        keyword TEXT NOT NULL,
        cleaned_keyword TEXT,
        is_cleaned BOOLEAN DEFAULT FALSE,
        original_keyword TEXT,
        quality_score REAL,
        search_volume INTEGER,
        competition REAL,
        cpc REAL,
        position INTEGER,
        traffic_percent REAL,
        trends TEXT,
        duplicate_group_id INTEGER,
        master_keyword_id INTEGER,
        cleaning_metadata TEXT,
        deduplication_notes TEXT,
        intent TEXT CHECK(intent IN ('informational', 'navigational', 'commercial', 'transactional')),
        intent_confidence REAL,
        cluster_id INTEGER,
        semantic_cluster_id INTEGER,
        cluster_name TEXT,
        cluster_center_distance REAL,
        priority_score REAL,
        priority_rank INTEGER,
        priority_tier TEXT CHECK(priority_tier IN ('high', 'medium', 'low')),
        difficulty_score REAL,
        opportunity_score REAL,
        business_value_score REAL,
        cluster_coherence_score REAL,
        word_count INTEGER,
        character_count INTEGER,
        contains_brand BOOLEAN DEFAULT FALSE,
        is_question BOOLEAN DEFAULT FALSE,
        is_duplicate BOOLEAN DEFAULT FALSE,
        duplicate_of_id INTEGER,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE,
        FOREIGN KEY (raw_keyword_id) REFERENCES raw_keywords (id),
        FOREIGN KEY (duplicate_of_id) REFERENCES keywords (id),
        FOREIGN KEY (master_keyword_id) REFERENCES keywords (id)
      )
    `);

    // Deduplication groups table
    db.exec(`
      CREATE TABLE IF NOT EXISTS deduplication_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        run_id INTEGER NOT NULL,
        group_type TEXT,
        master_keyword_id INTEGER,
        keyword_count INTEGER,
        similarity_threshold REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id),
        FOREIGN KEY (run_id) REFERENCES processing_runs (id),
        FOREIGN KEY (master_keyword_id) REFERENCES keywords (id)
      )
    `);

    // Keyword clusters table
    db.exec(`
      CREATE TABLE IF NOT EXISTS keyword_clusters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        run_id INTEGER NOT NULL,
        cluster_name TEXT,
        cluster_theme TEXT,
        cluster_description TEXT,
        keyword_count INTEGER DEFAULT 0,
        total_search_volume INTEGER DEFAULT 0,
        avg_competition REAL,
        avg_cpc REAL,
        coherence_score REAL,
        silhouette_score REAL,
        business_value_score REAL,
        center_vector TEXT,
        semantic_center TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id),
        FOREIGN KEY (run_id) REFERENCES processing_runs (id)
      )
    `);

    // Generated content table
    db.exec(`
      CREATE TABLE IF NOT EXISTS generated_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        run_id INTEGER NOT NULL,
        content_type TEXT NOT NULL CHECK(content_type IN ('title', 'topic', 'meta_description', 'outline')),
        content TEXT NOT NULL,
        primary_keyword_id INTEGER,
        related_keywords TEXT,
        cluster_id INTEGER,
        ai_model TEXT,
        prompt_used TEXT,
        generation_params TEXT,
        quality_score REAL,
        relevance_score REAL,
        uniqueness_score REAL,
        word_count INTEGER,
        character_count INTEGER,
        readability_score REAL,
        is_approved BOOLEAN DEFAULT FALSE,
        is_used BOOLEAN DEFAULT FALSE,
        usage_notes TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE,
        FOREIGN KEY (primary_keyword_id) REFERENCES keywords (id)
      )
    `);

    // Processing logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS processing_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        stage TEXT NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('debug', 'info', 'warn', 'error')),
        message TEXT NOT NULL,
        details TEXT,
        duration_ms INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE
      )
    `);

    // API usage tracking table
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_usage (
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
        FOREIGN KEY (run_id) REFERENCES processing_runs (id) ON DELETE CASCADE
      )
    `);

    // Priority analysis results
    db.exec(`
      CREATE TABLE IF NOT EXISTS priority_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        run_id INTEGER NOT NULL,
        high_priority_count INTEGER,
        medium_priority_count INTEGER,
        low_priority_count INTEGER,
        top_opportunities TEXT,
        quick_wins TEXT,
        long_term_targets TEXT,
        scoring_weights TEXT,
        analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id),
        FOREIGN KEY (run_id) REFERENCES processing_runs (id)
      )
    `);
  }

  static createIndexes(db) {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects (slug)',
      'CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects (domain)',
      'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)',
      'CREATE INDEX IF NOT EXISTS idx_runs_project ON processing_runs (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_runs_date ON processing_runs (scrape_date)',
      'CREATE INDEX IF NOT EXISTS idx_runs_status ON processing_runs (status)',
      'CREATE INDEX IF NOT EXISTS idx_raw_keywords_project ON raw_keywords (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_raw_keywords_run ON raw_keywords (run_id)',
      'CREATE INDEX IF NOT EXISTS idx_raw_keywords_keyword ON raw_keywords (keyword)',
      'CREATE INDEX IF NOT EXISTS idx_keywords_project ON keywords (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_keywords_run ON keywords (run_id)',
      'CREATE INDEX IF NOT EXISTS idx_keywords_cluster ON keywords (cluster_id)',
      'CREATE INDEX IF NOT EXISTS idx_keywords_intent ON keywords (intent)',
      'CREATE INDEX IF NOT EXISTS idx_keywords_master ON keywords (master_keyword_id)',
      'CREATE INDEX IF NOT EXISTS idx_clusters_project ON keyword_clusters (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_clusters_run ON keyword_clusters (run_id)',
      'CREATE INDEX IF NOT EXISTS idx_dedupe_project ON deduplication_groups (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_dedupe_run ON deduplication_groups (run_id)',
      'CREATE INDEX IF NOT EXISTS idx_content_project ON generated_content (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_content_run ON generated_content (run_id)',
      'CREATE INDEX IF NOT EXISTS idx_logs_run ON processing_logs (run_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_usage_run ON api_usage (run_id)',
      'CREATE INDEX IF NOT EXISTS idx_priority_run ON priority_analysis (run_id)'
    ];

    indexes.forEach(indexSql => {
      db.exec(indexSql);
    });
  }

  static insertDefaults(db) {
    // Insert any default data if needed
    console.log('Database schema and indexes created successfully');
  }
}

module.exports = DatabaseSchema;