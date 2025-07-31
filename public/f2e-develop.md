# Frontend Development Guide - Keywords Cluster Web Interface

## Quick Start Workflow

Follow these 4 steps to build the keywords cluster visualization interface:

### 1. Design the Final Display (Keywords Dashboard)
**Start with the end goal** - what should users see as the main interface?

```javascript
// Example: Keywords dashboard output
const dashboardSpec = {
  projects: [
    {
      id: 1,
      name: "example.com",
      keyword_count: 2341,
      total_clusters: 45,
      last_processed: "2025-07-31T10:30:00Z"
    }
  ],
  stats: {
    total_projects: 12,
    total_keywords: 45230,
    total_clusters: 567
  }
};
```

**Create the presentational components first:**
```javascript
// /js/components/dashboard/project-card.js
export const ProjectCardComponent = {
  props: {
    project: { type: Object, required: true }
  },
  
  template: `
    <div class="project-card" @click="$emit('select', project.id)">
      <div class="project-header">
        <h3 class="project-name">{{ project.name }}</h3>
        <span class="project-type">{{ project.project_type }}</span>
      </div>
      <div class="project-stats">
        <div class="stat">
          <span class="stat-value">{{ formatNumber(project.keyword_count) }}</span>
          <span class="stat-label">keywords</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ project.total_clusters }}</span>
          <span class="stat-label">clusters</span>
        </div>
      </div>
      <div class="project-meta">
        <span class="last-processed">Updated: {{ formatDate(project.last_processed) }}</span>
      </div>
    </div>
  `,
  
  methods: {
    formatNumber(num) {
      return num.toLocaleString();
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString();
    }
  }
};
```

### 2. Think About the Data Flow
**Work backwards** - what data do you need to generate that dashboard?

```javascript
// Data requirements analysis:
const dataFlow = {
  input: "API calls to /api/data and /api/keywords/:id",     // What API provides
  processing: "client-side filtering and sorting logic",     // How to transform it
  output: "filtered keywords table and project dashboard",   // What display needs
  config: "search filters, sort options, project selection" // User preferences
};
```

**Define your store schema:**
```javascript
// /js/store.js - Add to reactive data
const reactiveData = Vue.reactive({
  // Dashboard data
  projects: [],
  stats: {},
  currentProject: null,
  
  // Keywords data (loaded when project selected)
  keywords: [],
  filteredKeywords: [],
  
  // User interface state
  filters: {
    search: '',
    kdMin: 0,
    kdMax: 100,
    volumeMin: 0,
    volumeMax: null,
    competition: 'all',
    hasFaq: null,
    cluster: 'all'
  },
  
  sort: {
    field: 'search_volume',
    order: 'desc'
  },
  
  // UI state
  loading: false,
  currentView: 'dashboard', // 'dashboard' or 'keywords'
  
  // ... existing store data
});
```

### 3. Wire Up the Store
**Connect display to store data** with processing logic in container:

```javascript
// /js/components/dashboard/container.js
import { AppStore } from '../../store.js';
import { ProjectCardComponent } from './project-card.js';

const DashboardContainer = {
  computed: {
    store() { return AppStore; },
    
    // Process projects for display
    displayProjects() {
      return this.store.data.projects.filter(project => {
        const searchTerm = this.projectSearchTerm.toLowerCase();
        return !searchTerm || 
               project.name.toLowerCase().includes(searchTerm) ||
               project.domain?.toLowerCase().includes(searchTerm);
      });
    },
    
    // Dashboard stats
    dashboardStats() {
      return this.store.data.stats;
    }
  },
  
  data() {
    return {
      projectSearchTerm: ''
    };
  },
  
  methods: {
    async loadDashboard() {
      this.store.setLoading(true);
      try {
        await this.store.loadDashboardData();
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        this.store.setLoading(false);
      }
    },
    
    selectProject(projectId) {
      this.store.setCurrentView('keywords');
      this.store.loadProjectKeywords(projectId);
    }
  },
  
  components: { ProjectCard: ProjectCardComponent },
  
  template: `
    <div class="dashboard-container">
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-value">{{ dashboardStats.total_projects }}</div>
          <div class="stat-label">Total Projects</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNumber(dashboardStats.total_keywords) }}</div>
          <div class="stat-label">Total Keywords</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ dashboardStats.total_clusters }}</div>
          <div class="stat-label">Total Clusters</div>
        </div>
      </div>
      
      <div class="search-bar">
        <input 
          v-model="projectSearchTerm" 
          type="text" 
          placeholder="Search projects..."
          class="project-search"
        />
      </div>
      
      <div class="projects-grid">
        <ProjectCard 
          v-for="project in displayProjects" 
          :key="project.id"
          :project="project"
          @select="selectProject"
        />
      </div>
    </div>
  `,
  
  created() {
    this.loadDashboard();
  }
};
```

