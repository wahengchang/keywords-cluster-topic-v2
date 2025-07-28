# User Stories - Keywords Cluster Topic Automation V2

## Document Information
- **Version**: 1.0.0
- **Date**: 2025-07-25
- **Project**: Personal keyword research tool
- **Format**: Simple, lean user stories for single developer

---

## Epic 1: Project Management 🗂️

### US-001: Create Domain Project
**As a user, I want to create a domain-level project so that I can analyze all keywords for an entire domain.**

**Acceptance Criteria:**
- ✅ I can specify a domain name (e.g., "example.com")
- ✅ System creates project with unique slug
- ✅ Project is saved to SQLite database
- ✅ I can add optional tags and configuration

**CLI Command:** `kwt project create "My Domain" --domain example.com`

---

### US-002: Create Subfolder Project
**As a user, I want to create a subfolder project so that I can analyze keywords for specific URL paths.**

**Acceptance Criteria:**
- ✅ I can specify a full URL path (e.g., "https://example.com/blog/")
- ✅ System validates URL format
- ✅ Project is saved with subfolder type
- ✅ I can configure processing options

**CLI Command:** `kwt project create "Blog Analysis" --url https://example.com/blog/`

---

### US-003: List My Projects
**As a user, I want to see all my projects so that I can manage my work.**

**Acceptance Criteria:**
- ✅ Display project name, type, domain/URL, last processed date
- ✅ Show project status (active, archived)
- ✅ Support filtering by type or status
- ✅ Display in readable table format

**CLI Command:** `kwt project list`

---

### US-004: Duplicate Project
**As a user, I want to duplicate an existing project so that I can reuse configurations.**

**Acceptance Criteria:**
- ✅ Copy all project settings and configuration
- ✅ Assign new unique name and slug
- ✅ Don't copy historical processing data
- ✅ New project ready for fresh processing

**CLI Command:** `kwt project duplicate "My Domain" "My Domain v2"`

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

**CLI Command:** `kwt process create "My Domain" --wait --progress`

**Processing Stages:**
1. SEMrush data acquisition
2. Data cleaning and normalization
3. Keyword deduplication
4. Intent classification (AI)
5. Keyword clustering (K-means)
6. Priority scoring
7. Title generation (AI)
8. Summary statistics

---

### US-006: Update Project Data (RESCRAPE)
**As a user, I want to update existing projects with fresh data so that my analysis stays current.**

**Acceptance Criteria:**
- ✅ Fetch new SEMrush data for project
- ✅ Process through pipeline with new date tag
- ✅ Keep historical data for comparison
- ✅ Generate new titles avoiding duplicates
- ✅ Update project last_processed timestamp

**CLI Command:** `kwt process rescrape "My Domain" --progress`

---

### US-007: Generate More Content (WRITEMORE)
**As a user, I want to generate additional content titles so that I can scale my content strategy.**

**Acceptance Criteria:**
- ✅ Use existing processed keyword data
- ✅ Generate new titles from different clusters
- ✅ Avoid duplicating previous titles
- ✅ Allow configurable titles per cluster
- ✅ Fast execution (no SEMrush API calls)

**CLI Command:** `kwt process writemore "My Domain" --titles-per-cluster 5`
