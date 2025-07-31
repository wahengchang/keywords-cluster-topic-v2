/**
 * Global AppStore - Vue Component-Store-Observer Architecture
 * 
 * Centralized reactive state management using Vue.js 3 reactivity system.
 * Replaces FRP streams with Vue reactive data and computed properties.
 * 
 * Architecture Pattern: Component-Store-Observer
 * - Components communicate through this global store
 * - Reactive data automatically updates dependent components
 * - Observer pattern via Vue's reactivity system
 */

// Global AppStore implementation
window.AppStore = (function() {
    // Check if Vue is available
    if (typeof Vue === 'undefined') {
        console.warn('Vue.js not loaded. AppStore will use fallback mode.');
        
        // Fallback implementation for non-Vue environments
        const fallbackData = {
            // Input and processing state
            inputText: '',
            selectedFormat: 'text',
            
            // Theme and UI state
            currentTheme: 'dark',
            panelRatio: 50,
            
            // Component state
            leftPanelState: {
                isExpanded: true,
                activeTab: 'input'
            },
            rightPanelState: {
                isExpanded: true,
                activeTab: 'result'
            }
        };

        return {
            data: fallbackData,
            updateInputText: function(text) { this.data.inputText = text; },
            updateFormat: function(format) { this.data.selectedFormat = format; },
            updateTheme: function(theme) { this.data.currentTheme = theme; },
            updatePanelRatio: function(ratio) { this.data.panelRatio = ratio; },

        };
    }

    // Vue reactive data store
    const reactiveData = Vue.reactive({
        // Core input and processing state
        inputText: '',
        selectedFormat: 'text', // 'text', 'json', 'html'
        
        // Theme and UI configuration
        currentTheme: localStorage.getItem('app-theme') || 'dark',
        panelRatio: parseInt(localStorage.getItem('panel-ratio')) || 50,
        
        
        // Component-specific state
        leftPanelState: {
            isExpanded: true,
            activeTab: 'input',
            lastFocusTime: null
        },
        
        rightPanelState: {
            isExpanded: true,
            activeTab: 'result'
        },
        
        // Global UI state
        notifications: [],
        
        // Configuration options
        config: {
            autoProcess: true,
            debounceMs: 300,
            maxInputLength: 50000,
            showLineNumbers: false,
            enableSpellCheck: true
        }
    });

    // Store API methods
    const storeAPI = {
        // Data accessor
        data: reactiveData,

        // Input text management
        updateInputText(text) {
            if (typeof text === 'string' && text.length <= reactiveData.config.maxInputLength) {
                reactiveData.inputText = text;
                
                
                this.saveToLocalStorage('inputText', text);
            }
        },

        // Format selection
        updateFormat(format) {
            const validFormats = ['text', 'json', 'html'];
            if (validFormats.includes(format)) {
                reactiveData.selectedFormat = format;
                
                
                this.saveToLocalStorage('selectedFormat', format);
            }
        },

        // Theme management
        updateTheme(theme) {
            const validThemes = ['light', 'dark'];
            if (validThemes.includes(theme)) {
                reactiveData.currentTheme = theme;
                this.saveToLocalStorage('app-theme', theme);
                
                // Update document theme class
                document.documentElement.setAttribute('data-theme', theme);
            }
        },

        // Panel ratio for resizable layout
        updatePanelRatio(ratio) {
            if (typeof ratio === 'number' && ratio >= 10 && ratio <= 90) {
                reactiveData.panelRatio = ratio;
                this.saveToLocalStorage('panel-ratio', ratio.toString());
            }
        },


        // Component state management
        updateLeftPanelState(updates) {
            Object.assign(reactiveData.leftPanelState, updates);
        },

        updateRightPanelState(updates) {
            Object.assign(reactiveData.rightPanelState, updates);
        },

        // Configuration updates
        updateConfig(configUpdates) {
            Object.assign(reactiveData.config, configUpdates);
            this.saveToLocalStorage('app-config', JSON.stringify(reactiveData.config));
        },




        // Notification system
        addNotification(message, type = 'info') {
            const notification = {
                id: Date.now(),
                message,
                type,
                timestamp: new Date().toISOString()
            };
            
            reactiveData.notifications.push(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, 5000);
        },

        removeNotification(id) {
            const index = reactiveData.notifications.findIndex(n => n.id === id);
            if (index > -1) {
                reactiveData.notifications.splice(index, 1);
            }
        },

        // Local storage utilities
        saveToLocalStorage(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
            }
        },

        loadFromLocalStorage() {
            try {
                // Restore saved state
                const savedTheme = localStorage.getItem('app-theme');
                if (savedTheme) reactiveData.currentTheme = savedTheme;
                
                const savedRatio = localStorage.getItem('panel-ratio');
                if (savedRatio) reactiveData.panelRatio = parseInt(savedRatio);
                
                const savedFormat = localStorage.getItem('selectedFormat');
                if (savedFormat) reactiveData.selectedFormat = savedFormat;
                
                const savedConfig = localStorage.getItem('app-config');
                if (savedConfig) {
                    try {
                        Object.assign(reactiveData.config, JSON.parse(savedConfig));
                    } catch (e) {
                        console.warn('Failed to parse saved config');
                    }
                }
                
                const savedInput = localStorage.getItem('inputText');
                if (savedInput) reactiveData.inputText = savedInput;
                
            } catch (e) {
                console.warn('Failed to load from localStorage:', e);
            }
        },

        // Initialize store
        init() {
            this.loadFromLocalStorage();
            
            // Set initial theme
            document.documentElement.setAttribute('data-theme', reactiveData.currentTheme);
            
            console.log('AppStore initialized with Vue reactive data');
            return this;
        }
    };

    // Initialize and return store
    return storeAPI.init();
})();

// ES6 module export
export const AppStore = window.AppStore;

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.AppStore;
}