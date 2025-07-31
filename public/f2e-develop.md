# Frontend Development Guide - Keywords Cluster Web Interface

## Quick Start Workflow

Follow these 4 steps to build the keywords cluster visualization interface:

### 1. Design the Final Display (Right Panel/Main Content)
**Start with the end goal** - what should users see as output?

```javascript
// Example: Keywords data display
const keywordsOutputSpec = {
  keywords: [
    {
      id: 1,
      keyword: "react components",
      search_volume: 8100,
      kd: 25,
      competition: 0.45,
      cpc: 2.34,
      cluster_name: "React Development",
      faq_title: "How to build React components?"
    }
  ],
  stats: {
    total: 1204,
    filtered: 156,
    clusters: 12
  }
};
```

**Create the presentational component first:**
```javascript
// /js/components/keywords-display/keywords-table.js
export const KeywordsTableComponent = {
  props: {
    keywords: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false }
  },
  
  template: `
    <div class="keywords-table-container">
      <div v-if="loading" class="loading">Loading keywords...</div>
      <table v-else class="keywords-table">
        <thead>
          <tr>
            <th @click="$emit('sort', 'keyword')">Keyword</th>
            <th @click="$emit('sort', 'search_volume')">Volume</th>
            <th @click="$emit('sort', 'kd')">KD</th>
            <th @click="$emit('sort', 'competition')">Competition</th>
            <th @click="$emit('sort', 'cpc')">CPC</th>
            <th>Cluster</th>
            <th>FAQ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="keyword in keywords" :key="keyword.id" class="keyword-row">
            <td class="keyword-text">{{ keyword.keyword }}</td>
            <td class="volume-cell">
              <div class="volume-bar" :style="getVolumeBarStyle(keyword.search_volume)"></div>
              <span>{{ keyword.search_volume.toLocaleString() }}</span>
            </td>
            <td class="kd-cell">
              <span :class="getKDClass(keyword.kd)">{{ keyword.kd }}</span>
            </td>
            <td>{{ getCompetitionLevel(keyword.competition) }}</td>
            <td>\${{ keyword.cpc.toFixed(2) }}</td>
            <td>{{ keyword.cluster_name || '-' }}</td>
            <td>{{ keyword.faq_title ? '✓' : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  
  methods: {
    getVolumeBarStyle(volume) {
      const maxVolume = Math.max(...this.keywords.map(k => k.search_volume));
      const width = (volume / maxVolume) * 100;
      return { width: width + '%' };
    },
    
    getKDClass(kd) {
      if (kd <= 30) return 'kd-easy';
      if (kd <= 60) return 'kd-medium'; 
      return 'kd-hard';
    },
    
    getCompetitionLevel(value) {
      if (value < 0.33) return 'Low';
      if (value < 0.66) return 'Medium';
      return 'High';
    }
  }
};
```

### 2. Think About the Data Flow
**Work backwards** - what data do you need to generate that output?

```javascript
// Data requirements analysis:
const dataFlow = {
  input: "project selection + filters",        // What user provides
  processing: "API calls + client filtering",  // How to transform it
  output: "filtered keywords table",           // What display needs
  config: "sort + filter preferences"         // User preferences
};
```

**Define your store schema:**
```javascript
// /js/store.js - Add to reactive data
const reactiveData = Vue.reactive({
  // Project data
  projects: [],
  currentProject: null,
  
  // Keywords data
  keywords: [],
  filteredKeywords: [],
  
  // Filter configuration
  filters: {
    search: '',
    kdMin: 0,
    kdMax: 100,
    volumeMin: 0,
    volumeMax: null,
    competition: '',
    hasFaq: null
  },
  
  // Sort configuration
  sort: {
    field: 'search_volume',
    order: 'desc'
  },
  
  // UI state
  loading: false,
  error: null,
  
  // ... existing store data
});
```

### 3. Wire Up the Store
**Connect display to store data** with processing logic in container:

```javascript
// /js/components/keywords-display/container.js
import { AppStore } from '../../store.js';
import { KeywordsTableComponent } from './keywords-table.js';

const KeywordsDisplayContainer = {
  computed: {
    store() { return AppStore; },
    
    // Business logic - process and filter keywords
    processedKeywords() {
      let filtered = [...this.store.data.keywords];
      const filters = this.store.data.filters;
      
      // Apply text search
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(k => 
          k.keyword.toLowerCase().includes(search)
        );
      }
      
      // Apply KD range
      filtered = filtered.filter(k => 
        k.kd >= filters.kdMin && k.kd <= filters.kdMax
      );
      
      // Apply volume range
      if (filters.volumeMax) {
        filtered = filtered.filter(k => 
          k.search_volume >= filters.volumeMin && 
          k.search_volume <= filters.volumeMax
        );
      }
      
      // Apply competition filter
      if (filters.competition) {
        filtered = filtered.filter(k => 
          this.getCompetitionLevel(k.competition) === filters.competition
        );
      }
      
      // Apply FAQ filter
      if (filters.hasFaq !== null) {
        filtered = filtered.filter(k => 
          filters.hasFaq ? k.faq_title : !k.faq_title
        );
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        const field = this.store.data.sort.field;
        const order = this.store.data.sort.order;
        const aVal = a[field];
        const bVal = b[field];
        const modifier = order === 'desc' ? -1 : 1;
        return (aVal > bVal ? 1 : -1) * modifier;
      });
      
      return filtered;
    },
    
    loading() {
      return this.store.data.loading;
    }
  },
  
  methods: {
    getCompetitionLevel(value) {
      if (value < 0.33) return 'Low';
      if (value < 0.66) return 'Medium';
      return 'High';
    },
    
    handleSort(field) {
      const currentSort = this.store.data.sort;
      const order = currentSort.field === field && currentSort.order === 'desc' ? 'asc' : 'desc';
      this.store.updateSort(field, order);
    }
  },
  
  components: { KeywordsTable: KeywordsTableComponent },
  
  template: `
    <KeywordsTable 
      :keywords="processedKeywords" 
      :loading="loading"
      @sort="handleSort"
    />
  `
};
```

### 4. Design Input & Config Components
**Now you know exactly what data you need to collect:**

```javascript
// /js/components/filters-panel/filters.js
export const FiltersComponent = {
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
        <input 
          type="number" 
          :value="filters.volumeMin"
          @input="updateFilter('volumeMin', parseInt($event.target.value))"
          placeholder="Min volume"
        />
        <input 
          type="number" 
          :value="filters.volumeMax"
          @input="updateFilter('volumeMax', parseInt($event.target.value))"
          placeholder="Max volume"
        />
      </div>
      
      <div class="filter-group">
        <label>Competition</label>
        <select 
          :value="filters.competition"
          @change="updateFilter('competition', $event.target.value)"
        >
          <option value="">All Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            :checked="filters.hasFaq"
            @change="updateFilter('hasFaq', $event.target.checked)"
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
        competition: '',
        hasFaq: null
      });
    }
  }
};

