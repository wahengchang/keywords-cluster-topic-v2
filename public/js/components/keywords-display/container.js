/**
 * Keywords Display Container Component
 * Handles business logic, store integration, and data processing for keywords display
 */

import { AppStore } from '../../store.js';
import { KeywordsTableComponent } from './keywords-table.js';

const KeywordsDisplayContainer = {
  computed: {
    store() { 
      return AppStore; 
    },
    
    // Business logic - process and filter keywords
    processedKeywords() {
      return this.store?.data?.filteredKeywords || [];
    },
    
    loading() {
      return this.store?.data?.loading || false;
    },
    
    error() {
      return this.store?.data?.error || null;
    },
    
    currentProject() {
      return this.store?.data?.currentProject || null;
    },
    
    averageKD() {
      if (!this.processedKeywords.length) return 0;
      const sum = this.processedKeywords.reduce((acc, k) => acc + (k.kd || 0), 0);
      return sum / this.processedKeywords.length;
    },
    
    totalVolume() {
      return this.processedKeywords.reduce((acc, k) => acc + (k.search_volume || 0), 0);
    }
  },
  
  methods: {
    handleSort(field) {
      const currentSort = this.store.data.sort;
      const order = currentSort.field === field && currentSort.order === 'desc' ? 'asc' : 'desc';
      this.store.updateSort(field, order);
    },
    
    handleKeywordClick(keyword) {
      // Show keyword detail modal using global function
      if (typeof window.showKeywordModal === 'function') {
        window.showKeywordModal(keyword);
      } else {
        console.log('Keyword clicked:', keyword);
      }
    },
    
    async loadKeywords(projectId) {
      await this.store.loadKeywords(projectId);
    },
    
    async exportCSV() {
      if (this.currentProject) {
        try {
          await this.store.exportCSV(this.currentProject.id);
        } catch (error) {
          console.error('Export failed:', error);
        }
      }
    }
  },
  
  components: { 
    KeywordsTable: KeywordsTableComponent 
  },
  
  template: `
    <div class="keywords-display-container h-full flex flex-col">
      <!-- Error State -->
      <div v-if="error" class="error-banner bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>
      
      <!-- Project Header -->
      <div v-if="currentProject" class="project-header bg-secondary border-b border-tertiary p-4 mb-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-primary">{{ currentProject.name }}</h2>
            <div class="text-sm text-secondary mt-1">
              {{ currentProject.keyword_count?.toLocaleString() }} keywords • 
              {{ currentProject.total_clusters }} clusters
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button 
              @click="exportCSV"
              class="px-4 py-2 bg-accent-green text-white rounded hover:bg-accent-green-hover transition-colors"
              :disabled="loading"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
      
      <!-- Keywords Statistics -->
      <div v-if="processedKeywords.length > 0" class="keywords-stats bg-secondary border-b border-tertiary p-4 mb-4">
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-lg font-semibold text-primary">{{ processedKeywords.length.toLocaleString() }}</div>
            <div class="text-sm text-secondary">Filtered Keywords</div>
          </div>
          <div>
            <div class="text-lg font-semibold text-primary">{{ averageKD.toFixed(1) }}</div>
            <div class="text-sm text-secondary">Avg KD</div>
          </div>
          <div>
            <div class="text-lg font-semibold text-primary">{{ totalVolume.toLocaleString() }}</div>
            <div class="text-sm text-secondary">Total Volume</div>
          </div>
        </div>
      </div>
      
      <!-- Keywords Table -->
      <div class="flex-1 overflow-hidden">
        <KeywordsTable 
          :keywords="processedKeywords" 
          :loading="loading"
          @sort="handleSort"
          @keyword-click="handleKeywordClick"
        />
      </div>
    </div>
  `,
  
  emits: ['keyword-detail']
};

// Mount the component
const { createApp } = Vue;

document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the keywords page (has keywords-display element)
  const keywordsDisplay = document.getElementById('keywords-display');
  if (keywordsDisplay) {
    const app = createApp(KeywordsDisplayContainer);
    app.mount('#keywords-display');
    
    console.log('Keywords Display Container mounted');
  }
});

// Export for module usage
export default KeywordsDisplayContainer;