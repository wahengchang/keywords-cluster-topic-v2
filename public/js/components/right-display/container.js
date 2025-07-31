/**
 * Result Display Wrapper - Store to Props Bridge
 * Connects global store to ResultDisplayComponent props
 * @component ResultDisplayWrapper
 */

import { ResultDisplayComponent } from './display.js';
import { AppStore } from '../../store.js';

const ResultDisplayWrapper = {
  computed: {
    // === Store Integration ===
    store() {
      return AppStore;
    },
    
    storeInputText() {
      return this.store?.data?.inputText || '';
    },
    
    storeSelectedFormat() {
      return this.store?.data?.selectedFormat || 'text';
    },
    
    storeCurrentTheme() {
      return this.store?.data?.currentTheme || 'dark';
    },
    
    // === Business Logic - Text Processing ===
    processedResult() {
      if (!this.storeInputText.trim()) return '';
      
      const input = this.storeInputText;
      const format = this.storeSelectedFormat;
      
      try {
        switch (format) {
          case 'json':
            try {
              const parsed = JSON.parse(input);
              return JSON.stringify(parsed, null, 2);
            } catch (e) {
              // If JSON parsing fails, fallback to text analysis
              return this.analyzeText(input);
            }
            
          case 'html':
            return this.formatHTML(input);
            
          case 'text':
          default:
            return this.analyzeText(input);
        }
      } catch (error) {
        return `Processing Error: ${error.message}`;
      }
    },
    
    resultStats() {
      if (!this.processedResult) return null;
      
      return {
        wordCount: this.calculateWordCount(this.processedResult),
        charCount: this.processedResult.length,
        lineCount: this.calculateLineCount(this.processedResult),
        processedAt: new Date().toISOString()
      };
    },
    
    isErrorResult() {
      return this.processedResult.includes('Error:') || 
             this.processedResult.includes('error:');
    }
  },
  
  methods: {
    // === Text Processing Methods ===
    analyzeText(text) {
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      const lines = text.split('\n');
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      const analysis = {
        'Word Count': words.length,
        'Character Count': text.length,
        'Character Count (no spaces)': text.replace(/\s/g, '').length,
        'Line Count': lines.length,
        'Sentence Count': sentences.length,
        'Average Words per Sentence': sentences.length > 0 ? (words.length / sentences.length).toFixed(1) : 0,
        'Reading Time (min)': Math.ceil(words.length / 200) // ~200 WPM average
      };
      
      return Object.entries(analysis)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    },

    formatHTML(html) {
      try {
        return html
          .replace(/>\s+</g, '><')
          .replace(/\s+/g, ' ')
          .trim();
      } catch (e) {
        return `HTML Format Error: ${e.message}`;
      }
    },

    calculateWordCount(text) {
      return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    },

    calculateLineCount(text) {
      return text.split('\n').length;
    }
  },
  
  components: {
    ResultDisplay: ResultDisplayComponent
  },
  
  template: `
    <ResultDisplay 
      :processed-result="processedResult"
      :result-stats="resultStats"
      :current-theme="storeCurrentTheme"
      :is-error-result="isErrorResult"
    />
  `
};

// === Component Mounting ===
function mountResultDisplayComponent() {
  if (typeof Vue === 'undefined') {
    console.error('Vue.js not loaded. Cannot initialize ResultDisplayWrapper.');
    return;
  }

  const mountPoint = document.getElementById('appResultDisplay');
  if (!mountPoint) {
    console.warn('Mount point #appResultDisplay not found for ResultDisplayWrapper');
    return;
  }

  const app = Vue.createApp(ResultDisplayWrapper);
  app.mount(mountPoint);
  console.log('ResultDisplayWrapper mounted to #appResultDisplay');
}

document.addEventListener('DOMContentLoaded', mountResultDisplayComponent);