// /js/components/filters-panel/container.js
import { AppStore } from '../../store.js';
import { FiltersComponent } from './filters.js';

const FiltersContainer = {
  computed: {
    store() { return AppStore; },
    filters() { return this.store.data.filters; }
  },
  
  methods: {
    updateFilters(newFilters) {
      this.store.updateFilters(newFilters);
    }
  },
  
  components: { Filters: FiltersComponent },
  
  template: `<Filters :filters="filters" @update-filters="updateFilters" />`
};
```

## File Organization Pattern

For the keywords cluster web interface, create this structure:

```
/js/components/
  /dashboard/
    container.js          # Dashboard logic + project selection
    project-cards.js      # Pure project cards presentation
    stats-overview.js     # Statistics display
  
  /keywords-display/
    container.js          # Keywords processing + store integration  
    keywords-table.js     # Pure keywords table presentation
    keyword-modal.js      # Keyword detail modal
  
  /filters-panel/
    container.js          # Filter logic + store integration
    filters.js            # Pure filter controls presentation
  
  /project-header/
    container.js          # Project info + navigation
    breadcrumb.js         # Navigation breadcrumb
    project-stats.js      # Project statistics
  
  config-bar.js           # Sort/export controls (optional)
```

## API Integration Pattern

### Simple API Client
```javascript
// /js/api/client.js
export class APIClient {
  static BASE_URL = '/api';
  
  static async loadDashboard() {
    const response = await fetch(`${this.BASE_URL}/data`);
    if (!response.ok) throw new Error('Failed to load dashboard');
    return response.json();
  }
  
  static async loadKeywords(projectId) {
    const response = await fetch(`${this.BASE_URL}/keywords/${projectId}`);
    if (!response.ok) throw new Error('Failed to load keywords');
    return response.json();
  }
  
