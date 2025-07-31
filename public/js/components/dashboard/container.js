/**
 * Dashboard Container Component
 * Handles dashboard logic, project selection, and store integration
 */

import { AppStore } from '../../store.js';
import { ProjectCardsComponent } from './project-cards.js';

const DashboardContainer = {
  data() {
    return {
      searchQuery: '',
      selectedType: ''
    };
  },
  
  computed: {
    store() { 
      return AppStore; 
    },
    
    projects() {
      let filtered = this.store.data.projects || [];
      
      // Filter by search query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(project => 
          project.name.toLowerCase().includes(query)
        );
      }
      
      // Filter by project type
      if (this.selectedType) {
        filtered = filtered.filter(project => 
          project.project_type === this.selectedType
        );
      }
      
      return filtered;
    },
    
    stats() {
      return this.store.data.stats || {
        total_projects: 0,
        total_keywords: 0,
        total_clusters: 0
      };
    },
    
    loading() {
      return this.store.data.loading;
    },
    
    error() {
      return this.store.data.error;
    }
  },
  
  methods: {
    async loadDashboard() {
      await this.store.loadDashboard();
    },
    
    handleProjectSelect(project) {
      console.log('Project selected:', project);
      // Navigate to project keywords page
      window.location.href = `/project.html?id=${project.id}`;
    },
    
    formatNumber(num) {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num?.toLocaleString() || '0';
    }
  },
  
  async mounted() {
    // Load dashboard data when component mounts
    await this.loadDashboard();
  },
  
  components: { 
    ProjectCards: ProjectCardsComponent 
  },
  
  template: `
    <div class="dashboard-container h-full overflow-y-auto">
      <!-- Dashboard Header -->
      <header class="dashboard-header bg-secondary border-b border-tertiary p-6">
        <div class="max-w-7xl mx-auto">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold text-primary">Keywords Cluster Dashboard</h1>
              <p class="text-secondary mt-1">Manage and explore your keyword projects</p>
            </div>
            <div class="flex items-center gap-4">
              <button 
                @click="loadDashboard"
                :disabled="loading"
                class="px-4 py-2 bg-accent-green text-white rounded hover:bg-accent-green-hover transition-colors disabled:opacity-50"
              >
                <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ loading ? 'Loading...' : 'Refresh' }}
              </button>
            </div>
          </div>
          
          <!-- Stats Overview -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="stat-card bg-primary border border-tertiary rounded-lg p-6 text-center">
              <div class="text-3xl font-bold text-accent-green mb-1">
                {{ formatNumber(stats.total_projects) }}
              </div>
              <div class="text-sm text-secondary">Total Projects</div>
            </div>
            <div class="stat-card bg-primary border border-tertiary rounded-lg p-6 text-center">
              <div class="text-3xl font-bold text-primary mb-1">
                {{ formatNumber(stats.total_keywords) }}
              </div>
              <div class="text-sm text-secondary">Total Keywords</div>
            </div>
            <div class="stat-card bg-primary border border-tertiary rounded-lg p-6 text-center">
              <div class="text-3xl font-bold text-blue-500 mb-1">
                {{ formatNumber(stats.total_clusters) }}
              </div>
              <div class="text-sm text-secondary">Total Clusters</div>
            </div>
          </div>
          
          <!-- Search and Filters -->
          <div class="flex flex-col sm:flex-row gap-4 mb-6">
            <div class="flex-1">
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Search projects..."
                class="w-full px-4 py-2 border border-tertiary rounded-lg bg-primary text-primary placeholder-muted focus:border-accent-green focus:outline-none"
              />
            </div>
            <div class="sm:w-48">
              <select 
                v-model="selectedType"
                class="w-full px-4 py-2 border border-tertiary rounded-lg bg-primary text-primary focus:border-accent-green focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="domain">Domain</option>
                <option value="subdomain">Subdomain</option>
                <option value="subfolder">Subfolder</option>
              </select>
            </div>
          </div>
        </div>
      </header>
      
      <!-- Error State -->
      <div v-if="error" class="error-banner bg-red-100 border border-red-300 text-red-700 px-6 py-4 mx-6 mt-6 rounded">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>
      
      <!-- Projects Section -->
      <main class="dashboard-main p-6">
        <div class="max-w-7xl mx-auto">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-primary">
              Projects 
              <span v-if="projects.length !== store.data.projects.length" class="text-sm text-secondary font-normal">
                ({{ projects.length }} of {{ store.data.projects.length }})
              </span>
            </h2>
          </div>
          
          <ProjectCards 
            :projects="projects" 
            :loading="loading"
            @project-select="handleProjectSelect"
          />
        </div>
      </main>
    </div>
  `
};

// Mount the component
const { createApp } = Vue;

document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the dashboard (main page)
  const dashboardContainer = document.getElementById('dashboard-container') || document.getElementById('app');
  if (dashboardContainer && window.location.pathname === '/' || window.location.pathname === '/index.html') {
    const app = createApp(DashboardContainer);
    app.mount(dashboardContainer);
    
    console.log('Dashboard Container mounted');
  }
});

// Export for module usage
export default DashboardContainer;