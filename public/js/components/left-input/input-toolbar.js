/**
 * Input Toolbar Component - Pure Presentational Component
 * Toolbar with action buttons and character counter
 * @component InputToolbarComponent
 */

export const InputToolbarComponent = {
  props: {
    characterCount: {
      type: Number,
      default: 0
    },
    maxLength: {
      type: Number,
      default: 50000
    },
    currentTheme: {
      type: String,
      default: 'dark',
      validator: (value) => ['light', 'dark'].includes(value)
    },
    hasText: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['clear', 'paste'],
  
  computed: {
    themeClasses() {
      const isDark = this.currentTheme === 'dark';
      return {
        toolbar: isDark ? 'text-gray-400' : 'text-gray-600',
        clearBtn: isDark 
          ? 'bg-gray-600 text-white hover:bg-gray-500' 
          : 'bg-gray-300 text-gray-700 hover:bg-gray-400',
        pasteBtn: isDark 
          ? 'bg-blue-600 text-white hover:bg-blue-500' 
          : 'bg-blue-500 text-white hover:bg-blue-600'
      };
    }
  },
  
  methods: {
    handleClear() {
      this.$emit('clear');
    },
    
    handlePaste() {
      this.$emit('paste');
    }
  },
  
  mounted() {
    console.log('InputToolbarComponent mounted - pure presentational');
  },
  
  template: `
    <div class="toolbar mb-3 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <button 
          @click="handleClear"
          class="btn-secondary text-sm px-3 py-1 rounded transition-colors"
          :class="themeClasses.clearBtn"
          :disabled="!hasText"
        >
          Clear
        </button>
        <button 
          @click="handlePaste"
          class="btn-secondary text-sm px-3 py-1 rounded transition-colors"
          :class="themeClasses.pasteBtn"
        >
          Paste
        </button>
      </div>
      
      <!-- Character count -->
      <div class="text-sm" :class="themeClasses.toolbar">
        {{ characterCount }} / {{ maxLength }} characters
      </div>
    </div>
  `
};