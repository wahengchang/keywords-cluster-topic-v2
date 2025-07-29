# Keywords Cluster Topic Automation V2 - Product Requirements Document

## Document Information
- **Version**: 2.1.0
- **Date**: 2025-07-29
- **Status**: Updated with Database Management Features
- **Author**: System Architect
- **Stakeholders**: Development Team, Product Management, End Users

---

## 1. Executive Summary

### 1.1 Project Overview
The Keywords Cluster Topic Automation V2 project aims to rebuild the existing keyword research and content generation system from scratch, transforming it from a file-based CLI application into a simple, personal application with both CLI and web UI interfaces, backed by a SQLite database.

### 1.2 Business Objectives
- **Simplicity**: Personal application without user management complexity
- **Accessibility**: Provide both programmatic (CLI) and user-friendly (Web UI) interfaces
- **Data Integrity**: Replace file-based storage with SQLite database
- **Performance**: Improve processing speed and resource utilization
- **Maintainability**: Simple, monolithic architecture for easy maintenance

### 1.3 Success Criteria
- Successful migration of all existing functionality to the new architecture
- Fast response times for CLI operations
- Zero data loss during migration from existing file-based projects
- Simple deployment and maintenance

---

## 2. Current System Analysis

### 2.1 Existing Architecture Overview
The current system is a Node.js CLI application with the following characteristics:

**Strengths:**
- Well-defined 8-stage processing pipeline
- Modular workflow orchestration system
- Comprehensive data processing capabilities
- Strong external API integrations (SEMrush, OpenAI)

**Limitations:**
- File-based storage model
- No web interface
- Manual project management and isolation

### 2.2 Core Functionality to Preserve

#### 2.2.1 Data Processing Pipeline
1. **SEMrush Data Acquisition**: Fetch keyword data via API
2. **Data Cleaning**: Normalize and clean keyword data
3. **Deduplication**: Remove duplicate keywords
4. **Keyword Clustering**: Semantic grouping using K-means
5. **Prioritization**: Score and rank keywords
6. **Title Generation**: AI-powered content title creation with cost optimization
7. **Summary Generation**: Processing statistics and metrics

**Title Generation Cost Optimization:**
- Generate FAQ titles only for limited number of clusters to control AI API costs
- Skip title generation for clusters that already have existing titles in database
- Smart cluster selection based on keyword volume and priority scores

#### 2.2.2 Core Operations
- **CREATE**: Initialize new keyword analysis projects with full automation (domain check → SEMrush download → pipeline → FAQ generation)
- **RESCRAPE**: Update existing projects with fresh data and full automation (data check/update → pipeline → FAQ generation)
- **ANALYZE**: Cross-project data analysis and reporting
- **WRITEMORE**: Generate additional content from existing data (deprecated in favor of integrated FAQ generation)

---

## 3. Product Vision & Requirements

### 3.1 Vision Statement
To create a simple, personal keyword research and content generation application that maintains the powerful analytical capabilities of the existing system while providing modern web interfaces and clean database storage.

### 3.2 Target Users

#### 3.2.1 Primary User
- **Personal User**: Individual using the tool for keyword research and content strategy
- **SEO Specialist**: Personal keyword research and analysis
- **Content Creator**: Individual content title generation and planning

### 3.3 Core User Stories

#### 3.3.1 Project Management
```
As a user, I want to create domain-level projects so that I can analyze entire domain keywords
As a user, I want to create subfolder projects so that I can analyze specific URL paths
As a user, I want to view all my projects so that I can manage my work
As a user, I want to duplicate existing projects so that I can reuse configurations
As a user, I want to remove specific projects so that I can clean up unwanted data
As a user, I want to clear the entire database so that I can start fresh when needed
```

#### 3.3.2 Data Processing
```
As a user, I want to create new projects with automatic pipeline processing so that I get complete analysis without manual steps
As a user, I want to rescrape existing projects with automatic pipeline processing so that I can update data seamlessly
As a user, I want domain/URL validation to prevent duplicate projects so that I maintain clean data
As a user, I want automatic FAQ title generation with cost optimization so that I get content without overspending
As a user, I want smart data updates during rescrape so that historical data is preserved
As a user, I want to compare data between different collection dates so that I can identify changes
As a user, I want to analyze multiple projects together so that I can identify trends
```

