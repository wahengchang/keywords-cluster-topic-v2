/**
 * Result Display Component - Pure Vue 3 Component
 * Stateless component that receives all data as props
 * @component ResultDisplayComponent
 */

export const ResultDisplayComponent = {
  props: {
    processedResult: {
      type: String,
      default: ''
    },
    resultStats: {
      type: Object,
      default: () => null
    },
    currentTheme: {
      type: String,
      default: 'dark',
      validator: (value) => ['light', 'dark'].includes(value)
    },
    isErrorResult: {
      type: Boolean,
      default: false
    }
  },
  
  computed: {
    lastProcessed() {
      return this.resultStats?.processedAt || null;
    },
    
    resultPlaceholder() {
      return 'Results will appear here after processing input text';
    },
    
    themeClasses() {
      const isDark = this.currentTheme === 'dark';
      console.log(isDark);
      return {
        container: isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900',
        textarea: isDark ? 'bg-gray-900 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300',
        toolbar: isDark ? 'text-gray-400' : 'text-gray-600',
        emptyState: isDark ? 'text-gray-500' : 'text-gray-400'
      };
    }
  },
  
  methods: {
    formatTime(timestamp) {
      if (!timestamp) return '--';
      
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      
      return date.toLocaleDateString();
    }
  },
  
  mounted() {
    console.log('ResultDisplayComponent mounted - pure props-based');
  },
  
  template: `
    <div class="result-display-container h-full flex flex-col p-4">
      <!-- Result Toolbar -->
      <div class="result-toolbar mb-3 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span v-if="lastProcessed" class="text-xs" :class="themeClasses.toolbar">
            Updated {{ formatTime(lastProcessed) }}
          </span>
        </div>
        
        <div class="flex items-center space-x-2">

        </div>
      </div>
      
      <!-- Result Display -->
      <div class="flex-1 relative">
        <textarea
          ref="resultDisplay"
          :value="processedResult"
          readonly
          :placeholder="resultPlaceholder"
          class="w-full h-full resize-none p-3 border rounded font-mono text-sm leading-relaxed"
          :class="[themeClasses.textarea, { 'text-red-400': isErrorResult }]"
        ></textarea>
        
        <!-- Empty state -->
        <div v-if="!processedResult.trim()" class="absolute inset-0 flex items-center justify-center">
          <div class="text-center" :class="themeClasses.emptyState">
            <div class="text-lg mb-2">📝</div>
            <div class="text-sm">Enter text in the left panel to see results</div>
          </div>
        </div>
      </div>
    </div>
  `
};