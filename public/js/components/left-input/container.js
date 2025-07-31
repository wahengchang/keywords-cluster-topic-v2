/**
 * Left Input Container - Business Logic Container Component
 * Handles state management, store integration, and business logic
 * @component LeftInputContainer
 */

import { AppStore } from '../../store.js';
import { InputFieldComponent } from './input-field.js';
import { InputToolbarComponent } from './input-toolbar.js';

const LeftInputContainer = {
  data() {
    return {
      inputText: '',
      maxLength: 50000,
      placeholder: 'Enter your text here...'
    };
  },
  
  computed: {
    // === Store Integration ===
    store() {
      return AppStore;
    },
    
    storeCurrentTheme() {
      return this.store?.data?.currentTheme || 'dark';
    },
    
    // === Text Statistics ===
    characterCount() {
      return this.inputText.length;
    },
    
    wordCount() {
      if (!this.inputText.trim()) return 0;
      return this.inputText.trim().split(/\s+/).filter(word => word.length > 0).length;
    },
    
    lineCount() {
      if (!this.inputText) return 0;
      return this.inputText.split('\n').length;
    },
    
    readingTime() {
      const wordsPerMinute = 200;
      return Math.ceil(this.wordCount / wordsPerMinute) || 1;
    },
    
    // === Validation & Limits ===
    isOverLimit() {
      return this.characterCount > this.maxLength;
    },
    
    isNearLimit() {
      const remaining = this.maxLength - this.characterCount;
      return remaining <= 1000 && remaining > 0;
    },
    
    remainingChars() {
      return Math.max(0, this.maxLength - this.characterCount);
    },
    
    hasText() {
      return this.inputText.trim().length > 0;
    }
  },
  
  methods: {
    // === Event Handlers ===
    handleInput(newValue) {
      this.inputText = newValue;
      this.updateStore('updateInputText', newValue);
      this.updateFocusTime();
    },

    handleFocus() {
      this.updateFocusTime();
    },

    handleClear() {
      this.inputText = '';
      this.updateStore('updateInputText', '');
      
      // Focus the input field after clearing
      this.$nextTick(() => {
        if (this.$refs.inputField) {
          this.$refs.inputField.focus();
        }
      });
    },

    async handlePaste() {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText) {
          const newText = this.inputText + clipboardText;
          
          if (newText.length <= this.maxLength) {
            this.inputText = newText;
            this.updateStore('updateInputText', newText);
          } else {
            this.showNotification('Clipboard content exceeds character limit', 'warning');
          }
        }
      } catch (err) {
        console.warn('Failed to read clipboard:', err);
        this.showNotification('Failed to access clipboard', 'error');
      }
    },

    // === Store Integration Methods ===
    updateFocusTime() {
      this.updateStore('updateLeftPanelState', {
        lastFocusTime: new Date().toISOString()
      });
    },

    updateStore(method, data) {
      const store = this.store;
      if (store && typeof store[method] === 'function') {
        store[method](data);
      } else {
        console.warn(`Store method ${method} not available`);
      }
    },

    showNotification(message, type = 'info') {
      this.updateStore('addNotification', message, type);
    },

    // === Initialization ===
    initializeFromStore() {
      const store = this.store;
      if (store && store.data) {
        if (store.data.inputText) {
          this.inputText = store.data.inputText;
        }
        
        if (store.data.config && store.data.config.maxInputLength) {
          this.maxLength = store.data.config.maxInputLength;
        }
      }
    }
  },
  
  components: {
    InputField: InputFieldComponent,
    InputToolbar: InputToolbarComponent
  },
  
  mounted() {
    this.initializeFromStore();
    
    // Focus input field on mount
    this.$nextTick(() => {
      if (this.$refs.inputField) {
        this.$refs.inputField.focus();
      }
    });
    
    console.log('LeftInputContainer mounted');
  },
  
  template: `
    <div class="left-panel-container h-full flex flex-col p-4">
      <InputToolbar 
        :character-count="characterCount"
        :max-length="maxLength"
        :current-theme="storeCurrentTheme"
        :has-text="hasText"
        @clear="handleClear"
        @paste="handlePaste"
      />
      
      <InputField 
        ref="inputField"
        :value="inputText"
        :placeholder="placeholder"
        :max-length="maxLength"
        :current-theme="storeCurrentTheme"
        :is-over-limit="isOverLimit"
        :is-near-limit="isNearLimit"
        :remaining-chars="remainingChars"
        @input="handleInput"
        @focus="handleFocus"
      />
    </div>
  `
};

// === Component Mounting ===
function mountLeftInputContainer() {
  if (typeof Vue === 'undefined') {
    console.error('Vue.js not loaded. Cannot initialize LeftInputContainer.');
    return;
  }

  const mountPoint = document.getElementById('appLeft');
  if (!mountPoint) {
    console.warn('Mount point #appLeft not found for LeftInputContainer');
    return;
  }

  const app = Vue.createApp(LeftInputContainer);
  app.mount(mountPoint);
  console.log('LeftInputContainer mounted to #appLeft');
}

document.addEventListener('DOMContentLoaded', mountLeftInputContainer);

export { LeftInputContainer };