#### 3.3.3 Interface Options
```
As a user, I want to use CLI commands so that I can automate workflows
As a user, I want to use a web interface so that I can work efficiently
As a user, I want to export data in multiple formats so that I can integrate with other tools
```

---

## 4. Functional Requirements

### 4.1 Project Management System

#### 4.1.1 Project Lifecycle
- **Project Creation**: Initialize projects with domain or URL path (subfolder) configuration
- **Duplicate Prevention**: Check existing projects before creation to prevent duplicates
- **Project Types**: Support both domain-level and subfolder-level projects
- **Automated Data Collection**: Automatic SEMrush data download and database insertion during creation
- **Rescrape Operations**: User-triggered rescrape with smart data update/insert logic
- **Project Configuration**: Settings for clustering, title generation, and processing options
- **Project Duplication**: Clone existing projects with all configurations
- **Project Archival**: Archive completed or obsolete projects
- **Project Deletion**: Complete project removal with safety confirmations
- **Database Cleanup**: Full database clearing with triple confirmation process

#### 4.1.2 Project Organization
- **Project Dashboard**: Overview of all user projects with status indicators
- **Project Search**: Search projects by name, domain, tags, or date
- **Project Filtering**: Filter by status, owner, date range, etc.
- **Project Tags**: Categorize projects with custom tags
- **Project Templates**: Save and reuse project configurations

### 4.2 Data Processing Engine

#### 4.2.1 Core Processing Pipeline
- **Modular Architecture**: Maintain existing 8-stage pipeline structure
- **Automated Processing**: Full pipeline automation for create and rescrape operations
- **User-initiated Operations**: Two main workflows (create, rescrape) with automatic pipeline execution
- **Date-based Runs**: Each processing run tagged with collection date
- **Progress Tracking**: Real-time progress updates for all operations
- **Error Handling**: Comprehensive error recovery and retry mechanisms
- **Processing History**: Complete audit trail of all processing steps with date tracking
- **Domain/URL Validation**: Check for existing projects before creation
- **Data Update Logic**: Smart update vs insert logic for rescrape operations

#### 4.2.2 Data Storage & Management
- **SQLite Database**: Local SQLite database for simple data storage
- **Time-based Storage**: Store multiple datasets per project with collection dates
- **Data Versioning**: Track changes and maintain historical versions by date
- **Historical Analysis**: Compare data across different collection dates
- **Automatic Migration**: Seamless API → CSV → Database flow without user intervention

#### 4.2.3 External API Management
- **Environment Variables**: API keys stored in environment variables
- **Rate Limiting**: Respect API limits and implement intelligent queuing
- **Error Handling**: Graceful handling of API failures and timeouts
- **Usage Tracking**: Monitor API usage and processing statistics

### 4.3 Analysis & Reporting

#### 4.3.1 Single Project Analysis
- **Keyword Analytics**: Search volume, competition, intent distribution
- **Cluster Analysis**: Cluster size, keyword density, topic themes
- **Content Performance**: Title generation success rates and quality
- **Trend Analysis**: Track keyword performance changes over time
- **Historical Comparison**: Compare data between different collection dates

#### 4.3.2 Multi-Project Analysis
- **Cross-Project Insights**: Compare keywords and topics across projects
- **Portfolio Analytics**: Aggregate statistics for all user projects
- **Competitive Analysis**: Compare multiple domains simultaneously
- **Trend Analysis**: Identify emerging keywords and topics
- **Custom Reports**: Build and save custom analytical reports

### 4.4 Database Management System

#### 4.4.1 Database Operations
- **Status Monitoring**: Real-time database health and statistics display
- **Project Listing**: Comprehensive project overview with metadata
- **Selective Removal**: Individual project deletion with safety confirmations
- **Complete Reset**: Full database clearing with triple confirmation process
- **Data Statistics**: Display keyword counts, processing runs, and storage metrics
- **Backup Safety**: CSV file preservation during all database operations

