/**
 * Filters Container Component
 * Handles filter logic and store integration
 */

import { AppStore } from '../../store.js';
import { FiltersComponent } from './filters.js';

const FiltersContainer = {
  computed: {
    store() { 
      return AppStore; 
    },
    
    filters() { 
      return this.store?.data?.filters || {
        search: '',
        kdMin: 0,
        kdMax: 100,
        volumeMin: 0,
        volumeMax: null,
        competition: '',
        hasFaq: null
      }; 
    }
  },
  
  methods: {
    updateFilters(newFilters) {
      this.store.updateFilters(newFilters);
    },
    
    clearFilters() {
      const defaultFilters = {
        search: '',
        kdMin: 0,
        kdMax: 100,
        volumeMin: 0,
        volumeMax: null,
        competition: '',
        hasFaq: null
      };
      this.store.updateFilters(defaultFilters);
    }
  },
  
  components: { 
    Filters: FiltersComponent 
  },
  
  template: `
    <Filters 
      :filters="filters" 
      @update-filters="updateFilters" 
      @clear-filters="clearFilters"
    />
  `
};

// Mount the component
const { createApp } = Vue;

document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on a page with filters panel
  const filtersPanel = document.getElementById('filters-panel');
  if (filtersPanel) {
    const app = createApp(FiltersContainer);
    app.mount('#filters-panel');
    
    console.log('Filters Container mounted');
  }
});

// Export for module usage
export default FiltersContainer;