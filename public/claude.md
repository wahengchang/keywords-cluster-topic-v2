# Vue Container/Presentational Architecture

### System Architecture
- **Pattern**: Container/Presentational Components with Vue.js ES6 Modules
- **State Management**: Vue reactive global store + LocalStorage
- **Runtime Environment**: Static HTML + Tailwind CSS CDN + Vue.js 3 CDN
- **Frontend**: Static HTML/CSS/JS + Vue.js 3 CDN components
- **Backend**: None - Static file serving only
- **Communication**: Vue reactive global store with ES6 imports
- **Module System**: ES6 imports with `type="module"` scripts

## Development Guidelines
- Language: Node.js only (no TypeScript)
- Check `package.json` for available commands

## Public Folder Structure
```
/public/           - Static files served at localhost:5050
  /css/            - Stylesheets and theme variables
  /js/             - JavaScript modules and handlers
    /components/   - Vue components organized by feature
      /feature-name/  - Container + presentational components
    /utils/        - Shared utility functions
```

### Naming Conventions
- **Folders**: `kebab-case` (e.g., `left-input/`, `right-display/`)
- **Files**: `kebab-case.js` (e.g., `container.js`, `input-field.js`)
- **Components**: Each folder contains `container.js` + presentational components

## Component Patterns

### Container Components
- Handle business logic and store integration
- Import dependencies with ES6 modules
- Manage state and event handlers
- Pass processed data to presentational components

### Presentational Components  
- Pure UI rendering with props and emits
- No business logic or store access
- Reusable across different containers
- Export as ES6 modules for import

### Store Integration
- Use `import { AppStore } from '../../store.js'`
- Access reactive data via `AppStore.data`
- Update store with `AppStore.updateMethod()`
- Automatic Vue reactivity across components

## usage
check output ./public/guide-to-develop.md