#### 4.4.2 Safety & Confirmation Protocols
- **Project Removal Process**:
  1. Project selection with detailed statistics display
  2. Warning message showing all data to be deleted
  3. Typed confirmation requiring exact project name
  4. Cascading deletion of all related records
  5. Success confirmation with freed space statistics

- **Database Clear Process**:
  1. Comprehensive data summary display
  2. Understanding confirmation (Yes/No)
  3. Typed confirmation requiring exact phrase "CLEAR ALL DATABASE"
  4. Final "last chance" confirmation
  5. Complete database wipe with counter reset
  6. CSV backup files remain untouched

### 4.5 Interface Requirements

#### 4.5.1 Web User Interface (Future Phase)
- **Responsive Design**: Mobile-friendly responsive web application
- **Dashboard**: Central hub for project management and analytics
- **Project Workspace**: Dedicated interface for project operations
- **Data Visualization**: Charts, graphs, and interactive visualizations
- **Real-Time Updates**: Live progress updates and notifications

#### 4.5.2 Command Line Interface (Phase 1)
- **Project Commands**: All core operations available via CLI
- **Database Management**: View project status, listings, and data removal operations
- **Automatic Processing**: Seamless API → CSV → Database workflow
- **Interactive Prompts**: User-friendly CLI interface with guided workflows
- **Safety Mechanisms**: Multi-step confirmation processes for destructive operations
- **Data Preservation**: CSV backups preserved during database operations

#### 4.5.3 Simple REST API (Future Phase)
- **Resource Management**: Basic CRUD operations for projects and data
- **Batch Endpoints**: Bulk operations for efficiency
- **Simple Access**: Direct access without authentication complexity

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

#### 5.1.1 Response Times
- **Web UI**: Page loads < 2 seconds, interactions < 500ms
- **CLI Commands**: Simple operations < 1 second, complex < 30 seconds
- **API Endpoints**: < 200ms for reads, < 2 seconds for writes
- **Data Processing**: Pipeline stages complete within historical benchmarks
- **Database Queries**: < 100ms for simple queries, < 1 second for complex

#### 5.1.2 Throughput
- **Processing Jobs**: Handle single-user processing efficiently
- **Data Volume**: Handle projects with 100K+ keywords efficiently
- **File Operations**: Support large exports (10MB+) without timeout

### 5.2 Resource Management

#### 5.2.1 Efficiency Requirements
- **Memory Usage**: Efficient memory utilization for large datasets
- **CPU Optimization**: Multi-core processing for intensive operations
- **Storage Efficiency**: Compact SQLite database storage
- **Network Bandwidth**: Optimize API communications

### 5.3 Reliability & Data Integrity

#### 5.3.1 Data Protection
- **SQLite ACID**: Built-in data consistency with SQLite transactions
- **Validation**: Input validation and data integrity checks
- **Error Handling**: Comprehensive error recovery mechanisms
- **Automatic Storage**: Seamless data persistence without manual intervention
- **Cascading Deletes**: Proper foreign key constraints for data consistency
- **Backup Preservation**: CSV files in /output/ directory preserved during database operations

#### 5.3.2 Safety Mechanisms
- **Multi-Step Confirmation**: Destructive operations require multiple confirmations
- **Typed Confirmations**: Exact phrase typing required for dangerous operations
- **Operation Cancellation**: Ability to cancel destructive operations at any step
- **Clear Warnings**: Explicit warnings about data loss and permanent deletion
- **Statistics Display**: Show exactly what will be deleted before confirmation

### 5.4 API Key Management

#### 5.4.1 Environment Variables
- **API Keys**: Store SEMrush and OpenAI API keys in environment variables
- **Configuration**: Simple configuration file for application settings
- **No Authentication**: Personal application without login requirements

### 5.5 Usability Requirements

#### 5.5.1 User Experience
- **Simple Interface**: Clean, intuitive interface for personal use
- **Error Messages**: Clear, actionable error messages and guidance
- **Help Documentation**: Basic user guides and CLI help
- **Automatic Workflow**: Streamlined API → CSV → Database process without manual steps

---

## 6. Technical Architecture

### 6.1 System Architecture Overview

