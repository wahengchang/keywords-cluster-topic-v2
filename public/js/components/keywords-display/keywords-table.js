/**
 * Keywords Table Presentational Component
 * Pure UI component for displaying keywords data in table format
 */

export const KeywordsTableComponent = {
  props: {
    keywords: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false }
  },
  
  emits: ['sort', 'keyword-click'],
  
  template: `
    <div class="keywords-table-container">
      <div v-if="loading" class="loading-state">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <div class="text-gray-400 text-sm">Loading keywords...</div>
      </div>
      
      <div v-else-if="keywords.length === 0" class="empty-state">
        <div class="text-center py-12">
          <div class="text-gray-400 text-lg mb-2">No keywords found</div>
          <div class="text-gray-500 text-sm">Try adjusting your filters</div>
        </div>
      </div>
      
      <div v-else class="table-wrapper">
        <table class="keywords-table w-full">
          <thead class="bg-secondary border-b border-tertiary">
            <tr>
              <th @click="$emit('sort', 'keyword')" class="sortable-header">
                <div class="header-content">
                  <span>Keyword</span>
                  <svg class="sort-icon w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 8l5-5 5 5H5z"/>
                  </svg>
                </div>
              </th>
              <th @click="$emit('sort', 'search_volume')" class="sortable-header">
                <div class="header-content">
                  <span>Volume</span>
                  <svg class="sort-icon w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 8l5-5 5 5H5z"/>
                  </svg>
                </div>
              </th>
              <th @click="$emit('sort', 'kd')" class="sortable-header">
                <div class="header-content">
                  <span>KD</span>
                  <svg class="sort-icon w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 8l5-5 5 5H5z"/>
                  </svg>
                </div>
              </th>
              <th @click="$emit('sort', 'competition')" class="sortable-header">
                <div class="header-content">
                  <span>Competition</span>
                  <svg class="sort-icon w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 8l5-5 5 5H5z"/>
                  </svg>
                </div>
              </th>
              <th @click="$emit('sort', 'cpc')" class="sortable-header">
                <div class="header-content">
                  <span>CPC</span>
                  <svg class="sort-icon w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 8l5-5 5 5H5z"/>
                  </svg>
                </div>
              </th>
              <th class="text-left">Cluster</th>
              <th class="text-center">FAQ</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="keyword in keywords" 
              :key="keyword.id" 
              class="keyword-row hover:bg-tertiary transition-colors cursor-pointer"
              @click="$emit('keyword-click', keyword)"
            >
              <td class="keyword-text">
                <span class="font-medium text-primary">{{ keyword.keyword }}</span>
              </td>
              <td class="volume-cell">
                <div class="volume-container">
                  <div 
                    class="volume-bar" 
                    :style="getVolumeBarStyle(keyword.search_volume)"
                  ></div>
                  <span class="volume-text">{{ formatNumber(keyword.search_volume) }}</span>
                </div>
              </td>
              <td class="kd-cell">
                <span :class="getKDClass(keyword.kd)" class="kd-badge">
                  {{ keyword.kd }}
                </span>
              </td>
              <td class="competition-cell">
                <span :class="getCompetitionClass(keyword.competition)">
                  {{ getCompetitionLevel(keyword.competition) }}
                </span>
              </td>
              <td class="cpc-cell">
                <span class="font-mono text-sm">\${{ formatCpc(keyword.cpc) }}</span>
              </td>
              <td class="cluster-cell">
                <span v-if="keyword.cluster_name" class="cluster-name">
                  {{ keyword.cluster_name }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="faq-cell text-center">
                <span v-if="keyword.faq_title" class="faq-indicator text-green-500">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="keywords.length > 0" class="table-footer">
        <div class="text-sm text-secondary">
          Showing {{ keywords.length.toLocaleString() }} keywords
        </div>
      </div>
    </div>
  `,
  
  methods: {
    getVolumeBarStyle(volume) {
      if (!this.keywords.length) return { width: '0%' };
      const maxVolume = Math.max(...this.keywords.map(k => k.search_volume));
      const width = Math.max(2, (volume / maxVolume) * 100); // Minimum 2% width
      return { width: width + '%' };
    },
    
    getKDClass(kd) {
      const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
      if (kd <= 30) return baseClasses + ' kd-easy';
      if (kd <= 60) return baseClasses + ' kd-medium'; 
      return baseClasses + ' kd-hard';
    },
    
    getCompetitionLevel(value) {
      if (value < 0.33) return 'Low';
      if (value < 0.66) return 'Medium';
      return 'High';
    },
    
    getCompetitionClass(value) {
      const level = this.getCompetitionLevel(value);
      const baseClasses = 'px-2 py-1 rounded text-xs';
      if (level === 'Low') return baseClasses + ' competition-low';
      if (level === 'Medium') return baseClasses + ' competition-medium';
      return baseClasses + ' competition-high';
    },
    
    formatCpc(value) {
      if (value == null || value === '' || isNaN(value)) {
        return '0.00';
      }
      const num = parseFloat(value);
      return num.toFixed(2);
    },
    
    formatNumber(num) {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toLocaleString();
    }
  }
};

// Make available globally for non-module usage
window.KeywordsTableComponent = KeywordsTableComponent;