/**
 * Theme Handler - Manages dark/light mode toggle
 * Works with Global Config component
 */

class ThemeHandler {
  constructor() {
    this.init();
  }

  init() {
    // Initialize theme from localStorage or system preference
    this.loadTheme();
    
    // Setup theme toggle button
    this.setupThemeToggle();
    
    // Listen for system theme changes
    this.listenForSystemThemeChanges();
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme || systemTheme;
    
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    const html = document.documentElement;
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Update slider position
    this.updateSliderPosition();
    
    // Update global store if available
    if (window.AppStore && window.AppStore.updateTheme) {
      window.AppStore.updateTheme(theme);
    }
  }

  updateSliderPosition() {
    const slider = document.getElementById('theme-slider');
    if (slider) {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      if (currentTheme === 'dark') {
        slider.style.transform = 'translateX(24px)';
      } else {
        slider.style.transform = 'translateX(0px)';
      }
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  listenForSystemThemeChanges() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme || savedTheme === 'auto') {
        this.applyTheme('auto');
      }
    });
  }
}

// Initialize theme handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.themeHandler = new ThemeHandler();
  console.log('Theme Handler initialized');
});