/**
 * Input Field Component - Pure Presentational Component
 * Stateless textarea component for text input
 * @component InputFieldComponent
 */

export const InputFieldComponent = {
  props: {
    value: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Enter your text here...'
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
    isOverLimit: {
      type: Boolean,
      default: false
    },
    isNearLimit: {
      type: Boolean,
      default: false
    },
    remainingChars: {
      type: Number,
      default: 0
    }
  },
  
  emits: ['input', 'focus'],
  
  computed: {
    themeClasses() {
      const isDark = this.currentTheme === 'dark';
      return {
        textarea: isDark 
          ? 'bg-gray-900 text-white border-gray-600 focus:border-blue-500' 
          : 'bg-gray-50 text-gray-900 border-gray-300 focus:border-blue-500',
        warning: isDark 
          ? 'text-yellow-400 bg-gray-800' 
          : 'text-yellow-600 bg-yellow-100'
      };
    }
  },
  
  methods: {
    handleInput(event) {
      this.$emit('input', event.target.value);
    },
    
    handleFocus(event) {
      this.$emit('focus', event);
    },
    
    focus() {
      if (this.$refs.textEditor) {
        this.$refs.textEditor.focus();
      }
    }
  },
  
  mounted() {
    console.log('InputFieldComponent mounted - pure presentational');
  },
  
  template: `
    <div class="flex-1 relative">
      <textarea
        ref="textEditor"
        :value="value"
        @input="handleInput"
        @focus="handleFocus"
        :placeholder="placeholder"
        :maxlength="maxLength"
        class="w-full h-full resize-none p-3 border rounded focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm leading-relaxed"
        :class="[themeClasses.textarea, { 'border-red-500': isOverLimit }]"
      ></textarea>
      
      <!-- Character limit warning -->
      <div v-if="isNearLimit" class="absolute bottom-2 right-2 text-xs px-2 py-1 rounded" :class="themeClasses.warning">
        {{ remainingChars }} characters remaining
      </div>
    </div>
  `
};