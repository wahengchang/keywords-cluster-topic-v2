/**
 * Filters Presentational Component
 * Pure UI component for filter controls
 */

export const FiltersComponent = {
  props: {
    filters: { type: Object, required: true }
  },
  
  emits: ['update-filters', 'clear-filters'],
  
  template: `
    <div class="filters-panel bg-secondary border-r border-tertiary p-4 h-full overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-primary">Filters</h3>
        <button 
          @click="clearAllFilters" 
          class="text-xs px-2 py-1 text-secondary hover:text-primary transition-colors"
        >
          Clear All
        </button>
      </div>
      
      <!-- Search Keywords -->
      <div class="filter-group mb-6">
        <label class="block text-sm font-medium text-primary mb-2">
          Search Keywords
        </label>
        <input 
          type="text" 
          :value="filters.search"
          @input="updateFilter('search', $event.target.value)"
          placeholder="Type to search keywords..."
          class="w-full px-3 py-2 border border-tertiary rounded bg-primary text-primary placeholder-muted focus:border-accent-green focus:outline-none transition-colors"
        />
        <div v-if="filters.search" class="text-xs text-secondary mt-1">
          Searching for "{{ filters.search }}"
        </div>
      </div>
      
      <!-- Keyword Difficulty Range -->
      <div class="filter-group mb-6">
        <label class="block text-sm font-medium text-primary mb-2">
          Keyword Difficulty (KD)
        </label>
        <div class="range-slider-container">
          <div class="flex justify-between text-xs text-secondary mb-2">
            <span>{{ filters.kdMin }}</span>
            <span>{{ filters.kdMax }}</span>
          </div>
          <div class="relative">
            <input 
              type="range" 
              min="0" 
              max="100" 
              :value="filters.kdMin"
              @input="updateFilter('kdMin', parseInt($event.target.value))"
              class="range-slider range-min w-full absolute"
            />
            <input 
              type="range" 
              min="0" 
              max="100" 
              :value="filters.kdMax"
              @input="updateFilter('kdMax', parseInt($event.target.value))"
              class="range-slider range-max w-full absolute"
            />
          </div>
          <div class="range-display text-center text-sm text-primary mt-2">
            {{ filters.kdMin }} - {{ filters.kdMax }}
          </div>
          <div class="flex justify-between text-xs text-muted mt-1">
            <span>Easy</span>
            <span>Hard</span>
          </div>
        </div>
      </div>
      
      <!-- Search Volume Range -->
      <div class="filter-group mb-6">
        <label class="block text-sm font-medium text-primary mb-2">
          Search Volume
        </label>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <input 
              type="number" 
              :value="filters.volumeMin || ''"
              @input="updateFilter('volumeMin', parseInt($event.target.value) || 0)"
              placeholder="Min"
              class="w-full px-3 py-2 border border-tertiary rounded bg-primary text-primary placeholder-muted focus:border-accent-green focus:outline-none"
            />
          </div>
          <div>
            <input 
              type="number" 
              :value="filters.volumeMax || ''"
              @input="updateFilter('volumeMax', parseInt($event.target.value) || null)"
              placeholder="Max"
              class="w-full px-3 py-2 border border-tertiary rounded bg-primary text-primary placeholder-muted focus:border-accent-green focus:outline-none"
            />
          </div>
        </div>
        <div class="text-xs text-secondary mt-1">
          Monthly search volume range
        </div>
      </div>
      
      <!-- Competition Level -->
      <div class="filter-group mb-6">
        <label class="block text-sm font-medium text-primary mb-2">
          Competition Level
        </label>
        <select 
          :value="filters.competition"
          @change="updateFilter('competition', $event.target.value)"
          class="w-full px-3 py-2 border border-tertiary rounded bg-primary text-primary focus:border-accent-green focus:outline-none"
        >
          <option value="">All Levels</option>
          <option value="Low">Low (0-33%)</option>
          <option value="Medium">Medium (34-66%)</option>
          <option value="High">High (67-100%)</option>
        </select>
      </div>
      
      <!-- FAQ Filter -->
      <div class="filter-group mb-6">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input 
            type="checkbox" 
            :checked="filters.hasFaq === true"
            @change="updateFilter('hasFaq', $event.target.checked ? true : null)"
            class="rounded border-tertiary text-accent-green focus:ring-accent-green focus:ring-offset-0"
          />
          <span class="text-sm text-primary">Has FAQ Title</span>
        </label>
        <div class="text-xs text-secondary mt-1">
          Show only keywords with generated FAQ titles
        </div>
      </div>
      
      <!-- Active Filters Summary -->
      <div v-if="hasActiveFilters" class="active-filters-summary bg-tertiary rounded p-3">
        <div class="text-sm font-medium text-primary mb-2">Active Filters:</div>
        <div class="space-y-1 text-xs">
          <div v-if="filters.search" class="flex items-center justify-between">
            <span class="text-secondary">Search:</span>
            <span class="text-primary">"{{ filters.search }}"</span>
          </div>
          <div v-if="filters.kdMin > 0 || filters.kdMax < 100" class="flex items-center justify-between">
            <span class="text-secondary">KD Range:</span>
            <span class="text-primary">{{ filters.kdMin }}-{{ filters.kdMax }}</span>
          </div>
          <div v-if="filters.volumeMin > 0 || filters.volumeMax" class="flex items-center justify-between">
            <span class="text-secondary">Volume:</span>
            <span class="text-primary">{{ filters.volumeMin }}{{ filters.volumeMax ? '-' + filters.volumeMax : '+' }}</span>
          </div>
          <div v-if="filters.competition" class="flex items-center justify-between">
            <span class="text-secondary">Competition:</span>
            <span class="text-primary">{{ filters.competition }}</span>
          </div>
          <div v-if="filters.hasFaq" class="flex items-center justify-between">
            <span class="text-secondary">FAQ:</span>
            <span class="text-primary">Required</span>
          </div>
        </div>
      </div>
    </div>
  `,
  
  computed: {
    hasActiveFilters() {
      return !!(
        this.filters.search ||
        this.filters.kdMin > 0 ||
        this.filters.kdMax < 100 ||
        this.filters.volumeMin > 0 ||
        this.filters.volumeMax ||
        this.filters.competition ||
        this.filters.hasFaq
      );
    }
  },
  
  methods: {
    updateFilter(key, value) {
      this.$emit('update-filters', { [key]: value });
    },
    
    clearAllFilters() {
      this.$emit('clear-filters');
    }
  }
};

// Make available globally
window.FiltersComponent = FiltersComponent;