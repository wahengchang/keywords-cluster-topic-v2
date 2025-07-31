# Vue Component Principles

## Architecture
- **Container**: Logic + store integration (`container.js`)
- **Presentational**: Pure UI (`component-name.js`) 
- **Store**: Reactive state (`store.js`)

## Development Flow
1. Design display → data structure
2. Wire store → processing logic  
3. Build input → user interaction

## File References
```
/components/left-input/container.js    # Input logic
/components/right-display/container.js # Display logic
/store.js                              # Reactive data
```

## Key Patterns
- Container: `import { AppStore } from '../../store.js'`
- Store access: `computed: { store() { return AppStore; } }`
- Two-way binding: `get()/set()` computed properties
- Updates: `this.store.updateMethod(value)`