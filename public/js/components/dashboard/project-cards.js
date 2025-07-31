/**
 * Project Cards Presentational Component
 * Pure UI component for displaying project cards
 */

export const ProjectCardsComponent = {
  props: {
    projects: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false }
  },
  
  emits: ['project-select'],
  
  template: `
    <div class="projects-container">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="project-card-skeleton">
            <div class="animate-pulse">
              <div class="h-4 bg-tertiary rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-tertiary rounded w-1/2 mb-4"></div>
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="h-8 bg-tertiary rounded"></div>
                <div class="h-8 bg-tertiary rounded"></div>
              </div>
              <div class="h-3 bg-tertiary rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="projects.length === 0" class="empty-state">
        <div class="text-center py-12">
          <svg class="w-16 h-16 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <div class="text-xl text-primary mb-2">No projects found</div>
          <div class="text-secondary">Create your first project to get started</div>
        </div>
      </div>
      
      <!-- Project Cards Grid -->
      <div v-else class="projects-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="project in projects" 
          :key="project.id"
          @click="$emit('project-select', project)"
          class="project-card bg-primary border border-tertiary rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-accent-green hover:-translate-y-1"
        >
          <!-- Project Header -->
          <div class="project-header mb-4">
            <div class="flex items-start justify-between">
              <h3 class="text-lg font-semibold text-primary truncate pr-2">
                {{ project.name }}
              </h3>
              <span :class="getProjectTypeClass(project.project_type)" class="project-type-badge">
                {{ formatProjectType(project.project_type) }}
              </span>
            </div>
            <div class="text-sm text-secondary mt-1">
              {{ getProjectDomain(project.name) }}
            </div>
          </div>
          
          <!-- Project Stats -->
          <div class="project-stats grid grid-cols-2 gap-4 mb-4">
            <div class="stat-item text-center">
              <div class="stat-value text-2xl font-bold text-accent-green">
                {{ formatNumber(project.keyword_count) }}
              </div>
              <div class="stat-label text-xs text-secondary">Keywords</div>
            </div>
            <div class="stat-item text-center">
              <div class="stat-value text-2xl font-bold text-primary">
                {{ project.total_clusters || 0 }}
              </div>
              <div class="stat-label text-xs text-secondary">Clusters</div>
            </div>
          </div>
          
          <!-- Project Meta -->
          <div class="project-meta">
            <div class="flex items-center justify-between text-xs text-secondary">
              <span class="flex items-center">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                </svg>
                Updated {{ formatDate(project.last_processed) }}
              </span>
              <span :class="getStatusClass(project.status)" class="status-badge">
                {{ project.status }}
              </span>
            </div>
          </div>
          
          <!-- Hover Effect -->
          <div class="project-hover-overlay absolute inset-0 bg-accent-green opacity-0 hover:opacity-5 rounded-lg transition-opacity duration-200"></div>
        </div>
      </div>
    </div>
  `,
  
  methods: {
    getProjectTypeClass(type) {
      const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
      switch (type) {
        case 'domain':
          return baseClasses + ' bg-blue-100 text-blue-800';
        case 'subdomain':
          return baseClasses + ' bg-purple-100 text-purple-800';
        case 'subfolder':
          return baseClasses + ' bg-orange-100 text-orange-800';
        default:
          return baseClasses + ' bg-gray-100 text-gray-800';
      }
    },
    
    formatProjectType(type) {
      switch (type) {
        case 'domain': return 'Domain';
        case 'subdomain': return 'Subdomain';
        case 'subfolder': return 'Subfolder';
        default: return type;
      }
    },
    
    getProjectDomain(name) {
      try {
        const url = name.startsWith('http') ? name : `https://${name}`;
        return new URL(url).hostname;
      } catch {
        return name;
      }
    },
    
    getStatusClass(status) {
      const baseClasses = 'px-2 py-1 rounded text-xs';
      switch (status) {
        case 'active':
          return baseClasses + ' bg-green-100 text-green-800';
        case 'processing':
          return baseClasses + ' bg-yellow-100 text-yellow-800';
        case 'error':
          return baseClasses + ' bg-red-100 text-red-800';
        default:
          return baseClasses + ' bg-gray-100 text-gray-800';
      }
    },
    
    formatNumber(num) {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num?.toLocaleString() || '0';
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Never';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    }
  }
};

// Make available globally
window.ProjectCardsComponent = ProjectCardsComponent;