/**
 * Format Selection Component - Vue 3 Implementation
 * Configuration bar for result format selection
 * @component FormatSelectionComponent
 */

import { AppStore } from '../store.js';

const FormatSelectionComponent = {
  data() {
    return {
      selectedFormat: 'text'
    };
  },
  
  computed: {
    formatLabel() {
      const formats = {
        text: 'Text Analysis',
        json: 'JSON Format',
        html: 'HTML Format'
      };
      return formats[this.selectedFormat] || 'Unknown Format';
    }
  },
  
  methods: {
    handleFormatChange() {
      this.updateStore('updateFormat', this.selectedFormat);
    },

    // === Store Integration Methods ===
    getStore() {
      return AppStore;
    },

    updateStore(method, data) {
      const store = this.getStore();
      if (store && typeof store[method] === 'function') {
        store[method](data);
      } else {
        console.warn(`Store method ${method} not available`);
      }
    },

    initializeFromStore() {
      const store = this.getStore();
      if (store && store.data) {
        if (store.data.selectedFormat) {
          this.selectedFormat = store.data.selectedFormat;
        }
      }
    }
  },
  
  mounted() {
    this.initializeFromStore();
    console.log('FormatSelectionComponent mounted');
  },
  
  template: `
    <div class="result-config-bar h-12 px-4 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600">Format:</span>
        <select 
          v-model="selectedFormat"
          @change="handleFormatChange"
          class="bg-white text-gray-900 text-sm rounded px-2 py-1 border border-gray-300 focus:border-blue-500"
        >
          <option value="text">Text Analysis</option>
          <option value="json">JSON Format</option>
          <option value="html">HTML Format</option>
        </select>
      </div>
      
    </div>
  `
};

// === Component Mounting ===
function mountFormatSelectionComponent() {
  if (typeof Vue === 'undefined') {
    console.error('Vue.js not loaded. Cannot initialize FormatSelectionComponent.');
    return;
  }

  const mountPoint = document.getElementById('appResultConfigBar');
  if (!mountPoint) {
    console.warn('Mount point #appResultConfigBar not found for FormatSelectionComponent');
    return;
  }

  const app = Vue.createApp(FormatSelectionComponent);
  app.mount(mountPoint);
  console.log('FormatSelectionComponent mounted to #appResultConfigBar');
}

document.addEventListener('DOMContentLoaded', mountFormatSelectionComponent);

export { FormatSelectionComponent };