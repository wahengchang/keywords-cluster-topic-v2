# Development Guide - Vue Container/Presentational Framework

## Quick Start Workflow

Follow these 4 steps to build any input-output transformation tool:

### 1. Design the Final Display (Right Panel)
**Start with the end goal** - what should users see as output?

```javascript
// Example: Text analysis tool
const outputSpec = {
  wordCount: 150,
  charCount: 800,
  readingTime: "2 min",
  sentiment: "positive"
};
```

**Create the presentational component first:**
```javascript
// /js/components/right-display/display.js
export const DisplayComponent = {
  props: {
    analysis: { type: Object, default: () => ({}) }
  },
  
  template: `
    <div class="analysis-results">
      <div>Words: {{ analysis.wordCount }}</div>
      <div>Characters: {{ analysis.charCount }}</div>
      <div>Reading Time: {{ analysis.readingTime }}</div>
    </div>
  `
};
```

### 2. Think About the Data Flow
**Work backwards** - what data do you need to generate that output?

```javascript
// Data requirements analysis:
const dataFlow = {
  input: "raw text from user",           // What user provides
  processing: "text analysis logic",     // How to transform it
  output: "structured analysis results", // What display needs
  config: "analysis options"             // User preferences
};
```

**Define your store schema:**
```javascript
// /js/store.js - Add to reactive data
const reactiveData = Vue.reactive({
  // Input data
  inputText: '',
  
  // Configuration
  analysisOptions: {
    includeSentiment: true,
    includeReadability: false
  },
  
  // ... existing store data
});
```

### 3. Wire Up the Store
**Connect display to store data** with processing logic in container:

```javascript
// /js/components/right-display/container.js
import { AppStore } from '../../store.js';
import { DisplayComponent } from './display.js';

const DisplayContainer = {
  computed: {
    store() { return AppStore; },
    
    // Business logic - process raw data into display format
    processedAnalysis() {
      const text = this.store.data.inputText;
      if (!text.trim()) return {};
      
      return {
        wordCount: this.calculateWords(text),
        charCount: text.length,
        readingTime: this.calculateReadingTime(text)
      };
    }
  },
  
  methods: {
    calculateWords(text) {
      return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    },
    
    calculateReadingTime(text) {
      const words = this.calculateWords(text);
      return Math.ceil(words / 200) + " min";
    }
  },
  
  components: { Display: DisplayComponent },
  
  template: `<Display :analysis="processedAnalysis" />`
};
```

### 4. Design Input & Config Components
**Now you know exactly what data you need to collect:**

```javascript
// /js/components/left-input/input-field.js
export const InputFieldComponent = {
  props: {
    value: { type: String, default: '' }
  },
  emits: ['input'],
  
  template: `
    <textarea 
      :value="value"
      @input="$emit('input', $event.target.value)"
      placeholder="Enter text to analyze..."
    ></textarea>
  `
};

// /js/components/left-input/container.js
import { AppStore } from '../../store.js';
import { InputFieldComponent } from './input-field.js';

const InputContainer = {
  computed: {
    store() { return AppStore; },
    inputText: {
      get() { return this.store.data.inputText; },
      set(value) { this.store.updateInputText(value); }
    }
  },
  
  components: { InputField: InputFieldComponent },
  
  template: `<InputField v-model="inputText" />`
};
```

## File Organization Pattern

For each new tool, create this structure:

```
/js/components/
  /left-input/
    container.js        # Input logic + store integration
    input-field.js      # Pure textarea presentation
    input-toolbar.js    # Action buttons (optional)
  
  /right-display/
    container.js        # Processing logic + store integration  
    display.js          # Pure output presentation
  
  config-bar.js         # Format/option selection (optional)
```

## Development Checklist

### ✅ Step 1: Display Design
- [ ] Define output data structure
- [ ] Create presentational display component
- [ ] Test with mock data

### ✅ Step 2: Data Analysis  
- [ ] Identify required input data
- [ ] Define processing logic
- [ ] Plan store schema updates

### ✅ Step 3: Store Integration
- [ ] Add reactive data to store
- [ ] Create processing methods in container
- [ ] Connect display to processed data
- [ ] Test data flow

### ✅ Step 4: Input Components
- [ ] Create input presentational components  
- [ ] Create input container with store binding
- [ ] Add any configuration components
- [ ] Test complete user flow

## Common Patterns

### Text Processing Tool
```javascript
// Display: formatted text analysis
// Data: text metrics (words, chars, readability)
// Input: textarea + analysis options
```

### Data Converter Tool  
```javascript
// Display: converted output (JSON, CSV, etc.)
// Data: conversion logic + format selection
// Input: raw data + format selector
```

### Code Generator Tool
```javascript
// Display: generated code
// Data: template + user parameters  
// Input: configuration form + template selector
```

## Testing Your Tool

1. **Start with display**: Can you render mock data correctly?
2. **Add processing**: Does raw input transform to expected output?
3. **Connect input**: Does typing update the display in real-time?
4. **Verify persistence**: Does data survive page refresh?

## Reference Architecture

- **Container Components**: Handle business logic, store integration, data processing
- **Presentational Components**: Pure UI rendering with props/emits  
- **Store Pattern**: Centralized reactive state with Vue reactivity
- **ES6 Modules**: Import/export for clean dependency management

---

**Next Steps**: Copy this framework, follow the 4-step process, and build your transformation tool! 🚀