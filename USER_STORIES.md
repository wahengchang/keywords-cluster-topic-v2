# User Stories - Keywords Cluster Topic Automation V2

## Document Information
- **Version**: 1.0.0
- **Date**: 2025-07-25
- **Project**: Personal keyword research tool
- **Format**: Simple, lean user stories for single developer

---

## Epic 1: Project Management 🗂️

### US-001: Create Domain Project
**As a user, I want to create a domain-level project so that I can analyze all keywords for an entire domain with full automation.**

**Acceptance Criteria:**
- ✅ I can specify a domain name (e.g., "example.com")
- ✅ System checks if domain already exists in database
- ✅ If domain exists, operation exits with warning message
- ✅ If domain doesn't exist, system creates project with unique slug
- ✅ System automatically downloads SEMrush data
- ✅ Data is inserted to database one by one during download
- ✅ Complete processing pipeline runs automatically
- ✅ FAQ titles are generated for limited clusters (cost optimization)
- ✅ System skips FAQ generation for clusters that already have titles

**Interactive Flow:** Launch CLI, select "Create Project", choose "Domain/Subfolder", enter domain name → automatic domain check → automatic SEMrush download → automatic pipeline processing → automatic FAQ generation

---

### US-002: Create Subfolder Project
**As a user, I want to create a subfolder project so that I can analyze keywords for specific URL paths with full automation.**

**Acceptance Criteria:**
- ✅ I can specify a full URL path (e.g., "https://example.com/blog/")
- ✅ System validates URL format
- ✅ System checks if URL path already exists in database
- ✅ If URL exists, operation exits with warning message
- ✅ If URL doesn't exist, system creates project with subfolder type
- ✅ System automatically downloads SEMrush data
- ✅ Data is inserted to database one by one during download
- ✅ Complete processing pipeline runs automatically
- ✅ FAQ titles are generated for limited clusters (cost optimization)
- ✅ System skips FAQ generation for clusters that already have titles

**Interactive Flow:** Launch CLI, select "Create Project", choose "Domain/Subfolder", enter URL → automatic URL check → automatic SEMrush download → automatic pipeline processing → automatic FAQ generation

---

### US-003: List My Projects
**As a user, I want to see all my projects so that I can manage my work.**

**Acceptance Criteria:**
- ✅ Display project name, type, domain/URL, last processed date
- ✅ Show project status (active, archived)
- ✅ Support filtering by type or status
- ✅ Display in readable table format

**Interactive Flow:** Launch CLI, select "List Projects", optionally choose filters through prompts

---

### US-004: Duplicate Project
**As a user, I want to duplicate an existing project so that I can reuse configurations.**

**Acceptance Criteria:**
- ✅ Copy all project settings and configuration
- ✅ Assign new unique name and slug
- ✅ Don't copy historical processing data
- ✅ New project ready for fresh processing

**Interactive Flow:** Launch CLI, select "Duplicate Project", choose source project from list, enter new project name through prompts

---

## Epic 2: Data Processing 🔄

### US-005: Initial Project Processing (CREATE)
**As a user, I want to run initial processing on a new project so that I get comprehensive keyword analysis.**

**Acceptance Criteria:**
- ✅ Fetch fresh data from SEMrush API
- ✅ Run complete 8-stage processing pipeline
- ✅ Generate keywords, clusters, and content titles
- ✅ Save results with current date
- ✅ Show progress updates during processing

**Interactive Flow:** Launch CLI, select "Process Project", choose "Initial Processing", select project from list, confirm processing options

**Processing Stages:**
1. SEMrush data acquisition
2. Data cleaning and normalization
3. Keyword deduplication
4. Keyword clustering (K-means)
5. Priority scoring
6. Title generation (AI)
7. Summary statistics

---

### US-006: Update Project Data (RESCRAPE)
**As a user, I want to update existing projects with fresh data so that my analysis stays current with full automation.**

**Acceptance Criteria:**
- ✅ I can select from existing project domains/subfolders
- ✅ System downloads fresh SEMrush data for selected project
- ✅ System checks if data already exists for current date
- ✅ If data exists, system updates it with createdAt/updatedAt timestamps
- ✅ If data doesn't exist, system inserts new data
- ✅ Complete processing pipeline runs automatically on new/updated data
- ✅ FAQ titles are generated for limited clusters (cost optimization)
- ✅ System skips FAQ generation for clusters that already have titles
- ✅ Keep historical data for comparison across dates
- ✅ Update project last_processed timestamp

**Interactive Flow:** Launch CLI, select "Rescrape", choose existing project domain/subfolder → automatic data download → automatic data check/update → automatic pipeline processing → automatic FAQ generation

---

### US-007: Generate More Content (WRITEMORE)
**As a user, I want to generate additional content titles so that I can scale my content strategy.**

**Acceptance Criteria:**
- ✅ Use existing processed keyword data
- ✅ Generate new titles from different clusters
- ✅ Avoid duplicating previous titles
- ✅ Allow configurable titles per cluster
- ✅ Fast execution (no SEMrush API calls)

**Interactive Flow:** Launch CLI, select "Process Project", choose "Generate More Content", select project from list, configure titles per cluster through prompts

---

## Epic 3: Database Management 📊

### US-008: View Database Status
**As a user, I want to see database status information so that I can understand my data overview.**

**Acceptance Criteria:**
- ✅ Display total projects count (active/archived)
- ✅ Show total processing runs count (completed/failed)
- ✅ List recent processing activity with status indicators
- ✅ Display database health and basic statistics

**Interactive Flow:** Launch CLI, select "Database Management", choose "Show database status"

---

### US-009: List All Projects
**As a user, I want to view all my projects with detailed information so that I can manage my work.**

**Acceptance Criteria:**
- ✅ Display project name, type (domain/subfolder), and target
- ✅ Show project slug, keyword counts, and processing run statistics
- ✅ Display creation date and last processed date
- ✅ Format output in readable table with clear organization

**Interactive Flow:** Launch CLI, select "Database Management", choose "List all projects"

---

### US-010: Automatic Data Storage  
**As a user, I want data to be automatically saved to the database so that I don't need to manage storage manually.**

**Acceptance Criteria:**
- ✅ API data automatically flows to CSV then database
- ✅ Projects are auto-created from CSV metadata
- ✅ No manual migration or backup steps required
- ✅ Seamless workflow without user intervention for data persistence

**Interactive Flow:** Automatic - happens during any "Fetch Keywords" operation without user action