  static exportCSV(projectId) {
    window.location.href = `${this.BASE_URL}/export/${projectId}`;
  }
}
```

### Store Actions
```javascript
// /js/store.js - Add methods
const AppStore = {
  data: reactiveData,
  
  async loadDashboard() {
    this.data.loading = true;
    this.data.error = null;
    try {
      const result = await APIClient.loadDashboard();
      this.data.projects = result.projects;
      this.data.stats = result.stats;
    } catch (error) {
      this.data.error = error.message;
    } finally {
      this.data.loading = false;
    }
  },
  
  async loadKeywords(projectId) {
    this.data.loading = true;
    this.data.error = null;
    try {
      const result = await APIClient.loadKeywords(projectId);
      this.data.keywords = result.keywords;
      this.data.currentProject = this.data.projects.find(p => p.id == projectId);
      this.applyFilters();
    } catch (error) {
      this.data.error = error.message;
    } finally {
      this.data.loading = false;
    }
  },
  
  updateFilters(newFilters) {
    this.data.filters = { ...this.data.filters, ...newFilters };
    this.applyFilters();
  },
  
  updateSort(field, order) {
    this.data.sort = { field, order };
    this.applyFilters(); // Re-apply includes sorting
  },
  
  applyFilters() {
    // Filtering logic is handled in containers
    // This triggers reactivity
  }
};
```

## Development Checklist

### ✅ Step 1: Display Design
- [ ] Define keywords output data structure
- [ ] Create keywords table presentational component
- [ ] Create project cards presentational component
- [ ] Test with mock data from database schema

### ✅ Step 2: Data Analysis  
- [ ] Identify API endpoints needed (/data, /keywords/:id, /export/:id)
- [ ] Define client-side filtering logic
- [ ] Plan store schema for keywords, projects, filters
- [ ] Map database fields to display requirements

### ✅ Step 3: Store Integration
- [ ] Add reactive data to store (keywords, filters, sort)
- [ ] Create API client methods
- [ ] Create processing methods in containers
- [ ] Connect display to processed data
- [ ] Test data flow with real database

### ✅ Step 4: Input Components
- [ ] Create filter presentational components  
- [ ] Create filter container with store binding
- [ ] Add project selection components
- [ ] Add search and sort controls
- [ ] Test complete user flow

## Common Patterns for Keywords Interface

### Dashboard Pattern
```javascript
// Display: project cards with stats
// Data: projects list with keyword counts
// Input: project search + type filter
```

### Keywords Table Pattern  
```javascript
// Display: sortable table with volume bars, KD badges
// Data: filtered keywords with metrics
// Input: search box + range sliders + dropdowns
```

### Export Pattern
```javascript
// Display: download button
// Data: current filtered results
// Input: export format selection (CSV)
```

## Testing Your Interface

1. **Start with dashboard**: Can you render projects from database correctly?
2. **Add keywords loading**: Does project selection load keywords?
3. **Connect filters**: Does filtering update the table in real-time?
4. **Verify sorting**: Do column clicks change sort order?
5. **Test export**: Does CSV download work with current filters?

## Database Integration Notes

- **SQLite Database**: `./data/keywords-cluster.db`
- **Key Tables**: projects, keywords, keyword_clusters, generated_content
- **API Layer**: Single Express.js file at `/server.js`
- **Models**: Use existing database connection from `/src/database/connection.js`

## CSS Architecture

```css
/* Component-based styling */
.keywords-table { /* Table layout */ }
.kd-easy { background: #d4edda; color: #155724; }
.kd-medium { background: #fff3cd; color: #856404; }
.kd-hard { background: #f8d7da; color: #721c24; }

.volume-bar { 
  height: 4px; 
  background: #007bff; 
  border-radius: 2px; 
}

.project-card {
  cursor: pointer;
  transition: transform 0.2s;
}
.project-card:hover {
  transform: translateY(-2px);
}
```

## Reference Architecture

- **Container Components**: Handle API calls, filtering, sorting, store integration
- **Presentational Components**: Pure UI rendering with props/emits  
- **Store Pattern**: Centralized reactive state with Vue reactivity
- **API Client**: Simple fetch-based client for 3 endpoints
- **Client-side Processing**: All filtering/sorting happens in browser

---

**Next Steps**: Follow the 4-step process to build the keywords visualization interface! 🚀

The interface focuses on:
1. **Dashboard** → Quick project selection with stats
2. **Keywords Table** → Sortable, filterable data exploration  
3. **Real-time Filtering** → No server round-trips for search/filter
4. **Export Functionality** → CSV download of filtered results

This creates a fast, responsive read-only interface perfect for SEO keyword analysis workflows.