#### 6.1.1 Simple Monolithic Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   CLI Client    │
│  (Future Phase) │    │                 │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                     │
         ┌─────────────────────────────────┐
         │     Single Application          │
         │                                 │
         │  ┌─────────────────────────────┐ │
         │  │      Core Engine            │ │
         │  │ • Project Management        │ │
         │  │ • Data Processing Pipeline  │ │
         │  │ • Analytics & Reporting     │ │
         │  └─────────────────────────────┘ │
         └─────────────────────────────────┘
                     │
         ┌─────────────────────────────────┐
         │       Data Storage              │
         │                                 │
         │  ┌─────────┐  ┌─────────────┐   │
         │  │ SQLite  │  │    File     │   │
         │  │Database │  │   Storage   │   │
         │  └─────────┘  └─────────────┘   │
         └─────────────────────────────────┘
                     │
         ┌─────────────────────────────────┐
         │      External APIs              │
         │                                 │
         │  ┌─────────┐  ┌─────────────┐   │
         │  │SEMrush  │  │   OpenAI    │   │
         │  │  API    │  │     API     │   │
         │  └─────────┘  └─────────────┘   │
         └─────────────────────────────────┘
```

#### 6.1.2 Simple Application Architecture
- **Monolithic Design**: Single application with modular components
- **Direct Database Access**: SQLite database with direct connections
- **Simple Processing**: Sequential processing without complex queuing
- **Environment Configuration**: API keys and settings in environment variables

### 6.2 Database Design

#### 6.2.1 SQLite Database Schema

**Projects Table:**
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domain TEXT, -- For domain-level projects
  url TEXT, -- For subfolder-level projects  
  project_type TEXT, -- 'domain' or 'subfolder'
  slug TEXT UNIQUE,
  configuration TEXT, -- JSON blob with processing settings
  status TEXT DEFAULT 'active',
  tags TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_processed DATETIME
);
```

**Processing_Runs Table:**
```sql
CREATE TABLE processing_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  run_type TEXT, -- 'create', 'rescrape', 'writemore'
  scrape_date DATE, -- The date for this data collection
  status TEXT DEFAULT 'pending',
  stage TEXT,
  progress INTEGER DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  processing_stats TEXT, -- JSON blob
  FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

**Keywords Table:**
```sql
CREATE TABLE keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  run_id INTEGER,
  keyword TEXT,
  cleaned_keyword TEXT,
  search_volume INTEGER,
  competition REAL,
  cluster_id INTEGER,
  priority_score REAL,
  metadata TEXT, -- JSON blob
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects (id),
  FOREIGN KEY (run_id) REFERENCES processing_runs (id)
);
```

**Generated_Content Table:**
```sql
CREATE TABLE generated_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  run_id INTEGER,
  content_type TEXT, -- 'title', 'topic'
  content TEXT,
  keywords TEXT, -- JSON array
  cluster_id INTEGER,
  quality_score REAL,
  metadata TEXT, -- JSON blob
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects (id),
  FOREIGN KEY (run_id) REFERENCES processing_runs (id)
);
```

#### 6.2.2 Data Relationships & Indexing
- **Project-Run Relationship**: One-to-many for historical tracking
- **Run-Data Relationship**: One-to-many for keywords and content
- **Indexing Strategy**: SQLite indexes on foreign keys and frequently queried columns
- **Simple Backup**: Database file backup for data protection

### 6.3 Technology Stack

#### 6.3.1 Backend Technologies
- **Runtime**: Node.js 18+ with javascript
- **Framework**: Express.js for web interface (future phase)
- **Database**: SQLite with better-sqlite3 driver
- **Processing**: Direct sequential processing without queues
- **CLI**: Simple CLI interface with commander.js

#### 6.3.2 Development & Deployment
- **Development**: Local development with npm scripts
- **Build**: javascript compilation and bundling
- **Testing**: Jest for unit testing
- **Deployment**: Simple local installation and execution

#### 6.3.3 External Services
- **SEMrush API**: Keyword data acquisition
- **OpenAI API**: AI-powered content generation and classification
- **Local Storage**: Local file system for exports and temporary files
