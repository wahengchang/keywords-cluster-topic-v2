# Technical Development Plan
## Batch Processing & Performance Optimization Architecture

### Architecture Overview
Transform clustering from monolithic (~1 hour) to batch-oriented (~5 minutes initial results) with persistence, building on existing Node.js/SQLite foundation. Maintain compatibility with existing PRODUCT_REQUIREMENTS.md and USER_STORIES.md specifications.

### Core Components

#### 1. Batch Processing Engine
**Location**: `src/clustering/batch-processor.js`
- Split dataset into configurable batches (default: 500 keywords)
- Process batches sequentially with K-means optimization
- Track completion status per batch

#### 2. Enhanced Database Schema Extensions
Add batch tracking tables to existing schema:

```sql
-- Batch processing runs
CREATE TABLE batch_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  batch_number INTEGER NOT NULL,
  batch_size INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  keywords_processed INTEGER DEFAULT 0,
  clusters_generated INTEGER DEFAULT 0,
  titles_generated INTEGER DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  processing_time_ms INTEGER,
  FOREIGN KEY (run_id) REFERENCES processing_runs (id)
);

-- Batch checkpoint data
CREATE TABLE batch_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  batch_number INTEGER NOT NULL,
  cluster_state TEXT, -- JSON serialized K-means state
  processed_keywords TEXT, -- JSON array of processed keyword IDs
  centroids TEXT, -- JSON serialized centroids
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES processing_runs (id)
);
```

#### 3. Persistence Layer
**Location**: `src/persistence/checkpoint-manager.js`
- Save/restore K-means algorithm state between batches
- Track processed keywords and cluster assignments
- Resume from last completed batch on interruption

#### 4. Progressive Title Generation
**Location**: `src/content/batch-title-generator.js`
- Generate titles immediately after cluster batch completion
- Queue title generation jobs per batch
- Allow partial export of completed titles

### Implementation Priority

#### Phase 1: Batch Infrastructure (Week 1)
- [ ] Create batch processing database schema extensions
- [ ] Implement `BatchProcessor` class with configurable batch sizes
- [ ] Add checkpoint save/restore functionality
- [ ] Update CLI with batch control commands

#### Phase 2: Optimized Clustering (Week 1)
- [ ] Optimize K-means parameters for faster convergence
- [ ] Implement early stopping criteria for stable clusters
- [ ] Add memory management for large batches
- [ ] Create progress reporting mechanisms

#### Phase 3: Title Generation Pipeline (Week 1)
- [ ] Implement batch-aware title generation
- [ ] Add queue management for title jobs
- [ ] Create partial results export functionality
- [ ] Add title generation progress tracking

### Key Technical Decisions

#### Batch Size Strategy
- Start with 10% of total keywords for immediate results
- Subsequent batches: 500-1000 keywords (configurable)
- Auto-adjust based on available memory and performance

#### Persistence Approach  
- Serialize K-means state (centroids, assignments) as JSON
- Store in `batch_checkpoints` table for quick recovery
- Checkpoint after each batch completion

#### Performance Optimizations
- Use optimized K-means++ initialization
- Implement early stopping (convergence threshold: 0.01)
- Limit iterations per batch (max: 100)
- Memory-efficient vector operations

### Integration Points

#### CLI Interface Updates
```bash
# Enhanced commands for batch processing
npm run create --domain=example.com --batch-size=500    # CREATE with batch processing
npm run rescrape --project=example-com --batch-size=500 # RESCRAPE with batch processing  
npm run resume --project=example-com                    # BATCH-RESUME operation
npm run status --project=example-com --show-batches     # Show batch progress
```

#### Existing Components
- Leverage current `DatabaseSchema` with extensions
- Use existing `generated_content` table for titles
- Maintain compatibility with current export formats

### Risk Mitigation
- Graceful degradation to original clustering if batch fails
- Comprehensive logging for batch operations debugging
- Rollback capability for failed batch operations
- Data integrity checks between batches