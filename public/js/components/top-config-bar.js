/**
 * Settings Modal Component - Vue 3 Implementation
 * Modal configuration panel for global application settings
 * @component SettingsModalComponent
 */

import { AppStore } from '../store.js';

const SettingsModalComponent = {
  data() {
    return {
      isVisible: false,
      config: {
        theme: 'dark',
        fontSize: 'medium',
        language: 'en',
        panelRatio: 50,
        maxInputLength: 50000,
        autoSave: true,
        enableSpellCheck: true,
        debounceMs: 300
      }
    };
  },
  
  computed: {
    fontSizeOptions() {
      return [
        { value: 'small', label: 'Small (14px)' },
        { value: 'medium', label: 'Medium (16px)' },
        { value: 'large', label: 'Large (18px)' }
      ];
    },
    
    languageOptions() {
      return [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
        { value: 'de', label: 'Deutsch' }
      ];
    },
    
    themeOptions() {
      return [
        { value: 'light', label: 'Light Mode' },
        { value: 'dark', label: 'Dark Mode' },
        { value: 'auto', label: 'Follow System' }
      ];
    }
  },
  
  methods: {
    show() {
      this.isVisible = true;
      this.loadFromStore();
    },
    
    hide() {
      this.isVisible = false;
    },
    
    handleBackdropClick(event) {
      if (event.target.classList.contains('modal-backdrop')) {
        this.hide();
      }
    },
    
    saveConfig() {
      // Specifically update theme in the reactive store
      const store = this.getStore();
      if (store) {
        store.updateTheme(this.config.theme);
        store.updatePanelRatio(this.config.panelRatio);
        store.updateConfig({
          maxInputLength: this.config.maxInputLength,
          autoProcess: this.config.autoSave,
          enableSpellCheck: this.config.enableSpellCheck,
          debounceMs: this.config.debounceMs
        });
      }
      
      // Apply theme immediately to DOM
      this.applyTheme();
      
      // Apply panel ratio if panel resize handler is available
      if (window.panelResizeHandler && window.panelResizeHandler.setPanelRatio) {
        window.panelResizeHandler.setPanelRatio(this.config.panelRatio);
      }
      
      this.showNotification('Configuration saved successfully', 'success');
      this.hide();
    },
    
    resetConfig() {
      this.config = {
        theme: 'dark',
        fontSize: 'medium',
        language: 'en',
        panelRatio: 50,
        maxInputLength: 50000,
        autoSave: true,
        enableSpellCheck: true,
        debounceMs: 300
      };
      
      this.showNotification('Configuration reset to defaults', 'info');
    },
    
    applyTheme() {
      const html = document.documentElement;
      
      if (this.config.theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        html.setAttribute('data-theme', this.config.theme);
      }
      
      // Update theme toggle slider position
      this.updateThemeToggle();
    },
    
    updateThemeToggle() {
      const slider = document.getElementById('theme-slider');
      if (slider) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
          slider.style.transform = 'translateX(24px)';
        } else {
          slider.style.transform = 'translateX(0px)';
        }
      }
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

    showNotification(message, type = 'info') {
      this.updateStore('addNotification', message, type);
    },

    loadFromStore() {
      const store = this.getStore();
      if (store && store.data && store.data.globalConfig) {
        this.config = { ...this.config, ...store.data.globalConfig };
      }
    },
    
    initializeGlobalConfigTrigger() {
      // Connect to the existing config button
      const configBtn = document.getElementById('config-btn');
      if (configBtn) {
        configBtn.addEventListener('click', () => {
          this.show();
        });
      }
    }
  },
  
  mounted() {
    this.loadFromStore();
    this.applyTheme();
    this.initializeGlobalConfigTrigger();
    console.log('SettingsModalComponent mounted');
  },
  
  template: `
    <div v-if="isVisible" class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click="handleBackdropClick">
      <div class="modal-content bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-auto" @click.stop>
        <!-- Modal Header -->
        <div class="modal-header p-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Global Settings</h2>
          <button @click="hide" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Modal Body -->
        <div class="modal-body p-4 space-y-6">
          <!-- Theme Settings -->
          <div class="config-section">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Appearance</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700 dark:text-gray-300">Theme:</label>
                <select 
                  v-model="config.theme"
                  class="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 border border-gray-300 dark:border-gray-600"
                >
                  <option v-for="option in themeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700 dark:text-gray-300">Font Size:</label>
                <select 
                  v-model="config.fontSize"
                  class="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 border border-gray-300 dark:border-gray-600"
                >
                  <option v-for="option in fontSizeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- Layout Settings -->
          <div class="config-section">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Layout</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700 dark:text-gray-300">Panel Ratio:</label>
                <div class="flex items-center space-x-2">
                  <input 
                    type="range" 
                    v-model.number="config.panelRatio"
                    min="20" 
                    max="80" 
                    step="5"
                    class="w-20"
                  >
                  <span class="text-sm text-gray-600 dark:text-gray-400 w-10">{{ config.panelRatio }}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Input Settings -->
          <div class="config-section">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Input Settings</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700 dark:text-gray-300">Max Input Length:</label>
                <input 
                  type="number" 
                  v-model.number="config.maxInputLength"
                  min="1000" 
                  max="100000" 
                  step="1000"
                  class="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 w-20 border border-gray-300 dark:border-gray-600"
                >
              </div>
              
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700 dark:text-gray-300">Debounce (ms):</label>
                <input 
                  type="number" 
                  v-model.number="config.debounceMs"
                  min="100" 
                  max="2000" 
                  step="100"
                  class="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 w-16 border border-gray-300 dark:border-gray-600"
                >
              </div>
              
              <label class="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  v-model="config.autoSave"
                  class="rounded"
                >
                <span class="text-gray-700 dark:text-gray-300">Auto-save input</span>
              </label>
              
              <label class="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  v-model="config.enableSpellCheck"
                  class="rounded"
                >
                <span class="text-gray-700 dark:text-gray-300">Enable spell check</span>
              </label>
            </div>
          </div>
          
          <!-- Language Settings -->
          <div class="config-section">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Localization</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm text-gray-700 dark:text-gray-300">Language:</label>
                <select 
                  v-model="config.language"
                  class="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 border border-gray-300 dark:border-gray-600"
                >
                  <option v-for="option in languageOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div class="modal-footer p-4 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <button 
            @click="resetConfig"
            class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Reset to Defaults
          </button>
          
          <div class="flex space-x-2">
            <button 
              @click="hide"
              class="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              @click="saveConfig"
              class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};

// === Component Mounting ===
function mountSettingsModalComponent() {
  if (typeof Vue === 'undefined') {
    console.error('Vue.js not loaded. Cannot initialize SettingsModalComponent.');
    return;
  }

  // Create mount point for settings modal
  const mountPoint = document.createElement('div');
  mountPoint.id = 'appGlobalConfig';
  document.body.appendChild(mountPoint);

  const app = Vue.createApp(SettingsModalComponent);
  app.mount(mountPoint);
  console.log('SettingsModalComponent mounted to #appGlobalConfig');
}

document.addEventListener('DOMContentLoaded', mountSettingsModalComponent);

export { SettingsModalComponent };