### 4. Design Input & Filter Components
**Build the keywords filtering interface:**

```javascript
// /js/components/keywords/keyword-filters.js
export const KeywordFiltersComponent = {
  props: {
    filters: { type: Object, required: true }
  },
  emits: ['update-filters'],
  
  template: `
    <div class="filters-panel">
      <h3>Filters</h3>
      
      <div class="filter-group">
        <label>Search Keywords</label>
        <input 
          type="text" 
          :value="filters.search"
          @input="updateFilter('search', $event.target.value)"
          placeholder="Search keywords..."
        />
      </div>
      
      <div class="filter-group">
        <label>Keyword Difficulty</label>
        <div class="range-slider">
          <input 
            type="range" 
            min="0" 
            max="100" 
            :value="filters.kdMin"
            @input="updateFilter('kdMin', parseInt($event.target.value))"
          />
          <input 
            type="range" 
            min="0" 
            max="100" 
            :value="filters.kdMax"
            @input="updateFilter('kdMax', parseInt($event.target.value))"
          />
          <div class="range-display">{{ filters.kdMin }} - {{ filters.kdMax }}</div>
        </div>
      </div>
      
      <div class="filter-group">
        <label>Search Volume</label>
        <div class="range-inputs">
          <input 
            type="number" 
            placeholder="Min" 
            :value="filters.volumeMin"
            @input="updateFilter('volumeMin', parseInt($event.target.value) || 0)"
          />
          <input 
            type="number" 
            placeholder="Max" 
            :value="filters.volumeMax"
            @input="updateFilter('volumeMax', parseInt($event.target.value) || null)"
          />
        </div>
      </div>
      
      <div class="filter-group">
        <label>Competition</label>
        <select :value="filters.competition" @change="updateFilter('competition', $event.target.value)">
          <option value="all">All Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>
          <input 
            type="checkbox" 
            :checked="filters.hasFaq === true"
            @change="updateFilter('hasFaq', $event.target.checked ? true : null)"
          />
          Has FAQ Title
        </label>
      </div>
      
      <div class="filter-actions">
        <button @click="clearFilters" class="btn-secondary">Clear All</button>
      </div>
    </div>
  `,
  
  methods: {
    updateFilter(key, value) {
      this.$emit('update-filters', { [key]: value });
    },
    
    clearFilters() {
      this.$emit('update-filters', {
        search: '',
        kdMin: 0,
        kdMax: 100,
        volumeMin: 0,
        volumeMax: null,
        competition: 'all',
        hasFaq: null
      });
    }
  }
};
```

## File Organization Pattern

For the keywords cluster web interface, use this structure:

```
/js/components/
  /dashboard/
    container.js        # Dashboard logic + store integration
    project-card.js     # Project card presentation
    stats-overview.js   # Stats display component
  
  /keywords/
    container.js        # Keywords page logic + store integration  
    keywords-table.js   # Keywords table presentation
    keyword-filters.js  # Filter panel component
    keyword-row.js      # Individual keyword row component
  
  /shared/
    loading.js          # Loading spinner component
    modal.js            # Keyword detail modal
  
  api-client.js         # API integration layer
```

## Development Checklist

### ✅ Step 1: Dashboard Design
- [ ] Create project card component with stats display
- [ ] Create stats overview component
- [ ] Test with mock project data
- [ ] Add project search functionality

### ✅ Step 2: Keywords Data Flow  
- [ ] Define API client for 3 endpoints (/api/data, /api/keywords/:id, /api/export/:id)
- [ ] Plan client-side filtering logic for all filters
- [ ] Update store schema for keywords and filters
- [ ] Plan sorting logic (volume, KD, alphabetical)

### ✅ Step 3: Store Integration
- [ ] Add keywords data to reactive store
- [ ] Create filtering methods in container
- [ ] Connect keywords table to filtered data
- [ ] Test real-time filter updates

### ✅ Step 4: Keywords Interface
- [ ] Create keywords table with sortable headers  
- [ ] Create filter panel with all filter types
- [ ] Add export CSV functionality
- [ ] Create keyword detail modal
- [ ] Test complete keyword exploration flow

## API Integration Pattern

```javascript
// /js/api-client.js - Simple API client for 3 endpoints
class KeywordsAPI {
  static BASE_URL = '/api';
  
  // Load all dashboard data at once
  static async loadDashboard() {
    const response = await fetch(`${this.BASE_URL}/data`);
    if (!response.ok) throw new Error('Failed to load dashboard');
    return response.json();
  }
  
  // Load all keywords for a project at once (client-side filtering)
  static async loadProjectKeywords(projectId) {
    const response = await fetch(`${this.BASE_URL}/keywords/${projectId}`);
    if (!response.ok) throw new Error('Failed to load keywords');
    return response.json();
  }
  
  // Export keywords as CSV download
  static exportProjectCSV(projectId) {
    window.location.href = `${this.BASE_URL}/export/${projectId}`;
  }
}
```

## Store Integration Pattern

```javascript
// /js/store.js - Enhanced store methods
const AppStore = {
  data: reactiveData,
  
  // Dashboard methods
  async loadDashboardData() {
    const data = await KeywordsAPI.loadDashboard();
    this.data.projects = data.projects;
    this.data.stats = data.stats;
  },
  
  // Keywords methods  
  async loadProjectKeywords(projectId) {
    this.data.loading = true;
    try {
      const data = await KeywordsAPI.loadProjectKeywords(projectId);
      this.data.keywords = data.keywords;
      this.data.currentProject = this.data.projects.find(p => p.id == projectId);
      this.applyFilters();
    } finally {
      this.data.loading = false;
    }
  },
  
  // Client-side filtering (all processing in browser)
  applyFilters() {
    let filtered = [...this.data.keywords];
    const f = this.data.filters;
    
    // Text search in keyword
    if (f.search) {
      const search = f.search.toLowerCase();
      filtered = filtered.filter(k => 
        k.keyword.toLowerCase().includes(search)
      );
    }
    
    // KD range filter
    filtered = filtered.filter(k => 
      k.kd >= f.kdMin && k.kd <= f.kdMax
    );
    
    // Volume range filter
    if (f.volumeMax) {
      filtered = filtered.filter(k => 
        k.search_volume >= f.volumeMin && k.search_volume <= f.volumeMax
      );
    }
    
    // Competition level filter
    if (f.competition !== 'all') {
      filtered = filtered.filter(k => 
        this.getCompetitionLevel(k.competition) === f.competition
      );
    }
    
    // FAQ filter
    if (f.hasFaq !== null) {
      filtered = filtered.filter(k => 
        f.hasFaq ? k.faq_title : !k.faq_title
      );
    }
    
    // Sorting
    filtered.sort((a, b) => {
      const aVal = a[this.data.sort.field];
      const bVal = b[this.data.sort.field];
      const modifier = this.data.sort.order === 'desc' ? -1 : 1;
      return (aVal > bVal ? 1 : -1) * modifier;
    });
    
    this.data.filteredKeywords = filtered;
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
  
  // UI state methods
  setCurrentView(view) {
    this.data.currentView = view;
  },
  
  setLoading(loading) {
    this.data.loading = loading;
  },
  
  // Helper methods
  getCompetitionLevel(value) {
    if (value < 0.33) return 'low';
    if (value < 0.66) return 'medium';
    return 'high';
  }
};
```

## Common Patterns for Keywords Interface

### Keywords Table Component
```javascript
// Display: sortable table with KD color coding and volume bars
// Data: filtered keywords with client-side sorting
// Input: sort controls + pagination (virtual scrolling for large datasets)
```

### Filter Panel Component  
```javascript
// Display: range sliders, dropdowns, checkboxes for all filter types
// Data: current filter state with real-time updates
// Input: filter controls that immediately update the table
```

### Project Selection Component
```javascript
// Display: project cards with stats and last updated info
// Data: projects list with keyword counts and processing dates
// Input: search field + project type filter
```

## Testing Your Interface

1. **Start with dashboard**: Can you load and display project cards correctly?
2. **Add project selection**: Does clicking a project load its keywords?
3. **Connect filtering**: Do filter changes update the keywords table in real-time?
4. **Test sorting**: Do column clicks sort the table correctly?
5. **Verify export**: Does CSV export download the correct filtered data?

## Key Differences from Standard Vue Pattern

### Client-Side Heavy Processing
- **Load once**: Fetch all project keywords at once, filter in browser
- **No pagination API**: Use virtual scrolling for large keyword lists
- **Real-time filtering**: All search, filter, sort happens instantly in JavaScript

### Simplified API Integration
- **Only 3 API endpoints**: `/api/data`, `/api/keywords/:id`, `/api/export/:id`
- **No write operations**: Pure read-only interface
- **Direct CSV export**: Export endpoint returns file download

### Performance Considerations
- **Memory-based filtering**: All keywords loaded in browser memory
- **Virtual scrolling**: Handle 10k+ keywords efficiently
- **Debounced search**: Prevent excessive filter updates during typing

---

**Next Steps**: Follow this Vue.js container/presentational pattern to build the keywords cluster visualization interface! Focus on client-side processing and minimal API integration. 🚀